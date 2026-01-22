import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

interface JWTPayload {
    userId: string;
    email: string;
    role: string;
    id?: string; // Add id field for convenience
}

declare global {
    namespace Express {
        interface Request {
            userId?: string;
            userRole?: string;
            user?: JWTPayload;
        }
    }
}

export function verifyToken(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies.token || req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
        return next(); // Allow unauthenticated access; routes can require auth
    }

    try {
        const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
        req.userId = decoded.userId;
        req.userRole = decoded.role;
        req.user = { ...decoded, id: decoded.userId }; // Add id for consistency
    } catch (err) {
        // Invalid token; continue unauthenticated
    }

    next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    if (!req.userId) {
        return res.status(401).json({ error: "Authentication required" });
    }
    next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
    if (!req.userId || req.userRole !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
    }
    next();
}

export function generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "7d" });
}
