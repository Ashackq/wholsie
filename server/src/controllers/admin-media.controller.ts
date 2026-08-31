import { Request, Response, NextFunction } from "express";
import { HomepageMedia } from "../models/HomepageMedia.js";
import fs from "fs";
import path from "path";

// ── Helper: delete uploaded file from disk safely ─────────────────────────────
function deleteDiskFile(relativePath?: string) {
    if (!relativePath) return;
    try {
        // relativePath is like /assets/uploaded/media/file-xxx.mp4
        // Resolve from project public/ dir (CWD is server/, so go up one level)
        const absPath = path.join(process.cwd(), "..", "public", relativePath);
        if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
    } catch {
        // Non-fatal — log but don't crash
        console.warn("[admin-media] Could not delete file:", relativePath);
    }
}

/**
 * GET /api/admin/media
 * List all media items (paginated, optional isActive filter).
 */
export async function getMediaItems(req: Request, res: Response, next: NextFunction) {
    try {
        const { limit = 50, offset = 0, isActive } = req.query;

        const filter: any = {};
        if (isActive !== undefined) filter.isActive = isActive === "true";

        const items = await HomepageMedia.find(filter)
            .sort({ order: 1, createdAt: -1 })
            .limit(parseInt(limit as string))
            .skip(parseInt(offset as string));

        const total = await HomepageMedia.countDocuments(filter);

        res.json({
            success: true,
            data: items,
            pagination: {
                limit: parseInt(limit as string),
                offset: parseInt(offset as string),
                total,
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/admin/media/:mediaId
 * Get a single media item.
 */
export async function getMediaItem(req: Request, res: Response, next: NextFunction) {
    try {
        const item = await HomepageMedia.findById(req.params.mediaId);
        if (!item) return res.status(404).json({ error: "Media item not found" });
        res.json({ success: true, data: item });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/admin/media
 * Create a new media item.
 *
 * Handles multipart/form-data (multer processes files before this handler runs):
 *   - req.files.file[0]  → the media file (video/GIF/image)
 *   - req.files.thumbnail[0] → optional poster/thumbnail
 * For embed types (youtube/instagram) the embedUrl comes from req.body.
 */
export async function createMediaItem(req: Request, res: Response, next: NextFunction) {
    try {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };

        const {
            mediaType,
            embedUrl,
            title,
            caption,
            ctaText,
            ctaUrl,
            autoplay,
            loop,
            muted,
            order,
            isActive,
        } = req.body;

        if (!mediaType) {
            return res.status(400).json({ error: "mediaType is required" });
        }

        // Resolve file path from uploaded file (hosted types) or embedUrl (embeds)
        let filePath: string | undefined;
        let thumbnail: string | undefined;

        if (files?.file?.[0]) {
            filePath = `/assets/uploaded/media/${files.file[0].filename}`;
        }
        if (files?.thumbnail?.[0]) {
            thumbnail = `/assets/uploaded/media/${files.thumbnail[0].filename}`;
        }

        const item = new HomepageMedia({
            mediaType,
            filePath: filePath ?? undefined,
            embedUrl: embedUrl || undefined,
            thumbnail: thumbnail ?? undefined,
            title: title || undefined,
            caption: caption || undefined,
            ctaText: ctaText || undefined,
            ctaUrl: ctaUrl || undefined,
            autoplay: autoplay !== undefined ? autoplay === "true" || autoplay === true : true,
            loop: loop !== undefined ? loop === "true" || loop === true : true,
            muted: muted !== undefined ? muted === "true" || muted === true : true,
            order: order !== undefined ? Number(order) : 0,
            isActive: isActive !== undefined ? isActive === "true" || isActive === true : true,
        });

        await item.save();

        res.status(201).json({
            success: true,
            message: "Media item created",
            data: item,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * PUT /api/admin/media/:mediaId
 * Update a media item's metadata (non-file fields).
 * To replace the actual file, delete and re-create.
 */
export async function updateMediaItem(req: Request, res: Response, next: NextFunction) {
    try {
        const { mediaId } = req.params;
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };

        const update: any = {};
        const fields = ["mediaType", "embedUrl", "title", "caption", "ctaText", "ctaUrl"];
        for (const field of fields) {
            if (req.body[field] !== undefined) update[field] = req.body[field] || undefined;
        }

        // Boolean fields
        for (const boolField of ["autoplay", "loop", "muted", "isActive"]) {
            if (req.body[boolField] !== undefined) {
                update[boolField] = req.body[boolField] === "true" || req.body[boolField] === true;
            }
        }
        if (req.body.order !== undefined) update.order = Number(req.body.order);

        // New file upload (replaces old one)
        if (files?.file?.[0]) {
            const existing = await HomepageMedia.findById(mediaId);
            if (existing?.filePath) deleteDiskFile(existing.filePath);
            update.filePath = `/assets/uploaded/media/${files.file[0].filename}`;
        }
        if (files?.thumbnail?.[0]) {
            const existing = await HomepageMedia.findById(mediaId);
            if (existing?.thumbnail) deleteDiskFile(existing.thumbnail);
            update.thumbnail = `/assets/uploaded/media/${files.thumbnail[0].filename}`;
        }

        const item = await HomepageMedia.findByIdAndUpdate(
            mediaId,
            { ...update, updatedAt: new Date() },
            { new: true, runValidators: true },
        );
        if (!item) return res.status(404).json({ error: "Media item not found" });

        res.json({ success: true, message: "Media item updated", data: item });
    } catch (error) {
        next(error);
    }
}

/**
 * PATCH /api/admin/media/:mediaId/toggle-active
 * Toggle isActive flag.
 */
export async function toggleMediaActive(req: Request, res: Response, next: NextFunction) {
    try {
        const item = await HomepageMedia.findById(req.params.mediaId);
        if (!item) return res.status(404).json({ error: "Media item not found" });
        item.isActive = !item.isActive;
        await item.save();
        res.json({ success: true, message: `Media item ${item.isActive ? "shown" : "hidden"}`, data: { isActive: item.isActive } });
    } catch (error) {
        next(error);
    }
}

/**
 * DELETE /api/admin/media/:mediaId
 * Delete media item and remove the uploaded file from disk.
 */
export async function deleteMediaItem(req: Request, res: Response, next: NextFunction) {
    try {
        const item = await HomepageMedia.findByIdAndDelete(req.params.mediaId);
        if (!item) return res.status(404).json({ error: "Media item not found" });

        // Clean up files from disk
        deleteDiskFile((item as any).filePath);
        deleteDiskFile((item as any).thumbnail);

        res.json({ success: true, message: "Media item deleted" });
    } catch (error) {
        next(error);
    }
}
