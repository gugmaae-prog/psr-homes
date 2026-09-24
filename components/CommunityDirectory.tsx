"use client";

import { useState } from "react";
import Link from "@/components/SiteLink";
import { useSemanticSearch } from "@/components/useSemanticSearch";
import { matchesSemanticIntent } from "@/lib/semantic-search";
import type { CommunityProfile } from "@/lib/taxonomy";

type CommunityDirectoryItem = Pick<CommunityProfile, "slug" | "name" | "emirate" | "image" | "activeProjects" | "developers" | "pricePerSqft" | "descriptor"> & { indexedProjects: number };

export function CommunityDirectory({ communities }: { communities: CommunityDirectoryItem[] }) {
  const [query, setQuery] = useState("");
  const [emirate, setEmirate] = useState("");
  const emirates = [...new Set(communities.map((community) => community.emirate))].sort();
  const intent = useSemanticSearch(query, "communities");
  const matches = communities.filter((community) => (!emirate || community.emirate === emirate) && matchesSemanticIntent(intent, [community.name, community.emirate, community.descriptor, ...community.developers]));
  return <section className="directory-shell section-pad">
    <div className="directory-toolbar community-toolbar"><label><span>Find a community</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search community or developer" /></label><label><span>Emirate</span><select value={emirate} onChange={(event) => setEmirate(event.target.value)}><option value="">All emirates</option>{emirates.map((name) => <option key={name}>{name}</option>)}</select></label><p><strong>{matches.length}</strong> community guides</p></div>
    <div className="psr-card-grid community-directory-grid">{matches.map((community) => <Link href={`/communities/${community.slug}`} className="community-directory-card" key={`${community.emirate}-${community.slug}`}>
      <div className="directory-card-image">{community.image ? <img src={community.image} alt={`${community.name}, ${community.emirate}`} width="960" height="600" loading="lazy" decoding="async" /> : <span className="media-fallback">PSR</span>}<span className="directory-card-action">View community</span></div>
      <div className="directory-card-content"><p>{community.emirate} · {community.descriptor}</p><h2>{community.name}</h2><div className="directory-card-meta"><strong>{community.indexedProjects ? `${community.activeProjects} active projects` : "Curated community guide"}</strong><span>{community.pricePerSqft ? `${community.pricePerSqft.display} · ${community.pricePerSqft.label}` : community.developers.length ? `${community.developers.length} developers` : community.indexedProjects ? "Catalogue archive records" : "No current PSR catalogue records"}</span></div></div>
    </Link>)}</div>
  </section>;
}
