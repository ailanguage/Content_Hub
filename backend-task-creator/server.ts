import "dotenv/config";
import express from "express";
import cors from "cors";
import crypto from "crypto";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

// Serve Vue SPA static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "dist")));
}

const PORT = 3003;

const OSS_REGION = process.env.OSS_REGION || "oss-cn-beijing";
const OSS_BUCKET = process.env.OSS_BUCKET || "";
const OSS_ACCESS_KEY_ID = process.env.OSS_ACCESS_KEY_ID || "";
const OSS_ACCESS_KEY_SECRET = process.env.OSS_ACCESS_KEY_SECRET || "";
const OSS_BUCKET_DOMAIN = `${OSS_BUCKET}.${OSS_REGION}.aliyuncs.com`;

/**
 * POST /api/presign
 * Generates a presigned PUT URL for uploading a file to OSS.
 * Body: { fileName: string, contentType: string }
 */
app.post("/api/presign", (req, res) => {
  const {fileName, contentType} = req.body;

  if (!fileName || !contentType) {
    return res.status(400).json({error: "fileName and contentType are required"});
  }

  if (!OSS_BUCKET || !OSS_ACCESS_KEY_ID || !OSS_ACCESS_KEY_SECRET) {
    return res.status(503).json({error: "OSS credentials not configured. Check your .env file."});
  }

  const ext = fileName.split(".").pop() || "bin";
  const uniqueId = crypto.randomBytes(8).toString("hex");
  const objectKey = `task-attachments/backend/${uniqueId}.${ext}`;

  const expires = Math.floor(Date.now() / 1000) + 600; // 10 minutes
  const stringToSign = `PUT\n\n${contentType}\n${expires}\n/${OSS_BUCKET}/${objectKey}`;

  const signature = crypto.createHmac("sha1", OSS_ACCESS_KEY_SECRET).update(stringToSign).digest("base64");

  const presignedUrl = `https://${OSS_BUCKET_DOMAIN}/${objectKey}?OSSAccessKeyId=${encodeURIComponent(OSS_ACCESS_KEY_ID)}&Expires=${expires}&Signature=${encodeURIComponent(signature)}`;
  const publicUrl = `https://${OSS_BUCKET_DOMAIN}/${objectKey}`;

  res.json({presignedUrl, objectKey, publicUrl});
});

// SPA fallback — serve index.html for non-API routes in production
if (process.env.NODE_ENV === "production") {
  app.get("*", (_req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`[backend-task-creator] Server running on http://localhost:${PORT}`);
  console.log(`[backend-task-creator] OSS bucket: ${OSS_BUCKET || "(not configured)"}`);
  console.log(`[backend-task-creator] Frontend: ${process.env.FRONTEND_URL || "http://localhost:3000"}`);
});
