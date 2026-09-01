"use client";

import { useState, FormEvent, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { addToCart, getCurrentUser } from "@/lib/api";
import { clearGuestCart, getGuestCart } from "@/lib/guest-cart";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

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
  alert(message);
};

// ── Shared OTP box component ──────────────────────────────────────────────────
function OtpBoxes({
  otp,
  onChange,
  onKeyDown,
  onPaste,
  refs,
}: {
  otp: string;
  onChange: (i: number, v: string) => void;
  onKeyDown: (i: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  refs: React.MutableRefObject<(HTMLInputElement | null)[]>;
}) {
  return (
    <div style={{ display: "flex", gap: "10px", justifyContent: "center", margin: "16px 0 20px" }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={otp[i] || ""}
          onChange={(e) => onChange(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={onPaste}
          autoComplete="off"
          style={{
            width: "50px", height: "50px", fontSize: "22px", fontWeight: "bold",
            textAlign: "center", border: "2px solid #e5e7eb", borderRadius: "8px",
            padding: 0, boxSizing: "border-box", color: "#111827",
            transition: "all 0.2s", outline: "none",
          }}
          onFocus={(e) => { e.target.style.borderColor = "var(--primary)"; e.target.style.boxShadow = "0 0 0 3px rgba(240,95,34,0.12)"; }}
          onBlur={(e) => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; }}
        />
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter();

  // Tab state: "signin" or "signup"
  const [tab, setTab] = useState<"signin" | "signup">("signin");

  // Shared state
  const [step, setStep] = useState<"form" | "otp">("form");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [agree, setAgree] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Sign In fields
  const [siPhone, setSiPhone] = useState("");

  // Sign Up fields
  const [suName, setSuName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPhone, setSuPhone] = useState("");

  // ── OTP helpers ─────────────────────────────────────────────────────────────
  const handleOtpChange = (i: number, v: string) => {
    const c = v.replace(/[^0-9]/g, "");
    const arr = otp.split("");
    arr[i] = c.slice(-1);
    setOtp(arr.join(""));
    if (c && i < 5) setTimeout(() => otpRefs.current[i + 1]?.focus(), 0);
  };

  const handleOtpKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 6);
    if (pasted) {
      setOtp(pasted);
      setTimeout(() => otpRefs.current[Math.min(pasted.length, 5)]?.focus(), 0);
    }
  };

  // ── Reset everything when switching tabs ──────────────────────────────────
  const switchTab = (t: "signin" | "signup") => {
    setTab(t);
    setStep("form");
    setOtp("");
    setError("");
    setDevOtp("");
    setAgree(false);
  };

  // ── Request OTP ───────────────────────────────────────────────────────────
  const handleRequestOtp = async (phone: string, extra?: { name: string; email: string }) => {
    if (!agree) {
      showToast("Please agree to the Terms of Service & Privacy Policy.", "warning");
      return;
    }
    if (!/^\d{10}$/.test(phone)) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (extra) {
      if (!extra.name.trim()) { setError("Please enter your full name."); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(extra.email.trim())) {
        setError("Please enter a valid email address.");
        return;
      }
    }

    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");

      if (data.otp) {
        setDevOtp(data.otp);
        console.log("Dev OTP:", data.otp);
      }
      setOtp("");
      setStep("otp");
      showToast("OTP sent to your mobile number", "success");
      setTimeout(() => otpRefs.current[0]?.focus(), 150);
    } catch (err: any) {
      setError(err.message || "Failed to send OTP. Please try again.");
      showToast(err.message || "Failed to send OTP", "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Verify OTP & login ────────────────────────────────────────────────────
  const handleVerifyOtp = async (phone: string, extraBody?: Record<string, string>) => {
    if (!/^\d{6}$/.test(otp)) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone, otp, rememberMe, ...extraBody }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid OTP");

      localStorage.setItem("user", JSON.stringify(data.user));
      if (data.token) localStorage.setItem("authToken", data.token);

      // Merge guest cart
      const guestCart = getGuestCart();
      if (guestCart.items.length > 0) {
        await Promise.all(guestCart.items.map((item) =>
          addToCart(item.productId, item.quantity, item.variantId)));
        clearGuestCart();
      }
      try {
        const currentUser = await getCurrentUser();
        const u = (currentUser.data || currentUser) as any;
        if (u) localStorage.setItem("user", JSON.stringify(u));
      } catch { /* ignore */ }

      showToast("Login successful!", "success");
      if (data?.user?.role === "admin") {
        router.push("/admin");
      } else {
        const redirect = localStorage.getItem("postLoginRedirect");
        if (redirect) { localStorage.removeItem("postLoginRedirect"); router.push(redirect); }
        else router.push("/profile");
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An error occurred");
      showToast(err.message || "Invalid OTP", "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Form submit handlers ───────────────────────────────────────────────────
  const onSignInRequest = (e: FormEvent) => {
    e.preventDefault();
    handleRequestOtp(siPhone);
  };

  const onSignUpRequest = (e: FormEvent) => {
    e.preventDefault();
    handleRequestOtp(suPhone, { name: suName, email: suEmail });
  };

  const onSignInVerify = (e: FormEvent) => {
    e.preventDefault();
    handleVerifyOtp(siPhone, { mode: "signin" });
  };

  const onSignUpVerify = (e: FormEvent) => {
    e.preventDefault();
    handleVerifyOtp(suPhone, { name: suName.trim(), email: suEmail.trim(), mode: "signup" });
  };

  // ── Styles ────────────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 14px", border: "1.5px solid #e5e7eb",
    borderRadius: "8px", fontSize: "14px", color: "#1f2937",
    outline: "none", boxSizing: "border-box", transition: "border-color 0.2s",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "13px", fontWeight: 600,
    color: "#374151", marginBottom: "6px",
  };

  const activeTabStyle: React.CSSProperties = {
    flex: 1, padding: "11px 0", border: "none", borderRadius: "8px",
    background: "var(--primary)", color: "#fff",
    fontWeight: 700, fontSize: "15px", cursor: "pointer", transition: "all 0.2s",
  };

  const inactiveTabStyle: React.CSSProperties = {
    ...activeTabStyle,
    background: "transparent", color: "#6b7280", fontWeight: 600,
  };

  const currentPhone = tab === "signin" ? siPhone : suPhone;
  const onResend = () => {
    const extra = tab === "signup" ? { name: suName, email: suEmail } : undefined;
    handleRequestOtp(currentPhone, extra);
  };

  return (
    <>
      {/* Page Banner */}
      <section className="page_banner" style={{ background: "url(/assets/images/bannerOther.jpg)" }}>
        <div className="page_banner_overlay">
          <div className="container">
            <div className="row">
              <div className="col-12">
                <div className="page_banner_text wow fadeInUp">
                  <h1>Login / Register</h1>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="sign_in mt_50 mb_50">
        <div className="container">
          <div className="row justify-content-center">
            {/* Decorative image */}
            <div className="col-xxl-3 col-lg-4 col-xl-4 d-none d-lg-block wow fadeInLeft">
              <div className="sign_in_img">
                <img src="/assets/images/signinnew.jpg" alt="Sign In" className="img-fluid w-100" />
              </div>
            </div>

            {/* Auth card */}
            <div className="col-xxl-4 col-lg-6 col-xl-5 col-md-10 wow fadeInRight">
              <div className="sign_in_form">

                {/* ── Tab Switcher ─────────────────────────────────────── */}
                {step === "form" && (
                  <div style={{
                    display: "flex", background: "#f3f4f6", borderRadius: "10px",
                    padding: "4px", marginBottom: "28px",
                  }}>
                    <button
                      type="button"
                      style={tab === "signin" ? activeTabStyle : inactiveTabStyle}
                      onClick={() => switchTab("signin")}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      style={tab === "signup" ? activeTabStyle : inactiveTabStyle}
                      onClick={() => switchTab("signup")}
                    >
                      Sign Up
                    </button>
                  </div>
                )}

                {/* ── OTP Step Header ────────────────────────────────── */}
                {step === "otp" && (
                  <div style={{ marginBottom: "20px" }}>
                    <h4 style={{ margin: "0 0 6px", fontSize: "18px", fontWeight: 700, color: "#1f2937" }}>
                      Verify Your Number 📲
                    </h4>
                    <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
                      Enter the 6-digit code sent to{" "}
                      <strong style={{ color: "#1f2937" }}>+91 {currentPhone}</strong>
                      <button
                        type="button"
                        onClick={() => { setStep("form"); setOtp(""); setError(""); setDevOtp(""); }}
                        style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "13px", cursor: "pointer", marginLeft: "8px", padding: 0 }}
                      >
                        Change
                      </button>
                    </p>
                  </div>
                )}

                {/* Error banner */}
                {error && (
                  <div style={{
                    padding: "10px 14px", marginBottom: "16px", background: "#fef2f2",
                    border: "1px solid #fecaca", borderRadius: "8px", color: "#b91c1c",
                    fontSize: "13px", display: "flex", alignItems: "center", gap: "8px",
                  }}>
                    <i className="fas fa-exclamation-circle" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Dev OTP banner */}
                {devOtp && step === "otp" && (
                  <div style={{
                    padding: "8px 14px", marginBottom: "14px", background: "#eff6ff",
                    border: "1px solid #bfdbfe", borderRadius: "8px", color: "#1e40af",
                    fontSize: "13px", display: "flex", alignItems: "center", gap: "8px",
                  }}>
                    <i className="fas fa-info-circle" />
                    <span>Dev OTP: <strong>{devOtp}</strong></span>
                  </div>
                )}

                {/* ════════════════════════════════════════════════════════
                    SIGN IN — Form step
                ════════════════════════════════════════════════════════ */}
                {tab === "signin" && step === "form" && (
                  <form onSubmit={onSignInRequest}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      <div>
                        <label style={labelStyle} htmlFor="si-phone">
                          Mobile Number <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <div style={{ display: "flex" }}>
                          <span style={{
                            display: "flex", alignItems: "center", padding: "0 12px",
                            background: "#f9fafb", border: "1.5px solid #e5e7eb",
                            borderRight: "none", borderRadius: "8px 0 0 8px",
                            fontSize: "14px", color: "#6b7280", fontWeight: 600, whiteSpace: "nowrap",
                          }}>+91</span>
                          <input
                            id="si-phone" type="tel" maxLength={10}
                            placeholder="10-digit mobile number"
                            value={siPhone}
                            onChange={(e) => { setSiPhone(e.target.value.replace(/[^0-9]/g, "")); setError(""); }}
                            style={{ ...inputStyle, borderRadius: "0 8px 8px 0" }}
                          />
                        </div>
                      </div>

                      {/* Agree & Remember */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "13px", color: "#6b7280", cursor: "pointer" }}>
                          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ marginTop: "2px", accentColor: "var(--primary)", flexShrink: 0 }} />
                          I agree to the{" "}
                          <Link href="/terms-conditions" style={{ color: "var(--primary)" }}>Terms of Service</Link>
                          {" & "}
                          <Link href="/privacy-policy" style={{ color: "var(--primary)" }}>Privacy Policy</Link>
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#6b7280", cursor: "pointer" }}>
                          <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} style={{ accentColor: "var(--primary)" }} />
                          Keep me logged in
                        </label>
                      </div>

                      <button type="submit" className="common_btn" disabled={loading} style={{ width: "100%", textAlign: "center" }}>
                        {loading ? "Sending OTP..." : "Send OTP"} <i className="fas fa-long-arrow-right" />
                      </button>

                      <p style={{ textAlign: "center", fontSize: "13px", color: "#6b7280", margin: 0 }}>
                        Don&apos;t have an account?{" "}
                        <button type="button" onClick={() => switchTab("signup")} style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 600, cursor: "pointer", padding: 0 }}>
                          Sign Up
                        </button>
                      </p>
                    </div>
                  </form>
                )}

                {/* ════════════════════════════════════════════════════════
                    SIGN UP — Form step
                ════════════════════════════════════════════════════════ */}
                {tab === "signup" && step === "form" && (
                  <form onSubmit={onSignUpRequest}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      <div>
                        <label style={labelStyle} htmlFor="su-name">
                          Full Name <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <input
                          id="su-name" type="text" placeholder="e.g. Rahul Sharma"
                          value={suName}
                          onChange={(e) => { setSuName(e.target.value); setError(""); }}
                          style={inputStyle}
                        />
                      </div>

                      <div>
                        <label style={labelStyle} htmlFor="su-email">
                          Email Address <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <input
                          id="su-email" type="email" placeholder="e.g. rahul@example.com"
                          value={suEmail}
                          onChange={(e) => { setSuEmail(e.target.value); setError(""); }}
                          style={inputStyle}
                        />
                      </div>

                      <div>
                        <label style={labelStyle} htmlFor="su-phone">
                          Mobile Number <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <div style={{ display: "flex" }}>
                          <span style={{
                            display: "flex", alignItems: "center", padding: "0 12px",
                            background: "#f9fafb", border: "1.5px solid #e5e7eb",
                            borderRight: "none", borderRadius: "8px 0 0 8px",
                            fontSize: "14px", color: "#6b7280", fontWeight: 600, whiteSpace: "nowrap",
                          }}>+91</span>
                          <input
                            id="su-phone" type="tel" maxLength={10}
                            placeholder="10-digit mobile number"
                            value={suPhone}
                            onChange={(e) => { setSuPhone(e.target.value.replace(/[^0-9]/g, "")); setError(""); }}
                            style={{ ...inputStyle, borderRadius: "0 8px 8px 0" }}
                          />
                        </div>
                      </div>

                      {/* Agree & Remember */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "13px", color: "#6b7280", cursor: "pointer" }}>
                          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ marginTop: "2px", accentColor: "var(--primary)", flexShrink: 0 }} />
                          I agree to the{" "}
                          <Link href="/terms-conditions" style={{ color: "var(--primary)" }}>Terms of Service</Link>
                          {" & "}
                          <Link href="/privacy-policy" style={{ color: "var(--primary)" }}>Privacy Policy</Link>
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#6b7280", cursor: "pointer" }}>
                          <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} style={{ accentColor: "var(--primary)" }} />
                          Keep me logged in
                        </label>
                      </div>

                      <button type="submit" className="common_btn" disabled={loading} style={{ width: "100%", textAlign: "center" }}>
                        {loading ? "Sending OTP..." : "Send OTP & Continue"} <i className="fas fa-long-arrow-right" />
                      </button>

                      <p style={{ textAlign: "center", fontSize: "13px", color: "#6b7280", margin: 0 }}>
                        Already have an account?{" "}
                        <button type="button" onClick={() => switchTab("signin")} style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 600, cursor: "pointer", padding: 0 }}>
                          Sign In
                        </button>
                      </p>
                    </div>
                  </form>
                )}

                {/* ════════════════════════════════════════════════════════
                    OTP VERIFICATION — shared for both tabs
                ════════════════════════════════════════════════════════ */}
                {step === "otp" && (
                  <form onSubmit={tab === "signin" ? onSignInVerify : onSignUpVerify}>
                    <label style={labelStyle}>Enter 6-Digit OTP</label>
                    <OtpBoxes
                      otp={otp}
                      onChange={handleOtpChange}
                      onKeyDown={handleOtpKeyDown}
                      onPaste={handleOtpPaste}
                      refs={otpRefs}
                    />

                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#6b7280", cursor: "pointer", marginBottom: "16px" }}>
                      <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} style={{ accentColor: "var(--primary)" }} />
                      Keep me logged in
                    </label>

                    <button type="submit" className="common_btn" disabled={loading} style={{ width: "100%", textAlign: "center", marginBottom: "12px" }}>
                      {loading ? "Verifying..." : "Verify & Login"} <i className="fas fa-long-arrow-right" />
                    </button>

                    <p style={{ textAlign: "center", fontSize: "13px", color: "#6b7280", margin: 0 }}>
                      Didn&apos;t receive it?{" "}
                      <button
                        type="button" onClick={onResend} disabled={loading}
                        style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 600, cursor: "pointer", padding: 0 }}
                      >
                        Resend OTP
                      </button>
                    </p>
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
