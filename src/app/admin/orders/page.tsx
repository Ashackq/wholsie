"use client";
import { useEffect, useState, Suspense } from "react";
import { useAdminAuth } from "../../../hooks/useAdminAuth";
import { useSearchParams } from "next/navigation";

type Order = {
  _id: string;
  orderId?: string;
  orderNo?: string;
  status?: string;
  paymentStatus?: string;
  total?: number;
  netAmount?: number;
  createdAt?: string;
  updatedAt?: string;
  userId?: any;
  delhiveryTrackingId?: string;
  items?: Array<{
    productId?: any;
    quantity?: number;
    price?: number;
    total?: number;
  }>;
  shippingAddress?: {
    name?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  billingAddress?: {
    name?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  subtotal?: number;
  shippingCharges?: number;
  discount?: number;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
};

function AdminOrdersContent() {
  const { isAdmin, loading: authLoading, error: authError } = useAdminAuth();
  const [items, setItems] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [creatingShipment, setCreatingShipment] = useState<string | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  const [trackingData, setTrackingData] = useState<any>(null);
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [trackingDetails, setTrackingDetails] = useState<any>(null);
  const [loadingTrackingDetails, setLoadingTrackingDetails] = useState(false);
  const [formData, setFormData] = useState({
    status: "pending",
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 4;
  const searchParams = useSearchParams();
  const openOrderId = searchParams.get("open");
  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

  useEffect(() => {
    if (!isAdmin || authLoading) return;

    async function load() {
      setLoading(true);
      try {
        const offset = (page - 1) * pageSize;
        const res = await fetch(
          `${API}/admin/orders?offset=${offset}&limit=${pageSize}`,
          {
            credentials: "include",
            cache: "no-store",
            headers: { "Cache-Control": "no-cache" },
          },
        );
        if (!res.ok) throw new Error("Failed to fetch orders");
        const json = await res.json();
        const list = json.data || [];
        const totalCount =
          json.pagination?.total ??
          (Array.isArray(list) ? offset + list.length : 0);
        setItems(list);
        setTotal(totalCount);
      } catch (e: any) {
        setError(e?.message || "Failed to load orders");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isAdmin, authLoading, API, page]);

  useEffect(() => {
    if (openOrderId) {
      openOrder(openOrderId);
    }
  }, [openOrderId]);

  const openOrder = async (orderId: string) => {
    setSelectedOrderId(orderId);
    setShowModal(true);

    const res = await fetch(`${API}/admin/orders/${orderId}`, {
      credentials: "include",
    });

    const data = await res.json();
    setSelectedOrder(data.data);
  }

  const goToPage = (nextPage: number) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEdit = async (order: Order) => {
    setLoadingDetails(true);
    setShowModal(true);
    setTrackingDetails(null);
    try {
      const res = await fetch(`${API}/admin/orders/${order._id}`, {
        credentials: "include",
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (!res.ok) throw new Error("Failed to fetch order details");
      const json = await res.json();
      const orderData = json.data || order;
      setSelectedOrder(orderData);
      setEditingId(order._id);
      setFormData({
        status: orderData?.status || order.status || "pending",
      });

      // Fetch tracking details if waybill exists
      if (orderData.delhiveryTrackingId) {
        setLoadingTrackingDetails(true);
        try {
          const trackingRes = await fetch(
            `${API}/admin/delhivery/tracking/${orderData.delhiveryTrackingId}`,
            { credentials: "include" }
          );
          if (trackingRes.ok) {
            const trackingJson = await trackingRes.json();
            setTrackingDetails(trackingJson.data);
          }
        } catch (err) {
          console.error("Failed to fetch tracking details:", err);
        } finally {
          setLoadingTrackingDetails(false);
        }
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load order details");
      setSelectedOrder(order);
      setEditingId(order._id);
      setFormData({
        status: order.status || "pending",
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    try {
      const res = await fetch(`${API}/admin/orders/${editingId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          status: formData.status,
        }),
      });
      if (!res.ok) throw new Error("Update failed");
      setItems(
        items.map((o) =>
          o._id === editingId ? { ...o, status: formData.status } : o,
        ),
      );
      setSuccess("Order status updated successfully");
      setShowModal(false);
      setEditingId(null);
      setSelectedOrder(null);
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.message || "Failed to update order");
    }
  };

  const handleCreateShipment = async (order: Order) => {
    // Use orderId, orderNo, or _id as fallback
    const orderIdentifier = order.orderId || order.orderNo || order._id;

    if (!orderIdentifier) {
      setError("Order ID is missing");
      return;
    }

    if (order.delhiveryTrackingId) {
      setError("Shipment already created for this order");
      return;
    }

    if (order.paymentStatus !== "completed") {
      setError("Payment must be completed before creating shipment");
      return;
    }

    setCreatingShipment(order._id);
    setError(null);

    try {
      const res = await fetch(`${API}/admin/delhivery/create-shipment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          orderId: orderIdentifier,
          weight: "500",
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        const details = errorData?.details || errorData?.rmk;
        throw new Error(
          (errorData.error || "Failed to create shipment") +
          (details ? `: ${details}` : ""),
        );
      }

      const data = await res.json();

      // Update order in the list
      setItems(
        items.map((o) =>
          o._id === order._id
            ? {
              ...o,
              delhiveryTrackingId: data.data.waybill,
              status: "processing",
            }
            : o,
        ),
      );

      setSuccess(
        `Shipment created successfully! Waybill: ${data.data.waybill}`,
      );
      setTimeout(() => setSuccess(null), 5000);
    } catch (e: any) {
      setError(e?.message || "Failed to create shipment");
    } finally {
      setCreatingShipment(null);
    }
  };

  const handleTrackShipment = (order: Order) => {
    if (!order.delhiveryTrackingId) {
      setError("No tracking ID available");
      return;
    }

    // Redirect to Delhivery tracking page
    const trackingUrl = `https://www.delhivery.com/track-v2/package/${order.delhiveryTrackingId}`;
    window.open(trackingUrl, "_blank");
  };

  const closeTrackingModal = () => {
    setTrackingOrder(null);
    setTrackingData(null);
  };

  if (authLoading) {
    return (
      <div className="admin-page-header">
        <h1>Loading...</h1>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="admin-page-header">
        <h1>Access Denied</h1>
        <p style={{ color: "red" }}>{authError}</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="admin-page-header">
        <h1>Access Denied</h1>
        <p style={{ color: "red" }}>You do not have admin privileges</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-page-header">
        <h1>Loading...</h1>
      </div>
    );
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1>Orders</h1>
        <p>Manage customer orders</p>
      </div>

      {error && (
        <div
          style={{
            background: "#fef3c7",
            color: "#92400e",
            padding: 12,
            borderRadius: 6,
            marginBottom: 20,
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            background: "#dcfce7",
            color: "#166534",
            padding: 16,
            borderRadius: 8,
            marginBottom: 20,
          }}
        >
          {success}
        </div>
      )}

      {showModal && selectedOrder && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 40,
            overflowY: "auto",
            padding: "20px 0",
          }}
        >
          <div
            style={{
              background: "#fff",
              color: "#0f172a",
              padding: 24,
              borderRadius: 10,
              width: "min(900px, 95vw)",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 15px 50px rgba(0,0,0,0.25)",
              margin: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "start",
                marginBottom: 20,
                borderBottom: "2px solid #e5e7eb",
                paddingBottom: 16,
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 22 }}>
                  Order #
                  {selectedOrder.orderId ||
                    selectedOrder.orderNo ||
                    selectedOrder._id}
                </h3>
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    marginTop: 8,
                    alignItems: "center",
                  }}
                >
                  <span
                    className={`admin-badge ${selectedOrder.status === "delivered" ? "success" : selectedOrder.status === "cancelled" ? "danger" : "info"}`}
                  >
                    {selectedOrder.status || "pending"}
                  </span>
                  <span
                    className={`admin-badge ${selectedOrder.paymentStatus === "completed" ? "success" : "warning"}`}
                  >
                    {selectedOrder.paymentStatus || "pending"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedOrder(null);
                  setEditingId(null);
                }}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 24,
                  lineHeight: 1,
                }}
                aria-label="Close order modal"
              >
                ×
              </button>
            </div>

            {loadingDetails ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <p>Loading order details...</p>
              </div>
            ) : (
              <>
                {/* Customer & Contact Info */}
                <div style={{ marginBottom: 24 }}>
                  <h4
                    style={{
                      margin: "0 0 12px 0",
                      fontSize: 16,
                      color: "#374151",
                    }}
                  >
                    Customer Information
                  </h4>
                  <div
                    style={{
                      background: "#f9fafb",
                      padding: 16,
                      borderRadius: 8,
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: 12,
                      fontSize: 14,
                    }}
                  >
                    <div>
                      <strong>Name:</strong>{" "}
                      {(() => {
                        const u = selectedOrder.userId as any;
                        const name =
                          u?.name ||
                          [u?.firstName, u?.lastName].filter(Boolean).join(" ");
                        return name || "N/A";
                      })()}
                    </div>
                    <div>
                      <strong>Email:</strong>{" "}
                      {(selectedOrder.userId as any)?.email || "N/A"}
                    </div>
                    <div>
                      <strong>Phone:</strong>{" "}
                      {(selectedOrder.userId as any)?.phone || "N/A"}
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                {selectedOrder.items && selectedOrder.items.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <h4
                      style={{
                        margin: "0 0 12px 0",
                        fontSize: 16,
                        color: "#374151",
                      }}
                    >
                      Order Items
                    </h4>
                    <div
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 8,
                        overflow: "hidden",
                      }}
                    >
                      {selectedOrder.items.map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: 12,
                            background: idx % 2 === 0 ? "#fff" : "#f9fafb",
                            fontSize: 14,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              gap: 12,
                              alignItems: "center",
                              flex: 1,
                            }}
                          >
                            {((item as any).image || item.productId?.image) && (
                              <img
                                src={`/${(item as any).image || item.productId?.image}`}
                                alt=""
                                className="orderimg"
                              />
                            )}
                            <div>
                              <strong>
                                {(item as any).name ||
                                  item.productId?.name ||
                                  "Product"}
                              </strong>
                              <div style={{ color: "#6b7280", fontSize: 13 }}>
                                Qty: {item.quantity || 1} × ₹{item.price || 0}
                              </div>
                            </div>
                          </div>
                          <strong style={{ fontSize: 15 }}>
                            ₹
                            {item.total ||
                              (item.price || 0) * (item.quantity || 1)}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Addresses */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: 16,
                    marginBottom: 24,
                  }}
                >
                  {(selectedOrder as any).shippingAddress &&
                    ((selectedOrder as any).shippingAddress.street ||
                      (selectedOrder as any).shippingAddress.city) && (
                      <div>
                        <h4
                          style={{
                            margin: "0 0 12px 0",
                            fontSize: 16,
                            color: "#374151",
                          }}
                        >
                          Shipping Address
                        </h4>
                        <div
                          style={{
                            background: "#f9fafb",
                            padding: 16,
                            borderRadius: 8,
                            fontSize: 14,
                            lineHeight: 1.6,
                          }}
                        >
                          {(selectedOrder as any).shippingAddress.street && (
                            <div>
                              {(selectedOrder as any).shippingAddress.street}
                            </div>
                          )}
                          {((selectedOrder as any).shippingAddress.city ||
                            (selectedOrder as any).shippingAddress.state) && (
                              <div>
                                {(selectedOrder as any).shippingAddress.city}
                                {(selectedOrder as any).shippingAddress.city &&
                                  (selectedOrder as any).shippingAddress.state
                                  ? ", "
                                  : ""}
                                {(selectedOrder as any).shippingAddress.state}
                              </div>
                            )}
                          {((selectedOrder as any).shippingAddress.postalCode ||
                            (selectedOrder as any).shippingAddress.country) && (
                              <div>
                                {
                                  (selectedOrder as any).shippingAddress
                                    .postalCode
                                }
                                {(selectedOrder as any).shippingAddress
                                  .postalCode &&
                                  (selectedOrder as any).shippingAddress.country
                                  ? ", "
                                  : ""}
                                {(selectedOrder as any).shippingAddress.country}
                              </div>
                            )}
                        </div>
                      </div>
                    )}
                  {(selectedOrder.userId as any)?.address &&
                    ((selectedOrder.userId as any).address.street ||
                      (selectedOrder.userId as any).address.city) && (
                      <div>
                        <h4
                          style={{
                            margin: "0 0 12px 0",
                            fontSize: 16,
                            color: "#374151",
                          }}
                        >
                          Customer Address
                        </h4>
                        <div
                          style={{
                            background: "#f9fafb",
                            padding: 16,
                            borderRadius: 8,
                            fontSize: 14,
                            lineHeight: 1.6,
                          }}
                        >
                          {(selectedOrder.userId as any).address.street && (
                            <div>
                              {(selectedOrder.userId as any).address.street}
                            </div>
                          )}
                          {((selectedOrder.userId as any).address.city ||
                            (selectedOrder.userId as any).address.state) && (
                              <div>
                                {(selectedOrder.userId as any).address.city}
                                {(selectedOrder.userId as any).address.city &&
                                  (selectedOrder.userId as any).address.state
                                  ? ", "
                                  : ""}
                                {(selectedOrder.userId as any).address.state}
                              </div>
                            )}
                          {((selectedOrder.userId as any).address.postalCode ||
                            (selectedOrder.userId as any).address.country) && (
                              <div>
                                {(selectedOrder.userId as any).address.postalCode}
                                {(selectedOrder.userId as any).address
                                  .postalCode &&
                                  (selectedOrder.userId as any).address.country
                                  ? ", "
                                  : ""}
                                {(selectedOrder.userId as any).address.country}
                              </div>
                            )}
                        </div>
                      </div>
                    )}
                </div>

                {/* Order Summary */}
                <div style={{ marginBottom: 24 }}>
                  <h4
                    style={{
                      margin: "0 0 12px 0",
                      fontSize: 16,
                      color: "#374151",
                    }}
                  >
                    Order Summary
                  </h4>
                  <div
                    style={{
                      background: "#f9fafb",
                      padding: 16,
                      borderRadius: 8,
                    }}
                  >
                    {(() => {
                      const subtotal = selectedOrder.subtotal || 0;
                      const shippingCost = (selectedOrder as any).shippingCost || 0;
                      const discount = selectedOrder.discount || 0;
                      const platformFee = (selectedOrder as any).platformFee || 0;
                      const tax = (selectedOrder as any).tax || 0;

                      // Use order.total directly - it's already calculated correctly in backend
                      const total = selectedOrder.total || selectedOrder.netAmount || 0;

                      return (
                        <>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: 8,
                              fontSize: 14,
                            }}
                          >
                            <span>Subtotal:</span>
                            <span>₹{subtotal.toFixed(2)}</span>
                          </div>
                          {tax > 0 && (
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: 8,
                                fontSize: 14,
                              }}
                            >
                              <span>Tax (5%):</span>
                              <span>₹{tax.toFixed(2)}</span>
                            </div>
                          )}
                          {shippingCost > 0 && (
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: 8,
                                fontSize: 14,
                              }}
                            >
                              <span>Shipping:</span>
                              <span>₹{shippingCost.toFixed(2)}</span>
                            </div>
                          )}
                          {platformFee > 0 && (
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: 8,
                                fontSize: 14,
                              }}
                            >
                              <span>Platform Fee (2%):</span>
                              <span>₹{platformFee.toFixed(2)}</span>
                            </div>
                          )}
                          {discount > 0 && (
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: 8,
                                fontSize: 14,
                                color: "#059669",
                              }}
                            >
                              <span>Discount:</span>
                              <span>-₹{discount.toFixed(2)}</span>
                            </div>
                          )}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              paddingTop: 12,
                              borderTop: "2px solid #e5e7eb",
                              fontSize: 16,
                              fontWeight: "bold",
                            }}
                          >
                            <span>Total:</span>
                            <span>₹{total.toFixed(2)}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Additional Details */}
                <div style={{ marginBottom: 24 }}>
                  <h4
                    style={{
                      margin: "0 0 12px 0",
                      fontSize: 16,
                      color: "#374151",
                    }}
                  >
                    Additional Details
                  </h4>
                  <div
                    style={{
                      background: "#f9fafb",
                      padding: 16,
                      borderRadius: 8,
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(240px, 1fr))",
                      gap: 12,
                      fontSize: 14,
                    }}
                  >
                    <div>
                      <strong>Tracking ID:</strong>{" "}
                      {selectedOrder.delhiveryTrackingId || "Not created"}
                    </div>
                    <div>
                      <strong>Payment ID:</strong>{" "}
                      {selectedOrder.razorpayPaymentId || "N/A"}
                    </div>
                    <div>
                      <strong>Created:</strong>{" "}
                      {selectedOrder.createdAt
                        ? new Date(selectedOrder.createdAt).toLocaleString()
                        : "-"}
                    </div>
                    <div>
                      <strong>Updated:</strong>{" "}
                      {selectedOrder.updatedAt
                        ? new Date(selectedOrder.updatedAt).toLocaleString()
                        : "-"}
                    </div>
                    {(selectedOrder as any).invoiceUrl && (
                      <div style={{ gridColumn: "1 / -1" }}>
                        <strong>Invoice:</strong>{" "}
                        <a
                          href={(selectedOrder as any).invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "#2563eb",
                            textDecoration: "underline",
                            fontWeight: 500,
                          }}
                        >
                          View/Download Invoice
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Tracking Details */}
                  {selectedOrder.delhiveryTrackingId && (
                    <div style={{ marginTop: 16 }}>
                      <h5
                        style={{
                          margin: "0 0 12px 0",
                          fontSize: 15,
                          color: "#374151",
                        }}
                      >
                        Shipment Tracking
                      </h5>
                      {loadingTrackingDetails ? (
                        <div
                          style={{
                            background: "#f9fafb",
                            padding: 16,
                            borderRadius: 8,
                            textAlign: "center",
                            color: "#6b7280",
                          }}
                        >
                          Loading tracking details...
                        </div>
                      ) : trackingDetails?.ShipmentData?.[0]?.Shipment ? (
                        (() => {
                          const shipment = trackingDetails.ShipmentData[0].Shipment;
                          const status = shipment.Status;
                          const scans = shipment.Scans || [];

                          return (
                            <div
                              style={{
                                background: "#f0fdf4",
                                border: "1px solid #86efac",
                                padding: 16,
                                borderRadius: 8,
                              }}
                            >
                              {/* Current Status */}
                              <div style={{ marginBottom: 16 }}>
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "flex-start",
                                    marginBottom: 8,
                                  }}
                                >
                                  <div>
                                    <div
                                      style={{
                                        fontSize: 16,
                                        fontWeight: "bold",
                                        color: "#15803d",
                                        marginBottom: 4,
                                      }}
                                    >
                                      {status?.Status || "Unknown"}
                                    </div>
                                    <div style={{ fontSize: 13, color: "#16a34a" }}>
                                      {status?.StatusLocation || "N/A"}
                                    </div>
                                  </div>
                                  <div style={{ fontSize: 12, color: "#4b5563", textAlign: "right" }}>
                                    {status?.StatusDateTime
                                      ? new Date(status.StatusDateTime).toLocaleString()
                                      : "N/A"}
                                  </div>
                                </div>
                                {status?.Instructions && (
                                  <div
                                    style={{
                                      fontSize: 13,
                                      color: "#065f46",
                                      fontStyle: "italic",
                                      marginTop: 8,
                                    }}
                                  >
                                    {status.Instructions}
                                  </div>
                                )}
                              </div>

                              {/* Shipment Info Grid */}
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                                  gap: 12,
                                  fontSize: 13,
                                  paddingTop: 12,
                                  borderTop: "1px solid #bbf7d0",
                                }}
                              >
                                <div>
                                  <strong>AWB:</strong> {shipment.AWB || "N/A"}
                                </div>
                                <div>
                                  <strong>Origin:</strong> {shipment.Origin || "N/A"}
                                </div>
                                <div>
                                  <strong>Destination:</strong> {shipment.Destination || "N/A"}
                                </div>
                                <div>
                                  <strong>Order Type:</strong> {shipment.OrderType || "N/A"}
                                </div>
                                {shipment.ExpectedDeliveryDate && (
                                  <div>
                                    <strong>Expected Delivery:</strong>{" "}
                                    {new Date(shipment.ExpectedDeliveryDate).toLocaleDateString()}
                                  </div>
                                )}
                              </div>

                              {/* Scan History */}
                              {scans.length > 0 && (
                                <div style={{ marginTop: 16 }}>
                                  <div
                                    style={{
                                      fontSize: 14,
                                      fontWeight: "600",
                                      color: "#065f46",
                                      marginBottom: 8,
                                    }}
                                  >
                                    Scan History
                                  </div>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    {scans.map((scan: any, idx: number) => {
                                      const detail = scan.ScanDetail;
                                      return (
                                        <div
                                          key={idx}
                                          style={{
                                            background: "#ffffff",
                                            padding: 10,
                                            borderRadius: 6,
                                            border: "1px solid #d1fae5",
                                          }}
                                        >
                                          <div
                                            style={{
                                              display: "flex",
                                              justifyContent: "space-between",
                                              marginBottom: 4,
                                            }}
                                          >
                                            <span style={{ fontWeight: "600", color: "#047857" }}>
                                              {detail?.Scan || "Unknown"}
                                            </span>
                                            <span style={{ fontSize: 12, color: "#6b7280" }}>
                                              {detail?.ScanDateTime
                                                ? new Date(detail.ScanDateTime).toLocaleString()
                                                : "N/A"}
                                            </span>
                                          </div>
                                          <div style={{ fontSize: 12, color: "#374151" }}>
                                            {detail?.ScannedLocation || "N/A"}
                                          </div>
                                          {detail?.Instructions && (
                                            <div
                                              style={{
                                                fontSize: 12,
                                                color: "#059669",
                                                fontStyle: "italic",
                                                marginTop: 4,
                                              }}
                                            >
                                              {detail.Instructions}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Track on Delhivery Link */}
                              <div style={{ marginTop: 16, textAlign: "center" }}>
                                <a
                                  href={`https://www.delhivery.com/track-v2/package/${selectedOrder.delhiveryTrackingId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: "inline-block",
                                    padding: "8px 16px",
                                    background: "#16a34a",
                                    color: "#ffffff",
                                    borderRadius: 6,
                                    textDecoration: "none",
                                    fontWeight: "500",
                                    fontSize: 14,
                                  }}
                                >
                                  Track on Delhivery →
                                </a>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div
                          style={{
                            background: "#fef3c7",
                            border: "1px solid #fcd34d",
                            padding: 16,
                            borderRadius: 8,
                            color: "#92400e",
                            fontSize: 14,
                          }}
                        >
                          Tracking details not available. The shipment may be pending pickup.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Update Status Form */}
                <div style={{ borderTop: "2px solid #e5e7eb", paddingTop: 20 }}>
                  <h4
                    style={{
                      margin: "0 0 12px 0",
                      fontSize: 16,
                      color: "#374151",
                    }}
                  >
                    Update Order Status
                  </h4>
                  <form
                    onSubmit={handleSubmit}
                    style={{
                      display: "flex",
                      gap: 12,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                      style={{
                        padding: 10,
                        border: "1px solid #d1d5db",
                        borderRadius: 6,
                        minWidth: 200,
                        fontSize: 14,
                      }}
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <button
                      type="submit"
                      style={{
                        padding: "10px 20px",
                        background: "#059669",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: 14,
                        fontWeight: 500,
                      }}
                    >
                      Update Status
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setSelectedOrder(null);
                        setEditingId(null);
                      }}
                      style={{
                        padding: "10px 20px",
                        background: "#9ca3af",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: 14,
                        fontWeight: 500,
                      }}
                    >
                      Close
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="admin-table-container">
        <div
          className="admin-table-header"
          style={{ alignItems: "center", justifyContent: "space-between" }}
        >
          <h3>All Orders ({total || items.length})</h3>
          <div style={{ fontSize: 13, color: "var(--text-2)" }}>
            Page {page} · Showing {items.length} of {total || items.length}
          </div>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Total</th>
              <th>Tracking</th>
              <th>Date</th>
              <th style={{ width: 180 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((o) => (
                <tr key={o._id}>
                  <td>
                    <strong>{o.orderId || o.orderNo || o._id}</strong>
                  </td>
                  <td>
                    <span
                      className={`admin-badge ${o.status === "delivered" ? "success" : o.status === "cancelled" ? "danger" : "info"}`}
                    >
                      {o.status ?? "pending"}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`admin-badge ${o.paymentStatus === "completed" ? "success" : "warning"}`}
                    >
                      {o.paymentStatus ?? "pending"}
                    </span>
                  </td>
                  <td>
                    <strong>
                      ₹
                      {o.total && o.total > 0
                        ? o.total
                        : o.netAmount || o.subtotal || 0}
                    </strong>
                  </td>
                  <td>
                    {o.delhiveryTrackingId ? (
                      <span style={{ fontSize: 12, color: "var(--primary)" }}>
                        <i className="fas fa-check-circle"></i>{" "}
                        {o.delhiveryTrackingId.substring(0, 10)}...
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--text-2)" }}>
                        <i className="fas fa-times-circle"></i> Not created
                      </span>
                    )}
                  </td>
                  <td>
                    {o.createdAt ? new Date(o.createdAt).toLocaleString() : "-"}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => handleEdit(o)}
                        style={{
                          padding: "6px 12px",
                          background: "#3b82f6",
                          color: "#fff",
                          border: "none",
                          borderRadius: 4,
                          cursor: "pointer",
                          fontSize: 12,
                        }}
                        title="View / Edit"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      {!o.delhiveryTrackingId &&
                        o.paymentStatus === "completed" && (
                          <button
                            onClick={() => handleCreateShipment(o)}
                            disabled={creatingShipment === o._id}
                            style={{
                              padding: "6px 12px",
                              background:
                                creatingShipment === o._id
                                  ? "#9ca3af"
                                  : "#059669",
                              color: "#fff",
                              border: "none",
                              borderRadius: 4,
                              cursor:
                                creatingShipment === o._id
                                  ? "not-allowed"
                                  : "pointer",
                              fontSize: 12,
                              opacity: creatingShipment === o._id ? 0.6 : 1,
                            }}
                            title="Create Shipment"
                          >
                            {creatingShipment === o._id ? (
                              <i className="fas fa-spinner fa-spin"></i>
                            ) : (
                              <i className="fas fa-shipping-fast"></i>
                            )}
                          </button>
                        )}
                      {o.delhiveryTrackingId && (
                        <>
                          <button
                            onClick={() => handleTrackShipment(o)}
                            style={{
                              padding: "6px 12px",
                              background: "#06b6d4",
                              color: "#fff",
                              border: "none",
                              borderRadius: 4,
                              cursor: "pointer",
                              fontSize: 12,
                              textDecoration: "none",
                            }}
                            title="Track Shipment"
                          >
                            <i className="fas fa-route"></i>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    textAlign: "center",
                    padding: 40,
                    color: "var(--text-2)",
                  }}
                >
                  No orders found
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 24,
            padding: "0 20px 20px",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <button
            onClick={() => goToPage(Math.max(1, page - 1))}
            disabled={page === 1 || loading}
            style={{
              padding: "10px 20px",
              borderRadius: 20,
              border: "none",
              background: page === 1 || loading ? "#e5e7eb" : "#FF6600",
              color: page === 1 || loading ? "#9ca3af" : "#fff",
              cursor: page === 1 || loading ? "not-allowed" : "pointer",
              fontWeight: 500,
              fontSize: 14,
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              if (page !== 1 && !loading) {
                e.currentTarget.style.backgroundColor = "#E55B00";
                e.currentTarget.style.transform = "translateY(-2px)";
              }
            }}
            onMouseLeave={(e) => {
              if (page !== 1 && !loading) {
                e.currentTarget.style.backgroundColor = "#FF6600";
                e.currentTarget.style.transform = "translateY(0)";
              }
            }}
          >
            Prev
          </button>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 13,
            }}
          >
            <span>Page {page}</span>
            <span style={{ color: "var(--text-2)" }}>
              {Math.min((page - 1) * pageSize + 1, total || 0)} -{" "}
              {Math.min(page * pageSize, total || page * pageSize)}
            </span>
          </div>
          <button
            onClick={() => goToPage(page + 1)}
            disabled={
              loading || (page * pageSize >= total && items.length < pageSize)
            }
            style={{
              padding: "10px 20px",
              borderRadius: 20,
              border: "none",
              background:
                loading || (page * pageSize >= total && items.length < pageSize)
                  ? "#e5e7eb"
                  : "#FF6600",
              color:
                loading || (page * pageSize >= total && items.length < pageSize)
                  ? "#9ca3af"
                  : "#fff",
              cursor:
                loading || (page * pageSize >= total && items.length < pageSize)
                  ? "not-allowed"
                  : "pointer",
              fontWeight: 500,
              fontSize: 14,
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              if (!loading && !(page * pageSize >= total && items.length < pageSize)) {
                e.currentTarget.style.backgroundColor = "#E55B00";
                e.currentTarget.style.transform = "translateY(-2px)";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && !(page * pageSize >= total && items.length < pageSize)) {
                e.currentTarget.style.backgroundColor = "#FF6600";
                e.currentTarget.style.transform = "translateY(0)";
              }
            }}
          >
            Next
          </button>
        </div>
      </div>

      {/* Tracking Modal */}
      {trackingOrder && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
          onClick={closeTrackingModal}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              maxWidth: "800px",
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
              padding: 30,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, borderBottom: "2px solid #e5e7eb", paddingBottom: 15 }}>
              <h2 style={{ margin: 0, fontSize: 24, color: "#1f2937" }}>
                Shipment Tracking
              </h2>
              <button
                onClick={closeTrackingModal}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 28,
                  cursor: "pointer",
                  color: "#6b7280",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            {loadingTracking && (
              <div style={{ textAlign: "center", padding: 40 }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: 32, color: "#FF6600" }}></i>
                <p style={{ marginTop: 15, color: "#6b7280" }}>Loading tracking data...</p>
              </div>
            )}

            {!loadingTracking && trackingData && (
              <div>
                <div style={{ background: "#f9fafb", padding: 20, borderRadius: 8, marginBottom: 20 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 15 }}>
                    <div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 5 }}>Waybill</div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: "#1f2937" }}>{trackingOrder.delhiveryTrackingId}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 5 }}>Order ID</div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: "#1f2937" }}>
                        {trackingOrder.orderId || trackingOrder.orderNo}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 5 }}>Current Status</div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: "#059669" }}>
                        {trackingData.ShipmentData?.[0]?.Shipment?.Status?.Status || "In Transit"}
                      </div>
                    </div>
                  </div>
                </div>

                {trackingData.ShipmentData?.[0]?.Shipment?.Scans && (
                  <div>
                    <h3 style={{ fontSize: 18, marginBottom: 15, color: "#1f2937" }}>Tracking History</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {trackingData.ShipmentData[0].Shipment.Scans.map((scan: any, idx: number) => (
                        <div
                          key={idx}
                          style={{
                            background: "#ffffff",
                            border: "1px solid #e5e7eb",
                            borderRadius: 8,
                            padding: 15,
                            display: "flex",
                            gap: 15,
                          }}
                        >
                          <div style={{ fontSize: 24 }}>
                            {scan.ScanDetail?.Scan === "UD" ? "📦" :
                              scan.ScanDetail?.Scan === "OP" ? "🚚" :
                                scan.ScanDetail?.Scan === "IT" ? "🔄" :
                                  scan.ScanDetail?.Scan === "DL" ? "✅" : "📍"}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 14, color: "#1f2937", marginBottom: 5 }}>
                              {scan.ScanDetail?.Instructions || scan.ScanDetail?.Scan}
                            </div>
                            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 3 }}>
                              {scan.ScanDetail?.ScannedLocation}
                            </div>
                            <div style={{ fontSize: 12, color: "#9ca3af" }}>
                              {new Date(scan.ScanDetail?.ScanDateTime).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>Loading...</div>}>
      <AdminOrdersContent />
    </Suspense>
  );
}
