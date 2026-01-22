import { Router } from "express";
import { z } from "zod";
import { Product } from "../models/Product.js";

const productListSchema = z.object({
    limit: z.coerce.number().default(12),
    offset: z.coerce.number().default(0),
    categoryId: z.string().optional(),
    search: z.string().optional(),
    recentLaunch: z.coerce.boolean().optional(),
    sort: z.enum(["newest", "price-asc", "price-desc", "rating"]).optional(),
});

export const productsRouter = Router();

// Get all products with filtering & pagination
productsRouter.get("/products", async (req, res, next) => {
    const parsed = productListSchema.safeParse(req.query);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
        const { limit, offset, categoryId, search, sort, recentLaunch } = parsed.data;
        const filter: Record<string, unknown> = { status: "active" };

        if (categoryId) filter.categoryId = categoryId;
        if (search) {
            filter.$text = { $search: search };
        }
        if (recentLaunch === true) {
            filter.isRecentLaunch = true;
        }

        const sortObj: Record<string, 1 | -1> = {};
        if (sort === "price-asc") sortObj.price = 1;
        else if (sort === "price-desc") sortObj.price = -1;
        else if (sort === "rating") sortObj.rating = -1;
        else sortObj.createdAt = -1; // newest

        const products = await Product.find(filter)
            .sort(sortObj)
            .limit(limit)
            .skip(offset)
            .lean();

        const total = await Product.countDocuments(filter);

        return res.json({
            data: products,
            pagination: { limit, offset, total, pages: Math.ceil(total / limit) },
        });
    } catch (err) {
        return next(err);
    }
});

// Get single product by slug or ID
productsRouter.get("/products/:idOrSlug", async (req, res, next) => {
    try {
        const { idOrSlug } = req.params;
        const filter = idOrSlug.match(/^[0-9a-f]{24}$/)
            ? { _id: idOrSlug }
            : { slug: idOrSlug.toLowerCase() };

        const product = await Product.findOne(filter).lean();
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }

        return res.json({ data: product });
    } catch (err) {
        return next(err);
    }
});

// Get product categories
productsRouter.get("/categories", async (_req, res, next) => {
    try {
        const { ProductCategory } = await import("../models/ProductCategory.js");
        const categories = await ProductCategory.find({ status: "active" }).lean();
        return res.json({ data: categories });
    } catch (err) {
        return next(err);
    }
});
