"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type DashboardData = {
    totalOrders: number;
    totalRevenue: number;
    totalCustomers: number;
    totalProducts: number;
    orderStatus: Array<{ _id: string; count: number }>;
    recentOrders: Array<any>;
};

export default function AdminDashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const res = await fetch("http://localhost:4000/api/admin/dashboard", {
                    credentials: "include",
                });
                if (res.status === 401 || res.status === 403) {
                    setError("Admin authentication required. Please log in.");
                    setLoading(false);
                    return;
                }
                const json = await res.json();
                setData(json.data);
                setLoading(false);
            } catch (e: any) {
                setError(e?.message || "Failed to load dashboard");
                setLoading(false);
            }
        }
        load();
    }, []);

    if (loading) {
        return (
            <div className="admin-page-header">
                <h1>Loading...</h1>
            </div>
        );
    }

    if (error) {
        return (
            <div>
                <div className="admin-page-header">
                    <h1>Error</h1>
                    <p>{error}</p>
                </div>
                <div style={{ background: "#fef3c7", color: "#92400e", padding: 20, borderRadius: 8 }}>
                    {error} – <Link href="/login" style={{ textDecoration: "underline" }}>Go to Login</Link>
                </div>
            </div>
        );
    }

    if (!data) {
        return null;
    }

    return (
        <div>
            <div className="admin-page-header">
                <h1>Dashboard</h1>
                <p>Welcome back! Here's what's happening with your store.</p>
            </div>

            {/* Stats Grid */}
            <div className="admin-stats-grid">
                <div className="admin-stat-card">
                    <div className="admin-stat-header">
                        <div>
                            <div className="admin-stat-label">Total Orders</div>
                            <div className="admin-stat-value">{data.totalOrders}</div>
                        </div>
                        <div className="admin-stat-icon primary">
                            <i className="fas fa-shopping-bag"></i>
                        </div>
                    </div>
                    <div className="admin-stat-change positive">
                        <i className="fas fa-arrow-up"></i>
                        <span>Active orders</span>
                    </div>
                </div>

                <div className="admin-stat-card">
                    <div className="admin-stat-header">
                        <div>
                            <div className="admin-stat-label">Revenue</div>
                            <div className="admin-stat-value">₹{(data.totalRevenue || 0).toFixed(2)}</div>
                        </div>
                        <div className="admin-stat-icon success">
                            <i className="fas fa-rupee-sign"></i>
                        </div>
                    </div>
                    <div className="admin-stat-change positive">
                        <i className="fas fa-arrow-up"></i>
                        <span>Total earnings</span>
                    </div>
                </div>

                <div className="admin-stat-card">
                    <div className="admin-stat-header">
                        <div>
                            <div className="admin-stat-label">Customers</div>
                            <div className="admin-stat-value">{data.totalCustomers}</div>
                        </div>
                        <div className="admin-stat-icon info">
                            <i className="fas fa-users"></i>
                        </div>
                    </div>
                    <div className="admin-stat-change positive">
                        <i className="fas fa-arrow-up"></i>
                        <span>Registered users</span>
                    </div>
                </div>

                <div className="admin-stat-card">
                    <div className="admin-stat-header">
                        <div>
                            <div className="admin-stat-label">Products</div>
                            <div className="admin-stat-value">{data.totalProducts}</div>
                        </div>
                        <div className="admin-stat-icon warning">
                            <i className="fas fa-box"></i>
                        </div>
                    </div>
                    <div className="admin-stat-change positive">
                        <i className="fas fa-arrow-up"></i>
                        <span>In catalog</span>
                    </div>
                </div>
            </div>

            {/* Recent Orders Table */}
            <div className="admin-table-container">
                <div className="admin-table-header">
                    <h3>Recent Orders</h3>
                </div>
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Status</th>
                            <th>Amount</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.recentOrders && data.recentOrders.length > 0 ? (
                            data.recentOrders.map((order: any) => (
                                <tr key={order._id}>
                                    <td>
                                        <strong>#{order.orderNo || order._id.slice(-8).toUpperCase()}</strong>
                                    </td>
                                    <td>
                                        <span className={`admin-badge ${order.status === 'delivered' ? 'success' :
                                            order.status === 'pending' ? 'warning' :
                                                order.status === 'processing' ? 'info' : 'danger'
                                            }`}>
                                            {order.status || 'pending'}
                                        </span>
                                    </td>
                                    <td>
                                        <strong>₹{(order.netAmount ?? order.total ?? 0).toFixed(2)}</strong>
                                    </td>
                                    <td>
                                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        }) : "-"}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-2)' }}>
                                    No orders yet
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
