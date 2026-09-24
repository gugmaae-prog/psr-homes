"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SonuChat as ChatComponent } from "@/components/SonuChat";
import type { SonuFinder as FinderComponent } from "@/components/SonuFinder";

export function DeferredConcierge() {
  const [SonuChat, setChat] = useState<typeof ChatComponent | null>(null);
  const [SonuFinder, setFinder] = useState<typeof FinderComponent | null>(null);
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
    void import("@/components/SonuChat").then((module) => {
      setChat(() => module.SonuChat);
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
      if (window.sessionStorage.getItem("psr:sonu-chat-open:v1") === "yes") openChat();
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
      void import("@/components/SonuFinder").then((module) => {
        setFinder(() => module.SonuFinder);
      }).catch(() => {
        finderRequested.current = false;
        setError("The property finder could not load. Please try opening it again.");
      });
    };
    window.addEventListener("hg:overlay-change", onOverlay);
    window.addEventListener("hg:open-sonu-finder", openFinder);
    return () => {
      window.removeEventListener("hg:overlay-change", onOverlay);
      window.removeEventListener("hg:open-sonu-finder", openFinder);
    };
  }, [openChat]);

  return <>
    {SonuFinder && <SonuFinder initialOpen />}
    {SonuChat ? <SonuChat initialOpen /> : <div className="sonu-chat is-attentive">
      <button
        type="button"
        className="sonu-chat-launcher"
        aria-expanded={false}
        aria-busy={loading}
        aria-label="Open chat with Sonu, your AI broker"
        onClick={openChat}
      >
        <img className="sonu-chat-launcher-image" src="/ai/sonu-ui.png" alt="" aria-hidden="true" />
        <span className="sonu-chat-greeting" aria-hidden="true">Hi I am Sonu, Your AI Broker</span>
      </button>
    </div>}
    {error && <span className="sr-only" role="alert">{error}</span>}
  </>;
}
