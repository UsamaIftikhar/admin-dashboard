import { db, users } from "@workspace/db";
import { hashPassword } from "../middlewares/auth";
import { randomUUID } from "crypto";

export async function seedAdmin() {
  const existing = await db.select().from(users).where(users.role.eq("admin"));
  if (existing.length > 0) {
    return;
  }

  const admin = {
    id: randomUUID(),
    name: "1JAMAI Admin",
    email: process.env.ADMIN_EMAIL ?? "admin@1jamaimusic.com",
    phone: process.env.ADMIN_PHONE ?? "+1 000 000 0000",
    passwordHash: hashPassword(process.env.ADMIN_PASSWORD ?? "admin123"),
    role: "admin",
  };

  await db.insert(users).values(admin);
  console.info("Created default admin user:", admin.email);
}
