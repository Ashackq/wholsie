import { Request, Response, NextFunction } from "express";
import { Order } from "../models/Order.js";
import { User } from "../models/User.js";
import { Product } from "../models/Product.js";
import { Review } from "../models/Review.js";
import { getInvoiceUrl } from "../utils/invoiceGenerator.js";
import { env } from "../config/env.js";

/**
 * Get all orders (admin)
 */
export async function getOrders(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { limit = 20, offset = 0, status } = req.query;

    const filter: any = {};
    if (status) {
      filter.status = status;
    }

    const orders = await Order.find(filter)
      .populate("userId", "name firstName lastName phone email address")
      .populate("invoiceId", "invoiceNumber invoiceDate")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string))
      .skip(parseInt(offset as string));

    // Add invoice URL to each order
    const ordersWithInvoiceUrl = orders.map((order) => {
      const orderObj: any = order.toObject();
      if (orderObj.invoiceId) {
        const invoiceId =
          typeof orderObj.invoiceId === "object" && orderObj.invoiceId._id
            ? orderObj.invoiceId._id.toString()
            : orderObj.invoiceId.toString();
        orderObj.invoiceUrl = getInvoiceUrl(invoiceId);
      }
      return orderObj;
    });

    const total = await Order.countDocuments(filter);

    res.json({
      success: true,
      data: ordersWithInvoiceUrl,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get single order (admin)
 */
export async function getOrder(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { orderId } = req.params;

    // Try to find by _id first
    let order = await Order.findById(orderId)
      .populate("userId", "name firstName lastName phone email address")
      .populate("items.productId", "name image price")
      .populate("invoiceId", "invoiceNumber invoiceDate");

    // Fallback to search by orderId field
    if (!order) {
      order = await Order.findOne({ orderId })
        .populate("userId", "name firstName lastName phone email address")
        .populate("items.productId", "name image price")
        .populate("invoiceId", "invoiceNumber invoiceDate");
    }

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const orderObj: any = order.toObject();
    if (orderObj.invoiceId) {
      const invoiceId =
        typeof orderObj.invoiceId === "object" && orderObj.invoiceId._id
          ? orderObj.invoiceId._id.toString()
          : orderObj.invoiceId.toString();
      orderObj.invoiceUrl = getInvoiceUrl(invoiceId);
    }

    res.json({
      success: true,
      data: orderObj,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update order status (admin)
 */
export async function updateOrderStatus(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const validStatuses = [
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
    ];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: "Invalid status",
        validStatuses,
      });
    }

    const existingOrder = await Order.findById(orderId).populate(
      "userId",
      "name firstName lastName phone email address",
    );

    if (!existingOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    const previousStatus = existingOrder.status;

    const order = await Order.findByIdAndUpdate(
      orderId,
      { status, updatedAt: new Date() },
      { new: true },
    ).populate("userId", "name firstName lastName phone email address");

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (status === "shipped" && previousStatus !== "shipped") {
      try {
        const apiKey = env.AISENSY_API_KEY;
        const trackingId = (order as any).delhiveryTrackingId;
        const phone =
          (order as any)?.userId?.phone || (order as any)?.customerPhone;

        if (apiKey && trackingId && phone) {
          const { sendOrderShippedWithTracking } = await import(
            "../utils/aisensy.js"
          );
          await sendOrderShippedWithTracking(apiKey, phone, trackingId);
        }
      } catch (waErr) {
        console.error("⚠️  Failed to send tracking link via Aisensy:", waErr);
      }
    }

    res.json({
      success: true,
      message: "Order status updated",
      data: order,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get dashboard stats (admin)
 */
export async function getDashboardStats(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    // Total orders
    const totalOrders = await Order.countDocuments();

    // Total revenue
    const revenueData = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$total" },
        },
      },
    ]);
    const totalRevenue = revenueData[0]?.totalRevenue || 0;

    // Recent orders
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("userId", "name firstName lastName");

    // Total customers
    const totalCustomers = await User.countDocuments({ role: "customer" });

    // Total products
    const totalProducts = await Product.countDocuments({ status: "active" });

    // Pending reviews
    const pendingReviews = await Review.countDocuments({ status: "pending" });

    // Order status breakdown
    const orderStatus = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        totalOrders,
        totalRevenue,
        totalCustomers,
        totalProducts,
        pendingReviews,
        orderStatus,
        recentOrders,
      },
    });
  } catch (error) {
    next(error);
  }
}
