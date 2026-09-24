"use client";

import { useId } from "react";
import {
  CARD_CURRENCIES,
  CARD_CURRENCY_RATE_DATE,
  formatCardCurrencyLabel,
  parseAedAmount,
} from "@/lib/card-currency";
import { currencyNames, useDisplayCurrency } from "@/components/useDisplayCurrency";

export function CardCurrencyPrice({ amountAed, aedLabel, projectName }: { amountAed: string | number; aedLabel: string; projectName: string }) {
  const { currency, chooseCurrency, announce } = useDisplayCurrency();
  const descriptionId = useId();
  const amount = /\b(?:price\s+)?on request\b/i.test(aedLabel) ? null : parseAedAmount(amountAed);
  const displayedPrice = amount ? formatCardCurrencyLabel(aedLabel, amount, currency) : aedLabel;

  return <div className="project-card-price-row">
    <strong className="project-card-price-value" aria-live={announce ? "polite" : "off"} aria-atomic="true">{displayedPrice}</strong>
    {amount && <>
      <div className="project-card-currencies" role="group" aria-label={`Display ${projectName} price in another currency`} aria-describedby={descriptionId}>
        {CARD_CURRENCIES.map((code) => <button key={code} type="button" aria-pressed={currency === code} title={`Show price in ${currencyNames[code]}`} onClick={() => chooseCurrency(code)}>{code}</button>)}
      </div>
      <small className="sr-only" id={descriptionId}>Indicative conversion using Central Bank of the UAE rates dated {CARD_CURRENCY_RATE_DATE}.</small>
    </>}
  </div>;
}
