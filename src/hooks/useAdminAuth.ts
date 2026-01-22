"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function useAdminAuth() {
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

    useEffect(() => {
        async function checkAdmin() {
            try {
                const res = await fetch(`${API}/admin/check`, {
                    credentials: "include",
                });

                if (!res.ok) {
                    setError("Admin access required");
                    setIsAdmin(false);
                    // Redirect to login after a short delay
                    setTimeout(() => router.push("/login"), 1000);
                } else {
                    const data = await res.json();
                    setIsAdmin(data.isAdmin);
                    setError(null);
                }
            } catch (e: any) {
                setError(e?.message || "Failed to verify admin access");
                setIsAdmin(false);
            } finally {
                setLoading(false);
            }
        }

        checkAdmin();
    }, [API, router]);

    return { isAdmin, loading, error };
}
