import { Request, Response, NextFunction } from "express";
import { Coupon } from "../models/Coupon.js";

/**
 * GET /api/admin/coupons
 * List all coupons (paginated, optional search + active filter).
 */
export async function getCoupons(req: Request, res: Response, next: NextFunction) {
    try {
        const { limit = 20, offset = 0, search, isActive } = req.query;

        const filter: any = {};
        if (search) {
            filter.code = { $regex: search, $options: "i" };
        }
        if (isActive !== undefined) {
            filter.isActive = isActive === "true";
        }

        const coupons = await Coupon.find(filter)
            .populate("applicableProducts", "name _id")
            .populate("applicableCategories", "name _id")
            .populate("excludedProducts", "name _id")
            .sort({ createdAt: -1 })
            .limit(parseInt(limit as string))
            .skip(parseInt(offset as string));

        const total = await Coupon.countDocuments(filter);

        res.json({
            success: true,
            data: coupons,
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
 * GET /api/admin/coupons/:couponId
 * Get a single coupon by ID.
 */
export async function getCoupon(req: Request, res: Response, next: NextFunction) {
    try {
        const { couponId } = req.params;

        const coupon = await Coupon.findById(couponId)
            .populate("applicableProducts", "name _id salePrice price")
            .populate("applicableCategories", "name _id")
            .populate("excludedProducts", "name _id");

        if (!coupon) {
            return res.status(404).json({ error: "Coupon not found" });
        }

        res.json({ success: true, data: coupon });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/admin/coupons
 * Create a new coupon. Code is auto-uppercased.
 */
export async function createCoupon(req: Request, res: Response, next: NextFunction) {
    try {
        const body = { ...req.body };

        // Enforce uppercase code
        if (body.code) {
            body.code = body.code.trim().toUpperCase();
        }

        // Check code uniqueness
        const existing = await Coupon.findOne({ code: body.code });
        if (existing) {
            return res.status(400).json({ error: `Coupon code "${body.code}" already exists.` });
        }

        const coupon = new Coupon(body);
        await coupon.save();

        res.status(201).json({
            success: true,
            message: "Coupon created",
            data: coupon,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * PUT /api/admin/coupons/:couponId
 * Update an existing coupon.
 */
export async function updateCoupon(req: Request, res: Response, next: NextFunction) {
    try {
        const { couponId } = req.params;
        const body = { ...req.body };

        // Enforce uppercase code if being changed
        if (body.code) {
            body.code = body.code.trim().toUpperCase();
            const duplicate = await Coupon.findOne({ code: body.code, _id: { $ne: couponId } });
            if (duplicate) {
                return res.status(400).json({ error: `Coupon code "${body.code}" already in use.` });
            }
        }

        const coupon = await Coupon.findByIdAndUpdate(
            couponId,
            { ...body, updatedAt: new Date() },
            { new: true, runValidators: true },
        );

        if (!coupon) {
            return res.status(404).json({ error: "Coupon not found" });
        }

        res.json({
            success: true,
            message: "Coupon updated",
            data: coupon,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * PATCH /api/admin/coupons/:couponId/toggle-active
 * Toggle the isActive flag.
 */
export async function toggleCouponActive(req: Request, res: Response, next: NextFunction) {
    try {
        const { couponId } = req.params;

        const coupon = await Coupon.findById(couponId);
        if (!coupon) {
            return res.status(404).json({ error: "Coupon not found" });
        }

        coupon.isActive = !coupon.isActive;
        await coupon.save();

        res.json({
            success: true,
            message: `Coupon ${coupon.isActive ? "activated" : "deactivated"}`,
            data: { isActive: coupon.isActive },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * DELETE /api/admin/coupons/:couponId
 * Hard-delete a coupon.
 */
export async function deleteCoupon(req: Request, res: Response, next: NextFunction) {
    try {
        const { couponId } = req.params;

        const coupon = await Coupon.findByIdAndDelete(couponId);
        if (!coupon) {
            return res.status(404).json({ error: "Coupon not found" });
        }

        res.json({ success: true, message: "Coupon deleted" });
    } catch (error) {
        next(error);
    }
}
