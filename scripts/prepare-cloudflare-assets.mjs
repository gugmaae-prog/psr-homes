import { cp, mkdir, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const client = resolve("dist/client");
const mountRoot = resolve(client, "h&g");
const mounted = resolve(mountRoot, "properties");

await mkdir(mounted, { recursive: true });

for (const entry of await readdir(client, { withFileTypes: true })) {
  if (entry.name === "h&g") continue;
  await cp(resolve(client, entry.name), resolve(mounted, entry.name), {
    recursive: entry.isDirectory(),
  });
}

console.log(`Prepared Cloudflare assets at ${mounted}`);
