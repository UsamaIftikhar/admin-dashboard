import { Router } from "express";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db, addresses } from "@workspace/db";
import { authenticate, AuthRequest } from "../middlewares/auth";

const router = Router();
router.use(authenticate);

router.get("/", async (req: AuthRequest, res) => {
  const userId = req.auth?.sub;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const rows = await db.select().from(addresses).where(eq(addresses.userId, userId));
  res.json(rows);
});

router.post("/", async (req: AuthRequest, res) => {
  const userId = req.auth?.sub;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { label, firstName, lastName, address, city, state, zip, country, isDefault } = req.body;
  if (!label || !firstName || !lastName || !address || !city || !zip || !country) {
    return res.status(400).json({ error: "Missing required address fields" });
  }

  if (isDefault) {
    await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, userId));
  }

  const record = {
    id: randomUUID(),
    userId,
    label,
    firstName,
    lastName,
    address,
    city,
    state: state ?? "",
    zip,
    country,
    isDefault: Boolean(isDefault),
  };

  await db.insert(addresses).values(record);
  res.status(201).json(record);
});

router.put("/:id", async (req: AuthRequest, res) => {
  const userId = req.auth?.sub;
  const id = req.params.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { label, firstName, lastName, address, city, state, zip, country, isDefault } = req.body;
  if (!label || !firstName || !lastName || !address || !city || !zip || !country) {
    return res.status(400).json({ error: "Missing required address fields" });
  }

  const target = await db.select().from(addresses).where(eq(addresses.id, id)).limit(1);
  if (target.length === 0 || target[0].userId !== userId) {
    return res.status(404).json({ error: "Address not found" });
  }

  if (isDefault) {
    await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, userId));
  }

  await db.update(addresses).set({
    label,
    firstName,
    lastName,
    address,
    city,
    state: state ?? "",
    zip,
    country,
    isDefault: Boolean(isDefault),
  }).where(eq(addresses.id, id));

  const updated = await db.select().from(addresses).where(eq(addresses.id, id));
  res.json(updated[0]);
});

router.delete("/:id", async (req: AuthRequest, res) => {
  const userId = req.auth?.sub;
  const id = req.params.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const target = await db.select().from(addresses).where(eq(addresses.id, id)).limit(1);
  if (target.length === 0 || target[0].userId !== userId) {
    return res.status(404).json({ error: "Address not found" });
  }

  await db.delete(addresses).where(eq(addresses.id, id));
  res.status(204).end();
});

export default router;
