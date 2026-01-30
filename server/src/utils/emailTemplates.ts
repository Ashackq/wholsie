/**
 * Email Templates for Order Management
 * This file contains HTML templates for:
 * - Order Confirmation + Invoice
 * - Order Shipped
 * - Order Cancelled
 */

interface OrderConfirmationTemplateData {
    orderId: string;
    orderDate: string;
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

interface ShippedTemplateData {
    orderId: string;
    customerName: string;
    trackingNumber: string;
    courierName?: string;
    estimatedDelivery?: string;
    storeName?: string;
    storePhone?: string;
}

interface CancelledTemplateData {
    orderId: string;
    customerName: string;
    cancellationReason?: string;
    refundAmount: number;
    refundMethod?: string;
    refundTimeline?: string;
    storeName?: string;
    storeEmail?: string;
    storePhone?: string;
}

/**
 * Generate Order Confirmation + Invoice Email Template
 * Professional invoice-style email with order details and payment info
 */
export function generateOrderConfirmationInvoiceTemplate(
    data: OrderConfirmationTemplateData,
): string {
    const orderDate = new Date(data.orderDate).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    const itemsHTML = data.items
        .map(
            (item) => `
            <tr>
                <td style="padding: 12px 8px; border-bottom: 1px solid #e0e0e0; font-size: 14px;">
                    ${item.name}
                </td>
                <td style="padding: 12px 8px; border-bottom: 1px solid #e0e0e0; text-align: center; font-size: 14px;">
                    ${item.quantity}
                </td>
                <td style="padding: 12px 8px; border-bottom: 1px solid #e0e0e0; text-align: right; font-size: 14px;">
                    ₹${item.price.toFixed(2)}
                </td>
                <td style="padding: 12px 8px; border-bottom: 1px solid #e0e0e0; text-align: right; font-size: 14px; font-weight: 600;">
                    ₹${item.amount.toFixed(2)}
                </td>
            </tr>
        `,
        )
        .join("");

    const discountRow =
        data.discount > 0
            ? `
        <tr style="background: #f5f5f5;">
            <td colspan="3" style="padding: 12px 8px; text-align: right; font-weight: 600; font-size: 14px;">
                Discount:
            </td>
            <td style="padding: 12px 8px; text-align: right; font-weight: 600; font-size: 14px; color: #28a745;">
                -₹${data.discount.toFixed(2)}
            </td>
        </tr>
    `
            : "";

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                background: #f5f5f5;
            }
            .email-container {
                max-width: 650px;
                margin: 0 auto;
                background: white;
            }
            .header {
                background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
                color: white;
                padding: 40px 20px;
                text-align: center;
            }
            .header h1 {
                font-size: 28px;
                margin-bottom: 5px;
            }
            .header p {
                font-size: 14px;
                opacity: 0.9;
            }
            .content {
                padding: 30px 20px;
            }
            .greeting {
                font-size: 16px;
                margin-bottom: 20px;
                line-height: 1.8;
            }
            .greeting strong {
                color: #007bff;
            }
            .order-info {
                background: #f9f9f9;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
                border-left: 4px solid #007bff;
            }
            .order-info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                font-size: 14px;
                margin-top: 10px;
            }
            .order-info-item {
                margin: 5px 0;
            }
            .order-info-label {
                color: #666;
                font-weight: 600;
                font-size: 12px;
                text-transform: uppercase;
                margin-bottom: 3px;
            }
            .order-info-value {
                color: #333;
                font-size: 14px;
            }
            .items-table {
                width: 100%;
                border-collapse: collapse;
                margin: 25px 0;
                font-size: 14px;
            }
            .items-table thead {
                background: #f0f0f0;
                border-bottom: 2px solid #007bff;
            }
            .items-table th {
                padding: 12px 8px;
                text-align: left;
                font-weight: 600;
                color: #333;
                font-size: 13px;
                text-transform: uppercase;
            }
            .items-table td {
                padding: 12px 8px;
            }
            .items-table tbody tr:last-child td {
                border-bottom: none;
            }
            .summary-section {
                background: #f9f9f9;
                padding: 20px;
                border-radius: 5px;
                margin: 20px 0;
            }
            .summary-row {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                font-size: 14px;
                border-bottom: 1px solid #e0e0e0;
            }
            .summary-row:last-child {
                border-bottom: none;
            }
            .summary-row.total {
                background: #007bff;
                color: white;
                padding: 12px;
                margin: 0 -20px -20px -20px;
                border-radius: 0 0 5px 5px;
                font-weight: 700;
                font-size: 16px;
                border-bottom: none;
            }
            .summary-label {
                font-weight: 600;
            }
            .summary-value {
                text-align: right;
            }
            .address-section {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin: 25px 0;
                font-size: 13px;
            }
            .address-box {
                padding: 15px;
                background: #f9f9f9;
                border-radius: 5px;
                border: 1px solid #e0e0e0;
            }
            .address-box h4 {
                color: #007bff;
                font-size: 12px;
                text-transform: uppercase;
                margin-bottom: 10px;
                font-weight: 700;
            }
            .address-box p {
                margin: 5px 0;
                color: #555;
                line-height: 1.5;
            }
            .payment-info {
                background: #f0f8ff;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
                border-left: 4px solid #28a745;
            }
            .payment-info p {
                font-size: 13px;
                margin: 5px 0;
            }
            .payment-status {
                color: #28a745;
                font-weight: 700;
            }
            .cta-button {
                display: inline-block;
                background: #007bff;
                color: white;
                padding: 12px 30px;
                border-radius: 5px;
                text-decoration: none;
                margin: 20px 0;
                font-weight: 600;
                font-size: 14px;
            }
            .cta-button:hover {
                background: #0056b3;
            }
            .next-steps {
                background: #fff3cd;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
                border-left: 4px solid #ffc107;
            }
            .next-steps h4 {
                color: #856404;
                font-size: 13px;
                margin-bottom: 8px;
                text-transform: uppercase;
                font-weight: 700;
            }
            .next-steps ol {
                margin-left: 20px;
                font-size: 13px;
                color: #856404;
            }
            .next-steps li {
                margin: 5px 0;
            }
            .footer {
                background: #f5f5f5;
                padding: 20px;
                text-align: center;
                font-size: 12px;
                color: #666;
                border-top: 1px solid #e0e0e0;
            }
            .footer-links {
                margin: 10px 0;
            }
            .footer-links a {
                color: #007bff;
                text-decoration: none;
                margin: 0 8px;
            }
            .store-contact {
                margin-top: 15px;
                padding-top: 15px;
                border-top: 1px solid #e0e0e0;
                font-size: 12px;
            }
            @media only screen and (max-width: 600px) {
                .address-section {
                    grid-template-columns: 1fr;
                }
                .order-info-grid {
                    grid-template-columns: 1fr;
                }
                .header h1 {
                    font-size: 22px;
                }
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <!-- Header -->
            <div class="header">
                <h1>✓ Order Confirmed!</h1>
                <p>Thank you for your order at ${data.storeName || "Wholesiii"}</p>
            </div>

            <!-- Main Content -->
            <div class="content">
                <!-- Greeting -->
                <div class="greeting">
                    <p>Hi <strong>${data.customerName}</strong>,</p>
                    <p>We're excited to confirm that your order has been received and is being prepared. You can track your order using the details below.</p>
                </div>

                <!-- Order Info -->
                <div class="order-info">
                    <div class="order-info-grid">
                        <div class="order-info-item">
                            <div class="order-info-label">Order Number</div>
                            <div class="order-info-value">${data.orderId}</div>
                        </div>
                        <div class="order-info-item">
                            <div class="order-info-label">Order Date</div>
                            <div class="order-info-value">${orderDate}</div>
                        </div>
                        <div class="order-info-item">
                            <div class="order-info-label">Order Total</div>
                            <div class="order-info-value">₹${data.total.toFixed(2)}</div>
                        </div>
                        <div class="order-info-item">
                            <div class="order-info-label">Payment Status</div>
                            <div class="order-info-value" style="color: #28a745; font-weight: 600;">
                                ${data.paymentStatus || "Confirmed"}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Items Table -->
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Qty</th>
                            <th>Price</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHTML}
                    </tbody>
                </table>

                <!-- Summary Section -->
                <div class="summary-section">
                    <div class="summary-row">
                        <span class="summary-label">Subtotal:</span>
                        <span class="summary-value">₹${data.subtotal.toFixed(2)}</span>
                    </div>
                    <div class="summary-row">
                        <span class="summary-label">Shipping:</span>
                        <span class="summary-value">₹${data.shippingCost.toFixed(2)}</span>
                    </div>
                    ${discountRow}
                    <div class="summary-row total">
                        <span class="summary-label">Total Amount:</span>
                        <span class="summary-value">₹${data.total.toFixed(2)}</span>
                    </div>
                </div>

                <!-- Shipping Address -->
                <div class="address-section">
                    <div class="address-box">
                        <h4>Shipping Address</h4>
                        <p>${data.shippingAddress.street || "N/A"}</p>
                        <p>${data.shippingAddress.city || ""}, ${data.shippingAddress.state || ""}</p>
                        <p>${data.shippingAddress.postalCode || ""}, ${data.shippingAddress.country || "India"}</p>
                        ${data.customerPhone ? `<p>Phone: ${data.customerPhone}</p>` : ""}
                    </div>
                    <div class="address-box">
                        <h4>Payment Information</h4>
                        <p><strong>Method:</strong> ${data.paymentMethod || "Online Payment"}</p>
                        <p><strong>Status:</strong> <span class="payment-status">${data.paymentStatus || "Confirmed"}</span></p>
                        <p style="margin-top: 10px; font-size: 12px; color: #666;">
                            Your invoice has been saved to your account and is also attached to this email.
                        </p>
                    </div>
                </div>

                <!-- Next Steps -->
                <div class="next-steps">
                    <h4>What Happens Next?</h4>
                    <ol>
                        <li><strong>Preparation:</strong> Your items are being carefully prepared for shipment (1-2 business days)</li>
                        <li><strong>Shipment:</strong> You'll receive a shipping notification with tracking details</li>
                        <li><strong>Delivery:</strong> Track your package in real-time using your tracking number</li>
                        <li><strong>Delivered:</strong> Sign for your package and enjoy your purchase!</li>
                    </ol>
                </div>

                <!-- Call to Action -->
                <div style="text-align: center;">
                    <a href="https://wholesiii.com/orders/${data.orderId}" class="cta-button">View Order Details</a>
                </div>

                <!-- Support Info -->
                <div class="payment-info">
                    <p>
                        <strong>Need Help?</strong> We're here to assist! If you have any questions about your order, please don't hesitate to reach out.
                    </p>
                    <p style="margin-top: 10px; font-size: 12px;">
                        📧 Email: ${data.storeEmail || "support@wholesiii.com"}
                        ${data.storePhone ? `<br>📞 Phone: ${data.storePhone}` : ""}
                    </p>
                </div>
            </div>

            <!-- Footer -->
            <div class="footer">
                <p>
                    Thank you for shopping at <strong>${data.storeName || "Wholesiii"}</strong>
                </p>
                <div class="footer-links">
                    <a href="https://wholesiii.com">Store</a>
                    <a href="https://wholesiii.com/orders">My Orders</a>
                    <a href="https://wholesiii.com/contact">Contact Us</a>
                    <a href="https://wholesiii.com/privacy-policy">Privacy Policy</a>
                </div>
                <div class="store-contact">
                    <p>© ${new Date().getFullYear()} ${data.storeName || "Wholesiii"}. All rights reserved.</p>
                    <p>This is an automated email. Please do not reply to this address.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
}

/**
 * Generate Order Shipped Email Template
 * Tracking and delivery information
 */
export function generateOrderShippedTemplate(
    data: ShippedTemplateData,
): string {
    const deliveryInfo = data.estimatedDelivery
        ? new Date(data.estimatedDelivery).toLocaleDateString("en-IN", {
            year: "numeric",
            month: "long",
            day: "numeric",
        })
        : "Typically 3-5 business days";

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                background: #f5f5f5;
            }
            .email-container {
                max-width: 650px;
                margin: 0 auto;
                background: white;
            }
            .header {
                background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%);
                color: white;
                padding: 40px 20px;
                text-align: center;
            }
            .header h1 {
                font-size: 28px;
                margin-bottom: 5px;
            }
            .header p {
                font-size: 14px;
                opacity: 0.9;
            }
            .content {
                padding: 30px 20px;
            }
            .greeting {
                font-size: 16px;
                margin-bottom: 20px;
                line-height: 1.8;
            }
            .tracking-card {
                background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%);
                color: white;
                padding: 25px;
                border-radius: 8px;
                margin: 25px 0;
                text-align: center;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .tracking-card h2 {
                font-size: 14px;
                opacity: 0.9;
                text-transform: uppercase;
                margin-bottom: 10px;
                font-weight: 600;
            }
            .tracking-number {
                font-size: 24px;
                font-weight: 700;
                font-family: 'Courier New', monospace;
                margin: 10px 0;
                letter-spacing: 1px;
                word-break: break-all;
            }
            .tracking-copy-hint {
                font-size: 12px;
                opacity: 0.8;
                margin-top: 10px;
            }
            .timeline {
                margin: 30px 0;
            }
            .timeline-step {
                display: flex;
                margin: 15px 0;
            }
            .timeline-icon {
                width: 40px;
                height: 40px;
                background: #28a745;
                color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                flex-shrink: 0;
                margin-right: 15px;
            }
            .timeline-step.completed .timeline-icon {
                background: #28a745;
            }
            .timeline-step.current .timeline-icon {
                background: #ffc107;
                animation: pulse 2s infinite;
            }
            .timeline-step.pending .timeline-icon {
                background: #ccc;
                color: #999;
            }
            @keyframes pulse {
                0%, 100% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.7); }
                50% { box-shadow: 0 0 0 10px rgba(255, 193, 7, 0); }
            }
            .timeline-content {
                flex: 1;
            }
            .timeline-title {
                font-weight: 700;
                color: #333;
                font-size: 15px;
                margin-bottom: 3px;
            }
            .timeline-description {
                color: #666;
                font-size: 13px;
            }
            .info-box {
                background: #f0f8ff;
                padding: 15px;
                border-radius: 5px;
                margin: 15px 0;
                border-left: 4px solid #007bff;
            }
            .info-box p {
                font-size: 13px;
                margin: 5px 0;
            }
            .info-box strong {
                color: #007bff;
            }
            .courier-info {
                background: #f9f9f9;
                padding: 15px;
                border-radius: 5px;
                margin: 15px 0;
                border: 1px solid #e0e0e0;
            }
            .courier-info p {
                font-size: 13px;
                margin: 8px 0;
            }
            .cta-button {
                display: inline-block;
                background: #28a745;
                color: white;
                padding: 12px 30px;
                border-radius: 5px;
                text-decoration: none;
                margin: 20px 0;
                font-weight: 600;
                font-size: 14px;
            }
            .cta-button:hover {
                background: #1e7e34;
            }
            .cta-secondary {
                background: #007bff;
                margin-left: 10px;
            }
            .cta-secondary:hover {
                background: #0056b3;
            }
            .button-group {
                text-align: center;
            }
            .delivery-estimate {
                background: #fff3cd;
                padding: 15px;
                border-radius: 5px;
                margin: 15px 0;
                border-left: 4px solid #ffc107;
            }
            .delivery-estimate h4 {
                color: #856404;
                font-size: 13px;
                text-transform: uppercase;
                margin-bottom: 8px;
                font-weight: 700;
            }
            .delivery-estimate p {
                color: #856404;
                font-size: 14px;
                margin: 5px 0;
            }
            .footer {
                background: #f5f5f5;
                padding: 20px;
                text-align: center;
                font-size: 12px;
                color: #666;
                border-top: 1px solid #e0e0e0;
            }
            .footer-links {
                margin: 10px 0;
            }
            .footer-links a {
                color: #007bff;
                text-decoration: none;
                margin: 0 8px;
            }
            @media only screen and (max-width: 600px) {
                .button-group {
                    text-align: left;
                }
                .cta-secondary {
                    display: block;
                    margin-left: 0;
                    margin-top: 10px;
                }
                .header h1 {
                    font-size: 22px;
                }
                .tracking-number {
                    font-size: 20px;
                }
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <!-- Header -->
            <div class="header">
                <h1>Order Shipped!</h1>
                <p>Your order is on its way to you</p>
            </div>

            <!-- Main Content -->
            <div class="content">
                <!-- Greeting -->
                <div class="greeting">
                    <p>Hi <strong>${data.customerName}</strong>,</p>
                    <p>Great news! Your order <strong>${data.orderId}</strong> has been shipped and is on its way to you. You can track your package using the details below.</p>
                </div>

                <!-- Tracking Card -->
                <div class="tracking-card">
                    <h2>🚚 Tracking Number</h2>
                    <div class="tracking-number">${data.trackingNumber}</div>
                    <div class="tracking-copy-hint">Save this number to track your package</div>
                </div>

                <!-- Estimated Delivery -->
                <div class="delivery-estimate">
                    <h4>Estimated Delivery</h4>
                    <p><strong>${deliveryInfo}</strong></p>
                    <p style="font-size: 12px; margin-top: 10px;">
                        Delivery times are estimates and may vary based on location and unforeseen circumstances.
                    </p>
                </div>

                <!-- Timeline -->
                <div class="timeline">
                    <div class="timeline-step completed">
                        <div class="timeline-icon">✓</div>
                        <div class="timeline-content">
                            <div class="timeline-title">Order Confirmed</div>
                            <div class="timeline-description">Your order has been confirmed and payment received</div>
                        </div>
                    </div>
                    <div class="timeline-step completed">
                        <div class="timeline-icon">✓</div>
                        <div class="timeline-content">
                            <div class="timeline-title">Picked & Packed</div>
                            <div class="timeline-description">Your items have been carefully packed</div>
                        </div>
                    </div>
                    <div class="timeline-step current">
                        <div class="timeline-icon">•</div>
                        <div class="timeline-content">
                            <div class="timeline-title">Shipped</div>
                            <div class="timeline-description">Your package is on its way!</div>
                        </div>
                    </div>
                    <div class="timeline-step pending">
                        <div class="timeline-icon">🚚</div>
                        <div class="timeline-content">
                            <div class="timeline-title">Out for Delivery</div>
                            <div class="timeline-description">Your package will be out for delivery soon</div>
                        </div>
                    </div>
                    <div class="timeline-step pending">
                        <div class="timeline-icon">✓</div>
                        <div class="timeline-content">
                            <div class="timeline-title">Delivered</div>
                            <div class="timeline-description">Package delivered to you!</div>
                        </div>
                    </div>
                </div>

                <!-- Courier Info -->
                <div class="courier-info">
                    <strong>Courier Partner: ${data.courierName || "Delhivery"}</strong>
                    <p>
                        Your package is being delivered by ${data.courierName || "Delhivery"}. You can track your shipment in real-time using the tracking number provided above.
                    </p>
                </div>

                <!-- Helpful Info -->
                <div class="info-box">
                    <p>
                        <strong>Tracking Tip:</strong> Visit the ${data.courierName || "Delhivery"} website and enter your tracking number to get real-time updates on your package location.
                    </p>
                </div>

                <!-- Action Buttons -->
                <div class="button-group">
                    <a href="https://wholesiii.com/orders/${data.orderId}" class="cta-button">View Order</a>
                    <a href="https://wholesiii.com/track/${data.trackingNumber}" class="cta-button cta-secondary">Track Package</a>
                </div>

                <!-- Additional Info -->
                <div class="info-box">
                    <p>
                        <strong>What should I do?</strong>
                    </p>
                    <ul style="margin-left: 20px; font-size: 13px;">
                        <li>Keep your tracking number safe</li>
                        <li>Check tracking status regularly</li>
                        <li>Ensure someone is available to receive the package</li>
                        <li>Inspect package upon delivery before signing</li>
                    </ul>
                </div>
            </div>

            <!-- Footer -->
            <div class="footer">
                <p>
                    Thank you for shopping with us!
                </p>
                <div class="footer-links">
                    <a href="https://wholesiii.com/orders">My Orders</a>
                    <a href="https://wholesiii.com/contact">Contact Us</a>
                    <a href="https://wholesiii.com/returns">Return Policy</a>
                </div>
                <p style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
                    © ${new Date().getFullYear()} Wholesiii. All rights reserved.<br>
                    This is an automated email. Please do not reply to this address.
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
}

/**
 * Generate Order Cancelled Email Template
 * Cancellation confirmation and refund information
 */
export function generateOrderCancelledTemplate(
    data: CancelledTemplateData,
): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                background: #f5f5f5;
            }
            .email-container {
                max-width: 650px;
                margin: 0 auto;
                background: white;
            }
            .header {
                background: linear-gradient(135deg, #dc3545 0%, #a02830 100%);
                color: white;
                padding: 40px 20px;
                text-align: center;
            }
            .header h1 {
                font-size: 28px;
                margin-bottom: 5px;
            }
            .header p {
                font-size: 14px;
                opacity: 0.9;
            }
            .content {
                padding: 30px 20px;
            }
            .alert {
                background: #f8d7da;
                border: 1px solid #f5c6cb;
                color: #721c24;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
                border-left: 4px solid #dc3545;
            }
            .alert h3 {
                font-size: 14px;
                margin-bottom: 8px;
                text-transform: uppercase;
                font-weight: 700;
            }
            .alert p {
                font-size: 13px;
                margin: 5px 0;
            }
            .cancellation-info {
                background: #f9f9f9;
                padding: 20px;
                border-radius: 5px;
                margin: 20px 0;
                border: 1px solid #e0e0e0;
            }
            .info-item {
                display: flex;
                justify-content: space-between;
                padding: 10px 0;
                border-bottom: 1px solid #e0e0e0;
                font-size: 14px;
            }
            .info-item:last-child {
                border-bottom: none;
            }
            .info-label {
                font-weight: 600;
                color: #555;
            }
            .info-value {
                color: #333;
            }
            .refund-box {
                background: linear-gradient(135deg, #e7f3ff 0%, #f0f8ff 100%);
                border: 2px solid #007bff;
                padding: 20px;
                border-radius: 8px;
                margin: 25px 0;
            }
            .refund-box h3 {
                color: #007bff;
                font-size: 14px;
                text-transform: uppercase;
                margin-bottom: 15px;
                font-weight: 700;
            }
            .refund-amount {
                font-size: 24px;
                color: #007bff;
                font-weight: 700;
                margin: 10px 0;
            }
            .refund-details {
                font-size: 13px;
                color: #555;
                margin-top: 15px;
                line-height: 1.8;
            }
            .refund-details p {
                margin: 8px 0;
            }
            .timeline {
                margin: 25px 0;
            }
            .timeline-item {
                display: flex;
                margin: 15px 0;
            }
            .timeline-icon {
                width: 40px;
                height: 40px;
                background: #e0e0e0;
                color: #666;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                flex-shrink: 0;
                margin-right: 15px;
            }
            .timeline-item.completed .timeline-icon {
                background: #28a745;
                color: white;
            }
            .timeline-item.current .timeline-icon {
                background: #dc3545;
                color: white;
            }
            .timeline-content h4 {
                font-weight: 700;
                color: #333;
                font-size: 14px;
                margin-bottom: 3px;
            }
            .timeline-content p {
                color: #666;
                font-size: 13px;
            }
            .reason-box {
                background: #fff3cd;
                padding: 15px;
                border-radius: 5px;
                margin: 15px 0;
                border-left: 4px solid #ffc107;
            }
            .reason-box h4 {
                color: #856404;
                font-size: 13px;
                text-transform: uppercase;
                margin-bottom: 8px;
                font-weight: 700;
            }
            .reason-box p {
                color: #856404;
                font-size: 13px;
            }
            .next-steps {
                background: #f0f8ff;
                padding: 15px;
                border-radius: 5px;
                margin: 15px 0;
                border-left: 4px solid #007bff;
            }
            .next-steps h4 {
                color: #004085;
                font-size: 13px;
                text-transform: uppercase;
                margin-bottom: 10px;
                font-weight: 700;
            }
            .next-steps ol {
                margin-left: 20px;
                font-size: 13px;
                color: #004085;
            }
            .next-steps li {
                margin: 5px 0;
            }
            .cta-button {
                display: inline-block;
                background: #007bff;
                color: white;
                padding: 12px 30px;
                border-radius: 5px;
                text-decoration: none;
                margin: 20px 0;
                font-weight: 600;
                font-size: 14px;
            }
            .cta-button:hover {
                background: #0056b3;
            }
            .support-box {
                background: #f9f9f9;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
                border: 1px solid #e0e0e0;
            }
            .support-box p {
                font-size: 13px;
                margin: 8px 0;
            }
            .footer {
                background: #f5f5f5;
                padding: 20px;
                text-align: center;
                font-size: 12px;
                color: #666;
                border-top: 1px solid #e0e0e0;
            }
            .footer-links {
                margin: 10px 0;
            }
            .footer-links a {
                color: #007bff;
                text-decoration: none;
                margin: 0 8px;
            }
            @media only screen and (max-width: 600px) {
                .header h1 {
                    font-size: 22px;
                }
                .refund-amount {
                    font-size: 20px;
                }
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <!-- Header -->
            <div class="header">
                <h1>✓ Order Cancelled</h1>
                <p>Your order cancellation has been processed</p>
            </div>

            <!-- Main Content -->
            <div class="content">
                <!-- Alert -->
                <div class="alert">
                    <h3>Order Cancellation Confirmed</h3>
                    <p>Your order <strong>${data.orderId}</strong> has been cancelled as requested.</p>
                </div>

                <!-- Cancellation Info -->
                <div class="cancellation-info">
                    <div class="info-item">
                        <span class="info-label">Order Number:</span>
                        <span class="info-value">${data.orderId}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Cancellation Date:</span>
                        <span class="info-value">${new Date().toLocaleDateString("en-IN")}</span>
                    </div>
                    ${data.cancellationReason
            ? `
                    <div class="info-item">
                        <span class="info-label">Reason:</span>
                        <span class="info-value">${data.cancellationReason}</span>
                    </div>
                    `
            : ""
        }
                </div>

                <!-- Refund Information -->
                <div class="refund-box">
                    <h3>Refund Information</h3>
                    <div class="refund-amount">₹${data.refundAmount.toFixed(2)}</div>
                    <div class="refund-details">
                        <p><strong>Refund Amount:</strong> ₹${data.refundAmount.toFixed(2)}</p>
                        <p><strong>Refund Method:</strong> ${data.refundMethod || "Original Payment Method"}</p>
                        <p><strong>Processing Time:</strong> ${data.refundTimeline || "5-7 business days"}</p>
                        <p style="font-size: 12px; margin-top: 15px; padding-top: 15px; border-top: 1px solid #b3d9ff;">
                            The refund will be credited to your ${data.refundMethod || "original payment method"}. Please allow ${data.refundTimeline || "5-7 business days"} for the amount to appear in your account.
                        </p>
                    </div>
                </div>

                <!-- Reason for Cancellation -->
                ${data.cancellationReason
            ? `
                <div class="reason-box">
                    <h4>Cancellation Reason</h4>
                    <p>${data.cancellationReason}</p>
                </div>
                `
            : ""
        }

                <!-- Cancellation Timeline -->
                <div class="timeline">
                    <div class="timeline-item completed">
                        <div class="timeline-icon">✓</div>
                        <div class="timeline-content">
                            <h4>Order Cancelled</h4>
                            <p>Your order has been cancelled successfully</p>
                        </div>
                    </div>
                    <div class="timeline-item current">
                        <div class="timeline-icon">•</div>
                        <div class="timeline-content">
                            <h4>Refund Processing</h4>
                            <p>Your refund is being processed and will be credited soon</p>
                        </div>
                    </div>
                    <div class="timeline-item">
                        <div class="timeline-icon">✓</div>
                        <div class="timeline-content">
                            <h4>Refund Completed</h4>
                            <p>Refund has been successfully credited to your account</p>
                        </div>
                    </div>
                </div>

                <!-- Important Notes -->
                <div class="next-steps">
                    <h4>Important Information</h4>
                    <ol>
                        <li>Your refund will be processed within ${data.refundTimeline || "5-7 business days"}</li>
                        <li>Refunds are credited to the original payment method</li>
                        <li>If you paid by card, the refund will appear as a credit on your statement</li>
                        <li>You can check refund status in your account under "Order History"</li>
                    </ol>
                </div>

                <!-- Call to Action -->
                <div style="text-align: center;">
                    <a href="https://wholesiii.com/orders/${data.orderId}" class="cta-button">View Order Details</a>
                </div>

                <!-- Support -->
                <div class="support-box">
                    <p>
                        <strong>We'd Love Your Feedback!</strong>
                    </p>
                    <p>
                        If you cancelled due to any issue with our service or products, we'd appreciate your feedback. This helps us improve!
                    </p>
                    <p style="margin-top: 10px;">
                        📧 Email: ${data.storeEmail || "support@wholesiii.com"}
                        ${data.storePhone ? `<br>📞 Phone: ${data.storePhone}` : ""}
                    </p>
                </div>

                <!-- Reorder CTA -->
                <div style="background: #f0f8ff; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center; border: 1px solid #b3d9ff;">
                    <p style="font-size: 13px; margin: 8px 0;">
                        <strong>Interested in shopping again?</strong>
                    </p>
                    <p style="font-size: 13px; margin: 8px 0; color: #666;">
                        We'd love to have you back. Browse our latest products or enjoy special discount offers for our valued customers.
                    </p>
                    <a href="https://wholesiii.com" style="display: inline-block; background: #007bff; color: white; padding: 10px 25px; border-radius: 5px; text-decoration: none; margin-top: 10px; font-weight: 600; font-size: 13px;">
                        Browse Products
                    </a>
                </div>
            </div>

            <!-- Footer -->
            <div class="footer">
                <p>
                    Thank you for giving us the opportunity to serve you.
                </p>
                <div class="footer-links">
                    <a href="https://wholesiii.com">Store</a>
                    <a href="https://wholesiii.com/orders">My Orders</a>
                    <a href="https://wholesiii.com/contact">Contact Us</a>
                </div>
                <p style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
                    © ${new Date().getFullYear()} Wholesiii. All rights reserved.<br>
                    This is an automated email. Please do not reply to this address.
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
}
