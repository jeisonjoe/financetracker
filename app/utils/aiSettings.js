export const AI_STORAGE_KEY = "fintrack_ai_settings";

export const GEMINI_MODELS = [
  { key: "gemini-3.8-flash", name: "Gemini 3.8 Flash (Recommended)" },
  { key: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro Preview" },
];

export const CLAUDE_MODELS = [
  { key: "claude-sonnet-4-20250514", name: "Claude Sonnet 4 (Recommended)" },
  { key: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku" },
];

export const DEFAULT_AI_SETTINGS = {
  provider: "gemini",
  geminiKey: "",
  claudeKey: "",
  geminiModel: GEMINI_MODELS[0].key,
  claudeModel: CLAUDE_MODELS[0].key,
};

export function loadAiSettings() {
  if (typeof window === "undefined") return { ...DEFAULT_AI_SETTINGS };
  try {
    const raw = window.localStorage.getItem(AI_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_AI_SETTINGS };
    const parsed = JSON.parse(raw);
    const validGeminiKeys = new Set(GEMINI_MODELS.map((m) => m.key));
    const isDeprecated =
      parsed.geminiModel === "gemini-2.5-pro" ||
      parsed.geminiModel === "gemini-2.0-flash" ||
      parsed.geminiModel === "gemini-2.5-flash" ||
      parsed.geminiModel === "gemini-1.5-flash" ||
      parsed.geminiModel === "gemini-1.5-pro" ||
      !validGeminiKeys.has(parsed.geminiModel);

    const geminiModel = isDeprecated ? DEFAULT_AI_SETTINGS.geminiModel : parsed.geminiModel;

    return {
      ...DEFAULT_AI_SETTINGS,
      ...parsed,
      geminiModel,
    };
  } catch {
    return { ...DEFAULT_AI_SETTINGS };
  }
}

export function saveAiSettings(next) {
  const merged = {
    ...DEFAULT_AI_SETTINGS,
    ...next,
  };
  const validGeminiKeys = new Set(GEMINI_MODELS.map((m) => m.key));
  if (!validGeminiKeys.has(merged.geminiModel)) {
    merged.geminiModel = DEFAULT_AI_SETTINGS.geminiModel;
  }
  if (typeof window !== "undefined") {
    window.localStorage.setItem(AI_STORAGE_KEY, JSON.stringify(merged));
  }
  return merged;
}

export function getActiveAiRequestConfig(settings = loadAiSettings()) {
  const provider = settings.provider === "claude" ? "claude" : "gemini";
  const apiKey =
    provider === "claude"
      ? (settings.claudeKey || "").trim()
      : (settings.geminiKey || "").trim();
  const model =
    provider === "claude"
      ? settings.claudeModel || CLAUDE_MODELS[0].key
      : settings.geminiModel || GEMINI_MODELS[0].key;

  return { provider, apiKey, model };
}

