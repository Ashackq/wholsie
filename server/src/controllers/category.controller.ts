import { Request, Response, NextFunction } from 'express';
import { ProductCategory } from '../models/ProductCategory.js';

/**
 * Get all categories (admin)
 */
export async function getCategories(req: Request, res: Response, next: NextFunction) {
    try {
        const categories = await ProductCategory
            .find({ status: { $ne: 'deleted' } })
            .sort({ createdAt: -1 });

        res.json({ success: true, data: categories });
    } catch (error) {
        next(error);
    }
}

/**
 * Create category (admin)
 */
export async function createCategory(req: Request, res: Response, next: NextFunction) {
    try {
        const { name, description, image, status } = req.body;

        // Basic validation
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({ error: 'Name is required' });
        }

        // Generate slug from name
        const slug = name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

        // Check for duplicates
        const existing = await ProductCategory.findOne({
            $or: [{ name }, { slug }],
            status: { $ne: 'deleted' }
        });

        if (existing) {
            return res.status(409).json({
                error: 'Category already exists',
                details: existing.slug === slug ? 'Duplicate slug' : 'Duplicate name',
            });
        }

        const category = new ProductCategory({
            name: name.trim(),
            description,
            image,
            slug,
            status: status === 'inactive' ? 'inactive' : 'active',
        });

        await category.save();

        res.status(201).json({
            success: true,
            message: 'Category created',
            data: category,
        });
    } catch (error: any) {
        if (error.code === 11000) {
            return res.status(409).json({ error: 'Category already exists' });
        }
        next(error);
    }
}

/**
 * Update category (admin)
 */
export async function updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
        const { categoryId } = req.params;
        const { name, description, image, status } = req.body;

        const updateData: any = { updatedAt: new Date() };

        if (name) {
            updateData.name = name.trim();
            updateData.slug = name
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
        }
        if (description !== undefined) updateData.description = description;
        if (image !== undefined) updateData.image = image;
        if (status) updateData.status = status === 'inactive' ? 'inactive' : 'active';

        const category = await ProductCategory.findByIdAndUpdate(
            categoryId,
            updateData,
            { new: true, runValidators: true }
        );

        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        res.json({
            success: true,
            message: 'Category updated',
            data: category,
        });
    } catch (error: any) {
        if (error.code === 11000) {
            return res.status(409).json({ error: 'Category name or slug already exists' });
        }
        next(error);
    }
}

/**
 * Delete category (soft delete)
 */
export async function deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
        const { categoryId } = req.params;

        const category = await ProductCategory.findByIdAndUpdate(
            categoryId,
            { status: 'deleted', updatedAt: new Date() },
            { new: true }
        );

        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        res.json({
            success: true,
            message: 'Category deleted',
        });
    } catch (error) {
        next(error);
    }
}

