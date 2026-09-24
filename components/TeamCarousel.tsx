"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "@/components/SiteLink";
import { withBasePath } from "@/lib/base-path";
import { preferredScrollBehavior } from "@/lib/scroll-behavior";

export type TeamMember = {
  name: string;
  role: string;
  email: string;
  image: string;
  copy: string;
  facts: string[];
  portfolioSlug: string;
  profileKind: "advisor" | "operations";
  badge?: string;
};

export function TeamCarousel({ members }: { members: TeamMember[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<{ index: number; left: number } | null>(null);
  const syncFrameRef = useRef(0);
  const resumeTimerRef = useRef(0);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const show = useCallback((index: number) => {
    if (!members.length) return;
    const next = (index + members.length) % members.length;
    const track = trackRef.current;
    const card = trackRef.current?.children.item(next) as HTMLElement | null;
    if (track && card) {
      const left = Math.min(card.offsetLeft, Math.max(0, track.scrollWidth - track.clientWidth));
      targetRef.current = { index: next, left };
      track.scrollTo({ left, behavior: preferredScrollBehavior() });
    }
    setActive(next);
  }, [members.length]);

  useEffect(() => {
    if (
      paused
      || window.matchMedia("(prefers-reduced-motion: reduce)").matches
      || window.matchMedia("(pointer: coarse)").matches
    ) return;
    const timer = window.setInterval(() => show(active + 1), 5_500);
    return () => window.clearInterval(timer);
  }, [active, paused, show]);

  const syncActive = useCallback(() => {
    if (syncFrameRef.current) return;
    syncFrameRef.current = window.requestAnimationFrame(() => {
      syncFrameRef.current = 0;
      const track = trackRef.current;
      if (!track) return;
      const cards = Array.from(track.children) as HTMLElement[];
      if (!cards.length) return;

      const target = targetRef.current;
      if (target) {
        if (Math.abs(track.scrollLeft - target.left) <= 2) {
          setActive(target.index);
          targetRef.current = null;
        }
        return;
      }

      const viewportCenter = track.scrollLeft + track.clientWidth / 2;
      const nearest = cards.reduce((best, card, index) => (
        Math.abs(card.offsetLeft + card.clientWidth / 2 - viewportCenter) < Math.abs(cards[best].offsetLeft + cards[best].clientWidth / 2 - viewportCenter) ? index : best
      ), 0);
      setActive(nearest);
    });
  }, []);

  function beginPointerNavigation() {
    window.clearTimeout(resumeTimerRef.current);
    targetRef.current = null;
    setPaused(true);
  }

  function finishPointerNavigation() {
    window.clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = window.setTimeout(() => setPaused(false), 1_200);
  }

  useEffect(() => () => {
    window.cancelAnimationFrame(syncFrameRef.current);
    window.clearTimeout(resumeTimerRef.current);
  }, []);

  if (!members.length) return null;

  return <div
    className="about-team-carousel"
    role="region"
    aria-roledescription="carousel"
    aria-label="PSR team"
    onMouseEnter={() => setPaused(true)}
    onMouseLeave={() => setPaused(false)}
    onFocusCapture={() => setPaused(true)}
    onBlurCapture={() => setPaused(false)}
  >
    <div className="about-team-controls">
      <p className="about-team-count" aria-live="polite" aria-atomic="true"><strong>{String(active + 1).padStart(2, "0")}</strong><span aria-hidden="true">/</span><span>{String(members.length).padStart(2, "0")}</span></p>
      <div className="about-team-pagination" aria-label="Choose a team member">
        {members.map((member, index) => <button type="button" key={member.portfolioSlug} aria-label={`Show ${member.name}`} aria-controls="about-team-track" aria-current={active === index ? "true" : undefined} onClick={() => show(index)}><span className="sr-only">Show {member.name}</span></button>)}
      </div>
      <span className="about-team-nav">
        <button type="button" aria-label="Previous team member" aria-controls="about-team-track" onClick={() => show(active - 1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6" /><path d="M8 12h9" /></svg></button>
        <button type="button" aria-label="Next team member" aria-controls="about-team-track" onClick={() => show(active + 1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6" /><path d="M7 12h9" /></svg></button>
      </span>
    </div>
    <div
      className="about-team-track"
      id="about-team-track"
      ref={trackRef}
      onScroll={syncActive}
      onPointerDown={beginPointerNavigation}
      onPointerUp={finishPointerNavigation}
      onPointerCancel={finishPointerNavigation}
      onWheel={() => { targetRef.current = null; }}
    >
      {members.map((member, index) => <article
        className="about-team-card"
        data-active={active === index ? "true" : "false"}
        key={member.portfolioSlug}
        aria-label={`${member.name}, ${member.role}`}
      >
        <div className="about-team-photo">
          <img src={withBasePath(member.image)} alt={`${member.name}, ${member.role} at PSR`} width="800" height="1000" loading={index < 3 ? "eager" : "lazy"} />
          {member.badge && <span>{member.badge}</span>}
        </div>
        <div className="about-team-copy">
          <p className="kicker">{member.role}</p>
          <h3>{member.name}</h3>
          <p>{member.copy}</p>
          {member.facts.length > 0 && <ul>{member.facts.map((fact) => <li key={fact}>{fact}</li>)}</ul>}
          <div className="about-team-actions">
            <a href={`mailto:${member.email}?subject=${encodeURIComponent(member.profileKind === "advisor" ? `Property consultation with ${member.name}` : `Contact ${member.name} at PSR`)}`}>Contact {member.name.split(" ")[0]}</a>
            <Link href={`/advisors/${member.portfolioSlug}`}>{member.profileKind === "advisor" ? "View Agent Portfolio" : "View Profile"}</Link>
          </div>
        </div>
      </article>)}
    </div>
  </div>;
}
