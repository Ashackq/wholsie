"use client";

import { useState, FormEvent, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPasswordContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [email, setEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<"request" | "reset">("request");

    useEffect(() => {
        if (token) {
            setStep("reset");
        }
    }, [token]);

    const handleRequestReset = async (e: FormEvent) => {
        e.preventDefault();
        setError("");
        setMessage("");
        setLoading(true);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/reset-request`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to send reset link");
            }

            setMessage("If the email exists, a reset link has been sent");

            // In development, show the token
            if (data.resetToken) {
                setMessage(`Reset token: ${data.resetToken} (check console in production)`);
            }
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: FormEvent) => {
        e.preventDefault();
        setError("");
        setMessage("");

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, newPassword }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to reset password");
            }

            setMessage("Password reset successful! You can now login.");
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        {step === "request" ? "Reset your password" : "Set new password"}
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Or{" "}
                        <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                            return to login
                        </Link>
                    </p>
                </div>

                {step === "request" ? (
                    <form className="mt-8 space-y-6" onSubmit={handleRequestReset}>
                        {error && (
                            <div className="rounded-md bg-red-50 p-4">
                                <p className="text-sm text-red-800">{error}</p>
                            </div>
                        )}
                        {message && (
                            <div className="rounded-md bg-green-50 p-4">
                                <p className="text-sm text-green-800">{message}</p>
                            </div>
                        )}
                        <div>
                            <label htmlFor="email" className="sr-only">
                                Email address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                placeholder="Email address"
                            />
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? "Sending..." : "Send reset link"}
                            </button>
                        </div>
                    </form>
                ) : (
                    <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
                        {error && (
                            <div className="rounded-md bg-red-50 p-4">
                                <p className="text-sm text-red-800">{error}</p>
                            </div>
                        )}
                        {message && (
                            <div className="rounded-md bg-green-50 p-4">
                                <p className="text-sm text-green-800">{message}</p>
                            </div>
                        )}
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="newPassword" className="sr-only">
                                    New password
                                </label>
                                <input
                                    id="newPassword"
                                    name="newPassword"
                                    type="password"
                                    required
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    placeholder="New password (min 6 characters)"
                                />
                            </div>
                            <div>
                                <label htmlFor="confirmPassword" className="sr-only">
                                    Confirm password
                                </label>
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    placeholder="Confirm new password"
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? "Resetting..." : "Reset password"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="container"><p>Loading...</p></div>}>
            <ResetPasswordContent />
        </Suspense>
    );
}

