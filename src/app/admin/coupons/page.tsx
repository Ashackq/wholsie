"use client";
import { useEffect, useState, useCallback } from "react";
import { useAdminAuth } from "../../../hooks/useAdminAuth";
import AdminSearchFilter from "../../../components/AdminSearchFilter";
import RefreshButton from "../../../components/RefreshButton";
import AdminItemSelector from "../../../components/AdminItemSelector";

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
  applicableProducts: [],
  applicableCategories: [],
  excludedProducts: [],
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

export default function AdminCouponsPage() {
  const { isAdmin, loading: authLoading, error: authError } = useAdminAuth();
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

  // Product & Category options for selectors
  const [productsList, setProductsList] = useState<any[]>([]);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/coupons`, { headers: authHeader() });
      const json = await res.json();
      setCoupons(json.data || []);
    } catch {
      setError("Failed to load coupons");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDropdownOptions = useCallback(async () => {
    setLoadingOptions(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch(`${API}/admin/products?limit=500`, { headers: authHeader() }),
        fetch(`${API}/admin/categories?limit=200`, { headers: authHeader() }),
      ]);
      const [prodJson, catJson] = await Promise.all([prodRes.json(), catRes.json()]);

      const prods = (prodJson.data || prodJson.products || []).map((p: any) => ({
        _id: p._id,
        name: p.name || p.title,
        price: p.discountPrice || p.price,
        image: p.image || (p.images && p.images[0]),
        slug: p.slug,
      }));

      const cats = (catJson.data || catJson.categories || catJson || []).map((c: any) => ({
        _id: c._id,
        name: c.name,
        slug: c.slug,
      }));

      setProductsList(prods);
      setCategoriesList(cats);
    } catch (e) {
      console.error("Failed to load options for coupon selectors:", e);
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin || authLoading) return;
    fetchCoupons();
    fetchDropdownOptions();
  }, [isAdmin, authLoading, fetchCoupons, fetchDropdownOptions]);

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
      applicableProducts: (coupon.applicableProducts || []).map((p: any) => p._id || p),
      applicableCategories: (coupon.applicableCategories || []).map((c: any) => c._id || c),
      excludedProducts: (coupon.excludedProducts || []).map((p: any) => p._id || p),
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
    const applicableProducts = Array.isArray(f.applicableProducts)
      ? f.applicableProducts
      : f.applicableProducts
      ? f.applicableProducts.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];

    const applicableCategories = Array.isArray(f.applicableCategories)
      ? f.applicableCategories
      : f.applicableCategories
      ? f.applicableCategories.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];

    const excludedProducts = Array.isArray(f.excludedProducts)
      ? f.excludedProducts
      : f.excludedProducts
      ? f.excludedProducts.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];

    return {
      code: f.code.trim().toUpperCase(),
      description: f.description || undefined,
      discountType: f.discountType,
      discountValue: Number(f.discountValue),
      maxDiscount: f.maxDiscount ? Number(f.maxDiscount) : undefined,
      minPurchaseAmount: f.minPurchaseAmount ? Number(f.minPurchaseAmount) : 0,
      usageLimit: f.usageLimit ? Number(f.usageLimit) : undefined,
      usagePerUser: Number(f.usagePerUser) || 1,
      applicableProducts,
      applicableCategories,
      excludedProducts,
      validFrom: f.validFrom,
      validTo: f.validTo,
      isActive: f.isActive,
      cannotCombineWithOffers: f.cannotCombineWithOffers,
    };
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim()) {
      setError("Coupon code is required.");
      return;
    }
    if (!form.discountValue) {
      setError("Discount value is required.");
      return;
    }
    if (!form.validFrom || !form.validTo) {
      setError("Valid From and Valid To dates are required.");
      return;
    }
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
      if (!res.ok) {
        setError(json.error || "Save failed");
        return;
      }
      flashSuccess(json.message || "Saved successfully");
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
      flashSuccess(coupon.isActive ? "Coupon deactivated" : "Coupon activated");
      fetchCoupons();
    } catch {
      setError("Failed to update status");
    }
  }

  async function handleDelete(coupon: Coupon) {
    if (!confirm(`Delete coupon "${coupon.code}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API}/admin/coupons/${coupon._id}`, { method: "DELETE", headers: authHeader() });
      if (!res.ok) throw new Error("Delete failed");
      flashSuccess("Coupon deleted successfully");
      fetchCoupons();
    } catch {
      setError("Failed to delete coupon");
    }
  }

  function fld(key: string, val: any) {
    setForm((prev: any) => ({ ...prev, [key]: val }));
  }

  if (authLoading) {
    return (
      <div className="admin-page-header">
        <h1>Loading...</h1>
      </div>
    );
  }

  if (authError || !isAdmin) {
    return (
      <div className="admin-page-header">
        <h1>Access Denied</h1>
        <p style={{ color: "red" }}>{authError || "You do not have admin privileges"}</p>
      </div>
    );
  }

  if (loading && coupons.length === 0) {
    return (
      <div className="admin-page-header">
        <h1>Loading...</h1>
      </div>
    );
  }

  const filteredCoupons = coupons.filter((c) => {
    const q = search.toLowerCase();
    return (
      (c.code || "").toLowerCase().includes(q) ||
      (c.description || "").toLowerCase().includes(q) ||
      (c.discountType || "").toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div
        className="admin-page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h1>Coupons</h1>
          <p>Manage discount coupons and promotional codes</p>
          <button
            onClick={openCreate}
            style={{
              padding: "8px 16px",
              background: "#0f172a",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              marginTop: 10,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Add New Coupon
          </button>
        </div>

        <RefreshButton onRefresh={fetchCoupons} loading={loading} />
      </div>

      {error && (
        <div
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: 16,
            borderRadius: 8,
            marginBottom: 20,
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            background: "#dcfce7",
            color: "#166534",
            padding: 16,
            borderRadius: 8,
            marginBottom: 20,
          }}
        >
          {success}
        </div>
      )}

      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 40,
            overflowY: "auto",
            padding: "20px 0",
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: "#fff",
              color: "#0f172a",
              padding: 24,
              borderRadius: 10,
              width: "min(720px, 94vw)",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 15px 50px rgba(0,0,0,0.25)",
              margin: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "start",
                marginBottom: 20,
                borderBottom: "2px solid #e5e7eb",
                paddingBottom: 16,
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 22 }}>
                  {modalMode === "create" ? "Add New Coupon" : "Edit Coupon"}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 24,
                  lineHeight: 1,
                }}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            {error && (
              <div
                style={{
                  background: "#fee2e2",
                  color: "#991b1b",
                  padding: 12,
                  borderRadius: 6,
                  marginBottom: 16,
                  fontSize: 14,
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSave}>
              {/* Section: Code */}
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ margin: "0 0 12px 0", fontSize: 15, color: "#374151", borderBottom: "1px solid #f3f4f6", paddingBottom: 6 }}>
                  Coupon Code & Details
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Coupon Code *</label>
                    <input
                      type="text"
                      placeholder="e.g. SAVE20"
                      value={form.code}
                      onChange={(e) => fld("code", e.target.value.toUpperCase())}
                      required
                      style={{ padding: 10, border: "1px solid #d1d5db", borderRadius: 6, width: "100%", outline: "none", fontFamily: "monospace", letterSpacing: 1 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Description (internal)</label>
                    <input
                      type="text"
                      placeholder="e.g. 20% discount on new arrivals"
                      value={form.description}
                      onChange={(e) => fld("description", e.target.value)}
                      style={{ padding: 10, border: "1px solid #d1d5db", borderRadius: 6, width: "100%", outline: "none" }}
                    />
                  </div>
                </div>
              </div>

              {/* Section: Discount */}
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ margin: "0 0 12px 0", fontSize: 15, color: "#374151", borderBottom: "1px solid #f3f4f6", paddingBottom: 6 }}>
                  Discount Configuration
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Discount Type *</label>
                    <select
                      value={form.discountType}
                      onChange={(e) => fld("discountType", e.target.value)}
                      style={{ padding: 10, border: "1px solid #d1d5db", borderRadius: 6, width: "100%", outline: "none" }}
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (₹)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                      Discount Value * ({form.discountType === "percentage" ? "%" : "₹"})
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.discountValue}
                      onChange={(e) => fld("discountValue", e.target.value)}
                      required
                      style={{ padding: 10, border: "1px solid #d1d5db", borderRadius: 6, width: "100%", outline: "none" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  {form.discountType === "percentage" && (
                    <div>
                      <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Max Discount Cap (₹, optional)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 500"
                        value={form.maxDiscount}
                        onChange={(e) => fld("maxDiscount", e.target.value)}
                        style={{ padding: 10, border: "1px solid #d1d5db", borderRadius: 6, width: "100%", outline: "none" }}
                      />
                    </div>
                  )}
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Min Purchase Amount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={form.minPurchaseAmount}
                      onChange={(e) => fld("minPurchaseAmount", e.target.value)}
                      style={{ padding: 10, border: "1px solid #d1d5db", borderRadius: 6, width: "100%", outline: "none" }}
                    />
                  </div>
                </div>
              </div>

              {/* Section: Scope with Item Selector Dropdowns */}
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ margin: "0 0 12px 0", fontSize: 15, color: "#374151", borderBottom: "1px solid #f3f4f6", paddingBottom: 6 }}>
                  Product & Category Scope
                </h4>

                <AdminItemSelector
                  label="Applicable Products"
                  placeholder="Search and select products..."
                  emptyLabel="All Products (Cart-wide / No product restriction)"
                  items={productsList}
                  selectedIds={form.applicableProducts}
                  onChange={(ids) => fld("applicableProducts", ids)}
                  loading={loadingOptions}
                  helpText="Select specific eligible products, or leave blank to apply across all products."
                />

                <AdminItemSelector
                  label="Applicable Categories"
                  placeholder="Search and select categories..."
                  emptyLabel="All Categories (No category restriction)"
                  items={categoriesList}
                  selectedIds={form.applicableCategories}
                  onChange={(ids) => fld("applicableCategories", ids)}
                  loading={loadingOptions}
                  helpText="Select specific eligible categories."
                />

                <AdminItemSelector
                  label="Excluded Products"
                  placeholder="Search and select products to exclude..."
                  emptyLabel="No products excluded"
                  items={productsList}
                  selectedIds={form.excludedProducts}
                  onChange={(ids) => fld("excludedProducts", ids)}
                  loading={loadingOptions}
                  helpText="Products selected here cannot receive this coupon discount."
                />
              </div>

              {/* Section: Validity & Limits */}
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ margin: "0 0 12px 0", fontSize: 15, color: "#374151", borderBottom: "1px solid #f3f4f6", paddingBottom: 6 }}>
                  Validity Dates & Usage Limits
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Valid From *</label>
                    <input
                      type="date"
                      value={form.validFrom}
                      onChange={(e) => fld("validFrom", e.target.value)}
                      required
                      style={{ padding: 10, border: "1px solid #d1d5db", borderRadius: 6, width: "100%", outline: "none" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Valid To *</label>
                    <input
                      type="date"
                      value={form.validTo}
                      onChange={(e) => fld("validTo", e.target.value)}
                      required
                      style={{ padding: 10, border: "1px solid #d1d5db", borderRadius: 6, width: "100%", outline: "none" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Total Usage Limit</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="Unlimited"
                      value={form.usageLimit}
                      onChange={(e) => fld("usageLimit", e.target.value)}
                      style={{ padding: 10, border: "1px solid #d1d5db", borderRadius: 6, width: "100%", outline: "none" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Per-User Limit</label>
                    <input
                      type="number"
                      min="1"
                      value={form.usagePerUser}
                      onChange={(e) => fld("usagePerUser", e.target.value)}
                      style={{ padding: 10, border: "1px solid #d1d5db", borderRadius: 6, width: "100%", outline: "none" }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginTop: 10, background: "#f9fafb", padding: 12, borderRadius: 8 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => fld("isActive", e.target.checked)}
                    />
                    <span>Active Status</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
                    <input
                      type="checkbox"
                      checked={form.cannotCombineWithOffers}
                      onChange={(e) => fld("cannotCombineWithOffers", e.target.checked)}
                    />
                    <span>Cannot combine with active offers</span>
                  </label>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, borderTop: "1px solid #e5e7eb", paddingTop: 16 }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: "10px 16px",
                    background: "#059669",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    cursor: saving ? "wait" : "pointer",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {saving ? "Saving..." : modalMode === "create" ? "Create Coupon" : "Update Coupon"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: "10px 16px",
                    background: "#9ca3af",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="admin-table-container">
        <div
          className="admin-table-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h3>All Coupons ({filteredCoupons.length})</h3>
          </div>
          <div>
            <AdminSearchFilter
              search={search}
              setSearch={setSearch}
              placeholder="Search coupons..."
            />
          </div>
        </div>

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
              <th style={{ width: 220 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCoupons.length > 0 ? (
              filteredCoupons.map((coupon, index) => (
                <tr key={coupon._id || `coupon-${index}`}>
                  <td>
                    <strong style={{ fontFamily: "monospace", fontSize: 14 }}>{coupon.code}</strong>
                  </td>
                  <td>
                    <span style={{ fontSize: 12 }}>
                      {coupon.discountType === "percentage" ? "% Percentage" : "₹ Fixed"}
                    </span>
                  </td>
                  <td>
                    {coupon.discountType === "percentage"
                      ? `${coupon.discountValue}%${coupon.maxDiscount ? ` (max ₹${coupon.maxDiscount})` : ""}`
                      : `₹${coupon.discountValue}`}
                  </td>
                  <td style={{ fontSize: 12 }}>{fmtDate(coupon.validFrom)}</td>
                  <td style={{ fontSize: 12 }}>{fmtDate(coupon.validTo)}</td>
                  <td>
                    <span className={`admin-badge ${coupon.isActive ? "success" : "danger"}`}>
                      {coupon.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    {coupon.usageCount ?? 0}
                    {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""}
                  </td>
                  <td>
                    <button
                      onClick={() => openEdit(coupon)}
                      style={{
                        padding: "6px 12px",
                        background: "#3b82f6",
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer",
                        marginRight: 8,
                        fontSize: 12,
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggle(coupon)}
                      style={{
                        padding: "6px 10px",
                        background: coupon.isActive ? "#f59e0b" : "#10b981",
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer",
                        marginRight: 8,
                        fontSize: 12,
                      }}
                    >
                      {coupon.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDelete(coupon)}
                      style={{
                        padding: "6px 12px",
                        background: "#ef4444",
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer",
                        fontSize: 12,
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: 40, color: "var(--text-2)" }}>
                  No coupons found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
