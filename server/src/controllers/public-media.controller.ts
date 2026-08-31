import { Request, Response, NextFunction } from "express";
import { HomepageMedia } from "../models/HomepageMedia.js";

/**
 * GET /api/media
 * Returns all active HomepageMedia items sorted by `order` ASC.
 * Used by the VideoGifSection component on the homepage.
 * Returns an empty array (not 404) when no active items exist.
 */
export async function getPublicMedia(req: Request, res: Response, next: NextFunction) {
    try {
        const items = await HomepageMedia.find({ isActive: true })
            .sort({ order: 1, createdAt: 1 })
            .select("-__v");

        res.json({
            success: true,
            data: items,
        });
    } catch (error) {
        next(error);
    }
}
