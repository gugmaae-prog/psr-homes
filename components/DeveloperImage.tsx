"use client";

import { useState } from "react";
import { withBasePath } from "@/lib/base-path";
import { DEFAULT_PROPERTY_PHOTO, isPhotographyAsset } from "@/lib/media-policy";

type DeveloperImageProps = {
  src: string;
  alt: string;
};

export function DeveloperImage({ src, alt }: DeveloperImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const useFallback = !isPhotographyAsset(src) || failedSrc === src;

  if (useFallback) {
    return <img
      className="media-fallback developer-home-fallback"
      src={withBasePath(DEFAULT_PROPERTY_PHOTO)}
      alt={alt}
      width="960"
      height="600"
      loading="lazy"
      decoding="async"
    />;
  }

  return <img
    src={withBasePath(src)}
    alt={alt}
    width="960"
    height="600"
    loading="lazy"
    decoding="async"
    onError={() => setFailedSrc(src)}
  />;
}
