import { Router, Request, Response } from "express";
import { Product } from "../models/Product.js";
import { ProductCategory } from "../models/ProductCategory.js";

const router = Router();

// Advanced search with filters
router.get("/", async (req: Request, res: Response) => {
    try {
        const {
            q,
            category,
            minPrice,
            maxPrice,
            rating,
            inStock,
            page = 1,
            limit = 20,
            sort = "createdAt",
        } = req.query;

        const pageNum = parseInt(page as string) || 1;
        const limitNum = parseInt(limit as string) || 20;

        // Build filter
        const filter: any = { isActive: true };

        if (q) {
            filter.$or = [
                { name: { $regex: q, $options: "i" } },
                { description: { $regex: q, $options: "i" } },
            ];
        }

        if (category && category !== "all") {
            filter.category = category;
        }

        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = parseFloat(minPrice as string);
            if (maxPrice) filter.price.$lte = parseFloat(maxPrice as string);
        }

        if (rating) {
            filter.rating = { $gte: parseFloat(rating as string) };
        }

        if (inStock === "true") {
            filter.stock = { $gt: 0 };
        }

        // Build sort
        let sortObj: any = {};
        switch (sort) {
            case "price_asc":
                sortObj = { price: 1 };
                break;
            case "price_desc":
                sortObj = { price: -1 };
                break;
            case "rating":
                sortObj = { rating: -1 };
                break;
            case "newest":
                sortObj = { createdAt: -1 };
                break;
            default:
                sortObj = { createdAt: -1 };
        }

        const products = await Product.find(filter)
            .populate("category")
            .sort(sortObj)
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum);

        const total = await Product.countDocuments(filter);

        res.json({
            products,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil(total / limitNum),
            },
        });
    } catch (error) {
        res.status(500).json({ error: "Search failed" });
    }
});

// Get categories for filter
router.get("/categories/filter", async (req: Request, res: Response) => {
    try {
        const categories = await ProductCategory.find({ isActive: true }).select(
            "_id name"
        );
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch categories" });
    }
});

// Get price range
router.get("/price-range", async (req: Request, res: Response) => {
    try {
        const result = await Product.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: null,
                    minPrice: { $min: "$price" },
                    maxPrice: { $max: "$price" },
                },
            },
        ]);

        if (!result.length) {
            return res.json({ minPrice: 0, maxPrice: 0 });
        }

        res.json({
            minPrice: result[0].minPrice,
            maxPrice: result[0].maxPrice,
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch price range" });
    }
});

// Autocomplete search
router.get("/autocomplete", async (req: Request, res: Response) => {
    try {
        const { q } = req.query;

        if (!q || typeof q !== "string" || q.length < 2) {
            return res.json([]);
        }

        const results = await Product.find({
            name: { $regex: q, $options: "i" },
            isActive: true,
        })
            .select("_id name")
            .limit(10);

        res.json(results);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch suggestions" });
    }
});

export default router;
