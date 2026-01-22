import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import { Coupon } from "../models/Coupon.js";
import { z } from "zod";

const router = Router();

const createCouponSchema = z.object({
    code: z.string().min(3),
    description: z.string().optional(),
    discountType: z.enum(["percentage", "fixed"]),
    discountValue: z.number().positive(),
    maxDiscount: z.number().optional(),
    minPurchaseAmount: z.number().optional(),
    usageLimit: z.number().optional(),
    usagePerUser: z.number().optional(),
    applicableCategories: z.array(z.string()).optional(),
    applicableProducts: z.array(z.string()).optional(),
    excludedProducts: z.array(z.string()).optional(),
    validFrom: z.string(),
    validTo: z.string(),
});

// Get all active coupons
router.get("/", async (req: Request, res: Response) => {
    try {
        const now = new Date();
        const coupons = await Coupon.find({
            isActive: true,
            validFrom: { $lte: now },
            validTo: { $gte: now },
        });
        res.json(coupons);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch coupons" });
    }
});

// Validate coupon
router.post("/validate", async (req: Request, res: Response) => {
    try {
        const { code, cartTotal, productIds } = req.body;

        const coupon = await Coupon.findOne({
            code: code.toUpperCase(),
            isActive: true,
        });

        if (!coupon) {
            return res.status(404).json({ error: "Coupon not found or expired" });
        }

        const now = new Date();
        if (coupon.validFrom > now || coupon.validTo < now) {
            return res.status(400).json({ error: "Coupon is not valid at this time" });
        }

        if (
            coupon.usageLimit &&
            coupon.usageCount >= coupon.usageLimit
        ) {
            return res.status(400).json({ error: "Coupon usage limit exceeded" });
        }

        if (cartTotal < (coupon.minPurchaseAmount || 0)) {
            return res.status(400).json({
                error: `Minimum purchase amount is ₹${coupon.minPurchaseAmount}`,
            });
        }

        // Check if products are applicable
        if (coupon.applicableProducts && coupon.applicableProducts.length > 0) {
            const applicable = productIds.some((id: string) =>
                coupon.applicableProducts.some(p => p.toString() === id)
            );
            if (!applicable) {
                return res.status(400).json({
                    error: "This coupon is not applicable to your cart",
                });
            }
        }

        // Calculate discount
        let discount = 0;
        if (coupon.discountType === "percentage") {
            discount = (cartTotal * coupon.discountValue) / 100;
            if (coupon.maxDiscount) {
                discount = Math.min(discount, coupon.maxDiscount);
            }
        } else {
            discount = coupon.discountValue;
        }

        res.json({
            valid: true,
            coupon,
            discount,
            finalAmount: cartTotal - discount,
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Admin: Create coupon
router.post("/admin/create", requireAuth, async (req: Request, res: Response) => {
    try {
        const parsed = createCouponSchema.parse(req.body);

        const coupon = new Coupon({
            ...parsed,
            validFrom: new Date(parsed.validFrom),
            validTo: new Date(parsed.validTo),
        });

        await coupon.save();
        res.status(201).json(coupon);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Admin: Get all coupons
router.get("/admin/all", requireAuth, async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        const coupons = await Coupon.find()
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const total = await Coupon.countDocuments();

        res.json({
            coupons,
            pagination: { total, page, limit, pages: Math.ceil(total / limit) },
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch coupons" });
    }
});

// Admin: Update coupon
router.put("/admin/:id", requireAuth, async (req: Request, res: Response) => {
    try {
        const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
        });
        if (!coupon) return res.status(404).json({ error: "Coupon not found" });
        res.json(coupon);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Admin: Delete coupon
router.delete("/admin/:id", requireAuth, async (req: Request, res: Response) => {
    try {
        const coupon = await Coupon.findByIdAndDelete(req.params.id);
        if (!coupon) return res.status(404).json({ error: "Coupon not found" });
        res.json({ message: "Coupon deleted" });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

export default router;
