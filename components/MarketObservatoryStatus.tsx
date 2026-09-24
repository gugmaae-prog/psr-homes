"use client";

import { useEffect, useState } from "react";
import { withBasePath } from "@/lib/base-path";

type DailyRecord = {
  marketDate?: string;
};

function displayDate(value: string) {
  const date = new Date(`${value}T12:00:00+04:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-AE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
}

export function MarketObservatoryStatus() {
  const [record, setRecord] = useState<{ count: number; latest: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(withBasePath("/api/market-daily"), { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Daily archive unavailable");
        return response.json() as Promise<{ articles?: DailyRecord[] }>;
      })
      .then((payload) => {
        const articles = payload.articles || [];
        const latest = articles.find((article) => article.marketDate)?.marketDate || "";
        setRecord({ count: articles.length, latest });
      })
      .catch(() => setRecord(null));
    return () => controller.abort();
  }, []);

  return <p className="market-observatory-status">
    <span>Market observatory</span>
    <span>{record?.latest ? `Latest daily record ${displayDate(record.latest)}` : "Daily reports recorded in the research archive"}</span>
    {record && record.count > 0 ? <span>{record.count} recent reports retained</span> : null}
  </p>;
}
