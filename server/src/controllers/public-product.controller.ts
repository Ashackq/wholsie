import { Request, Response, NextFunction } from 'express';
import { Product } from '../models/Product.js';
import { ProductCategory } from '../models/ProductCategory.js';

/**
 * Get all products with filters and pagination (public)
 */
export async function getProducts(req: Request, res: Response, next: NextFunction) {
    try {
        const { limit = 12, offset = 0, categoryId, search, sort = 'newest' } = req.query;

        const filter: any = { status: 'active' };

        if (categoryId) {
            filter.categoryId = categoryId;
        }

        if (search) {
            filter.$or = [
                { name: { $regex: search as string, $options: 'i' } },
                { description: { $regex: search as string, $options: 'i' } }
            ];
        }

        const sortObj: any = {};
        switch (sort) {
            case 'price-asc':
                sortObj.price = 1;
                break;
            case 'price-desc':
                sortObj.price = -1;
                break;
            case 'rating':
                sortObj.rating = -1;
                break;
            default:
                sortObj.createdAt = -1;
        }

        const products = await Product
            .find(filter)
            .populate('categoryId', 'name slug')
            .sort(sortObj)
            .limit(parseInt(limit as string))
            .skip(parseInt(offset as string));

        const total = await Product.countDocuments(filter);

        res.json({
            success: true,
            data: products,
            pagination: {
                limit: parseInt(limit as string),
                offset: parseInt(offset as string),
                total,
                pages: Math.ceil(total / parseInt(limit as string))
            }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get product by slug (public)
 */
export async function getProductBySlug(req: Request, res: Response, next: NextFunction) {
    try {
        const { slug } = req.params;

        const product = await Product
            .findOne({ slug: slug.toLowerCase() })
            .populate('categoryId', 'name slug');

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({
            success: true,
            data: product
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get product by ID (public)
 */
export async function getProductById(req: Request, res: Response, next: NextFunction) {
    try {
        const { productId } = req.params;

        const product = await Product
            .findById(productId)
            .populate('categoryId', 'name slug');

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({
            success: true,
            data: product
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Search products (public)
 */
export async function searchProducts(req: Request, res: Response, next: NextFunction) {
    try {
        const { q, limit = 10 } = req.query;

        if (!q || typeof q !== 'string') {
            return res.status(400).json({ error: 'Search query required' });
        }

        const products = await Product
            .find({
                status: 'active',
                $or: [
                    { name: { $regex: q, $options: 'i' } },
                    { description: { $regex: q, $options: 'i' } }
                ]
            })
            .populate('categoryId', 'name slug')
            .limit(parseInt(limit as string))
            .select('name slug image price salePrice discount');

        res.json({
            success: true,
            data: products
        });
    } catch (error) {
        next(error);
    }
}

