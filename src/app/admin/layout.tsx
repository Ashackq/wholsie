"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/lib/api";
import "../../app/globals.css";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await logout();
            localStorage.removeItem("user");
            localStorage.removeItem("authToken");
            sessionStorage.clear();
            router.push("/");
        } catch (err) {
            console.error("Logout failed:", err);
        }
    };

    const menuItems = [
        { href: "/admin", label: "Dashboard", icon: "fas fa-tachometer-alt" },
        { href: "/admin/products", label: "Products", icon: "fas fa-box" },
        { href: "/admin/categories", label: "Categories", icon: "fas fa-folder" },
        { href: "/admin/orders", label: "Orders", icon: "fas fa-shopping-bag" },
        { href: "/admin/settings", label: "Settings", icon: "fas fa-cog" },
    ];

    return (
        <div className="admin-layout">
            <aside className="admin-sidebar">
                <div className="admin-sidebar-header">
                    <h2>
                        <i className="fas fa-shield-alt"></i>
                        Admin Panel
                    </h2>
                </div>
                <nav className="admin-nav">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`admin-nav-item ${isActive ? "active" : ""}`}
                            >
                                <i className={item.icon}></i>
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                    <div className="admin-nav-divider"></div>
                    <Link href="/" className="admin-nav-item">
                        <i className="fas fa-home"></i>
                        <span>Back to Site</span>
                    </Link>
                    <div style={{ marginTop: 'auto' }}>
                        <div className="admin-nav-divider"></div>
                        <button
                            className="admin-nav-item admin-nav-logout"
                            onClick={handleLogout}
                        >
                            <i className="fas fa-sign-out-alt"></i>
                            <span>Logout</span>
                        </button>
                    </div>
                </nav>
            </aside>
            <main className="admin-main">
                <div className="admin-content">
                    {children}
                </div>
            </main>
        </div>
    );
}
