import { Router } from "express";
import { healthRouter } from "./health.js";
import adminRouter from "./admin.routes.js";
import apiRouter from "./api.routes.js";

export const mainRouter = Router();

// Health check
mainRouter.use(healthRouter);

// Main API routes (consolidates auth, products, cart, orders, etc.)
mainRouter.use("/api", apiRouter);

// Admin routes
mainRouter.use("/api/admin", adminRouter);
