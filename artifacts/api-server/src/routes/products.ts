import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, products } from "@workspace/db";

const router = Router();

router.get("/", async (_req, res) => {
  const productList = await db.select().from(products);
  res.json(productList);
});

router.get("/:id", async (req, res) => {
  const productId = req.params.id;
  const result = await db.select().from(products).where(eq(products.id, productId));
  const product = result[0];

  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  res.json(product);
});

export default router;
