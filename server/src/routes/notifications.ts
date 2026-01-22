import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import { Notification } from "../models/Notification.js";
import { z } from "zod";

const router = Router();

const createNotificationSchema = z.object({
    userId: z.string(),
    type: z.enum(["order", "promotion", "system", "review", "support"]),
    title: z.string(),
    message: z.string(),
    data: z.record(z.any()).optional(),
    expiresAt: z.string().optional(),
});

// Get notifications for current user
router.get("/", requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const unreadOnly = req.query.unread === "true";

        const filter: any = { userId };
        if (unreadOnly) filter.isRead = false;

        const notifications = await Notification.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const total = await Notification.countDocuments(filter);

        res.json({
            notifications,
            pagination: { total, page, limit, pages: Math.ceil(total / limit) },
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch notifications" });
    }
});

// Get unread count
router.get("/unread/count", requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const count = await Notification.countDocuments({
            userId,
            isRead: false,
        });
        res.json({ unreadCount: count });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch unread count" });
    }
});

// Mark as read
router.put("/:id/read", requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { id } = req.params;

        const notification = await Notification.findOneAndUpdate(
            { _id: id, userId },
            { isRead: true, readAt: new Date() },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ error: "Notification not found" });
        }

        res.json(notification);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Mark all as read
router.put("/mark-all/read", requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;

        await Notification.updateMany(
            { userId, isRead: false },
            { isRead: true, readAt: new Date() }
        );

        res.json({ message: "All notifications marked as read" });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Delete notification
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { id } = req.params;

        const notification = await Notification.findOneAndDelete({
            _id: id,
            userId,
        });

        if (!notification) {
            return res.status(404).json({ error: "Notification not found" });
        }

        res.json({ message: "Notification deleted" });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Admin: Create notification
router.post("/admin/send", requireAuth, async (req: Request, res: Response) => {
    try {
        const parsed = createNotificationSchema.parse(req.body);

        const notification = new Notification({
            ...parsed,
            expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : undefined,
        });

        await notification.save();
        res.status(201).json(notification);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Admin: Broadcast to all users
router.post("/admin/broadcast", requireAuth, async (req: Request, res: Response) => {
    try {
        const { type, title, message, data, expiresAt } = req.body;

        const User = require("../models/User").User;
        const users = await User.find().select("_id");

        const notifications = users.map((user: any) => ({
            userId: user._id,
            type,
            title,
            message,
            data,
            expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        }));

        await Notification.insertMany(notifications);
        res.status(201).json({
            message: `Notification sent to ${notifications.length} users`,
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Admin: Delete old notifications
router.delete("/admin/cleanup", requireAuth, async (req: Request, res: Response) => {
    try {
        const { days = 30 } = req.body;
        const date = new Date();
        date.setDate(date.getDate() - days);

        const result = await Notification.deleteMany({
            isRead: true,
            createdAt: { $lt: date },
        });

        res.json({
            message: `Deleted ${result.deletedCount} old notifications`,
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

export default router;
