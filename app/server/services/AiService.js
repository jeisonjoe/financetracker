import crypto from "node:crypto";
import * as XLSX from "xlsx";
import officeCrypto from "officecrypto-tool";
import { AppError, ValidationError } from "../domain/errors.js";
import { MerchantRuleService } from "./MerchantRuleService.js";

const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";
const DEFAULT_CLAUDE_MODEL = "claude-sonnet-4-20250514";
const CSV_CHUNK_SIZE = 60;
const AI_CATEGORIZE_BATCH_SIZE = 45;

const MONTH_MAP = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * Parses common bank statement date formats (DD/MM/YY, DD/MM/YYYY, DD-MMM-YYYY, YYYY-MM-DD)
 * into a UTC-safe YYYY-MM-DD string.
 */
export function parseStatementDate(raw) {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    const y = raw.getFullYear();
    const m = String(raw.getMonth() + 1).padStart(2, "0");
    const d = String(raw.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  const text = String(raw ?? "").trim();
  if (!text) return null;

  // ISO YYYY-MM-DD
  const isoMatch = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // DD/MM/YY or DD/MM/YYYY or DD-MM-YY or DD-MM-YYYY
  const dmyMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]);
    let year = Number(dmyMatch[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  // DD MMM YYYY / DD-MMM-YY (e.g., 18 Nov 2025 or 18-Nov-25)
  const monMatch = text.match(/^(\d{1,2})[\s-]([A-Za-z]{3})[\s-](\d{2,4})/);
  if (monMatch) {
    const day = Number(monMatch[1]);
    const monthIdx = MONTH_MAP[monMatch[2].toLowerCase()];
    let year = Number(monMatch[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    if (monthIdx !== undefined && day >= 1 && day <= 31) {
      return `${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  const fallback = new Date(text);
  if (!Number.isNaN(fallback.getTime())) {
    return fallback.toISOString().split("T")[0];
  }
  return null;
}

function parseNumericAmount(raw) {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  const cleaned = String(raw ?? "")
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "")
    .trim();
  if (!cleaned) return 0;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Strips markdown code fences and extracts the first valid JSON object/array.
 */
export function extractJsonFromText(rawText) {
  if (!rawText || typeof rawText !== "string") {
    throw new AppError("AI returned an empty response", 502, "AI_PARSE_ERROR");
  }

  const trimmed = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const startObj = trimmed.indexOf("{");
    const endObj = trimmed.lastIndexOf("}");
    if (startObj !== -1 && endObj > startObj) {
      try {
        return JSON.parse(trimmed.slice(startObj, endObj + 1));
      } catch {
        // Fall through
      }
    }
    const startArr = trimmed.indexOf("[");
    const endArr = trimmed.lastIndexOf("]");
    if (startArr !== -1 && endArr > startArr) {
      try {
        return JSON.parse(trimmed.slice(startArr, endArr + 1));
      } catch {
        // Fall through
      }
    }
    throw new AppError("Could not parse structured JSON from AI response", 502, "AI_PARSE_ERROR");
  }
}

export class AiService {
  constructor({ fetchFn = globalThis.fetch } = {}) {
    this.fetchFn = fetchFn;
  }

  getEnvStatus() {
    return {
      gemini: Boolean(
        process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
      ),
      claude: Boolean(
        process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
      ),
    };
  }

  resolveCredentials({ provider, apiKey, model } = {}) {
    const envStatus = this.getEnvStatus();
    let chosenProvider =
      provider === "claude" || provider === "gemini" ? provider : null;

    if (!chosenProvider) {
      chosenProvider = envStatus.gemini
        ? "gemini"
        : envStatus.claude
        ? "claude"
        : "gemini";
    }

    const cleanKey = typeof apiKey === "string" ? apiKey.trim() : "";
    const resolvedKey =
      cleanKey ||
      (chosenProvider === "claude"
        ? process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || ""
        : process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "");

    if (!resolvedKey) {
      const label = chosenProvider === "claude" ? "Claude" : "Gemini";
      throw new ValidationError(
        `No ${label} API key found. Add your key in Preferences or set it in .env.local.`
      );
    }

    let resolvedModel =
      (typeof model === "string" && model.trim()) ||
      (chosenProvider === "claude" ? DEFAULT_CLAUDE_MODEL : DEFAULT_GEMINI_MODEL);

    if (
      resolvedModel === "gemini-2.5-pro" ||
      resolvedModel === "gemini-2.0-flash" ||
      resolvedModel === "gemini-2.5-flash" ||
      resolvedModel === "gemini-1.5-flash" ||
      resolvedModel === "gemini-1.5-pro"
    ) {
      resolvedModel = DEFAULT_GEMINI_MODEL;
    }

    return {
      provider: chosenProvider,
      apiKey: resolvedKey,
      model: resolvedModel,
    };
  }

  #isTransientError(error) {
    const msg = String(error?.message || "").toLowerCase();
    return (
      error?.statusCode === 503 ||
      error?.statusCode === 504 ||
      error?.code === "AI_TIMEOUT" ||
      msg.includes("high demand") ||
      msg.includes("overloaded") ||
      msg.includes("temporarily unavailable") ||
      msg.includes("timed out")
    );
  }

  async callProvider({
    provider,
    apiKey,
    model,
    systemInstruction,
    prompt,
    pdfBase64 = null,
    expectJson = true,
    timeoutMs = 90_000,
  }) {
    const creds = this.resolveCredentials({ provider, apiKey, model });

    if (creds.provider === "claude") {
      try {
        return await this.#callClaude({
          ...creds,
          systemInstruction,
          prompt,
          pdfBase64,
          expectJson,
          timeoutMs,
        });
      } catch (err) {
        if (!this.#isTransientError(err)) throw err;
        await new Promise((r) => setTimeout(r, 800));
        return this.#callClaude({
          ...creds,
          systemInstruction,
          prompt,
          pdfBase64,
          expectJson,
          timeoutMs,
        });
      }
    }

    const geminiChain = [
      creds.model,
      ...["gemini-3.8-flash", "gemini-3.1-pro-preview"].filter((m) => m !== creds.model),
    ];

    let lastError = null;
    for (let idx = 0; idx < geminiChain.length; idx += 1) {
      const candidateModel = geminiChain[idx];
      try {
        return await this.#callGemini({
          ...creds,
          model: candidateModel,
          systemInstruction,
          prompt,
          pdfBase64,
          expectJson,
          timeoutMs,
        });
      } catch (err) {
        lastError = err;
        if (!this.#isTransientError(err) || idx === geminiChain.length - 1) {
          throw err;
        }
        await new Promise((r) => setTimeout(r, 700));
      }
    }
    throw lastError;
  }

  async #safeFetch(providerLabel, url, options, timeoutMs = 90_000) {
    try {
      const requestOptions =
        this.fetchFn === globalThis.fetch && !options.signal && typeof AbortSignal?.timeout === "function"
          ? { ...options, signal: AbortSignal.timeout(timeoutMs) }
          : options;
      return await this.fetchFn(url, requestOptions);
    } catch (error) {
      const code = error?.cause?.code || error?.code || error?.name;
      if (code === "UND_ERR_HEADERS_TIMEOUT" || code === "TimeoutError" || code === "AbortError") {
        throw new AppError(
          `${providerLabel} timed out while processing the request. Try a smaller file or CSV export.`,
          504,
          "AI_TIMEOUT"
        );
      }
      throw new AppError(
        `Network error contacting ${providerLabel}: ${error?.cause?.message || error?.message || "fetch failed"}`,
        502,
        "AI_NETWORK_ERROR"
      );
    }
  }

  #parseGeminiSseText(sseBody) {
    const chunks = [];
    for (const rawLine of sseBody.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const parsed = JSON.parse(payload);
        const textPart = parsed?.candidates?.[0]?.content?.parts
          ?.map((p) => p.text || "")
          .join("");
        if (textPart) chunks.push(textPart);
      } catch {
        // Ignore partial/non-JSON SSE keepalive lines
      }
    }
    return chunks.join("");
  }

  async #callGemini({ apiKey, model, systemInstruction, prompt, pdfBase64, expectJson, timeoutMs = 90_000 }) {
    const inputParts = [];
    if (pdfBase64) {
      inputParts.push({
        inlineData: {
          mimeType: "application/pdf",
          data: pdfBase64,
        },
      });
    }
    inputParts.push({ text: prompt });

    // 1. Primary: Direct high-speed generateContent API
    const generateBody = {
      contents: [{ role: "user", parts: inputParts }],
      generationConfig: {
        temperature: 0.1,
        ...(expectJson ? { responseMimeType: "application/json" } : {}),
      },
      ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}),
    };

    const generateUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;

    let res = null;
    let data = null;
    try {
      res = await this.#safeFetch(
        "Gemini",
        generateUrl,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(generateBody),
        },
        timeoutMs
      );

      if (res) {
        data = await res.json().catch(() => ({}));
      }
    } catch (err) {
      if (err?.code === "AI_TIMEOUT") throw err;
      // Fall through to try interactions endpoint if generateContent network/fetch fails
    }

    // 2. Secondary fallback: Interactions API if model is only available via Interactions
    if (!res || res.status === 404) {
      const interactionsInput = pdfBase64
        ? [
            { type: "text", text: prompt },
            { type: "document", mime_type: "application/pdf", data: pdfBase64 },
          ]
        : prompt;

      const interactionsPayload = {
        model,
        input: interactionsInput,
        ...(systemInstruction ? { system_instruction: systemInstruction } : {}),
        ...(expectJson ? { response_format: { type: "text", mime_type: "application/json" } } : {}),
        generation_config: {
          temperature: 0.1,
        },
        store: false,
      };

      const interactionsUrl = `https://generativelanguage.googleapis.com/v1beta/interactions?key=${encodeURIComponent(apiKey)}`;

      try {
        const interactionsRes = await this.#safeFetch(
          "Gemini",
          interactionsUrl,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey,
            },
            body: JSON.stringify(interactionsPayload),
          },
          Math.min(timeoutMs, 15_000)
        );

        if (interactionsRes) {
          res = interactionsRes;
          data = await interactionsRes.json().catch(() => ({}));
        }
      } catch {
        // Fall through
      }
    }

    if (!res || !res.ok) {
      const rawMsg = data?.error?.message || (data?.status === "failed" ? data?.error?.message || "Interaction failed" : `Gemini API failed (${res?.status || 502})`);
      const status = res?.status === 429 ? 429 : res?.status === 503 ? 503 : res?.status >= 400 && res?.status < 500 ? 400 : 502;
      const msg =
        status === 429
          ? `Gemini quota or rate limit exceeded (429). Check your Google AI Studio quota or wait a minute before retrying.`
          : rawMsg;
      throw new AppError(msg, status, "AI_PROVIDER_ERROR");
    }

    let text = "";
    if (typeof data?.output_text === "string" && data.output_text) {
      text = data.output_text;
    } else if (Array.isArray(data?.steps)) {
      const parts = [];
      for (const step of data.steps) {
        if (Array.isArray(step?.content?.parts)) {
          for (const p of step.content.parts) {
            if (p?.text) parts.push(p.text);
          }
        } else if (typeof step?.content?.text === "string") {
          parts.push(step.content.text);
        } else if (typeof step?.text === "string") {
          parts.push(step.text);
        }
      }
      text = parts.join("");
    } else if (Array.isArray(data?.candidates?.[0]?.content?.parts)) {
      text = data.candidates[0].content.parts.map((p) => p?.text || "").join("");
    } else if (typeof data?.candidates?.[0]?.output === "string") {
      text = data.candidates[0].output;
    }

    const cleanText = text.trim();
    if (!cleanText) {
      throw new AppError("AI returned an empty response", 502, "AI_PARSE_ERROR");
    }

    return expectJson ? extractJsonFromText(cleanText) : cleanText;
  }

  async #callClaude({ apiKey, model, systemInstruction, prompt, pdfBase64, expectJson, timeoutMs = 90_000 }) {
    const content = [];
    if (pdfBase64) {
      content.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: pdfBase64,
        },
      });
    }
    content.push({ type: "text", text: prompt });

    const res = await this.#safeFetch(
      "Claude",
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          temperature: 0.1,
          ...(systemInstruction ? { system: systemInstruction } : {}),
          messages: [{ role: "user", content }],
        }),
      },
      timeoutMs
    );

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.error?.message || `Claude API failed (${res.status})`;
      throw new AppError(msg, res.status >= 400 && res.status < 500 ? 400 : 502, "AI_PROVIDER_ERROR");
    }

    const text = (data?.content || [])
      .filter((block) => block.type === "text")
      .map((block) => block.text || "")
      .join("\n");

    return expectJson ? extractJsonFromText(text) : text.trim();
  }

  async testConnection({ provider, apiKey, model } = {}) {
    const creds = this.resolveCredentials({ provider, apiKey, model });
    const reply = await this.callProvider({
      ...creds,
      prompt: 'Reply with JSON: {"ok": true}',
      expectJson: true,
      timeoutMs: 15_000,
    });
    return {
      ok: Boolean(reply),
      provider: creds.provider,
      model: creds.model,
    };
  }

  async unlockSpreadsheetBuffer(buffer, password = "") {
    let encrypted = false;
    try {
      encrypted = officeCrypto.isEncrypted(buffer);
    } catch {
      // Plain CSV or non-OLE2/OOXML small buffers are not encrypted
      encrypted = false;
    }

    if (!encrypted) {
      return buffer;
    }

    const cleanPassword = String(password || "").trim();
    if (!cleanPassword) {
      throw new ValidationError(
        "This Excel statement is password-protected. Enter the statement password and try again."
      );
    }

    try {
      return await officeCrypto.decrypt(buffer, { password: cleanPassword });
    } catch {
      throw new ValidationError(
        "Incorrect statement password. Please check the password and try again."
      );
    }
  }

  /**
   * Deterministically extracts exact date, amount, debit/credit type, narration,
   * and reference from tabular bank statements (HDFC, SBI, ICICI, CSV, etc.).
   */
  extractStructuredSpreadsheetRows(buffer) {
    let workbook;
    try {
      workbook = XLSX.read(buffer, { type: "buffer" });
    } catch (err) {
      if (String(err?.message || "").toLowerCase().includes("password")) {
        throw new ValidationError(
          "This spreadsheet is password-protected. Enter the statement password and try again."
        );
      }
      throw new ValidationError("Could not read the uploaded spreadsheet file.");
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new ValidationError("No readable sheet found in uploaded spreadsheet");
    }

    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      defval: "",
      raw: false,
    });

    const headerIdx = rows.findIndex((row) => {
      const joined = row.map((c) => String(c ?? "").toLowerCase()).join(" ");
      const hasDate = joined.includes("date");
      const hasDesc =
        joined.includes("narration") ||
        joined.includes("particular") ||
        joined.includes("description") ||
        joined.includes("remark") ||
        joined.includes("details");
      const hasAmt =
        joined.includes("withdrawal") ||
        joined.includes("debit") ||
        joined.includes("deposit") ||
        joined.includes("credit") ||
        joined.includes("amount");
      return hasDate && hasDesc && hasAmt;
    });

    if (headerIdx === -1) return null;

    const headers = rows[headerIdx].map((h) => String(h ?? "").trim().toLowerCase());
    const findCol = (patterns) =>
      headers.findIndex((h) => patterns.some((p) => h.includes(p)));

    const dateCol = findCol(["txn date", "tran date", "transaction date", "date"]);
    const descCol = findCol(["narration", "particular", "description", "remark", "details"]);
    const refCol = findCol(["ref", "chq", "utr", "cheque"]);
    const debitCol = findCol(["withdrawal", "debit", "dr amt", "dr."]);
    const creditCol = findCol(["deposit", "credit", "cr amt", "cr."]);
    const amountCol = findCol(["amount", "txn amt"]);
    const typeCol = findCol(["dr/cr", "type", "cr/dr"]);
    const balanceCol = findCol(["closing balance", "balance", "bal"]);

    if (dateCol === -1 || descCol === -1) return null;
    if (debitCol === -1 && creditCol === -1 && amountCol === -1) return null;

    const extracted = [];
    let totalDebits = 0;
    let totalCredits = 0;
    let debitsCount = 0;
    let creditsCount = 0;
    let firstRowClosingBal = null;
    let lastRowClosingBal = null;
    let firstRowType = null;
    let firstRowAmount = 0;

    // Scan for bank statement summary block (e.g. HDFC statement summary table)
    let statementSummary = null;
    for (let i = headerIdx + 1; i < rows.length; i += 1) {
      const rowStr = (rows[i] || []).join(" ").toLowerCase();
      if (rowStr.includes("statement summary")) {
        const hRow = (rows[i + 1] || []).map((c) => String(c ?? "").trim().toLowerCase());
        const vRow = rows[i + 2] || [];
        const chRow = (rows[i + 4] || []).map((c) => String(c ?? "").trim().toLowerCase());
        const cvRow = rows[i + 5] || [];

        const findVal = (labelPatterns, headerList, valList) => {
          const idx = headerList.findIndex((h) => labelPatterns.some((p) => h.includes(p)));
          return idx >= 0 ? parseNumericAmount(valList[idx]) : null;
        };

        const sOpening = findVal(["opening balance", "opening"], hRow, vRow);
        const sDebits = findVal(["debits", "debit", "withdrawal"], hRow, vRow);
        const sCredits = findVal(["credits", "credit", "deposit"], hRow, vRow);
        const sClosing = findVal(["closing bal", "closing"], hRow, vRow);
        const sDrCount = findVal(["dr count", "debit count"], chRow, cvRow);
        const sCrCount = findVal(["cr count", "credit count"], chRow, cvRow);

        statementSummary = {
          openingBalance: sOpening,
          debits: sDebits,
          credits: sCredits,
          closingBalance: sClosing,
          drCount: sDrCount,
          crCount: sCrCount,
        };
        break;
      }
    }

    for (let i = headerIdx + 1; i < rows.length; i += 1) {
      const row = rows[i];
      if (!row || !row.some((c) => String(c ?? "").trim() !== "")) continue;

      const firstCell = String(row[0] ?? "").trim().toLowerCase();
      if (firstCell.startsWith("***")) {
        continue;
      }
      if (
        firstCell.includes("statement summary") ||
        firstCell.includes("end of statement") ||
        firstCell.includes("opening balance")
      ) {
        break;
      }

      const parsedDate = parseStatementDate(row[dateCol]);
      if (!parsedDate) continue;

      const narration = String(row[descCol] ?? "").replace(/\s+/g, " ").trim();
      if (!narration) continue;

      const reference = refCol >= 0 ? String(row[refCol] ?? "").trim() : "";
      const closingVal = balanceCol >= 0 ? parseNumericAmount(row[balanceCol]) : null;

      let type = "expense";
      let amount = 0;

      if (debitCol >= 0 || creditCol >= 0) {
        const debitVal = debitCol >= 0 ? parseNumericAmount(row[debitCol]) : 0;
        const creditVal = creditCol >= 0 ? parseNumericAmount(row[creditCol]) : 0;
        if (debitVal > 0 && creditVal === 0) {
          type = "expense";
          amount = debitVal;
        } else if (creditVal > 0 && debitVal === 0) {
          type = "income";
          amount = creditVal;
        } else if (debitVal > 0) {
          type = "expense";
          amount = debitVal;
        }
      } else if (amountCol >= 0) {
        const rawAmt = parseNumericAmount(row[amountCol]);
        const dirText = typeCol >= 0 ? String(row[typeCol] ?? "").toLowerCase() : "";
        if (dirText.includes("cr") || dirText.includes("credit") || dirText.includes("dep")) {
          type = "income";
          amount = Math.abs(rawAmt);
        } else if (rawAmt < 0) {
          type = "expense";
          amount = Math.abs(rawAmt);
        } else {
          type = "expense";
          amount = Math.abs(rawAmt);
        }
      }

      if (amount <= 0) continue;

      if (extracted.length === 0) {
        firstRowClosingBal = closingVal;
        firstRowType = type;
        firstRowAmount = amount;
      }
      if (closingVal !== null) {
        lastRowClosingBal = closingVal;
      }

      if (type === "income") {
        totalCredits += amount;
        creditsCount += 1;
      } else {
        totalDebits += amount;
        debitsCount += 1;
      }

      extracted.push({
        index: extracted.length,
        date: parsedDate,
        type,
        amount,
        rawNarration: narration,
        reference,
        closingBalance: closingVal,
      });
    }

    if (extracted.length === 0) return null;

    // Determine Opening and Closing balances
    let openingBalance =
      statementSummary?.openingBalance !== null && statementSummary?.openingBalance !== undefined
        ? statementSummary.openingBalance
        : firstRowClosingBal !== null
        ? firstRowType === "expense"
          ? firstRowClosingBal + firstRowAmount
          : firstRowClosingBal - firstRowAmount
        : 0;

    let closingBalance =
      statementSummary?.closingBalance !== null && statementSummary?.closingBalance !== undefined
        ? statementSummary.closingBalance
        : lastRowClosingBal !== null
        ? lastRowClosingBal
        : openingBalance + totalCredits - totalDebits;

    openingBalance = Math.round(openingBalance * 100) / 100;
    closingBalance = Math.round(closingBalance * 100) / 100;
    const roundedDebits = Math.round(totalDebits * 100) / 100;
    const roundedCredits = Math.round(totalCredits * 100) / 100;
    const calculatedClosing = Math.round((openingBalance + roundedCredits - roundedDebits) * 100) / 100;
    const isReconciled = Math.abs(calculatedClosing - closingBalance) < 1;

    return {
      rows: extracted,
      totalDebits: Math.round(roundedDebits),
      totalCredits: Math.round(roundedCredits),
      debitsCount: statementSummary?.drCount ?? debitsCount,
      creditsCount: statementSummary?.crCount ?? creditsCount,
      openingBalance,
      closingBalance,
      calculatedClosing,
      isReconciled,
      statementSummaryFound: Boolean(statementSummary),
    };
  }

  /**
   * Extracts clean non-empty text chunks from CSV/Excel files as fallback for
   * non-standard spreadsheet layouts.
   */
  extractSpreadsheetChunks(buffer) {
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new ValidationError("No readable sheet found in uploaded spreadsheet");
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    const nonEmptyRows = rows
      .map((row) =>
        row.map((cell) => {
          if (cell instanceof Date) {
            return cell.toISOString().split("T")[0];
          }
          return String(cell ?? "").replace(/\s+/g, " ").trim();
        })
      )
      .filter((row) => row.some((cell) => cell !== ""));

    if (nonEmptyRows.length === 0) {
      throw new ValidationError("The uploaded spreadsheet has no data rows");
    }

    // Preserve up to the first few header/preamble rows on each chunk
    const headerRowIdx = nonEmptyRows.findIndex((row) => {
      const joined = row.join(" ").toLowerCase();
      return (
        joined.includes("date") &&
        (joined.includes("amount") ||
          joined.includes("debit") ||
          joined.includes("credit") ||
          joined.includes("withdrawal") ||
          joined.includes("deposit") ||
          joined.includes("particular") ||
          joined.includes("description") ||
          joined.includes("narration"))
      );
    });

    const preamble = headerRowIdx >= 0 ? nonEmptyRows.slice(0, headerRowIdx + 1) : [nonEmptyRows[0]];
    const dataStart = headerRowIdx >= 0 ? headerRowIdx + 1 : 1;
    const dataRows = nonEmptyRows.slice(dataStart);

    const formatRows = (list) => list.map((r) => r.join(" | ")).join("\n");

    if (dataRows.length === 0) {
      return [formatRows(preamble)];
    }

    const chunks = [];
    for (let i = 0; i < dataRows.length; i += CSV_CHUNK_SIZE) {
      const slice = dataRows.slice(i, i + CSV_CHUNK_SIZE);
      chunks.push(formatRows([...preamble, ...slice]));
    }
    return chunks;
  }

  normalizeParsedTransactions(rawList, { existingCategories = [], walletName = "Bank Account" } = {}) {
    const categoryNames = new Map(
      existingCategories.map((c) => [c.name.trim().toLowerCase(), c.name])
    );

    const normalized = [];
    for (let idx = 0; idx < (rawList || []).length; idx += 1) {
      const item = rawList[idx] || {};
      const amount = Math.round(Math.abs(Number(item.amount) || 0));
      if (!Number.isFinite(amount) || amount <= 0) continue;

      const parsedDate = parseStatementDate(item.date);
      const safeDate = parsedDate ? new Date(`${parsedDate}T00:00:00.000Z`) : new Date();
      const isoDate = safeDate.toISOString();
      const dateStr = isoDate.split("T")[0];

      const rawType = String(item.type || "expense").toLowerCase();
      const type =
        rawType === "income" || rawType === "credit"
          ? "income"
          : rawType === "transfer"
          ? "transfer"
          : "expense";

      const payee = String(item.payee || item.merchant || item.note || "Bank Transaction").trim();
      const note = String(item.note || payee).trim();

      const rawCat = String(item.category || "").trim();
      const matchedExisting = categoryNames.get(rawCat.toLowerCase());
      const finalCategory =
        type === "transfer"
          ? "Transfer"
          : matchedExisting || rawCat || (type === "income" ? "Income" : "Uncategorized");

      const suggestedNewCategory =
        type !== "transfer" &&
        Boolean(finalCategory) &&
        finalCategory !== "Uncategorized" &&
        !categoryNames.has(finalCategory.toLowerCase());

      const ref = String(item.reference || item.external_id || "").trim();
      const fingerprintSource = `${dateStr}|${type}|${amount}|${payee.toLowerCase()}|${idx}`;
      const digest = crypto.createHash("sha1").update(fingerprintSource).digest("hex").slice(0, 12);
      const externalId = ref ? `stmt_${ref.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32)}` : `stmt_${digest}`;

      const isReversal = Boolean(item.isReversal || item.is_reversal || finalCategory === "Refund / Reversal" || payee.toLowerCase().startsWith("reversal:"));
      const isSplit = Boolean(item.isSplit || item.is_split);
      const splitPerson = item.splitPerson || item.split_person || null;
      const splitType = item.splitType || item.split_type || (type === "income" ? "settlement" : "lent");
      const isSalary = Boolean(item.isSalary || item.is_salary || finalCategory === "Salary");
      const isMicroSpend = amount <= 200 && type === "expense";

      normalized.push({
        external_id: externalId,
        date: dateStr,
        iso_date: isoDate,
        type: isReversal || isSalary ? "income" : type,
        amount,
        payee,
        note,
        wallet: walletName,
        category: finalCategory,
        suggestedNewCategory,
        categoryType: type === "income" ? "income" : "expense",
        closing_balance:
          item.closingBalance !== undefined && item.closingBalance !== null
            ? Math.round(Number(item.closingBalance) * 100) / 100
            : item.closing_balance ?? null,
        is_reversal: isReversal,
        reversal_ref: item.reversalRef || item.reversal_ref || ref || "",
        is_split: isSplit,
        split_person: splitPerson,
        split_type: splitType,
        is_salary: isSalary,
        is_micro_spend: isMicroSpend,
      });
    }

    return normalized;
  }

  #narrationPatternKey(row) {
    const raw = String(row.rawNarration || "").trim();
    if (raw.toUpperCase().startsWith("UPI-")) {
      const parts = raw.split("-").map((p) => p.trim()).filter(Boolean);
      const merchant = parts[1] || raw.slice(0, 32);
      const remark = parts.length > 4 ? parts[parts.length - 1] : "";
      return `${row.type}:UPI:${merchant.toUpperCase()}:${remark.toUpperCase()}`;
    }
    const slashUpiMatch = raw.match(
      /^(?:(?:WDL|DEP)\s+TFR\s+)?UPI\/(?:DR|CR)\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)(?:\/(.*))?$/i
    );
    if (slashUpiMatch) {
      const [, , rawPayee, , , rawTail] = slashUpiMatch;
      const firstToken = (rawTail || "").trim().split(/\s+/)[0];
      return `${row.type}:UPI_SLASH:${rawPayee.toUpperCase()}:${firstToken.toUpperCase()}`;
    }
    const stripped = raw.replace(/\d{5,}/g, "#").replace(/\s+/g, " ").trim().toUpperCase();
    return `${row.type}:${stripped.slice(0, 64)}`;
  }

  async #categorizeStructuredRows(
    rows,
    { existingCategories = [], currency = "INR", provider, apiKey, model, customRules = [] }
  ) {
    const categoryListText = existingCategories.length
      ? existingCategories.map((c) => `${c.name} (${c.type})`).join(", ")
      : "Food & Dining (expense), Shopping (expense), Travel (expense), Bills & Utilities (expense), Groceries (expense), Entertainment (expense), Health (expense), Investment (expense), Transfer (both), Salary (income)";

    const systemInstruction = [
      "You are a precise financial transaction categorizer.",
      `Currency: ${currency}. Existing user categories: ${categoryListText}.`,
      "For each input item {i, type, amount, narration}, return clean metadata:",
      '- Return JSON ONLY: {"items": [{"i": number, "payee": string, "note": string, "category": string, "type": "expense"|"income"|"transfer"}]}',
      "- payee: clean short merchant/person name (e.g. 'Zubaitha Restaurant', 'Selva Kumar K', 'Adminware Software').",
      "- note: concise context extracted from narration (e.g. 'Breakfast', 'Chicken Kothu', 'Salary Nov', 'Lending').",
      "- category: best match from Existing user categories; if none fit well, suggest a concise 1-2 word category name (e.g. 'Subscriptions', 'Lending').",
      "- Keep type as provided unless clearly an internal self-transfer between own accounts ('transfer').",
    ].join("\n");

    const labelMap = new Map();
    const unmatchedRows = [];

    // Pre-pass: run pure deterministic rules on each row first
    for (const row of rows) {
      const ruleResult = MerchantRuleService.categorizeTransaction(row, {
        customRules,
        existingCategories,
      });

      // If rule engine matched a known category or special pattern, save it directly
      if (
        ruleResult.matchedRule ||
        ruleResult.isSalary ||
        ruleResult.isReversal ||
        ruleResult.isSplit ||
        ruleResult.category !== "Uncategorized"
      ) {
        labelMap.set(row.index, {
          payee: ruleResult.payee,
          note: ruleResult.note,
          category: ruleResult.category,
          type: ruleResult.type,
          isReversal: ruleResult.isReversal,
          isSplit: ruleResult.isSplit,
          splitPerson: ruleResult.splitPerson,
          splitType: ruleResult.splitType,
          isSalary: ruleResult.isSalary,
        });
      } else {
        unmatchedRows.push(row);
      }
    }

    // If all rows matched rules or no AI credentials, return immediately
    const hasCreds = Boolean(apiKey || process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY);
    if (unmatchedRows.length === 0 || !hasCreds) {
      const rowsResult = rows.map((row) => {
        const labeled = labelMap.get(row.index) || MerchantRuleService.categorizeTransaction(row, { customRules, existingCategories });
        return {
          date: row.date,
          amount: row.amount,
          type: labeled.type || row.type,
          payee: labeled.payee || row.rawNarration.slice(0, 48),
          note: labeled.note || row.rawNarration,
          category: labeled.category || (row.type === "income" ? "Salary" : "Uncategorized"),
          reference: row.reference,
          closingBalance: row.closingBalance,
          isReversal: labeled.isReversal,
          isSplit: labeled.isSplit,
          splitPerson: labeled.splitPerson,
          splitType: labeled.splitType,
          isSalary: labeled.isSalary,
        };
      });
      return {
        rows: rowsResult,
        stats: {
          total: rows.length,
          ruleCount: labelMap.size,
          aiCount: 0,
          aiError: null,
        },
      };
    }

    // Deduplicate remaining unmatched rows for AI
    const uniqueEntries = [];
    const keyToGroupIdx = new Map();
    const rowToGroupIdx = new Map();

    for (const row of unmatchedRows) {
      const key = this.#narrationPatternKey(row);
      let groupIdx = keyToGroupIdx.get(key);
      if (groupIdx === undefined) {
        groupIdx = uniqueEntries.length;
        keyToGroupIdx.set(key, groupIdx);
        const cleaned = MerchantRuleService.cleanNarration(row.rawNarration, row.type);
        uniqueEntries.push({
          i: groupIdx,
          type: row.type,
          amount: Math.round(row.amount),
          payee: cleaned.payee,
          note: cleaned.note || row.rawNarration.slice(0, 60),
        });
      }
      rowToGroupIdx.set(row.index, groupIdx);
    }

    const aiLabelMap = new Map();
    let aiError = null;
    let aiCategorizedRows = 0;

    if (uniqueEntries.length > 0) {
      try {
        // Send a focused batch of ambiguous payees to AI (top 35 items)
        const compactBatch = uniqueEntries.slice(0, 35);
        const parsed = await this.callProvider({
          provider,
          apiKey,
          model,
          systemInstruction,
          prompt: `Categorize these ${compactBatch.length} transactions:\n${JSON.stringify(compactBatch)}`,
          expectJson: true,
          timeoutMs: 25_000,
        });

        const items = Array.isArray(parsed?.items) ? parsed.items : Array.isArray(parsed) ? parsed : [];
        for (const item of items) {
          if (item && typeof item.i === "number" && item.category) {
            aiLabelMap.set(item.i, item);
          }
        }
      } catch (err) {
        aiError = err?.message || "AI categorization unavailable";
      }
    }

    const finalRows = rows.map((row) => {
      const ruleLabeled = labelMap.get(row.index);
      if (ruleLabeled) {
        return {
          date: row.date,
          amount: row.amount,
          type: ruleLabeled.type || row.type,
          payee: ruleLabeled.payee,
          note: ruleLabeled.note,
          category: ruleLabeled.category,
          reference: row.reference,
          closingBalance: row.closingBalance,
          isReversal: ruleLabeled.isReversal,
          isSplit: ruleLabeled.isSplit,
          splitPerson: ruleLabeled.splitPerson,
          splitType: ruleLabeled.splitType,
          isSalary: ruleLabeled.isSalary,
        };
      }

      const groupIdx = rowToGroupIdx.get(row.index);
      const aiLabeled = aiLabelMap.get(groupIdx);
      const fallback = MerchantRuleService.categorizeTransaction(row, { customRules, existingCategories });

      if (aiLabeled) {
        aiCategorizedRows += 1;
      }

      return {
        date: row.date,
        amount: row.amount,
        type: aiLabeled?.type || row.type,
        payee: aiLabeled?.payee || fallback.payee || row.rawNarration.slice(0, 48),
        note: aiLabeled?.note || fallback.note || row.rawNarration,
        category: aiLabeled?.category || fallback.category || (row.type === "income" ? "Salary" : "Uncategorized"),
        reference: row.reference,
        closingBalance: row.closingBalance,
        isReversal: fallback.isReversal,
        isSplit: fallback.isSplit,
        splitPerson: fallback.splitPerson,
        splitType: fallback.splitType,
        isSalary: fallback.isSalary,
        aiEnhanced: Boolean(aiLabeled),
      };
    });

    return {
      rows: finalRows,
      stats: {
        total: rows.length,
        ruleCount: labelMap.size,
        aiCount: aiCategorizedRows,
        aiError,
      },
    };
  }

  async parseBankStatement({
    buffer,
    fileName = "",
    mimeType = "",
    password = "",
    existingCategories = [],
    walletName = "Bank Account",
    currency = "INR",
    provider,
    apiKey,
    model,
    mode = "auto",
    customRules = [],
  }) {
    if (!buffer || buffer.length === 0) {
      throw new ValidationError("Uploaded file is empty");
    }

    const lowerName = fileName.toLowerCase();
    const isPdf = mimeType === "application/pdf" || lowerName.endsWith(".pdf");
    const isSpreadsheet =
      lowerName.endsWith(".csv") ||
      lowerName.endsWith(".xlsx") ||
      lowerName.endsWith(".xls") ||
      mimeType.includes("csv") ||
      mimeType.includes("spreadsheet") ||
      mimeType.includes("excel");

    if (!isPdf && !isSpreadsheet) {
      throw new ValidationError(
        "Unsupported file type. Upload a PDF (.pdf), CSV (.csv), or Excel (.xlsx/.xls) bank statement."
      );
    }

    const categoryListText = existingCategories.length
      ? existingCategories.map((c) => `${c.name} (${c.type})`).join(", ")
      : "Food & Dining (expense), Shopping (expense), Travel (expense), Bills & Utilities (expense), Groceries (expense), Entertainment (expense), Health (expense), Investment (expense), Transfer (both), Salary (income)";

    const systemInstruction = [
      "You are a precise financial statement parser.",
      `Target account currency: ${currency}.`,
      `Existing user categories: ${categoryListText}.`,
      "Extract ONLY actual ledger transactions (debits, credits, transfers). Ignore opening/closing balances, summary totals, page numbers, and bank disclaimers.",
      "Rules:",
      "- Return valid JSON ONLY with shape: {\"transactions\": [...]}",
      "- Each item must have: date (YYYY-MM-DD), amount (positive number, no currency symbol), type ('expense' | 'income' | 'transfer'), payee (clean merchant/person name), note (concise description), category (best match from Existing user categories; if none fit well, suggest a concise 1-2 word category name), reference (UTR/ref code if present, else empty string).",
      "- Classify self-transfers / credit card bill transfers between own accounts as 'transfer' ONLY when clearly an internal transfer; ATM/UPI/merchant payments are 'expense'; salary/refunds/interest/deposits are 'income'.",
    ].join("\n");

    let rawItems = [];
    let extractionMode = "ai_document";
    let statementTotals = null;
    let statementReconciliation = null;
    let categorizationStats = null;

    if (isPdf) {
      const pdfBase64 = Buffer.from(buffer).toString("base64");
      const parsed = await this.callProvider({
        provider,
        apiKey,
        model,
        systemInstruction,
        pdfBase64,
        prompt: `Parse all bank transactions from this PDF statement (${fileName}). Return JSON: {"transactions": [...]}.`,
        expectJson: true,
      });
      rawItems = Array.isArray(parsed?.transactions) ? parsed.transactions : Array.isArray(parsed) ? parsed : [];
    } else {
      const unlockedBuffer = await this.unlockSpreadsheetBuffer(Buffer.from(buffer), password);
      const structured = this.extractStructuredSpreadsheetRows(unlockedBuffer);

      if (structured && structured.rows.length > 0) {
        statementTotals = {
          totalDebits: structured.totalDebits,
          totalCredits: structured.totalCredits,
        };
        statementReconciliation = {
          openingBalance: structured.openingBalance,
          closingBalance: structured.closingBalance,
          calculatedClosing: structured.calculatedClosing,
          totalDebits: structured.totalDebits,
          totalCredits: structured.totalCredits,
          debitsCount: structured.debitsCount,
          creditsCount: structured.creditsCount,
          isReconciled: structured.isReconciled,
          statementSummaryFound: structured.statementSummaryFound,
        };

        if (mode === "deterministic") {
          extractionMode = "deterministic";
          rawItems = structured.rows.map((row) => {
            const categorized = MerchantRuleService.categorizeTransaction(row, {
              customRules,
              existingCategories,
            });
            return {
              date: row.date,
              amount: row.amount,
              type: categorized.type || row.type,
              payee: categorized.payee,
              note: categorized.note,
              category: categorized.category,
              reference: row.reference,
              closingBalance: row.closingBalance,
              isReversal: categorized.isReversal,
              isSplit: categorized.isSplit,
              splitPerson: categorized.splitPerson,
              splitType: categorized.splitType,
              isSalary: categorized.isSalary,
            };
          });
        } else {
          extractionMode = "hybrid";
          const categorized = await this.#categorizeStructuredRows(structured.rows, {
            existingCategories,
            currency,
            provider,
            apiKey,
            model,
            customRules,
          });
          rawItems = Array.isArray(categorized) ? categorized : categorized.rows;
          categorizationStats = categorized.stats || null;
        }
      } else {
        extractionMode = "ai_chunks";
        const chunks = this.extractSpreadsheetChunks(unlockedBuffer);
        for (const chunkText of chunks) {
          const parsed = await this.callProvider({
            provider,
            apiKey,
            model,
            systemInstruction,
            prompt: `Parse all transactions from these bank statement rows:\n\n${chunkText}\n\nReturn JSON: {"transactions": [...]}.`,
            expectJson: true,
          });
          const items = Array.isArray(parsed?.transactions)
            ? parsed.transactions
            : Array.isArray(parsed)
            ? parsed
            : [];
          rawItems.push(...items);
        }
      }
    }

    const transactions = this.normalizeParsedTransactions(rawItems, {
      existingCategories,
      walletName,
    });

    let creds = null;
    try {
      creds = this.resolveCredentials({ provider, apiKey, model });
    } catch {
      creds = { provider: "deterministic", model: "rule-engine" };
    }

    return {
      provider: creds.provider,
      model: creds.model,
      extractionMode,
      statementTotals,
      statementReconciliation,
      categorizationStats,
      count: transactions.length,
      transactions,
    };
  }

  async generateSpendInsights({
    analytics,
    planning,
    transactions = [],
    currency = "INR",
    provider,
    apiKey,
    model,
  }) {
    const creds = this.resolveCredentials({ provider, apiKey, model });

    const compactTxs = transactions.slice(0, 60).map((t) => ({
      date: String(t.created_at || "").split("T")[0],
      type: t.type,
      amount: t.amount,
      category: t.transaction?.category?.name || "Uncategorized",
      payee: t.transaction?.payee || t.transaction?.note || "",
    }));

    const totalIncome = Number(analytics?.summary?.income) || 0;
    const totalExpense = Number(analytics?.summary?.expense) || 0;
    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

    const sortedCategories = (analytics?.categoryBreakdown || [])
      .map((c) => ({
        name: c.name,
        spent: Number(c.spent) || 0,
        percentage: totalExpense > 0 ? Math.round(((Number(c.spent) || 0) / totalExpense) * 100) : 0,
        budget: Number(c.monthly_budget) || 0,
        isOverBudget: c.monthly_budget > 0 && Number(c.spent) > Number(c.monthly_budget),
      }))
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 8);

    // Group transactions by payee to find top spending drivers
    const payeeTotals = new Map();
    for (const t of transactions) {
      if (t.type !== "expense") continue;
      const name = t.transaction?.payee || t.transaction?.note || "Miscellaneous";
      const existing = payeeTotals.get(name) || { name, total: 0, count: 0, category: t.transaction?.category?.name };
      existing.total += Number(t.amount) || 0;
      existing.count += 1;
      payeeTotals.set(name, existing);
    }
    const topMerchants = Array.from(payeeTotals.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    const contextPayload = {
      currency,
      period: analytics?.period || "this_month",
      financialOverview: {
        totalIncome,
        totalExpense,
        netSavings,
        savingsRate: `${savingsRate}%`,
      },
      spendingPace: analytics?.spendingPace || {},
      topExpenseCategories: sortedCategories,
      topSpendingMerchants: topMerchants,
      wallets: (analytics?.wallets || []).map((w) => ({
        name: w.name,
        type: w.type,
        balance: w.balance,
        spent: w.spent,
      })),
      cashflowPlan: planning?.cashflow || {},
      goalsSummary: planning?.goalsSummary || {},
      recurringSummary: planning?.recurringSummary || {},
      recentTransactions: compactTxs.slice(0, 30),
    };

    const systemInstruction = [
      "You are a seasoned, quantitative personal finance analyst.",
      `All monetary amounts are strictly in ${currency}.`,
      "Analyze the provided financial overview, top categories, and top merchants with precision.",
      "Rules:",
      "- Every highlight must cite concrete numbers, percentages, and actual merchant/category names from the data.",
      "- Headline must be an executive summary stating net savings/deficit, savings rate, and the primary spend driver.",
      "- In usageTrends, call out top merchant patterns, daily pacing, and category overruns.",
      "- In subscriptionsAndLeaks, highlight recurring charges and high-frequency micro-spends with monthly impact.",
      "- In recommendations, give pragmatic actions with estimated monthly savings in rupees.",
      "- Return strictly valid JSON matching this schema:",
      "{",
      '  "headline": "Executive takeaway with exact numbers and primary spend driver",',
      '  "healthScore": 0-100 integer,',
      '  "healthLabel": "Strong | Healthy | Balanced | Watch Spend | Tight Cashflow",',
      '  "highlights": [{"title": "...", "detail": "...", "impact": "positive|warning|neutral", "metric": "..."}],',
      '  "usageTrends": [{"title": "...", "detail": "..."}],',
      '  "subscriptionsAndLeaks": [{"name": "...", "estimatedMonthly": number, "frequency": "...", "note": "..."}],',
      '  "recommendations": [{"title": "...", "action": "...", "potentialMonthlySavings": number}]',
      "}",
    ].join("\n");

    const raw = await this.callProvider({
      ...creds,
      systemInstruction,
      prompt: `Analyze this financial snapshot and generate actionable spend analysis & usage trends:\n\n${JSON.stringify(
        contextPayload
      )}`,
      expectJson: true,
    });

    return {
      provider: creds.provider,
      model: creds.model,
      period: analytics?.period || "this_month",
      generatedAt: new Date().toISOString(),
      insights: {
        headline: String(raw?.headline || "Financial snapshot analyzed."),
        healthScore: Math.max(0, Math.min(100, Math.round(Number(raw?.healthScore) || 70))),
        healthLabel: String(raw?.healthLabel || "Balanced"),
        highlights: Array.isArray(raw?.highlights) ? raw.highlights.slice(0, 4) : [],
        usageTrends: Array.isArray(raw?.usageTrends) ? raw.usageTrends.slice(0, 4) : [],
        subscriptionsAndLeaks: Array.isArray(raw?.subscriptionsAndLeaks)
          ? raw.subscriptionsAndLeaks.slice(0, 5)
          : [],
        recommendations: Array.isArray(raw?.recommendations)
          ? raw.recommendations.slice(0, 4)
          : [],
      },
    };
  }
}

