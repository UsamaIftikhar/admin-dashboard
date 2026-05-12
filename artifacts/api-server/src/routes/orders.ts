import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, orders, orderItems } from "@workspace/db";
import { authenticate, requireAdmin, AuthRequest } from "../middlewares/auth";

const router = Router();

router.get("/", authenticate, async (req: AuthRequest, res) => {
  const auth = req.auth;
  if (!auth) return res.status(401).json({ error: "Unauthorized" });

  const baseOrders = auth.role === "admin"
    ? await db.select().from(orders).orderBy(orders.createdAt.desc())
    : await db.select().from(orders).where(eq(orders.userId, auth.sub)).orderBy(orders.createdAt.desc());

  const results = await Promise.all(
    baseOrders.map(async (order) => {
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      return { ...order, items };
    }),
  );

  res.json(results);
});

router.get("/:id", authenticate, async (req: AuthRequest, res) => {
  const auth = req.auth;
  if (!auth) return res.status(401).json({ error: "Unauthorized" });

  const orderId = req.params.id;
  const result = await db.select().from(orders).where(eq(orders.id, orderId));
  const order = result[0];
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (auth.role !== "admin" && order.userId !== auth.sub) {
    return res.status(403).json({ error: "Access denied" });
  }

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  res.json({ ...order, items });
});

router.put("/:id/status", authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const orderId = req.params.id;
  const { status } = req.body;
  const allowedStatuses = ["Processing", "Shipped", "Delivered", "Pending"];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid order status" });
  }

  const result = await db.select().from(orders).where(eq(orders.id, orderId));
  if (result.length === 0) return res.status(404).json({ error: "Order not found" });

  await db.update(orders).set({ status }).where(eq(orders.id, orderId));
  const updated = await db.select().from(orders).where(eq(orders.id, orderId));
  res.json(updated[0]);
});

export default router;
