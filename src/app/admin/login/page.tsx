"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
    const router = useRouter();
    const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch(`${API}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Login failed");
            }

            if (data?.user?.role !== "admin") {
                throw new Error("Admin access required");
            }

            localStorage.setItem("user", JSON.stringify(data.user));
            if (data.token) {
                localStorage.setItem("authToken", data.token);
            }

            router.push("/admin");
            router.refresh();
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#f8fafc",
                padding: "24px",
            }}
        >
            <div
                style={{
                    width: "100%",
                    maxWidth: 420,
                    background: "#ffffff",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
                    padding: 24,
                }}
            >
                <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
                    Admin Login
                </h1>
                <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 20 }}>
                    Sign in with your admin credentials.
                </p>

                {error && (
                    <div
                        style={{
                            background: "#fef2f2",
                            border: "1px solid #fecaca",
                            color: "#b91c1c",
                            padding: "10px 12px",
                            borderRadius: 8,
                            marginBottom: 12,
                            fontSize: 13,
                        }}
                    >
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: 12 }}>
                        <label
                            htmlFor="admin-email"
                            style={{ display: "block", fontSize: 13, marginBottom: 6 }}
                        >
                            Email
                        </label>
                        <input
                            id="admin-email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "10px 12px",
                                borderRadius: 8,
                                border: "1px solid #d1d5db",
                                fontSize: 14,
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: 16 }}>
                        <label
                            htmlFor="admin-password"
                            style={{ display: "block", fontSize: 13, marginBottom: 6 }}
                        >
                            Password
                        </label>
                        <input
                            id="admin-password"
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "10px 12px",
                                borderRadius: 8,
                                border: "1px solid #d1d5db",
                                fontSize: 14,
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: "100%",
                            padding: "10px 12px",
                            borderRadius: 8,
                            background: loading ? "#9ca3af" : "#111827",
                            color: "#ffffff",
                            border: "none",
                            fontWeight: 600,
                            cursor: loading ? "not-allowed" : "pointer",
                        }}
                    >
                        {loading ? "Signing in..." : "Sign In"}
                    </button>
                </form>
            </div>
        </div>
    );
}
