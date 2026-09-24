"use client";

import { useEffect, useId, useState } from "react";
import { CARD_CURRENCIES, type CardCurrency } from "@/lib/card-currency";

const currencyPreferenceKey = "psr-display-currency";
const currencyPreferenceEvent = "psr:display-currency";

export const currencyNames: Record<CardCurrency, string> = {
  AED: "UAE dirhams",
  USD: "US dollars",
  GBP: "British pounds",
  INR: "Indian rupees",
};

function isCardCurrency(value: unknown): value is CardCurrency {
  return typeof value === "string" && (CARD_CURRENCIES as readonly string[]).includes(value);
}

export function useDisplayCurrency() {
  const [currency, setCurrency] = useState<CardCurrency>("AED");
  const [announce, setAnnounce] = useState(false);
  const sourceId = useId();

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(currencyPreferenceKey);
      if (isCardCurrency(saved)) setCurrency(saved);
    } catch { /* The AED default remains available when storage is blocked. */ }

    const syncCurrency = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail as { currency?: unknown; sourceId?: unknown } : null;
      if (!isCardCurrency(detail?.currency) || detail?.sourceId === sourceId) return;
      setAnnounce(false);
      setCurrency(detail.currency);
    };
    window.addEventListener(currencyPreferenceEvent, syncCurrency);
    return () => window.removeEventListener(currencyPreferenceEvent, syncCurrency);
  }, [sourceId]);

  function chooseCurrency(nextCurrency: CardCurrency) {
    setAnnounce(true);
    setCurrency(nextCurrency);
    try { window.localStorage.setItem(currencyPreferenceKey, nextCurrency); } catch { /* Keep the in-page preference. */ }
    window.dispatchEvent(new CustomEvent(currencyPreferenceEvent, { detail: { currency: nextCurrency, sourceId } }));
  }

  return { currency, chooseCurrency, announce };
}
