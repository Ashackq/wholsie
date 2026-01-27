"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, getOrders } from "@/lib/api";
import ProfileSidebar from "@/components/ProfileSidebar";

interface User {
    _id?: string;
    id?: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    role?: string;
    wallet?: number;
}

interface Order {
    _id: string;
    orderId?: string;
    orderNo?: string;
    total?: number;
    netAmount?: number;
    totalPrice?: number;
    status: string | number;
    paymentStatus?: string;
    createdAt?: string;
    orderDate?: string;
    invoiceUrl?: string;
    invoiceId?: any;
    items: Array<{
        name: string;
        quantity: number;
        price: number;
    }>;
}

export default function OrdersPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const cacheUser = (u: User | null) => {
        if (!u) return;
        setUser(u);
    };

    useEffect(() => {
        async function loadData() {
            try {
                const userData = await getCurrentUser();
                const resolvedUser = userData.data || null;
                if (resolvedUser) cacheUser(resolvedUser);

                const ordersData = await getOrders();
                setOrders(ordersData.data || []);
            } catch (err) {
                setError("Failed to load orders. Please login.");
                router.push("/login");
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [router]);

    if (loading) {
        return (
            <section className="mt_55 mb_100">
                <div className="container">
                    <p>Loading orders...</p>
                </div>
            </section>
        );
    }

    if (error || !user) {
        return (
            <section className="mt_55 mb_100">
                <div className="container">
                    <p className="text-danger">{error || "Please login to view orders"}</p>
                    <Link href="/login" className="common_btn">
                        Go to Login
                    </Link>
                </div>
            </section>
        );
    }

    return (
        <section className="dashboard mb_50 mt_55">
            <div className="container">
                <div className="row">
                    {/* Sidebar Navigation */}
                    <div className="col-lg-3 wow fadeInUp">
                        <ProfileSidebar user={user} />
                    </div>

                    {/* Main Content */}
                    <div className="col-lg-9">
                        <div className="dashboard_content">
                            <h3 className="dashboard_title">My Orders</h3>

                            {orders.length === 0 ? (
                                <div style={{ padding: "60px 20px", textAlign: "center", background: "#f8f9fa", borderRadius: "8px" }}>
                                    <i className="fas fa-box-open" style={{ fontSize: "60px", color: "#ccc", marginBottom: "20px" }}></i>
                                    <p style={{ fontSize: "18px", color: "#666", marginBottom: "20px" }}>You haven't placed any orders yet</p>
                                    <Link href="/products" className="common_btn">
                                        Start Shopping
                                    </Link>
                                </div>
                            ) : (
                                <div className="dashboard_content_item">
                                    <div className="table-responsive">
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th>Order ID</th>
                                                    <th>Date</th>
                                                    <th>Items</th>
                                                    <th>Total</th>
                                                    <th>Status</th>
                                                    <th>Invoice</th>
                                                    <th>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {orders.map((order) => {
                                                    const displayStatus = order.status === 6 ? "delivered" :
                                                        order.status === "cancelled" ? "cancelled" :
                                                            order.status === "shipped" ? "shipped" :
                                                                order.status === "processing" ? "processing" : "pending";

                                                    return (
                                                        <tr key={order._id}>
                                                            <td>
                                                                <strong>#{order.orderId || order.orderNo || order._id.slice(-8)}</strong>
                                                            </td>
                                                            <td>
                                                                {new Date(order.createdAt || order.orderDate || "").toLocaleDateString()}
                                                            </td>
                                                            <td>{order.items?.length || 0} item(s)</td>
                                                            <td>
                                                                <strong>₹{(order.total || order.netAmount || order.totalPrice || 0).toFixed(2)}</strong>
                                                            </td>
                                                            <td style={{ verticalAlign: "middle" }}>
                                                                <span
                                                                    className="badge"
                                                                    style={{
                                                                        padding: "5px 12px",
                                                                        borderRadius: "20px",
                                                                        display: "inline-block",
                                                                        verticalAlign: "middle",
                                                                        backgroundColor:
                                                                            displayStatus === "delivered" ? "#d4edda" :
                                                                                displayStatus === "shipped" ? "#d1ecf1" :
                                                                                    displayStatus === "processing" ? "#fff3cd" :
                                                                                        displayStatus === "cancelled" ? "#f8d7da" : "#ffeaa7",
                                                                        color:
                                                                            displayStatus === "delivered" ? "#155724" :
                                                                                displayStatus === "shipped" ? "#0c5460" :
                                                                                    displayStatus === "processing" ? "#856404" :
                                                                                        displayStatus === "cancelled" ? "#721c24" : "#856404"
                                                                    }}
                                                                >
                                                                    {displayStatus.toUpperCase()}
                                                                </span>
                                                            </td>
                                                            <td style={{ verticalAlign: "middle" }}>
                                                                {(order as any).invoiceUrl ? (
                                                                    <a 
                                                                        href={(order as any).invoiceUrl}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="common_btn" 
                                                                        style={{ 
                                                                            padding: "5px 12px", 
                                                                            fontSize: "12px", 
                                                                            backgroundColor: "#28a745", 
                                                                            color: "white", 
                                                                            textDecoration: "none",
                                                                            display: "inline-block",
                                                                            verticalAlign: "middle",
                                                                            borderRadius: "4px"
                                                                        }}
                                                                        title="Download Invoice PDF"
                                                                    >
                                                                        Invoice
                                                                    </a>
                                                                ) : (
                                                                    <span style={{ color: "#999", fontSize: "12px" }}>N/A</span>
                                                                )}
                                                            </td>
                                                            <td style={{ verticalAlign: "middle" }}>
                                                                <Link 
                                                                    href={`/orders/${order._id}`} 
                                                                    className="common_btn" 
                                                                    style={{ 
                                                                        padding: "5px 16px", 
                                                                        fontSize: "12px",
                                                                        display: "inline-block",
                                                                        verticalAlign: "middle",
                                                                        textDecoration: "none",
                                                                        borderRadius: "4px"
                                                                    }}
                                                                >
                                                                    View Details
                                                                </Link>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
