"use client";

import { useEffect, useState } from "react";

export function BriefingPlayer({ title, image, slides }: { title: string; image: string; slides: string[] }) {
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (!playing || slides.length < 2) return;
    const timer = window.setInterval(() => setActive((index) => (index + 1) % slides.length), 4200);
    return () => window.clearInterval(timer);
  }, [playing, slides.length]);
  return <section className="briefing-player" aria-label={`${title} visual video briefing`}>
    <img src={image} alt="" />
    <div className="briefing-player-shade" />
    <div className="briefing-player-copy"><p>PSR · Visual vlog briefing</p><h2>{slides[active]}</h2><div><button type="button" onClick={() => setPlaying((value) => !value)}>{playing ? "Pause" : "Play briefing"}</button><span>{String(active + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}</span></div><nav aria-label="Briefing chapters">{slides.map((slide, index) => <button type="button" key={slide} className={index === active ? "active" : ""} onClick={() => setActive(index)} aria-label={`Show chapter ${index + 1}`} />)}</nav></div>
  </section>;
}
