"use client";
import { useEffect, useState } from "react";
import { useAdminAuth } from "../../../hooks/useAdminAuth";

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

export default function AdminOrdersPage() {
    const { isAdmin, loading: authLoading, error: authError } = useAdminAuth();
    const [items, setItems] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [creatingShipment, setCreatingShipment] = useState<string | null>(null);
    const [cancellingShipment, setCancellingShipment] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        status: "pending",
    });
    const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

    useEffect(() => {
        if (!isAdmin || authLoading) return;

        async function load() {
            try {
                const res = await fetch(`${API}/admin/orders`, {
                    credentials: "include",
                    cache: "no-store",
                    headers: { "Cache-Control": "no-cache" },
                });
                if (!res.ok) throw new Error("Failed to fetch orders");
                const json = await res.json();
                setItems(json.data || []);
                setLoading(false);
            } catch (e: any) {
                setError(e?.message || "Failed to load orders");
                setLoading(false);
            }
        }
        load();
    }, [isAdmin, authLoading, API]);

    const handleEdit = async (order: Order) => {
        setLoadingDetails(true);
        setShowModal(true);
        try {
            const res = await fetch(`${API}/admin/orders/${order._id}`, {
                credentials: "include",
                cache: "no-store",
                headers: { "Cache-Control": "no-cache" },
            });
            if (!res.ok) throw new Error("Failed to fetch order details");
            const json = await res.json();
            setSelectedOrder(json.data || order);
            setEditingId(order._id);
            setFormData({
                status: (json.data?.status || order.status) || "pending",
            });
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
                    o._id === editingId ? { ...o, status: formData.status } : o
                )
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
            const res = await fetch(`${API}/delhivery/create-shipment`, {
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
                throw new Error((errorData.error || "Failed to create shipment") + (details ? `: ${details}` : ""));
            }

            const data = await res.json();

            // Update order in the list
            setItems(
                items.map((o) =>
                    o._id === order._id
                        ? { ...o, delhiveryTrackingId: data.data.waybill, status: "processing" }
                        : o
                )
            );

            setSuccess(`Shipment created successfully! Waybill: ${data.data.waybill}`);
            setTimeout(() => setSuccess(null), 5000);
        } catch (e: any) {
            setError(e?.message || "Failed to create shipment");
        } finally {
            setCreatingShipment(null);
        }
    };

    const handleCancelShipment = async (order: Order) => {
        if (!order.delhiveryTrackingId) {
            setError("No shipment to cancel for this order");
            return;
        }

        setCancellingShipment(order._id);
        setError(null);

        try {
            const res = await fetch(`${API}/delhivery/cancel-shipment`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ waybill: order.delhiveryTrackingId }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || errorData.message || "Failed to cancel shipment");
            }

            // Update order status optimistically
            setItems(
                items.map((o) =>
                    o._id === order._id ? { ...o, status: "cancelled" } : o
                )
            );

            setSuccess("Shipment cancelled successfully");
            setTimeout(() => setSuccess(null), 4000);
        } catch (e: any) {
            setError(e?.message || "Failed to cancel shipment");
        } finally {
            setCancellingShipment(null);
        }
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
                <div style={{ background: "#fef3c7", color: "#92400e", padding: 12, borderRadius: 6, marginBottom: 20 }}>
                    {error}
                </div>
            )}

            {success && (
                <div style={{ background: "#dcfce7", color: "#166534", padding: 16, borderRadius: 8, marginBottom: 20 }}>
                    {success}
                </div>
            )}

            {showModal && selectedOrder && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 40, overflowY: "auto", padding: "20px 0" }}>
                    <div style={{ background: "#fff", color: "#0f172a", padding: 24, borderRadius: 10, width: "min(900px, 95vw)", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 15px 50px rgba(0,0,0,0.25)", margin: "auto" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 20, borderBottom: "2px solid #e5e7eb", paddingBottom: 16 }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: 22 }}>Order #{selectedOrder.orderId || selectedOrder.orderNo || selectedOrder._id}</h3>
                                <div style={{ display: "flex", gap: 12, marginTop: 8, alignItems: "center" }}>
                                    <span className={`admin-badge ${selectedOrder.status === 'delivered' ? 'success' : selectedOrder.status === 'cancelled' ? 'danger' : 'info'}`}>
                                        {selectedOrder.status || "pending"}
                                    </span>
                                    <span className={`admin-badge ${selectedOrder.paymentStatus === 'completed' ? 'success' : 'warning'}`}>
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
                                style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 24, lineHeight: 1 }}
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
                                    <h4 style={{ margin: "0 0 12px 0", fontSize: 16, color: "#374151" }}>Customer Information</h4>
                                    <div style={{ background: "#f9fafb", padding: 16, borderRadius: 8, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, fontSize: 14 }}>
                                        <div>
                                            <strong>Name:</strong> {(() => {
                                                const u = selectedOrder.userId as any;
                                                const name = u?.name || [u?.firstName, u?.lastName].filter(Boolean).join(" ");
                                                return name || "N/A";
                                            })()}
                                        </div>
                                        <div><strong>Email:</strong> {(selectedOrder.userId as any)?.email || "N/A"}</div>
                                        <div><strong>Phone:</strong> {(selectedOrder.userId as any)?.phone || "N/A"}</div>
                                    </div>
                                </div>

                                {/* Order Items */}
                                {selectedOrder.items && selectedOrder.items.length > 0 && (
                                    <div style={{ marginBottom: 24 }}>
                                        <h4 style={{ margin: "0 0 12px 0", fontSize: 16, color: "#374151" }}>Order Items</h4>
                                        <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
                                            {selectedOrder.items.map((item, idx) => (
                                                <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, background: idx % 2 === 0 ? "#fff" : "#f9fafb", fontSize: 14 }}>
                                                    <div style={{ display: "flex", gap: 12, alignItems: "center", flex: 1 }}>
                                                        {((item as any).image || item.productId?.image) && (
                                                            <img src={`/assets/uploaded/item/${(item as any).image || item.productId?.image}`} alt="" style={{ width: 50, height: 50, objectFit: "cover", borderRadius: 6 }} />
                                                        )}
                                                        <div>
                                                            <strong>{(item as any).name || item.productId?.name || "Product"}</strong>
                                                            <div style={{ color: "#6b7280", fontSize: 13 }}>Qty: {item.quantity || 1} × ₹{item.price || 0}</div>
                                                        </div>
                                                    </div>
                                                    <strong style={{ fontSize: 15 }}>₹{item.total || (item.price || 0) * (item.quantity || 1)}</strong>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Addresses */}
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 24 }}>
                                    {(selectedOrder as any).shippingAddress && ((selectedOrder as any).shippingAddress.street || (selectedOrder as any).shippingAddress.city) && (
                                        <div>
                                            <h4 style={{ margin: "0 0 12px 0", fontSize: 16, color: "#374151" }}>Shipping Address</h4>
                                            <div style={{ background: "#f9fafb", padding: 16, borderRadius: 8, fontSize: 14, lineHeight: 1.6 }}>
                                                {(selectedOrder as any).shippingAddress.street && <div>{(selectedOrder as any).shippingAddress.street}</div>}
                                                {((selectedOrder as any).shippingAddress.city || (selectedOrder as any).shippingAddress.state) && (
                                                    <div>{(selectedOrder as any).shippingAddress.city}{(selectedOrder as any).shippingAddress.city && (selectedOrder as any).shippingAddress.state ? ", " : ""}{(selectedOrder as any).shippingAddress.state}</div>
                                                )}
                                                {((selectedOrder as any).shippingAddress.postalCode || (selectedOrder as any).shippingAddress.country) && (
                                                    <div>{(selectedOrder as any).shippingAddress.postalCode}{(selectedOrder as any).shippingAddress.postalCode && (selectedOrder as any).shippingAddress.country ? ", " : ""}{(selectedOrder as any).shippingAddress.country}</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {(selectedOrder.userId as any)?.address && ((selectedOrder.userId as any).address.street || (selectedOrder.userId as any).address.city) && (
                                        <div>
                                            <h4 style={{ margin: "0 0 12px 0", fontSize: 16, color: "#374151" }}>Customer Address</h4>
                                            <div style={{ background: "#f9fafb", padding: 16, borderRadius: 8, fontSize: 14, lineHeight: 1.6 }}>
                                                {(selectedOrder.userId as any).address.street && <div>{(selectedOrder.userId as any).address.street}</div>}
                                                {((selectedOrder.userId as any).address.city || (selectedOrder.userId as any).address.state) && (
                                                    <div>{(selectedOrder.userId as any).address.city}{(selectedOrder.userId as any).address.city && (selectedOrder.userId as any).address.state ? ", " : ""}{(selectedOrder.userId as any).address.state}</div>
                                                )}
                                                {((selectedOrder.userId as any).address.postalCode || (selectedOrder.userId as any).address.country) && (
                                                    <div>{(selectedOrder.userId as any).address.postalCode}{(selectedOrder.userId as any).address.postalCode && (selectedOrder.userId as any).address.country ? ", " : ""}{(selectedOrder.userId as any).address.country}</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Order Summary */}
                                <div style={{ marginBottom: 24 }}>
                                    <h4 style={{ margin: "0 0 12px 0", fontSize: 16, color: "#374151" }}>Order Summary</h4>
                                    <div style={{ background: "#f9fafb", padding: 16, borderRadius: 8 }}>
                                        {(() => {
                                            const subtotal = selectedOrder.subtotal || 0;
                                            const shippingCost = (selectedOrder as any).shippingCost || (selectedOrder as any).shippingCharges || 0;
                                            const discount = selectedOrder.discount || 0;
                                            const calculatedTotal = subtotal + shippingCost - discount;
                                            const displayTotal = selectedOrder.total && selectedOrder.total > 0 ? selectedOrder.total : calculatedTotal;

                                            return (
                                                <>
                                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14 }}>
                                                        <span>Subtotal:</span>
                                                        <span>₹{subtotal.toFixed(2)}</span>
                                                    </div>
                                                    {shippingCost > 0 && (
                                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14 }}>
                                                            <span>Shipping Charges:</span>
                                                            <span>₹{shippingCost.toFixed(2)}</span>
                                                        </div>
                                                    )}
                                                    {discount > 0 && (
                                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14, color: "#059669" }}>
                                                            <span>Discount:</span>
                                                            <span>-₹{discount.toFixed(2)}</span>
                                                        </div>
                                                    )}
                                                    <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12, borderTop: "2px solid #e5e7eb", fontSize: 16, fontWeight: "bold" }}>
                                                        <span>Total:</span>
                                                        <span>₹{displayTotal.toFixed(2)}</span>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>

                                {/* Additional Details */}
                                <div style={{ marginBottom: 24 }}>
                                    <h4 style={{ margin: "0 0 12px 0", fontSize: 16, color: "#374151" }}>Additional Details</h4>
                                    <div style={{ background: "#f9fafb", padding: 16, borderRadius: 8, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, fontSize: 14 }}>
                                        <div><strong>Tracking ID:</strong> {selectedOrder.delhiveryTrackingId || "Not created"}</div>
                                        <div><strong>Payment ID:</strong> {selectedOrder.razorpayPaymentId || "N/A"}</div>
                                        <div><strong>Order ID:</strong> {selectedOrder.razorpayOrderId || "N/A"}</div>
                                        <div><strong>Created:</strong> {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString() : "-"}</div>
                                        <div><strong>Updated:</strong> {selectedOrder.updatedAt ? new Date(selectedOrder.updatedAt).toLocaleString() : "-"}</div>
                                    </div>
                                </div>

                                {/* Update Status Form */}
                                <div style={{ borderTop: "2px solid #e5e7eb", paddingTop: 20 }}>
                                    <h4 style={{ margin: "0 0 12px 0", fontSize: 16, color: "#374151" }}>Update Order Status</h4>
                                    <form onSubmit={handleSubmit} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                                        <select
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                            style={{ padding: 10, border: "1px solid #d1d5db", borderRadius: 6, minWidth: 200, fontSize: 14 }}
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
                <div className="admin-table-header">
                    <h3>All Orders ({items.length})</h3>
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
                                        <span className={`admin-badge ${o.status === 'delivered' ? 'success' : o.status === 'cancelled' ? 'danger' : 'info'}`}>
                                            {o.status ?? "pending"}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`admin-badge ${o.paymentStatus === 'completed' ? 'success' : 'warning'}`}>
                                            {o.paymentStatus ?? "pending"}
                                        </span>
                                    </td>
                                    <td>
                                        <strong>₹{o.total && o.total > 0 ? o.total : o.netAmount || o.subtotal || 0}</strong>
                                    </td>
                                    <td>
                                        {o.delhiveryTrackingId ? (
                                            <span style={{ fontSize: 12, color: "var(--primary)" }}>
                                                <i className="fas fa-check-circle"></i> {o.delhiveryTrackingId.substring(0, 10)}...
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
                                            {!o.delhiveryTrackingId && o.paymentStatus === "completed" && (
                                                <button
                                                    onClick={() => handleCreateShipment(o)}
                                                    disabled={creatingShipment === o._id}
                                                    style={{
                                                        padding: "6px 12px",
                                                        background: creatingShipment === o._id ? "#9ca3af" : "#059669",
                                                        color: "#fff",
                                                        border: "none",
                                                        borderRadius: 4,
                                                        cursor: creatingShipment === o._id ? "not-allowed" : "pointer",
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
                                                    <a
                                                        href={`https://track.delhivery.com/track/shipment/${o.delhiveryTrackingId}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
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
                                                    </a>
                                                    {o.status !== "cancelled" && o.status !== "delivered" && (
                                                        <button
                                                            onClick={() => handleCancelShipment(o)}
                                                            disabled={cancellingShipment === o._id}
                                                            style={{
                                                                padding: "6px 12px",
                                                                background: cancellingShipment === o._id ? "#9ca3af" : "#ef4444",
                                                                color: "#fff",
                                                                border: "none",
                                                                borderRadius: 4,
                                                                cursor: cancellingShipment === o._id ? "not-allowed" : "pointer",
                                                                fontSize: 12,
                                                                opacity: cancellingShipment === o._id ? 0.6 : 1,
                                                            }}
                                                            title="Cancel Shipment"
                                                        >
                                                            {cancellingShipment === o._id ? (
                                                                <i className="fas fa-spinner fa-spin"></i>
                                                            ) : (
                                                                <i className="fas fa-ban"></i>
                                                            )}
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-2)' }}>
                                    No orders found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
