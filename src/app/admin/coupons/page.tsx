"use client";
import { useEffect, useState, useCallback } from "react";
import { useAdminAuth } from "../../../hooks/useAdminAuth";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Coupon {
  _id: string;
  code: string;
  description?: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  maxDiscount?: number;
  minPurchaseAmount?: number;
  usageLimit?: number;
  usagePerUser?: number;
  usageCount?: number;
  applicableProducts?: any[];
  applicableCategories?: any[];
  excludedProducts?: any[];
  validFrom: string;
  validTo: string;
  isActive: boolean;
  cannotCombineWithOffers?: boolean;
  createdAt?: string;
}

const emptyForm = (): any => ({
  code: "",
  description: "",
  discountType: "percentage",
  discountValue: "",
  maxDiscount: "",
  minPurchaseAmount: "",
  usageLimit: "",
  usagePerUser: "1",
  applicableProducts: "",
  applicableCategories: "",
  excludedProducts: "",
  validFrom: "",
  validTo: "",
  isActive: true,
  cannotCombineWithOffers: true,
});

function authHeader(): HeadersInit {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("authToken") || sessionStorage.getItem("authToken")
      : null;
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminCouponsPage() {
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await fetch(`${API}/admin/coupons${params}`, { headers: authHeader() });
      const json = await res.json();
      setCoupons(json.data || []);
    } catch {
      setError("Failed to load coupons");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { if (isAdmin) fetchCoupons(); }, [isAdmin, fetchCoupons]);

  function flashSuccess(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  }

  function openCreate() {
    setForm(emptyForm());
    setModalMode("create");
    setEditingId(null);
    setShowModal(true);
    setError(null);
  }

  function openEdit(coupon: Coupon) {
    setForm({
      code: coupon.code,
      description: coupon.description || "",
      discountType: coupon.discountType,
      discountValue: coupon.discountValue ?? "",
      maxDiscount: coupon.maxDiscount ?? "",
      minPurchaseAmount: coupon.minPurchaseAmount ?? "",
      usageLimit: coupon.usageLimit ?? "",
      usagePerUser: coupon.usagePerUser ?? "1",
      applicableProducts: (coupon.applicableProducts || []).map((p: any) => p._id || p).join(", "),
      applicableCategories: (coupon.applicableCategories || []).map((c: any) => c._id || c).join(", "),
      excludedProducts: (coupon.excludedProducts || []).map((p: any) => p._id || p).join(", "),
      validFrom: coupon.validFrom ? coupon.validFrom.slice(0, 10) : "",
      validTo: coupon.validTo ? coupon.validTo.slice(0, 10) : "",
      isActive: coupon.isActive,
      cannotCombineWithOffers: coupon.cannotCombineWithOffers !== false,
    });
    setModalMode("edit");
    setEditingId(coupon._id);
    setShowModal(true);
    setError(null);
  }

  function buildPayload(f: any) {
    return {
      code: f.code.trim().toUpperCase(),
      description: f.description || undefined,
      discountType: f.discountType,
      discountValue: Number(f.discountValue),
      maxDiscount: f.maxDiscount ? Number(f.maxDiscount) : undefined,
      minPurchaseAmount: f.minPurchaseAmount ? Number(f.minPurchaseAmount) : 0,
      usageLimit: f.usageLimit ? Number(f.usageLimit) : undefined,
      usagePerUser: Number(f.usagePerUser) || 1,
      applicableProducts: f.applicableProducts ? f.applicableProducts.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
      applicableCategories: f.applicableCategories ? f.applicableCategories.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
      excludedProducts: f.excludedProducts ? f.excludedProducts.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
      validFrom: f.validFrom,
      validTo: f.validTo,
      isActive: f.isActive,
      cannotCombineWithOffers: f.cannotCombineWithOffers,
    };
  }

  async function handleSave() {
    if (!form.code.trim()) return setError("Coupon code is required.");
    if (!form.discountValue) return setError("Discount value is required.");
    if (!form.validFrom || !form.validTo) return setError("Valid From and Valid To are required.");
    setSaving(true);
    setError(null);
    try {
      const payload = buildPayload(form);
      const url = modalMode === "create"
        ? `${API}/admin/coupons`
        : `${API}/admin/coupons/${editingId}`;
      const method = modalMode === "create" ? "POST" : "PUT";
      const res = await fetch(url, { method, headers: authHeader(), body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) return setError(json.error || "Save failed");
      flashSuccess(json.message || "Saved");
      setShowModal(false);
      fetchCoupons();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(coupon: Coupon) {
    try {
      await fetch(`${API}/admin/coupons/${coupon._id}/toggle-active`, { method: "PATCH", headers: authHeader() });
      fetchCoupons();
    } catch { /* noop */ }
  }

  async function handleDelete(coupon: Coupon) {
    if (!confirm(`Delete coupon "${coupon.code}"? This cannot be undone.`)) return;
    try {
      await fetch(`${API}/admin/coupons/${coupon._id}`, { method: "DELETE", headers: authHeader() });
      flashSuccess("Coupon deleted");
      fetchCoupons();
    } catch { /* noop */ }
  }

  function fld(key: string, val: any) { setForm((prev: any) => ({ ...prev, [key]: val })); }

  if (authLoading) return <div className="admin-loading">Authenticating…</div>;
  if (!isAdmin) return <div className="admin-loading">Access denied.</div>;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title"><i className="fas fa-ticket-alt" style={{ marginRight: 10 }} />Coupons</h1>
          <p className="admin-page-subtitle">Manage coupon codes — product & category scoped, mutually exclusive with offers</p>
        </div>
        <button className="admin-btn admin-btn-primary" onClick={openCreate}>
          <i className="fas fa-plus" /> New Coupon
        </button>
      </div>

      {success && <div className="admin-alert admin-alert-success"><i className="fas fa-check-circle" /> {success}</div>}
      {error && !showModal && <div className="admin-alert admin-alert-error"><i className="fas fa-exclamation-circle" /> {error}</div>}

      {/* Search */}
      <div className="admin-filters" style={{ marginBottom: 20 }}>
        <input
          className="admin-input"
          placeholder="Search coupon codes…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 300 }}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="admin-loading">Loading coupons…</div>
      ) : coupons.length === 0 ? (
        <div className="admin-empty">No coupons found. Create your first coupon!</div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Type</th>
                <th>Discount</th>
                <th>Valid From</th>
                <th>Valid To</th>
                <th>Status</th>
                <th>Uses</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map(coupon => (
                <tr key={coupon._id}>
                  <td><strong style={{ fontFamily: "monospace", fontSize: 14 }}>{coupon.code}</strong></td>
                  <td><span style={{ fontSize: 12 }}>{coupon.discountType === "percentage" ? "%" : "₹ Fixed"}</span></td>
                  <td>
                    {coupon.discountType === "percentage"
                      ? `${coupon.discountValue}%${coupon.maxDiscount ? ` (max ₹${coupon.maxDiscount})` : ""}`
                      : `₹${coupon.discountValue}`}
                  </td>
                  <td style={{ fontSize: 12 }}>{fmtDate(coupon.validFrom)}</td>
                  <td style={{ fontSize: 12 }}>{fmtDate(coupon.validTo)}</td>
                  <td>
                    <span style={{
                      padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600,
                      background: coupon.isActive ? "#dcfce7" : "#fee2e2",
                      color: coupon.isActive ? "#16a34a" : "#dc2626",
                    }}>
                      {coupon.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {coupon.usageCount ?? 0}{coupon.usageLimit ? `/${coupon.usageLimit}` : ""}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="admin-btn admin-btn-sm admin-btn-secondary" onClick={() => openEdit(coupon)} title="Edit">
                        <i className="fas fa-pen" />
                      </button>
                      <button
                        className={`admin-btn admin-btn-sm ${coupon.isActive ? "admin-btn-warning" : "admin-btn-success"}`}
                        onClick={() => handleToggle(coupon)}
                        title={coupon.isActive ? "Deactivate" : "Activate"}
                      >
                        <i className={`fas fa-${coupon.isActive ? "pause" : "play"}`} />
                      </button>
                      <button className="admin-btn admin-btn-sm admin-btn-danger" onClick={() => handleDelete(coupon)} title="Delete">
                        <i className="fas fa-trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-modal" style={{ maxWidth: 680, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>{modalMode === "create" ? "New Coupon" : "Edit Coupon"}</h2>
              <button className="admin-modal-close" onClick={() => setShowModal(false)}><i className="fas fa-times" /></button>
            </div>

            {error && <div className="admin-alert admin-alert-error" style={{ margin: "0 0 12px" }}>{error}</div>}

            <div className="admin-form-grid">
              {/* Code & Description */}
              <div className="admin-form-section">
                <h3 className="admin-form-section-title">Code</h3>
                <label className="admin-label">Coupon Code * (auto-uppercased)</label>
                <input className="admin-input" value={form.code} onChange={e => fld("code", e.target.value.toUpperCase())} placeholder="e.g. SAVE20" style={{ fontFamily: "monospace", letterSpacing: 2 }} />
                <label className="admin-label">Description (internal)</label>
                <input className="admin-input" value={form.description} onChange={e => fld("description", e.target.value)} />
              </div>

              {/* Discount */}
              <div className="admin-form-section">
                <h3 className="admin-form-section-title">Discount</h3>
                <label className="admin-label">Discount Type *</label>
                <select className="admin-input" value={form.discountType} onChange={e => fld("discountType", e.target.value)}>
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₹)</option>
                </select>
                <label className="admin-label">Discount Value *</label>
                <input className="admin-input" type="number" min="0" value={form.discountValue} onChange={e => fld("discountValue", e.target.value)} />
                {form.discountType === "percentage" && (<>
                  <label className="admin-label">Max Discount Cap (₹, optional)</label>
                  <input className="admin-input" type="number" min="0" value={form.maxDiscount} onChange={e => fld("maxDiscount", e.target.value)} />
                </>)}
                <label className="admin-label">Minimum Purchase on Eligible Items (₹)</label>
                <input className="admin-input" type="number" min="0" value={form.minPurchaseAmount} onChange={e => fld("minPurchaseAmount", e.target.value)} />
              </div>

              {/* Scope */}
              <div className="admin-form-section">
                <h3 className="admin-form-section-title">Scope</h3>
                <label className="admin-label">Applicable Product IDs (comma-separated, empty = all)</label>
                <input className="admin-input" value={form.applicableProducts} onChange={e => fld("applicableProducts", e.target.value)} placeholder="id1, id2" />
                <label className="admin-label">Applicable Category IDs (comma-separated)</label>
                <input className="admin-input" value={form.applicableCategories} onChange={e => fld("applicableCategories", e.target.value)} />
                <label className="admin-label">Excluded Product IDs (comma-separated)</label>
                <input className="admin-input" value={form.excludedProducts} onChange={e => fld("excludedProducts", e.target.value)} />
              </div>

              {/* Validity & Limits */}
              <div className="admin-form-section">
                <h3 className="admin-form-section-title">Validity & Limits</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div><label className="admin-label">Valid From *</label><input className="admin-input" type="date" value={form.validFrom} onChange={e => fld("validFrom", e.target.value)} /></div>
                  <div><label className="admin-label">Valid To *</label><input className="admin-input" type="date" value={form.validTo} onChange={e => fld("validTo", e.target.value)} /></div>
                  <div><label className="admin-label">Total Usage Limit (blank = unlimited)</label><input className="admin-input" type="number" min="1" value={form.usageLimit} onChange={e => fld("usageLimit", e.target.value)} /></div>
                  <div><label className="admin-label">Per-User Limit</label><input className="admin-input" type="number" min="1" value={form.usagePerUser} onChange={e => fld("usagePerUser", e.target.value)} /></div>
                </div>
              </div>

              {/* Status */}
              <div className="admin-form-section">
                <h3 className="admin-form-section-title">Status</h3>
                <div style={{ display: "flex", gap: 24, marginTop: 6 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input type="checkbox" checked={form.isActive} onChange={e => fld("isActive", e.target.checked)} />
                    <span>Is Active</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input type="checkbox" checked={form.cannotCombineWithOffers} onChange={e => fld("cannotCombineWithOffers", e.target.checked)} />
                    <span>Cannot combine with active offers</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="admin-modal-footer">
              <button className="admin-btn admin-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="admin-btn admin-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><i className="fas fa-spinner fa-spin" /> Saving…</> : <><i className="fas fa-save" /> {modalMode === "create" ? "Create Coupon" : "Save Changes"}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
