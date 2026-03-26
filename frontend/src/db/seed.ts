import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { hashSync } from "bcryptjs";
import { eq } from "drizzle-orm";
import { users } from "./schema";

async function seed() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

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
    .where(eq(users.email, "admin@creatorhub.local"))
    .limit(1);

  if (existingAdmin) {
    console.log("  Already exists, skipping");
  } else {
    const [admin] = await db
      .insert(users)
      .values({
        email: "admin@creatorhub.local",
        username: "admin",
        passwordHash: hashSync("admin123", 12),
        role: "admin",
        status: "verified",
        displayName: "System Admin",
        onboardingCompleted: true,
        currency: "usd",
      })
      .returning();
    console.log(`  Created: ${admin.email} (password: admin123)`);
  }

  console.log("\nSeed completed successfully!");
  console.log("\n--- Login credentials ---");
  console.log("Admin: admin@creatorhub.local / admin123");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
