import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { connectToDatabase } from "./config/db.js";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { verifyToken } from "./middleware/auth.js";
import { verifyEmailConnection } from "./utils/email.js";
import apiRouter from "./routes/api.routes.js";
import authRouter from "./routes/auth.js";
import adminRouter from "./routes/admin.routes.js";
import { paymentRouter } from "./routes/payment.js";
import { delhiveryRouter } from "./routes/delhivery.js";
import variantsRouter from "./routes/variants.js";
import favoritesRouter from "./routes/favorites.js";
import reviewsRouter from "./routes/reviews.js";
import walletRouter from "./routes/wallet.js";
import notificationsRouter from "./routes/notifications.js";
import couponsRouter from "./routes/coupons.js";
import supportRouter from "./routes/support.js";
import searchRouter from "./routes/search.js";

async function bootstrap() {
    await connectToDatabase();
    await verifyEmailConnection();

    const app = express();
    app.use(helmet());

    // Rate limiting - prevent brute force and DDoS attacks
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // Limit each IP to 100 requests per windowMs
        message: "Too many requests from this IP, please try again later.",
        standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    });

    // Apply rate limiter to all API routes
    app.use("/api", limiter);

    // Stricter rate limiting for auth endpoints
    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 10, // Limit each IP to 10 requests per windowMs
        message: "Too many authentication attempts, please try again later.",
    });
    app.use("/api/auth/login", authLimiter);
    app.use("/api/auth/register", authLimiter);

    const allowedOrigins = new Set([
        env.CLIENT_ORIGIN,
        "https://wholsie.vercel.app",
        "https://wholesiii.com",
    ]);

    app.use(cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true); // Allow non-browser requests
            if (allowedOrigins.has(origin)) return callback(null, true);
            callback(new Error("Not allowed by CORS"));
        },
        credentials: true,
    }));
    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ extended: true, limit: "10mb" }));
    app.use(cookieParser());
    app.use(morgan("tiny"));

    // Attach decoded user (if any) for downstream auth guards
    app.use(verifyToken);

    // Health check endpoint (no auth required)
    app.get('/health', (req, res) => {
        res.json({ status: 'ok' });
    });

    // API routes - Core public/user routes
    app.use('/api', apiRouter);
    app.use('/api', authRouter);
    app.use('/api', paymentRouter);

    // Feature-specific routes
    app.use('/api/delhivery', delhiveryRouter);
    app.use('/api/variants', variantsRouter);
    app.use('/api/favorites', favoritesRouter);
    app.use('/api/reviews', reviewsRouter);
    app.use('/api/wallet', walletRouter);
    app.use('/api/notifications', notificationsRouter);
    app.use('/api/coupons', couponsRouter);
    app.use('/api/support', supportRouter);
    app.use('/api/search', searchRouter);

    // Admin routes
    app.use('/api/admin', adminRouter);

    // 404 handler
    app.use((req, res) => {
        res.status(404).json({ error: 'Route not found' });
    });

    // Error handler
    app.use(errorHandler);

    // Start server
    const PORT = env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📍 Environment: ${env.NODE_ENV}`);
    });
}

bootstrap().catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Failed to start server", err);
    process.exit(1);
});
