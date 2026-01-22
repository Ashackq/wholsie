# Email Guide (Single Source)

This file replaces all previous email docs/examples. Everything routes through the utilities in `src/utils/email.ts`, `src/utils/orderEmail.ts`, and `src/utils/emailTemplates.ts`.

## Setup
- Configure env vars: `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_FROM`, `MAIL_FROM_NAME` (see `src/config/env.ts`).
- Call `verifyEmailConnection()` once at startup to confirm SMTP is reachable.

## Basics
```ts
import { sendEmail, sendEmailWithTemplate, verifyEmailConnection } from "./src/utils/email";

await verifyEmailConnection();

await sendEmail({
  to: "user@example.com",
  subject: "Hello",
  html: "<p>Welcome!</p>",
});

await sendEmailWithTemplate(
  "user@example.com",
  "Order {orderId} confirmed",
  "<h1>Thanks {customerName}</h1><p>Order {orderId}</p>",
  { orderId: "ORD123", customerName: "Ava" },
);
```

## Turnkey flows (`src/utils/orderEmail.ts`)
Use these helpers when you already have order/user data. Each returns `Promise<boolean>`.
- `sendOrderConfirmationEmail(invoiceData)`
- `sendInvoiceEmail(invoiceData)`
- `sendShipmentEmail(to, orderId, trackingNumber, estimatedDelivery)`
- `sendPasswordResetEmail(to, resetLink, expiryMinutes)`
- `sendOTPEmail(to, otp, expiryMinutes)`
- `sendWelcomeEmail(to, name)`

Minimal shape for `invoiceData` (used by the first two):
```ts
const invoiceData = {
  orderId: "ORD123",
  orderDate: new Date(),
  customerName: "Ava",
  customerEmail: "ava@example.com",
  customerPhone: "+91-99999-00000",
  shippingAddress: {
    street: "123 Main St",
    city: "Bangalore",
    state: "KA",
    postalCode: "560001",
    country: "India",
  },
  items: [
    { name: "Item A", quantity: 2, price: 499, amount: 998 },
  ],
  subtotal: 998,
  tax: 0,
  shippingCost: 0,
  discount: 0,
  total: 998,
  paymentMethod: "Online",
  paymentStatus: "Completed",
  storeName: "Wholesiii",
  storeEmail: "noreply@wholesiii.com",
};
```

## HTML template generators (`src/utils/emailTemplates.ts`)
If you need raw HTML and want to send via `sendEmail`, generate it first:
```ts
import {
  generateOrderConfirmationInvoiceTemplate,
  generateOrderShippedTemplate,
  generateOrderCancelledTemplate,
} from "./src/utils/emailTemplates";
import { sendEmail } from "./src/utils/email";

const html = generateOrderConfirmationInvoiceTemplate(invoiceData);
await sendEmail({ to: invoiceData.customerEmail, subject: `Order ${invoiceData.orderId} confirmed`, html });
```

## Suggested handlers (drop-in sketches)
- **Payment success**: mark payment as completed, then `sendInvoiceEmail(invoiceData)`.
- **Order shipped**: update tracking info, then `sendShipmentEmail(customerEmail, orderId, trackingNumber, eta)`.
- **Forgot password**: issue a signed reset token, build a link, then `sendPasswordResetEmail(email, resetLink, 30)`.
- **OTP**: generate/store OTP with expiry, then `sendOTPEmail(email, otp, 10)`.
- **Welcome**: after signup, `sendWelcomeEmail(email, name)`.

## Logging (optional)
If you track results in Mongo, create a simple model and persist `status`, `subject`, `to`, and `errorMessage` when `sendEmail` returns `false`.
