"use client";
import { useEffect, useState, useCallback } from "react";
import { useAdminAuth } from "../../../hooks/useAdminAuth";
import AdminSearchFilter from "../../../components/AdminSearchFilter";
import RefreshButton from "../../../components/RefreshButton";
import AdminItemSelector from "../../../components/AdminItemSelector";

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
  maxUsageTotal?: number;
  maxUsagePerUser?: number;
  usageCount?: number;
  createdAt?: string;
}

const emptyForm = (): any => ({
  title: "",
  slug: "",
  ruleType: "percentage_discount" as RuleType,
  buyQuantity: "",
  getQuantity: "",
  getFreeProductId: "",
  discountValue: "",
  maxDiscountAmount: "",
  comboProducts: [],
  comboPrice: "",
  minimumCartValue: "",
  minimumCartDiscountType: "percentage",
  applicableProducts: [],
  applicableCategories: [],
  isActive: true,
  startDate: "",
  endDate: "",
  priority: "0",
  maxUsageTotal: "",
  maxUsagePerUser: "",
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

export default function AdminOffersPage() {
  const { isAdmin, loading: authLoading, error: authError } = useAdminAuth();
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

  // Product & Category options for selectors
  const [productsList, setProductsList] = useState<any[]>([]);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/offers`, { headers: authHeader() });
      const json = await res.json();
      setOffers(json.data || []);
    } catch {
      setError("Failed to load offers");
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
      console.error("Failed to load dropdown options:", e);
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin || authLoading) return;
    fetchOffers();
    fetchDropdownOptions();
  }, [isAdmin, authLoading, fetchOffers, fetchDropdownOptions]);

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
      ruleType: offer.rule?.type || "percentage_discount",
      buyQuantity: offer.rule?.buyQuantity ?? "",
      getQuantity: offer.rule?.getQuantity ?? "",
      getFreeProductId:
        offer.rule?.getFreeProductId?._id ||
        offer.rule?.getFreeProductId ||
        "",
      discountValue: offer.rule?.discountValue ?? "",
      maxDiscountAmount: offer.rule?.maxDiscountAmount ?? "",
      comboProducts: (offer.rule?.comboProducts || []).map(
        (p: any) => p._id || p
      ),
      comboPrice: offer.rule?.comboPrice ?? "",
      minimumCartValue: offer.rule?.minimumCartValue ?? "",
      minimumCartDiscountType:
        offer.rule?.minimumCartDiscountType || "percentage",
      applicableProducts: (offer.applicableProducts || []).map(
        (p: any) => p._id || p
      ),
      applicableCategories: (offer.applicableCategories || []).map(
        (c: any) => c._id || c
      ),
      isActive: offer.isActive !== false,
      startDate: offer.startDate ? offer.startDate.slice(0, 10) : "",
      endDate: offer.endDate ? offer.endDate.slice(0, 10) : "",
      priority: offer.priority ?? "0",
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
      rule.maxDiscountAmount = f.maxDiscountAmount
        ? Number(f.maxDiscountAmount)
        : undefined;
    } else if (f.ruleType === "fixed_discount") {
      rule.discountValue = Number(f.discountValue) || undefined;
    } else if (f.ruleType === "combo_discount") {
      rule.comboProducts = Array.isArray(f.comboProducts)
        ? f.comboProducts
        : f.comboProducts
        ? f.comboProducts.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [];
      rule.comboPrice = Number(f.comboPrice) || undefined;
    } else if (f.ruleType === "minimum_cart_discount") {
      rule.minimumCartValue = Number(f.minimumCartValue) || undefined;
      rule.minimumCartDiscountType = f.minimumCartDiscountType;
      rule.discountValue = Number(f.discountValue) || undefined;
      rule.maxDiscountAmount = f.maxDiscountAmount
        ? Number(f.maxDiscountAmount)
        : undefined;
    }

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

    return {
      title: f.title.trim(),
      slug: f.slug?.trim() || undefined,
      rule,
      applicableProducts,
      applicableCategories,
      isActive: f.isActive,
      startDate: f.startDate || undefined,
      endDate: f.endDate || undefined,
      priority: Number(f.priority) || 0,
      maxUsageTotal: f.maxUsageTotal ? Number(f.maxUsageTotal) : undefined,
      maxUsagePerUser: f.maxUsagePerUser
        ? Number(f.maxUsagePerUser)
        : undefined,
    };
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = buildPayload(form);
      const url =
        modalMode === "create"
          ? `${API}/admin/offers`
          : `${API}/admin/offers/${editingId}`;
      const method = modalMode === "create" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: authHeader(),
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Save failed");
        return;
      }
      flashSuccess(json.message || "Saved successfully");
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
      await fetch(`${API}/admin/offers/${offer._id}/toggle-active`, {
        method: "PATCH",
        headers: authHeader(),
      });
      flashSuccess(offer.isActive ? "Offer deactivated" : "Offer activated");
      fetchOffers();
    } catch {
      setError("Failed to update status");
    }
  }

  async function handleDelete(offer: Offer) {
    if (!confirm(`Delete offer "${offer.title}"? This cannot be undone.`))
      return;
    try {
      const res = await fetch(`${API}/admin/offers/${offer._id}`, {
        method: "DELETE",
        headers: authHeader(),
      });
      if (!res.ok) throw new Error("Delete failed");
      flashSuccess("Offer deleted successfully");
      fetchOffers();
    } catch {
      setError("Failed to delete offer");
    }
  }

  function f(key: string, val: any) {
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
        <p style={{ color: "red" }}>
          {authError || "You do not have admin privileges"}
        </p>
      </div>
    );
  }

  if (loading && offers.length === 0) {
    return (
      <div className="admin-page-header">
        <h1>Loading...</h1>
      </div>
    );
  }

  const filteredOffers = offers.filter((offer) => {
    const q = search.toLowerCase();
    return (
      (offer.title || "").toLowerCase().includes(q) ||
      (offer.slug || "").toLowerCase().includes(q) ||
      (offer.rule?.type || "").toLowerCase().includes(q)
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
          <h1>Offers</h1>
          <p>Manage promotional offers displayed on the products page</p>
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
            Add New Offer
          </button>
        </div>

        <RefreshButton onRefresh={fetchOffers} loading={loading} />
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
              width: "min(700px, 94vw)",
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
                  {modalMode === "create" ? "Add New Offer" : "Edit Offer"}
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
              {/* Section 1: Offer Title */}
              <div style={{ marginBottom: 20 }}>
                <h4
                  style={{
                    margin: "0 0 12px 0",
                    fontSize: 15,
                    color: "#374151",
                    borderBottom: "1px solid #f3f4f6",
                    paddingBottom: 6,
                  }}
                >
                  Offer Title
                </h4>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 600,
                        marginBottom: 4,
                      }}
                    >
                      Offer Title * (displayed on product badges)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 20% OFF or Buy 2 Get 1 Free"
                      value={form.title}
                      onChange={(e) => {
                        f("title", e.target.value);
                        if (!form.slug || modalMode === "create") {
                          f(
                            "slug",
                            e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9]+/g, "-")
                              .replace(/^-|-$/g, "")
                          );
                        }
                      }}
                      required
                      style={{
                        padding: 10,
                        border: "1px solid #d1d5db",
                        borderRadius: 6,
                        width: "100%",
                        outline: "none",
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 600,
                        marginBottom: 4,
                      }}
                    >
                      Slug (identifier)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 20-off"
                      value={form.slug}
                      onChange={(e) => f("slug", e.target.value)}
                      style={{
                        padding: 10,
                        border: "1px solid #d1d5db",
                        borderRadius: 6,
                        width: "100%",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Rule & Discount */}
              <div style={{ marginBottom: 20 }}>
                <h4
                  style={{
                    margin: "0 0 12px 0",
                    fontSize: 15,
                    color: "#374151",
                    borderBottom: "1px solid #f3f4f6",
                    paddingBottom: 6,
                  }}
                >
                  Discount Rule
                </h4>
                <div style={{ marginBottom: 12 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 600,
                      marginBottom: 4,
                    }}
                  >
                    Offer Type *
                  </label>
                  <select
                    value={form.ruleType}
                    onChange={(e) => f("ruleType", e.target.value)}
                    style={{
                      padding: 10,
                      border: "1px solid #d1d5db",
                      borderRadius: 6,
                      width: "100%",
                      outline: "none",
                    }}
                  >
                    <option value="percentage_discount">
                      Percentage Discount (%)
                    </option>
                    <option value="fixed_discount">Fixed Discount (₹)</option>
                    <option value="buy_x_get_y_free">Buy X Get Y Free</option>
                    <option value="combo_discount">Combo Discount</option>
                    <option value="minimum_cart_discount">
                      Minimum Cart Discount
                    </option>
                    <option value="free_shipping">Free Shipping</option>
                  </select>
                </div>

                {form.ruleType === "buy_x_get_y_free" && (
                  <div
                    style={{
                      background: "#f9fafb",
                      padding: 12,
                      borderRadius: 8,
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 12,
                        marginBottom: 10,
                      }}
                    >
                      <div>
                        <label
                          style={{
                            display: "block",
                            fontSize: 12,
                            fontWeight: 600,
                            marginBottom: 4,
                          }}
                        >
                          Buy Quantity
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={form.buyQuantity}
                          onChange={(e) => f("buyQuantity", e.target.value)}
                          style={{
                            padding: 8,
                            border: "1px solid #d1d5db",
                            borderRadius: 6,
                            width: "100%",
                          }}
                        />
                      </div>
                      <div>
                        <label
                          style={{
                            display: "block",
                            fontSize: 12,
                            fontWeight: 600,
                            marginBottom: 4,
                          }}
                        >
                          Get Quantity (free)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={form.getQuantity}
                          onChange={(e) => f("getQuantity", e.target.value)}
                          style={{
                            padding: 8,
                            border: "1px solid #d1d5db",
                            borderRadius: 6,
                            width: "100%",
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <AdminItemSelector
                        label="Free Product (leave empty to award same product)"
                        placeholder="Search product..."
                        emptyLabel="Same product as purchased"
                        items={productsList}
                        selectedIds={form.getFreeProductId}
                        onChange={(id) => f("getFreeProductId", id)}
                        mode="single"
                        loading={loadingOptions}
                      />
                    </div>
                  </div>
                )}

                {(form.ruleType === "percentage_discount" ||
                  form.ruleType === "minimum_cart_discount") && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: 13,
                          fontWeight: 600,
                          marginBottom: 4,
                        }}
                      >
                        Discount %
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={form.discountValue}
                        onChange={(e) => f("discountValue", e.target.value)}
                        style={{
                          padding: 10,
                          border: "1px solid #d1d5db",
                          borderRadius: 6,
                          width: "100%",
                          outline: "none",
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: 13,
                          fontWeight: 600,
                          marginBottom: 4,
                        }}
                      >
                        Max Cap (₹, optional)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={form.maxDiscountAmount}
                        onChange={(e) => f("maxDiscountAmount", e.target.value)}
                        style={{
                          padding: 10,
                          border: "1px solid #d1d5db",
                          borderRadius: 6,
                          width: "100%",
                          outline: "none",
                        }}
                      />
                    </div>
                  </div>
                )}

                {form.ruleType === "fixed_discount" && (
                  <div style={{ marginBottom: 12 }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 600,
                        marginBottom: 4,
                      }}
                    >
                      Discount Amount (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.discountValue}
                      onChange={(e) => f("discountValue", e.target.value)}
                      style={{
                        padding: 10,
                        border: "1px solid #d1d5db",
                        borderRadius: 6,
                        width: "100%",
                        outline: "none",
                      }}
                    />
                  </div>
                )}

                {form.ruleType === "combo_discount" && (
                  <div
                    style={{
                      background: "#f9fafb",
                      padding: 12,
                      borderRadius: 8,
                      marginBottom: 12,
                    }}
                  >
                    <AdminItemSelector
                      label="Combo Products (bundle items)"
                      placeholder="Search and select combo products..."
                      emptyLabel="Select bundle products"
                      items={productsList}
                      selectedIds={form.comboProducts}
                      onChange={(ids) => f("comboProducts", ids)}
                      loading={loadingOptions}
                    />
                    <div style={{ marginTop: 10 }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: 12,
                          fontWeight: 600,
                          marginBottom: 4,
                        }}
                      >
                        Combo Bundle Price (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={form.comboPrice}
                        onChange={(e) => f("comboPrice", e.target.value)}
                        style={{
                          padding: 8,
                          border: "1px solid #d1d5db",
                          borderRadius: 6,
                          width: "100%",
                        }}
                      />
                    </div>
                  </div>
                )}

                {form.ruleType === "minimum_cart_discount" && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: 13,
                          fontWeight: 600,
                          marginBottom: 4,
                        }}
                      >
                        Min Cart Value (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={form.minimumCartValue}
                        onChange={(e) => f("minimumCartValue", e.target.value)}
                        style={{
                          padding: 10,
                          border: "1px solid #d1d5db",
                          borderRadius: 6,
                          width: "100%",
                          outline: "none",
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: 13,
                          fontWeight: 600,
                          marginBottom: 4,
                        }}
                      >
                        Min Cart Discount Type
                      </label>
                      <select
                        value={form.minimumCartDiscountType}
                        onChange={(e) =>
                          f("minimumCartDiscountType", e.target.value)
                        }
                        style={{
                          padding: 10,
                          border: "1px solid #d1d5db",
                          borderRadius: 6,
                          width: "100%",
                          outline: "none",
                        }}
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed (₹)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: Product & Category Scope */}
              <div style={{ marginBottom: 20 }}>
                <h4
                  style={{
                    margin: "0 0 12px 0",
                    fontSize: 15,
                    color: "#374151",
                    borderBottom: "1px solid #f3f4f6",
                    paddingBottom: 6,
                  }}
                >
                  Product & Category Scope
                </h4>

                <AdminItemSelector
                  label="Applicable Products"
                  placeholder="Search and select products..."
                  emptyLabel="All Products (Cart-wide / No product restriction)"
                  items={productsList}
                  selectedIds={form.applicableProducts}
                  onChange={(ids) => f("applicableProducts", ids)}
                  loading={loadingOptions}
                  helpText="Select specific products eligible for this offer, or leave blank to apply across all products."
                />

                <AdminItemSelector
                  label="Applicable Categories"
                  placeholder="Search and select categories..."
                  emptyLabel="All Categories (No category restriction)"
                  items={categoriesList}
                  selectedIds={form.applicableCategories}
                  onChange={(ids) => f("applicableCategories", ids)}
                  loading={loadingOptions}
                  helpText="Select specific categories eligible for this offer."
                />
              </div>

              {/* Section 4: Schedule, Limits & Status */}
              <div style={{ marginBottom: 24 }}>
                <h4
                  style={{
                    margin: "0 0 12px 0",
                    fontSize: 15,
                    color: "#374151",
                    borderBottom: "1px solid #f3f4f6",
                    paddingBottom: 6,
                  }}
                >
                  Schedule, Limits & Status
                </h4>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 600,
                        marginBottom: 4,
                      }}
                    >
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => f("startDate", e.target.value)}
                      style={{
                        padding: 10,
                        border: "1px solid #d1d5db",
                        borderRadius: 6,
                        width: "100%",
                        outline: "none",
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 600,
                        marginBottom: 4,
                      }}
                    >
                      End Date
                    </label>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => f("endDate", e.target.value)}
                      style={{
                        padding: 10,
                        border: "1px solid #d1d5db",
                        borderRadius: 6,
                        width: "100%",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 600,
                        marginBottom: 4,
                      }}
                    >
                      Priority
                    </label>
                    <input
                      type="number"
                      value={form.priority}
                      onChange={(e) => f("priority", e.target.value)}
                      style={{
                        padding: 10,
                        border: "1px solid #d1d5db",
                        borderRadius: 6,
                        width: "100%",
                        outline: "none",
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 600,
                        marginBottom: 4,
                      }}
                    >
                      Max Total Uses
                    </label>
                    <input
                      type="number"
                      placeholder="Unlimited"
                      value={form.maxUsageTotal}
                      onChange={(e) => f("maxUsageTotal", e.target.value)}
                      style={{
                        padding: 10,
                        border: "1px solid #d1d5db",
                        borderRadius: 6,
                        width: "100%",
                        outline: "none",
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 600,
                        marginBottom: 4,
                      }}
                    >
                      Max Per User
                    </label>
                    <input
                      type="number"
                      value={form.maxUsagePerUser}
                      onChange={(e) => f("maxUsagePerUser", e.target.value)}
                      style={{
                        padding: 10,
                        border: "1px solid #d1d5db",
                        borderRadius: 6,
                        width: "100%",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 10,
                    background: "#f9fafb",
                    padding: 12,
                    borderRadius: 8,
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                      fontSize: 14,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => f("isActive", e.target.checked)}
                    />
                    <span>Active Status (Offer applies to products immediately)</span>
                  </label>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  borderTop: "1px solid #e5e7eb",
                  paddingTop: 16,
                }}
              >
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
                  {saving
                    ? "Saving..."
                    : modalMode === "create"
                    ? "Create Offer"
                    : "Update Offer"}
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
            <h3>All Offers ({filteredOffers.length})</h3>
          </div>
          <div>
            <AdminSearchFilter
              search={search}
              setSearch={setSearch}
              placeholder="Search offers..."
            />
          </div>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Slug</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Uses</th>
              <th style={{ width: 220 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOffers.length > 0 ? (
              filteredOffers.map((offer, index) => (
                <tr key={offer._id || `offer-${index}`}>
                  <td>
                    <strong>{offer.title}</strong>
                  </td>
                  <td>
                    <code style={{ fontSize: 12 }}>{offer.rule?.type}</code>
                  </td>
                  <td>
                    <span style={{ fontSize: 12, color: "var(--text-2)" }}>
                      {offer.slug}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`admin-badge ${
                        offer.isActive ? "success" : "danger"
                      }`}
                    >
                      {offer.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>{offer.priority ?? 0}</td>
                  <td>
                    {offer.usageCount ?? 0}
                    {offer.maxUsageTotal ? ` / ${offer.maxUsageTotal}` : ""}
                  </td>
                  <td>
                    <button
                      onClick={() => openEdit(offer)}
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
                      onClick={() => handleToggle(offer)}
                      style={{
                        padding: "6px 10px",
                        background: offer.isActive ? "#f59e0b" : "#10b981",
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer",
                        marginRight: 8,
                        fontSize: 12,
                      }}
                    >
                      {offer.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDelete(offer)}
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
                <td
                  colSpan={7}
                  style={{
                    textAlign: "center",
                    padding: 40,
                    color: "var(--text-2)",
                  }}
                >
                  No offers found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
