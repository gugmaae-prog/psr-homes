type MirrorBody = ArrayBuffer | ArrayBufferView | string;

export type MediaStorageEnv = {
  MEDIA: R2Bucket;
  AWS_S3_BUCKET?: string;
  AWS_S3_REGION?: string;
  AWS_S3_PREFIX?: string;
  AWS_S3_ACCESS_KEY_ID?: string;
  AWS_S3_SECRET_ACCESS_KEY?: string;
  AWS_S3_SESSION_TOKEN?: string;
};

type S3Config = {
  bucket: string;
  region: string;
  prefix: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
};

const encoder = new TextEncoder();

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function s3Config(env: MediaStorageEnv): S3Config | null {
  const bucket = clean(env.AWS_S3_BUCKET, 63);
  const region = clean(env.AWS_S3_REGION, 40);
  const accessKeyId = clean(env.AWS_S3_ACCESS_KEY_ID, 128);
  const secretAccessKey = clean(env.AWS_S3_SECRET_ACCESS_KEY, 256);
  if (!bucket || !region || !accessKeyId || !secretAccessKey) return null;
  return {
    bucket,
    region,
    prefix: clean(env.AWS_S3_PREFIX, 180).replace(/^\/+|\/+$/g, ""),
    accessKeyId,
    secretAccessKey,
    sessionToken: clean(env.AWS_S3_SESSION_TOKEN, 2_048),
  };
}

function ownedBytes(value: MirrorBody): Uint8Array<ArrayBuffer> {
  const source = typeof value === "string"
    ? encoder.encode(value)
    : value instanceof ArrayBuffer
      ? new Uint8Array(value)
      : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  const copy = new Uint8Array(source.byteLength);
  copy.set(source);
  return copy;
}

function hex(value: ArrayBuffer | Uint8Array<ArrayBuffer>) {
  const source = value instanceof Uint8Array ? value : new Uint8Array(value);
  return [...source].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: Uint8Array<ArrayBuffer>) {
  return hex(await crypto.subtle.digest("SHA-256", value.buffer));
}

async function hmac(key: ArrayBuffer | Uint8Array<ArrayBuffer> | string, value: string) {
  const keyBytes = typeof key === "string" ? ownedBytes(key) : key instanceof Uint8Array ? key : new Uint8Array(key);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(value)));
}

function encodePath(path: string) {
  return path.split("/").map((segment) => encodeURIComponent(segment).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)).join("/");
}

function objectKey(config: S3Config, key: string) {
  return [config.prefix, key.replace(/^\/+/, "")].filter(Boolean).join("/");
}

async function signS3Request(config: S3Config, method: "PUT" | "DELETE", key: string, payload: Uint8Array<ArrayBuffer>) {
  const host = `${config.bucket}.s3.${config.region}.amazonaws.com`;
  const canonicalUri = `/${encodePath(objectKey(config, key))}`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = await sha256(payload);
  const canonicalHeaders = [
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
    ...(config.sessionToken ? [`x-amz-security-token:${config.sessionToken}`] : []),
  ].join("\n") + "\n";
  const signedHeaders = [
    "host",
    "x-amz-content-sha256",
    "x-amz-date",
    ...(config.sessionToken ? ["x-amz-security-token"] : []),
  ].join(";");
  const canonicalRequest = [method, canonicalUri, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const scope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    await sha256(ownedBytes(canonicalRequest)),
  ].join("\n");
  const dateKey = await hmac(`AWS4${config.secretAccessKey}`, dateStamp);
  const regionKey = await hmac(dateKey, config.region);
  const serviceKey = await hmac(regionKey, "s3");
  const signingKey = await hmac(serviceKey, "aws4_request");
  const signature = hex(await hmac(signingKey, stringToSign));
  return {
    url: `https://${host}${canonicalUri}`,
    headers: {
      Authorization: `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      ...(config.sessionToken ? { "x-amz-security-token": config.sessionToken } : {}),
    },
  };
}

async function mirrorRequest(
  env: MediaStorageEnv,
  method: "PUT" | "DELETE",
  key: string,
  body: MirrorBody,
  options?: R2PutOptions,
) {
  const config = s3Config(env);
  if (!config) return false;
  const payload = ownedBytes(body);
  try {
    const signed = await signS3Request(config, method, key, payload);
    const metadata = options?.httpMetadata;
    const contentType = metadata instanceof Headers ? metadata.get("content-type") || "" : metadata?.contentType || "";
    const contentDisposition = metadata instanceof Headers ? metadata.get("content-disposition") || "" : metadata?.contentDisposition || "";
    const cacheControl = metadata instanceof Headers ? metadata.get("cache-control") || "" : metadata?.cacheControl || "";
    const response = await fetch(signed.url, {
      method,
      headers: {
        ...signed.headers,
        ...(method === "PUT" && contentType ? { "content-type": contentType } : {}),
        ...(method === "PUT" && contentDisposition ? { "content-disposition": contentDisposition } : {}),
        ...(method === "PUT" && cacheControl ? { "cache-control": cacheControl } : {}),
      },
      body: method === "PUT" ? payload.buffer : undefined,
    });
    if (!response.ok) throw new Error(`Amazon S3 returned ${response.status}.`);
    return true;
  } catch (error) {
    console.error(JSON.stringify({
      event: "amazon_s3_mirror_failed",
      method,
      key,
      message: error instanceof Error ? error.message.slice(0, 240) : "Amazon S3 request failed.",
    }));
    return false;
  }
}

export async function putMediaObject(env: MediaStorageEnv, key: string, body: MirrorBody, options?: R2PutOptions) {
  await env.MEDIA.put(key, body, options);
  return mirrorRequest(env, "PUT", key, body, options);
}

export async function deleteMediaObject(env: MediaStorageEnv, key: string) {
  await env.MEDIA.delete(key);
  return mirrorRequest(env, "DELETE", key, new Uint8Array());
}

export function amazonS3MirrorConfigured(env: MediaStorageEnv) {
  return Boolean(s3Config(env));
}
