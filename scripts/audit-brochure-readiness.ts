import { resolveProjectBrochure, resolveProjectDocument } from "../lib/brochure-access";
import { getProjectRegistry, getUniqueActiveProjectRecords } from "../lib/imported-projects";

type ReadyDocument = {
  href: string;
  projectSlugs: string[];
};

async function hasPdfSignature(document: ReadyDocument) {
  let response: Response | null = null;
  try {
    response = await fetch(document.href, {
      headers: {
        accept: "application/pdf",
        range: "bytes=0-4",
        "user-agent": "PSR-Brochure-Release-Audit/1.0",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || !response.body || !/^application\/pdf(?:;|$)/i.test(contentType)) {
      await response.body?.cancel();
      return { ok: false, status: response.status, contentType, signature: "" };
    }
    const reader = response.body.getReader();
    const bytes = new Uint8Array(5);
    let offset = 0;
    while (offset < bytes.length) {
      const { done, value } = await reader.read();
      if (done) break;
      const take = Math.min(value.byteLength, bytes.length - offset);
      bytes.set(value.subarray(0, take), offset);
      offset += take;
    }
    await reader.cancel();
    const signature = new TextDecoder().decode(bytes.subarray(0, offset));
    return { ok: signature === "%PDF-", status: response.status, contentType, signature };
  } catch (error) {
    try { await response?.body?.cancel(); } catch { /* stream already closed */ }
    return {
      ok: false,
      status: 0,
      contentType: "",
      signature: error instanceof Error ? error.message : "request failed",
    };
  }
}

const activeProjects = getUniqueActiveProjectRecords(getProjectRegistry().projects);
const documentsByUrl = new Map<string, ReadyDocument>();
for (const project of activeProjects) {
  const brochure = resolveProjectBrochure(project);
  if (!brochure) continue;
  const document = documentsByUrl.get(brochure.href) || { href: brochure.href, projectSlugs: [] };
  document.projectSlugs.push(project.slug);
  documentsByUrl.set(brochure.href, document);
}

const documents = [...documentsByUrl.values()];
const failures: Array<ReadyDocument & Awaited<ReturnType<typeof hasPdfSignature>>> = [];
let cursor = 0;
const workers = Array.from({ length: Math.min(16, documents.length) }, async () => {
  while (cursor < documents.length) {
    const document = documents[cursor++];
    const result = await hasPdfSignature(document);
    if (!result.ok) failures.push({ ...document, ...result });
  }
});
await Promise.all(workers);

console.log(JSON.stringify({
  activeProjects: activeProjects.length,
  documentReadyProjects: activeProjects.filter((project) => resolveProjectDocument(project)).length,
  verifiedBrochureProjects: activeProjects.filter((project) => resolveProjectDocument(project)?.kind === "verified_brochure").length,
  psrSourcedDossierProjects: activeProjects.filter((project) => resolveProjectDocument(project)?.kind === "psr_dossier").length,
  uniqueVerifiedBrochureDocuments: documents.length,
  failedVerifiedBrochureDocuments: failures.length,
}, null, 2));

if (failures.length) {
  for (const failure of failures) console.error(JSON.stringify(failure));
  process.exitCode = 1;
}
