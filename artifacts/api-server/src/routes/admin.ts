import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, products, orders, orderItems } from "@workspace/db";
import { authenticate, requireAdmin, AuthRequest } from "../middlewares/auth";

const router = Router();
router.use(authenticate, requireAdmin);

router.get("/products", async (_req, res) => {
  const items = await db.select().from(products).orderBy(products.createdAt.desc());
  res.json(items);
});

router.post("/products", async (req: AuthRequest, res) => {
  const { id, name, artist, artistSlug, category, price, originalPrice, image, imageHover, description, badge, inStock, sizes } = req.body;
  if (!id || !name || !artist || !artistSlug || !category || price == null || !image || !imageHover || !description || !sizes) {
    return res.status(400).json({ error: "Missing required product fields" });
  }

  const item = { id, name, artist, artistSlug, category, price: Number(price), originalPrice: originalPrice === null ? null : Number(originalPrice), image, imageHover, description, badge: badge ?? null, inStock: Boolean(inStock), sizes };
  await db.insert(products).values(item);
  res.status(201).json(item);
});

router.put("/products/:id", async (req: AuthRequest, res) => {
  const id = req.params.id;
  const { name, artist, artistSlug, category, price, originalPrice, image, imageHover, description, badge, inStock, sizes } = req.body;
  await db.update(products).set({
    name,
    artist,
    artistSlug,
    category,
    price: price == null ? undefined : Number(price),
    originalPrice: originalPrice == null ? null : Number(originalPrice),
    image,
    imageHover,
    description,
    badge: badge ?? null,
    inStock: inStock == null ? undefined : Boolean(inStock),
    sizes,
  }).where(eq(products.id, id));

  const updated = await db.select().from(products).where(eq(products.id, id));
  if (updated.length === 0) return res.status(404).json({ error: "Product not found" });
  res.json(updated[0]);
});

router.delete("/products/:id", async (req: AuthRequest, res) => {
  const id = req.params.id;
  await db.delete(products).where(eq(products.id, id));
  res.status(204).end();
});

router.get("/orders", async (_req, res) => {
  const orderRows = await db.select().from(orders).orderBy(orders.createdAt.desc());
  const payload = await Promise.all(
    orderRows.map(async (order) => ({
      ...order,
      items: await db.select().from(orderItems).where(eq(orderItems.orderId, order.id)),
    })),
  );
  res.json(payload);
});

export default router;
