const CURRENCY_CONFIG = {
  INR: { locale: "en-IN", symbol: "₹" },
  USD: { locale: "en-US", symbol: "$" },
  EUR: { locale: "de-DE", symbol: "€" },
  GBP: { locale: "en-GB", symbol: "£" },
};

export function getCurrencySymbol(currency = "INR") {
  return CURRENCY_CONFIG[currency]?.symbol || "₹";
}

export function formatAmountParts(amount, currency = "INR") {
  const numeric = Number(amount) || 0;
  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.INR;
  const abs = Math.abs(numeric);
  const [wholeRaw, decimal] = abs.toFixed(2).split(".");
  const formattedWhole = new Intl.NumberFormat(config.locale, {
    maximumFractionDigits: 0,
  }).format(Number(wholeRaw));

  return {
    sign: numeric < 0 ? "-" : "",
    symbol: config.symbol,
    whole: formattedWhole,
    decimal,
  };
}

export function cFormat(
  number,
  { currency = "INR", withSymbol = true, decimals = 0 } = {}
) {
  const numeric = Number(number) || 0;
  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.INR;
  const formatted = new Intl.NumberFormat(config.locale, {
    style: "decimal",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(numeric));

  const prefix = numeric < 0 ? "-" : "";
  return withSymbol ? `${prefix}${config.symbol}${formatted}` : `${prefix}${formatted}`;
}
