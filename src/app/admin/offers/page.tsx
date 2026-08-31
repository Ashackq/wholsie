"use client";
import { useEffect, useState, useCallback } from "react";
import { useAdminAuth } from "../../../hooks/useAdminAuth";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

// ── Types ─────────────────────────────────────────────────────────────────────

type RuleType =
  | "buy_x_get_y_free"
  | "percentage_discount"
  | "fixed_discount"
  | "combo_discount"
  | "minimum_cart_discount"
  | "free_shipping";

interface Offer {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  internalNote?: string;
  image?: string;
  badgeText?: string;
  ctaText?: string;
  termsAndConditions?: string;
  metaTitle?: string;
  metaDescription?: string;
  rule: {
    type: RuleType;
    buyQuantity?: number;
    getQuantity?: number;
    getFreeProductId?: any;
    discountValue?: number;
    maxDiscountAmount?: number;
    comboProducts?: any[];
    comboPrice?: number;
    minimumCartValue?: number;
    minimumCartDiscountType?: "percentage" | "fixed";
  };
  applicableProducts?: any[];
  applicableCategories?: any[];
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  priority?: number;
  displayOnProductsPage?: boolean;
  displayOnHomepage?: boolean;
  maxUsageTotal?: number;
  maxUsagePerUser?: number;
  usageCount?: number;
  createdAt?: string;
}

const emptyForm = (): any => ({
  title: "",
  slug: "",
  description: "",
  internalNote: "",
  image: "",
  badgeText: "",
  ctaText: "Shop Now",
  termsAndConditions: "",
  metaTitle: "",
  metaDescription: "",
  ruleType: "percentage_discount" as RuleType,
  buyQuantity: "",
  getQuantity: "",
  getFreeProductId: "",
  discountValue: "",
  maxDiscountAmount: "",
  comboProducts: "",
  comboPrice: "",
  minimumCartValue: "",
  minimumCartDiscountType: "percentage",
  applicableProducts: "",
  applicableCategories: "",
  isActive: false,
  startDate: "",
  endDate: "",
  priority: "0",
  displayOnProductsPage: true,
  displayOnHomepage: false,
  maxUsageTotal: "",
  maxUsagePerUser: "",
});

// ── Auth helper ───────────────────────────────────────────────────────────────
function authHeader(): HeadersInit {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("authToken") || sessionStorage.getItem("authToken")
      : null;
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminOffersPage() {
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await fetch(`${API}/admin/offers${params}`, { headers: authHeader() });
      const json = await res.json();
      setOffers(json.data || []);
    } catch {
      setError("Failed to load offers");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { if (isAdmin) fetchOffers(); }, [isAdmin, fetchOffers]);

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

  function openEdit(offer: Offer) {
    setForm({
      title: offer.title || "",
      slug: offer.slug || "",
      description: offer.description || "",
      internalNote: offer.internalNote || "",
      image: offer.image || "",
      badgeText: offer.badgeText || "",
      ctaText: offer.ctaText || "Shop Now",
      termsAndConditions: offer.termsAndConditions || "",
      metaTitle: offer.metaTitle || "",
      metaDescription: offer.metaDescription || "",
      ruleType: offer.rule?.type || "percentage_discount",
      buyQuantity: offer.rule?.buyQuantity ?? "",
      getQuantity: offer.rule?.getQuantity ?? "",
      getFreeProductId: offer.rule?.getFreeProductId?._id || offer.rule?.getFreeProductId || "",
      discountValue: offer.rule?.discountValue ?? "",
      maxDiscountAmount: offer.rule?.maxDiscountAmount ?? "",
      comboProducts: (offer.rule?.comboProducts || []).map((p: any) => p._id || p).join(", "),
      comboPrice: offer.rule?.comboPrice ?? "",
      minimumCartValue: offer.rule?.minimumCartValue ?? "",
      minimumCartDiscountType: offer.rule?.minimumCartDiscountType || "percentage",
      applicableProducts: (offer.applicableProducts || []).map((p: any) => p._id || p).join(", "),
      applicableCategories: (offer.applicableCategories || []).map((c: any) => c._id || c).join(", "),
      isActive: offer.isActive,
      startDate: offer.startDate ? offer.startDate.slice(0, 10) : "",
      endDate: offer.endDate ? offer.endDate.slice(0, 10) : "",
      priority: offer.priority ?? "0",
      displayOnProductsPage: offer.displayOnProductsPage !== false,
      displayOnHomepage: offer.displayOnHomepage || false,
      maxUsageTotal: offer.maxUsageTotal ?? "",
      maxUsagePerUser: offer.maxUsagePerUser ?? "",
    });
    setModalMode("edit");
    setEditingId(offer._id);
    setShowModal(true);
    setError(null);
  }

  function buildPayload(f: any) {
    const rule: any = { type: f.ruleType };
    if (f.ruleType === "buy_x_get_y_free") {
      rule.buyQuantity = Number(f.buyQuantity) || undefined;
      rule.getQuantity = Number(f.getQuantity) || undefined;
      if (f.getFreeProductId) rule.getFreeProductId = f.getFreeProductId;
    } else if (f.ruleType === "percentage_discount") {
      rule.discountValue = Number(f.discountValue) || undefined;
      rule.maxDiscountAmount = f.maxDiscountAmount ? Number(f.maxDiscountAmount) : undefined;
    } else if (f.ruleType === "fixed_discount") {
      rule.discountValue = Number(f.discountValue) || undefined;
    } else if (f.ruleType === "combo_discount") {
      rule.comboProducts = f.comboProducts ? f.comboProducts.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
      rule.comboPrice = Number(f.comboPrice) || undefined;
    } else if (f.ruleType === "minimum_cart_discount") {
      rule.minimumCartValue = Number(f.minimumCartValue) || undefined;
      rule.minimumCartDiscountType = f.minimumCartDiscountType;
      rule.discountValue = Number(f.discountValue) || undefined;
      rule.maxDiscountAmount = f.maxDiscountAmount ? Number(f.maxDiscountAmount) : undefined;
    }

    return {
      title: f.title.trim(),
      slug: f.slug.trim() || undefined,
      description: f.description || undefined,
      internalNote: f.internalNote || undefined,
      image: f.image || undefined,
      badgeText: f.badgeText || undefined,
      ctaText: f.ctaText || "Shop Now",
      termsAndConditions: f.termsAndConditions || undefined,
      metaTitle: f.metaTitle || undefined,
      metaDescription: f.metaDescription || undefined,
      rule,
      applicableProducts: f.applicableProducts ? f.applicableProducts.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
      applicableCategories: f.applicableCategories ? f.applicableCategories.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
      isActive: f.isActive,
      startDate: f.startDate || undefined,
      endDate: f.endDate || undefined,
      priority: Number(f.priority) || 0,
      displayOnProductsPage: f.displayOnProductsPage,
      displayOnHomepage: f.displayOnHomepage,
      maxUsageTotal: f.maxUsageTotal ? Number(f.maxUsageTotal) : undefined,
      maxUsagePerUser: f.maxUsagePerUser ? Number(f.maxUsagePerUser) : undefined,
    };
  }

  async function handleSave() {
    if (!form.title.trim()) return setError("Title is required.");
    setSaving(true);
    setError(null);
    try {
      const payload = buildPayload(form);
      const url = modalMode === "create"
        ? `${API}/admin/offers`
        : `${API}/admin/offers/${editingId}`;
      const method = modalMode === "create" ? "POST" : "PUT";
      const res = await fetch(url, { method, headers: authHeader(), body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) return setError(json.error || "Save failed");
      flashSuccess(json.message || "Saved");
      setShowModal(false);
      fetchOffers();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(offer: Offer) {
    try {
      await fetch(`${API}/admin/offers/${offer._id}/toggle-active`, { method: "PATCH", headers: authHeader() });
      fetchOffers();
    } catch { /* noop */ }
  }

  async function handleDelete(offer: Offer) {
    if (!confirm(`Delete offer "${offer.title}"? This cannot be undone.`)) return;
    try {
      await fetch(`${API}/admin/offers/${offer._id}`, { method: "DELETE", headers: authHeader() });
      flashSuccess("Offer deleted");
      fetchOffers();
    } catch { /* noop */ }
  }

  function f(key: string, val: any) { setForm((prev: any) => ({ ...prev, [key]: val })); }

  if (authLoading) return <div className="admin-loading">Authenticating…</div>;
  if (!isAdmin) return <div className="admin-loading">Access denied.</div>;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title"><i className="fas fa-tag" style={{ marginRight: 10 }} />Offers</h1>
          <p className="admin-page-subtitle">Manage promotional offers — auto-applied server-side</p>
        </div>
        <button className="admin-btn admin-btn-primary" onClick={openCreate}>
          <i className="fas fa-plus" /> New Offer
        </button>
      </div>

      {success && <div className="admin-alert admin-alert-success"><i className="fas fa-check-circle" /> {success}</div>}
      {error && !showModal && <div className="admin-alert admin-alert-error"><i className="fas fa-exclamation-circle" /> {error}</div>}

      {/* Search */}
      <div className="admin-filters" style={{ marginBottom: 20 }}>
        <input
          className="admin-input"
          placeholder="Search offers…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 300 }}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="admin-loading">Loading offers…</div>
      ) : offers.length === 0 ? (
        <div className="admin-empty">No offers found. Create your first offer!</div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Slug</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Uses</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {offers.map(offer => (
                <tr key={offer._id}>
                  <td>
                    <strong>{offer.title}</strong>
                    {offer.badgeText && <span style={{ marginLeft: 8, fontSize: 11, background: "#f59e0b", color: "#fff", borderRadius: 4, padding: "2px 6px" }}>{offer.badgeText}</span>}
                  </td>
                  <td><code style={{ fontSize: 12 }}>{offer.rule?.type}</code></td>
                  <td style={{ fontSize: 12, color: "#94a3b8" }}>{offer.slug}</td>
                  <td>
                    <span style={{
                      padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600,
                      background: offer.isActive ? "#dcfce7" : "#fee2e2",
                      color: offer.isActive ? "#16a34a" : "#dc2626",
                    }}>
                      {offer.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>{offer.priority ?? 0}</td>
                  <td style={{ textAlign: "center" }}>{offer.usageCount ?? 0}{offer.maxUsageTotal ? `/${offer.maxUsageTotal}` : ""}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="admin-btn admin-btn-sm admin-btn-secondary" onClick={() => openEdit(offer)} title="Edit">
                        <i className="fas fa-pen" />
                      </button>
                      <button
                        className={`admin-btn admin-btn-sm ${offer.isActive ? "admin-btn-warning" : "admin-btn-success"}`}
                        onClick={() => handleToggle(offer)}
                        title={offer.isActive ? "Deactivate" : "Activate"}
                      >
                        <i className={`fas fa-${offer.isActive ? "pause" : "play"}`} />
                      </button>
                      <button className="admin-btn admin-btn-sm admin-btn-danger" onClick={() => handleDelete(offer)} title="Delete">
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
          <div className="admin-modal" style={{ maxWidth: 720, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>{modalMode === "create" ? "New Offer" : "Edit Offer"}</h2>
              <button className="admin-modal-close" onClick={() => setShowModal(false)}><i className="fas fa-times" /></button>
            </div>

            {error && <div className="admin-alert admin-alert-error" style={{ margin: "0 0 12px" }}>{error}</div>}

            <div className="admin-form-grid">
              {/* Identity */}
              <div className="admin-form-section">
                <h3 className="admin-form-section-title">Identity</h3>
                <label className="admin-label">Title *</label>
                <input className="admin-input" value={form.title} onChange={e => { f("title", e.target.value); if (!form.slug || modalMode === "create") f("slug", e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")); }} />
                <label className="admin-label">Slug</label>
                <input className="admin-input" value={form.slug} onChange={e => f("slug", e.target.value)} placeholder="auto-generated from title" />
                <label className="admin-label">Badge Text</label>
                <input className="admin-input" value={form.badgeText} onChange={e => f("badgeText", e.target.value)} placeholder="e.g. 🔥 HOT DEAL" />
                <label className="admin-label">CTA Text</label>
                <input className="admin-input" value={form.ctaText} onChange={e => f("ctaText", e.target.value)} />
                <label className="admin-label">Internal Note (admin only)</label>
                <input className="admin-input" value={form.internalNote} onChange={e => f("internalNote", e.target.value)} />
              </div>

              {/* Offer Rule */}
              <div className="admin-form-section">
                <h3 className="admin-form-section-title">Offer Type</h3>
                <label className="admin-label">Type *</label>
                <select className="admin-input" value={form.ruleType} onChange={e => f("ruleType", e.target.value)}>
                  <option value="buy_x_get_y_free">Buy X Get Y Free</option>
                  <option value="percentage_discount">Percentage Discount</option>
                  <option value="fixed_discount">Fixed Discount (₹)</option>
                  <option value="combo_discount">Combo Discount</option>
                  <option value="minimum_cart_discount">Minimum Cart Discount</option>
                  <option value="free_shipping">Free Shipping</option>
                </select>

                {form.ruleType === "buy_x_get_y_free" && (<>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div><label className="admin-label">Buy Qty</label><input className="admin-input" type="number" min="1" value={form.buyQuantity} onChange={e => f("buyQuantity", e.target.value)} /></div>
                    <div><label className="admin-label">Get Qty (free)</label><input className="admin-input" type="number" min="1" value={form.getQuantity} onChange={e => f("getQuantity", e.target.value)} /></div>
                  </div>
                  <label className="admin-label">Free Product ID (leave blank = same product)</label>
                  <input className="admin-input" value={form.getFreeProductId} onChange={e => f("getFreeProductId", e.target.value)} placeholder="MongoDB ObjectId" />
                </>)}

                {(form.ruleType === "percentage_discount" || form.ruleType === "minimum_cart_discount") && (<>
                  <label className="admin-label">Discount %</label>
                  <input className="admin-input" type="number" min="0" max="100" value={form.discountValue} onChange={e => f("discountValue", e.target.value)} />
                  <label className="admin-label">Max Discount Cap (₹, optional)</label>
                  <input className="admin-input" type="number" min="0" value={form.maxDiscountAmount} onChange={e => f("maxDiscountAmount", e.target.value)} />
                </>)}

                {form.ruleType === "fixed_discount" && (<>
                  <label className="admin-label">Discount Amount (₹)</label>
                  <input className="admin-input" type="number" min="0" value={form.discountValue} onChange={e => f("discountValue", e.target.value)} />
                </>)}

                {form.ruleType === "combo_discount" && (<>
                  <label className="admin-label">Combo Product IDs (comma-separated)</label>
                  <input className="admin-input" value={form.comboProducts} onChange={e => f("comboProducts", e.target.value)} placeholder="id1, id2, id3" />
                  <label className="admin-label">Combo Price (₹)</label>
                  <input className="admin-input" type="number" min="0" value={form.comboPrice} onChange={e => f("comboPrice", e.target.value)} />
                </>)}

                {form.ruleType === "minimum_cart_discount" && (<>
                  <label className="admin-label">Minimum Cart Value (₹)</label>
                  <input className="admin-input" type="number" min="0" value={form.minimumCartValue} onChange={e => f("minimumCartValue", e.target.value)} />
                  <label className="admin-label">Discount Type</label>
                  <select className="admin-input" value={form.minimumCartDiscountType} onChange={e => f("minimumCartDiscountType", e.target.value)}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed (₹)</option>
                  </select>
                </>)}
              </div>

              {/* Scope */}
              <div className="admin-form-section">
                <h3 className="admin-form-section-title">Scope</h3>
                <label className="admin-label">Applicable Product IDs (comma-separated, empty = cart-wide)</label>
                <input className="admin-input" value={form.applicableProducts} onChange={e => f("applicableProducts", e.target.value)} placeholder="id1, id2" />
                <label className="admin-label">Applicable Category IDs (comma-separated)</label>
                <input className="admin-input" value={form.applicableCategories} onChange={e => f("applicableCategories", e.target.value)} placeholder="catId1, catId2" />
              </div>

              {/* Lifecycle */}
              <div className="admin-form-section">
                <h3 className="admin-form-section-title">Lifecycle</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div><label className="admin-label">Start Date</label><input className="admin-input" type="date" value={form.startDate} onChange={e => f("startDate", e.target.value)} /></div>
                  <div><label className="admin-label">End Date</label><input className="admin-input" type="date" value={form.endDate} onChange={e => f("endDate", e.target.value)} /></div>
                </div>
                <label className="admin-label">Priority (higher = wins tiebreaker)</label>
                <input className="admin-input" type="number" value={form.priority} onChange={e => f("priority", e.target.value)} />
                <div style={{ display: "flex", gap: 20, marginTop: 10 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input type="checkbox" checked={form.isActive} onChange={e => f("isActive", e.target.checked)} />
                    <span>Is Active</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input type="checkbox" checked={form.displayOnProductsPage} onChange={e => f("displayOnProductsPage", e.target.checked)} />
                    <span>Show on Products Page</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input type="checkbox" checked={form.displayOnHomepage} onChange={e => f("displayOnHomepage", e.target.checked)} />
                    <span>Show on Homepage</span>
                  </label>
                </div>
              </div>

              {/* Limits */}
              <div className="admin-form-section">
                <h3 className="admin-form-section-title">Usage Limits</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div><label className="admin-label">Max Total Uses (blank = unlimited)</label><input className="admin-input" type="number" min="1" value={form.maxUsageTotal} onChange={e => f("maxUsageTotal", e.target.value)} /></div>
                  <div><label className="admin-label">Max Per User</label><input className="admin-input" type="number" min="1" value={form.maxUsagePerUser} onChange={e => f("maxUsagePerUser", e.target.value)} /></div>
                </div>
              </div>

              {/* SEO & Description */}
              <div className="admin-form-section">
                <h3 className="admin-form-section-title">Description & SEO</h3>
                <label className="admin-label">Description</label>
                <textarea className="admin-input" rows={3} value={form.description} onChange={e => f("description", e.target.value)} />
                <label className="admin-label">Terms & Conditions</label>
                <textarea className="admin-input" rows={3} value={form.termsAndConditions} onChange={e => f("termsAndConditions", e.target.value)} />
                <label className="admin-label">Image URL</label>
                <input className="admin-input" value={form.image} onChange={e => f("image", e.target.value)} placeholder="https://…" />
                <label className="admin-label">Meta Title</label>
                <input className="admin-input" value={form.metaTitle} onChange={e => f("metaTitle", e.target.value)} />
                <label className="admin-label">Meta Description</label>
                <textarea className="admin-input" rows={2} value={form.metaDescription} onChange={e => f("metaDescription", e.target.value)} />
              </div>
            </div>

            <div className="admin-modal-footer">
              <button className="admin-btn admin-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="admin-btn admin-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><i className="fas fa-spinner fa-spin" /> Saving…</> : <><i className="fas fa-save" /> {modalMode === "create" ? "Create Offer" : "Save Changes"}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
