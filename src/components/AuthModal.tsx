"use client";

import { useState, useRef, FormEvent } from "react";
import { addToCart, getCurrentUser } from "@/lib/api";
import { clearGuestCart, getGuestCart } from "@/lib/guest-cart";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

interface AuthModalProps {
  /** Called after successful login + guest-cart merge */
  onSuccess: () => void;
  /** Called when the user dismisses the modal without logging in */
  onClose: () => void;
}

/**
 * AuthModal — inline OTP login modal for checkout (Phase 11).
 *
 * Replicates the exact OTP flow from /login/page.tsx but as a modal overlay:
 *  1. User enters mobile → request OTP
 *  2. User enters 6-digit OTP → verify
 *  3. On success: merge guest cart, store token, call onSuccess()
 *
 * Does NOT redirect — caller owns navigation after onSuccess().
 */
export default function AuthModal({ onSuccess, onClose }: AuthModalProps) {
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"request" | "verify">("request");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ── OTP input helpers ──────────────────────────────────────────────────────

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/[^0-9]/g, "").slice(-1);
    const arr = otp.padEnd(6, " ").split("");
    arr[index] = digit || " ";
    const newOtp = arr.join("").replace(/ /g, "");
    setOtp(newOtp);
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/[^0-9]/g, "")
      .slice(0, 6);
    if (pasted.length > 0) {
      setOtp(pasted);
      setTimeout(() => {
        otpRefs.current[Math.min(pasted.length, 5)]?.focus();
      }, 0);
    }
  };

  // ── Step 1: request OTP ────────────────────────────────────────────────────

  const handleRequestOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (!agree) {
      setError("Please agree to the terms of service & privacy policy.");
      return;
    }
    if (!/^\d{10}$/.test(mobile)) {
      setError("Please enter a valid 10-digit mobile number.");
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
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");
      if (data.otp) console.log("Dev OTP:", data.otp); // dev only
      setStep("verify");
    } catch (err: any) {
      setError(err.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: verify OTP + merge guest cart ──────────────────────────────────

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      setError("Please enter the 6-digit OTP.");
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
      if (!res.ok) throw new Error(data.error || "Invalid OTP");

      // Persist auth
      localStorage.setItem("user", JSON.stringify(data.user));
      if (data.token) localStorage.setItem("authToken", data.token);

      // Merge guest cart → server cart
      const guestCart = getGuestCart();
      if (guestCart.items.length > 0) {
        await Promise.all(
          guestCart.items.map((item) =>
            addToCart(item.productId, item.quantity, item.variantId)
          )
        );
        clearGuestCart();
      }

      // Refresh user profile in cache
      try {
        const profile = await getCurrentUser();
        const u = (profile as any).data || profile;
        if (u) localStorage.setItem("user", JSON.stringify(u));
      } catch {
        // non-fatal
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || "OTP verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          zIndex: 9000,
          backdropFilter: "blur(2px)",
        }}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Sign in to continue"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9001,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: "20px",
            boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
            width: "100%",
            maxWidth: "420px",
            padding: "36px 32px 32px",
            position: "relative",
            pointerEvents: "auto",
            animation: "authModalIn 0.22s ease-out",
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close sign-in modal"
            style={{
              position: "absolute",
              top: "16px",
              right: "18px",
              background: "none",
              border: "none",
              fontSize: "22px",
              color: "#64748b",
              cursor: "pointer",
              lineHeight: 1,
              padding: "4px",
            }}
          >
            ×
          </button>

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #ff6b35 0%, #f7c59f 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 14px",
              }}
            >
              <i
                className="fas fa-lock"
                style={{ color: "#fff", fontSize: "20px" }}
                aria-hidden="true"
              />
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: "22px",
                fontWeight: 700,
                color: "#0f172a",
              }}
            >
              {step === "request" ? "Sign in to continue" : "Enter OTP"}
            </h2>
            <p
              style={{
                margin: "6px 0 0",
                fontSize: "14px",
                color: "#64748b",
              }}
            >
              {step === "request"
                ? "Please sign in to place your order"
                : `OTP sent to +91 ${mobile}`}
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div
              role="alert"
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                padding: "10px 14px",
                marginBottom: "16px",
                fontSize: "13px",
                color: "#dc2626",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <i className="fas fa-exclamation-circle" aria-hidden="true" />
              {error}
            </div>
          )}

          {/* ── Step 1: phone entry ── */}
          {step === "request" && (
            <form onSubmit={handleRequestOtp}>
              <div style={{ marginBottom: "16px" }}>
                <label
                  htmlFor="auth-modal-mobile"
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: "6px",
                  }}
                >
                  Mobile Number
                </label>
                <div
                  style={{
                    display: "flex",
                    border: "1.5px solid #e2e8f0",
                    borderRadius: "10px",
                    overflow: "hidden",
                    transition: "border-color 0.2s",
                  }}
                >
                  <span
                    style={{
                      padding: "12px 14px",
                      background: "#f8fafc",
                      color: "#64748b",
                      fontSize: "14px",
                      fontWeight: 600,
                      borderRight: "1px solid #e2e8f0",
                      userSelect: "none",
                    }}
                  >
                    +91
                  </span>
                  <input
                    id="auth-modal-mobile"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={mobile}
                    onChange={(e) =>
                      setMobile(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))
                    }
                    placeholder="10-digit mobile number"
                    required
                    style={{
                      flex: 1,
                      border: "none",
                      outline: "none",
                      padding: "12px 14px",
                      fontSize: "15px",
                      background: "transparent",
                    }}
                  />
                </div>
              </div>

              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  fontSize: "12px",
                  color: "#64748b",
                  cursor: "pointer",
                  marginBottom: "20px",
                  lineHeight: 1.5,
                }}
              >
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  style={{ marginTop: "2px", flexShrink: 0 }}
                />
                I agree to the{" "}
                <a
                  href="/terms"
                  target="_blank"
                  style={{ color: "var(--primary)" }}
                >
                  Terms of Service
                </a>{" "}
                &amp;{" "}
                <a
                  href="/privacy"
                  target="_blank"
                  style={{ color: "var(--primary)" }}
                >
                  Privacy Policy
                </a>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="common_btn"
                style={{
                  width: "100%",
                  border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                  fontSize: "15px",
                  padding: "14px",
                }}
              >
                {loading ? "Sending OTP…" : "Get OTP"}
              </button>
            </form>
          )}

          {/* ── Step 2: OTP entry ── */}
          {step === "verify" && (
            <form onSubmit={handleVerifyOtp}>
              <div style={{ marginBottom: "24px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: "12px",
                    textAlign: "center",
                  }}
                >
                  Enter 6-digit OTP
                </label>
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    justifyContent: "center",
                  }}
                >
                  {[0, 1, 2, 3, 4, 5].map((idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        otpRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={otp[idx] || ""}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      onPaste={handleOtpPaste}
                      style={{
                        width: "46px",
                        height: "52px",
                        border: otp[idx]
                          ? "2px solid var(--primary)"
                          : "1.5px solid #e2e8f0",
                        borderRadius: "10px",
                        textAlign: "center",
                        fontSize: "20px",
                        fontWeight: 700,
                        outline: "none",
                        transition: "border-color 0.15s",
                        background: otp[idx] ? "#fff8f5" : "#fff",
                      }}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="common_btn"
                style={{
                  width: "100%",
                  border: "none",
                  cursor: loading || otp.length < 6 ? "not-allowed" : "pointer",
                  opacity: loading || otp.length < 6 ? 0.7 : 1,
                  fontSize: "15px",
                  padding: "14px",
                  marginBottom: "12px",
                }}
              >
                {loading ? "Verifying…" : "Verify & Continue"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep("request");
                  setOtp("");
                  setError("");
                }}
                style={{
                  width: "100%",
                  background: "none",
                  border: "none",
                  color: "var(--primary)",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 600,
                  padding: "6px",
                }}
              >
                ← Change number
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Keyframe animation injected inline */}
      <style>{`
        @keyframes authModalIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </>
  );
}
