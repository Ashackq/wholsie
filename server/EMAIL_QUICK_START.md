# Wholesiii Email System - Quick Start Guide

## What's Been Created

A complete email system for the Node.js backend that mirrors the PHP website's functionality.

## Files Created/Modified

### New Files
1. **[src/utils/email.ts](src/utils/email.ts)** - Core SMTP email service
2. **[src/utils/invoice.ts](src/utils/invoice.ts)** - Invoice and order HTML generation
3. **[src/utils/orderEmail.ts](src/utils/orderEmail.ts)** - High-level email functions
4. **[src/models/EmailTemplate.ts](src/models/EmailTemplate.ts)** - MongoDB template schema
5. **[EMAIL_SYSTEM.md](EMAIL_SYSTEM.md)** - Complete documentation

### Modified Files
1. **[package.json](package.json)** - Added nodemailer dependency
2. **[src/config/env.ts](src/config/env.ts)** - Added email configuration variables
3. **[src/index.ts](src/index.ts)** - Added email verification on startup
4. **[.env.example](.env.example)** - Added email credentials

## Quick Setup

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment
Edit `.env` file and add:
```
MAIL_HOST=smtp.hostinger.com
MAIL_PORT=587
MAIL_USER=noreply@wholesiii.com
MAIL_PASSWORD=your_password_here
MAIL_FROM=noreply@wholesiii.com
MAIL_FROM_NAME=Wholesiii
```

### Step 3: Start Server
```bash
npm run dev
```

You should see: `✅ Email service ready`

## Available Functions

### Order-Related Emails
```typescript
import {
    sendOrderConfirmationEmail,
    sendInvoiceEmail,
    sendShipmentEmail,
} from "@/utils/orderEmail";

// Send when order is created
await sendOrderConfirmationEmail(invoiceData);

// Send invoice
await sendInvoiceEmail(invoiceData);

// Send tracking information
await sendShipmentEmail(email, orderId, trackingNumber, estimatedDelivery);
```

### User-Related Emails
```typescript
import {
    sendPasswordResetEmail,
    sendOTPEmail,
    sendWelcomeEmail,
} from "@/utils/orderEmail";

// Password reset
await sendPasswordResetEmail(email, resetLink, expiryMinutes);

// OTP verification
await sendOTPEmail(email, otp, expiryMinutes);

// Welcome new customer
await sendWelcomeEmail(email, name);
```

### Template-Based Emails
```typescript
import { sendEmailUsingTemplate } from "@/utils/orderEmail";

// Send using stored template from MongoDB
await sendEmailUsingTemplate("order_confirmation", email, {
    orderNumber: "ORD_12345",
    customerName: "John",
    orderTotal: "1280",
});
```

## Integration Example: Order Creation

```typescript
// In your order route
import { sendOrderConfirmationEmail } from "@/utils/orderEmail";

router.post("/orders", async (req, res) => {
    const order = await Order.create(orderData);
    
    // Send confirmation email
    const invoiceData = {
        orderId: order.orderId,
        orderDate: order.createdAt,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        items: order.items,
        subtotal: order.subtotal,
        tax: order.tax,
        shippingCost: order.shippingCost,
        discount: order.discount,
        total: order.total,
        shippingAddress: order.shippingAddress,
    };
    
    await sendOrderConfirmationEmail(invoiceData);
    
    res.json({ success: true, order });
});
```

## Key Features

✅ **SMTP Email** - Uses Hostinger (same as PHP site)
✅ **Order Confirmation** - Professional HTML emails
✅ **Invoices** - Auto-generated invoice emails
✅ **Templates** - Database-backed email templates
✅ **Attachments** - Support for file attachments
✅ **Placeholder System** - `{name}` → `John` replacements
✅ **Error Handling** - Graceful error handling with logging
✅ **Environment Config** - Easy SMTP configuration
✅ **Startup Verification** - Tests email connection on app start

## Email Types Supported

1. **Order Confirmations** - When order is placed
2. **Invoices** - Professional invoice emails
3. **Shipment Tracking** - When order ships
4. **Password Reset** - With expiring reset links
5. **OTP Verification** - For account security
6. **Welcome Emails** - For new customers
7. **Custom Templates** - Any template from MongoDB

## Configuration

### Same as PHP Website
- **Host:** smtp.hostinger.com
- **Port:** 587 (TLS)
- **User:** noreply@wholesiii.com
- **Protocol:** SMTP with TLS encryption

### In Node.js Backend
```typescript
// Auto-configured in env.ts
MAIL_HOST=smtp.hostinger.com
MAIL_PORT=587
MAIL_USER=noreply@wholesiii.com
MAIL_PASSWORD=Wholesiii@2025
```

## Architecture Comparison

### PHP Website (CodeIgniter)
```
Common_model.php
  └─ sendMail($templateId, $to, $bodyArr, $subjectArr)
       └─ CodeIgniter Email Library
            └─ Hostinger SMTP
```

### Node.js Backend
```
orderEmail.ts
  └─ sendOrderConfirmationEmail(invoiceData)
       └─ email.ts (sendEmail, sendEmailWithTemplate)
            └─ Nodemailer
                 └─ Hostinger SMTP
```

## Database Setup (Optional)

To use template system, create email templates in MongoDB:

```typescript
import { EmailTemplate } from "@/models/EmailTemplate";

// Create a template
await EmailTemplate.create({
    templateId: "order_confirmation",
    name: "Order Confirmation",
    subject: "Order Confirmed - {orderId}",
    message: "<h1>Order {orderId} confirmed!</h1>",
    placeholders: ["orderId"],
    type: "order_confirmation",
    isActive: true,
});
```

## Error Handling

All functions return boolean:
```typescript
const success = await sendOrderConfirmationEmail(data);

if (!success) {
    // Email failed
    console.error("Failed to send email");
    // Can log to database, notify admin, etc.
}
```

Check server logs for detailed error messages.

## Testing

Test SMTP connection:
```typescript
import { verifyEmailConnection } from "@/utils/email";

const isConnected = await verifyEmailConnection();
console.log(isConnected ? "✅ Ready" : "❌ Failed");
```

## Next Steps

1. ✅ Install dependencies (`npm install`)
2. ✅ Configure `.env` with Hostinger credentials
3. ✅ Integrate into order routes
4. ✅ Create email templates in MongoDB (optional)
5. ✅ Test with sample order
6. ✅ Deploy to production

## For Complete Documentation

See [EMAIL_SYSTEM.md](EMAIL_SYSTEM.md) for:
- Detailed API reference
- Advanced usage patterns
- Troubleshooting guide
- Security notes
- Future enhancements
