"use client";

import { useEffect, useRef, useState } from "react";
import { withBasePath } from "@/lib/base-path";

export function HeroVideo() {
  const [ready, setReady] = useState(false);
  const backdrop = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches
      || connection?.saveData
      || /^(slow-2g|2g|3g)$/.test(connection?.effectiveType || "")) return;

    let timer = 0;
    let observer: IntersectionObserver | undefined;
    const prepare = () => {
      // Keep the film off the initial request waterfall. The local poster is
      // visible immediately; start playback only while the hero is in view.
      timer = window.setTimeout(() => {
        if (!backdrop.current) return;
        observer = new IntersectionObserver((entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          setReady(true);
          observer?.disconnect();
        });
        observer.observe(backdrop.current);
      }, 1_200);
    };
    if (document.readyState === "complete") prepare();
    else window.addEventListener("load", prepare, { once: true });
    return () => {
      window.removeEventListener("load", prepare);
      window.clearTimeout(timer);
      observer?.disconnect();
    };
  }, []);

  return <div className="hero-video-backdrop" ref={backdrop}>
    <img
      className="museum-frame home-hero-poster"
      src={withBasePath("/hero/psr-uae-hero-poster.webp?v=psr-hero-20260821-2")}
      alt=""
      width="1920"
      height="900"
      fetchPriority="high"
    />
    {ready && <video
      className="home-hero-video home-hero-selfhosted"
      poster={withBasePath("/hero/psr-uae-hero-poster.webp?v=psr-hero-20260821-2")}
      autoPlay
      loop
      muted
      playsInline
      preload="metadata"
      disablePictureInPicture
      aria-hidden="true"
      tabIndex={-1}
    >
      <source src={withBasePath("/hero/psr-uae-hero.mp4?v=psr-hero-20260821-2")} type="video/mp4" />
    </video>}
  </div>;
}
