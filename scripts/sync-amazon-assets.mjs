import { createHash, createHmac } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const apply = process.argv.includes("--apply");
const root = path.resolve("public");
const bucket = String(process.env.AWS_S3_BUCKET || "").trim();
const region = String(process.env.AWS_S3_REGION || "").trim();
const prefix = String(process.env.AWS_S3_PREFIX || "psrhomes").replace(/^\/+|\/+$/g, "");
const accessKeyId = String(process.env.AWS_S3_ACCESS_KEY_ID || "").trim();
const secretAccessKey = String(process.env.AWS_S3_SECRET_ACCESS_KEY || "").trim();
const sessionToken = String(process.env.AWS_S3_SESSION_TOKEN || "").trim();
const allowedExtensions = new Set([".avif", ".gif", ".ico", ".jpeg", ".jpg", ".mp4", ".pdf", ".png", ".svg", ".webm", ".webp"]);
const contentTypes = new Map([
  [".avif", "image/avif"], [".gif", "image/gif"], [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"], [".jpg", "image/jpeg"], [".mp4", "video/mp4"],
  [".pdf", "application/pdf"], [".png", "image/png"], [".svg", "image/svg+xml"],
  [".webm", "video/webm"], [".webp", "image/webp"],
]);

if (apply && (!bucket || !region)) throw new Error("Set AWS_S3_BUCKET and AWS_S3_REGION before applying the Amazon asset sync.");
if (apply && (!accessKeyId || !secretAccessKey)) throw new Error("Set AWS_S3_ACCESS_KEY_ID and AWS_S3_SECRET_ACCESS_KEY before applying the Amazon asset sync.");

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key, value) {
  return createHmac("sha256", key).update(value).digest();
}

function encodePath(value) {
  return value.split("/").map((segment) => encodeURIComponent(segment).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)).join("/");
}

function signedRequest(key, body, contentType) {
  const host = `${bucket}.s3.${region}.amazonaws.com`;
  const canonicalUri = `/${encodePath([prefix, key].filter(Boolean).join("/"))}`;
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = hash(body);
  const canonicalHeaders = [
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
    ...(sessionToken ? [`x-amz-security-token:${sessionToken}`] : []),
  ].join("\n") + "\n";
  const signedHeaders = ["host", "x-amz-content-sha256", "x-amz-date", ...(sessionToken ? ["x-amz-security-token"] : [])].join(";");
  const canonicalRequest = ["PUT", canonicalUri, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const scope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, hash(canonicalRequest)].join("\n");
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${secretAccessKey}`, dateStamp), region), "s3"), "aws4_request");
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  return {
    url: `https://${host}${canonicalUri}`,
    headers: {
      authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      "content-type": contentType,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      ...(sessionToken ? { "x-amz-security-token": sessionToken } : {}),
    },
  };
}

async function filesIn(directory) {
  const files = [];
  for (const entry of await readdir(directory)) {
    const absolute = path.join(directory, entry);
    const details = await stat(absolute);
    if (details.isDirectory()) files.push(...await filesIn(absolute));
    else if (allowedExtensions.has(path.extname(entry).toLowerCase())) files.push(absolute);
  }
  return files;
}

const files = await filesIn(root);
const totalBytes = (await Promise.all(files.map(async (file) => (await stat(file)).size))).reduce((sum, size) => sum + size, 0);
const destination = bucket && region
  ? `s3://${bucket}/${prefix}/public/ in ${region}`
  : "an Amazon S3 destination that has not been configured yet";
console.log(`${apply ? "Applying" : "Dry run:"} ${files.length} public media files (${(totalBytes / 1024 / 1024).toFixed(1)} MB) to ${destination}.`);

if (apply) {
  let cursor = 0;
  const failures = [];
  async function worker() {
    while (cursor < files.length) {
      const file = files[cursor++];
      const relative = path.relative(root, file).split(path.sep).join("/");
      const body = await readFile(file);
      const request = signedRequest(`public/${relative}`, body, contentTypes.get(path.extname(file).toLowerCase()) || "application/octet-stream");
      const response = await fetch(request.url, { method: "PUT", headers: request.headers, body });
      if (!response.ok) failures.push(`${relative}: HTTP ${response.status}`);
    }
  }
  await Promise.all(Array.from({ length: 4 }, () => worker()));
  if (failures.length) throw new Error(`Amazon asset sync failed for ${failures.length} file(s): ${failures.slice(0, 8).join(", ")}`);
  console.log(`Synchronized ${files.length} public media files to Amazon S3.`);
}
