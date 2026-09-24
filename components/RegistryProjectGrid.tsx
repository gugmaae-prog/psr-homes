import Link from "@/components/SiteLink";
import { getUniqueActiveProjectRecords, type RegistryProject } from "@/lib/imported-projects";
import { formatAedPerSqft, getAreaPricePerSqft } from "@/lib/market-pricing";
import { selectPhotographyAsset } from "@/lib/media-policy";
import { CardCurrencyPrice } from "@/components/CardCurrencyPrice";
import { formatAedCardPrice } from "@/lib/card-currency";

function price(raw: string) {
  return formatAedCardPrice(raw);
}

export function RegistryProjectGrid({ projects, limit = 12, compact = false }: { projects: RegistryProject[]; limit?: number; compact?: boolean }) {
  const visibleProjects = getUniqueActiveProjectRecords(projects).slice(0, limit);
  return <div className={`psr-card-grid project-preview-grid taxonomy-project-grid${compact ? " project-preview-grid-compact" : ""}`}>{visibleProjects.map((project) => {
    const areaPrice = getAreaPricePerSqft(project.area, project.propertyTypes, project.emirate);
    const pricePerSqft = project.pricePerSqft ? { label: project.statusLabel ? "Indicative AED/sqft" : "Project AED/sqft", display: formatAedPerSqft(project.pricePerSqft) } : areaPrice ? { label: areaPrice.label, display: areaPrice.display } : null;
    const image = selectPhotographyAsset(project.image);
    const priceLabel = project.startingPriceLabel || price(project.startingPrice);
    return <article className="project-preview-card" key={project.slug}>
      <Link href={`/projects/${project.slug}`} className="project-preview-image"><img src={image} alt={`${project.name} in ${project.area}`} loading="lazy" /><span>View project</span>{project.statusLabel && <b>{project.statusLabel}</b>}{project.archived && <b>Archive</b>}</Link>
      <p>{project.emirate} · {project.developerDisplay || project.developer}</p><h3><Link href={`/projects/${project.slug}`}>{project.name}</Link></h3><div className="project-preview-facts"><CardCurrencyPrice amountAed={project.startingPrice} aedLabel={priceLabel} projectName={project.name} /><span className="project-card-market-fact">{pricePerSqft ? `${pricePerSqft.label} ${pricePerSqft.display}` : project.area}</span></div>
    </article>;
  })}</div>;
}
