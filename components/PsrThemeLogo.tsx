import { withBasePath } from "@/lib/base-path";

export function PsrThemeLogo({ className, alt }: { className: string; alt: string }) {
  return <>
    <img
      className={`${className} psr-logo-dark-surface`}
      src={withBasePath("/brand/psr-logo-light.png")}
      alt={alt}
      width="1254"
      height="1254"
    />
    <img
      className={`${className} psr-logo-light-surface`}
      src={withBasePath("/brand/psr-logo-dark.png")}
      alt=""
      aria-hidden="true"
      width="1254"
      height="1254"
    />
  </>;
}
