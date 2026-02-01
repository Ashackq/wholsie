import { Invoice, type IInvoice } from "../models/Invoice.js";
import type { Document } from "mongoose";

interface OrderItem {
  productId?: any;
  name?: string | null;
  price?: number | null;
  quantity?: number | null;
  image?: string | null;
}

interface ShippingAddress {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
}

interface OrderDocument extends Document {
  _id: any;
  orderId: string;
  userId: any;
  items: OrderItem[];
  shippingAddress?: ShippingAddress | null;
  subtotal?: number | null;
  shippingCost?: number | null;
  discount?: number | null;
  total?: number | null;
  paymentMethod?: string | null;
  paymentStatus: string;
  notes?: string | null;
  createdAt: Date;
}

interface UserDocument {
  name?: string;
  email: string;
  phone?: string;
}

/**
 * Create an invoice from an order
 * @param order Order document (populated with userId)
 * @returns Created invoice document
 */
export async function createInvoiceFromOrder(
  order: OrderDocument,
): Promise<IInvoice> {
  const user = order.userId as unknown as UserDocument;

  // Prepare invoice data
  const invoiceData = {
    orderId: order._id,
    orderNumber: order.orderId,
    invoiceDate: new Date(),

    // Customer details
    customerName: user.name || "Customer",
    customerEmail: user.email,
    customerPhone: user.phone,

    // Addresses (using shipping address for both billing and shipping)
    billingAddress: {
      street: order.shippingAddress?.street,
      city: order.shippingAddress?.city,
      state: order.shippingAddress?.state,
      postalCode: order.shippingAddress?.postalCode,
      country: order.shippingAddress?.country || "India",
    },
    shippingAddress: {
      street: order.shippingAddress?.street,
      city: order.shippingAddress?.city,
      state: order.shippingAddress?.state,
      postalCode: order.shippingAddress?.postalCode,
      country: order.shippingAddress?.country || "India",
    },

    // Items
    items: order.items.map((item) => ({
      name: item.name || "Product",
      quantity: item.quantity || 1,
      price: item.price || 0,
      amount: (item.price || 0) * (item.quantity || 1),
    })),

    // Amounts
    subtotal: order.subtotal || 0,
    shippingCost: order.shippingCost || 0,
    discount: order.discount || 0,
    total: order.total,

    // Payment info
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus === "completed" ? "paid" : "pending",

    // Store details (from env)
    storeName: process.env.STORE_NAME || "Wholesiii",
    storeEmail: process.env.STORE_EMAIL,
    storePhone: process.env.STORE_PHONE,
    storeAddress: process.env.STORE_ADDRESS,
    gstNumber: process.env.GST_NUMBER,

    // Notes
    notes: order.notes,
  };

  // Create invoice
  const invoice = new Invoice(invoiceData);
  await invoice.save();

  return invoice;
}

/**
 * Get invoice URL for frontend
 * @param invoiceId Invoice ID
 * @returns Invoice URL
 */
export function getInvoiceUrl(invoiceId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return `${baseUrl}/invoice/${invoiceId}`;
}
