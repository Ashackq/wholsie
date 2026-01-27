"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getOrder, createPaymentOrder, deleteOrder } from "@/lib/api";

interface Order {
    _id: string;
    orderId?: string;
    orderNo?: string;
    userId?: string;
    customerId?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    addressId?: string;
    invoiceUrl?: string;
    invoiceId?: any;
    items: Array<{
        productId?: string;
        quantity: number;
        price: number;
        name: string;
    }>;
    shippingAddress?: {
        street?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
    };
    deliveryAddress?: string;
    deliveryCity?: string;
    deliveryState?: string;
    deliveryPincode?: string;
    status: string;
    paymentStatus: string;
    total?: number;
    netAmount?: number;
    subtotal: number;
    tax?: number;
    taxAmount?: number;
    shippingCost?: number;
    deliveryCharge?: number;
    discount?: number;
    couponAmount?: number;
    razorpayOrderId?: string;
    delhiveryTrackingId?: string;
    createdAt: string;
    updatedAt: string;
}

export default function OrderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const orderId = params.id as string;

    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [paying, setPaying] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        loadOrder();
    }, [orderId]);

    const loadOrder = async () => {
        try {
            const data = await getOrder(orderId);
            const orderData = data.data;
            console.log("Order data received:", orderData);
            console.log("Shipping Address:", orderData?.shippingAddress);
            console.log("Delivery Info:", {
                city: orderData?.deliveryCity,
                state: orderData?.deliveryState,
                pincode: orderData?.deliveryPincode
            });
            console.log("Total/NetAmount:", orderData?.total || orderData?.netAmount);
            setOrder(orderData || null);
        } catch (err) {
            console.error("Failed to load order:", err);
            router.push("/orders");
        } finally {
            setLoading(false);
        }
    };

    const handlePayNow = async () => {
        if (!order) return;
        setPaying(true);
        setError("");

        try {
            // Create payment order
            const paymentRes = await createPaymentOrder(orderId);
            const razorpayOrderId = paymentRes.order.id;
            const total = order.netAmount || order.total || 0;

            // Initialize Razorpay
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.async = true;
            script.onload = () => {
                const options = {
                    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                    order_id: razorpayOrderId,
                    amount: Math.round(total * 100),
                    currency: "INR",
                    name: "Wholesii",
                    description: `Payment for Order ${order.orderNo || order.orderId}`,
                    handler: async () => {
                        // Payment successful
                        setError("");
                        alert("Payment successful!");
                        await loadOrder();
                    },
                    prefill: {
                        name: "",
                        email: "",
                    },
                    theme: {
                        color: "#F05F22",
                    },
                    modal: {
                        ondismiss: () => {
                            setPaying(false);
                        },
                    },
                };

                const razorpay = new (window as any).Razorpay(options);
                razorpay.on("payment.failed", (response: any) => {
                    setError(`Payment failed: ${response.error.description}`);
                    setPaying(false);
                });
                razorpay.open();
            };
            document.body.appendChild(script);
        } catch (err: any) {
            setError(err.message || "Failed to initiate payment");
            setPaying(false);
        }
    };

    const handleDelete = async () => {
        if (!order || !confirm("Are you sure you want to delete this order? This cannot be undone.")) {
            return;
        }

        setDeleting(true);
        setError("");

        try {
            await deleteOrder(orderId);
            alert("Order deleted successfully");
            router.push("/orders");
        } catch (err: any) {
            setError(err.message || "Failed to delete order");
            setDeleting(false);
        }
    };

    const handleCancel = async () => {
        if (!order || !confirm("Are you sure you want to cancel this order? This action cannot be undone.")) {
            return;
        }

        setCancelling(true);
        setError("");

        try {
            const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
            const res = await fetch(`${API}/orders/${orderId}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to cancel order");
            }

            const data = await res.json();
            alert("Order cancelled successfully");
            setOrder(data.data);
        } catch (err: any) {
            setError(err.message || "Failed to cancel order");
            setCancelling(false);
        }
    };

    if (loading) {
        return (
            <section className="mt_55 mb_100">
                <div className="container">
                    <p>Loading order details...</p>
                </div>
            </section>
        );
    }

    if (!order) {
        return (
            <section className="mt_55 mb_100">
                <div className="container">
                    <p>Order not found</p>
                    <Link href="/orders" className="common_btn mt-3">
                        Back to Orders
                    </Link>
                </div>
            </section>
        );
    }

    return (
        <section className="mt_55 mb_100">
            <div className="container">
                <div className="mb-4">
                    <Link href="/orders" style={{ color: "var(--primary)", textDecoration: "none", fontSize: "16px" }}>
                        <i className="fas fa-arrow-left"></i> Back to Orders
                    </Link>
                </div>

                <div className="row mb-4">
                    <div className="col-12">
                        <div style={{ padding: "20px", background: "#fff", border: "1px solid #eee", borderRadius: "8px" }}>
                            <div className="d-flex justify-content-between align-items-start">
                                <div>
                                    <h2 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "8px" }}>
                                        Order #{order.orderId}
                                    </h2>
                                    <p style={{ color: "#666", fontSize: "14px" }}>
                                        Placed on {new Date(order.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                    {(order as any).invoiceUrl && (
                                        <a 
                                            href={(order as any).invoiceUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="common_btn" 
                                            style={{ 
                                                padding: "8px 16px", 
                                                fontSize: "14px", 
                                                backgroundColor: "#28a745", 
                                                color: "white", 
                                                textDecoration: "none",
                                                borderRadius: "6px",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "6px"
                                            }}
                                            title="Download Invoice PDF"
                                        >
                                            <i className="fas fa-file-pdf"></i>
                                            Download Invoice
                                        </a>
                                    )}
                                    <span
                                        className="badge"
                                        style={{
                                            padding: "8px 16px",
                                            borderRadius: "20px",
                                            fontSize: "14px",
                                            backgroundColor:
                                                order.status === "delivered" ? "#d4edda" :
                                                    order.status === "shipped" ? "#d1ecf1" :
                                                        order.status === "processing" ? "#fff3cd" : "#f8d7da",
                                            color:
                                                order.status === "delivered" ? "#155724" :
                                                    order.status === "shipped" ? "#0c5460" :
                                                        order.status === "processing" ? "#856404" : "#721c24"
                                        }}
                                    >
                                        {order.status?.toUpperCase() || 'PENDING'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row">
                    <div className="col-lg-8">
                        <div style={{ padding: "25px", background: "#fff", border: "1px solid #eee", borderRadius: "8px", marginBottom: "20px" }}>
                            <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "20px" }}>Order Items</h3>
                            <div className="table-responsive">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Product</th>
                                            <th>Price</th>
                                            <th>Quantity</th>
                                            <th>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {order.items.map((item, idx) => (
                                            <tr key={idx}>
                                                <td>{item.name}</td>
                                                <td>₹{item.price.toFixed(2)}</td>
                                                <td>{item.quantity}</td>
                                                <td><strong>₹{(item.price * item.quantity).toFixed(2)}</strong></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div style={{ padding: "25px", background: "#fff", border: "1px solid #eee", borderRadius: "8px", marginBottom: "20px" }}>
                            <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "15px" }}>
                                <i className="fas fa-map-marker-alt"></i> Shipping Address
                            </h3>
                            {((order.shippingAddress && (order.shippingAddress.street || order.shippingAddress.city)) ||
                                (order.deliveryCity || order.deliveryState || order.deliveryPincode)) ? (
                                <address style={{ marginBottom: "0", fontStyle: "normal", lineHeight: "1.6" }}>
                                    {order.shippingAddress?.street && <>{order.shippingAddress.street}<br /></>}
                                    {order.deliveryAddress && <>{order.deliveryAddress}<br /></>}
                                    {(order.shippingAddress?.city || order.deliveryCity) && (
                                        <>
                                            {order.shippingAddress?.city || order.deliveryCity}
                                            {(order.shippingAddress?.state || order.deliveryState) &&
                                                `, ${order.shippingAddress?.state || order.deliveryState}`}
                                            {(order.shippingAddress?.postalCode || order.deliveryPincode) &&
                                                ` ${order.shippingAddress?.postalCode || order.deliveryPincode}`}
                                            <br />
                                        </>
                                    )}
                                    {order.shippingAddress?.country && <>{order.shippingAddress.country}</>}
                                </address>
                            ) : (
                                <p style={{ color: "#999", fontSize: "14px" }}>
                                    <i className="fas fa-exclamation-circle"></i> Shipping address not provided for this order
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="col-lg-4">
                        <div style={{ padding: "25px", background: "#fff", border: "1px solid #eee", borderRadius: "8px", marginBottom: "20px" }}>
                            <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "20px" }}>Order Summary</h3>
                            <div style={{ borderBottom: "1px solid #eee", paddingBottom: "15px", marginBottom: "15px" }}>
                                <div className="d-flex justify-content-between mb-2">
                                    <span>Subtotal:</span>
                                    <span>₹{order.subtotal.toFixed(2)}</span>
                                </div>
                                {((order.tax && order.tax > 0) || (order.taxAmount && order.taxAmount > 0)) && (
                                    <div className="d-flex justify-content-between mb-2">
                                        <span>Tax:</span>
                                        <span>₹{(order.tax || order.taxAmount || 0).toFixed(2)}</span>
                                    </div>
                                )}
                                {((order.shippingCost && order.shippingCost > 0) || (order.deliveryCharge && order.deliveryCharge > 0)) && (
                                    <div className="d-flex justify-content-between mb-2">
                                        <span>Shipping:</span>
                                        <span>₹{(order.shippingCost || order.deliveryCharge || 0).toFixed(2)}</span>
                                    </div>
                                )}
                                {((order.discount && order.discount > 0) || (order.couponAmount && order.couponAmount > 0)) && (
                                    <div className="d-flex justify-content-between mb-2 text-success">
                                        <span>Discount:</span>
                                        <span>-₹{(order.discount || order.couponAmount || 0).toFixed(2)}</span>
                                    </div>
                                )}
                            </div>
                            <div className="d-flex justify-content-between" style={{ fontSize: "18px", fontWeight: "700" }}>
                                <span>Total:</span>
                                <span style={{ color: "var(--primary)" }}>
                                    ₹{(order.total || order.netAmount || order.subtotal || 0).toFixed(2)}
                                </span>
                            </div>
                            {!order.total && !order.netAmount && order.subtotal && (
                                <p style={{ fontSize: "12px", color: "#999", marginTop: "8px", marginBottom: "0" }}>
                                    <i className="fas fa-info-circle"></i> Total calculated from subtotal
                                </p>
                            )}
                        </div>

                        <div style={{ padding: "25px", background: "#fff", border: "1px solid #eee", borderRadius: "8px", marginBottom: "20px" }}>
                            <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "15px" }}>
                                <i className="fas fa-credit-card"></i> Payment
                            </h3>
                            <span
                                className="badge"
                                style={{
                                    padding: "6px 12px",
                                    borderRadius: "20px",
                                    fontSize: "13px",
                                    backgroundColor:
                                        order.paymentStatus === "completed" ? "#d4edda" :
                                            order.paymentStatus === "failed" ? "#f8d7da" : "#fff3cd",
                                    color:
                                        order.paymentStatus === "completed" ? "#155724" :
                                            order.paymentStatus === "failed" ? "#721c24" : "#856404"
                                }}
                            >
                                {order.paymentStatus?.toUpperCase() || 'PENDING'}
                            </span>
                            {order.razorpayOrderId && (
                                <p style={{ marginTop: "10px", fontSize: "13px", color: "#666" }}>
                                    ID: {order.razorpayOrderId}
                                </p>
                            )}

                            {order.paymentStatus !== "completed" && (
                                <button
                                    onClick={handlePayNow}
                                    disabled={paying}
                                    className="common_btn"
                                    style={{
                                        width: "100%",
                                        marginTop: "15px",
                                        opacity: paying ? 0.6 : 1,
                                        cursor: paying ? "not-allowed" : "pointer"
                                    }}
                                >
                                    {paying ? "Processing..." : "Pay Now"}
                                </button>
                            )}
                        </div>

                        {error && (
                            <div style={{ padding: "15px", background: "#f8d7da", border: "1px solid #f5c6cb", borderRadius: "8px", marginBottom: "20px", color: "#721c24" }}>
                                {error}
                            </div>
                        )}

                        {order.paymentStatus !== "completed" && order.status !== "shipped" && order.status !== "delivered" && (
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                style={{
                                    width: "100%",
                                    padding: "12px",
                                    background: "#dc3545",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "8px",
                                    cursor: deleting ? "not-allowed" : "pointer",
                                    opacity: deleting ? 0.6 : 1,
                                    fontSize: "16px",
                                    fontWeight: "600"
                                }}
                            >
                                {deleting ? "Deleting..." : "Delete Order"}
                            </button>
                        )}

                        {["pending", "confirmed", "processing"].includes(order.status) && order.status !== "cancelled" && (
                            <button
                                onClick={handleCancel}
                                disabled={cancelling}
                                style={{
                                    width: "100%",
                                    padding: "12px",
                                    background: "#ff9800",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "8px",
                                    cursor: cancelling ? "not-allowed" : "pointer",
                                    opacity: cancelling ? 0.6 : 1,
                                    fontSize: "16px",
                                    fontWeight: "600",
                                    marginTop: "10px"
                                }}
                            >
                                {cancelling ? "Cancelling..." : "Cancel Order"}
                            </button>
                        )}

                        {order.delhiveryTrackingId && (
                            <div style={{ padding: "25px", background: "#fff", border: "1px solid #eee", borderRadius: "8px", marginTop: "20px" }}>
                                <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "15px" }}>
                                    <i className="fas fa-shipping-fast"></i> Tracking
                                </h3>
                                <p style={{ fontSize: "13px", color: "#666", marginBottom: "10px" }}>
                                    Tracking ID: <br />
                                    <code style={{ background: "#f8f9fa", padding: "4px 8px", borderRadius: "4px" }}>
                                        {order.delhiveryTrackingId}
                                    </code>
                                </p>
                                <a
                                    href={`https://track.delhivery.com/track/shipment/${order.delhiveryTrackingId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="common_btn"
                                    style={{ fontSize: "14px", padding: "8px", display: "inline-block", textDecoration: "none", width: "100%", textAlign: "center" }}
                                >
                                    Track Shipment
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </div >
        </section >
    );
}