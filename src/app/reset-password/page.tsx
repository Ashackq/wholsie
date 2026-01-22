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
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/reset-request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send reset link");
      }

      setMessage("If the email exists, a reset link has been sent");

      // In development, show the token
      if (data.resetToken) {
        setMessage(
          `Reset token: ${data.resetToken} (check console in production)`,
        );
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
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, newPassword }),
        },
      );

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
    <>
      {/* Page Banner */}
      <section
        className="page_banner"
        style={{ background: "url(/assets/images/banners.jpg)" }}
      >
        <div className="page_banner_overlay">
          <div className="container">
            <div className="row">
              <div className="col-12">
                <div className="page_banner_text wow fadeInUp">
                  <h1>
                    {step === "request" ? "Reset Password" : "Set New Password"}
                  </h1>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reset / Set Password UI */}
      <section className="sign_in mt_50 mb_50">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-xxl-3 col-lg-4 col-xl-4 d-none d-lg-block wow fadeInLeft">
              <div className="sign_in_img">
                <img
                  src="/assets/images/signinnew.jpg"
                  alt="Sign In"
                  className="img-fluid w-100"
                />
              </div>
            </div>

            <div className="col-xxl-4 col-lg-6 col-xl-5 col-md-10 wow fadeInRight">
              <div className="sign_in_form">
                <h3>
                  {step === "request"
                    ? "Forgot Password? 🔒"
                    : "New Password 🔑"}
                </h3>
                {step === "request" ? (
                  <form onSubmit={handleRequestReset}>
                    {error && <div className="alert alert-danger">{error}</div>}
                    {message && (
                      <div className="alert alert-success">{message}</div>
                    )}

                    <div className="row">
                      <div className="col-xl-12">
                        <div className="single_input">
                          <label htmlFor="email">Email</label>
                          <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{ padding: "18px 18px 6px" }}
                          />
                        </div>
                      </div>
                      <div className="col-xl-12">
                        <button
                          type="submit"
                          className="common_btn"
                          disabled={loading}
                        >
                          {loading ? "Sending..." : "Send Reset Link"}
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleResetPassword}>
                    {error && <div className="alert alert-danger">{error}</div>}
                    {message && (
                      <div className="alert alert-success">{message}</div>
                    )}

                    <div className="row">
                      <div className="col-xl-12">
                        <div className="single_input">
                          <label htmlFor="newPassword">New Password</label>
                          <input
                            id="newPassword"
                            name="newPassword"
                            type="password"
                            required
                            placeholder="Enter new password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            style={{ padding: "18px 18px 6px" }}
                          />
                        </div>
                      </div>
                      <div className="col-xl-12">
                        <div className="single_input">
                          <label htmlFor="confirmPassword">
                            Confirm Password
                          </label>
                          <input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            required
                            placeholder="Confirm new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            style={{ padding: "18px 18px 6px" }}
                          />
                        </div>
                      </div>
                      <div className="col-xl-12">
                        <button
                          type="submit"
                          className="common_btn"
                          disabled={loading}
                        >
                          {loading ? "Resetting..." : "Reset Password"}
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                <p className="or">
                  <Link href="/login">Back to Login</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="container">
          <p>Loading...</p>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
