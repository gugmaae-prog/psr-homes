"use client";

import { useState } from "react";
import Link from "@/components/SiteLink";
import { DeveloperImage } from "@/components/DeveloperImage";
import { useSemanticSearch } from "@/components/useSemanticSearch";
import { matchesSemanticIntent } from "@/lib/semantic-search";
import type { DeveloperProfile } from "@/lib/taxonomy";

type DeveloperDirectoryItem = Pick<DeveloperProfile, "slug" | "name" | "thumbnail" | "flagship" | "activeProjects" | "emirates" | "communities"> & { indexedProjects: number };

export function DeveloperDirectory({ developers }: { developers: DeveloperDirectoryItem[] }) {
  const [query, setQuery] = useState("");
  const intent = useSemanticSearch(query, "developers");
  const matches = developers.filter((developer) => matchesSemanticIntent(intent, [developer.name, ...developer.emirates, ...developer.communities, developer.flagship]));
  return <section className="directory-shell section-pad">
    <div className="directory-toolbar"><label><span>Find a developer</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, emirate or community" /></label><p><strong>{matches.length}</strong> developer profiles</p></div>
    <div className="psr-card-grid developer-directory-grid">{matches.map((developer) => <Link href={`/developers/${developer.slug}`} className="developer-directory-card" key={developer.slug}>
      <div className="directory-card-image"><DeveloperImage src={developer.thumbnail} alt={`${developer.flagship}, a signature ${developer.name} development`} /><span className="directory-card-action">View developer</span></div>
      <div className="directory-card-content"><p>{developer.emirates.join(" · ")}</p><h2>{developer.name}</h2><div className="directory-card-meta"><strong>{developer.activeProjects} active projects</strong><span>{developer.indexedProjects} indexed</span></div></div>
    </Link>)}</div>
  </section>;
}
