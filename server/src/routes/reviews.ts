import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import { Review } from "../models/Review.js";
import { z } from "zod";

const router = Router();

const createReviewSchema = z.object({
    productId: z.string(),
    rating: z.number().min(1).max(5),
    title: z.string().min(5),
    comment: z.string().optional(),
    images: z.array(z.string()).optional(),
});

// Get reviews for a product
router.get("/product/:productId", async (req: Request, res: Response) => {
    try {
        const { productId } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        const reviews = await Review.find({
            productId,
            status: "approved",
        })
            .populate("userId", "name avatar")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const total = await Review.countDocuments({ productId, status: "approved" });

        res.json({
            reviews,
            pagination: { total, page, limit, pages: Math.ceil(total / limit) },
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch reviews" });
    }
});

// Get average rating for product
router.get("/product/:productId/rating", async (req: Request, res: Response) => {
    try {
        const { productId } = req.params;
        const result = await Review.aggregate([
            { $match: { productId: new (require("mongoose")).Types.ObjectId(productId) } },
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: "$rating" },
                    totalReviews: { $sum: 1 },
                    ratingDistribution: {
                        $push: "$rating",
                    },
                },
            },
        ]);

        if (!result.length) {
            return res.json({
                averageRating: 0,
                totalReviews: 0,
                ratingDistribution: {},
            });
        }

        const ratings = result[0].ratingDistribution;
        const distribution = {
            5: ratings.filter((r: number) => r === 5).length,
            4: ratings.filter((r: number) => r === 4).length,
            3: ratings.filter((r: number) => r === 3).length,
            2: ratings.filter((r: number) => r === 2).length,
            1: ratings.filter((r: number) => r === 1).length,
        };

        res.json({
            averageRating: Math.round(result[0].averageRating * 10) / 10,
            totalReviews: result[0].totalReviews,
            ratingDistribution: distribution,
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch rating" });
    }
});

// Get current user's review for a product
router.get("/:productId/my-review", requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { productId } = req.params;

        const review = await Review.findOne({ productId, userId });
        if (!review) {
            return res.status(404).json({ error: "No review found" });
        }
        res.json(review);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch review" });
    }
});

// Create review
router.post("/", requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const parsed = createReviewSchema.parse(req.body);

        // Check if user already reviewed this product
        const existing = await Review.findOne({
            productId: parsed.productId,
            userId,
        });
        if (existing) {
            return res.status(400).json({ error: "You already reviewed this product" });
        }

        const review = new Review({ ...parsed, userId });
        await review.save();
        await review.populate("userId", "name avatar");
        res.status(201).json(review);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Update review
router.put("/:id", requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { id } = req.params;

        const review = await Review.findById(id);
        if (!review) return res.status(404).json({ error: "Review not found" });
        if (review.userId.toString() !== userId) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        Object.assign(review, req.body);
        await review.save();
        res.json(review);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Delete review
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { id } = req.params;

        const review = await Review.findById(id);
        if (!review) return res.status(404).json({ error: "Review not found" });
        if (review.userId.toString() !== userId) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        await Review.findByIdAndDelete(id);
        res.json({ message: "Review deleted" });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Mark helpful (admin - approve review)
router.post("/:id/approve", requireAuth, async (req: Request, res: Response) => {
    try {
        const review = await Review.findByIdAndUpdate(
            req.params.id,
            { status: "approved" },
            { new: true }
        );
        if (!review) return res.status(404).json({ error: "Review not found" });
        res.json(review);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

export default router;
