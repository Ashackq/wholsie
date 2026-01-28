"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAdminAuth } from "../../../hooks/useAdminAuth";

type User = {
    _id: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    avatar?: string;
    role?: string;
    status?: string;
    verified?: boolean;
    createdAt?: string;
    updatedAt?: string;
};

type CartItem = {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
};

type Cart = {
    _id?: string;
    userId: string;
    items: CartItem[];
    subtotal?: number;
    tax?: number;
    total?: number;
};

type Order = {
    _id?: string;
    orderId: string;
    status: string;
    paymentStatus: string;
    total: number;
    items: any[];
    createdAt: string;
};

type Address = {
    _id?: string;
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    isDefault: boolean;
};

type UserDetails = User & {
    cart?: Cart;
    orders?: Order[];
    addresses?: Address[];
};

export default function AdminUsersPage() {
    const { isAdmin, loading: authLoading, error: authError } = useAdminAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const pageSize = 10;

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<"cart" | "orders" | "address" | "view">("view");
    const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
    const [modalData, setModalData] = useState<any>(null);
    const [modalLoading, setModalLoading] = useState(false);

    const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

    useEffect(() => {
        if (!isAdmin || authLoading) return;
        loadUsers();
    }, [isAdmin, authLoading, page]);

    const loadUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const offset = (page - 1) * pageSize;
            const res = await fetch(`${API}/admin/users?offset=${offset}&limit=${pageSize}`, {
                credentials: "include",
            });

            if (!res.ok) throw new Error("Failed to fetch users");

            const json = await res.json();
            const list = json.data || json.users || [];
            const totalCount = json.pagination?.total ?? (Array.isArray(list) ? offset + list.length : 0);

            setUsers(list);
            setTotal(totalCount);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error loading users");
        } finally {
            setLoading(false);
        }
    };

    const openModal = async (user: User, mode: "cart" | "orders" | "address" | "view") => {
        setSelectedUser(user);
        setModalMode(mode);
        setShowModal(true);
        setModalLoading(true);
        setModalData(null);

        try {
            let data;
            const userId = user._id;

            if (mode === "cart") {
                const cartRes = await fetch(`${API}/admin/users/${userId}/cart`, {
                    credentials: "include",
                });
                if (!cartRes.ok) throw new Error("Failed to fetch cart");
                data = await cartRes.json();
                setModalData(data.data || data.cart);
            } else if (mode === "orders") {
                const ordersRes = await fetch(`${API}/admin/users/${userId}/orders`, {
                    credentials: "include",
                });
                if (!ordersRes.ok) throw new Error("Failed to fetch orders");
                data = await ordersRes.json();
                setModalData(data.data || data.orders || []);
            } else if (mode === "address") {
                const addressRes = await fetch(`${API}/admin/users/${userId}/addresses`, {
                    credentials: "include",
                });
                if (!addressRes.ok) throw new Error("Failed to fetch addresses");
                data = await addressRes.json();
                setModalData(data.data || data.addresses || []);
            } else if (mode === "view") {
                const userRes = await fetch(`${API}/admin/users/${userId}`, {
                    credentials: "include",
                });
                if (!userRes.ok) throw new Error("Failed to fetch user details");
                data = await userRes.json();
                setModalData(data.data || data.user);
            }
        } catch (err) {
            setModalData({
                error: err instanceof Error ? err.message : "Failed to load data",
            });
        } finally {
            setModalLoading(false);
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setModalData(null);
        setSelectedUser(null);
    };

    const totalPages = Math.ceil(total / pageSize);
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
                <h1>Users</h1>
                <p>Manage your users</p>
                
                {error && (
                    <div style={{ background: "#fee2e2", color: "#991b1b", padding: 16, borderRadius: 8, marginBottom: 20 }}>
                        {error}
                    </div>
                )}
            </div>

            {showModal && (
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
                            width: "min(920px, 95vw)",
                            maxHeight: "90vh",
                            overflowY: "auto",
                            boxShadow: "0 15px 50px rgba(0,0,0,0.25)",
                            margin: "auto",
                        }}
                    >
                        {/* Modal Header */}
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
                                    {modalMode === "cart"
                                        ? "Shopping Cart"
                                        : modalMode === "orders"
                                        ? "Orders"
                                        : modalMode === "address"
                                        ? "Addresses"
                                        : "User Details"}
                                </h3>
                                    
                                {selectedUser && (
                                    <div
                                        style={{
                                            marginTop: 8,
                                            color: "#6b7280",
                                            fontSize: 13,
                                        }}
                                    >
                                        {selectedUser.email || selectedUser._id}
                                    </div>
                                )}
                            </div>
                            
                            <button
                                onClick={closeModal}
                                style={{
                                    border: "none",
                                    background: "transparent",
                                    cursor: "pointer",
                                    fontSize: 24,
                                    lineHeight: 1,
                                }}
                            >
                                ×
                            </button>
                        </div>
                            
                        {/* Modal Body */}
                        {modalLoading ? (
                            <div style={{ textAlign: "center", padding: 40 }}>
                                <p>Loading details...</p>
                            </div>
                        ) : modalData?.error ? (
                            <div
                                style={{
                                    background: "#fee2e2",
                                    color: "#991b1b",
                                    padding: 16,
                                    borderRadius: 8,
                                }}
                            >
                                {modalData.error}
                            </div>
                        ) : modalMode === "view" ? (
                            <>
                                {/* Avatar */}
                                <div style={{ marginBottom: 24 }}>
                                    {modalData.avatar ? (
                                        <img
                                            src={modalData.avatar}
                                            alt="User"
                                            style={{
                                                width: 140,
                                                height: 140,
                                                objectFit: "cover",
                                                borderRadius: 8,
                                                border: "1px solid #e5e7eb",
                                            }}
                                        />
                                    ) : (
                                        <div
                                            style={{
                                                width: 140,
                                                height: 140,
                                                borderRadius: 8,
                                                background: "#f9fafb",
                                                border: "1px solid #e5e7eb",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontSize: 18,
                                                color: "#6b7280",
                                            }}
                                        >
                                            No Image
                                        </div>
                                    )}
                                </div>
                                
                                {/* Basic Information */}
                                <div style={{ marginBottom: 24 }}>
                                    <h4
                                        style={{
                                            margin: "0 0 12px 0",
                                            fontSize: 16,
                                            color: "#374151",
                                        }}
                                    >
                                        Basic Information
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
                                            <strong>First Name:</strong>{" "}
                                            {modalData.firstName || "N/A"}
                                        </div>
                                        <div>
                                            <strong>Last Name:</strong>{" "}
                                            {modalData.lastName || "N/A"}
                                        </div>
                                        <div>
                                            <strong>Email:</strong>{" "}
                                            {modalData.email || "N/A"}
                                        </div>
                                        <div>
                                            <strong>Phone:</strong>{" "}
                                            {modalData.phone || "N/A"}
                                        </div>
                                    </div>
                                </div>
                                    
                                {/* Account Status */}
                                <div style={{ marginBottom: 24 }}>
                                    <h4
                                        style={{
                                            margin: "0 0 12px 0",
                                            fontSize: 16,
                                            color: "#374151",
                                        }}
                                    >
                                        Account Status
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
                                            <strong>Status:</strong>{" "}
                                            {modalData.status || "N/A"}
                                        </div>
                                        <div>
                                            <strong>Role:</strong>{" "}
                                            {modalData.role || "N/A"}
                                        </div>
                                        <div>
                                            <strong>Verified:</strong>{" "}
                                            {modalData.verified ? "Yes" : "No"}
                                        </div>
                                        <div>
                                            <strong>Wallet Balance:</strong> ₹
                                            {modalData.wallet || 0}
                                        </div>
                                    </div>
                                </div>
                                    
                                {/* Timestamps */}
                                <div style={{ marginBottom: 24 }}>
                                    <h4
                                        style={{
                                            margin: "0 0 12px 0",
                                            fontSize: 16,
                                            color: "#374151",
                                        }}
                                    >
                                        Timestamps
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
                                            <strong>Joined:</strong>{" "}
                                            {modalData.createdAt
                                                ? new Date(
                                                      modalData.createdAt
                                                  ).toLocaleString()
                                                : "N/A"}
                                        </div>
                                              
                                        <div>
                                            <strong>Updated:</strong>{" "}
                                            {modalData.updatedAt
                                                ? new Date(
                                                      modalData.updatedAt
                                                  ).toLocaleString()
                                                : "N/A"}
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : modalMode === "cart" ? (
                            /* CART MODE FIXED */
                            <div style={{ padding: 10 }}>
                                {modalData?.items?.length > 0 ? (
                                    <>
                                        {modalData.items.map((item: CartItem, idx: number) => {
                                            const price = Number(item.price) || 0;
                                            const quantity = Number(item.quantity) || 0;
                                            const totalPrice = price * quantity;
                                        
                                            return (
                                                <div
                                                    key={idx}
                                                    style={{
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        alignItems: "center",
                                                        padding: "14px 0",
                                                        borderBottom:
                                                            "1px solid #e5e7eb",
                                                        gap: 12,
                                                    }}
                                                >
                                                    <div style={{ flex: 1 }}>
                                                        <div
                                                            style={{
                                                                fontWeight: 600,
                                                                fontSize: 14,
                                                            }}
                                                        >
                                                            {item.name ||
                                                                "Unnamed Product"}
                                                        </div>
                                                            
                                                        <div
                                                            style={{
                                                                fontSize: 13,
                                                                color: "#6b7280",
                                                            }}
                                                        >
                                                            Quantity: {quantity}
                                                        </div>
                                                    </div>
                                                        
                                                    <div style={{ textAlign: "right" }}>
                                                        <div
                                                            style={{
                                                                fontWeight: 600,
                                                                fontSize: 14,
                                                            }}
                                                        >
                                                            ₹{totalPrice}
                                                        </div>
                                                        
                                                        <div
                                                            style={{
                                                                fontSize: 13,
                                                                color: "#6b7280",
                                                            }}
                                                        >
                                                            ₹{price} each
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Cart Summary */}
                                        <div
                                            style={{
                                                marginTop: 20,
                                                background: "#f9fafb",
                                                padding: 16,
                                                borderRadius: 8,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    marginBottom: 6,
                                                }}
                                            >
                                                <span>Subtotal:</span>
                                                <strong>
                                                    ₹{modalData.subtotal || 0}
                                                </strong>
                                            </div>
                                            
                                            <div
                                                style={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    marginBottom: 6,
                                                }}
                                            >
                                                <span>Tax:</span>
                                                <strong>₹{modalData.tax || 0}</strong>
                                            </div>
                                            
                                            <div
                                                style={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    fontSize: 16,
                                                }}
                                            >
                                                <span>Total:</span>
                                                <strong>₹{modalData.total || 0}</strong>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <p style={{ color: "#6b7280" }}>Cart is empty</p>
                                )}
                            </div>
                        ) : modalMode === "orders" ? (
                            <div style={{ padding: 10 }}>
                                {Array.isArray(modalData) && modalData.length > 0 ? (
                                    modalData.map((order: Order, idx: number) => (
                                        <div
                                            key={idx}
                                            style={{
                                                background: "#f9fafb",
                                                padding: 16,
                                                borderRadius: 8,
                                                marginBottom: 12,
                                            }}
                                        >
                                            <strong>Order #{order.orderId}</strong>
                                            <p>Total: ₹{order.total}</p>
                                            <p>Status: {order.status}</p>
                                            <p>Payment: {order.paymentStatus}</p>
                                        </div>
                                    ))
                                ) : (
                                    <p style={{ color: "#6b7280" }}>No orders found</p>
                                )}
                            </div>
                        ) : (
                            <div style={{ padding: 10 }}>
                                {Array.isArray(modalData) && modalData.length > 0 ? (
                                    modalData.map((addr: Address, idx: number) => (
                                        <div
                                            key={idx}
                                            style={{
                                                background: "#f9fafb",
                                                padding: 16,
                                                borderRadius: 8,
                                                marginBottom: 12,
                                            }}
                                        >
                                            <strong>{addr.name}</strong>
                                            <p>{addr.address}</p>
                                            <p>
                                                {addr.city}, {addr.state} {addr.pincode}
                                            </p>
                                            <p>Phone: {addr.phone}</p>
                                        </div>
                                    ))
                                ) : (
                                    <p style={{ color: "#6b7280" }}>No addresses found</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}


            <div className="admin-table-container">
                <div className="admin-table-header" style={{ alignItems: "center", justifyContent: "space-between" }}>
                    <h3>All Users ({total || users.length})</h3>
                    <div style={{ fontSize: 13, color: "var(--text-2)" }}>
                        Page {page} · Showing {users.length} of {total || users.length}
                    </div>
                </div>
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user._id}>
                                <td>
                                    {user.firstName} {user.lastName}
                                </td>
                                <td>{user.email}</td>
                                <td>{user.phone || "-"}</td>
                                <td>
                                    <span className={`px-2 py-1 rounded text-sm font-semibold ${
                                                    user.status === "active"
                                                        ? "bg-green-100 text-green-800"
                                                        : user.status === "inactive"
                                                          ? "bg-yellow-100 text-yellow-800"
                                                          : "bg-red-100 text-red-800"
                                                }`}
                                    >
                                        {user.status || "unknown"}
                                    </span>
                                </td>
                                <td>
                                    <div>
                                        <button 
                                            onClick={() => openModal(user, "cart")}
                                            style={{
                                                padding: "6px 12px",
                                                background: "#3b82f6",
                                                color: "#fff",
                                                border: "none",
                                                borderRadius: 4,
                                                cursor: "pointer",
                                                marginRight: 8,
                                                fontSize: 12,
                                            }}
                                        >Cart</button>
                                        <button 
                                            onClick={() => openModal(user, "orders")}
                                            style={{
                                                padding: "6px 12px",
                                                background: "#8b5cf6",
                                                color: "#fff",
                                                border: "none",
                                                borderRadius: 4,
                                                cursor: "pointer",
                                                marginRight: 8,
                                                fontSize: 12,
                                            }}
                                        >Orders</button>
                                        <button 
                                            onClick={() => openModal(user, "address")}
                                            style={{
                                                padding: "6px 12px",
                                                background: "#ea580c",
                                                color: "#fff",
                                                border: "none",
                                                borderRadius: 4,
                                                cursor: "pointer",
                                                marginRight: 8,
                                                fontSize: 12,
                                            }}
                                        >Address</button>
                                        <button 
                                            onClick={() => openModal(user, "view")}
                                            style={{
                                                padding: "6px 12px",
                                                background: "#10b981",
                                                color: "#fff",
                                                border: "none",
                                                borderRadius: 4,
                                                cursor: "pointer",
                                                marginRight: 8,
                                                fontSize: 12,
                                            }}
                                        >View</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
