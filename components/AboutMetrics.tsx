"use client";

import { useEffect, useRef } from "react";

const clientFormatter = new Intl.NumberFormat("en-US");

export function AboutMetrics() {
  const metricsRef = useRef<HTMLDListElement>(null);

  useEffect(() => {
    const metrics = metricsRef.current;
    if (!metrics || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const clients = metrics.querySelector<HTMLElement>('[data-count-target="clients"]');
    const transaction = metrics.querySelector<HTMLElement>('[data-count-target="transaction"]');
    if (!clients || !transaction) return;

    let animationFrame = 0;
    clients.textContent = "0+";
    transaction.textContent = "AED 0.0B+";

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      observer.disconnect();

      const startedAt = performance.now();
      const duration = 1_500;
      const animate = (now: number) => {
        const elapsed = Math.min(1, (now - startedAt) / duration);
        const progress = 1 - Math.pow(1 - elapsed, 4);

        clients.textContent = `${clientFormatter.format(Math.round(1_000 * progress))}+`;
        transaction.textContent = `AED ${(2.5 * progress).toFixed(1)}B+`;

        if (elapsed < 1) {
          animationFrame = window.requestAnimationFrame(animate);
          return;
        }

        clients.textContent = "1,000+";
        transaction.textContent = "AED 2.5B+";
      };

      animationFrame = window.requestAnimationFrame(animate);
    }, { threshold: 0.45, rootMargin: "0px 0px -8% 0px" });

    observer.observe(metrics);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return <dl ref={metricsRef} className="about-metrics">
    <div>
      <dt>Clients served</dt>
      <dd><span aria-hidden="true" data-count-target="clients">1,000+</span><span className="sr-only">1,000 plus</span></dd>
    </div>
    <div><dt>DLD office number</dt><dd>54275</dd></div>
    <div>
      <dt>Transaction value</dt>
      <dd><span aria-hidden="true" data-count-target="transaction">AED 2.5B+</span><span className="sr-only">AED 2.5 billion plus</span></dd>
    </div>
  </dl>;
}
