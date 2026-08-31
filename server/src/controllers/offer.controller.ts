import { Request, Response, NextFunction } from "express";
import { Offer } from "../models/Offer.js";
import { Product } from "../models/Product.js";

// ── Helper: check if offer is currently active (runtime, not stored) ──────────
function isCurrentlyActive(offer: any): boolean {
    if (!offer.isActive) return false;
    const now = new Date();
    if (offer.startDate && new Date(offer.startDate) > now) return false;
    if (offer.endDate && new Date(offer.endDate) < now) return false;
    if (offer.maxUsageTotal != null && offer.usageCount >= offer.maxUsageTotal) return false;
    return true;
}

/**
 * GET /api/offers
 * Public list of currently active offers (displayOnProductsPage = any).
 */
export async function getPublicOffers(req: Request, res: Response, next: NextFunction) {
    try {
        const now = new Date();

        const offers = await Offer.find({
            isActive: true,
            $or: [{ startDate: null }, { startDate: { $lte: now } }],
            $and: [
                { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
            ],
        })
            .select("-internalNote -__v")
            .sort({ priority: -1, createdAt: -1 })
            .lean();

        // Filter out usage-exhausted offers
        const active = offers.filter(
            (o) => o.maxUsageTotal == null || o.usageCount < o.maxUsageTotal
        );

        res.json({ success: true, data: active });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/offers/:slug
 * Public offer detail page — returns the offer plus its eligible products.
 * Used by /offers/[slug] (SSR + ISR).
 */
export async function getPublicOfferBySlug(req: Request, res: Response, next: NextFunction) {
    try {
        const { slug } = req.params;

        const offer = await Offer.findOne({ slug })
            .select("-internalNote -__v")
            .populate("applicableProducts", "name slug price salePrice image images")
            .populate("applicableCategories", "name slug")
            .lean();

        if (!offer) {
            return res.status(404).json({ error: "Offer not found" });
        }

        // Determine active status for robots/meta
        const active = isCurrentlyActive(offer);

        // Increment view count (fire-and-forget)
        Offer.updateOne({ _id: offer._id }, { $inc: { viewCount: 1 } }).exec();

        res.json({
            success: true,
            data: offer,
            meta: { isCurrentlyActive: active },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/offers/products
 * Returns all products that have at least one currently active offer.
 * Each product includes an `offers` array with { title, badgeText } for badge rendering.
 * Used by the Products page Offers tab (?category=offers).
 * NOTE: This route must be registered BEFORE /offers/:slug to avoid slug collision.
 */
export async function getOfferProducts(req: Request, res: Response, next: NextFunction) {
    try {
        const now = new Date();

        const activeOffers = await Offer.find({
            isActive: true,
            displayOnProductsPage: true,
            $or: [{ startDate: null }, { startDate: { $lte: now } }],
            $and: [
                { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
            ],
        })
            .select("title badgeText applicableProducts applicableCategories maxUsageTotal usageCount")
            .populate("applicableProducts", "_id")
            .populate("applicableCategories", "_id")
            .lean();

        // Filter usage-exhausted
        const valid = activeOffers.filter(
            (o) => o.maxUsageTotal == null || o.usageCount < o.maxUsageTotal
        );

        if (!valid.length) {
            return res.json({ success: true, data: [] });
        }

        // Collect product IDs directly scoped
        const directProductIds = new Set<string>();
        const categoryIds = new Set<string>();

        for (const offer of valid) {
            (offer.applicableProducts || []).forEach((p: any) => directProductIds.add(p._id.toString()));
            (offer.applicableCategories || []).forEach((c: any) => categoryIds.add(c._id.toString()));
        }

        // Query products
        const orFilter: any[] = [];
        if (directProductIds.size) orFilter.push({ _id: { $in: [...directProductIds] } });
        if (categoryIds.size) orFilter.push({ categoryId: { $in: [...categoryIds] } });
        if (!orFilter.length) return res.json({ success: true, data: [] });

        const products = await Product.find({
            $or: orFilter,
            status: { $ne: "deleted" },
        })
            .select("name slug price salePrice image images categoryId")
            .lean();

        // Attach offer badges to each product
        const withOffers = products.map((product: any) => {
            const pid = product._id.toString();
            const cid = product.categoryId?.toString();
            const matchedOffers = valid
                .filter((o) => {
                    const appProducts = (o.applicableProducts || []).map((p: any) => p._id.toString());
                    const appCats = (o.applicableCategories || []).map((c: any) => c._id.toString());
                    if (appProducts.length === 0 && appCats.length === 0) return true;
                    if (appProducts.includes(pid)) return true;
                    if (cid && appCats.includes(cid)) return true;
                    return false;
                })
                .map((o) => ({ title: o.title, badgeText: o.badgeText }));

            return { ...product, offers: matchedOffers };
        });

        res.json({ success: true, data: withOffers });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/offers/:offerId/click
 * Increment clickCount (called when customer clicks "Shop Now" from offer page/card).
 */
export async function recordOfferClick(req: Request, res: Response, next: NextFunction) {
    try {
        await Offer.updateOne({ _id: req.params.offerId }, { $inc: { clickCount: 1 } });
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
}
