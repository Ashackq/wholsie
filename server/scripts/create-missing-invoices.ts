/**
 * Script to create invoices for orders that have completed payment but no invoice
 */
import { connectToDatabase } from "../src/config/db.js";
import { Order } from "../src/models/Order.js";
import { User } from "../src/models/User.js";
import { Invoice } from "../src/models/Invoice.js";
import { getInvoiceUrl } from "../src/utils/invoiceGenerator.js";

// Ensure User model is registered
if (!User) {
  throw new Error("User model not loaded");
}

async function createMissingInvoices() {
  try {
    await connectToDatabase();
    console.log("✅ Connected to database");

    // Find all paid orders without invoices (don't populate yet)
    const ordersWithoutInvoices = await Order.find({
      paymentStatus: "completed",
      invoiceId: { $exists: false },
    }).sort({ createdAt: -1 });

    console.log(
      `Found ${ordersWithoutInvoices.length} orders without invoices`,
    );

    for (const order of ordersWithoutInvoices) {
      try {
        // Manually populate userId
        const populatedOrder = await Order.findById(order._id).populate(
          "userId",
        );

        if (!populatedOrder) {
          console.log(`⚠️  Order ${order.orderId || order._id} not found`);
          continue;
        }

        // Get user data
        const user = populatedOrder.userId as any;

        // Create invoice manually
        const invoice = new Invoice({
          orderId: populatedOrder._id,
          orderNumber: populatedOrder.orderId,
          invoiceDate: new Date(),
          customerName: user.name || "Customer",
          customerEmail: user.email,
          customerPhone: user.phone,
          billingAddress: {
            street: populatedOrder.shippingAddress?.street,
            city: populatedOrder.shippingAddress?.city,
            state: populatedOrder.shippingAddress?.state,
            postalCode: populatedOrder.shippingAddress?.postalCode,
            country: populatedOrder.shippingAddress?.country || "India",
          },
          shippingAddress: {
            street: populatedOrder.shippingAddress?.street,
            city: populatedOrder.shippingAddress?.city,
            state: populatedOrder.shippingAddress?.state,
            postalCode: populatedOrder.shippingAddress?.postalCode,
            country: populatedOrder.shippingAddress?.country || "India",
          },
          items: populatedOrder.items.map((item: any) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            amount: item.price * item.quantity,
          })),
          subtotal: populatedOrder.subtotal || 0,
          shippingCost: populatedOrder.shippingCost || 0,
          discount: populatedOrder.discount || 0,
          total: populatedOrder.total,
          paymentMethod: populatedOrder.paymentMethod,
          paymentStatus:
            populatedOrder.paymentStatus === "completed" ? "paid" : "pending",
          storeName: process.env.STORE_NAME || "Wholesiii",
          storeEmail: process.env.STORE_EMAIL,
          storePhone: process.env.STORE_PHONE,
          storeAddress: process.env.STORE_ADDRESS,
          gstNumber: process.env.GST_NUMBER,
          notes: populatedOrder.notes,
        });

        await invoice.save();

        // Update order with invoice ID
        await Order.updateOne(
          { _id: order._id },
          { $set: { invoiceId: invoice._id } },
        );

        const invoiceUrl = getInvoiceUrl(invoice._id.toString());
        console.log(
          `✅ Created invoice ${invoice.invoiceNumber} for order ${order.orderId || order._id}`,
        );
        console.log(`   URL: ${invoiceUrl}`);
      } catch (err) {
        console.error(
          `❌ Failed to create invoice for order ${order.orderId || order._id}:`,
          err,
        );
      }
    }

    console.log("\n✅ Invoice creation complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

createMissingInvoices();
