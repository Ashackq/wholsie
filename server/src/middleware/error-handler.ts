import type { NextFunction, Request, Response } from "express";
import multer from "multer";

// Basic error middleware; expand with logging/metrics as needed
export function errorHandler(
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
) {
    // eslint-disable-next-line no-console
    console.error(err);

    if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: err.message });
    }

    if (err instanceof Error && (err.message.includes("allowed") || err.message.includes("Only "))) {
        return res.status(400).json({ error: err.message });
    }

    return res.status(500).json({ error: "Unexpected error" });
}
