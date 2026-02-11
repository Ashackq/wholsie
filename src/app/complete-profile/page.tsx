"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/api";

interface User {
    _id?: string;
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
}

interface Address {
    _id: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    isDefault: boolean;
}

const isDummyName = (name?: string) => {
    if (!name) return true;
    const trimmed = name.trim();
    if (!trimmed) return true;
    if (trimmed === "N/A") return true;
    return /^user\d*$/i.test(trimmed);
};

const isDummyEmail = (email?: string) => {
    if (!email) return true;
    const trimmed = email.trim();
    if (!trimmed) return true;
    if (trimmed === "N/A") return true;
    return trimmed.includes("phonenumber@") || trimmed.includes("@temp.com");
};

export default function CompleteProfilePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        street: "",
        city: "",
        state: "",
        postalCode: "",
        isDefault: true,
    });

    useEffect(() => {
        const load = async () => {
            try {
                const userString = localStorage.getItem("user");
                if (!userString) {
                    localStorage.setItem("postLoginRedirect", "/complete-profile");
                    router.push("/login");
                    return;
                }

                const userData = await getCurrentUser();
                const user = (userData.data || userData) as User | null;
                if (user) {
                    setFormData((prev) => ({
                        ...prev,
                        name: isDummyName(user.name) ? "" : user.name || prev.name,
                        email: isDummyEmail(user.email) ? "" : user.email || prev.email,
                        phone: user.phone || prev.phone,
                    }));
                }

                const API_URL =
                    process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
                const res = await fetch(`${API_URL}/addresses`, {
                    credentials: "include",
                });
                const addr = await res.json();
                const list = Array.isArray(addr?.data) ? addr.data : [];

                const hasAddress = list.length > 0;
                const hasProfile = user && !isDummyName(user.name) && !isDummyEmail(user.email);

                if (hasAddress && hasProfile) {
                    router.push("/checkout");
                    return;
                }
            } catch (err) {
                console.error("Failed to load profile data:", err);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSaving(true);

        try {
            const API_URL =
                process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
            const res = await fetch(`${API_URL}/addresses`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(formData),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data?.error || "Failed to save address");
                return;
            }

            const userData = await getCurrentUser();
            if (userData?.data) {
                localStorage.setItem("user", JSON.stringify(userData.data));
            }
            localStorage.removeItem("profileMessage");

            router.push("/checkout");
        } catch (err) {
            console.error("Failed to save profile:", err);
            setError("Failed to save profile. Please try again.");
        } finally {
            setSaving(false);
        }
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

    return (
        <section className="dashboard mb_50 mt_55">
            <div className="container">
                <div className="row justify-content-center">
                    <div className="col-lg-8">
                        <div className="dashboard_content">
                            <h3 className="dashboard_title">Complete Your Profile</h3>
                            <div className="dashboard_content_item">
                                <form onSubmit={handleSubmit} className="address-form">
                                    {error && (
                                        <div className="alert alert-danger" role="alert">
                                            {error}
                                        </div>
                                    )}
                                    <div className="row">
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">Full Name *</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.name}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, name: e.target.value })
                                                }
                                                className="form-control"
                                            />
                                        </div>
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">Phone *</label>
                                            <input
                                                type="tel"
                                                required
                                                value={formData.phone}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, phone: e.target.value })
                                                }
                                                className="form-control"
                                            />
                                        </div>
                                        <div className="col-12 mb-3">
                                            <label className="form-label">Email *</label>
                                            <input
                                                type="email"
                                                required
                                                value={formData.email}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, email: e.target.value })
                                                }
                                                className="form-control"
                                            />
                                        </div>
                                        <div className="col-12 mb-3">
                                            <label className="form-label">Street Address *</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.street}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, street: e.target.value })
                                                }
                                                className="form-control"
                                            />
                                        </div>
                                        <div className="col-md-4 mb-3">
                                            <label className="form-label">City *</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.city}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, city: e.target.value })
                                                }
                                                className="form-control"
                                            />
                                        </div>
                                        <div className="col-md-4 mb-3">
                                            <label className="form-label">State *</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.state}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, state: e.target.value })
                                                }
                                                className="form-control"
                                            />
                                        </div>
                                        <div className="col-md-4 mb-3">
                                            <label className="form-label">Postal Code *</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.postalCode}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, postalCode: e.target.value })
                                                }
                                                className="form-control"
                                            />
                                        </div>
                                    </div>
                                    <div className="d-flex gap-2 mt-3">
                                        <button type="submit" className="common_btn" disabled={saving}>
                                            {saving ? "Saving..." : "Continue to Checkout"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
