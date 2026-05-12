import express, { Router, type Request, type Response } from "express";
import { randomUUID } from "crypto";
import { eq, inArray } from "drizzle-orm";
import Stripe from "stripe";
import { db, orders, orderItems, products } from "@workspace/db";
import { stripe, STRIPE_WEBHOOK_SECRET } from "../lib/stripe";
import { authenticate, AuthRequest } from "../middlewares/auth";

const router = Router();

router.post("/create-payment-intent", authenticate, async (req: AuthRequest, res) => {
  const userId = req.auth?.sub;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { items, shippingAddress } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Cart items are required" });
  }

  const requiredKeys = ["firstName", "lastName", "address", "city", "zip", "country"];
  if (!shippingAddress || requiredKeys.some((key) => !shippingAddress[key])) {
    return res.status(400).json({ error: "Valid shipping address is required" });
  }

  const productIds = [...new Set(items.map((item: any) => item.productId))];
  const dbProducts = await db.select().from(products).where(inArray(products.id, productIds));

  if (dbProducts.length !== productIds.length) {
    return res.status(400).json({ error: "Some cart items are invalid" });
  }

  const lineItems = items.map((item: any) => {
    const product = dbProducts.find((p) => p.id === item.productId);
    if (!product) throw new Error("Invalid cart item");
    return {
      productId: product.id,
      name: product.name,
      artist: product.artist,
      image: product.image,
      size: item.size || "One Size",
      quantity: Number(item.quantity) || 1,
      priceCents: product.price * 100,
      amountCents: product.price * 100 * (Number(item.quantity) || 1),
    };
  });

  const subtotalCents = lineItems.reduce((sum, item) => sum + item.amountCents, 0);
  const shippingCents = 1200;
  const taxCents = Math.round(subtotalCents * 0.08);
  const totalCents = subtotalCents + shippingCents + taxCents;

  const orderId = randomUUID();
  const paymentIntent = await stripe.paymentIntents.create({
    amount: totalCents,
    currency: "usd",
    automatic_payment_methods: { enabled: true },
    metadata: {
      orderId,
      userId,
    },
    description: `1 Jamaica Music order ${orderId}`,
  });

  await db.insert(orders).values({
    id: orderId,
    userId,
    status: "Pending",
    subtotalCents,
    shippingCents,
    taxCents,
    totalCents,
    stripePaymentIntentId: paymentIntent.id,
    firstName: shippingAddress.firstName,
    lastName: shippingAddress.lastName,
    address: shippingAddress.address,
    city: shippingAddress.city,
    state: shippingAddress.state ?? "",
    zip: shippingAddress.zip,
    country: shippingAddress.country,
  });

  await Promise.all(
    lineItems.map((item) =>
      db.insert(orderItems).values({
        id: randomUUID(),
        orderId,
        productId: item.productId,
        name: item.name,
        artist: item.artist,
        price: item.priceCents,
        image: item.image,
        size: item.size,
        quantity: item.quantity,
      }),
    ),
  );

  res.json({ clientSecret: paymentIntent.client_secret, orderId });
});

router.post("/confirm", authenticate, async (req: AuthRequest, res) => {
  const { paymentIntentId, orderId } = req.body;
  if (!paymentIntentId || !orderId) {
    return res.status(400).json({ error: "Missing paymentIntentId or orderId" });
  }

  const result = await db.select().from(orders).where(eq(orders.id, orderId));
  const order = result[0];
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (order.userId !== req.auth?.sub && req.auth?.role !== "admin") {
    return res.status(403).json({ error: "Access denied" });
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (paymentIntent.status !== "succeeded") {
    return res.status(400).json({ error: "Payment has not succeeded yet" });
  }

  await db.update(orders).set({ status: "Processing" }).where(eq(orders.id, orderId));
  res.json({ success: true });
});

router.post("/webhook", express.raw({ type: "application/json" }), async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"];
  if (!sig || typeof sig !== "string") {
    return res.status(400).send("Missing Stripe signature header");
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    return res.status(400).send(`Webhook signature verification failed: ${error}`);
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const orderId = paymentIntent.metadata.orderId as string;
    if (orderId) {
      await db.update(orders).set({ status: "Processing" }).where(eq(orders.id, orderId));
    }
  }

  res.status(200).json({ received: true });
});

export default router;
