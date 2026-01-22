import type { NextFunction, Request, Response } from "express";

// Basic error middleware; expand with logging/metrics as needed
export function errorHandler(
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: "Unexpected error" });
}
