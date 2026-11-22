import { NextResponse } from "next/server";
import { ApiController } from "@/app/server/http/ApiController";
import { ValidationError } from "@/app/server/domain/errors";

const MAX_STATEMENT_BYTES = 15 * 1024 * 1024; // 15 MB

export async function POST(req) {
  return ApiController.handle(async ({ services, user }) => {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file.arrayBuffer !== "function") {
      throw new ValidationError("Please select a bank statement file (PDF, CSV, or Excel).");
    }

    if (file.size > MAX_STATEMENT_BYTES) {
      throw new ValidationError("File size exceeds the 15 MB upload limit.");
    }

    const provider = String(formData.get("provider") || "").trim() || undefined;
    const model = String(formData.get("model") || "").trim() || undefined;
    const apiKey =
      String(formData.get("apiKey") || "").trim() ||
      req.headers.get("x-ai-key") ||
      "";
    const walletName = String(formData.get("wallet") || "Bank Account").trim() || "Bank Account";
    const password = String(formData.get("password") || "");
    const mode = String(formData.get("mode") || "auto").trim();

    const [categories, existingExternalIds, arrayBuf] = await Promise.all([
      services.categoryService.list(user.id),
      services.transactionService.getExistingExternalIds(user.id),
      file.arrayBuffer(),
    ]);

    const parsed = await services.aiService.parseBankStatement({
      buffer: Buffer.from(arrayBuf),
      fileName: file.name || "",
      mimeType: file.type || "",
      password,
      existingCategories: categories,
      walletName,
      currency: user.currency || "INR",
      provider,
      apiKey,
      model,
      mode,
    });

    const transactions = parsed.transactions.map((tx) => ({
      ...tx,
      isDuplicate: existingExternalIds.has(tx.external_id),
    }));

    return NextResponse.json({
      provider: parsed.provider,
      model: parsed.model,
      extractionMode: parsed.extractionMode,
      statementTotals: parsed.statementTotals,
      statementReconciliation: parsed.statementReconciliation,
      categorizationStats: parsed.categorizationStats || null,
      count: transactions.length,
      duplicateCount: transactions.filter((t) => t.isDuplicate).length,
      newCategoryCount: new Set(
        transactions.filter((t) => t.suggestedNewCategory).map((t) => t.category)
      ).size,
      transactions,
    });
  });
}

