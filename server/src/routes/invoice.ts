import express from "express";
import { Invoice } from "../models/Invoice.js";

const router = express.Router();

/**
 * GET /api/invoices/:invoiceId
 * Fetch invoice data by ID (public endpoint for invoice page)
 */
router.get("/:invoiceId", async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const invoice = await Invoice.findById(invoiceId).populate({
      path: "orderId",
      select: "orderId createdAt",
    });

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    return res.json({ invoice });
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return res.status(500).json({ error: "Failed to fetch invoice" });
  }
});

export default router;
