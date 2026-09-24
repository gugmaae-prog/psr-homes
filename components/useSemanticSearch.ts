"use client";

import { useEffect, useState } from "react";
import { withBasePath } from "@/lib/base-path";
import {
  interpretSemanticSearchDeterministically,
  type SemanticSearchIntent,
  type SemanticSearchScope,
} from "@/lib/semantic-search";

export function useSemanticSearch(query: string, scope: SemanticSearchScope) {
  const [intent, setIntent] = useState<SemanticSearchIntent>(() => interpretSemanticSearchDeterministically(query, scope));

  useEffect(() => {
    const fallback = interpretSemanticSearchDeterministically(query, scope);
    setIntent(fallback);
    if (!query.trim()) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(withBasePath("/api/search/interpret"), {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query, scope }),
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) throw new Error("Search interpretation failed");
          return await response.json() as { intent?: SemanticSearchIntent };
        })
        .then((result) => { if (result.intent) setIntent(result.intent); })
        .catch((error: unknown) => {
          if (!(error instanceof DOMException && error.name === "AbortError")) setIntent(fallback);
        });
    }, 220);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, scope]);

  return intent;
}
