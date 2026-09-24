import { mkdir, writeFile } from "node:fs/promises";
import registryData from "../data/projects.json";
import {
  buildCuratedBriefContent,
  buildReportProjects,
  renderCuratedBriefPdf,
  type ReportProjectRecord,
} from "../worker/curated-brief";

const registry = registryData as { projects: ReportProjectRecord[] };
const project = registry.projects.find((item) => item.slug === "arancia-yards-2-beyond-city-of-arabia-dubai");
if (!project) throw new Error("Sample project was not found.");

const reportProjects = buildReportProjects([project], [{
  slug: project.slug,
  bedroom: "2BR",
  unitReference: "2BR client scenario",
  unitPrice: 2_250_000,
  unitAreaSqft: 1_180,
  annualRent: 155_000,
  annualRentLow: 140_000,
  annualRentHigh: 170_000,
  occupancyRate: 95,
  serviceChargePerSqft: 18,
  otherAnnualCosts: 2_500,
  acquisitionCosts: 101_000,
  rentalEvidenceNotes: "Planning scenario for layout testing. Replace with the current DLD Rental Index result and configuration-matched Ejari comparables before client use.",
  confirmationNotes: "Sample confirmed-input record for PDF layout verification.",
}]);

const content = buildCuratedBriefContent({
  projects: reportProjects,
  brief: "Five-year income and capital-value review with rental sensitivity, community access, nearby supply and Golden Visa context.",
  narrative: {
    executiveSummary: "This sample brief tests the complete advisor presentation using editable unit economics. It separates the selected unit scenario from the area benchmark, applies an occupancy stress case to expected rent and shows the nearby project pipeline without treating it as a complete planning-authority schedule.",
    recommendation: "Use the selected unit as a structured client discussion case, subject to live inventory, exact net area, dated rent evidence, the final payment schedule and transaction-document review. The visible score is a weighted advisory screen rather than a formal valuation or return forecast.",
    marketPosition: "The unit is assessed against the stored area price-per-square-foot benchmark, a rent sensitivity range and the current indexed local pipeline.",
    locationStory: "Accessibility is calculated from published coordinates and should be reconfirmed against the actual road route and intended travel period.",
    riskNotes: [
      "The achieved rent and occupancy may differ from the entered scenario.",
      "Future supply can affect leasing velocity and resale competition.",
      "All project, cost and schedule inputs require final documentary verification.",
    ],
  },
  advisor: {
    name: "Mehul",
    email: "advisor@psrhomes.ae",
    phone: "+971 50 000 0000",
    title: "Chief Executive Officer",
  },
  confirmedAt: "2026-07-25T12:00:00.000Z",
});

const bytes = await renderCuratedBriefPdf({
  id: "sample-curated-brief",
  type: "proposal",
  title: "Curated investment brief",
  client_name: "Sample Client",
  created_at: "2026-07-25T12:00:00.000Z",
  content,
}, {});

const outputDirectory = new URL("../output/pdf/", import.meta.url);
await mkdir(outputDirectory, { recursive: true });
await writeFile(new URL("curated-brief-valuation-sample.pdf", outputDirectory), new Uint8Array(bytes));
console.log(new URL("curated-brief-valuation-sample.pdf", outputDirectory).pathname);
