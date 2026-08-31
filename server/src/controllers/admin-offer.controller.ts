import { Request, Response, NextFunction } from "express";
import { Offer } from "../models/Offer.js";
import { invalidateOfferCache } from "../services/offerEngine.js";

// ── Helper: build slug from title ─────────────────────────────────────────────
function toSlug(title: string): string {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

/**
 * GET /api/admin/offers
 * List all offers (paginated, optional search).
 */
export async function getOffers(req: Request, res: Response, next: NextFunction) {
    try {
        const { limit = 20, offset = 0, search, isActive } = req.query;

        const filter: any = {};
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: "i" } },
                { slug: { $regex: search, $options: "i" } },
            ];
        }
        if (isActive !== undefined) {
            filter.isActive = isActive === "true";
        }

        const offers = await Offer.find(filter)
            .populate("applicableProducts", "name _id")
            .populate("applicableCategories", "name _id")
            .sort({ createdAt: -1 })
            .limit(parseInt(limit as string))
            .skip(parseInt(offset as string));

        const total = await Offer.countDocuments(filter);

        res.json({
            success: true,
            data: offers,
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
 * GET /api/admin/offers/:offerId
 * Get a single offer by ID.
 */
export async function getOffer(req: Request, res: Response, next: NextFunction) {
    try {
        const { offerId } = req.params;

        const offer = await Offer.findById(offerId)
            .populate("applicableProducts", "name _id salePrice price")
            .populate("applicableCategories", "name _id")
            .populate("rule.getFreeProductId", "name _id salePrice price")
            .populate("rule.comboProducts", "name _id salePrice price");

        if (!offer) {
            return res.status(404).json({ error: "Offer not found" });
        }

        res.json({ success: true, data: offer });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/admin/offers
 * Create a new offer.
 */
export async function createOffer(req: Request, res: Response, next: NextFunction) {
    try {
        const body = req.body;

        // Auto-generate slug from title if not provided
        const slug = body.slug ? body.slug.toLowerCase().trim() : toSlug(body.title ?? "offer");

        // Check slug uniqueness
        const existing = await Offer.findOne({ slug });
        if (existing) {
            return res.status(400).json({ error: `Slug "${slug}" is already in use. Please choose another.` });
        }

        const offer = new Offer({
            ...body,
            slug,
        });

        await offer.save();
        invalidateOfferCache();

        res.status(201).json({
            success: true,
            message: "Offer created",
            data: offer,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * PUT /api/admin/offers/:offerId
 * Update an existing offer.
 */
export async function updateOffer(req: Request, res: Response, next: NextFunction) {
    try {
        const { offerId } = req.params;
        const body = { ...req.body };

        // If slug is being changed, validate uniqueness
        if (body.slug) {
            body.slug = body.slug.toLowerCase().trim();
            const duplicate = await Offer.findOne({ slug: body.slug, _id: { $ne: offerId } });
            if (duplicate) {
                return res.status(400).json({ error: `Slug "${body.slug}" is already in use.` });
            }
        }

        const offer = await Offer.findByIdAndUpdate(
            offerId,
            { ...body, updatedAt: new Date() },
            { new: true, runValidators: true },
        );

        if (!offer) {
            return res.status(404).json({ error: "Offer not found" });
        }

        invalidateOfferCache();

        res.json({
            success: true,
            message: "Offer updated",
            data: offer,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * PATCH /api/admin/offers/:offerId/toggle-active
 * Toggle the isActive flag.
 */
export async function toggleOfferActive(req: Request, res: Response, next: NextFunction) {
    try {
        const { offerId } = req.params;

        const offer = await Offer.findById(offerId);
        if (!offer) {
            return res.status(404).json({ error: "Offer not found" });
        }

        offer.isActive = !offer.isActive;
        await offer.save();
        invalidateOfferCache();

        res.json({
            success: true,
            message: `Offer ${offer.isActive ? "activated" : "deactivated"}`,
            data: { isActive: offer.isActive },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * DELETE /api/admin/offers/:offerId
 * Hard-delete an offer.
 */
export async function deleteOffer(req: Request, res: Response, next: NextFunction) {
    try {
        const { offerId } = req.params;

        const offer = await Offer.findByIdAndDelete(offerId);
        if (!offer) {
            return res.status(404).json({ error: "Offer not found" });
        }

        invalidateOfferCache();

        res.json({ success: true, message: "Offer deleted" });
    } catch (error) {
        next(error);
    }
}
