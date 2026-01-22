# Email Templates - Quick Reference

## 📧 Available Templates

| Template | Function | When to Use | File |
|----------|----------|-------------|------|
| **Order Confirmation** | `generateOrderConfirmationInvoiceTemplate()` | After order creation | `src/utils/emailTemplates.ts` |
| **Order Shipped** | `generateOrderShippedTemplate()` | When package ships | `src/utils/emailTemplates.ts` |
| **Order Cancelled** | `generateOrderCancelledTemplate()` | When order is cancelled | `src/utils/emailTemplates.ts` |

---

## 🚀 Quick Start

### 1. Import Templates
```typescript
import {
    generateOrderConfirmationInvoiceTemplate,
    generateOrderShippedTemplate,
    generateOrderCancelledTemplate,
} from "@/utils/emailTemplates";
```

### 2. Generate HTML
```typescript
const html = generateOrderConfirmationInvoiceTemplate(data);
```

### 3. Send Email
```typescript
import { sendEmail } from "@/utils/email";

await sendEmail({
    to: "customer@example.com",
    subject: "Your Order Confirmation",
    html: html,
});
```

---

## 📦 Template Data Requirements

### Order Confirmation
```typescript
{
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
    paymentStatus: "Confirmed",
    storeName: "Wholesiii",
    storeEmail: "support@wholesiii.com",
    storePhone: "+91-9999999999",
}
```

### Order Shipped
```typescript
{
    orderId: "ORD_12345",
    customerName: "John Doe",
    trackingNumber: "DL12345678",
    courierName: "Delhivery",
    estimatedDelivery: "2025-01-20",
    storeName: "Wholesiii",
    storePhone: "+91-9999999999",
}
```

### Order Cancelled
```typescript
{
    orderId: "ORD_12345",
    customerName: "John Doe",
    cancellationReason: "Customer Request",
    refundAmount: 1280,
    refundMethod: "Original Payment Method",
    refundTimeline: "5-7 business days",
    storeName: "Wholesiii",
    storeEmail: "support@wholesiii.com",
    storePhone: "+91-9999999999",
}
```

---

## 💡 Usage Examples

### Example 1: Order Confirmation
```typescript
router.post("/orders", async (req, res) => {
    const order = await Order.create(req.body);
    
    const html = generateOrderConfirmationInvoiceTemplate({
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
        paymentMethod: "Online Payment",
        paymentStatus: "Confirmed",
        storeName: "Wholesiii",
        storeEmail: "support@wholesiii.com",
    });
    
    await sendEmail({
        to: order.customerEmail,
        subject: `Order Confirmation - ${order.orderId}`,
        html,
    });
    
    res.json({ success: true, order });
});
```

### Example 2: Order Shipped
```typescript
router.post("/orders/:orderId/ship", async (req, res) => {
    const order = await Order.findOne({ orderId: req.params.orderId });
    const { trackingNumber, estimatedDelivery } = req.body;
    
    order.status = "shipped";
    order.trackingNumber = trackingNumber;
    await order.save();
    
    const html = generateOrderShippedTemplate({
        orderId: order.orderId,
        customerName: order.customerName,
        trackingNumber,
        courierName: "Delhivery",
        estimatedDelivery,
        storeName: "Wholesiii",
    });
    
    await sendEmail({
        to: order.customerEmail,
        subject: `Your Order ${order.orderId} is Shipped!`,
        html,
    });
    
    res.json({ success: true });
});
```

### Example 3: Order Cancelled
```typescript
router.post("/orders/:orderId/cancel", async (req, res) => {
    const order = await Order.findOne({ orderId: req.params.orderId });
    const { reason } = req.body;
    
    order.status = "cancelled";
    order.cancellationReason = reason;
    await order.save();
    
    const html = generateOrderCancelledTemplate({
        orderId: order.orderId,
        customerName: order.customerName,
        cancellationReason: reason,
        refundAmount: order.total,
        refundMethod: "Original Payment Method",
        refundTimeline: "5-7 business days",
        storeName: "Wholesiii",
        storeEmail: "support@wholesiii.com",
    });
    
    await sendEmail({
        to: order.customerEmail,
        subject: `Order Cancellation Confirmed - ${order.orderId}`,
        html,
    });
    
    res.json({ success: true });
});
```

---

## 🎨 Customization

### Change Colors
Edit the HEX values in the template's `<style>` section:
- Primary Blue: `#007bff`
- Success Green: `#28a745`
- Error Red: `#dc3545`
- Warning Yellow: `#ffc107`

### Change Store Info
Update these fields:
- `storeName`: "Wholesiii"
- `storeEmail`: "support@wholesiii.com"
- `storePhone`: "+91-9999999999"
- `storeAddress`: "123 Business St, Bangalore"

### Change Timeline
Modify refund timeline in cancellation template:
```typescript
refundTimeline: "3-5 business days" // or your timeline
```

---

## 📋 Files

| File | Purpose |
|------|---------|
| `src/utils/emailTemplates.ts` | Template generation functions |
| `EMAIL_TEMPLATES_GUIDE.md` | Complete guide with examples |
| `EMAIL_TEMPLATES_IMPLEMENTATION.ts` | Implementation examples |
| `src/utils/email.ts` | Email sending service |
| `src/config/env.ts` | SMTP configuration |

---

## ✅ Testing Checklist

- [ ] Template imports without errors
- [ ] Data object has all required fields
- [ ] HTML generates without errors
- [ ] Email sends successfully
- [ ] Formatting looks correct on desktop
- [ ] Formatting looks correct on mobile
- [ ] All links are clickable
- [ ] Colors display correctly
- [ ] Text is readable
- [ ] No special characters appear garbled

---

## 🔗 Related Documentation

- [Email System Guide](EMAIL_SYSTEM.md)
- [Quick Start](EMAIL_QUICK_START.md)
- [Integration Examples](EMAIL_INTEGRATION_EXAMPLES.ts)
- [Visual Guide](VISUAL_GUIDE.md)

---

## 📞 Support

For issues or questions:
1. Check [EMAIL_TEMPLATES_GUIDE.md](EMAIL_TEMPLATES_GUIDE.md)
2. Review [EMAIL_TEMPLATES_IMPLEMENTATION.ts](EMAIL_TEMPLATES_IMPLEMENTATION.ts)
3. Test with sample data first
4. Check SMTP configuration in `.env`

---

**Version:** 1.0  
**Last Updated:** January 2026  
**Status:** Production Ready ✅
