export const CARD_CURRENCIES = ["AED", "USD", "GBP", "INR"] as const;

export type CardCurrency = (typeof CARD_CURRENCIES)[number];

// CBUAE mid rates published on 28 August 2026. Values are AED per unit of
// foreign currency. These are indicative display conversions, not quotations.
export const CARD_CURRENCY_RATE_DATE = "28 August 2026";
export const CARD_CURRENCY_RATE_SOURCE = "https://www.centralbank.ae/en/forex-eibor/exchange-rates/";

const AED_PER_CURRENCY: Record<CardCurrency, number> = {
  AED: 1,
  USD: 3.6725,
  GBP: 4.987099,
  INR: 0.038503,
};

function compactNumber(value: string) {
  const cleaned = value.replace(/\s/g, "");
  if (cleaned.includes(".") && cleaned.includes(",")) return Number(cleaned.replaceAll(",", ""));
  if (cleaned.includes(",")) return Number(cleaned.replaceAll(",", "."));
  return Number(cleaned);
}

export function parseAedAmount(value: string | number | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : null;
  const raw = String(value || "").trim();
  if (!raw) return null;

  const compact = raw.match(/([\d][\d.,\s]*)\s*([MK])\b/i);
  if (compact) {
    const amount = compactNumber(compact[1]);
    const multiplier = compact[2].toUpperCase() === "M" ? 1_000_000 : 1_000;
    return Number.isFinite(amount) && amount > 0 ? amount * multiplier : null;
  }

  const full = raw.match(/[\d][\d,.\s]*/)?.[0].replace(/[\s,]/g, "");
  const amount = Number(full);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export function convertAedAmount(amountAed: number, currency: CardCurrency) {
  return Math.round(amountAed / AED_PER_CURRENCY[currency]);
}

export function formatAedCardPrice(value: string | number | null | undefined) {
  const amount = parseAedAmount(value);
  return amount ? `AED ${Math.round(amount).toLocaleString("en-AE")}` : "Price on request";
}

function formatDisplayNumber(amount: number, currency: CardCurrency) {
  const locale = currency === "INR" ? "en-IN" : currency === "GBP" ? "en-GB" : currency === "USD" ? "en-US" : "en-AE";
  return amount.toLocaleString(locale, { maximumFractionDigits: 0 });
}

export function convertDisplayCurrencyAmountToAed(amount: number, currency: CardCurrency) {
  return Math.round(amount * AED_PER_CURRENCY[currency]);
}

export function formatEditableCurrencyAmount(amountAed: number, currency: CardCurrency) {
  return formatDisplayNumber(convertAedAmount(amountAed, currency), currency);
}

export function formatDisplayCurrencyUnit(amountAed: number, currency: CardCurrency, suffix = "") {
  return `${currency} ${formatDisplayNumber(convertAedAmount(amountAed, currency), currency)}${suffix}`;
}

export function formatCardCurrencyAmount(amountAed: number, currency: CardCurrency) {
  const converted = convertAedAmount(amountAed, currency);
  const amount = currency === "AED" ? Math.round(converted) : Math.round(converted / 1_000) * 1_000;
  return `${currency} ${formatDisplayNumber(amount, currency)}`;
}

export function formatDisplayCurrencyAmount(amountAed: number, currency: CardCurrency) {
  const formatted = `${currency} ${formatDisplayNumber(convertAedAmount(amountAed, currency), currency)}`;
  return currency === "AED" ? formatted : `≈ ${formatted}`;
}

export function formatCardCurrencyLabel(aedLabel: string, amountAed: number, currency: CardCurrency) {
  const converted = formatCardCurrencyAmount(amountAed, currency);
  return /AED\s*[\d][\d,.]*(?:\s*[MK]\b)?/i.test(aedLabel)
    ? aedLabel.replace(/AED\s*[\d][\d,.]*(?:\s*[MK]\b)?/i, converted)
    : converted;
}
