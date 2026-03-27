import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { hashSync } from "bcryptjs";
import { eq } from "drizzle-orm";
import { users, channels } from "./schema";

async function seed() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const DOMAIN = process.env.DOMAIN || process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "") || "localhost";
  const ADMIN_EMAIL = `admin@${DOMAIN}`;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || generatePassword();

  const sql = postgres(DATABASE_URL);
  const db = drizzle(sql);

  console.log("Seeding database (idempotent)...\n");

  // ============================================================
  // 1. ADMIN USER (upsert)
  // ============================================================
  console.log("Admin user...");
  const [existingAdmin] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "admin"))
    .limit(1);

  if (existingAdmin) {
    console.log("  Admin already exists, skipping");
  } else {
    const [admin] = await db
      .insert(users)
      .values({
        email: ADMIN_EMAIL,
        username: "admin",
        passwordHash: hashSync(ADMIN_PASSWORD, 12),
        role: "admin",
        status: "verified",
        displayName: "System Admin",
        onboardingCompleted: true,
        currency: "usd",
      })
      .returning();
    console.log(`  Created: ${admin.email}`);
    console.log(`  Password: ${ADMIN_PASSWORD}`);
    console.log(`  ⚠ Save this password — it will not be shown again.`);
  }

  // ============================================================
  // 2. STANDARD CHANNELS (insert if missing)
  // ============================================================
  console.log("\nStandard channels...");

  const standardChannels = [
    // Special channels
    { name: "announcements", nameCn: "公告", slug: "announcements", type: "special" as const, description: "System-wide updates, read-only for creators", descriptionCn: "系统公告，创作者只读", isFixed: true, sortOrder: 0 },
    { name: "beginner-training", nameCn: "新手训练", slug: "beginner-training", type: "special" as const, description: "New user training and orientation", descriptionCn: "新用户培训和入门", isFixed: true, sortOrder: 1 },
    { name: "appeals", nameCn: "申诉", slug: "appeals", type: "special" as const, description: "Dispute resolution for rejected tasks", descriptionCn: "被拒任务的争议解决", isFixed: true, sortOrder: 2 },
    { name: "payment-issues", nameCn: "支付问题", slug: "payment-issues", type: "special" as const, description: "Private payment discussions - only visible to supermods and admins", descriptionCn: "私密支付讨论 - 仅超级管理员和管理员可见", isFixed: true, sortOrder: 3 },
    // Discussion channels
    { name: "general", nameCn: "综合讨论", slug: "general", type: "discussion" as const, description: "Open discussion for all users", descriptionCn: "所有用户的开放讨论", sortOrder: 20 },
    { name: "feedback", nameCn: "反馈", slug: "feedback", type: "discussion" as const, description: "Product feedback and suggestions", descriptionCn: "产品反馈和建议", sortOrder: 21 },
    { name: "tips", nameCn: "技巧分享", slug: "tips", type: "discussion" as const, description: "Best practices and creator tips", descriptionCn: "最佳实践和创作者技巧", sortOrder: 22 },
    { name: "off-topic", nameCn: "闲聊", slug: "off-topic", type: "discussion" as const, description: "Casual chat", descriptionCn: "休闲聊天", sortOrder: 23 },
  ];

  const existing = await db.select({ slug: channels.slug }).from(channels);
  const existingSlugs = new Set(existing.map((c) => c.slug));
  const toInsert = standardChannels.filter((c) => !existingSlugs.has(c.slug));

  if (toInsert.length > 0) {
    const inserted = await db.insert(channels).values(toInsert).returning();
    for (const ch of inserted) {
      console.log(`  Created: #${ch.name} (${ch.type})`);
    }
  } else {
    console.log("  All standard channels already exist.");
  }

  console.log("\nSeed completed successfully!");
}

function generatePassword(): string {
  const chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*";
  const bytes = require("crypto").randomBytes(20);
  return Array.from(bytes as Uint8Array).map((b) => chars[b % chars.length]).join("");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
