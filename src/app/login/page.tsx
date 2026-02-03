"use client";

import { useState, FormEvent, useRef } from "react";
import { useRouter } from "next/navigation";
import { addToCart, getCurrentUser } from "@/lib/api";
import { clearGuestCart, getGuestCart } from "@/lib/guest-cart";

const showToast = (
  message: string,
  type: "success" | "error" | "info" | "warning" = "info",
) => {
  if (typeof window !== "undefined" && (window as any).toastr) {
    const t = (window as any).toastr;
    if (type === "success") return t.success(message);
    if (type === "error") return t.error(message);
    if (type === "warning") return t.warning(message);
    return t.info(message);
  }
  // Fallback
  alert(message);
};

export default function LoginPage() {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [otpStep, setOtpStep] = useState<"request" | "verify">("request");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleOtpChange = (index: number, value: string) => {
    const cleaned = value.replace(/[^0-9]/g, "");
    const newOtp = otp.split("");
    newOtp[index] = cleaned.slice(-1);
    const updatedOtp = newOtp.join("");
    setOtp(updatedOtp);

    // Auto-focus next input
    if (cleaned && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData("text")
      .replace(/[^0-9]/g, "")
      .slice(0, 6);
    if (pastedData.length > 0) {
      setOtp(pastedData);
      // Focus last input or the next empty one
      setTimeout(() => {
        const nextEmptyIndex = Math.min(pastedData.length, 5);
        otpInputRefs.current[nextEmptyIndex]?.focus();
      }, 0);
    }
  };

  const handleRequestOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (!agree) {
      showToast(
        "Please agree to the terms of service & privacy policy.",
        "warning",
      );
      return;
    }
    if (!/^\d{10}$/.test(mobile)) {
      showToast("Please enter a valid 10-digit mobile number.", "error");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API}/auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: mobile }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send OTP");
      }

      showToast("OTP sent to your mobile number", "success");
      setOtpStep("verify");

      // In development, show OTP in console
      if (data.otp) {
        console.log("Dev OTP:", data.otp);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
      showToast(err.message || "Failed to send OTP", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      showToast("Please enter a valid 6-digit OTP.", "error");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: mobile, otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Invalid OTP");
      }

      localStorage.setItem("user", JSON.stringify(data.user));
      if (data.token) {
        localStorage.setItem("authToken", data.token);
      }
      const guestCart = getGuestCart();
      if (guestCart.items.length > 0) {
        await Promise.all(
          guestCart.items.map((item) =>
            addToCart(item.productId, item.quantity, item.variantId),
          ),
        );
        clearGuestCart();
      }
      try {
        const currentUser = await getCurrentUser();
        const resolvedUser = (currentUser.data || currentUser) as any;
        if (resolvedUser) {
          localStorage.setItem("user", JSON.stringify(resolvedUser));
        }
      } catch {
        // Ignore profile fetch failures here
      }
      showToast("Login successful!", "success");

      // Redirect admins to admin dashboard
      if (data?.user?.role === "admin") {
        router.push("/admin");
      } else {
        const redirectTo = localStorage.getItem("postLoginRedirect");
        if (redirectTo) {
          localStorage.removeItem("postLoginRedirect");
          router.push(redirectTo);
        } else {
          router.push("/profile");
        }
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An error occurred");
      showToast(err.message || "Invalid OTP", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Page Banner */}
      <section
        className="page_banner"
        style={{ background: "url(/assets/images/bannerOther.jpg)" }}
      >
        <div className="page_banner_overlay">
          <div className="container">
            <div className="row">
              <div className="col-12">
                <div className="page_banner_text wow fadeInUp">
                  <h1>Login</h1>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sign In / Sign Up UI cloned from legacy */}
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

            {/* Mobile OTP login */}
            <div className="col-xxl-4 col-lg-6 col-xl-5 col-md-10 wow fadeInRight">
              <div className="sign_in_form">
                <h3>Sign In / Sign Up to Continue 👋</h3>

                {/* Step 1: Request OTP */}
                {otpStep === "request" && (
                  <form onSubmit={handleRequestOtp}>
                    {error && (
                      <div className="alert alert-danger" role="alert">
                        {error}
                      </div>
                    )}
                    <div className="row">
                      <div className="col-xl-12">
                        <div className="single_input" id="mobilenumber_div">
                          <label htmlFor="mobilenumber">Mobile Number</label>
                          <input
                            type="tel"
                            id="mobilenumber"
                            name="mobilenumber"
                            maxLength={10}
                            value={mobile}
                            onChange={(e) =>
                              setMobile(e.target.value.replace(/[^0-9]/g, ""))
                            }
                            style={{ padding: "18px 18px 6px" }}
                          />
                        </div>
                      </div>
                      <div className="col-12">
                        <div className="forgot">
                          <div className="form-check">
                            <input
                              type="checkbox"
                              id="ByContinuingYou"
                              className="form-check-input"
                              checked={agree}
                              onChange={(e) => setAgree(e.target.checked)}
                            />
                            <label htmlFor="ByContinuingYou">
                              By continuing, you agree to our Terms of Service
                              & Privacy Policy
                            </label>
                          </div>
                        </div>
                      </div>
                      <div className="col-xl-12">
                        <button
                          type="submit"
                          className="common_btn"
                          disabled={loading}
                        >
                          {loading ? "Sending..." : "Request OTP"}{" "}
                          <i className="fas fa-long-arrow-right" />
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* Step 2: Verify OTP */}
                {otpStep === "verify" && (
                  <form onSubmit={handleVerifyOtp}>
                    {error && (
                      <div className="alert alert-danger" role="alert">
                        {error}
                      </div>
                    )}
                    <div className="row">
                      <div className="col-xl-12 mb-3">
                        <p className="text-muted">
                          Enter the 6-digit OTP sent to{" "}
                          <strong>{mobile}</strong>
                          <button
                            type="button"
                            className="btn btn-link btn-sm"
                            onClick={() => {
                              setOtpStep("request");
                              setOtp("");
                              setError("");
                            }}
                          >
                            Change Number
                          </button>
                        </p>
                      </div>
                      <div className="col-xl-12">
                        <div className="single_input">
                          <label>Enter 6-Digit OTP</label>
                          <div
                            className="otp_input_group"
                            style={{
                              display: "flex",
                              gap: "10px",
                              justifyContent: "center",
                              marginTop: "15px",
                              marginBottom: "20px",
                            }}
                          >
                            {Array.from({ length: 6 }).map((_, index) => (
                              <input
                                key={index}
                                ref={(el) => {
                                  otpInputRefs.current[index] = el;
                                }}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={otp[index] || ""}
                                onChange={(e) =>
                                  handleOtpChange(index, e.target.value)
                                }
                                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                onPaste={handleOtpPaste}
                                autoComplete="off"
                                style={{
                                  width: "50px",
                                  height: "50px",
                                  fontSize: "24px",
                                  fontWeight: "bold",
                                  textAlign: "center",
                                  border: "2px solid #ddd",
                                  borderRadius: "8px",
                                  padding: "0px",
                                  transition: "all 0.2s",
                                }}
                                onFocus={(e) => {
                                  e.target.style.borderColor =
                                    "var(--primary)";
                                  e.target.style.boxShadow =
                                    "0 0 5px rgba(var(--primary-rgb), 0.3)";
                                }}
                                onBlur={(e) => {
                                  e.target.style.borderColor = "#ddd";
                                  e.target.style.boxShadow = "none";
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="col-12 mb-3">
                        <button
                          type="button"
                          className="btn btn-link"
                          onClick={() => {
                            setOtpStep("request");
                            handleRequestOtp({
                              preventDefault: () => { },
                            } as FormEvent);
                          }}
                          disabled={loading}
                        >
                          Resend OTP
                        </button>
                      </div>
                      <div className="col-xl-12">
                        <button
                          type="submit"
                          className="common_btn"
                          disabled={loading}
                        >
                          {loading ? "Verifying..." : "Verify & Login"}{" "}
                          <i className="fas fa-long-arrow-right" />
                        </button>
                      </div>
                    </div>
                  </form>
                )}

              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
