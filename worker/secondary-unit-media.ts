export const MAX_SECONDARY_UNIT_PHOTOS = 12;
export const MAX_SECONDARY_UNIT_PHOTO_BYTES = 12 * 1024 * 1024;

export type SecondaryUnitMediaEnv = {
  DB: D1Database;
  MEDIA: R2Bucket;
  IMAGES: ImagesBinding;
};

export type SecondaryUnitPhoto = {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  sortOrder: number;
  createdAt: string;
};

export type SecondaryUnitPhotoAccess = {
  id: string;
  unit_id: string;
  agent_email: string;
  r2_key: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  width: number;
  height: number;
  sort_order: number;
  created_at: string;
  published: number;
  portfolio_public: number;
  onboarding_complete: number;
  agent_active: number;
};

type SecondaryUnitPhotoRow = {
  id: string;
  unit_id: string;
  r2_key: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  width: number;
  height: number;
  sort_order: number;
  created_at: string;
};

type PreparedPhoto = {
  bytes: ArrayBuffer;
  mimeType: "image/webp";
  width: number;
  height: number;
};

export class SecondaryUnitPhotoError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "SecondaryUnitPhotoError";
  }
}

function photoResponse(row: SecondaryUnitPhotoRow): SecondaryUnitPhoto {
  return {
    id: row.id,
    url: `/api/agent/listing-media/${row.id}`,
    filename: row.original_filename,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    width: row.width,
    height: row.height,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

function safeFilename(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f/\\]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160) || "listing-photo";
}

function imageSignature(bytes: Uint8Array) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "image/webp";
  return "";
}

function imageStream(bytes: ArrayBuffer, mimeType: string) {
  return new Blob([bytes], { type: mimeType }).stream();
}

async function preparePhoto(env: SecondaryUnitMediaEnv, file: File): Promise<PreparedPhoto> {
  if (file.size < 1) throw new SecondaryUnitPhotoError(400, "Choose a photo to upload.");
  if (file.size > MAX_SECONDARY_UNIT_PHOTO_BYTES) {
    throw new SecondaryUnitPhotoError(413, "Each listing photo must be 12 MB or smaller.");
  }
  const source = await file.arrayBuffer();
  const detectedType = imageSignature(new Uint8Array(source, 0, Math.min(source.byteLength, 16)));
  if (!detectedType) {
    throw new SecondaryUnitPhotoError(415, "Use a JPEG, PNG or WebP property photo.");
  }
  if (file.type && file.type !== detectedType) {
    throw new SecondaryUnitPhotoError(415, "The selected file does not match its image type.");
  }
  try {
    const info = await env.IMAGES.info(imageStream(source, detectedType));
    if (!("width" in info) || info.width < 1 || info.height < 1) {
      throw new SecondaryUnitPhotoError(415, "The selected file is not a supported property photo.");
    }
    const transformed = await env.IMAGES
      .input(imageStream(source, detectedType))
      .transform({ width: 2400, height: 2400, fit: "scale-down" })
      .output({ format: "image/webp", quality: 84, anim: false });
    const bytes = await transformed.response().arrayBuffer();
    if (!bytes.byteLength) throw new SecondaryUnitPhotoError(415, "The selected photo could not be prepared.");
    const scale = Math.min(1, 2400 / Math.max(info.width, info.height));
    return {
      bytes,
      mimeType: "image/webp",
      width: Math.max(1, Math.round(info.width * scale)),
      height: Math.max(1, Math.round(info.height * scale)),
    };
  } catch (error) {
    if (error instanceof SecondaryUnitPhotoError) throw error;
    throw new SecondaryUnitPhotoError(415, "The selected photo is corrupt or unsupported.");
  }
}

export async function secondaryUnitPhotosForAgent(
  env: SecondaryUnitMediaEnv,
  agentEmail: string,
  publishedOnly = false,
) {
  const rows = await env.DB.prepare(
    `SELECT m.id, m.unit_id, m.r2_key, m.original_filename, m.mime_type,
            m.size_bytes, m.width, m.height, m.sort_order, m.created_at
       FROM hg_agent_secondary_unit_media m
       JOIN hg_agent_secondary_units u ON u.id = m.unit_id
      WHERE u.agent_email = ? ${publishedOnly ? "AND u.published = 1" : ""}
      ORDER BY m.unit_id, m.sort_order, m.created_at`,
  ).bind(agentEmail).all<SecondaryUnitPhotoRow>();
  const grouped = new Map<string, SecondaryUnitPhoto[]>();
  for (const row of rows.results) {
    const unitPhotos = grouped.get(row.unit_id) || [];
    unitPhotos.push(photoResponse(row));
    grouped.set(row.unit_id, unitPhotos);
  }
  return grouped;
}

export async function secondaryUnitPhotosForUnit(env: SecondaryUnitMediaEnv, agentEmail: string, unitId: string) {
  const rows = await env.DB.prepare(
    `SELECT m.id, m.unit_id, m.r2_key, m.original_filename, m.mime_type,
            m.size_bytes, m.width, m.height, m.sort_order, m.created_at
       FROM hg_agent_secondary_unit_media m
       JOIN hg_agent_secondary_units u ON u.id = m.unit_id
      WHERE u.id = ? AND u.agent_email = ?
      ORDER BY m.sort_order, m.created_at`,
  ).bind(unitId, agentEmail).all<SecondaryUnitPhotoRow>();
  return rows.results.map(photoResponse);
}

export async function storeSecondaryUnitPhoto(
  env: SecondaryUnitMediaEnv,
  agentEmail: string,
  unitId: string,
  file: File,
) {
  const owned = await env.DB.prepare(
    "SELECT id FROM hg_agent_secondary_units WHERE id = ? AND agent_email = ? LIMIT 1",
  ).bind(unitId, agentEmail).first<{ id: string }>();
  if (!owned) throw new SecondaryUnitPhotoError(404, "Secondary unit not found.");
  const count = await env.DB.prepare(
    "SELECT COUNT(*) AS total, COALESCE(MAX(sort_order), -1) AS last_order FROM hg_agent_secondary_unit_media WHERE unit_id = ?",
  ).bind(unitId).first<{ total: number; last_order: number }>();
  if ((count?.total || 0) >= MAX_SECONDARY_UNIT_PHOTOS) {
    throw new SecondaryUnitPhotoError(409, `A listing can store up to ${MAX_SECONDARY_UNIT_PHOTOS} photos.`);
  }

  const prepared = await preparePhoto(env, file);
  const id = crypto.randomUUID();
  const key = `listing-media/${unitId}/${id}.webp`;
  await env.MEDIA.put(key, prepared.bytes, {
    httpMetadata: {
      contentType: prepared.mimeType,
      cacheControl: "public, max-age=31536000, immutable",
    },
    customMetadata: {
      unitId,
      owner: agentEmail,
      originalFilename: safeFilename(file.name),
    },
  });
  try {
    await env.DB.prepare(
      `INSERT INTO hg_agent_secondary_unit_media
       (id, unit_id, r2_key, original_filename, mime_type, size_bytes, width, height, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      id,
      unitId,
      key,
      safeFilename(file.name),
      prepared.mimeType,
      prepared.bytes.byteLength,
      prepared.width,
      prepared.height,
      (count?.last_order ?? -1) + 1,
    ).run();
  } catch (error) {
    try {
      await env.MEDIA.delete(key);
    } catch (cleanupError) {
      console.error(JSON.stringify({
        event: "secondary_unit_photo_cleanup_failed",
        key,
        message: cleanupError instanceof Error ? cleanupError.message.slice(0, 240) : "R2 cleanup failed.",
      }));
    }
    throw error;
  }
  const row = await env.DB.prepare(
    `SELECT id, unit_id, r2_key, original_filename, mime_type, size_bytes,
            width, height, sort_order, created_at
       FROM hg_agent_secondary_unit_media WHERE id = ? LIMIT 1`,
  ).bind(id).first<SecondaryUnitPhotoRow>();
  if (!row) throw new Error("The listing photo could not be recorded.");
  return photoResponse(row);
}

export async function removeSecondaryUnitPhoto(
  env: SecondaryUnitMediaEnv,
  agentEmail: string,
  unitId: string,
  photoId: string,
) {
  const row = await env.DB.prepare(
    `SELECT m.id, m.r2_key
       FROM hg_agent_secondary_unit_media m
       JOIN hg_agent_secondary_units u ON u.id = m.unit_id
      WHERE m.id = ? AND m.unit_id = ? AND u.agent_email = ? LIMIT 1`,
  ).bind(photoId, unitId, agentEmail).first<{ id: string; r2_key: string }>();
  if (!row) throw new SecondaryUnitPhotoError(404, "Listing photo not found.");
  await env.MEDIA.delete(row.r2_key);
  await env.DB.prepare(
    `DELETE FROM hg_agent_secondary_unit_media
      WHERE id = ? AND unit_id = ?
        AND EXISTS (SELECT 1 FROM hg_agent_secondary_units WHERE id = ? AND agent_email = ?)`,
  ).bind(photoId, unitId, unitId, agentEmail).run();
}

export async function removeAllSecondaryUnitPhotos(env: SecondaryUnitMediaEnv, agentEmail: string, unitId: string) {
  const rows = await env.DB.prepare(
    `SELECT m.r2_key
       FROM hg_agent_secondary_unit_media m
       JOIN hg_agent_secondary_units u ON u.id = m.unit_id
      WHERE u.id = ? AND u.agent_email = ?`,
  ).bind(unitId, agentEmail).all<{ r2_key: string }>();
  for (const row of rows.results) await env.MEDIA.delete(row.r2_key);
}

export async function secondaryUnitPhotoAccess(env: SecondaryUnitMediaEnv, photoId: string) {
  return env.DB.prepare(
    `SELECT m.id, m.unit_id, u.agent_email, m.r2_key, m.original_filename, m.mime_type,
            m.size_bytes, m.width, m.height, m.sort_order, m.created_at, u.published,
            COALESCE(a.portfolio_public, 0) AS portfolio_public,
            COALESCE(a.onboarding_complete, 0) AS onboarding_complete,
            p.active AS agent_active
       FROM hg_agent_secondary_unit_media m
       JOIN hg_agent_secondary_units u ON u.id = m.unit_id
       JOIN hg_agent_profiles p ON p.email = u.agent_email
       LEFT JOIN hg_agent_advisor_profiles a ON a.agent_email = u.agent_email
      WHERE m.id = ? LIMIT 1`,
  ).bind(photoId).first<SecondaryUnitPhotoAccess>();
}

export function secondaryUnitPhotoIsPublic(row: SecondaryUnitPhotoAccess) {
  return Boolean(row.published && row.portfolio_public && row.onboarding_complete && row.agent_active);
}

export async function secondaryUnitPhotoResponse(
  env: SecondaryUnitMediaEnv,
  row: SecondaryUnitPhotoAccess,
  method: "GET" | "HEAD",
  isPublic: boolean,
) {
  const object = method === "HEAD" ? await env.MEDIA.head(row.r2_key) : await env.MEDIA.get(row.r2_key);
  if (!object) return null;
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("content-type", row.mime_type);
  headers.set("content-length", String(object.size));
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", isPublic ? "public, max-age=300, stale-while-revalidate=86400" : "private, no-store");
  headers.set("x-content-type-options", "nosniff");
  headers.set("content-security-policy", "default-src 'none'; sandbox");
  return new Response(method === "HEAD" ? null : (object as R2ObjectBody).body, { headers });
}
