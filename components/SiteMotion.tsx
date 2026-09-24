"use client";

import { useEffect } from "react";

export function SiteMotion() {
  useEffect(() => {
    const root = document.documentElement;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let pointerFrame = 0;
    let scrollFrame = 0;

    function pointer(event: PointerEvent) {
      if (!finePointer || reducedMotion) return;
      cancelAnimationFrame(pointerFrame);
      pointerFrame = requestAnimationFrame(() => {
        root.style.setProperty("--pointer-x", `${event.clientX}px`);
        root.style.setProperty("--pointer-y", `${event.clientY}px`);
      });
    }

    function scroll() {
      cancelAnimationFrame(scrollFrame);
      scrollFrame = requestAnimationFrame(() => {
        const available = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        root.style.setProperty("--scroll-progress", `${Math.min(1, window.scrollY / available)}`);
      });
    }

    window.addEventListener("pointermove", pointer, { passive: true });
    window.addEventListener("scroll", scroll, { passive: true });
    scroll();

    return () => {
      window.removeEventListener("pointermove", pointer);
      window.removeEventListener("scroll", scroll);
      cancelAnimationFrame(pointerFrame);
      cancelAnimationFrame(scrollFrame);
    };
  }, []);

  return <><div className="scroll-progress" aria-hidden="true"><span /></div><div className="pointer-halo" aria-hidden="true" /></>;
}
