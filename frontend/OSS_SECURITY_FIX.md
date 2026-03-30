# OSS Security Fix — V1 → V4 Signature Upgrade

## What was the problem?

All presigned OSS URLs (uploads and downloads) used **V1 signatures**, which exposed your permanent `OSSAccessKeyId` as a naked query parameter in every URL visible in the browser console/network tab:

```
https://hontenthub.oss-cn-beijing.aliyuncs.com/...?OSSAccessKeyId=LTAI5tCaNr43fPyPZvpfgzGm&Expires=...&Signature=...
```

This is a security risk — the permanent AccessKeyId was plainly visible to anyone inspecting browser network traffic, and the signature used the weaker HMAC-SHA1 algorithm.

## How it was fixed

Replaced the manual HMAC-SHA1 (V1) signature code in `src/lib/oss.ts` with a custom **V4 signature** implementation (`OSS4-HMAC-SHA256`), using only Node's built-in `crypto` module — zero external dependencies.

The V4 implementation follows the exact same algorithm as the official `ali-oss` SDK's `signatureUrlV4`, but without pulling in the SDK (which bundles `urllib` → `proxy-agent` and breaks Next.js bundling).

### Files changed

| File | Change |
|---|---|
| `src/lib/oss.ts` | Rewrote signature generation from V1 (HMAC-SHA1) to V4 (HMAC-SHA256) |
| `src/__tests__/lib/oss.test.ts` | Updated assertions for V4 query parameters |

### What did NOT change

- **API route files** (`presign/route.ts`, `signed-url/route.ts`) — same function calls, same signatures
- **Frontend components** (`FileUpload.tsx`, `SignedMedia.tsx`) — zero changes for signing, they call the same API endpoints
- **Upload/download flow** — identical behavior, just better signatures under the hood
- **Local upload fallback** — untouched
- **All other features** (tasks, attempts, training, reviews, appeals) — no changes
- **No new dependencies** — uses only Node.js built-in `crypto`

## What to expect in the browser console

**Before (V1 — insecure):**
```
?OSSAccessKeyId=LTAI5tCaNr43fPyPZvpfgzGm&Expires=1774853051&Signature=C4qqTbi1...
```

**After (V4 — secure):**
```
?x-oss-credential=LTAI5t.../20260330/cn-beijing/oss/aliyun_v4_request&x-oss-date=20260330T...&x-oss-expires=600&x-oss-signature-version=OSS4-HMAC-SHA256&x-oss-signature=<hex-hash>
```

Key differences:
- **No more naked `OSSAccessKeyId=`** parameter
- Credential is **scoped** to a specific date + region (can't be reused broadly)
- Signature algorithm upgraded from HMAC-SHA1 → **HMAC-SHA256**
- The AccessKeyId appears only inside the scoped `x-oss-credential` value, not as a standalone key

---

# Upload Error Messages Fix (#48)

## What was the problem?

When file uploads failed, the user saw no specific error message — failures were silently swallowed and fell back to local upload. If local also failed, only a generic "Upload failed" appeared.

## How it was fixed

Updated `FileUpload.tsx` to surface specific error messages from the server:

- **Validation errors** (400 — wrong file type, too large) → show the server's error message directly, **no silent fallback**
- **Auth errors** (401) → show immediately, no fallback
- **Infrastructure errors** (503 — OSS not configured, 5xx) → still fall back to local upload
- **Network errors** → show localized "Network error, please try again" message
- **Local upload failures** → show the server's specific error message

The change is in `src/components/ui/FileUpload.tsx` only — applies app-wide since all upload flows use this component.
