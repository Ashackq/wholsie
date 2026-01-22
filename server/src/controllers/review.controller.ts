import { Request, Response, NextFunction } from 'express';
import { Review } from '../models/Review.js';
import { Product } from '../models/Product.js';
import { User } from '../models/User.js';
import { Order } from '../models/Order.js';

/**
 * Get product reviews
 */
export async function getProductReviews(req: Request, res: Response, next: NextFunction) {
    try {
        const { productId } = req.params;
        const { limit = 10, offset = 0 } = req.query;

        const reviews = await Review
            .find({ productId })
            .populate('userId', 'name profileImage')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit as string))
            .skip(parseInt(offset as string));

        const total = await Review.countDocuments({ productId });

        res.json({
            success: true,
            data: reviews,
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
 * Add review for product
 */
export async function addReview(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.userId!;
        const { productId } = req.params;
        const { rating, comment, images = [] } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }

        // Verify product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Check if user has purchased this product
        const hasPurchased = await Order.exists({
            userId,
            'items.productId': productId,
            paymentStatus: 'completed'
        });

        if (!hasPurchased) {
            return res.status(403).json({ error: 'You can only review products you have purchased' });
        }

        // Check if user already reviewed this product
        const existingReview = await Review.findOne({ userId, productId });
        if (existingReview) {
            return res.status(400).json({ error: 'You have already reviewed this product' });
        }

        const review = new Review({
            userId,
            productId,
            rating,
            comment,
            images,
            isVerified: true
        });

        await review.save();

        // Update product rating
        const allReviews = await Review.find({ productId });
        const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

        await Product.findByIdAndUpdate(productId, {
            rating: avgRating,
            totalReviews: allReviews.length
        });

        res.status(201).json({
            success: true,
            message: 'Review added',
            data: review
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get user's reviews
 */
export async function getUserReviews(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.userId!;
        const { limit = 10, offset = 0 } = req.query;

        const reviews = await Review
            .find({ userId })
            .populate('productId', 'name images slug')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit as string))
            .skip(parseInt(offset as string));

        const total = await Review.countDocuments({ userId });

        res.json({
            success: true,
            data: reviews,
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
 * Update user's review
 */
export async function updateReview(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.userId!;
        const { reviewId } = req.params;
        const { rating, comment, images } = req.body;

        const review = await Review.findOne({ _id: reviewId, userId });
        if (!review) {
            return res.status(404).json({ error: 'Review not found' });
        }

        if (rating) {
            if (rating < 1 || rating > 5) {
                return res.status(400).json({ error: 'Rating must be between 1 and 5' });
            }
            review.rating = rating;
        }

        if (comment !== undefined) review.comment = comment;
        if (images !== undefined) review.images = images;
        review.updatedAt = new Date();

        await review.save();

        // Update product rating
        const allReviews = await Review.find({ productId: review.productId });
        const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

        await Product.findByIdAndUpdate(review.productId, {
            rating: avgRating,
            totalReviews: allReviews.length
        });

        res.json({
            success: true,
            message: 'Review updated',
            data: review
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Delete review
 */
export async function deleteReview(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.userId!;
        const { reviewId } = req.params;

        const review = await Review.findOne({ _id: reviewId, userId });
        if (!review) {
            return res.status(404).json({ error: 'Review not found' });
        }

        const productId = review.productId;
        await review.deleteOne();

        // Update product rating
        const allReviews = await Review.find({ productId });
        const avgRating = allReviews.length > 0
            ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
            : 0;

        await Product.findByIdAndUpdate(productId, {
            rating: avgRating,
            totalReviews: allReviews.length
        });

        res.json({
            success: true,
            message: 'Review deleted'
        });
    } catch (error) {
        next(error);
    }
}

