# 🚀 Email System - Visual Quick Guide

## What You Have Now

```
BEFORE                          AFTER
══════════════════════════════════════════════════════════════

PHP Website                     Node.js Backend
├── No email system             ├── Complete email system
├── Limited to PHP              ├── Full Node.js/TypeScript
└── Manual implementation       └── Automated, reusable

                                ✨ NEW FEATURES ✨
                                • Order confirmations
                                • Invoices
                                • Shipment tracking
                                • Password resets
                                • OTP emails
                                • Welcome emails
                                • Templates from DB
```

---

## File Overview

### 📁 Files You Use

```
src/utils/
├── email.ts              ← Low-level API
│   └─ sendEmail()
│   └─ sendEmailWithTemplate()
│   └─ verifyEmailConnection()
│
├── orderEmail.ts         ← High-level functions (USE THIS!)
│   ├─ sendOrderConfirmationEmail()
│   ├─ sendInvoiceEmail()
│   ├─ sendShipmentEmail()
│   ├─ sendPasswordResetEmail()
│   ├─ sendOTPEmail()
│   ├─ sendWelcomeEmail()
│   └─ sendEmailUsingTemplate()
│
└── invoice.ts            ← HTML generation
    ├─ generateInvoiceHTML()
    └─ generateOrderConfirmationHTML()
```

---

## 🔌 How to Integrate

### Step 1: Import
```typescript
import { sendOrderConfirmationEmail } from "@/utils/orderEmail";
```

### Step 2: Call Function
```typescript
const success = await sendOrderConfirmationEmail(invoiceData);
```

### Step 3: Handle Result
```typescript
if (success) {
    console.log("Email sent!");
} else {
    console.error("Email failed");
}
```

---

## 📧 Email Types at a Glance

| Email Type | Function | Recipient | When |
|------------|----------|-----------|------|
| 📦 Order Confirmation | `sendOrderConfirmationEmail()` | Customer | Order created |
| 📄 Invoice | `sendInvoiceEmail()` | Customer | Payment confirmed |
| 📮 Shipment | `sendShipmentEmail()` | Customer | Order shipped |
| 🔑 Password Reset | `sendPasswordResetEmail()` | User | Forgot password |
| 🔐 OTP | `sendOTPEmail()` | User | Verification needed |
| 👋 Welcome | `sendWelcomeEmail()` | New user | Registration |
| 📋 Template | `sendEmailUsingTemplate()` | Any | Custom emails |

---

## 🔄 Workflow Example

```
Customer Places Order
        ↓
        ├─→ Order saved to DB
        │
        ├─→ sendOrderConfirmationEmail()
        │   └─→ generateOrderConfirmationHTML()
        │       └─→ Email with order details
        │
        └─→ Response: { success: true, order }
```

---

## 📊 Configuration

### What Was Added to `.env`
```env
MAIL_HOST=smtp.hostinger.com
MAIL_PORT=587
MAIL_USER=noreply@wholesiii.com
MAIL_PASSWORD=your_password_here
MAIL_FROM=noreply@wholesiii.com
MAIL_FROM_NAME=Wholesiii
```

### What to Update
```env
⚠️  Only change this line:
MAIL_PASSWORD=Wholesiii@2025  ← Update to actual password
```

---

## 🎯 Common Patterns

### Pattern 1: Order Route
```typescript
router.post('/orders', async (req, res) => {
    const order = await Order.create(data);
    
    await sendOrderConfirmationEmail({
        orderId: order.orderId,
        customerEmail: order.customerEmail,
        // ... other data
    });
    
    res.json({ success: true, order });
});
```

### Pattern 2: Payment Callback
```typescript
app.post('/payment-webhook', async (req, res) => {
    const order = await Order.findById(req.body.orderId);
    order.paymentStatus = 'completed';
    await order.save();
    
    await sendInvoiceEmail(invoiceData);
    res.json({ success: true });
});
```

### Pattern 3: Shipment Update
```typescript
router.patch('/orders/:id/ship', async (req, res) => {
    const order = await Order.findById(req.params.id);
    order.status = 'shipped';
    order.trackingNumber = req.body.trackingNumber;
    await order.save();
    
    await sendShipmentEmail(
        order.customerEmail,
        order.orderId,
        req.body.trackingNumber
    );
    
    res.json({ success: true });
});
```

---

## 🗂️ Project Structure

### Before
```
wholesii-server/
├── routes/
├── models/
└── utils/
    ├── sms.ts
    └── delhivery.ts
```

### After
```
wholesii-server/
├── routes/
├── models/
│   ├── User.ts
│   ├── Order.ts
│   └── EmailTemplate.ts  ← NEW
├── utils/
│   ├── sms.ts
│   ├── delhivery.ts
│   ├── email.ts          ← NEW (Core)
│   ├── invoice.ts        ← NEW (HTML)
│   └── orderEmail.ts     ← NEW (Functions)
└── config/
    └── env.ts            ← UPDATED
```

---

## ✅ Verification

### When Server Starts
```
Output:
✅ Email service ready
```

### Test Connection
```typescript
import { verifyEmailConnection } from "@/utils/email";

if (await verifyEmailConnection()) {
    console.log("✅ All set!");
} else {
    console.log("❌ Fix .env credentials");
}
```

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Email service ready" doesn't show | Check `.env` MAIL_PASSWORD |
| Function not found | Run `npm install` |
| Email not sending | Verify email address format |
| Timeout error | Check MAIL_PASSWORD spelling |
| Connection refused | Port 587 might be blocked |

---

## 📚 Documentation Map

```
Start Here
    ↓
EMAIL_QUICK_START.md (5 min)
    ↓
Try Integration
    ↓
EMAIL_INTEGRATION_EXAMPLES.ts (Copy-paste code)
    ↓
Need Details?
    ↓
EMAIL_SYSTEM.md (Complete reference)
```

---

## 💡 Function Quick Reference

```typescript
// Order & Invoices
sendOrderConfirmationEmail(invoiceData)
sendInvoiceEmail(invoiceData)
sendShipmentEmail(email, orderId, tracking, deliveryDate)

// User Accounts
sendPasswordResetEmail(email, resetLink, expiryMinutes)
sendOTPEmail(email, otp, expiryMinutes)
sendWelcomeEmail(email, name)

// Advanced
sendEmailUsingTemplate(templateId, email, replacements)
sendEmail(payload)
sendEmailWithTemplate(email, subject, html, replacements)

// Utilities
verifyEmailConnection() // Returns: true/false
```

---

## 🎓 Learning Path

### Level 1: Quick Start (5 min)
- ✓ Read EMAIL_QUICK_START.md
- ✓ Update .env
- ✓ Run `npm install`
- ✓ Start server

### Level 2: Basic Integration (15 min)
- ✓ Copy example from EMAIL_INTEGRATION_EXAMPLES.ts
- ✓ Paste into route handler
- ✓ Test with sample order
- ✓ Verify email received

### Level 3: Advanced Usage (30 min)
- ✓ Read EMAIL_SYSTEM.md
- ✓ Create custom templates
- ✓ Implement error logging
- ✓ Add rate limiting

### Level 4: Production Ready (1 hour)
- ✓ Security audit
- ✓ Performance optimization
- ✓ Monitoring setup
- ✓ Documentation

---

## 🔐 Security Checklist

- [ ] `.env` has strong password
- [ ] `.env` not committed to git
- [ ] `MAIL_PASSWORD` never logged
- [ ] Email addresses validated
- [ ] Rate limiting on endpoints
- [ ] Error handling in place
- [ ] Logs don't contain credentials

---

## 📈 What Gets Sent

### Order Confirmation Email Contains:
- Order number
- Order date
- Customer details
- Shipping address
- Item list with prices
- Subtotal, tax, shipping
- Total amount
- Payment method

### Invoice Email Contains:
- All order confirmation info
- Professional formatting
- Store contact information
- Payment status
- Notes field

### Shipment Email Contains:
- Order number
- Tracking number
- Estimated delivery
- Link to track

---

## 🎉 You're Ready!

```
✅ Files created
✅ Dependencies added  
✅ Configuration ready
✅ Documentation complete
✅ Examples provided

NEXT: Update .env with MAIL_PASSWORD
      Run: npm install
      Run: npm run dev
      Then: Check "✅ Email service ready"
```

---

## 📞 Quick Help

**Installation stuck?**
→ Check [EMAIL_QUICK_START.md](EMAIL_QUICK_START.md#step-2-configure-environment)

**Need code example?**
→ Check [EMAIL_INTEGRATION_EXAMPLES.ts](EMAIL_INTEGRATION_EXAMPLES.ts)

**Email not sending?**
→ Check [EMAIL_SYSTEM.md#troubleshooting](EMAIL_SYSTEM.md)

**Want all details?**
→ Read [EMAIL_SYSTEM.md](EMAIL_SYSTEM.md)

---

## 🚀 Summary

| What | Status | Next |
|------|--------|------|
| Email functions | ✅ Ready | Use in routes |
| SMTP config | ✅ Ready | Update .env password |
| Documentation | ✅ Complete | Read guides |
| Examples | ✅ Available | Copy-paste code |
| Dependencies | ✅ Added | Run npm install |

**Total Setup Time: 5 minutes** ⏱️

Go to [EMAIL_QUICK_START.md](EMAIL_QUICK_START.md) now! 🚀
