import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";
import { curatedLaunches } from "../data/curated-launches";

const run = promisify(execFile);
const concurrency = 8;
const textToken = /^[A-Za-z0-9][A-Za-z0-9&'’.,:+%/-]{1,}$/;

type Candidate = {
  projects: string[];
  text: string;
  tokenCount: number;
  url: string;
};

const media = new Map<string, Set<string>>();
for (const project of curatedLaunches) {
  for (const url of [project.image, ...project.gallery, ...project.exteriors, ...project.interiors]) {
    if (!url || project.floorplans.includes(url)) continue;
    const projects = media.get(url) || new Set<string>();
    projects.add(project.slug);
    media.set(url, projects);
  }
}

const queue = [...media.entries()];
const candidates: Candidate[] = [];
const failures: Array<{ error: string; url: string }> = [];
const workDirectory = await mkdtemp(join(tmpdir(), "cba-media-text-audit-"));
let cursor = 0;

function confidentWords(value: string) {
  return value.split("\n").slice(1).flatMap((line) => {
    const columns = line.split("\t");
    const confidence = Number(columns[10]);
    const word = (columns[11] || "").trim();
    return confidence >= 72 && textToken.test(word) ? [word] : [];
  });
}

async function inspect() {
  while (true) {
    const index = cursor++;
    if (index >= queue.length) return;
    const [url, projects] = queue[index];
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const source = Buffer.from(await response.arrayBuffer());
      const image = await sharp(source).rotate().resize({ width: 1_600, height: 1_600, fit: "inside", withoutEnlargement: true }).flatten({ background: "white" }).png().toBuffer();
      const imagePath = join(workDirectory, `${index}.png`);
      await writeFile(imagePath, image);
      const { stdout } = await run("tesseract", [imagePath, "stdout", "--psm", "11", "-l", "eng", "tsv"], { maxBuffer: 2_000_000, timeout: 30_000 });
      const tokens = confidentWords(stdout);
      const text = tokens.join(" ");
      if (tokens.length >= 3 || (tokens.length >= 2 && text.length >= 16)) {
        candidates.push({ projects: [...projects], text, tokenCount: tokens.length, url });
      }
    } catch (error) {
      failures.push({ error: error instanceof Error ? error.message : String(error), url });
    }
  }
}

try {
  await Promise.all(Array.from({ length: concurrency }, inspect));
  candidates.sort((a, b) => b.tokenCount - a.tokenCount || a.url.localeCompare(b.url));
  process.stdout.write(`${JSON.stringify({ audited: queue.length, candidates, failures }, null, 2)}\n`);
} finally {
  await rm(workDirectory, { recursive: true, force: true });
}
