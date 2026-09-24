import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";
import { getDeveloperDirectory } from "../lib/taxonomy";

const run = promisify(execFile);
const concurrency = 8;
const textToken = /^[A-Za-z0-9][A-Za-z0-9&'’.,:+%/-]{1,}$/;

type Candidate = {
  developers: string[];
  text: string;
  tokenCount: number;
  url: string;
};

const media = new Map<string, Set<string>>();
for (const developer of getDeveloperDirectory()) {
  if (!developer.thumbnail) continue;
  const developers = media.get(developer.thumbnail) || new Set<string>();
  developers.add(developer.slug);
  media.set(developer.thumbnail, developers);
}

const queue = [...media.entries()];
const candidates: Candidate[] = [];
const failures: Array<{ developers: string[]; error: string; url: string }> = [];
const workDirectory = await mkdtemp(join(tmpdir(), "psr-developer-media-text-audit-"));
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
    const [url, developers] = queue[index];
    try {
      const source = url.startsWith("/")
        ? await readFile(join(process.cwd(), "public", url.slice(1)))
        : await fetch(url, { signal: AbortSignal.timeout(20_000) }).then(async (response) => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return Buffer.from(await response.arrayBuffer());
          });
      const image = await sharp(source)
        .rotate()
        .resize({ width: 1_600, height: 1_600, fit: "inside", withoutEnlargement: true })
        .flatten({ background: "white" })
        .png()
        .toBuffer();
      const imagePath = join(workDirectory, `${index}.png`);
      await writeFile(imagePath, image);
      const { stdout } = await run("tesseract", [imagePath, "stdout", "--psm", "11", "-l", "eng", "tsv"], { maxBuffer: 2_000_000, timeout: 30_000 });
      const tokens = confidentWords(stdout);
      const text = tokens.join(" ");
      if (tokens.length >= 3 || (tokens.length >= 2 && text.length >= 16)) {
        candidates.push({ developers: [...developers], text, tokenCount: tokens.length, url });
      }
    } catch (error) {
      failures.push({ developers: [...developers], error: error instanceof Error ? error.message : String(error), url });
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
