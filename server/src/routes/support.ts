import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import { SupportTicket } from "../models/SupportTicket.js";
import { z } from "zod";

const router = Router();

const createTicketSchema = z.object({
    orderId: z.string().optional(),
    subject: z.string().min(5),
    description: z.string().min(10),
    category: z.enum(["order", "payment", "delivery", "product", "return", "other"]),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
    attachments: z.array(z.string()).optional(),
});

const replySchema = z.object({
    message: z.string().min(1),
    attachments: z.array(z.string()).optional(),
});

// Get user's support tickets
router.get("/", requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const status = req.query.status as string;

        const filter: any = { userId };
        if (status) filter.status = status;

        const tickets = await SupportTicket.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate("userId", "name email")
            .populate("orderId", "orderNumber");

        const total = await SupportTicket.countDocuments(filter);

        res.json({
            tickets,
            pagination: { total, page, limit, pages: Math.ceil(total / limit) },
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch tickets" });
    }
});

// Get ticket details
router.get("/:id", requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { id } = req.params;

        const ticket = await SupportTicket.findOne({
            _id: id,
            userId,
        })
            .populate("userId", "name email avatar")
            .populate("messages.sender", "name avatar role");

        if (!ticket) {
            return res.status(404).json({ error: "Ticket not found" });
        }

        res.json(ticket);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch ticket" });
    }
});

// Create support ticket
router.post("/", requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const parsed = createTicketSchema.parse(req.body);

        const ticket = new SupportTicket({
            ...parsed,
            userId,
        });

        await ticket.save();
        await ticket.populate("userId", "name email");

        res.status(201).json(ticket);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Add reply to ticket
router.post("/:id/reply", requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { id } = req.params;
        const parsed = replySchema.parse(req.body);

        const ticket = await SupportTicket.findOne({
            _id: id,
            userId,
        });

        if (!ticket) {
            return res.status(404).json({ error: "Ticket not found" });
        }

        ticket.messages.push({
            sender: userId,
            message: parsed.message,
            attachments: parsed.attachments,
            createdAt: new Date(),
        });

        await ticket.save();
        await ticket.populate("messages.sender", "name avatar");

        res.json(ticket);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Update ticket status
router.put("/:id/status", requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { id } = req.params;
        const { status } = req.body;

        const ticket = await SupportTicket.findOne({
            _id: id,
            userId,
        });

        if (!ticket) {
            return res.status(404).json({ error: "Ticket not found" });
        }

        if (status === "closed") {
            ticket.closedAt = new Date();
        }

        ticket.status = status;
        await ticket.save();

        res.json(ticket);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Close ticket
router.post("/:id/close", requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { id } = req.params;

        const ticket = await SupportTicket.findOneAndUpdate(
            { _id: id, userId },
            { status: "closed", closedAt: new Date() },
            { new: true }
        );

        if (!ticket) {
            return res.status(404).json({ error: "Ticket not found" });
        }

        res.json(ticket);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Admin: Get all tickets
router.get("/admin/all", requireAuth, async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const status = req.query.status as string;
        const priority = req.query.priority as string;

        const filter: any = {};
        if (status) filter.status = status;
        if (priority) filter.priority = priority;

        const tickets = await SupportTicket.find(filter)
            .sort({ createdAt: -1, priority: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate("userId", "name email")
            .populate("orderId", "orderNumber");

        const total = await SupportTicket.countDocuments(filter);

        res.json({
            tickets,
            pagination: { total, page, limit, pages: Math.ceil(total / limit) },
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch tickets" });
    }
});

// Admin: Reply to ticket
router.post("/admin/:id/reply", requireAuth, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const parsed = replySchema.parse(req.body);
        const userId = (req as any).userId;

        const ticket = await SupportTicket.findById(id);

        if (!ticket) {
            return res.status(404).json({ error: "Ticket not found" });
        }

        ticket.messages.push({
            sender: userId,
            message: parsed.message,
            attachments: parsed.attachments,
            createdAt: new Date(),
        });

        ticket.status = "in_progress";
        await ticket.save();
        await ticket.populate("messages.sender", "name avatar role");

        res.json(ticket);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Admin: Update ticket
router.put("/admin/:id", requireAuth, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const ticket = await SupportTicket.findByIdAndUpdate(id, req.body, {
            new: true,
        });

        if (!ticket) {
            return res.status(404).json({ error: "Ticket not found" });
        }

        res.json(ticket);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

export default router;
