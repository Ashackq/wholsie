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

export interface InvoiceData {
    orderId: string;
    orderDate: Date;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    shippingAddress: InvoiceAddress;
    items: InvoiceItem[];
    subtotal: number;
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
}

/**
 * Generate HTML invoice for order confirmation
 * @param data Invoice data
 * @returns HTML string
 */
export function generateInvoiceHTML(data: InvoiceData): string {
    const shippingAddress = data.shippingAddress || {};
    const storedDate = new Date(data.orderDate).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    const itemsHTML = data.items
        .map(
            (item) => `
        <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.name}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">₹${item.price.toFixed(2)}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">₹${item.amount.toFixed(2)}</td>
        </tr>
        `,
        )
        .join("");

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
            }
            .container {
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                background: #f9f9f9;
            }
            .invoice {
                background: white;
                padding: 30px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 30px;
                border-bottom: 3px solid #007bff;
                padding-bottom: 20px;
            }
            .header h1 {
                margin: 0;
                color: #007bff;
            }
            .invoice-number {
                text-align: right;
            }
            .invoice-number p {
                margin: 5px 0;
                font-weight: bold;
            }
            .invoice-details {
                display: flex;
                justify-content: space-between;
                margin-bottom: 30px;
            }
            .detail-section {
                flex: 1;
            }
            .detail-section h3 {
                margin-top: 0;
                color: #007bff;
                font-size: 14px;
                text-transform: uppercase;
            }
            .detail-section p {
                margin: 5px 0;
                font-size: 14px;
            }
            .items-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
            }
            .items-table thead {
                background: #f0f0f0;
            }
            .items-table th {
                padding: 12px 8px;
                text-align: left;
                font-weight: bold;
                border-bottom: 2px solid #007bff;
            }
            .summary {
                display: flex;
                justify-content: flex-end;
                margin-bottom: 30px;
            }
            .summary-box {
                width: 300px;
            }
            .summary-row {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid #ddd;
            }
            .summary-row.total {
                font-weight: bold;
                font-size: 18px;
                border-bottom: 2px solid #007bff;
                border-top: 2px solid #007bff;
                padding: 12px 0;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #ddd;
                font-size: 12px;
                color: #666;
            }
            .notes {
                background: #f0f0f0;
                padding: 15px;
                border-left: 4px solid #007bff;
                margin: 20px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="invoice">
                <div class="header">
                    <div>
                        <h1>INVOICE</h1>
                        <p style="margin: 5px 0; color: #666;">${data.storeName || "Wholesiii"}</p>
                    </div>
                    <div class="invoice-number">
                        <p>Invoice #: ${data.orderId}</p>
                        <p>Date: ${storedDate}</p>
                        <p>Status: ${data.paymentStatus || "Pending"}</p>
                    </div>
                </div>

                <div class="invoice-details">
                    <div class="detail-section">
                        <h3>Bill To</h3>
                        <p><strong>${data.customerName}</strong></p>
                        <p>${shippingAddress.street || ""}</p>
                        <p>${shippingAddress.city || ""}, ${shippingAddress.state || ""} ${shippingAddress.postalCode || ""}</p>
                        <p>${shippingAddress.country || "India"}</p>
                        <p>Email: ${data.customerEmail}</p>
                        ${data.customerPhone ? `<p>Phone: ${data.customerPhone}</p>` : ""}
                    </div>

                    <div class="detail-section">
                        <h3>Ship To</h3>
                        <p><strong>${data.customerName}</strong></p>
                        <p>${shippingAddress.street || ""}</p>
                        <p>${shippingAddress.city || ""}, ${shippingAddress.state || ""} ${shippingAddress.postalCode || ""}</p>
                        <p>${shippingAddress.country || "India"}</p>
                    </div>

                    <div class="detail-section">
                        <h3>Store Details</h3>
                        <p><strong>${data.storeName || "Wholesiii"}</strong></p>
                        ${data.storeAddress ? `<p>${data.storeAddress}</p>` : ""}
                        ${data.storeEmail ? `<p>Email: ${data.storeEmail}</p>` : ""}
                        ${data.storePhone ? `<p>Phone: ${data.storePhone}</p>` : ""}
                    </div>
                </div>

                <table class="items-table">
                    <thead>
                        <tr>
                            <th>Product Name</th>
                            <th style="text-align: center;">Quantity</th>
                            <th style="text-align: right;">Unit Price</th>
                            <th style="text-align: right;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHTML}
                    </tbody>
                </table>

                <div class="summary">
                    <div class="summary-box">
                        <div class="summary-row">
                            <span>Subtotal:</span>
                            <span>₹${data.subtotal.toFixed(2)}</span>
                        </div>
                        ${data.shippingCost > 0 ? `<div class="summary-row">
                            <span>Shipping:</span>
                            <span>₹${data.shippingCost.toFixed(2)}</span>
                        </div>` : ""}
                        ${data.discount > 0 ? `<div class="summary-row">
                            <span>Discount:</span>
                            <span>-₹${data.discount.toFixed(2)}</span>
                        </div>` : ""}
                        <div class="summary-row total">
                            <span>TOTAL:</span>
                            <span>₹${data.total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                ${data.paymentMethod ? `<p><strong>Payment Method:</strong> ${data.paymentMethod}</p>` : ""}

                ${data.notes ? `<div class="notes"><strong>Notes:</strong><p>${data.notes}</p></div>` : ""}

                <div class="footer">
                    <p>Thank you for your purchase! Please keep this invoice for your records.</p>
                    <p>If you have any questions, please contact us at ${data.storeEmail || "support@wholesiii.com"}</p>
                    <p style="margin-top: 20px; color: #999;">© ${new Date().getFullYear()} ${data.storeName || "Wholesiii"}. All rights reserved.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
}

/**
 * Generate order confirmation email HTML
 */
export function generateOrderConfirmationHTML(data: InvoiceData): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background: #f9f9f9;
            }
            .header {
                background: #007bff;
                color: white;
                padding: 20px;
                text-align: center;
            }
            .content {
                padding: 20px;
                background: white;
            }
            .section {
                margin-bottom: 20px;
            }
            .section h3 {
                color: #007bff;
                border-bottom: 2px solid #007bff;
                padding-bottom: 10px;
            }
            .items {
                background: #f9f9f9;
                padding: 10px;
                border-radius: 5px;
            }
            .item {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid #ddd;
            }
            .item:last-child {
                border-bottom: none;
            }
            .total {
                display: flex;
                justify-content: space-between;
                font-weight: bold;
                font-size: 18px;
                padding: 15px 0;
                margin-top: 10px;
                border-top: 2px solid #007bff;
            }
            .footer {
                background: #f0f0f0;
                padding: 20px;
                text-align: center;
                font-size: 12px;
                color: #666;
            }
            .button {
                display: inline-block;
                background: #007bff;
                color: white;
                padding: 10px 20px;
                text-decoration: none;
                border-radius: 5px;
                margin-top: 15px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Order Confirmation</h1>
                <p>Thank you for your purchase!</p>
            </div>

            <div class="content">
                <div class="section">
                    <p>Hi <strong>${data.customerName}</strong>,</p>
                    <p>Your order has been confirmed. Here are the details:</p>
                </div>

                <div class="section">
                    <h3>Order Information</h3>
                    <p><strong>Order Number:</strong> ${data.orderId}</p>
                    <p><strong>Order Date:</strong> ${new Date(data.orderDate).toLocaleDateString("en-IN")}</p>
                    <p><strong>Status:</strong> ${data.paymentStatus || "Confirmed"}</p>
                </div>

                <div class="section">
                    <h3>Order Items</h3>
                    <div class="items">
                        ${data.items
            .map(
                (item) => `
                            <div class="item">
                                <span>${item.name} (x${item.quantity})</span>
                                <span>₹${item.amount.toFixed(2)}</span>
                            </div>
                        `,
            )
            .join("")}
                    </div>
                </div>

                <div class="section">
                    <h3>Billing & Shipping</h3>
                    <p><strong>Shipping Address:</strong></p>
                    <p>${data.shippingAddress.street || ""}<br>
                    ${data.shippingAddress.city || ""}, ${data.shippingAddress.state || ""} ${data.shippingAddress.postalCode || ""}<br>
                    ${data.shippingAddress.country || "India"}</p>
                </div>

                <div class="total">
                    <span>Total Amount:</span>
                    <span>₹${data.total.toFixed(2)}</span>
                </div>

                <a href="https://wholesiii.com" class="button">Track Your Order</a>

                <p style="margin-top: 20px;">If you have any questions about your order, please don't hesitate to contact us.</p>
            </div>

            <div class="footer">
                <p>This is an automated email. Please do not reply to this address.</p>
                <p>© ${new Date().getFullYear()} ${data.storeName || "Wholesiii"}. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
}
