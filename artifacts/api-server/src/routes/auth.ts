import { Router } from "express";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db, users } from "@workspace/db";
import { hashPassword, signJwt, authenticate, AuthRequest } from "../middlewares/auth";

const router = Router();

router.post("/signup", async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !phone || !password) {
    return res.status(400).json({ error: "Missing required signup fields" });
  }

  const existingUsers = await db.select().from(users).where(eq(users.email, email));
  if (existingUsers.length > 0) {
    return res.status(409).json({ error: "An account with that email already exists." });
  }

  const user = {
    id: randomUUID(),
    name,
    email,
    phone,
    passwordHash: hashPassword(password),
    role: "user",
    createdAt: new Date().toISOString(),
  };

  await db.insert(users).values(user);

  const token = signJwt({ sub: user.id, email: user.email, role: user.role });
  res.status(201).json({
    user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, createdAt: user.createdAt },
    token,
  });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Missing email or password" });
  }

  const results = await db.select().from(users).where(eq(users.email, email));
  const user = results[0];
  if (!user || user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signJwt({ sub: user.id, email: user.email, role: user.role });
  res.json({ user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, createdAt: user.createdAt }, token });
});

router.get("/me", authenticate, async (req: AuthRequest, res) => {
  const userId = req.auth?.sub;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const results = await db.select().from(users).where(eq(users.id, userId));
  const user = results[0];
  if (!user) return res.status(404).json({ error: "User not found" });

  res.json({ id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, createdAt: user.createdAt });
});

router.put("/me", authenticate, async (req: AuthRequest, res) => {
  const userId = req.auth?.sub;
  const { name, phone } = req.body;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!name && !phone) return res.status(400).json({ error: "Missing update fields" });

  await db.update(users).set({ name: name ?? undefined, phone: phone ?? undefined }).where(eq(users.id, userId));
  const results = await db.select().from(users).where(eq(users.id, userId));
  const user = results[0];
  if (!user) return res.status(404).json({ error: "User not found" });

  res.json({ id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, createdAt: user.createdAt });
});

router.post("/me/change-password", authenticate, async (req: AuthRequest, res) => {
  const userId = req.auth?.sub;
  const { currentPassword, newPassword } = req.body;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!currentPassword || !newPassword) return res.status(400).json({ error: "Missing password fields" });

  const results = await db.select().from(users).where(eq(users.id, userId));
  const user = results[0];
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.passwordHash !== hashPassword(currentPassword)) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }

  await db.update(users).set({ passwordHash: hashPassword(newPassword) }).where(eq(users.id, userId));
  res.json({ success: true });
});

export default router;
