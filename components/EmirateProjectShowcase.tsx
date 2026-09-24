import Link from "@/components/SiteLink";
import type { EmirateProjectShowcase as ShowcaseItem } from "@/lib/emirates";
import { formatAedCardPrice } from "@/lib/card-currency";

function formatPrice(raw: string, fallback?: string) {
  if (fallback) return fallback;
  return formatAedCardPrice(raw);
}

export function EmirateProjectShowcase({ items }: { items: ShowcaseItem[] }) {
  return <div className="emirate-project-showcase">
    {items.map(({ project, media, mediaCount }) => (
      <article className="emirate-project-card" key={project.slug}>
        <Link href={`/projects/${project.slug}`} className="emirate-project-media" aria-label={`Open ${project.name}`}>
          <img src={media[0]} alt={`${project.name} in ${project.area}`} loading="lazy" />
          <small>{mediaCount > 1 ? `${mediaCount} project images` : "Project image"}</small>
          <span>View project</span>
        </Link>
        <div className="emirate-project-copy">
          <p>{project.emirate} / {project.area}</p>
          <h3><Link href={`/projects/${project.slug}`}>{project.name}</Link></h3>
          <dl>
            <div><dt>Developer</dt><dd>{project.developerDisplay || project.developer}</dd></div>
            <div><dt>From</dt><dd>{formatPrice(project.startingPrice, project.startingPriceLabel)}</dd></div>
            <div><dt>Handover</dt><dd>{project.handover || "On request"}</dd></div>
          </dl>
        </div>
      </article>
    ))}
  </div>;
}
