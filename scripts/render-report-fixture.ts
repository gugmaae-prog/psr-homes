import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import registryData from "../data/projects.json";
import {
  buildCuratedBriefContent,
  buildReportProjects,
  renderCuratedBriefPdf,
  type ConfirmedProjectInput,
  type CuratedBriefDocument,
  type ReportProjectRecord,
} from "../worker/curated-brief";

const output = resolve(process.argv[2] || "artifacts/psr-report-fixture.pdf");
const registry = registryData as { projects: ReportProjectRecord[] };
const project = registry.projects.find((candidate) => candidate.slug === "marea-residences-sharafi-dubai-islands")
  || registry.projects.find((candidate) => !candidate.archived && candidate.emirate === "Dubai")
  || registry.projects[0];
if (!project) throw new Error("The project fixture catalogue is empty.");

const unitPrice = Math.max(1_900_000, Number(String(project.startingPrice).replace(/[^\d.]/g, "")) || 1_900_000);
const input: ConfirmedProjectInput = {
  slug: project.slug,
  bedroom: project.bedrooms[0] || "1BR",
  unitReference: "QA-PSR-01",
  unitPrice,
  unitAreaSqft: 920,
  annualRent: 138_000,
  annualRentLow: 126_000,
  annualRentHigh: 150_000,
  occupancyRate: 95,
  serviceChargePerSqft: 18,
  otherAnnualCosts: 4_500,
  acquisitionCosts: Math.round(unitPrice * .07),
  rentalEvidenceNotes: "Fixture only: replace with dated, unit-matched leasing evidence before client use.",
  confirmationNotes: "Quality-assurance fixture generated from the current PSR report pipeline.",
};
const preparedAt = new Date().toISOString();
const projects = buildReportProjects([project], [input]);
const content = buildCuratedBriefContent({
  projects,
  brief: "Quality-assurance fixture for the PSR report system.",
  narrative: {},
  advisor: {
    name: "PSR Quality Review",
    email: "sales@psrhomes.ae",
    phone: "+971 58 680 1148",
    title: "Property Advisor",
  },
  confirmedAt: preparedAt,
});
const document: CuratedBriefDocument = {
  id: crypto.randomUUID(),
  type: "proposal",
  title: `${project.name} | Curated Property Brief`,
  client_name: "Private Client",
  created_at: preparedAt,
  content,
};
const logo = await readFile(resolve("public/brand/psr-logo.png"));
const pdf = await renderCuratedBriefPdf(document, {
  ASSETS: {
    fetch: async () => new Response(logo, {
      status: 200,
      headers: { "content-type": "image/png", "content-length": String(logo.byteLength) },
    }),
  },
} as never);
await mkdir(dirname(output), { recursive: true });
await writeFile(output, Buffer.from(pdf));
console.log(output);
