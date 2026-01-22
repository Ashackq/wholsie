"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
    const router = useRouter();
    const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        confirmPassword: "",
        firstName: "",
        lastName: "",
        phone: "",
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError("");

        // Validation
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(`${API}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    phone: formData.phone,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Registration failed");
            }

            // Store user info and token
            localStorage.setItem("user", JSON.stringify(data.user));
            if (data.token) {
                localStorage.setItem("authToken", data.token);
            }

            // Redirect to home
            router.push("/");
            router.refresh();
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Page Banner */}
            <section className="page_banner" style={{ background: "url(/assets/images/banners.jpg)" }}>
                <div className="page_banner_overlay">
                    <div className="container">
                        <div className="row">
                            <div className="col-12">
                                <div className="page_banner_text wow fadeInUp">
                                    <h1>Sign Up</h1>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="sign_in mt_50 mb_50">
                <div className="container">
                    <div className="row justify-content-center">
                        <div className="col-xxl-3 col-lg-4 col-xl-4 d-none d-lg-block wow fadeInLeft">
                            <div className="sign_in_img">
                                <img src="/assets/images/signinnew.jpg" alt="Sign Up" className="img-fluid w-100" />
                            </div>
                        </div>
                        <div className="col-xxl-4 col-lg-6 col-xl-5 col-md-10 wow fadeInRight">
                            <div className="sign_in_form">
                                <h3>Create your account</h3>
                                <p style={{ marginTop: 8, marginBottom: 16 }}>
                                    Already have an account? <Link href="/login">Sign in</Link>
                                </p>
                                <form onSubmit={handleSubmit}>
                                    {error && (
                                        <div className="alert alert-danger" role="alert">
                                            {error}
                                        </div>
                                    )}

                                    <div className="row">
                                        <div className="col-md-6">
                                            <div className="single_input">
                                                <label htmlFor="firstName">First name</label>
                                                <input
                                                    id="firstName"
                                                    name="firstName"
                                                    type="text"
                                                    required
                                                    value={formData.firstName}
                                                    onChange={handleChange}
                                                />
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="single_input">
                                                <label htmlFor="lastName">Last name</label>
                                                <input
                                                    id="lastName"
                                                    name="lastName"
                                                    type="text"
                                                    required
                                                    value={formData.lastName}
                                                    onChange={handleChange}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="single_input">
                                        <label htmlFor="email">Email address</label>
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            required
                                            value={formData.email}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="single_input">
                                        <label htmlFor="phone">Phone number</label>
                                        <input
                                            id="phone"
                                            name="phone"
                                            type="tel"
                                            required
                                            value={formData.phone}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="single_input">
                                        <label htmlFor="password">Password</label>
                                        <input
                                            id="password"
                                            name="password"
                                            type="password"
                                            autoComplete="new-password"
                                            required
                                            value={formData.password}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="single_input">
                                        <label htmlFor="confirmPassword">Confirm password</label>
                                        <input
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            type="password"
                                            autoComplete="new-password"
                                            required
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <button type="submit" disabled={loading} className="common_btn w-100">
                                        {loading ? "Creating account..." : "Create account"}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}

