import Razorpay from "razorpay";
import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { ObjectId } from "mongodb";
import crypto from "crypto";
import { env } from "../config/env.js";
import { getDB } from "../config/database.js";
import { requireAuth } from "../middleware/auth.js";

const orderSchema = z.object({
  orderId: z.string(), // Order ID from our database, not Razorpay
  currency: z.string().default("INR").optional(),
});

const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID ?? "",
  key_secret: env.RAZORPAY_KEY_SECRET ?? "",
});

export const paymentRouter = Router();

paymentRouter.post(
  "/payments/order",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    const parsed = orderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
      const db = getDB();
      const userId = new ObjectId(req.user!.id);
      const { orderId } = parsed.data;

      // Fetch order from database to verify amount and ownership
      const order = await db.collection("orders").findOne({
        _id: new ObjectId(orderId),
        userId,
      });

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Validate amount - Razorpay minimum is ₹1 (100 paise)
      // Use total if netAmount is missing
      const payableAmount = order.netAmount || order.total || 0;
      const amountInPaise = Math.round(payableAmount * 100);
      const RAZORPAY_MIN_AMOUNT = 100; // ₹1 minimum

      if (amountInPaise < RAZORPAY_MIN_AMOUNT) {
        return res.status(400).json({
          error: `Order amount (₹${payableAmount}) is below minimum (₹1)`,
        });
      }

      // Check if Razorpay order already exists for this amount
      if (order.razorpayOrderId) {
        // Reuse existing Razorpay order ID
        return res.json({
          order: {
            id: order.razorpayOrderId,
            amount: amountInPaise,
            currency: parsed.data.currency || "INR",
          },
        });
      }

      // Create new Razorpay order with the verified amount from database
      const razorpayOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency: parsed.data.currency || "INR",
        receipt: `order_${order._id}`,
        notes: {
          orderId: order._id.toString(),
          orderNo: order.orderNo,
        },
      });

      // Store Razorpay order ID in our database for future reuse
      await db
        .collection("orders")
        .updateOne(
          { _id: new ObjectId(orderId) },
          { $set: { razorpayOrderId: razorpayOrder.id } },
        );

      return res.json({ order: razorpayOrder });
    } catch (err) {
      return next(err);
    }
  },
);

paymentRouter.post("/payments/webhook", async (req, res, next) => {
  try {
    console.log("Webhook received:", req.body);
    console.log("Headers:", req.headers);

    const signature = req.headers["x-razorpay-signature"] as string;

    // If no signature, log but continue (for testing)
    if (!signature) {
      console.warn("Webhook received without signature - skipping validation");
      // Still process the webhook for development/testing
    } else {
      // Verify webhook signature
      const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET;
      if (webhookSecret) {
        const expectedSignature = crypto
          .createHmac("sha256", webhookSecret)
          .update(JSON.stringify(req.body))
          .digest("hex");

        if (signature !== expectedSignature) {
          console.error("Invalid webhook signature");
          return res.status(400).json({ error: "Invalid signature" });
        }
      } else {
        console.warn(
          "RAZORPAY_WEBHOOK_SECRET not configured - webhook signature validation skipped",
        );
      }
    }

    // Handle payment events
    const event = req.body.event;
    const paymentEntity = req.body.payload?.payment?.entity;

    if (event === "payment.captured") {
      // Update order payment status
      const { Order } = await import("../models/Order.js");
      const { Payment } = await import("../models/Payment.js");
      const { getSetting } = await import("../models/Settings.js");
      const { sendPaymentConfirmationEmail, prepareInvoiceData } =
        await import("../utils/orderEmail.js");

      const order = await Order.findOne({
        razorpayOrderId: paymentEntity.order_id,
      }).populate("userId");

      if (order) {
        // Use updateOne to avoid validation issues
        await Order.updateOne(
          { _id: order._id },
          {
            $set: {
              paymentStatus: "completed",
              status: "confirmed",
              razorpayPaymentId: paymentEntity.id,
              updatedAt: new Date(),
            },
          },
        );

        // Create payment record
        const payment = new Payment({
          orderId: order._id,
          razorpayPaymentId: paymentEntity.id,
          razorpayOrderId: paymentEntity.order_id,
          razorpaySignature: signature,
          amount: paymentEntity.amount / 100,
          currency: paymentEntity.currency,
          status: "success",
        });
        await payment.save();

        // 🎉 Create invoice and send payment confirmation email
        try {
          const { createInvoiceFromOrder, getInvoiceUrl } =
            await import("../utils/invoiceGenerator.js");

          // Create invoice document
          const invoice = await createInvoiceFromOrder(order);

          // Update order with invoice ID
          await Order.updateOne(
            { _id: order._id },
            { $set: { invoiceId: invoice._id } },
          );

          // Send email with invoice link
          const invoiceUrl = getInvoiceUrl(invoice._id.toString());
          const invoiceData = await prepareInvoiceData(order);
          await sendPaymentConfirmationEmail({
            ...invoiceData,
            invoiceUrl,
          });

          console.log(
            `✅ Invoice created: ${invoice.invoiceNumber} - URL: ${invoiceUrl}`,
          );
        } catch (emailErr) {
          console.error(
            `⚠️  Failed to create invoice or send email for order ${order.orderId || order._id}:`,
            emailErr,
          );
          // Don't fail the payment webhook if email fails
        }

        // Check if auto-shipment is enabled
        const autoShipmentEnabled = await getSetting(
          "autoShipmentEnabled",
          false,
        );

        if (
          autoShipmentEnabled &&
          !order.delhiveryTrackingId &&
          order.shippingAddress
        ) {
          try {
            console.log(
              `Auto-creating shipment for order ${order.orderId || order._id}`,
            );

            const { createShipment } = await import("../utils/delhivery.js");
            const { User } = await import("../models/User.js");

            const user = await User.findById(order.userId);
            if (!user) {
              console.error("User not found for auto-shipment");
              return;
            }

            // Calculate total quantity and prepare product description
            const totalQuantity = order.items.reduce(
              (sum: number, item: any) => sum + (item.quantity || 0),
              0,
            );
            const productDesc = order.items
              .map((item: any) => `${item.name} (${item.quantity})`)
              .join(", ");
            const userName = user.firstName
              ? `${user.firstName} ${user.lastName || ""}`.trim()
              : "Customer";

            // Prepare shipment data
            const shipmentData = {
              shipments: [
                {
                  name: userName,
                  add: order.shippingAddress.street || "",
                  pin: order.shippingAddress.postalCode || "",
                  city: order.shippingAddress.city || "",
                  state: order.shippingAddress.state || "",
                  country: order.shippingAddress.country || "India",
                  phone: user.phone || "9999999999",
                  order: order.orderId || order._id.toString(),
                  payment_mode: "Prepaid" as const,
                  products_desc: productDesc,
                  cod_amount: "0",
                  order_date: order.createdAt.toISOString().split("T")[0],
                  total_amount: (order.total || 0).toString(),
                  quantity: totalQuantity.toString(),
                  weight: "500", // Default 500g
                },
              ],
              pickup_location: {
                name: "Primary",
              },
            };

            const result = await createShipment(shipmentData);

            if (result.success && result.waybill) {
              // Update order with tracking ID
              await Order.updateOne(
                { _id: order._id },
                {
                  $set: {
                    delhiveryTrackingId: result.waybill,
                    status: "processing",
                    delhiveryShipmentCreatedAt: new Date(),
                    updatedAt: new Date(),
                  },
                },
              );
              console.log(
                `Auto-shipment created successfully! Waybill: ${result.waybill}`,
              );
            } else {
              console.error(
                "Auto-shipment failed:",
                result.error || result.rmk,
              );
            }
          } catch (shipmentErr) {
            console.error("Auto-shipment error:", shipmentErr);
            // Don't fail the payment webhook if shipment fails
          }
        }

        // TODO: Send order confirmation SMS/WhatsApp
        console.log(`Payment captured for order ${order.orderId || order._id}`);
      } else {
        console.warn(
          `Order not found for Razorpay order ID: ${paymentEntity.order_id}`,
        );
      }
    } else if (event === "payment.failed") {
      const { Order } = await import("../models/Order.js");
      const order = await Order.findOne({
        razorpayOrderId: paymentEntity.order_id,
      });

      if (order) {
        // Use updateOne to avoid validation issues
        await Order.updateOne(
          { _id: order._id },
          {
            $set: {
              paymentStatus: "failed",
              updatedAt: new Date(),
            },
          },
        );
        console.log(`Payment failed for order ${order.orderId || order._id}`);
      } else {
        console.warn(
          `Order not found for Razorpay order ID: ${paymentEntity.order_id}`,
        );
      }
    }

    return res.json({ status: "ok" });
  } catch (err) {
    return next(err);
  }
});

// Verify payment signature (optional - for additional security)
paymentRouter.post("/payments/verify", async (req, res, next) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", env.RAZORPAY_KEY_SECRET ?? "")
      .update(body)
      .digest("hex");

    const isValid = expectedSignature === razorpay_signature;

    if (isValid && orderId) {
      // Update order status
      const { Order } = await import("../models/Order.js");
      const order = await Order.findById(orderId).populate("userId");

      if (order) {
        order.paymentStatus = "completed";
        order.status = "confirmed";
        order.razorpayPaymentId = razorpay_payment_id;
        await order.save();

        // Create invoice
        try {
          const { createInvoiceFromOrder, getInvoiceUrl } =
            await import("../utils/invoiceGenerator.js");

          // Create invoice document
          const invoice = await createInvoiceFromOrder(order);

          // Update order with invoice ID
          await Order.updateOne(
            { _id: order._id },
            { $set: { invoiceId: invoice._id } },
          );

          const invoiceUrl = getInvoiceUrl(invoice._id.toString());
          console.log(
            `✅ Invoice created: ${invoice.invoiceNumber} - URL: ${invoiceUrl}`,
          );
        } catch (invoiceErr) {
          console.error(
            `⚠️  Failed to create invoice for order ${order.orderId || order._id}:`,
            invoiceErr,
          );
        }
      }
    }

    return res.json({
      verified: isValid,
      message: isValid
        ? "Payment verified successfully"
        : "Payment verification failed",
    });
  } catch (err) {
    return next(err);
  }
});
