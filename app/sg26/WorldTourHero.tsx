"use client";

import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import styles from "./WorldTourHero.module.css";
import { CITY_OUTLINES, CITY_VIEWBOXES } from "./city-outlines";

type CityId = "riyadh" | "doha" | "mumbai" | "london" | "paris" | "monaco" | "hong-kong" | "singapore";

type TourCity = {
  id: CityId;
  name: string;
  country: string;
  ringDate: string;
  fullDate: string;
};

type WorldTourHeroProps = {
  className?: string;
  dubaiImage?: string;
  dubaiNightImage?: string;
};

const TOUR_CITIES: readonly TourCity[] = [
  { id: "riyadh", name: "Riyadh", country: "Saudi Arabia", ringDate: "21 Feb", fullDate: "21 February 2026" },
  { id: "doha", name: "Doha", country: "Qatar", ringDate: "21 Mar", fullDate: "21 March 2026" },
  { id: "mumbai", name: "Mumbai", country: "India", ringDate: "18 Apr", fullDate: "18 April 2026" },
  { id: "london", name: "London", country: "United Kingdom", ringDate: "23 May", fullDate: "23 May 2026" },
  { id: "paris", name: "Paris", country: "France", ringDate: "20 Jun", fullDate: "20 June 2026" },
  { id: "monaco", name: "Monaco", country: "Monaco", ringDate: "18 Jul", fullDate: "18 July 2026" },
  { id: "hong-kong", name: "Hong Kong", country: "Hong Kong SAR", ringDate: "12 Sep", fullDate: "12 September 2026" },
  { id: "singapore", name: "Singapore", country: "Singapore", ringDate: "13–14 Nov", fullDate: "13–14 November 2026" },
] as const;

const SINGAPORE_INDEX = TOUR_CITIES.findIndex((city) => city.id === "singapore");
const NODE_STEP = 360 / TOUR_CITIES.length;
const DESTINATION_ANGLE = 42;

function normalizeAngle(angle: number) {
  return ((angle + 180) % 360 + 360) % 360 - 180;
}

function nearestEquivalent(angle: number, reference: number) {
  return reference + normalizeAngle(angle - reference);
}

function rotationForCity(index: number, currentRotation: number) {
  return nearestEquivalent(DESTINATION_ANGLE - index * NODE_STEP, currentRotation);
}

function pointerAngle(event: PointerEvent<HTMLElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = event.clientX - (rect.left + rect.width / 2);
  const y = event.clientY - (rect.top + rect.height / 2);
  return Math.atan2(x, -y) * 180 / Math.PI;
}

function CityMap({ city }: { city: TourCity }) {
  return <svg key={city.id} className={styles.cityMap} data-city={city.id} viewBox={CITY_VIEWBOXES[city.id]} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`${city.name} city outline`}>
    <path className={styles.cityOutline} d={CITY_OUTLINES[city.id]} fillRule="evenodd" />
  </svg>;
}

function PrivateJet() {
  return <img className={styles.privateJet} src="/sg26/psr-private-jet-v2.webp" alt="" aria-hidden="true" width="1536" height="1024" />;
}

type ArtworkTone = "day" | "night";
type ArtworkScene = { city: CityId; tone: ArtworkTone };
const panoramaUrl = (id: CityId, tone: ArtworkTone) => `/sg26/destinations/${id}${tone === "night" ? "-night" : ""}-v1.webp`;
const mobilePanoramaUrl = (id: CityId, tone: ArtworkTone) => tone === "night" ? `/sg26/destinations/${id}-mobile-night-aligned-v2.webp` : `/sg26/destinations/${id}-mobile-day-aligned-v3.webp`;
// Saudi Arabia is the approved mobile alignment reference. Its UAE half is
// used as the immutable origin layer for every other destination frame.
const mobileOriginUrl = (tone: ArtworkTone) => tone === "night" ? "/sg26/destinations/riyadh-mobile-night-v1.webp" : "/sg26/destinations/riyadh-mobile-day-locked-v2.webp";
const imageRequests = new Map<string, Promise<void>>();
const currentArtworkTone = (): ArtworkTone => typeof document !== "undefined" && document.documentElement.dataset.theme === "light" ? "day" : "night";

function prepareImage(url: string) {
  const existing = imageRequests.get(url);
  if (existing) return existing;
  const request = new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.onload = () => image.decode().then(resolve, reject);
    image.onerror = () => reject(new Error("Destination artwork unavailable"));
    image.src = url;
  }).catch((error) => { imageRequests.delete(url); throw error; });
  imageRequests.set(url, request);
  return request;
}

function preparePanorama(id: CityId, tone = currentArtworkTone()) {
  return prepareImage(panoramaUrl(id, tone));
}

function ResponsiveArtworkImage({ className, src, mobileSrc, alt, width, height, decoding = "async", fetchPriority = "auto" }: { className: string; src: string; mobileSrc?: string; alt: string; width: number; height: number; decoding?: "async" | "sync" | "auto"; fetchPriority?: "high" | "low" | "auto" }) {
  const imageKey = `${src}|${mobileSrc ?? ""}`;
  return <picture key={imageKey} className={styles.artworkPicture} data-mobile-src={mobileSrc ?? ""} data-desktop-src={src}>
    {mobileSrc ? <source key={`${imageKey}:mobile`} media="(max-width: 820px)" srcSet={mobileSrc} /> : null}
    <img key={`${imageKey}:image`} className={className} src={src} alt={alt} width={width} height={height} decoding={decoding} fetchPriority={fetchPriority} />
  </picture>;
}

function useArtworkTone() {
  const subscribe = useCallback((onChange: () => void) => {
    let frame = 0;
    const sync = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(onChange);
    };
    window.addEventListener("psr:theme-change", sync);
    window.addEventListener("storage", sync);
    window.addEventListener("pageshow", sync);
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    sync();
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("psr:theme-change", sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener("pageshow", sync);
      observer.disconnect();
    };
  }, []);

  return useSyncExternalStore(subscribe, currentArtworkTone, () => "night");
}

function DestinationArtwork({ city, dayBase, nightBase }: { city: TourCity; dayBase: string; nightBase: string }) {
  const tone = useArtworkTone();
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const desiredKey = `${city.id}-${tone}`;
  // The UAE origin is a locked layer. Destination changes must never replace it.
  const baseUrl = (mode: ArtworkTone) => mode === "night" ? nightBase : dayBase;
  const cityName = TOUR_CITIES.find((destination) => destination.id === city.id)?.name ?? city.name;

  useEffect(() => {
    let cancelled = false;
    setFailedKey(null);
    const origin = baseUrl(tone);
    const mobileOrigin = mobileOriginUrl(tone);
    Promise.all([
      preparePanorama(city.id, tone),
      prepareImage(mobilePanoramaUrl(city.id, tone)),
      prepareImage(origin),
      prepareImage(mobileOrigin),
    ]).catch(() => { if (!cancelled) setFailedKey(desiredKey); });
    return () => { cancelled = true; };
  }, [city.id, tone, dayBase, nightBase, desiredKey]);

  return <div className={styles.destinationArtwork} data-destination={city.id} data-artwork-tone={tone} aria-busy={failedKey === desiredKey}>
    <div key={desiredKey} className={styles.artworkFrame}>
      <ResponsiveArtworkImage className={styles.panoramaImage} src={baseUrl(tone)} alt="" width={1672} height={941} mobileSrc={mobileOriginUrl(tone)} fetchPriority="high" />
      <ResponsiveArtworkImage className={`${styles.panoramaImage} ${styles.destinationHalf}`} src={panoramaUrl(city.id, tone)} width={1672} height={941} mobileSrc={mobilePanoramaUrl(city.id, tone)}
        fetchPriority={city.id === "singapore" ? "high" : "auto"} alt={`Artist's impression of ${cityName} meeting the UAE across ${tone === "night" ? "an illuminated nighttime" : "a sunlit"} waterfront`} />
    </div>
    {failedKey === desiredKey ? <span className={styles.srOnly}>The selected artwork could not load. Please try another city.</span> : null}
  </div>;
}

export function WorldTourHero({ className = "", dubaiImage = "/sg26/psr-world-tour-dubai-base-v1.webp", dubaiNightImage = "/sg26/destinations/dubai-night-v1.webp" }: WorldTourHeroProps) {
  const [activeIndex, setActiveIndex] = useState(SINGAPORE_INDEX);
  const [rotation, setRotationState] = useState(() => rotationForCity(SINGAPORE_INDEX, 0));
  const [isDragging, setIsDragging] = useState(false);
  const rotationRef = useRef(rotation);
  const motionRef = useRef<number | null>(null);
  const dragRef = useRef<{ pointerId: number; lastAngle: number; liveRotation: number } | null>(null);
  const activeCity = TOUR_CITIES[activeIndex];

  const setRotation = useCallback((next: number) => {
    rotationRef.current = next;
    setRotationState(next);
  }, []);

  const animateRotation = useCallback((target: number) => {
    if (motionRef.current !== null) cancelAnimationFrame(motionRef.current);
    const start = rotationRef.current;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRotation(target);
      return;
    }
    const began = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - began) / 650, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      // One sampled angle drives the ring AND inverse label rotation every frame.
      setRotation(start + (target - start) * eased);
      motionRef.current = progress < 1 ? requestAnimationFrame(step) : null;
    };
    motionRef.current = requestAnimationFrame(step);
  }, [setRotation]);

  useEffect(() => () => {
    if (motionRef.current !== null) cancelAnimationFrame(motionRef.current);
  }, []);

  const selectCity = useCallback((index: number) => {
    setActiveIndex(index);
    animateRotation(rotationForCity(index, rotationRef.current));
  }, [animateRotation]);

  const snapRing = useCallback(() => {
    let nearestIndex = 0;
    let smallestDistance = Number.POSITIVE_INFINITY;
    TOUR_CITIES.forEach((_, index) => {
      const distance = Math.abs(normalizeAngle(index * NODE_STEP + rotationRef.current - DESTINATION_ANGLE));
      if (distance < smallestDistance) {
        smallestDistance = distance;
        nearestIndex = index;
      }
    });
    setActiveIndex(nearestIndex);
    animateRotation(rotationForCity(nearestIndex, rotationRef.current));
  }, [animateRotation]);

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if ((event.target as HTMLElement).closest("button")) return;
    if (motionRef.current !== null) cancelAnimationFrame(motionRef.current);
    motionRef.current = null;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      lastAngle: pointerAngle(event),
      liveRotation: rotationRef.current,
    };
    setIsDragging(true);
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const nextAngle = pointerAngle(event);
    drag.liveRotation += normalizeAngle(nextAngle - drag.lastAngle);
    drag.lastAngle = nextAngle;
    setRotation(drag.liveRotation);
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    snapRing();
  }

  function handleRingKeys(event: KeyboardEvent<HTMLDivElement>) {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (activeIndex + 1) % TOUR_CITIES.length;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (activeIndex - 1 + TOUR_CITIES.length) % TOUR_CITIES.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = TOUR_CITIES.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    selectCity(nextIndex);
    window.requestAnimationFrame(() => document.getElementById(`world-tour-city-${TOUR_CITIES[nextIndex!].id}`)?.focus());
  }

  const backgroundStyle = {
    "--dubai-image": `url("${dubaiImage.replaceAll('"', "%22")}")`,
  } as CSSProperties;

  return <section className={`${styles.hero} ${className}`} style={backgroundStyle} aria-labelledby="world-tour-heading">
    <div className={styles.glow} aria-hidden="true" />

    <h1 id="world-tour-heading" className={styles.srOnly}>PSR Global Property Roadshow 2026 · {activeCity.name}</h1>

    <div className={styles.tourCanvas}>
      <div className={styles.dubaiOrigin}>
        <div className={styles.originHeading}>
          <span>Our home</span>
          <strong>United Arab Emirates</strong>
          <small>Dubai · UAE future</small>
        </div>
        <ul className={styles.futureList} aria-label="UAE future landmarks and connections">
          <li>Disney Abu Dhabi</li>
          <li>Guggenheim Abu Dhabi</li>
          <li>Etihad Rail</li>
          <li>eVTOL air taxis</li>
        </ul>
      </div>

      <div className={styles.destinationScene}>
        <DestinationArtwork city={activeCity} dayBase={dubaiImage} nightBase={dubaiNightImage} />

      </div>

      <div
        className={`${styles.ringStage} ${isDragging ? styles.ringDragging : ""}`}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={handleRingKeys}
        role="group"
        aria-label="World tour route. Drag the tour ring, use the arrow keys, or choose a city point."
      >
        
        <div className={styles.ringRotator} style={{ "--ring-rotation": `${rotation}deg` } as CSSProperties}>
          <div className={styles.goldRing} aria-hidden="true" />
          {TOUR_CITIES.map((city, index) => {
            const angle = index * NODE_STEP;
            const selected = index === activeIndex;
            return <button
              id={`world-tour-city-${city.id}`}
              type="button"
              key={city.id}
              className={`${styles.ringNode} ${selected ? styles.ringNodeActive : ""}`}
              style={{
                "--node-angle": `${angle}deg`,
                "--label-rotation": `${-(angle + rotation)}deg`,
              } as CSSProperties}
              aria-label={`${city.name}, ${city.country}, ${city.ringDate}${city.id === "singapore" ? ", next stop" : ", illustrative prior route date"}`}
              aria-pressed={selected}
              tabIndex={selected ? 0 : -1}
              onPointerEnter={() => { void preparePanorama(city.id).catch(() => {}); }}
              onFocus={() => { void preparePanorama(city.id).catch(() => {}); }}
              onClick={() => selectCity(index)}
            >
              {selected ? <span className={styles.jetMarker} style={{ "--jet-counter-rotation": `${-(angle + rotation)}deg` } as CSSProperties}><PrivateJet /></span> : <span className={styles.nodeDot} aria-hidden="true" />}
              <span className={styles.nodeLabel} aria-hidden="true">
                <strong>{city.name}</strong>
                <small>{city.ringDate}</small>
              </span>
            </button>;
          })}
        </div>

        <div className={styles.mapCard}>
          <div className={styles.mapCaption}>
            <span>World tour destination</span>
            <strong>{activeCity.name}</strong>
          </div>
          <CityMap city={activeCity} />
        </div>
      </div>

      <div className={styles.eventPanel}>
        <div className={styles.eventTitle}>
          <span>{activeCity.id === "singapore" ? "Next stop" : "Illustrative route stop"}</span>
          <h2>{activeCity.name}</h2>
          <p>{activeCity.country}</p>
        </div>

        {activeCity.id === "singapore" ? <div className={styles.sessionList}>
          <div><span>Session 01</span><strong>Friday 13 November</strong><time dateTime="2026-11-13T17:30:00+08:00">5:30 PM</time></div>
          <div><span>Session 02</span><strong>Saturday 14 November</strong><time dateTime="2026-11-14T15:30:00+08:00">3:30 PM</time></div>
        </div> : <div className={styles.archiveDate}>
          <span>Illustrative route date</span>
          <strong>{activeCity.fullDate}</strong>
          <small>Prior city dates are placeholders pending PSR confirmation.</small>
        </div>}

        <div className={styles.eventAction}>
          <p>UAE property · business setup · family office migration</p>
          {activeCity.id === "singapore"
            ? <a href="#request-invite">Request your invitation <span aria-hidden="true">↗</span></a>
            : <button type="button" onClick={() => selectCity(SINGAPORE_INDEX)}>View Singapore dates <span aria-hidden="true">→</span></button>}
        </div>
      </div>
    </div>

    <p className={styles.srOnly} aria-live="polite">{activeCity.id === "singapore"
      ? "Singapore selected. Confirmed sessions Friday 13 November at 5:30 PM and Saturday 14 November at 3:30 PM."
      : `${activeCity.name} selected. The ${activeCity.fullDate} route date is illustrative and pending PSR confirmation.`}</p>
    <p className={styles.mapAttribution}><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">Map data © OpenStreetMap contributors</a> · <a href="/sg26/city-outline-sources.json" target="_blank" rel="noreferrer">Outline sources</a></p>
    <p className={styles.routeDisclosure}>Artist’s impressions · illustrative 2026 world-tour route · prior cities and dates require confirmation · Singapore sessions confirmed for 13–14 November</p>
  </section>;
}
