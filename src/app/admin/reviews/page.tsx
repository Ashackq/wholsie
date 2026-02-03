"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RefreshButton from "../../../components/RefreshButton";

interface Review {
    _id: string;
    productId: { _id: string; name: string; slug: string };
    userId: { _id: string; name: string; email: string };
    rating: number;
    title: string;
    comment: string;
    status: string;
    createdAt: string;
}

type DashboardData = {
    data: Review[];
    pagination: {
        limit: number;
        offset: number;
        total: number;
    };
};

export default function AdminReviewsPage() {
    const [reviews, setReviews] = useState<DashboardData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState<{ [key: string]: string }>({});
    const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

    const loadReviews = async (status?: string) => {
        setLoading(true);

        try {
            let url = `${API_URL}/admin/reviews?limit=100&offset=0`;
            if (status && status !== 'all') {
                url += `&status=${status}`;
            }

            const res = await fetch(url, {
                credentials: "include",
            });

            if (res.status === 401 || res.status === 403) {
                setError("Admin authentication required. Please log in.");
                return;
            }

            const json = await res.json();
            setReviews(json);
        } catch (e: any) {
            setError(e?.message || "Failed to load reviews");
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (tab: 'all' | 'pending' | 'approved' | 'rejected') => {
        setActiveTab(tab);
        loadReviews(tab === 'all' ? undefined : tab);
    };

    const handleApprove = async (reviewId: string) => {
        setActionLoading(reviewId);
        try {
            const res = await fetch(`${API_URL}/admin/reviews/${reviewId}/approve`, {
                method: "PUT",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (res.ok) {
                alert("Review approved!");
                loadReviews();
            } else {
                alert("Failed to approve review");
            }
        } catch (err) {
            alert("Error approving review");
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (reviewId: string) => {
        const reason = rejectReason[reviewId] || "";
        if (!reason.trim()) {
            alert("Please provide a rejection reason");
            return;
        }

        setActionLoading(reviewId);
        try {
            const res = await fetch(`${API_URL}/admin/reviews/${reviewId}/reject`, {
                method: "PUT",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ reason }),
            });

            if (res.ok) {
                alert("Review rejected!");
                setRejectReason({ ...rejectReason, [reviewId]: "" });
                loadReviews();
            } else {
                alert("Failed to reject review");
            }
        } catch (err) {
            alert("Error rejecting review");
        } finally {
            setActionLoading(null);
        }
    };

    useEffect(() => {
        loadReviews(activeTab === 'all' ? undefined : activeTab);
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
                <div
                    style={{
                        background: "#fef3c7",
                        color: "#92400e",
                        padding: 20,
                        borderRadius: 8,
                    }}
                >
                    {error} –{" "}
                    <Link href="/login" style={{ textDecoration: "underline" }}>
                        Go to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div
                className="admin-page-header"
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                {/* Left Side */}
                <div>
                    <h1>Reviews</h1>
                    <p>Manage and moderate customer feedback</p>
                </div>

                {/* ✅ Right Side Refresh */}
                <RefreshButton onRefresh={() => loadReviews(activeTab === 'all' ? undefined : activeTab)} loading={loading} />
            </div>

            {/* Tabs */}
            <div style={{
                display: 'flex',
                gap: '20px',
                borderBottom: '2px solid #f0f0f0',
                marginBottom: '30px',
                paddingBottom: '0'
            }}>
                {[
                    { id: 'pending', label: 'Pending' },
                    { id: 'approved', label: 'Approved' },
                    { id: 'rejected', label: 'Rejected' },
                    { id: 'all', label: 'All Reviews' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id as any)}
                        style={{
                            padding: '12px 20px',
                            border: 'none',
                            borderBottom: activeTab === tab.id ? '3px solid #F05F22' : '3px solid transparent',
                            backgroundColor: 'transparent',
                            color: activeTab === tab.id ? '#F05F22' : '#666',
                            cursor: 'pointer',
                            fontWeight: activeTab === tab.id ? '600' : 'normal',
                            fontSize: '15px',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Reviews Table */}
            {reviews && reviews.data && reviews.data.length > 0 ? (
                <div className="admin-table-container">
                    <div className="admin-table-header">
                        <h3>
                            {activeTab === 'all' ? 'All' : activeTab === 'pending' ? 'Pending' : activeTab === 'approved' ? 'Approved' : 'Rejected'} Reviews ({reviews.pagination.total})
                        </h3>
                    </div>
                    <div className="table-responsive">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Customer</th>
                                    <th>Rating</th>
                                    <th>Review</th>
                                    <th>Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reviews.data.map((review) => (
                                    <tr key={review._id}>
                                        <td>
                                            <Link
                                                href={`/products/${review.productId.slug}`}
                                                style={{ color: "#F05F22", textDecoration: "none" }}
                                            >
                                                <strong>{review.productId.name}</strong>
                                            </Link>
                                        </td>
                                        <td>
                                            <div>
                                                <p style={{ margin: "0 0 4px 0" }}>
                                                    <strong>{review.userId.name}</strong>
                                                </p>
                                                <p
                                                    style={{
                                                        margin: 0,
                                                        fontSize: "12px",
                                                        color: "#666",
                                                    }}
                                                >
                                                    {review.userId.email}
                                                </p>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{ color: "#ffa500" }}>
                                                {'★'.repeat(review.rating)}
                                                {'☆'.repeat(5 - review.rating)}
                                            </span>
                                            <br />
                                            <strong>{review.rating}/5</strong>
                                        </td>
                                        <td>
                                            <div
                                                style={{
                                                    maxWidth: "300px",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                }}
                                            >
                                                <p style={{ margin: "0 0 4px 0", fontWeight: "600" }}>
                                                    {review.title}
                                                </p>
                                                <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>
                                                    {review.comment.substring(0, 100)}
                                                    {review.comment.length > 100 ? "..." : ""}
                                                </p>
                                            </div>
                                        </td>
                                        <td>
                                            <small>
                                                {new Date(review.createdAt).toLocaleDateString(
                                                    "en-IN",
                                                    {
                                                        year: "numeric",
                                                        month: "short",
                                                        day: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    }
                                                )}
                                            </small>
                                        </td>
                                        <td>
                                            {review.status === 'pending' ? (
                                                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                                    <button
                                                        onClick={() => handleApprove(review._id)}
                                                        disabled={actionLoading === review._id}
                                                        style={{
                                                            padding: "6px 12px",
                                                            backgroundColor: "#10b981",
                                                            color: "white",
                                                            border: "none",
                                                            borderRadius: "4px",
                                                            cursor: "pointer",
                                                            fontSize: "12px",
                                                            opacity: actionLoading === review._id ? 0.6 : 1,
                                                        }}
                                                    >
                                                        {actionLoading === review._id ? "..." : "Approve"}
                                                    </button>

                                                    <div style={{ flex: "1 1 100%" }}>
                                                        <textarea
                                                            placeholder="Rejection reason..."
                                                            value={rejectReason[review._id] || ""}
                                                            onChange={(e) =>
                                                                setRejectReason({
                                                                    ...rejectReason,
                                                                    [review._id]: e.target.value,
                                                                })
                                                            }
                                                            style={{
                                                                width: "100%",
                                                                padding: "6px",
                                                                fontSize: "12px",
                                                                border: "1px solid #ddd",
                                                                borderRadius: "4px",
                                                                minHeight: "60px",
                                                                maxHeight: "80px",
                                                                resize: "vertical",
                                                            }}
                                                        />
                                                    </div>

                                                    <button
                                                        onClick={() => handleReject(review._id)}
                                                        disabled={actionLoading === review._id}
                                                        style={{
                                                            padding: "6px 12px",
                                                            backgroundColor: "#ef4444",
                                                            color: "white",
                                                            border: "none",
                                                            borderRadius: "4px",
                                                            cursor: "pointer",
                                                            fontSize: "12px",
                                                            opacity: actionLoading === review._id ? 0.6 : 1,
                                                        }}
                                                    >
                                                        {actionLoading === review._id ? "..." : "Reject"}
                                                    </button>
                                                </div>
                                            ) : (
                                                <span style={{
                                                    padding: "6px 12px",
                                                    backgroundColor: review.status === 'approved' ? '#d1fae5' : '#fee2e2',
                                                    color: review.status === 'approved' ? '#065f46' : '#991b1b',
                                                    borderRadius: "4px",
                                                    fontSize: "12px",
                                                    fontWeight: '600',
                                                    textTransform: 'capitalize'
                                                }}>
                                                    {review.status}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div
                    style={{
                        background: "#d1fae5",
                        color: "#065f46",
                        padding: "40px 20px",
                        borderRadius: 8,
                        textAlign: "center",
                        marginTop: "40px",
                    }}
                >
                    <i
                        className="fas fa-check-circle"
                        style={{ fontSize: "40px", marginBottom: "15px", display: "block" }}
                    ></i>
                    <p style={{ fontSize: "18px", margin: 0 }}>
                        All reviews have been reviewed! No pending reviews.
                    </p>
                </div>
            )}
        </div>
    );
}
