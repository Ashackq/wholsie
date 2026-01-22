import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import { Variant } from "../models/Variant.js";
import { VariantPrice } from "../models/VariantPrice.js";
import { z } from "zod";

const router = Router();

// Validation schemas
const createVariantSchema = z.object({
    productId: z.string(),
    name: z.string(),
    values: z.array(z.string()),
});

const createVariantPriceSchema = z.object({
    productId: z.string(),
    variantCombination: z.record(z.string()),
    price: z.number().positive(),
    originalPrice: z.number().positive(),
    stock: z.number().nonnegative(),
    sku: z.string(),
    image: z.string().optional(),
    isActive: z.boolean().default(true),
});

// Get all variants for a product
router.get("/product/:productId", async (req: Request, res: Response) => {
    try {
        const { productId } = req.params;
        const variants = await Variant.find({ productId });
        res.json(variants);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch variants" });
    }
});

// Get variant prices for a product
router.get("/prices/product/:productId", async (req: Request, res: Response) => {
    try {
        const { productId } = req.params;
        const prices = await VariantPrice.find({ productId });
        res.json(prices);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch variant prices" });
    }
});

// Create variant (admin only)
router.post("/", requireAuth, async (req: Request, res: Response) => {
    try {
        const parsed = createVariantSchema.parse(req.body);
        const variant = new Variant(parsed);
        await variant.save();
        res.status(201).json(variant);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Create variant price (admin only)
router.post("/price", requireAuth, async (req: Request, res: Response) => {
    try {
        const parsed = createVariantPriceSchema.parse(req.body);
        const variantPrice = new VariantPrice(parsed);
        await variantPrice.save();
        res.status(201).json(variantPrice);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Update variant (admin only)
router.put("/:id", requireAuth, async (req: Request, res: Response) => {
    try {
        const variant = await Variant.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
        });
        if (!variant) return res.status(404).json({ error: "Variant not found" });
        res.json(variant);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Update variant price (admin only)
router.put("/price/:id", requireAuth, async (req: Request, res: Response) => {
    try {
        const variantPrice = await VariantPrice.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
        });
        if (!variantPrice) return res.status(404).json({ error: "Variant price not found" });
        res.json(variantPrice);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Delete variant (admin only)
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
    try {
        const variant = await Variant.findByIdAndDelete(req.params.id);
        if (!variant) return res.status(404).json({ error: "Variant not found" });
        res.json({ message: "Variant deleted" });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Delete variant price (admin only)
router.delete("/price/:id", requireAuth, async (req: Request, res: Response) => {
    try {
        const variantPrice = await VariantPrice.findByIdAndDelete(req.params.id);
        if (!variantPrice) return res.status(404).json({ error: "Variant price not found" });
        res.json({ message: "Variant price deleted" });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

export default router;
