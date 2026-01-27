import mongoose, { Schema, Document } from "mongoose";

interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
  amount: number;
}

interface InvoiceAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface IInvoice extends Document {
  invoiceNumber: string; // e.g., "INV-2026-001"
  orderId: mongoose.Types.ObjectId; // Reference to Order
  orderNumber: string; // e.g., "ORD-123456"
  invoiceDate: Date;

  // Customer Details
  customerName: string;
  customerEmail: string;
  customerPhone?: string;

  // Addresses
  billingAddress: InvoiceAddress;
  shippingAddress: InvoiceAddress;

  // Items
  items: InvoiceItem[];

  // Amounts
  subtotal: number;
  tax: number;
  shippingCost: number;
  platformFee?: number;
  discount: number;
  total: number;

  // Payment Info
  paymentMethod?: string;
  paymentStatus: string; // 'paid', 'pending', 'failed'

  // Store Details
  storeName: string;
  storeEmail?: string;
  storePhone?: string;
  storeAddress?: string;
  gstNumber?: string;

  // Notes
  notes?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: {
      type: String,
      unique: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
    },
    invoiceDate: {
      type: Date,
      default: Date.now,
    },

    // Customer Details
    customerName: {
      type: String,
      required: true,
    },
    customerEmail: {
      type: String,
      required: true,
    },
    customerPhone: String,

    // Addresses
    billingAddress: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: { type: String, default: "India" },
    },
    shippingAddress: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: { type: String, default: "India" },
    },

    // Items
    items: [
      {
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        amount: { type: Number, required: true },
      },
    ],

    // Amounts
    subtotal: {
      type: Number,
      required: true,
    },
    tax: {
      type: Number,
      default: 0,
    },
    shippingCost: {
      type: Number,
      default: 0,
    },
    platformFee: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
    },

    // Payment Info
    paymentMethod: String,
    paymentStatus: {
      type: String,
      enum: ["paid", "pending", "failed"],
      default: "pending",
    },

    // Store Details
    storeName: {
      type: String,
      default: "Wholesiii",
    },
    storeEmail: String,
    storePhone: String,
    storeAddress: String,
    gstNumber: String,

    // Notes
    notes: String,
  },
  {
    timestamps: true,
  },
);

// Generate invoice number automatically
InvoiceSchema.pre("save", async function (next) {
  if (!this.invoiceNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model("Invoice").countDocuments();
    this.invoiceNumber = `INV-${year}-${String(count + 1).padStart(6, "0")}`;
  }
  next();
});

export const Invoice = mongoose.model<IInvoice>("Invoice", InvoiceSchema);
