"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { withBasePath } from "@/lib/base-path";

type AnalyticsEvent = {
  sessionId: string;
  visitorId: string;
  eventType: "page_view" | "page_exit" | "click" | "section_view" | "lead_submit" | "chat_open";
  path: string;
  section?: string;
  target?: string;
  xPct?: number;
  yPct?: number;
  scrollDepth?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  deviceType?: "mobile" | "tablet" | "desktop";
  referrerHost?: string;
  durationSeconds?: number;
};

const PRIVATE_PATHS = ["/admin", "/analytics", "/leads", "/agent"];
const FLUSH_INTERVAL = 4_000;
const MAX_QUEUE = 10;

function isPrivatePath(path: string) {
  return PRIVATE_PATHS.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

function deviceType(): AnalyticsEvent["deviceType"] {
  if (window.innerWidth < 720) return "mobile";
  if (window.innerWidth < 1100) return "tablet";
  return "desktop";
}

function storageId(storage: Storage, key: string) {
  const existing = storage.getItem(key);
  if (existing) return existing;
  const value = crypto.randomUUID();
  storage.setItem(key, value);
  return value;
}

function referrerHost() {
  if (!document.referrer) return "";
  try {
    const host = new URL(document.referrer).hostname;
    return host === window.location.hostname ? "" : host;
  } catch {
    return "";
  }
}

function scrollDepth() {
  const height = Math.max(
    document.documentElement.scrollHeight,
    document.body.scrollHeight,
    window.innerHeight,
  );
  return Math.min(100, Math.round(((window.scrollY + window.innerHeight) / height) * 100));
}

function sectionLabel(element: Element, index: number) {
  const explicit = element.getAttribute("data-analytics-section") || element.id;
  if (explicit) return explicit.replace(/[-_]+/g, " ").trim().slice(0, 80);
  const heading = element.querySelector("h1, h2, h3");
  return heading?.textContent?.replace(/\s+/g, " ").trim().slice(0, 80) || `Section ${index + 1}`;
}

export function SiteAnalytics() {
  const pathname = usePathname() || "/";
  const queue = useRef<AnalyticsEvent[]>([]);
  const visitorId = useRef("");
  const sessionId = useRef("");
  const currentPath = useRef(pathname);
  const startedAt = useRef(0);
  const maxScroll = useRef(0);
  const exitSent = useRef(false);

  function flush(beacon = false) {
    if (!queue.current.length) return;
    const events = queue.current.splice(0, 20);
    const body = JSON.stringify({ events });
    if (beacon && navigator.sendBeacon) {
      navigator.sendBeacon(
        withBasePath("/api/analytics/events"),
        new Blob([body], { type: "application/json" }),
      );
      return;
    }
    void fetch(withBasePath("/api/analytics/events"), {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      // Analytics must never interrupt the visitor experience.
    });
  }

  function add(event: Omit<AnalyticsEvent, "sessionId" | "visitorId">, immediate = false) {
    if (!sessionId.current || !visitorId.current || isPrivatePath(event.path)) return;
    queue.current.push({
      ...event,
      sessionId: sessionId.current,
      visitorId: visitorId.current,
    });
    if (immediate || queue.current.length >= MAX_QUEUE) flush(immediate);
  }

  function recordExit(path: string, beacon = false) {
    if (exitSent.current || isPrivatePath(path)) return;
    exitSent.current = true;
    add({
      eventType: "page_exit",
      path,
      scrollDepth: maxScroll.current,
      durationSeconds: Math.round((Date.now() - startedAt.current) / 1_000),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      deviceType: deviceType(),
    });
    flush(beacon);
  }

  useEffect(() => {
    if (navigator.doNotTrack === "1" || isPrivatePath(pathname)) return;
    try {
      visitorId.current = storageId(window.localStorage, "hg_analytics_visitor");
      sessionId.current = storageId(window.sessionStorage, "hg_analytics_session");
    } catch {
      visitorId.current ||= crypto.randomUUID();
      sessionId.current ||= crypto.randomUUID();
    }

    currentPath.current = pathname;
    startedAt.current = Date.now();
    maxScroll.current = scrollDepth();
    exitSent.current = false;
    add({
      eventType: "page_view",
      path: pathname,
      scrollDepth: maxScroll.current,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      deviceType: deviceType(),
      referrerHost: referrerHost(),
    });

    const frame = window.requestAnimationFrame(() => {
      const observed = new Set<string>();
      const sections = Array.from(document.querySelectorAll("main section, main article, footer"));
      const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.35) continue;
          const index = sections.indexOf(entry.target);
          const label = sectionLabel(entry.target, Math.max(0, index));
          if (observed.has(label)) continue;
          observed.add(label);
          add({
            eventType: "section_view",
            path: pathname,
            section: label,
            scrollDepth: scrollDepth(),
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            deviceType: deviceType(),
          });
        }
      }, { threshold: [0.35], rootMargin: "0px 0px -8% 0px" });
      sections.forEach((section) => observer.observe(section));
      (window as Window & { __hgAnalyticsObserver?: IntersectionObserver }).__hgAnalyticsObserver = observer;
    });

    return () => {
      window.cancelAnimationFrame(frame);
      (window as Window & { __hgAnalyticsObserver?: IntersectionObserver }).__hgAnalyticsObserver?.disconnect();
      recordExit(pathname);
    };
    // add and recordExit intentionally use refs so route changes retain the same anonymous session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (navigator.doNotTrack === "1") return;
    const interval = window.setInterval(() => flush(), FLUSH_INTERVAL);
    const onScroll = () => {
      maxScroll.current = Math.max(maxScroll.current, scrollDepth());
    };
    const onClick = (event: MouseEvent) => {
      const element = event.target instanceof Element
        ? event.target.closest("a, button, [role='button']")
        : null;
      if (!element || isPrivatePath(currentPath.current)) return;
      const link = element instanceof HTMLAnchorElement ? element.getAttribute("href") || "" : "";
      const form = element.closest("form");
      const target = form
        ? `Form control: ${element.getAttribute("type") || "action"}`
        : link
          ? `Link: ${link.split(/[?#]/, 1)[0].slice(0, 80)}`
          : (element.getAttribute("aria-label") || element.textContent || "Button")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 80);
      const documentHeight = Math.max(document.documentElement.scrollHeight, window.innerHeight);
      add({
        eventType: "click",
        path: currentPath.current,
        target,
        xPct: (event.clientX / Math.max(1, window.innerWidth)) * 100,
        yPct: ((event.clientY + window.scrollY) / documentHeight) * 100,
        scrollDepth: scrollDepth(),
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        deviceType: deviceType(),
      });
    };
    const onLead = () => add({
      eventType: "lead_submit",
      path: currentPath.current,
      scrollDepth: scrollDepth(),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      deviceType: deviceType(),
    }, true);
    const onPageHide = () => recordExit(currentPath.current, true);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") recordExit(currentPath.current, true);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onClick, true);
    window.addEventListener("hg:lead-submitted", onLead);
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("hg:lead-submitted", onLead);
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibility);
      flush(true);
    };
    // Stable global listeners intentionally use refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
