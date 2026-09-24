"use client";

import { useEffect, useState } from "react";

export type PsrTheme = "dark" | "light";

const STORAGE_KEY = "psr-color-theme";
const THEME_EVENT = "psr:theme-change";

function currentTheme(): PsrTheme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function syncThemeFavicons(theme: PsrTheme) {
  const tone = theme === "light" ? "dark" : "light";
  const icons = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="shortcut icon"]'));
  icons.forEach((icon) => {
    const size = icon.sizes.value.includes("512") ? "512" : "32";
    icon.href = `/favicon-${tone}-${size}.png?v=psr-theme-20260822`;
  });
  document.querySelectorAll<HTMLLinkElement>('link[rel="apple-touch-icon"]').forEach((icon) => {
    icon.href = `/apple-touch-icon-${tone}.png?v=psr-theme-20260822`;
  });
}

function applyTheme(theme: PsrTheme, persist = true) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  syncThemeFavicons(theme);
  if (persist) window.localStorage.setItem(STORAGE_KEY, theme);
  window.dispatchEvent(new CustomEvent<PsrTheme>(THEME_EVENT, { detail: theme }));
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<PsrTheme>("dark");

  useEffect(() => {
    const sync = () => setTheme(currentTheme());
    const syncEvent = (event: Event) => {
      const next = (event as CustomEvent<PsrTheme>).detail;
      setTheme(next === "light" ? "light" : "dark");
    };
    sync();
    window.addEventListener(THEME_EVENT, syncEvent);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(THEME_EVENT, syncEvent);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const nextTheme: PsrTheme = theme === "dark" ? "light" : "dark";
  return <button
    type="button"
    className={`psr-theme-toggle ${className}`.trim()}
    role="switch"
    aria-checked={theme === "light"}
    aria-label={nextTheme === "light" ? "Use warm limestone theme" : "Use dark graphite theme"}
    onClick={(event) => {
      // The boot handler also works before hydration; each click applies once.
      if (!event.defaultPrevented) applyTheme(currentTheme() === "dark" ? "light" : "dark");
    }}
  >
    <i aria-hidden="true" />
  </button>;
}

export const themeBootScript = `(() => {
  const syncFavicons = (theme) => {
    const tone = theme === "light" ? "dark" : "light";
    document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]').forEach((icon) => {
      const size = icon.sizes && icon.sizes.value.includes("512") ? "512" : "32";
      icon.href = "/favicon-" + tone + "-" + size + ".png?v=psr-theme-20260822";
    });
    document.querySelectorAll('link[rel="apple-touch-icon"]').forEach((icon) => {
      icon.href = "/apple-touch-icon-" + tone + ".png?v=psr-theme-20260822";
    });
  };
  const setTheme = (theme) => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    syncFavicons(theme);
    try { window.localStorage.setItem("${STORAGE_KEY}", theme); } catch (_) {}
    window.dispatchEvent(new CustomEvent("${THEME_EVENT}", { detail: theme }));
  };
  try {
    const saved = window.localStorage.getItem("${STORAGE_KEY}");
    const theme = saved === "light" || saved === "dark" ? saved : "dark";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    syncFavicons(theme);
    document.addEventListener("DOMContentLoaded", () => syncFavicons(theme), { once: true });
  } catch (_) {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.style.colorScheme = "dark";
    syncFavicons("dark");
    document.addEventListener("DOMContentLoaded", () => syncFavicons("dark"), { once: true });
  }
  document.addEventListener("click", (event) => {
    const toggle = event.target instanceof Element ? event.target.closest(".psr-theme-toggle") : null;
    if (!toggle) return;
    event.preventDefault();
    setTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light");
  }, { capture: true });
})();`;
