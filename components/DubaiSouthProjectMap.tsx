import Link from "@/components/SiteLink";
import { getDubaiSouthMapProjects, type DubaiSouthMapProject } from "@/lib/dubai-south-map";

type Cluster = {
  key: "expo" | "residential" | "golf";
  label: string;
  caption: string;
  x: number;
  y: number;
  projects: DubaiSouthMapProject[];
};

function clusterFor(project: DubaiSouthMapProject): Cluster["key"] {
  if (/expo valley|expo city/i.test(project.area)) return "expo";
  if (/emaar south/i.test(project.area)) return "golf";
  return "residential";
}

function mapUrl(coordinates: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coordinates)}`;
}

export default function DubaiSouthProjectMap() {
  const projects = getDubaiSouthMapProjects();
  const clusters: Cluster[] = [
    { key: "expo", label: "Expo City", caption: "Expo Valley releases", x: 24, y: 29, projects: [] },
    { key: "residential", label: "Residential District", caption: "Six compared apartment releases", x: 72, y: 43, projects: [] },
    { key: "golf", label: "Emaar South", caption: "Golf-led master community", x: 20, y: 75, projects: [] },
  ];
  projects.forEach((project) => clusters.find((cluster) => cluster.key === clusterFor(project))?.projects.push(project));

  return <section className="dubai-south-map section-pad" aria-labelledby="dubai-south-map-title">
    <header className="dubai-south-map-heading">
      <div>
        <p>Dubai South opportunity map</p>
        <h2 id="dubai-south-map-title">Nine researched project records, one connected corridor.</h2>
      </div>
      <p>Explore the curated releases around Expo City, the Dubai South Residential District and Emaar South. Pins are district-level orientation points; the selected unit and plot must be verified before reservation.</p>
    </header>
    <div className="dubai-south-map-layout">
      <div className="dubai-south-map-canvas" aria-label="Schematic map of selected Dubai South project clusters">
        <svg viewBox="0 0 1000 680" role="img" aria-labelledby="dubai-south-map-svg-title dubai-south-map-svg-desc">
          <title id="dubai-south-map-svg-title">Selected Dubai South investment corridor</title>
          <desc id="dubai-south-map-svg-desc">A schematic orientation map linking Expo City, the Dubai South Residential District, Emaar South and Al Maktoum International Airport.</desc>
          <path className="map-contour" d="M-25 134C132 38 250 58 378 161s240 128 403 23 264-73 300-18" />
          <path className="map-contour secondary" d="M-40 535c174-122 318-128 441-25s251 105 367 3 222-118 308-34" />
          <path className="map-corridor" d="M212 196C389 218 520 274 703 330s104 102-33 147-291 61-470 45" />
          <path className="map-airport" d="M371 488l199-54 12 28-199 54z" />
          <path className="map-runway" d="M424 535l181-50" />
          <text className="map-place-label" x="490" y="565">AL MAKTOUM INTERNATIONAL AIRPORT</text>
          <text className="map-place-label muted" x="73" y="112">EXPO CITY DUBAI</text>
          <text className="map-place-label muted" x="708" y="256">DUBAI SOUTH RESIDENTIAL DISTRICT</text>
          <text className="map-place-label muted" x="68" y="613">EMAAR SOUTH</text>
        </svg>
        {clusters.filter((cluster) => cluster.projects.length).map((cluster, index) => <div className="dubai-south-map-pin" key={cluster.key} style={{ left: `${cluster.x}%`, top: `${cluster.y}%` }}>
          <span>{cluster.projects.length}</span>
          <div><strong>{String(index + 1).padStart(2, "0")} · {cluster.label}</strong><small>{cluster.caption}</small></div>
        </div>)}
        <div className="dubai-south-map-scale"><span />District orientation · not a surveyed plot map</div>
      </div>
      <div className="dubai-south-map-directory">
        {clusters.map((cluster, clusterIndex) => <section key={cluster.key} aria-labelledby={`map-cluster-${cluster.key}`}>
          <header><span>{String(clusterIndex + 1).padStart(2, "0")}</span><div><h3 id={`map-cluster-${cluster.key}`}>{cluster.label}</h3><p>{cluster.projects.length} researched {cluster.projects.length === 1 ? "record" : "records"}</p></div></header>
          <ol>{cluster.projects.map((project) => <li key={project.slug}>
            <div><p>{project.developer}</p><Link href={`/projects/${project.slug}`}>{project.name}</Link><span>{project.price}</span></div>
            <a href={mapUrl(project.coordinates)} target="_blank" rel="noreferrer" aria-label={`Open ${project.name} coordinates in Google Maps`}>Map ↗</a>
          </li>)}</ol>
        </section>)}
      </div>
    </div>
  </section>;
}
