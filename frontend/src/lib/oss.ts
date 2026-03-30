import crypto from "crypto";

const OSS_REGION = process.env.OSS_REGION || "oss-cn-beijing";
const OSS_BUCKET = process.env.OSS_BUCKET || "";
const OSS_ACCESS_KEY_ID = process.env.OSS_ACCESS_KEY_ID || "";
const OSS_ACCESS_KEY_SECRET = process.env.OSS_ACCESS_KEY_SECRET || "";
const OSS_BUCKET_DOMAIN =
  process.env.OSS_BUCKET_DOMAIN ||
  `${OSS_BUCKET}.${OSS_REGION}.aliyuncs.com`;

/** Region without the "oss-" prefix, used in V4 credential scopes. */
const SIGNING_REGION = OSS_REGION.replace(/^oss-/, "");

export function isOssConfigured(): boolean {
  return !!(OSS_BUCKET && OSS_ACCESS_KEY_ID && OSS_ACCESS_KEY_SECRET);
}

/* ── V4 Signature Internals ─────────────────────────────────────────────── */

/** URI-encode per OSS V4 spec (like encodeURIComponent but also encodes !'()*). */
function ossEncode(str: string): string {
  return encodeURIComponent(String(str)).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

/**
 * Derive the V4 signing key via an HMAC-SHA256 chain.
 *  DateKey          = HMAC("aliyun_v4" + secret, dateStr)
 *  DateRegionKey    = HMAC(DateKey, region)
 *  DateRegionSvcKey = HMAC(DateRegionKey, "oss")
 *  SigningKey       = HMAC(DateRegionSvcKey, "aliyun_v4_request")
 */
function deriveSigningKey(dateStr: string): Buffer {
  const kDate = crypto
    .createHmac("sha256", `aliyun_v4${OSS_ACCESS_KEY_SECRET}`)
    .update(dateStr)
    .digest();
  const kRegion = crypto.createHmac("sha256", kDate).update(SIGNING_REGION).digest();
  const kService = crypto.createHmac("sha256", kRegion).update("oss").digest();
  return crypto.createHmac("sha256", kService).update("aliyun_v4_request").digest();
}

/**
 * Build a V4 presigned URL for a given HTTP method.
 * Follows the exact same algorithm as ali-oss SDK's signatureUrlV4.
 */
function buildV4PresignedUrl(
  method: "GET" | "PUT",
  objectKey: string,
  expiresInSeconds: number,
  headers: Record<string, string> = {}
): string {
  const now = new Date();
  const dateTimeStr = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const dateStr = dateTimeStr.slice(0, 8); // YYYYMMDD

  const scope = `${dateStr}/${SIGNING_REGION}/oss/aliyun_v4_request`;
  const credential = `${OSS_ACCESS_KEY_ID}/${scope}`;

  // Query parameters (everything except x-oss-signature)
  const queries: Record<string, string> = {
    "x-oss-credential": credential,
    "x-oss-date": dateTimeStr,
    "x-oss-expires": String(expiresInSeconds),
    "x-oss-signature-version": "OSS4-HMAC-SHA256",
  };

  // ── Canonical Request ─────────────────────────────────────────────────

  // Line 1: HTTP method
  const httpMethod = method;

  // Line 2: canonical URI (always includes bucket per OSS V4 spec)
  const canonicalUri = `/${ossEncode(OSS_BUCKET)}/${ossEncode(objectKey).replace(/%2F/g, "/")}`;

  // Line 3: canonical query string (sorted, encoded, no x-oss-signature)
  const canonicalQueryString = Object.keys(queries)
    .sort()
    .map((k) => `${ossEncode(k)}=${ossEncode(queries[k])}`)
    .join("&");

  // Line 4: canonical headers (content-type, content-md5, x-oss-* from provided headers)
  const lowerHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    lowerHeaders[k.toLowerCase()] = v.trim();
  }
  const headersToSign = Object.keys(lowerHeaders)
    .filter(
      (k) => k === "content-type" || k === "content-md5" || k.startsWith("x-oss-")
    )
    .sort();
  const canonicalHeaders = headersToSign.map((k) => `${k}:${lowerHeaders[k]}\n`).join("");

  // Line 5: additional headers (empty — we don't add extra headers beyond content-type/x-oss-*)
  const additionalHeadersStr = "";

  // Line 6: hashed payload — always UNSIGNED-PAYLOAD for presigned URLs
  const hashedPayload = "UNSIGNED-PAYLOAD";

  const canonicalRequest = [
    httpMethod,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    additionalHeadersStr,
    hashedPayload,
  ].join("\n");

  // ── String to Sign ────────────────────────────────────────────────────

  const canonicalRequestHash = crypto
    .createHash("sha256")
    .update(canonicalRequest)
    .digest("hex");

  const stringToSign = `OSS4-HMAC-SHA256\n${dateTimeStr}\n${scope}\n${canonicalRequestHash}`;

  // ── Signature ─────────────────────────────────────────────────────────

  const signingKey = deriveSigningKey(dateStr);
  const signature = crypto
    .createHmac("sha256", signingKey)
    .update(stringToSign)
    .digest("hex");

  // ── Final URL ─────────────────────────────────────────────────────────

  queries["x-oss-signature"] = signature;
  const finalQs = Object.keys(queries)
    .map((k) => `${ossEncode(k)}=${ossEncode(queries[k])}`)
    .join("&");

  const encodedKey = ossEncode(objectKey).replace(/%2F/g, "/");
  return `https://${OSS_BUCKET_DOMAIN}/${encodedKey}?${finalQs}`;
}

/* ── Public API (same signatures as before) ──────────────────────────── */

/**
 * Generate a presigned PUT URL for direct browser-to-OSS uploads.
 * Uses OSS V4 signature (HMAC-SHA256, scoped to date+region).
 * The AccessKeyId is NOT exposed as a naked `OSSAccessKeyId=` parameter.
 */
export function generatePresignedPutUrl(
  objectKey: string,
  contentType: string,
  expiresInSeconds = 600
): string {
  return buildV4PresignedUrl("PUT", objectKey, expiresInSeconds, {
    "Content-Type": contentType,
  });
}

/**
 * Generate a presigned GET URL for private file access.
 * Uses OSS V4 signature (HMAC-SHA256, scoped to date+region).
 */
export function generatePresignedGetUrl(
  objectKey: string,
  expiresInSeconds = 3600
): string {
  return buildV4PresignedUrl("GET", objectKey, expiresInSeconds);
}

/**
 * Get the OSS object key from a full OSS URL.
 */
export function getObjectKeyFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    return u.pathname.slice(1); // Remove leading /
  } catch {
    return null;
  }
}
