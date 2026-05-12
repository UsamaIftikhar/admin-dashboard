import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import productsRouter from "./products";
import addressesRouter from "./addresses";
import ordersRouter from "./orders";
import paymentRouter from "./payment";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use("/", healthRouter);
router.use("/auth", authRouter);
router.use("/products", productsRouter);
router.use("/addresses", addressesRouter);
router.use("/orders", ordersRouter);
router.use("/payment", paymentRouter);
router.use("/admin", adminRouter);

export default router;
