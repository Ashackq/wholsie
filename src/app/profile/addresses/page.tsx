"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/api";
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

interface Address {
    _id: string;
    address: string;  // street address from API
    address2?: string;
    city: string;
    state: string;
    pincode: string;  // postalCode from API
    landmark?: string;
    isDefault: boolean;
    // These may not exist in DB but frontend form uses them
    name?: string;
    phone?: string;
}

export default function AddressesPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        street: "",
        city: "",
        state: "",
        postalCode: "",
        isDefault: false,
    });

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
                fetchAddresses();
            } catch (err) {
                console.error("Failed to load user data:", err);
                router.push("/login");
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [router]);

    const fetchAddresses = async () => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
            const res = await fetch(`${API_URL}/addresses`, {
                credentials: "include",
            });
            const data = await res.json();
            setAddresses(data.data || []);
            if (Array.isArray(data.data) && data.data.length > 0) {
                localStorage.removeItem("profileMessage");
            }
        } catch (err) {
            console.error("Error fetching addresses:", err);
        }
    };

    const handleAddAddress = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
            const res = await fetch(`${API_URL}/addresses`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                setFormData({
                    name: "",
                    email: "",
                    street: "",
                    city: "",
                    state: "",
                    postalCode: "",
                    isDefault: false,
                });
                setShowForm(false);
                localStorage.removeItem("profileMessage");
                fetchAddresses();
                // Refresh user data in case profile was updated
                const userData = await getCurrentUser();
                if (userData?.data) {
                    localStorage.setItem("user", JSON.stringify(userData.data));
                }
                const redirectTo = localStorage.getItem("postCheckoutRedirect");
                if (redirectTo) {
                    localStorage.removeItem("postCheckoutRedirect");
                    router.push(redirectTo);
                }
            }
        } catch (err) {
            console.error("Error adding address:", err);
        }
    };

    const handleDeleteAddress = async (id: string) => {
        if (!confirm("Are you sure you want to delete this address?")) return;

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
            await fetch(`${API_URL}/addresses/${id}`, {
                method: "DELETE",
                credentials: "include",
            });
            fetchAddresses();
        } catch (err) {
            console.error("Error deleting address:", err);
        }
    };

    const handleSetDefault = async (address: Address) => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
            const res = await fetch(`${API_URL}/addresses/${address._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ isDefault: !address.isDefault }),
            });

            if (res.ok) {
                fetchAddresses();
            }
        } catch (err) {
            console.error("Error updating default address:", err);
        }
    };

    const handleEditAddress = (address: Address) => {
        setEditingAddressId(address._id);
        setFormData({
            name: address.name || "",
            email: (address as any).email || "",
            street: address.address || "",  // Map API 'address' to form 'street'
            city: address.city,
            state: address.state,
            postalCode: address.pincode || "",  // Map API 'pincode' to form 'postalCode'
            isDefault: address.isDefault,
        });
        setShowForm(true);
    };

    const handleUpdateAddress = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingAddressId) return;

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
            const res = await fetch(`${API_URL}/addresses/${editingAddressId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                setFormData({
                    name: "",
                    email: "",
                    street: "",
                    city: "",
                    state: "",
                    postalCode: "",
                    isDefault: false,
                });
                setShowForm(false);
                setEditingAddressId(null);
                localStorage.removeItem("profileMessage");
                fetchAddresses();
                // Refresh user data in case profile was updated
                const userData = await getCurrentUser();
                if (userData?.data) {
                    localStorage.setItem("user", JSON.stringify(userData.data));
                }
                const redirectTo = localStorage.getItem("postCheckoutRedirect");
                if (redirectTo) {
                    localStorage.removeItem("postCheckoutRedirect");
                    router.push(redirectTo);
                }
            }
        } catch (err) {
            console.error("Error updating address:", err);
        }
    };

    const handleCancelEdit = () => {
        setShowForm(false);
        setEditingAddressId(null);
        setFormData({
            name: "",
            email: "",
            street: "",
            city: "",
            state: "",
            postalCode: "",
            isDefault: false,
        });
    };

    if (loading) {
        return (
            <section className="mt_55 mb_100">
                <div className="container">
                    <p>Loading...</p>
                </div>
            </section>
        );
    }

    if (!user) {
        return null;
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
                            <h3 className="dashboard_title">Manage Addresses</h3>

                            <div className="dashboard_content_item">
                                {!showForm ? (
                                    <button
                                        onClick={() => setShowForm(true)}
                                        className="common_btn"
                                        style={{ marginBottom: "25px" }}
                                    >
                                        <i className="fa-solid fa-plus"></i> Add New Address
                                    </button>
                                ) : (
                                    <form onSubmit={editingAddressId ? handleUpdateAddress : handleAddAddress} className="address-form mb-4">
                                        <h4 className="mb-4">{editingAddressId ? "Edit Address" : "Add New Address"}</h4>

                                        <div className="row">
                                            <div className="col-md-6 mb-3">
                                                <label className="form-label">Name *</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                    className="form-control"
                                                />
                                            </div>

                                            <div className="col-12 mb-3">
                                                <label className="form-label">Email *</label>
                                                <input
                                                    type="email"
                                                    required
                                                    value={formData.email}
                                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                    className="form-control"
                                                    placeholder="Your email address"
                                                />
                                                <small className="text-muted">This will also update your account email</small>
                                            </div>
                                            <div className="col-12 mb-3">
                                                <label className="form-label">Street Address *</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={formData.street}
                                                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                                                    className="form-control"
                                                />
                                            </div>
                                            <div className="col-md-4 mb-3">
                                                <label className="form-label">City *</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={formData.city}
                                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                                    className="form-control"
                                                />
                                            </div>
                                            <div className="col-md-4 mb-3">
                                                <label className="form-label">State *</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={formData.state}
                                                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                                    className="form-control"
                                                />
                                            </div>
                                            <div className="col-md-4 mb-3">
                                                <label className="form-label">Postal Code *</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={formData.postalCode}
                                                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                                                    className="form-control"
                                                />
                                            </div>
                                            <div className="col-12 mb-3">
                                                <div className="form-check">
                                                    <input
                                                        type="checkbox"
                                                        id="defaultAddress"
                                                        checked={formData.isDefault}
                                                        onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                                                        className="form-check-input"
                                                    />
                                                    <label className="form-check-label" htmlFor="defaultAddress">
                                                        Set as default delivery address
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="d-flex gap-2 mt-3">
                                            <button type="submit" className="common_btn">
                                                {editingAddressId ? "Update Address" : "Save Address"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleCancelEdit}
                                                className="common_btn"
                                                style={{ backgroundColor: "#6c757d" }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {/* Addresses List - Hide when editing */}
                                {!showForm && (
                                    <div className="row">
                                        {addresses.length > 0 ? (
                                            addresses.map((address) => (
                                                <div key={address._id} className="col-md-6 mb-4">
                                                    <div className="address-card" style={{ position: "relative", padding: "20px", background: "#f8f9fa", borderRadius: "10px", border: address.isDefault ? "2px solid #F05F22" : "1px solid #eee" }}>
                                                        {address.isDefault && (
                                                            <span style={{ position: "absolute", top: "12px", right: "12px", background: "#F05F22", color: "#fff", padding: "4px 10px", borderRadius: "4px", fontSize: "12px", fontWeight: 500 }}>
                                                                Default
                                                            </span>
                                                        )}
                                                        {address.name && <h5 style={{ marginBottom: "10px", fontWeight: 600, color: "#333" }}>{address.name}</h5>}
                                                        <p style={{ marginBottom: "6px", fontWeight: 500, color: "#333" }}>
                                                            <i className="fa-solid fa-location-dot" style={{ marginRight: "8px", color: "#F05F22" }}></i>
                                                            {address.address}
                                                        </p>
                                                        {address.address2 && (
                                                            <p style={{ marginBottom: "6px", color: "#666", paddingLeft: "22px" }}>{address.address2}</p>
                                                        )}
                                                        {address.landmark && (
                                                            <p style={{ marginBottom: "6px", color: "#888", paddingLeft: "22px", fontSize: "14px" }}>
                                                                Landmark: {address.landmark}
                                                            </p>
                                                        )}
                                                        <p style={{ marginBottom: "6px", color: "#666", paddingLeft: "22px" }}>
                                                            {address.city}, {address.state} - {address.pincode}
                                                        </p>
                                                        {address.phone && (
                                                            <p style={{ marginBottom: "15px", color: "#666", paddingLeft: "22px" }}>
                                                                <i className="fa-solid fa-phone" style={{ marginRight: "6px" }}></i> {address.phone}
                                                            </p>
                                                        )}
                                                        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", marginTop: "15px", paddingTop: "15px", borderTop: "1px solid #eee" }}>
                                                            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", margin: 0 }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={address.isDefault}
                                                                    onChange={() => handleSetDefault(address)}
                                                                    className="form-check-input"
                                                                    style={{ margin: 0 }}
                                                                />
                                                                <span style={{ fontSize: "14px", color: "#666" }}>Set Default</span>
                                                            </label>
                                                            <button
                                                                onClick={() => handleEditAddress(address)}
                                                                className="common_btn"
                                                                style={{ padding: "8px 16px", fontSize: "14px" }}
                                                            >
                                                                <i className="fa-solid fa-pen" style={{ marginRight: "6px" }}></i> Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteAddress(address._id)}
                                                                className="common_btn"
                                                                style={{ padding: "8px 16px", fontSize: "14px", background: "#dc3545" }}
                                                            >
                                                                <i className="fa-solid fa-trash" style={{ marginRight: "6px" }}></i> Delete
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="col-12">
                                                <div style={{ padding: "60px 20px", textAlign: "center", background: "#f8f9fa", borderRadius: "8px" }}>
                                                    <i className="fa-solid fa-map-pin" style={{ fontSize: "48px", color: "#ccc", marginBottom: "15px" }}></i>
                                                    <p style={{ color: "#666", marginBottom: "15px" }}>
                                                        No addresses yet
                                                    </p>
                                                    <button onClick={() => setShowForm(true)} className="common_btn">
                                                        Add Your First Address
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
