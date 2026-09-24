import type { AnchorHTMLAttributes } from "react";
import { withBasePath } from "@/lib/base-path";

type SiteLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
};

export default function SiteLink({ href, ...props }: SiteLinkProps) {
  return <a href={withBasePath(href)} {...props} />;
}
