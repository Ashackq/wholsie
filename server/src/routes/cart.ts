import { Router } from "express";
import { z } from "zod";
import { Cart } from "../models/Cart.js";
import { Order } from "../models/Order.js";

const addToCartSchema = z.object({
    productId: z.string(),
    quantity: z.number().positive(),
    variantId: z.string().optional(),
});

const updateCartItemSchema = z.object({
    quantity: z.number().nonnegative(),
});

export const cartRouter = Router();

// GET user's cart
cartRouter.get("/cart", async (req, res, next) => {
    const userId = (req as any).userId; // Middleware to inject userId
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        let cart = await Cart.findOne({ userId }).populate("items.productId");
        if (!cart) {
            cart = new Cart({ userId, items: [] });
            await cart.save();
        }
        return res.json({ data: cart });
    } catch (err) {
        return next(err);
    }
});

// ADD to cart
cartRouter.post("/cart", async (req, res, next) => {
    const userId = (req as any).userId;
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const parsed = addToCartSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
        const { productId, quantity, variantId } = parsed.data;
        let cart = await Cart.findOne({ userId });

        if (!cart) {
            cart = new Cart({ userId, items: [] });
        }

        const existingItem = cart.items.find(
            (item) => item.productId.toString() === productId && item.variantId === variantId,
        );

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            const { Product } = await import("../models/Product.js");
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ error: "Product not found" });
            }

            cart.items.push({
                productId: product._id,
                name: product.name,
                price: product.salePrice || product.price,
                quantity,
                variantId,
                image: product.image,
            });
        }

        await cart.save();
        return res.json({ data: cart });
    } catch (err) {
        return next(err);
    }
});

// UPDATE cart item by ID
cartRouter.patch("/cart/:itemId", async (req, res, next) => {
    const userId = (req as any).userId;
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const parsed = updateCartItemSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
        const { itemId } = req.params;
        const { quantity } = parsed.data;

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ error: "Cart not found" });
        }

        const item = cart.items.id(itemId);
        if (!item) {
            return res.status(404).json({ error: "Item not found" });
        }

        if (quantity === 0) {
            item.deleteOne();
        } else {
            item.quantity = quantity;
        }

        await cart.save();
        return res.json({ data: cart });
    } catch (err) {
        return next(err);
    }
});

// UPDATE cart item by product ID (frontend uses this)
cartRouter.put("/cart/update", async (req, res, next) => {
    const userId = (req as any).userId;
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const updateSchema = z.object({
        itemId: z.string(), // productId or cart item id
        quantity: z.number().nonnegative(),
    });

    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
        const { itemId, quantity } = parsed.data;
        let cart = await Cart.findOne({ userId }).populate("items.productId");

        if (!cart) {
            return res.status(404).json({ error: "Cart not found" });
        }

        // Try to find item by _id first, then by productId
        let item: any | null = cart.items.id(itemId) ?? null;
        if (!item) {
            item = cart.items.find((i: any) => i.productId?._id?.toString() === itemId) ?? null;
        }

        if (!item) {
            return res.status(404).json({ error: "Item not found" });
        }

        if (quantity === 0) {
            item.deleteOne();
        } else {
            item.quantity = quantity;
        }

        await cart.save();
        return res.json({ data: cart });
    } catch (err) {
        return next(err);
    }
});

// DELETE from cart
cartRouter.delete("/cart/:itemId", async (req, res, next) => {
    const userId = (req as any).userId;
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const { itemId } = req.params;
        const cart = await Cart.findOne({ userId });

        if (!cart) {
            return res.status(404).json({ error: "Cart not found" });
        }

        const item = cart.items.id(itemId);
        if (item) {
            item.deleteOne();
            await cart.save();
        }

        return res.json({ data: cart });
    } catch (err) {
        return next(err);
    }
});

// CLEAR cart
cartRouter.delete("/cart", async (req, res, next) => {
    const userId = (req as any).userId;
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        await Cart.findOneAndUpdate({ userId }, { items: [] }, { new: true });
        return res.json({ message: "Cart cleared" });
    } catch (err) {
        return next(err);
    }
});
