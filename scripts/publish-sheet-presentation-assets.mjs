import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const release = "2026-09-12";
const publicAssetDir = path.join(root, "public/presentations/dubai-south-sheet-review-2026-09-12");
const sceneFiles = [
  { id: "ready", path: "output/presentation/PSR_Dubai_South_Ready_Up_to_1_2M_Mr_Arul_Jumanah_2026-09-12_REVIEW.json" },
  { id: "under", path: "output/presentation/PSR_Dubai_South_Offplan_Below_1_7M_Mr_Arul_Jumanah_2026-09-12_REVIEW.json" },
  { id: "above", path: "output/presentation/PSR_Dubai_South_Offplan_Above_1_7M_Mr_Arul_Jumanah_2026-09-12_REVIEW.json" },
];

const reportMeta = {
  ready: {
    label: "Ready properties",
    budgetLabel: "Up to AED 1.2M including planned fees",
    intro: "Completed properties with rental scenarios and an all-in first-year budget ceiling.",
    file: "ready.pdf",
  },
  under: {
    label: "Off-plan (Under Construction)",
    budgetLabel: "Below AED 1.7M including planned fees",
    intro: "Under-construction project comparisons with acquisition allowances and payment commitments shown separately.",
    file: "under.pdf",
  },
  above: {
    label: "Off-plan (Under Construction)",
    budgetLabel: "Above AED 1.7M / Terra comparison",
    intro: "A considered budget extension centred on the provisional Terra Heights comparison.",
    file: "above.pdf",
  },
};

const asWebPath = (value) => `/${value.replaceAll("\\", "/").replace(/^\/+/, "")}`;

async function lockImageSource(source) {
  if (source.startsWith("tmp/sheet-presentations/")) {
    const filename = path.basename(source);
    const destination = path.join(publicAssetDir, filename);
    await copyFile(path.join(root, source), destination);
    return `/presentations/dubai-south-sheet-review-2026-09-12/${filename}`;
  }
  // The sheet renderer emitted a filesystem hint for two existing public assets.
  if (source.startsWith("public/")) return asWebPath(source.slice("public/".length));
  return source;
}

const projects = JSON.parse(await readFile(path.join(root, "tmp/sheet-presentations/projects.json"), "utf8"));
const projectById = new Map(projects.map((project) => [project.id, project]));
const manifest = JSON.parse(await readFile(path.join(root, "output/presentation/dubai-south-sheet-presentations-manifest.json"), "utf8"));
const manifestByName = new Map(manifest.flatMap((entry) => entry.projects.map((project) => [project.name, project])));
await mkdir(publicAssetDir, { recursive: true });

const reports = [];
const slides = [];
let number = 1;

for (const entry of sceneFiles) {
  const scene = JSON.parse(await readFile(path.join(root, entry.path), "utf8"));
  const groupSlides = [];
  for (const rawSlide of scene.slides) {
    const slide = structuredClone(rawSlide);
    slide.group = entry.id;
    slide.number = number;
    for (const element of slide.elements) {
      if (element.type === "image") element.src = await lockImageSource(element.src);
    }
    groupSlides.push(slide);
    slides.push(slide);
    number += 1;
  }

  const projectIds = [...new Set(groupSlides.map((slide) => slide.project).filter(Boolean))];
  const manifestProjects = projectIds.map((id) => {
    const project = projectById.get(id);
    if (!project) throw new Error(`Missing sheet project metadata for ${id}`);
    const manifestProject = manifestByName.get(project.name);
    if (!manifestProject) throw new Error(`Missing sheet presentation manifest row for ${project.name}`);
    const basis = Number(manifestProject.basis);
    const area = Number(project.area || 0);
    return {
      name: project.name,
      allIn: Number(manifestProject.total),
      price: basis,
      area,
      pricePerSqft: area > 0 ? basis / area : 0,
    };
  });
  const meta = reportMeta[entry.id];
  reports.push({
    id: entry.id,
    label: meta.label,
    budgetLabel: meta.budgetLabel,
    intro: meta.intro,
    file: meta.file,
    pageCount: groupSlides.length,
    projects: manifestProjects,
  });
}

const output = {
  width: 960,
  height: 540,
  title: "Dubai South",
  client: "Mr. Arul",
  advisor: "Jumanah",
  date: release,
  reports,
  slides,
};

await writeFile(path.join(root, "data/dubai-south-review-slides.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ output: "data/dubai-south-review-slides.json", release, reports, slides: slides.length }, null, 2));
