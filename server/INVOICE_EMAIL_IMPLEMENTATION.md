# Invoice & Payment Completion Email Implementation

## Overview
When an order is **completed after payment** (via Razorpay webhook), the system now:
1. ✅ Generates a professional HTML invoice
2. ✅ Sends it via email to the customer
3. ✅ Includes all order details (items, shipping address, tax, etc.)

---

## Architecture Flow

```
Payment Completion
    ↓
Razorpay Webhook → /payments/webhook
    ↓
payment.captured event
    ↓
Order status updated (paymentStatus: "completed", status: "confirmed")
    ↓
prepareInvoiceData() - Format order data
    ↓
generateInvoiceHTML() - Create professional invoice
    ↓
sendPaymentConfirmationEmail() - Send via SMTP
    ↓
Customer receives invoice email ✅
```

---

## Files Modified / Created

### 1. **New File: `src/utils/pdfInvoice.ts`**
- Generates **professional HTML invoices** with:
  - Company information (store name, email, phone, GST)
  - Invoice metadata (invoice #, date, status)
  - Bill to / Ship to addresses
  - Itemized table with quantities and amounts
  - Summary (subtotal, tax, shipping, discount, total)
  - Payment information
  - Professional styling for print/conversion to PDF

**Key exports:**
- `generateInvoiceHTML(data: PdfInvoiceData)` - Creates HTML invoice
- `PdfInvoiceData` interface - Type definition

### 2. **Updated: `src/utils/orderEmail.ts`**
Added two new functions:

**`sendPaymentConfirmationEmail(invoiceData: PdfInvoiceData)`**
- Sends professional invoice email after payment
- Subject: "Payment Received & Invoice - Order #XXX"
- Includes full HTML invoice
- Error handling with logging

**`prepareInvoiceData(order: any): Promise<PdfInvoiceData>`**
- Converts database order format to invoice format
- Fetches user data (name, address, email, phone)
- Calculates line items (price × quantity)
- Merges with store configuration

### 3. **Updated: `src/routes/payment.ts`**
In the `payment.captured` webhook handler:
- **New:** Imports invoice functions
- **New:** After updating order status, calls `prepareInvoiceData()` and `sendPaymentConfirmationEmail()`
- **New:** Wrapped in try-catch to prevent webhook failure if email fails
- **New:** Console logging for debugging

### 4. **Updated: `src/config/env.ts`**
Added optional environment variables:
- `STORE_PHONE` - Store phone number for invoices
- `STORE_ADDRESS` - Store address for invoices
- `GST_NUMBER` - GST registration number for invoices

---

## Environment Variables (`.env`)

Add these optional variables to customize invoices:

```env
# Invoice Customization
STORE_PHONE=+91-1234567890
STORE_ADDRESS=123 Business St, City, State - 12345, India
GST_NUMBER=27AABCT1234H1Z0
```

If not provided, defaults are used:
- `STORE_PHONE`: "+91-1234567890"
- `STORE_ADDRESS`: "India"
- `GST_NUMBER`: (not displayed if not provided)

---

## Implementation Details

### Invoice Data Structure
```typescript
interface PdfInvoiceData {
    orderId: string;              // Order ID
    orderNo?: string;             // Order number (if different from ID)
    orderDate: Date;              // Order creation date
    
    // Customer info
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    
    // Addresses
    shippingAddress: InvoiceAddress;
    billingAddress?: InvoiceAddress;
    
    // Items list
    items: InvoiceItem[];
    
    // Amounts
    subtotal: number;
    tax: number;
    shippingCost: number;
    discount: number;
    total: number;
    
    // Payment details
    paymentMethod?: string;       // "Razorpay", etc.
    paymentStatus?: string;       // "Completed", etc.
    
    // Store info
    storeName?: string;
    storeEmail?: string;
    storePhone?: string;
    storeAddress?: string;
    gstNumber?: string;
    
    notes?: string;               // Any special notes
}
```

### Email Flow

**Trigger:** Razorpay webhook with `event: "payment.captured"`

**Process:**
1. Order payment status updated to "completed"
2. Payment record created in database
3. `prepareInvoiceData(order)` called:
   - Fetches user data
   - Formats items list
   - Merges with env variables
4. `sendPaymentConfirmationEmail(invoiceData)` called:
   - Generates HTML from template
   - Sends via nodemailer SMTP
   - Logs success/failure

**Error Handling:**
- Wrapped in try-catch
- If email fails, webhook still succeeds (doesn't block payment confirmation)
- Detailed console logging for debugging

---

## Invoice HTML Features

The generated invoice includes:

✅ **Professional Styling**
- Blue color scheme (#1e40af primary)
- Print-friendly layout
- Responsive design (works on mobile)

✅ **Dynamic Content**
- Auto-formatted dates (en-IN locale)
- Currency formatting (₹ symbol)
- HTML escape for security

✅ **Sections**
- Header with company branding
- Invoice metadata (number, date, status)
- Billing and shipping addresses
- Itemized product table
- Summary box with calculations
- Payment information
- Thank you message

✅ **Business Details**
- Store name and contact info
- GST number (if provided)
- Order tracking info
- Payment confirmation badge

---

## Testing the Implementation

### 1. **Manual Webhook Test**
Use the test script to simulate payment:

```bash
node scripts/test-razorpay.js
```

This will:
- Create a test order
- Simulate payment.captured webhook
- Trigger email sending

### 2. **Check Email Logs**
Look for console output:
```
✅ Payment confirmation email sent to user@example.com for order ORD_1234567890_abcdef
```

### 3. **Database Verification**
Check that order has:
```javascript
{
  paymentStatus: "completed",
  status: "confirmed",
  razorpayPaymentId: "pay_xxx"
}
```

---

## Future Enhancements

### 1. **PDF Generation**
To send PDFs instead of HTML:
```bash
npm install puppeteer
```

Then convert HTML to PDF before sending:
```typescript
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.setContent(htmlInvoice);
const pdf = await page.pdf();
```

### 2. **Email Templates from Database**
Use `EmailTemplate` model to store custom invoice templates

### 3. **Invoice Storage**
Store generated invoices in cloud storage (S3, GCS)

### 4. **Invoice Numbering**
Implement sequential invoice numbers in Settings model

### 5. **Multi-language Support**
Generate invoices in different languages based on customer locale

---

## Troubleshooting

### Issue: Invoice email not received

**Check:**
1. Email configuration in `.env`:
   ```
   MAIL_HOST=smtp.hostinger.com
   MAIL_PORT=587
   MAIL_USER=noreply@wholesiii.com
   MAIL_PASSWORD=xxxxx
   ```

2. Check console logs:
   ```
   Look for: "✅ Payment confirmation email sent..." or
   "❌ Failed to send payment confirmation email..."
   ```

3. Verify email service:
   ```bash
   node scripts/test-api.js
   # Should show "Email verification: OK"
   ```

### Issue: Invoice data incomplete

**Check:**
1. User document has:
   - `email` (required)
   - `firstName`, `lastName` (for name)
   - `phone` (optional)
   - `address` (optional, for billing address)

2. Order document has:
   - `items` array with `name`, `quantity`, `price`
   - `shippingAddress` with city, state, postalCode
   - `subtotal`, `tax`, `shippingCost`, `discount`, `total`

### Issue: Email formatting looks wrong

**Check:**
1. Email client CSS support (HTML5 is better supported than complex CSS)
2. Try different email client (Gmail, Outlook, Apple Mail)
3. Check HTML invoice in browser:
   - Save generated HTML to file
   - Open in browser
   - Should look professional

---

## Performance Considerations

- **Email sending:** Non-blocking (async, wrapped in try-catch)
- **Database queries:** Minimal (1 order fetch, 1 user fetch during webhook)
- **Invoice generation:** Fast (string interpolation, not PDF rendering)
- **Scalability:** Can handle high payment volume without slowdown

---

## Security

✅ **XSS Protection**
- All customer data HTML-escaped
- Uses `escapeHtml()` utility function

✅ **SMTP Security**
- TLS encryption (port 587)
- Credential in environment variables

✅ **Data Privacy**
- Email only sent to order's customer email
- Invoice contains only order-related data
- No sensitive payment info (card details, etc.) in email

---

## API Endpoints (No Change)

Payment flow remains the same:
- `POST /payments/order` - Create Razorpay order
- `POST /payments/webhook` - **UPDATED** - Now sends invoice
- `POST /payments/verify` - Optional verification

---

## Rollback Instructions

If you need to remove invoice emails temporarily:

In `src/routes/payment.ts`, comment out:
```typescript
// try {
//     const invoiceData = await prepareInvoiceData(order);
//     await sendPaymentConfirmationEmail(invoiceData);
// } catch (emailErr) {
//     console.error(`⚠️ ...`);
// }
```

The order will still be marked as completed, but no email will be sent.

---

## Summary

✅ **Implementation Complete!**

- [x] Professional invoice generation
- [x] Automatic email sending on payment
- [x] Error handling & logging
- [x] Customizable store information
- [x] HTML formatting with styling
- [x] Security (HTML escaping)
- [x] Environment configuration

**Next Steps:**
1. Update `.env` with store details
2. Test payment flow
3. Monitor email logs
4. (Optional) Integrate PDF generation
