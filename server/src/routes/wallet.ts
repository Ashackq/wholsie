import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import { Wallet } from "../models/Wallet.js";
import { User } from "../models/User.js";
import { z } from "zod";

const router = Router();

const addFundsSchema = z.object({
    amount: z.number().positive(),
    description: z.string().optional(),
});

// Get wallet balance
router.get("/balance", requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        let wallet = await Wallet.findOne({ userId });

        if (!wallet) {
            wallet = new Wallet({ userId });
            await wallet.save();
        }

        res.json({
            balance: wallet.balance,
            totalEarned: wallet.totalEarned,
            totalSpent: wallet.totalSpent,
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch wallet" });
    }
});

// Get wallet transactions
router.get("/transactions", requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        const wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            return res.json({
                transactions: [],
                pagination: { total: 0, page, limit, pages: 0 },
            });
        }

        const transactions = wallet.transactions
            .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
            .slice((page - 1) * limit, page * limit);

        res.json({
            transactions,
            pagination: {
                total: wallet.transactions.length,
                page,
                limit,
                pages: Math.ceil(wallet.transactions.length / limit),
            },
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch transactions" });
    }
});

// Add funds (user initiated - would integrate with payment gateway)
router.post("/add-funds", requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const parsed = addFundsSchema.parse(req.body);

        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            wallet = new Wallet({ userId });
        }

        wallet.balance += parsed.amount;
        wallet.totalEarned += parsed.amount;
        wallet.transactions.push({
            type: "credit",
            amount: parsed.amount,
            description: parsed.description || "Wallet topup",
            createdAt: new Date(),
        });

        await wallet.save();

        res.json({
            message: "Funds added successfully",
            balance: wallet.balance,
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Deduct from wallet (for orders, refunds, etc.)
router.post("/deduct", requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { amount, description, orderId } = req.body;

        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            wallet = new Wallet({ userId });
        }

        if (wallet.balance < amount) {
            return res.status(400).json({ error: "Insufficient wallet balance" });
        }

        wallet.balance -= amount;
        wallet.totalSpent += amount;
        wallet.transactions.push({
            type: "debit",
            amount,
            description: description || "Purchase",
            orderId,
            createdAt: new Date(),
        });

        await wallet.save();

        res.json({
            message: "Amount deducted",
            balance: wallet.balance,
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Admin: Add credits (rewards, refunds, etc.)
router.post("/admin/credit", requireAuth, async (req: Request, res: Response) => {
    try {
        const { userId, amount, description } = req.body;

        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            wallet = new Wallet({ userId });
        }

        wallet.balance += amount;
        wallet.totalEarned += amount;
        wallet.transactions.push({
            type: "credit",
            amount,
            description: description || "Admin credit",
            createdAt: new Date(),
        });

        await wallet.save();

        res.json({
            message: "Credit added",
            balance: wallet.balance,
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

export default router;
