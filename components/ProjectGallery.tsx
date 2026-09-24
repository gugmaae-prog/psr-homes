"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { lockDocumentScroll } from "@/lib/document-scroll-lock";
import { filterPhotographyAssets } from "@/lib/media-policy";

type Collection = { label: string; images: string[] };

export function ProjectGallery({ title, gallery, exteriors, interiors, floorplans }: { title: string; gallery: string[]; exteriors: string[]; interiors: string[]; floorplans: string[] }) {
  const collections = useMemo<Collection[]>(() => [
    { label: "Album", images: filterPhotographyAssets(gallery) },
    { label: "Exteriors", images: filterPhotographyAssets(exteriors) },
    { label: "Interiors", images: filterPhotographyAssets(interiors) },
    { label: "Floor plans", images: floorplans },
  ].filter((collection) => collection.images.length > 0), [exteriors, floorplans, gallery, interiors]);
  const [active, setActive] = useState(collections[0]?.label || "Album");
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const images = collections.find((collection) => collection.label === active)?.images || gallery;
  const current = images[index] || images[0];

  function selectCollection(label: string) { setActive(label); setIndex(0); }
  function previous() { setIndex((value) => (value - 1 + images.length) % images.length); }
  function next() { setIndex((value) => (value + 1) % images.length); }
  function openLightbox() {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setExpanded(true);
  }

  useEffect(() => {
    if (!expanded) return;
    const releaseScrollLock = lockDocumentScroll();
    lightboxRef.current?.querySelector<HTMLButtonElement>(".album-close")?.focus({ preventScroll: true });
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") setExpanded(false);
      if (event.key === "ArrowLeft") setIndex((value) => (value - 1 + images.length) % images.length);
      if (event.key === "ArrowRight") setIndex((value) => (value + 1) % images.length);
      if (event.key === "Tab" && lightboxRef.current) {
        const controls = Array.from(lightboxRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"));
        if (!controls.length) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener("keydown", keydown);
    return () => {
      releaseScrollLock();
      window.removeEventListener("keydown", keydown);
      window.requestAnimationFrame(() => previousFocusRef.current?.focus({ preventScroll: true }));
    };
  }, [expanded, images.length]);

  if (!current) return null;
  return <section id="project-media" className="project-gallery album-gallery">
    <div className="gallery-heading"><div><p className="kicker">Project media library</p><h2>Architecture, interiors and layouts.</h2><p className="gallery-intro">Every available visual is organised by collection, so each part of the development can be reviewed without a wall of disconnected images.</p></div><div className="gallery-tabs" role="tablist" aria-label="Project media collections">{collections.map((collection) => <button type="button" key={collection.label} className={active === collection.label ? "active" : ""} onClick={() => selectCollection(collection.label)} role="tab" aria-selected={active === collection.label}>{collection.label}<span>{collection.images.length}</span></button>)}</div></div>
    <div className={`album-stage${active === "Floor plans" ? " floorplan-stage" : ""}`}>
      <button type="button" className="album-main" onClick={openLightbox} aria-label={`Open ${title} image ${index + 1} full screen`}><img src={current} alt={`${title} ${active.toLowerCase()} image ${index + 1}`} /><span>Open full screen</span></button>
      <aside className="album-sidebar"><div><span>{active}</span><strong>{String(index + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}</strong></div><p>Use the controls or thumbnail strip to move through the complete project collection.</p><div className="album-controls"><button type="button" onClick={previous}>Previous</button><button type="button" onClick={next}>Next</button></div></aside>
    </div>
    <div className={`album-thumbnails${active === "Floor plans" ? " floorplan-thumbnails" : ""}`} aria-label={`${active} thumbnails`}>{images.map((image, imageIndex) => <button type="button" key={image} className={imageIndex === index ? "active" : ""} onClick={() => setIndex(imageIndex)} aria-label={`Show image ${imageIndex + 1}`} aria-current={imageIndex === index ? "true" : undefined}><img src={image} loading={imageIndex > 8 ? "lazy" : "eager"} alt="" /><span>{String(imageIndex + 1).padStart(2, "0")}</span></button>)}</div>
    {expanded && <div ref={lightboxRef} className="album-lightbox" role="dialog" aria-modal="true" aria-label={`${title} full-screen gallery`}><button type="button" className="album-close" onClick={() => setExpanded(false)}>Close</button><button type="button" className="album-lightbox-previous" onClick={previous}>Previous</button><img src={current} alt={`${title} full-screen image ${index + 1}`} /><button type="button" className="album-lightbox-next" onClick={next}>Next</button><p>{active} · {index + 1} of {images.length}</p></div>}
  </section>;
}
