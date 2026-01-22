import { Router } from "express";
import { z } from "zod";

const addressSchema = z.object({
    name: z.string().min(1),
    phone: z.string().min(10),
    street: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    postalCode: z.string().min(1),
    isDefault: z.boolean().optional(),
});

export const addressesRouter = Router();

// Mock database - in production use MongoDB
const userAddresses = new Map<string, any[]>();

// GET user's addresses
addressesRouter.get("/addresses", async (req, res, next) => {
    const userId = (req as any).userId;
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const addresses = userAddresses.get(userId) || [];
        return res.json({ data: addresses });
    } catch (err) {
        return next(err);
    }
});

// CREATE address
addressesRouter.post("/addresses", async (req, res, next) => {
    const userId = (req as any).userId;
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const parsed = addressSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
        const newAddress = {
            _id: Date.now().toString(),
            ...parsed.data,
        };

        if (!userAddresses.has(userId)) {
            userAddresses.set(userId, []);
        }

        const addresses = userAddresses.get(userId)!;

        // If this is the first address or isDefault is true, make it default
        if (parsed.data.isDefault || addresses.length === 0) {
            addresses.forEach((addr) => {
                addr.isDefault = false;
            });
            newAddress.isDefault = true;
        }

        addresses.push(newAddress);
        return res.json({ data: addresses });
    } catch (err) {
        return next(err);
    }
});

// UPDATE address
addressesRouter.put("/addresses/:id", async (req, res, next) => {
    const userId = (req as any).userId;
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const parsed = addressSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
        const { id } = req.params;
        const addresses = userAddresses.get(userId) || [];

        const addressIndex = addresses.findIndex((addr) => addr._id === id);
        if (addressIndex === -1) {
            return res.status(404).json({ error: "Address not found" });
        }

        if (parsed.data.isDefault) {
            addresses.forEach((addr) => {
                addr.isDefault = false;
            });
        }

        addresses[addressIndex] = { _id: id, ...parsed.data };
        userAddresses.set(userId, addresses);

        return res.json({ data: addresses });
    } catch (err) {
        return next(err);
    }
});

// DELETE address
addressesRouter.delete("/addresses/:id", async (req, res, next) => {
    const userId = (req as any).userId;
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const { id } = req.params;
        let addresses = userAddresses.get(userId) || [];

        addresses = addresses.filter((addr) => addr._id !== id);

        if (addresses.length > 0 && !addresses.some((addr) => addr.isDefault)) {
            addresses[0].isDefault = true;
        }

        userAddresses.set(userId, addresses);
        return res.json({ data: addresses });
    } catch (err) {
        return next(err);
    }
});
