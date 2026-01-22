# Email Templates - Order Management

This document provides comprehensive email templates for order management and integration instructions.

## 📧 Available Templates

### 1. **Order Confirmation + Invoice**
Professional invoice-style email with complete order details, payment information, and shipping address.

**When to use:** Immediately after order creation  
**File:** `src/utils/emailTemplates.ts`  
**Function:** `generateOrderConfirmationInvoiceTemplate()`

**Features:**
- ✅ Professional invoice layout with itemized list
- ✅ Order and payment information
- ✅ Shipping address display
- ✅ Summary with tax, shipping, and discounts
- ✅ "What happens next" timeline
- ✅ Call-to-action button
- ✅ Support contact information
- ✅ Mobile responsive design

**Data Required:**
```typescript
{
    orderId: string;
    orderDate: Date;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    shippingAddress: {
        street?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
    };
    items: Array<{
        name: string;
        quantity: number;
        price: number;
        amount: number;
    }>;
    subtotal: number;
    tax: number;
    shippingCost: number;
    discount: number;
    total: number;
    paymentMethod?: string;
    paymentStatus?: string;
    storeName?: string;
    storeEmail?: string;
    storePhone?: string;
    storeAddress?: string;
}
```

---

### 2. **Order Shipped**
Tracking and delivery information email with timeline visualization.

**When to use:** When order is picked and packed, ready for shipment  
**File:** `src/utils/emailTemplates.ts`  
**Function:** `generateOrderShippedTemplate()`

**Features:**
- ✅ Prominent tracking number display
- ✅ Estimated delivery date
- ✅ Shipment timeline with status indicators
- ✅ Courier partner information
- ✅ Helpful tracking tips
- ✅ What to do when package arrives
- ✅ Track package CTA button
- ✅ Animated status indicators

**Data Required:**
```typescript
{
    orderId: string;
    customerName: string;
    trackingNumber: string;
    courierName?: string;          // e.g., "Delhivery"
    estimatedDelivery?: string;    // Date string
    storeName?: string;
    storePhone?: string;
}
```

---

### 3. **Order Cancelled**
Order cancellation confirmation with refund information and timeline.

**When to use:** When customer requests cancellation or order is cancelled for any reason  
**File:** `src/utils/emailTemplates.ts`  
**Function:** `generateOrderCancelledTemplate()`

**Features:**
- ✅ Clear cancellation confirmation
- ✅ Refund amount highlighted
- ✅ Refund processing timeline
- ✅ Refund method and estimated timeline
- ✅ Cancellation reason (if provided)
- ✅ Important notes and instructions
- ✅ Feedback section
- ✅ Re-engagement CTA

**Data Required:**
```typescript
{
    orderId: string;
    customerName: string;
    cancellationReason?: string;     // e.g., "Customer Request"
    refundAmount: number;
    refundMethod?: string;            // e.g., "Credit Card"
    refundTimeline?: string;          // e.g., "5-7 business days"
    storeName?: string;
    storeEmail?: string;
    storePhone?: string;
}
```

---

## 🔧 Integration Guide

### Step 1: Import Templates

```typescript
import {
    generateOrderConfirmationInvoiceTemplate,
    generateOrderShippedTemplate,
    generateOrderCancelledTemplate,
} from "@/utils/emailTemplates";
```

### Step 2: Use in Order Creation Route

```typescript
import { sendEmail } from "@/utils/email";
import { generateOrderConfirmationInvoiceTemplate } from "@/utils/emailTemplates";

router.post("/orders", async (req, res) => {
    try {
        // Create order
        const order = await Order.create(orderData);

        // Prepare data for email template
        const emailData = {
            orderId: order.orderId,
            orderDate: order.createdAt,
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            customerPhone: order.customerPhone,
            shippingAddress: order.shippingAddress,
            items: order.items,
            subtotal: order.subtotal,
            tax: order.tax,
            shippingCost: order.shippingCost,
            discount: order.discount,
            total: order.total,
            paymentMethod: order.paymentMethod,
            paymentStatus: "Completed",
            storeName: "Wholesiii",
            storeEmail: "support@wholesiii.com",
            storePhone: "+91-9999999999",
        };

        // Generate HTML using template
        const html = generateOrderConfirmationInvoiceTemplate(emailData);

        // Send email
        const success = await sendEmail({
            to: order.customerEmail,
            subject: `Order Confirmation - ${order.orderId}`,
            html: html,
        });

        res.json({
            success: true,
            order,
            emailSent: success,
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to create order" });
    }
});
```

### Step 3: Use in Shipment Route

```typescript
import { sendEmail } from "@/utils/email";
import { generateOrderShippedTemplate } from "@/utils/emailTemplates";

router.post("/orders/:orderId/ship", async (req, res) => {
    try {
        const { trackingNumber, estimatedDelivery } = req.body;
        const order = await Order.findOne({ orderId: req.params.orderId });

        // Update order
        order.status = "shipped";
        order.trackingNumber = trackingNumber;
        await order.save();

        // Generate and send email
        const emailData = {
            orderId: order.orderId,
            customerName: order.customerName,
            trackingNumber: trackingNumber,
            courierName: "Delhivery",
            estimatedDelivery: estimatedDelivery,
            storeName: "Wholesiii",
            storePhone: "+91-9999999999",
        };

        const html = generateOrderShippedTemplate(emailData);

        const success = await sendEmail({
            to: order.customerEmail,
            subject: `Your Order ${order.orderId} is Shipped!`,
            html: html,
        });

        res.json({
            success: true,
            message: "Shipment notification sent",
            emailSent: success,
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to ship order" });
    }
});
```

### Step 4: Use in Cancellation Route

```typescript
import { sendEmail } from "@/utils/email";
import { generateOrderCancelledTemplate } from "@/utils/emailTemplates";

router.post("/orders/:orderId/cancel", async (req, res) => {
    try {
        const { reason } = req.body;
        const order = await Order.findOne({ orderId: req.params.orderId });

        // Calculate refund amount
        const refundAmount = order.total;

        // Update order
        order.status = "cancelled";
        order.cancellationReason = reason;
        await order.save();

        // If payment was processed, process refund here
        // await processRefund(order.paymentId, refundAmount);

        // Generate and send email
        const emailData = {
            orderId: order.orderId,
            customerName: order.customerName,
            cancellationReason: reason,
            refundAmount: refundAmount,
            refundMethod: "Original Payment Method",
            refundTimeline: "5-7 business days",
            storeName: "Wholesiii",
            storeEmail: "support@wholesiii.com",
            storePhone: "+91-9999999999",
        };

        const html = generateOrderCancelledTemplate(emailData);

        const success = await sendEmail({
            to: order.customerEmail,
            subject: `Order Cancellation Confirmed - ${order.orderId}`,
            html: html,
        });

        res.json({
            success: true,
            message: "Order cancelled and notification sent",
            emailSent: success,
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to cancel order" });
    }
});
```

---

## 📋 Best Practices

### Email Timing
- **Order Confirmation:** Send immediately after payment confirmation
- **Shipment Notification:** Send within a few hours of marking as shipped
- **Cancellation Email:** Send immediately after processing cancellation

### Data Validation
Always validate and format data before passing to templates:

```typescript
const emailData = {
    // ... other fields
    total: parseFloat(order.total.toFixed(2)),
    tax: parseFloat(order.tax.toFixed(2)),
    orderDate: new Date(order.createdAt),
    // ...
};
```

### Error Handling
```typescript
try {
    const html = generateOrderConfirmationInvoiceTemplate(emailData);
    const success = await sendEmail({
        to: customerEmail,
        subject: "Your Order",
        html: html,
    });
    if (!success) {
        console.error("Failed to send email");
        // Log to database, notify admin, etc.
    }
} catch (error) {
    console.error("Email generation error:", error);
    // Handle gracefully
}
```

### Customization
You can customize templates by:
1. Modifying colors (change HEX values in style sections)
2. Adding/removing sections
3. Changing company information (storeName, storeEmail, storePhone)
4. Adjusting timelines and messages

---

## 🎨 Template Features

### Responsive Design
All templates are mobile-responsive and work on:
- Desktop email clients (Outlook, Gmail, Apple Mail)
- Mobile email clients (Gmail App, Apple Mail, Outlook Mobile)
- Webmail (Gmail, Yahoo, Outlook.com)

### Accessibility
- Clear typography hierarchy
- High contrast colors for readability
- Semantic HTML structure
- Alt text support for images

### Performance
- Inline CSS for reliability
- No external dependencies
- Optimized for email rendering
- Fast loading times

---

## 📊 Email Copy Guidelines

### Order Confirmation
- ✅ Thank customer for order
- ✅ Show what's happening next
- ✅ Provide order details clearly
- ✅ Include support contact

### Shipment
- ✅ Celebrate the shipment
- ✅ Provide tracking clearly
- ✅ Set expectations (delivery date)
- ✅ Give tracking tips

### Cancellation
- ✅ Confirm cancellation clearly
- ✅ Show refund details prominently
- ✅ Set refund timeline expectations
- ✅ Offer support and re-engagement

---

## 🔍 Testing

### Test Email Addresses
Use test addresses to verify templates:
- `test@example.com`
- `test+order@example.com`
- Your personal email

### Check Points
- [ ] All text displays correctly
- [ ] Links are clickable
- [ ] Images load (if any)
- [ ] Layout looks good on mobile
- [ ] Colors are correct
- [ ] Contact info is accurate
- [ ] No broken HTML

### Browser/Client Testing
Test in:
- Gmail (web & app)
- Outlook (web & desktop)
- Apple Mail
- Yahoo Mail

---

## 📌 Troubleshooting

### Template Not Rendering
- Ensure all required fields are provided
- Check email client supports HTML (most do)
- Verify no special characters in data

### Links Not Working
- Check URL formatting
- Ensure full URLs (https://)
- Test links in actual email

### Styling Issues
- Email clients have CSS limitations
- Inline styles work better than classes
- Use tables for layout compatibility
- Test in multiple clients

---

## 📞 Support

For questions about templates:
- Check template code in `src/utils/emailTemplates.ts`
- Review example integrations above
- Test with sample data first
- Check email logs for errors

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 2026 | Initial release with 3 templates |

---

**Last Updated:** January 2026  
**Author:** Email Template System  
**Status:** Production Ready
