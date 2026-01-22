import { Request, Response, NextFunction } from 'express';
import { Favorite } from '../models/Favorite.js';
import { Product } from '../models/Product.js';

/**
 * Get user's favorite products
 */
export async function getFavorites(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.userId!;
        const { limit = 20, offset = 0 } = req.query;

        const favorites = await Favorite
            .find({ userId })
            .populate({
                path: 'productId',
                match: { status: 'active' },
                select: 'name slug images price salePrice discount rating totalReviews'
            })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit as string))
            .skip(parseInt(offset as string));

        // Filter out favorites where product was deleted or inactive
        const validFavorites = favorites.filter(f => f.productId);

        const total = await Favorite.countDocuments({ userId });

        res.json({
            success: true,
            data: validFavorites,
            pagination: {
                limit: parseInt(limit as string),
                offset: parseInt(offset as string),
                total
            }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Add product to favorites
 */
export async function addToFavorites(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.userId!;
        const { productId } = req.body;

        if (!productId) {
            return res.status(400).json({ error: 'Product ID required' });
        }

        // Verify product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Check if already in favorites
        const existing = await Favorite.findOne({ userId, productId });
        if (existing) {
            return res.status(400).json({ error: 'Product already in favorites' });
        }

        const favorite = new Favorite({
            userId,
            productId
        });

        await favorite.save();

        res.status(201).json({
            success: true,
            message: 'Product added to favorites',
            data: favorite
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Remove product from favorites
 */
export async function removeFromFavorites(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.userId!;
        const { productId } = req.params;

        const favorite = await Favorite.findOneAndDelete({ userId, productId });

        if (!favorite) {
            return res.status(404).json({ error: 'Favorite not found' });
        }

        res.json({
            success: true,
            message: 'Product removed from favorites'
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Check if product is in favorites
 */
export async function checkFavorite(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.userId!;
        const { productId } = req.params;

        const favorite = await Favorite.exists({ userId, productId });

        res.json({
            success: true,
            data: { isFavorite: !!favorite }
        });
    } catch (error) {
        next(error);
    }
}

