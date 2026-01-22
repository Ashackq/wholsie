import { Readable } from "stream";

export interface InvoiceItem {
    name: string;
    quantity: number;
    price: number;
    amount: number;
}

export interface InvoiceAddress {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
}

export interface PdfInvoiceData {
    orderId: string;
    orderNo?: string;
    orderDate: Date;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    shippingAddress: InvoiceAddress;
    billingAddress?: InvoiceAddress;
    items: InvoiceItem[];
    subtotal: number;
    tax: number;
    shippingCost: number;
    discount: number;
    total: number;
    paymentMethod?: string;
    paymentStatus?: string;
    notes?: string;
    storeName?: string;
    storeEmail?: string;
    storePhone?: string;
    storeAddress?: string;
    gstNumber?: string;
}

/**
 * Generate a high-quality HTML invoice that can be converted to PDF
 * This generates a complete, professional invoice without external dependencies
 */
export function generateInvoiceHTML(data: PdfInvoiceData): string {
    const invoiceDate = new Date(data.orderDate).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    const itemsHTML = data.items
        .map(
            (item, index) => `
            <tr>
                <td class="item-sno">${index + 1}</td>
                <td class="item-name">${escapeHtml(item.name)}</td>
                <td class="item-qty">${item.quantity}</td>
                <td class="item-price">₹${item.price.toFixed(2)}</td>
                <td class="item-amount">₹${item.amount.toFixed(2)}</td>
            </tr>
        `,
        )
        .join("");

    const shippingAddress = data.shippingAddress || {};
    const billingAddress = data.billingAddress || shippingAddress;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice - ${data.orderId}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #333;
            line-height: 1.6;
            background: white;
        }
        
        .container {
            max-width: 900px;
            margin: 0 auto;
            padding: 40px;
            background: white;
        }
        
        .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid #1e40af;
            padding-bottom: 30px;
            margin-bottom: 30px;
        }
        
        .company-info h1 {
            color: #1e40af;
            font-size: 28px;
            margin-bottom: 10px;
        }
        
        .company-info p {
            color: #666;
            font-size: 13px;
            margin: 3px 0;
        }
        
        .invoice-meta {
            text-align: right;
        }
        
        .invoice-meta div {
            margin-bottom: 12px;
        }
        
        .invoice-meta label {
            font-weight: bold;
            color: #333;
            display: inline-block;
            width: 120px;
            text-align: left;
        }
        
        .invoice-meta value {
            color: #1e40af;
            font-weight: 600;
        }
        
        .addresses-section {
            display: flex;
            gap: 60px;
            margin-bottom: 40px;
        }
        
        .address-block {
            flex: 1;
        }
        
        .address-block h3 {
            font-size: 13px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .address-block p {
            font-size: 13px;
            color: #555;
            line-height: 1.8;
            margin: 0;
        }
        
        .items-section {
            margin-bottom: 30px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        
        thead {
            background: #f3f4f6;
            border-top: 2px solid #1e40af;
            border-bottom: 2px solid #1e40af;
        }
        
        thead th {
            padding: 12px;
            text-align: left;
            font-weight: 600;
            color: #1e40af;
            font-size: 13px;
        }
        
        tbody td {
            padding: 14px 12px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 13px;
            color: #333;
        }
        
        tbody tr:last-child td {
            border-bottom: none;
        }
        
        .item-sno {
            text-align: center;
            width: 40px;
        }
        
        .item-name {
            text-align: left;
            font-weight: 500;
        }
        
        .item-qty {
            text-align: center;
            width: 80px;
        }
        
        .item-price {
            text-align: right;
            width: 100px;
        }
        
        .item-amount {
            text-align: right;
            width: 120px;
            font-weight: 600;
        }
        
        .summary-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 40px;
        }
        
        .summary-box {
            width: 350px;
        }
        
        .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            font-size: 13px;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .summary-row.total {
            padding: 12px 0;
            border-top: 2px solid #1e40af;
            border-bottom: 2px solid #1e40af;
            font-weight: 700;
            font-size: 15px;
            color: #1e40af;
            margin: 10px 0;
        }
        
        .summary-label {
            color: #666;
        }
        
        .summary-value {
            color: #333;
            font-weight: 500;
        }
        
        .total-value {
            color: #1e40af;
        }
        
        .payment-section {
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            display: flex;
            gap: 60px;
        }
        
        .payment-block {
            flex: 1;
        }
        
        .payment-block h4 {
            font-size: 12px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .payment-block p {
            font-size: 13px;
            color: #555;
            margin: 3px 0;
        }
        
        .footer {
            border-top: 1px solid #e5e7eb;
            padding-top: 20px;
            margin-top: 40px;
            text-align: center;
            color: #999;
            font-size: 12px;
        }
        
        .notes {
            background: #fffbeb;
            border-left: 4px solid #f59e0b;
            padding: 12px;
            margin-bottom: 20px;
            border-radius: 4px;
        }
        
        .notes p {
            font-size: 13px;
            color: #666;
            margin: 0;
        }
        
        @media print {
            body {
                margin: 0;
                padding: 0;
            }
            .container {
                padding: 0;
                max-width: 100%;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="invoice-header">
            <div class="company-info">
                <h1>${escapeHtml(data.storeName || "Wholesiii")}</h1>
                ${data.storeEmail ? `<p>Email: ${escapeHtml(data.storeEmail)}</p>` : ""}
                ${data.storePhone ? `<p>Phone: ${escapeHtml(data.storePhone)}</p>` : ""}
                ${data.storeAddress ? `<p>${escapeHtml(data.storeAddress)}</p>` : ""}
                ${data.gstNumber ? `<p>GST: ${escapeHtml(data.gstNumber)}</p>` : ""}
            </div>
            <div class="invoice-meta">
                <div><label>Invoice #:</label> <value>${escapeHtml(data.orderId)}</value></div>
                <div><label>Date:</label> <value>${invoiceDate}</value></div>
                <div><label>Status:</label> <value>${escapeHtml(data.paymentStatus || "Pending")}</value></div>
                ${data.orderNo ? `<div><label>Order #:</label> <value>${escapeHtml(data.orderNo)}</value></div>` : ""}
            </div>
        </div>
        
        <!-- Addresses -->
        <div class="addresses-section">
            <div class="address-block">
                <h3>Bill To:</h3>
                <p>${escapeHtml(data.customerName)}</p>
                ${billingAddress.street ? `<p>${escapeHtml(billingAddress.street)}</p>` : ""}
                <p>
                    ${escapeHtml(billingAddress.city || "")},
                    ${escapeHtml(billingAddress.state || "")}
                    ${billingAddress.postalCode ? `- ${escapeHtml(billingAddress.postalCode)}` : ""}
                </p>
                ${billingAddress.country ? `<p>${escapeHtml(billingAddress.country)}</p>` : ""}
                ${data.customerEmail ? `<p>Email: ${escapeHtml(data.customerEmail)}</p>` : ""}
                ${data.customerPhone ? `<p>Phone: ${escapeHtml(data.customerPhone)}</p>` : ""}
            </div>
            
            <div class="address-block">
                <h3>Ship To:</h3>
                <p>${escapeHtml(data.customerName)}</p>
                ${shippingAddress.street ? `<p>${escapeHtml(shippingAddress.street)}</p>` : ""}
                <p>
                    ${escapeHtml(shippingAddress.city || "")},
                    ${escapeHtml(shippingAddress.state || "")}
                    ${shippingAddress.postalCode ? `- ${escapeHtml(shippingAddress.postalCode)}` : ""}
                </p>
                ${shippingAddress.country ? `<p>${escapeHtml(shippingAddress.country)}</p>` : ""}
            </div>
        </div>
        
        <!-- Items Table -->
        <div class="items-section">
            <table>
                <thead>
                    <tr>
                        <th class="item-sno">#</th>
                        <th class="item-name">Item Description</th>
                        <th class="item-qty">Qty</th>
                        <th class="item-price">Price</th>
                        <th class="item-amount">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHTML}
                </tbody>
            </table>
        </div>
        
        <!-- Summary -->
        <div class="summary-section">
            <div class="summary-box">
                <div class="summary-row">
                    <span class="summary-label">Subtotal:</span>
                    <span class="summary-value">₹${data.subtotal.toFixed(2)}</span>
                </div>
                ${data.shippingCost > 0 ? `
                <div class="summary-row">
                    <span class="summary-label">Shipping:</span>
                    <span class="summary-value">₹${data.shippingCost.toFixed(2)}</span>
                </div>
                ` : ""}
                ${data.tax > 0 ? `
                <div class="summary-row">
                    <span class="summary-label">Tax (GST):</span>
                    <span class="summary-value">₹${data.tax.toFixed(2)}</span>
                </div>
                ` : ""}
                ${data.discount > 0 ? `
                <div class="summary-row">
                    <span class="summary-label">Discount:</span>
                    <span class="summary-value">-₹${data.discount.toFixed(2)}</span>
                </div>
                ` : ""}
                <div class="summary-row total">
                    <span>TOTAL AMOUNT:</span>
                    <span class="total-value">₹${data.total.toFixed(2)}</span>
                </div>
            </div>
        </div>
        
        <!-- Payment Info -->
        <div class="payment-section">
            <div class="payment-block">
                <h4>Payment Method</h4>
                <p>${escapeHtml(data.paymentMethod || "Razorpay")}</p>
            </div>
            <div class="payment-block">
                <h4>Payment Status</h4>
                <p style="color: #10b981; font-weight: 600;">✓ ${escapeHtml(data.paymentStatus || "Completed")}</p>
            </div>
        </div>
        
        ${data.notes ? `
        <div class="notes">
            <p><strong>Notes:</strong> ${escapeHtml(data.notes)}</p>
        </div>
        ` : ""}
        
        <!-- Footer -->
        <div class="footer">
            <p>Thank you for your purchase!</p>
            <p>For any queries, please contact us at ${escapeHtml(data.storeEmail || "support@wholesiii.com")}</p>
            <p style="margin-top: 10px; color: #ccc;">This is an electronically generated document and does not require a signature.</p>
        </div>
    </div>
</body>
</html>
    `;
}

/**
 * Escape HTML special characters to prevent injection
 */
function escapeHtml(text: string | undefined): string {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
