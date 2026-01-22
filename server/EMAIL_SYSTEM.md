# Email System Documentation

This document describes the email sending system implemented in the Wholesiii backend, which mirrors the functionality of the PHP website.

## Overview

The new Node.js backend uses **Nodemailer** with **SMTP (Hostinger)** to send emails, matching the PHP website's email infrastructure. The system supports:

- Order confirmations
- Invoice emails
- Shipment tracking notifications
- Password reset emails
- OTP verification emails
- Welcome emails
- Custom template-based emails (stored in MongoDB)

## Architecture

### Core Components

```
src/
├── config/
│   └── env.ts                    # Environment variables with email config
├── models/
│   └── EmailTemplate.ts          # MongoDB schema for email templates
├── utils/
│   ├── email.ts                  # Core email sending service
│   ├── invoice.ts                # Invoice and order HTML generation
│   └── orderEmail.ts             # High-level email functions for orders
└── index.ts                       # App startup with email verification
```

### Configuration (Hostinger SMTP)

```typescript
// Same credentials as PHP website
MAIL_HOST=smtp.hostinger.com
MAIL_PORT=587
MAIL_USER=noreply@wholesiii.com
MAIL_PASSWORD=Wholesiii@2025
MAIL_FROM=noreply@wholesiii.com
MAIL_FROM_NAME=Wholesiii
```

**Protocol:** TLS (port 587)
**Timeout:** 300 seconds per email
**Features:** Support for attachments, CC, BCC

## Usage Examples

### 1. Send Order Confirmation

```typescript
import { sendOrderConfirmationEmail } from "@/utils/orderEmail";

const invoiceData = {
    orderId: "ORD_12345",
    orderDate: new Date(),
    customerName: "John Doe",
    customerEmail: "john@example.com",
    customerPhone: "+91-9999999999",
    shippingAddress: {
        street: "123 Main St",
        city: "Bangalore",
        state: "Karnataka",
        postalCode: "560001",
        country: "India",
    },
    items: [
        {
            name: "Product 1",
            quantity: 2,
            price: 500,
            amount: 1000,
        },
    ],
    subtotal: 1000,
    tax: 180,
    shippingCost: 100,
    discount: 0,
    total: 1280,
    paymentMethod: "Razorpay",
    paymentStatus: "Completed",
    storeName: "Wholesiii",
    storeEmail: "noreply@wholesiii.com",
};

const success = await sendOrderConfirmationEmail(invoiceData);
if (success) {
    console.log("Order confirmation email sent!");
}
```

### 2. Send Invoice

```typescript
import { sendInvoiceEmail } from "@/utils/orderEmail";

const success = await sendInvoiceEmail(invoiceData);
```

### 3. Send Shipment Tracking Email

```typescript
import { sendShipmentEmail } from "@/utils/orderEmail";

const success = await sendShipmentEmail(
    "customer@example.com",
    "ORD_12345",
    "DL12345678",
    "2025-01-15"
);
```

### 4. Send Password Reset Email

```typescript
import { sendPasswordResetEmail } from "@/utils/orderEmail";

const resetLink = "https://wholesiii.com/reset-password?token=abc123";
const success = await sendPasswordResetEmail(
    "user@example.com",
    resetLink,
    30 // expires in 30 minutes
);
```

### 5. Send OTP Email

```typescript
import { sendOTPEmail } from "@/utils/orderEmail";

const success = await sendOTPEmail(
    "user@example.com",
    "123456",
    10 // expires in 10 minutes
);
```

### 6. Send Welcome Email

```typescript
import { sendWelcomeEmail } from "@/utils/orderEmail";

const success = await sendWelcomeEmail("new@example.com", "John");
```

### 7. Send Email Using Custom Template

```typescript
import { sendEmailUsingTemplate } from "@/utils/orderEmail";

const success = await sendEmailUsingTemplate(
    "order_confirmation", // templateId
    "customer@example.com",
    {
        orderNumber: "ORD_12345",
        customerName: "John Doe",
        orderTotal: "1280",
        // ... other replacements
    }
);
```

## Email Templates in Database

The system supports storing email templates in MongoDB, similar to the PHP website's `email_templates` table.

### EmailTemplate Model

```typescript
{
    templateId: "order_confirmation",           // Unique identifier
    name: "Order Confirmation Email",           // Display name
    subject: "Order Confirmation - {orderId}",  // Subject with placeholders
    message: "<html>...</html>",                // HTML content with placeholders
    placeholders: ["orderId", "customerName"], // Available placeholders
    type: "order_confirmation",                // Type enum
    isActive: true,                            // Enable/disable
    createdAt: Date,
    updatedAt: Date,
}
```

### Available Template Types

- `order_confirmation` - When order is placed
- `password_reset` - Password reset request
- `otp_verification` - OTP for verification
- `invoice` - Invoice email
- `shipment_tracking` - Shipment notification
- `custom` - Custom templates

### Create Template Example

```typescript
import { EmailTemplate } from "@/models/EmailTemplate";

await EmailTemplate.create({
    templateId: "order_confirmation",
    name: "Order Confirmation Email",
    subject: "Your Order {orderId} is Confirmed!",
    message: `
        <h1>Order Confirmed</h1>
        <p>Hi {customerName},</p>
        <p>Your order {orderId} has been confirmed.</p>
        <p>Total Amount: {totalAmount}</p>
    `,
    placeholders: ["orderId", "customerName", "totalAmount"],
    type: "order_confirmation",
    isActive: true,
});
```

## Low-Level Email API

For advanced use cases, use the core email utility:

```typescript
import { sendEmail, sendEmailWithTemplate, verifyEmailConnection } from "@/utils/email";

// Send basic email
const success = await sendEmail({
    to: "user@example.com",
    subject: "Hello",
    html: "<h1>Hello World</h1>",
    cc: "cc@example.com",
    bcc: "bcc@example.com",
    attachments: [
        {
            filename: "invoice.pdf",
            path: "/path/to/invoice.pdf",
        },
    ],
});

// Send with template replacements
const success = await sendEmailWithTemplate(
    "user@example.com",
    "Hello {name}",
    "<h1>Hello {name}</h1>",
    { name: "John" }
);

// Verify SMTP connection (called on app startup)
const isConnected = await verifyEmailConnection();
```

## Integration with Routes

### Example: Order Creation Endpoint

```typescript
import { sendOrderConfirmationEmail } from "@/utils/orderEmail";

router.post("/orders", async (req, res) => {
    // ... create order logic
    
    const order = await Order.create(orderData);
    
    // Send confirmation email
    const invoiceData = {
        orderId: order.orderId,
        customerEmail: order.customerEmail,
        // ... other invoice data
    };
    
    await sendOrderConfirmationEmail(invoiceData);
    
    res.json({ success: true, order });
});
```

### Example: Password Reset Endpoint

```typescript
import { sendPasswordResetEmail } from "@/utils/orderEmail";

router.post("/forgot-password", async (req, res) => {
    const user = await User.findOne({ email: req.body.email });
    const resetToken = generateToken();
    
    // Save reset token in DB with expiry
    await user.updateOne({ resetToken, resetTokenExpiry: Date.now() + 30 * 60 * 1000 });
    
    const resetLink = `https://wholesiii.com/reset?token=${resetToken}`;
    await sendPasswordResetEmail(user.email, resetLink);
    
    res.json({ success: true });
});
```

## Environment Setup

### 1. Update `.env` file

Copy from `.env.example`:

```bash
cd wholesii/server
cp .env.example .env
```

Add email credentials:

```
MAIL_HOST=smtp.hostinger.com
MAIL_PORT=587
MAIL_USER=noreply@wholesiii.com
MAIL_PASSWORD=your_actual_password_here
MAIL_FROM=noreply@wholesiii.com
MAIL_FROM_NAME=Wholesiii
```

### 2. Install Dependencies

```bash
npm install
```

This installs `nodemailer` and type definitions.

### 3. Start the Server

```bash
npm run dev
```

You should see in logs:
```
✅ Email service ready
```

## Comparison: PHP vs Node.js Implementation

| Feature | PHP Website | Node.js Backend |
|---------|------------|-----------------|
| **SMTP Server** | Hostinger (smtp.hostinger.com:587) | Hostinger (smtp.hostinger.com:587) |
| **Protocol** | CodeIgniter Email Library | Nodemailer |
| **Authentication** | TLS | TLS |
| **Template System** | Database (CodeIgniter) | MongoDB (Mongoose) |
| **Placeholder Syntax** | `{key}` | `{key}` |
| **Email Functions** | `sendMail()` | `sendEmail()`, `sendEmailWithTemplate()` |
| **Invoice Generation** | Custom HTML templates | Dynamic HTML generation |
| **Attachments** | Yes | Yes |
| **CC/BCC** | Yes | Yes |

## Error Handling

All email functions return a `boolean`:
- `true` = Email sent successfully
- `false` = Failed to send

Check console logs for detailed error messages.

```typescript
const success = await sendOrderConfirmationEmail(invoiceData);

if (!success) {
    console.error("Email failed to send");
    // Handle error: log to DB, notify admin, etc.
}
```

## Testing

### Test Email Connection

```bash
npm run test
```

Or programmatically:

```typescript
import { verifyEmailConnection } from "@/utils/email";

const isConnected = await verifyEmailConnection();
console.log(isConnected ? "✅ Connected" : "❌ Failed");
```

### Send Test Email

```typescript
import { sendEmail } from "@/utils/email";

const success = await sendEmail({
    to: "your-email@example.com",
    subject: "Test Email",
    html: "<h1>This is a test</h1>",
});
```

## Security Notes

1. **Never commit `.env` file** - Add to `.gitignore`
2. **Use strong passwords** - For SMTP authentication
3. **Limit email recipients** - Validate email addresses
4. **Rate limiting** - Implement rate limiting on email endpoints
5. **Log sensitive data** - Avoid logging email passwords
6. **HTTPS only** - Always use in production

## Troubleshooting

### Email Not Sending

1. Check `.env` file for correct credentials
2. Verify `MAIL_PASSWORD` is correct in Hostinger panel
3. Check firewall/network allows port 587
4. Look for error in server logs
5. Verify MongoDB is running (for templates)

### Template Not Found

Ensure template exists in MongoDB:

```typescript
const template = await EmailTemplate.findOne({ templateId: "order_confirmation" });
console.log(template);
```

### Connection Timeout

- Increase `smtp_timeout` in email config
- Check network connectivity
- Try different SMTP port (465 for SSL, 587 for TLS)

## Future Enhancements

- [ ] Email queue system (Bull/Redis)
- [ ] Email preview endpoint
- [ ] Bounce/delivery tracking
- [ ] A/B testing templates
- [ ] Automatic email retry
- [ ] Batch email sending
- [ ] Email analytics
- [ ] Multi-language support

## Support

For issues or questions, refer to:
- Nodemailer docs: https://nodemailer.com/
- Hostinger SMTP: https://support.hostinger.com/en/articles/4635567-how-to-connect-to-hostinger-smtp-server
- MongoDB docs: https://docs.mongodb.com/
