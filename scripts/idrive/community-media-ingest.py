#!/usr/bin/env python3
"""IDrive-only community media ingest. Run from an authorized operator environment.

Input: explicitly reviewed local image files, one row for each live community card.
No remote download from untrusted URLs, credential export, R2 writes, or deletion.
Dry-run by default; --write requires a complete approved input set.
Dependencies: Pillow, boto3. Existing E2J credentials are injected by operator
environment. Never put credentials or private receipt files in a public repo.
"""
import argparse
import hashlib
import io
import json
import os
import re
from pathlib import Path
from datetime import datetime, timezone
from urllib.parse import urlparse
from PIL import Image, ImageOps
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

BUCKET = "espacios-store-j"
ENDPOINT = "https://s3.us-west-2.idrivee2.com"
REGION = "us-east-1"
PREFIX = "psrhomes/community-media/v1/"
MAX_FILE = 30 * 1024 * 1024
MIN_WIDTH, MIN_HEIGHT = 1200, 750
Image.MAX_IMAGE_PIXELS = 60_000_000
HEX64 = re.compile(r"^[0-9a-f]{64}$")
SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
FORMATS = {"JPEG": ("jpg", "image/jpeg"), "PNG": ("png", "image/png"), "WEBP": ("webp", "image/webp")}
KINDS = {"community_photo", "local_landmark_photo", "masterplan_render", "project_render", "community_render"}

def require(condition, message):
    if not condition:
        raise ValueError(message)

def sha(data):
    return hashlib.sha256(data).hexdigest()

def dhash(image):
    # 64-bit horizontal difference hash, independent of image size.
    px = list(image.convert("L").resize((9, 8), Image.Resampling.LANCZOS).getdata())
    value = 0
    for y in range(8):
        for x in range(8):
            i = y * 9 + x
            value = (value << 1) | int(px[i] > px[i + 1])
    return f"{value:016x}"

def hamming(a, b):
    return (int(a, 16) ^ int(b, 16)).bit_count()

def https_url(value):
    try:
        p = urlparse(value)
        return p.scheme == "https" and bool(p.hostname) and not p.username and not p.password
    except (TypeError, ValueError):
        return False

def prepare(row, root):
    slug = row["slug"]
    identity = row["id"]
    require(SLUG.fullmatch(slug) and identity == row["emirate"] + "|" + slug, "Invalid community identity")
    require(row.get("rightsApproved") is True and bool(row.get("rightsEvidence")), f"{identity}: rights evidence required")
    require(row.get("locationApproved") is True and row.get("visualApproved") is True, f"{identity}: geographic and visual review required")
    require(row.get("kind") in KINDS and bool(row.get("caption")) and bool(row.get("credit")), f"{identity}: caption, credit and image type required")
    require(https_url(row.get("sourcePage")) and https_url(row.get("imageUrl")), f"{identity}: HTTPS source provenance required")
    file = (root / row["localFile"]).resolve()
    require(file.is_relative_to(root) and file.is_file(), f"{identity}: file outside approved staging directory or missing")
    require(0 < file.stat().st_size <= MAX_FILE, f"{identity}: invalid file size")
    data = file.read_bytes()
    require(HEX64.fullmatch(row.get("reviewedSha256", "")) and sha(data) == row["reviewedSha256"], f"{identity}: bytes differ from reviewed file")
    with Image.open(io.BytesIO(data)) as im:
        fmt = im.format
        require(fmt in FORMATS and getattr(im, "n_frames", 1) == 1, f"{identity}: unsupported or animated image")
        require(im.width * im.height <= Image.MAX_IMAGE_PIXELS, f"{identity}: image too large")
        im.load()
        img = ImageOps.exif_transpose(im).convert("RGB")
    w, h = img.size
    require(w >= MIN_WIDTH and h >= MIN_HEIGHT and w > h, f"{identity}: source too small or not landscape")
    # Keep the original bytes unmodified. Crop only the card derivative; no stretching
    # or upscaling. Manual crop focus is required for important off-center landmarks.
    target_w = min(1600, (w // 8) * 8, (h * 8 // 5 // 8) * 8)
    target_h = target_w * 5 // 8
    require(target_w >= MIN_WIDTH and target_h >= MIN_HEIGHT, f"{identity}: unsuitable crop")
    focus = row.get("cropFocus", [0.5, 0.5])
    require(isinstance(focus, list) and len(focus) == 2 and all(isinstance(x, (float, int)) and 0 <= x <= 1 for x in focus), f"{identity}: invalid crop focus")
    card = ImageOps.fit(img, (target_w, target_h), Image.Resampling.LANCZOS, centering=tuple(focus))
    buf = io.BytesIO()
    card.save(buf, "WEBP", quality=88, method=6)
    derivative = buf.getvalue()
    ext, mime = FORMATS[fmt]
    base = PREFIX + re.sub(r"[^a-z0-9]+", "-", row["emirate"].lower()).strip("-") + "/" + slug + "/"
    def object_entry(content, kind, extension, content_type, width, height, fingerprint):
        digest = sha(content)
        return {
            "key": base + kind + "/" + digest + "." + extension,
            "sha256": digest, "bytes": len(content), "contentType": content_type,
            "width": width, "height": height, "dHash": fingerprint,
            "_data": content
        }
    return {
        "id": identity, "slug": slug, "name": row["name"], "emirate": row["emirate"],
        "kind": row["kind"], "caption": row["caption"], "credit": row["credit"],
        "sourcePage": row["sourcePage"], "imageUrl": row["imageUrl"],
        "rightsEvidence": row["rightsEvidence"],
        "original": object_entry(data, "original", ext, mime, w, h, dhash(img)),
        "card": object_entry(derivative, "card", "webp", "image/webp", target_w, target_h, dhash(card))
    }

def validate_uniqueness(prepared):
    seen_ids, seen_hashes, seen_urls = set(), {}, set()
    previous = []
    for row in prepared:
        identity = row["id"]
        require(identity not in seen_ids, f"Repeated identity {identity}")
        seen_ids.add(identity)
        require(row["imageUrl"] not in seen_urls, f"Repeated source URL: {identity}")
        seen_urls.add(row["imageUrl"])
        for role in ("original", "card"):
            asset = row[role]
            old = seen_hashes.get(asset["sha256"])
            require(old is None or old == identity, f"Duplicate image bytes: {old} and {identity}")
            seen_hashes[asset["sha256"]] = identity
        for other in previous:
            for a in ("original", "card"):
                for b in ("original", "card"):
                    require(hamming(row[a]["dHash"], other[b]["dHash"]) > 5, f"Possible perceptual duplicate: {identity} and {other['id']}")
        previous.append(row)

def s3_client():
    access = os.environ.get("E2J_KEY") or os.environ.get("IDRIVE_ACCESS_KEY")
    secret = os.environ.get("E2J_SECRET") or os.environ.get("IDRIVE_SECRET_KEY")
    require(access and secret, "Authorized IDrive operator credentials are not available")
    return boto3.client("s3", endpoint_url=ENDPOINT, region_name=REGION,
                        aws_access_key_id=access, aws_secret_access_key=secret,
                        config=Config(signature_version="s3v4", s3={"addressing_style": "path"}, retries={"max_attempts": 2}, connect_timeout=10, read_timeout=45))

def verify(s3, obj):
    r = s3.get_object(Bucket=BUCKET, Key=obj["key"])
    body = r["Body"]
    try:
        require(r["ContentLength"] == obj["bytes"], "IDrive readback length mismatch")
        require(r.get("ContentType", "").split(";")[0] == obj["contentType"], "IDrive readback content type mismatch")
        data = body.read(obj["bytes"] + 1)
        require(len(data) == obj["bytes"] and sha(data) == obj["sha256"], "IDrive readback checksum mismatch")
    finally:
        body.close()
    return True

def upload(s3, obj):
    try:
        s3.put_object(Bucket=BUCKET, Key=obj["key"], Body=obj["_data"],
                      ContentType=obj["contentType"], IfNoneMatch="*", ACL="private",
                      Metadata={"sha256": obj["sha256"]})
    except ClientError as e:
        # Existing immutable object may be reused only after full readback.
        if e.response.get("ResponseMetadata", {}).get("HTTPStatusCode") != 412:
            raise
    verify(s3, obj)
    return {k: v for k, v in obj.items() if k != "_data"} | {
        "storageProvider": "idrive_e2", "bucket": BUCKET, "verified": True,
        "verifiedAt": datetime.now(timezone.utc).isoformat()
    }

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--ledger", required=True, type=Path)
    p.add_argument("--approved", required=True, type=Path)
    p.add_argument("--staging", required=True, type=Path)
    p.add_argument("--receipt", required=True, type=Path)
    p.add_argument("--write", action="store_true")
    a = p.parse_args()
    ledger = json.loads(a.ledger.read_text())
    approved = json.loads(a.approved.read_text())
    rows = approved["records"]
    expected = {x["id"] for x in ledger["records"]}
    require(len(expected) == len(ledger["records"]) and len(expected) > 0, "Invalid ledger identity census")
    require(len(rows) == len(expected) and {x["id"] for x in rows} == expected,
            "Every directory record must have its own reviewed image; reconcile aliases first using a new verified ledger")
    known = {x["id"]: x for x in ledger["records"]}
    prepared = []
    for row in rows:
        identity = row["id"]
        require(all(row[k] == known[identity][k] for k in ("name", "slug", "emirate")), f"Identity mismatch: {identity}")
        prepared.append(prepare(row, a.staging.resolve()))
    validate_uniqueness(prepared)
    if not a.write:
        print(json.dumps({"dryRun": True, "records": len(prepared), "objects": 2 * len(prepared), "bucket": BUCKET,
                          "status": "no storage write"}, indent=2))
        return
    s3 = s3_client()
    require(not a.receipt.exists(), "Refusing to overwrite existing receipt")
    results = []
    for row in prepared:
        receipt = {k: v for k, v in row.items() if k not in ("original", "card")}
        receipt["original"] = upload(s3, row["original"])
        receipt["card"] = upload(s3, row["card"])
        results.append(receipt)
    # A failed batch may leave immutable staged objects. No publication receipt is
    # written unless every approved original and derivative passed real readback.
    a.receipt.parent.mkdir(parents=True, exist_ok=True)
    with a.receipt.open("x") as f:
        json.dump({"schema": "psr-community-idrive-receipt-v1", "complete": True,
                   "records": results}, f, indent=2)
    print(json.dumps({"complete": True, "records": len(results), "objects": len(results)*2,
                      "bucket": BUCKET, "receipt": str(a.receipt)}, indent=2))

if __name__ == "__main__":
    main()
