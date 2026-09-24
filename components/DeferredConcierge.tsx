"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GraceChat as ChatComponent } from "@/components/GraceChat";
import type { GraceFinder as FinderComponent } from "@/components/GraceFinder";

export function DeferredConcierge() {
  const [GraceChat, setChat] = useState<typeof ChatComponent | null>(null);
  const [GraceFinder, setFinder] = useState<typeof FinderComponent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const chatRequested = useRef(false);
  const finderRequested = useRef(false);
  const anotherOverlayOpen = useRef(false);

  const openChat = useCallback(() => {
    if (chatRequested.current) return;
    chatRequested.current = true;
    setLoading(true);
    setError("");
    void import("@/components/GraceChat").then((module) => {
      setChat(() => module.GraceChat);
      setLoading(false);
    }).catch(() => {
      chatRequested.current = false;
      setLoading(false);
      setError("Sonu could not load. Please try opening the chat again.");
    });
  }, []);

  useEffect(() => {
    // Restore a conversation only when the visitor previously left it open.
    try {
      if (window.sessionStorage.getItem("hg:grace-chat-open:v1") === "yes") openChat();
    } catch { /* Opening the launcher also works when storage is disabled. */ }

    if (/\/(?:agent|leads|privacy|terms)(?:\/|$)/.test(window.location.pathname)) return;
    const onOverlay = (event: Event) => {
      const detail = (event as CustomEvent<{ open?: boolean }>).detail;
      anotherOverlayOpen.current = detail?.open === true;
    };
    const openFinder = () => {
      if (finderRequested.current || anotherOverlayOpen.current) return;
      finderRequested.current = true;
      setError("");
      void import("@/components/GraceFinder").then((module) => {
        setFinder(() => module.GraceFinder);
      }).catch(() => {
        finderRequested.current = false;
        setError("The property finder could not load. Please try opening it again.");
      });
    };
    window.addEventListener("hg:overlay-change", onOverlay);
    window.addEventListener("hg:open-grace-finder", openFinder);
    return () => {
      window.removeEventListener("hg:overlay-change", onOverlay);
      window.removeEventListener("hg:open-grace-finder", openFinder);
    };
  }, [openChat]);

  return <>
    {GraceFinder && <GraceFinder initialOpen />}
    {GraceChat ? <GraceChat initialOpen /> : <div className="grace-chat is-attentive">
      <button
        type="button"
        className="grace-chat-launcher"
        aria-expanded={false}
        aria-busy={loading}
        aria-label="Open chat with Sonu, your AI broker"
        onClick={openChat}
      >
        <img className="grace-chat-launcher-image" src="/ai/sonu-ui.png" alt="" aria-hidden="true" />
        <span className="grace-chat-greeting" aria-hidden="true">Hi I am Sonu, Your AI Broker</span>
      </button>
    </div>}
    {error && <span className="sr-only" role="alert">{error}</span>}
  </>;
}
