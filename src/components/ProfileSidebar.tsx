"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { logout } from "@/lib/api";

interface User {
    name?: string;
    email?: string;
    phone?: string;
}

export default function ProfileSidebar({ user }: { user: User | null }) {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await logout();
            localStorage.removeItem("user");
            router.push("/");
        } catch (err) {
            console.error("Logout failed:", err);
        }
    };

    const isActive = (path: string) => pathname === path;

    return (
        <div className="dashboard_sidebar">
            <div className="dashboard_sidebar_area">
                <div className="dashboard_sidebar_user">
                    <div className="img">
                        <img
                            src="/assets/images/user_icon_black.svg"
                            alt="profile"
                            className="img-fluid w-100"
                            style={{ padding: "20px", background: "#f8f9fa", borderRadius: "50%" }}
                        />
                    </div>
                    <h3 style={{ marginTop: "15px", marginBottom: "5px" }}>
                        {user?.name || "User"}
                    </h3>
                    {user?.email && <p style={{ marginBottom: "5px", color: "#666" }}>{user.email}</p>}
                    {user?.phone && <p style={{ color: "#666" }}>{user.phone}</p>}
                </div>
                <div className="dashboard_sidebar_menu">
                    <ul>
                        <li>
                            <p style={{ textTransform: "uppercase", fontSize: "12px", color: "#999", fontWeight: "bold", marginBottom: "10px" }}>
                                Dashboard
                            </p>
                        </li>
                        <li>
                            <Link
                                href="/profile"
                                className={isActive("/profile") ? "active" : ""}
                            >
                                <span>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: "20px", height: "20px" }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                                    </svg>
                                </span>
                                Overview
                            </Link>
                        </li>
                        <li>
                            <Link
                                href="/orders"
                                className={isActive("/orders") || pathname?.startsWith("/orders/") ? "active" : ""}
                            >
                                <span>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: "20px", height: "20px" }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                                    </svg>
                                </span>
                                Orders
                            </Link>
                        </li>
                        <li>
                            <p style={{ textTransform: "uppercase", fontSize: "12px", color: "#999", fontWeight: "bold", marginTop: "20px", marginBottom: "10px" }}>
                                Account Settings
                            </p>
                        </li>
                        <li>
                            <Link
                                href="/profile/addresses"
                                className={isActive("/profile/addresses") ? "active" : ""}
                            >
                                <span>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: "20px", height: "20px" }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                                    </svg>
                                </span>
                                Addresses
                            </Link>
                        </li>
                    </ul>
                    <div style={{
                        marginTop: "auto",
                        paddingTop: "20px",
                        paddingBottom: "20px",
                        borderTop: "1px solid #e0e0e0",
                        borderBottom: "1px solid #e0e0e0"
                    }}>
                        <button
                            onClick={handleLogout}
                            style={{
                                background: "none",
                                border: "none",
                                padding: "10px 15px",
                                width: "100%",
                                cursor: "pointer",
                                color: "#dc3545",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "10px"
                            }}
                        >
                            <span style={{ display: "flex", alignItems: "center" }}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: "20px", height: "20px" }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
                                </svg>
                            </span>
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
