/**
 * Order the hero sequence frames along the sketch -> photoreal axis.
 *
 * The frames are near-identical compositions that differ only in how far the
 * render has progressed, so ordering them by eye is unreliable. This measures
 * each frame instead and sorts on the result.
 *
 * Three signals, combined:
 *   saturation  a pencil study is greyscale; the finished render carries sky
 *               and sunset colour. This is the single strongest ordering cue.
 *   ink         mean darkness. Faint construction marks sit close to white;
 *               shaded graphite and lit renders carry far more tone.
 *   detail      mean absolute difference between neighbouring pixels. Rises as
 *               linework accumulates, then again as materials and reflections
 *               appear.
 *
 * Usage:
 *   node scripts/order-hero-frames.mjs <folder-of-frames>
 *
 * It prints the proposed order with each frame's measurements so the ranking
 * can be sanity-checked, and writes the ordered filenames to frames.json for
 * the component to import. It renames nothing — inspect the order first.
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { basename, extname, resolve } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const folder = resolve(process.argv[2] ?? "public/hero/museum-sequence");
const SAMPLE = 96; // downsample width; ample for global statistics and fast

/**
 * Decode to raw RGB. sips is asked for BMP because it is uncompressed and
 * unfiltered — a fixed header then pixel rows — so it needs no image library.
 */
async function samplePixels(file) {
  const tmp = `/tmp/hero-frame-${basename(file, extname(file))}.bmp`;
  await run("sips", ["-s", "format", "bmp", "-Z", String(SAMPLE), file, "--out", tmp]);
  const data = await readFile(tmp);

  const offset = data.readUInt32LE(10);
  const width = data.readInt32LE(18);
  const rawHeight = data.readInt32LE(22);
  const bpp = data.readUInt16LE(28);
  const height = Math.abs(rawHeight);
  const channels = bpp / 8;
  if (channels < 3) throw new Error(`${file}: unexpected ${bpp}-bit BMP`);

  // Rows are padded to a 4-byte boundary and, for a positive height, stored
  // bottom-up. Order does not affect the statistics, so rows are read as-is.
  const stride = Math.ceil((width * channels) / 4) * 4;
  const bytes = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const from = offset + y * stride + x * channels;
      const to = (y * width + x) * 3;
      bytes[to] = data[from + 2];     // BMP stores BGR
      bytes[to + 1] = data[from + 1];
      bytes[to + 2] = data[from];
    }
  }
  return { width, height, channels: 3, bytes };
}

function measure({ width, height, channels, bytes }) {
  let ink = 0, saturation = 0, detail = 0, count = 0, edges = 0;
  const at = (x, y, c) => bytes[(y * width + x) * channels + c];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const r = at(x, y, 0), g = at(x, y, 1), b = at(x, y, 2);
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      ink += 255 - (0.2126 * r + 0.7152 * g + 0.0722 * b);
      saturation += max === 0 ? 0 : (max - min) / max;
      count += 1;
      if (x + 1 < width) {
        const r2 = at(x + 1, y, 0), g2 = at(x + 1, y, 1), b2 = at(x + 1, y, 2);
        detail += Math.abs(r - r2) + Math.abs(g - g2) + Math.abs(b - b2);
        edges += 1;
      }
    }
  }
  return {
    ink: ink / count / 255,
    saturation: saturation / count,
    detail: detail / edges / 765,
  };
}

const files = (await readdir(folder))
  .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
  .sort();

if (!files.length) {
  console.error(`No images in ${folder}`);
  process.exit(1);
}

const rows = [];
for (const file of files) {
  const stats = measure(await samplePixels(resolve(folder, file)));
  rows.push({ file, ...stats });
}

// Detail carries the ordering. Edge energy only ever accumulates as a drawing
// gains linework, then materials, then reflections, so it rises monotonically
// from first frame to last — and unlike tone or saturation it does not invert
// when the artwork sits on a dark ground instead of paper. Validated against
// the original gold-on-black set, where it recovers the labelled 01..08 order
// exactly while tone and saturation both run backwards.
//
// Tone and saturation are kept only to separate frames of equal detail, and
// tone is polarity-corrected so a dark-ground sequence is not ranked in
// reverse.
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const darkGround = median(rows.map((r) => r.ink)) > 0.5;
const tone = (r) => (darkGround ? 1 - r.ink : r.ink);
const score = (r) => r.detail * 100 + r.saturation * 0.4 + tone(r) * 0.4;
rows.sort((a, b) => score(a) - score(b));

console.log("\n  #  frame                                    sat     ink   detail   score");
console.log("  ─────────────────────────────────────────────────────────────────────────");
rows.forEach((r, i) => {
  console.log(
    `  ${String(i + 1).padStart(2)}  ${r.file.padEnd(40).slice(0, 40)} ` +
    `${r.saturation.toFixed(3)}  ${r.ink.toFixed(3)}  ${r.detail.toFixed(3)}  ${score(r).toFixed(3)}`
  );
});
console.log("\n  First frame is the faintest drawing; last is the finished render.");
console.log("  Check the ramp reads smoothly, then wire frames.json into the hero.\n");

await writeFile(resolve(folder, "frames.json"), JSON.stringify(rows.map((r) => r.file), null, 2) + "\n");
console.log(`  Wrote ${resolve(folder, "frames.json")}\n`);
