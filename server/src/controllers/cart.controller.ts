import { Request, Response, NextFunction } from 'express';
import { Cart } from '../models/Cart.js';
import { Product } from '../models/Product.js';

/**
 * Get user's cart
 */
export async function getCart(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.userId!;

        let cart = await Cart.findOne({ userId }).populate({
            path: 'items.productId',
            select: 'name images price salePrice discount variants tax status'
        });

        if (!cart) {
            cart = new Cart({
                userId,
                items: []
            });
            await cart.save();
        }

        res.json({
            success: true,
            data: cart
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Add item to cart
 */
export async function addToCart(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.userId!;
        const { productId, variantIndex = 0, quantity = 1 } = req.body;

        if (!productId || quantity < 1) {
            return res.status(400).json({ error: 'Invalid product or quantity' });
        }

        // Verify product exists and is active
        const product = await Product.findOne({ _id: productId, status: 'active' });
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        let cart = await Cart.findOne({ userId });

        if (!cart) {
            cart = new Cart({
                userId,
                items: []
            });
        }

        // Check if item already exists in cart
        const existingItemIndex = cart.items.findIndex(
            (item) =>
                item.productId.toString() === productId &&
                item.variantId === variantIndex.toString()
        );

        if (existingItemIndex > -1) {
            // Update existing item quantity
            cart.items[existingItemIndex].quantity += quantity;
        } else {
            // Add new item
            cart.items.push({
                productId,
                variantId: variantIndex.toString(),
                quantity,
                addedAt: new Date()
            } as any);
        }

        await cart.populate({
            path: 'items.productId',
            select: 'name images price salePrice discount variants tax'
        });

        res.json({
            success: true,
            message: 'Item added to cart',
            data: cart
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Update cart item quantity
 */
export async function updateCartItem(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.userId!;
        const { itemId } = req.params;
        const { quantity } = req.body;

        if (quantity < 1) {
            return res.status(400).json({ error: 'Quantity must be at least 1' });
        }

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }

        const item = cart.items.find((i) => i._id?.toString() === itemId);
        if (!item) {
            return res.status(404).json({ error: 'Item not found in cart' });
        }

        item.quantity = quantity;
        await cart.save();

        res.json({
            success: true,
            message: 'Cart updated'
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Remove item from cart
 */
export async function removeFromCart(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.userId!;
        const { itemId } = req.params;

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }

        const itemIndex = cart.items.findIndex((i) => i._id?.toString() === itemId);
        if (itemIndex === -1) {
            return res.status(404).json({ error: 'Item not found in cart' });
        }

        cart.items.splice(itemIndex, 1);
        await cart.save();

        res.json({
            success: true,
            message: 'Item removed from cart'
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Clear entire cart
 */
export async function clearCart(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.userId!;

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }

        (cart as any).items = [];
        await cart.save();

        res.json({
            success: true,
            message: 'Cart cleared'
        });
    } catch (error) {
        next(error);
    }
}

