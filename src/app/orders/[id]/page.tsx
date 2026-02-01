"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getOrder, createPaymentOrder, deleteOrder, trackShipment } from "@/lib/api";

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
        pincode: orderData?.deliveryPincode,
      });
      console.log("Total/NetAmount:", orderData?.total || orderData?.netAmount);
      setOrder(orderData || null);

      if (orderData?.delhiveryTrackingId) {
        try {
          await trackShipment(orderData.delhiveryTrackingId);
        } catch (trackingErr) {
          console.warn("Tracking fetch failed:", trackingErr);
        }
      }
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
          name: "Wholesiii",
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
    if (
      !order ||
      !confirm(
        "Are you sure you want to delete this order? This cannot be undone.",
      )
    ) {
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
    if (
      !order ||
      !confirm(
        "Are you sure you want to cancel this order? This action cannot be undone.",
      )
    ) {
      return;
    }

    setCancelling(true);
    setError("");

    try {
      const API =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
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
          <Link
            href="/orders"
            style={{
              color: "var(--primary)",
              textDecoration: "none",
              fontSize: "16px",
            }}
          >
            <i className="fas fa-arrow-left"></i> Back to Orders
          </Link>
        </div>

        <div className="row mb-4">
          <div className="col-12">
            <div
              style={{
                padding: "20px",
                background: "#fff",
                border: "1px solid #eee",
                borderRadius: "8px",
              }}
            >
              {/* Header Section */}
              <div style={{ marginBottom: "20px" }}>
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
                  <div>
                    <h2
                      style={{
                        fontSize: "24px",
                        fontWeight: "700",
                        marginBottom: "8px",
                      }}
                    >
                      Order #{order.orderId}
                    </h2>
                    <p
                      style={{
                        color: "#666",
                        fontSize: "14px",
                        marginBottom: "0",
                      }}
                    >
                      Placed on {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "10px",
                      alignItems: "center",
                    }}
                  >
                    {(order as any).invoiceUrl && (
                      <a
                        href={(order as any).invoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: "6px 14px",
                          fontSize: "14px",
                          backgroundColor: "#8B0000",
                          color: "white",
                          textDecoration: "none",
                          borderRadius: "20px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          border: "none",
                          cursor: "pointer",
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
                          order.status === "delivered"
                            ? "#d4edda"
                            : order.status === "shipped"
                              ? "#d1ecf1"
                              : order.status === "processing"
                                ? "#fff3cd"
                                : "#f8d7da",
                        color:
                          order.status === "delivered"
                            ? "#155724"
                            : order.status === "shipped"
                              ? "#0c5460"
                              : order.status === "processing"
                                ? "#856404"
                                : "#721c24",
                      }}
                    >
                      {order.status?.toUpperCase() || "PENDING"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment & Order Info Section */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "15px",
                  padding: "15px",
                  background: "#f8f9fa",
                  borderRadius: "8px",
                  marginBottom: "20px",
                }}
              >
                {/* Payment Status */}
                <div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#666",
                      marginBottom: "6px",
                      fontWeight: "600",
                    }}
                  >
                    <i className="fas fa-credit-card"></i> Payment Status
                  </div>
                  <div
                    style={{
                      padding: "4px 0",
                      fontSize: "13px",
                      fontWeight: "600",
                      color:
                        order.paymentStatus === "completed"
                          ? "#155724"
                          : order.paymentStatus === "failed"
                            ? "#721c24"
                            : "#856404",
                    }}
                  >
                    {order.paymentStatus?.toUpperCase() || "PENDING"}
                  </div>
                </div>

                {/* Order ID with Cancel Button */}
                <div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#666",
                      marginBottom: "6px",
                      fontWeight: "600",
                    }}
                  >
                    <i className="fas fa-hashtag"></i> Order ID
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        background: "#e9ecef",
                        padding: "4px 10px",
                        borderRadius: "15px",
                        fontSize: "11px",
                        fontWeight: "500",
                        color: "#495057",
                      }}
                    >
                      {order.orderId}
                    </span>
                    {["pending", "confirmed", "processing"].includes(
                      order.status,
                    ) &&
                      order.status !== "cancelled" && (
                        <button
                          onClick={handleCancel}
                          disabled={cancelling}
                          style={{
                            padding: "4px 12px",
                            background: "#FF6600",
                            color: "white",
                            border: "none",
                            borderRadius: "20px",
                            cursor: cancelling ? "not-allowed" : "pointer",
                            opacity: cancelling ? 0.6 : 1,
                            fontSize: "12px",
                            fontWeight: "500",
                            transition: "all 0.3s ease",
                          }}
                          onMouseEnter={(e) => {
                            if (!cancelling) {
                              e.currentTarget.style.background = "#E55A00";
                              e.currentTarget.style.transform =
                                "translateY(-2px)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "#FF6600";
                            e.currentTarget.style.transform = "translateY(0)";
                          }}
                        >
                          {cancelling ? "Cancelling..." : "Cancel Order"}
                        </button>
                      )}
                  </div>
                </div>

                {/* Tracking ID with Track Button */}
                {order.delhiveryTrackingId &&
                  ["shipped", "delivered"].includes(order.status) && (
                    <div>
                      <div
                        style={{
                          fontSize: "13px",
                          color: "#666",
                          marginBottom: "6px",
                          fontWeight: "600",
                        }}
                      >
                        <i className="fas fa-shipping-fast"></i> Tracking ID
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            background: "#e9ecef",
                            padding: "4px 10px",
                            borderRadius: "15px",
                            fontSize: "11px",
                            fontWeight: "500",
                            color: "#495057",
                          }}
                        >
                          {order.delhiveryTrackingId}
                        </span>
                        <a
                          href={`https://www.delhivery.com/track-v2/package/${order.delhiveryTrackingId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: "4px 12px",
                            background: "#17a2b8",
                            color: "white",
                            border: "none",
                            borderRadius: "20px",
                            fontSize: "12px",
                            fontWeight: "500",
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            transition: "all 0.3s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#138496";
                            e.currentTarget.style.transform = "translateY(-2px)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "#17a2b8";
                            e.currentTarget.style.transform = "translateY(0)";
                          }}
                        >
                          <i className="fas fa-map-marker-alt"></i>
                          Track
                        </a>
                      </div>
                    </div>
                  )}
                {order.delhiveryTrackingId &&
                  !["shipped", "delivered"].includes(order.status) && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#92400e",
                        background: "#fef3c7",
                        border: "1px solid #fcd34d",
                        padding: "8px 12px",
                        borderRadius: "12px",
                        display: "inline-block",
                      }}
                    >
                      Tracking will be available once your order is shipped.
                    </div>
                  )}
              </div>

              {/* Pay Now Button (if needed) */}
              {order.paymentStatus !== "completed" && (
                <div style={{ marginBottom: "20px", textAlign: "right" }}>
                  <button
                    onClick={handlePayNow}
                    disabled={paying}
                    style={{
                      padding: "8px 20px",
                      background: "#28a745",
                      color: "white",
                      border: "none",
                      borderRadius: "20px",
                      cursor: paying ? "not-allowed" : "pointer",
                      opacity: paying ? 0.6 : 1,
                      fontSize: "14px",
                      fontWeight: "500",
                      transition: "all 0.3s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!paying) {
                        e.currentTarget.style.background = "#218838";
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#28a745";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    {paying ? "Processing..." : "Pay Now"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-lg-8">
            <div
              style={{
                padding: "25px",
                background: "#fff",
                border: "1px solid #eee",
                borderRadius: "8px",
                marginBottom: "20px",
              }}
            >
              <h3
                style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  marginBottom: "20px",
                }}
              >
                Order Items
              </h3>
              <div className="table-responsive">
                <table className="table" style={{ fontSize: "14px" }}>
                  <thead>
                    <tr>
                      <th style={{ fontSize: "13px", padding: "10px 8px" }}>
                        Product
                      </th>
                      <th style={{ fontSize: "13px", padding: "10px 8px" }}>
                        Price
                      </th>
                      <th style={{ fontSize: "13px", padding: "10px 8px" }}>
                        Qty
                      </th>
                      <th style={{ fontSize: "13px", padding: "10px 8px" }}>
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: "10px 8px" }}>{item.name}</td>
                        <td style={{ padding: "10px 8px" }}>
                          ₹{item.price.toFixed(2)}
                        </td>
                        <td style={{ padding: "10px 8px" }}>{item.quantity}</td>
                        <td style={{ padding: "10px 8px" }}>
                          <strong>
                            ₹{(item.price * item.quantity).toFixed(2)}
                          </strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div
              style={{
                padding: "25px",
                background: "#fff",
                border: "1px solid #eee",
                borderRadius: "8px",
                marginBottom: "20px",
              }}
            >
              <h3
                style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  marginBottom: "15px",
                }}
              >
                <i className="fas fa-map-marker-alt"></i> Shipping Address
              </h3>
              {(order.shippingAddress &&
                (order.shippingAddress.street || order.shippingAddress.city)) ||
                order.deliveryCity ||
                order.deliveryState ||
                order.deliveryPincode ? (
                <address
                  style={{
                    marginBottom: "0",
                    fontStyle: "normal",
                    lineHeight: "1.6",
                  }}
                >
                  {order.shippingAddress?.street && (
                    <>
                      {order.shippingAddress.street}
                      <br />
                    </>
                  )}
                  {order.deliveryAddress && (
                    <>
                      {order.deliveryAddress}
                      <br />
                    </>
                  )}
                  {(order.shippingAddress?.city || order.deliveryCity) && (
                    <>
                      {order.shippingAddress?.city || order.deliveryCity}
                      {(order.shippingAddress?.state || order.deliveryState) &&
                        `, ${order.shippingAddress?.state || order.deliveryState}`}
                      {(order.shippingAddress?.postalCode ||
                        order.deliveryPincode) &&
                        ` ${order.shippingAddress?.postalCode || order.deliveryPincode}`}
                      <br />
                    </>
                  )}
                  {order.shippingAddress?.country && (
                    <>{order.shippingAddress.country}</>
                  )}
                </address>
              ) : (
                <p style={{ color: "#999", fontSize: "14px" }}>
                  <i className="fas fa-exclamation-circle"></i> Shipping address
                  not provided for this order
                </p>
              )}
            </div>
          </div>

          <div className="col-lg-4">
            <div
              style={{
                padding: "25px",
                background: "#fff",
                border: "1px solid #eee",
                borderRadius: "8px",
                marginBottom: "20px",
              }}
            >
              <h3
                style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  marginBottom: "20px",
                }}
              >
                Order Summary
              </h3>
              <div
                style={{
                  borderBottom: "1px solid #eee",
                  paddingBottom: "15px",
                  marginBottom: "15px",
                }}
              >
                <div className="d-flex justify-content-between mb-2">
                  <span>Subtotal:</span>
                  <span>₹{order.subtotal.toFixed(2)}</span>
                </div>
                {((order.shippingCost && order.shippingCost > 0) ||
                  (order.deliveryCharge && order.deliveryCharge > 0)) && (
                    <div className="d-flex justify-content-between mb-2">
                      <span>Shipping:</span>
                      <span>
                        ₹
                        {(
                          order.shippingCost ||
                          order.deliveryCharge ||
                          0
                        ).toFixed(2)}
                      </span>
                    </div>
                  )}
                {((order.discount && order.discount > 0) ||
                  (order.couponAmount && order.couponAmount > 0)) && (
                    <div className="d-flex justify-content-between mb-2 text-success">
                      <span>Discount:</span>
                      <span>
                        -₹{(order.discount || order.couponAmount || 0).toFixed(2)}
                      </span>
                    </div>
                  )}
              </div>
              <div
                className="d-flex justify-content-between"
                style={{ fontSize: "18px", fontWeight: "700" }}
              >
                <span>Total:</span>
                <span style={{ color: "var(--primary)" }}>
                  ₹
                  {(
                    order.total ||
                    order.netAmount ||
                    order.subtotal ||
                    0
                  ).toFixed(2)}
                </span>
              </div>
              {!order.total && !order.netAmount && order.subtotal && (
                <p
                  style={{
                    fontSize: "12px",
                    color: "#999",
                    marginTop: "8px",
                    marginBottom: "0",
                  }}
                >
                  <i className="fas fa-info-circle"></i> Total calculated from
                  subtotal
                </p>
              )}
            </div>

            {error && (
              <div
                style={{
                  padding: "15px",
                  background: "#f8d7da",
                  border: "1px solid #f5c6cb",
                  borderRadius: "8px",
                  marginBottom: "20px",
                  color: "#721c24",
                }}
              >
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
