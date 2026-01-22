import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import { Favorite } from "../models/Favorite.js";
import { z } from "zod";

const router = Router();

const createFavoriteSchema = z.object({
    productId: z.string(),
});

// Get all favorites for current user
router.get("/", requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const favorites = await Favorite.find({ userId }).populate("productId");
        res.json(favorites);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch favorites" });
    }
});

// Check if product is favorited
router.get("/check/:productId", requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { productId } = req.params;
        const favorite = await Favorite.findOne({ userId, productId });
        res.json({ isFavorite: !!favorite });
    } catch (error) {
        res.status(500).json({ error: "Failed to check favorite" });
    }
});

// Add to favorites
router.post("/", requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const parsed = createFavoriteSchema.parse(req.body);

        // Check if already exists
        const existing = await Favorite.findOne({
            userId,
            productId: parsed.productId,
        });
        if (existing) {
            return res.status(400).json({ error: "Already in favorites" });
        }

        const favorite = new Favorite({ userId, productId: parsed.productId });
        await favorite.save();
        await favorite.populate("productId");
        res.status(201).json(favorite);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Remove from favorites
router.delete("/:productId", requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { productId } = req.params;

        const favorite = await Favorite.findOneAndDelete({ userId, productId });
        if (!favorite) {
            return res.status(404).json({ error: "Favorite not found" });
        }
        res.json({ message: "Removed from favorites" });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Remove multiple favorites
router.post("/remove-bulk", requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { productIds } = req.body as { productIds: string[] };

        await Favorite.deleteMany({ userId, productId: { $in: productIds } });
        res.json({ message: "Favorites removed" });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

export default router;
