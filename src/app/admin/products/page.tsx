"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAdminAuth } from "../../../hooks/useAdminAuth";
import AdminSearchFilter from "../../../components/AdminSearchFilter"
import RefreshButton from "../../../components/RefreshButton"

type Product = {
    _id: string;
    name?: string;
    title?: string;
    description?: string;
    sku?: string;
    categoryId?: any;
    price?: number;
    salePrice?: number;
    discountedPrice?: number;
    discountPrice?: number;
    discount?: number;
    stock?: number;
    quantity?: number;
    image?: string;
    images?: string[];
    status?: any;
    isRecentLaunch?: boolean;
    isCombo?: boolean;
    rating?: number;
    reviewCount?: number;
    material?: string;
    style?: string;
    weight?: number;
    shelfLife?: string;
    features?: string;
    dietType?: string;
    storage?: string;
    country?: string;
    slug?: string;
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
    createdAt?: string;
    updatedAt?: string;
};

type Category = {
    _id: string;
    name?: string;
    slug?: string;
};

export default function AdminProductsPage() {
    const { isAdmin, loading: authLoading, error: authError } = useAdminAuth();
    const [items, setItems] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<"create" | "edit" | "view">("create");
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [search, setSearch] = useState("");
    const [refreshing, setRefreshing] = useState(false);
    const createEmptyForm = () => ({
        name: "",
        price: "",
        discountPrice: "",
        stock: "",
        weight: "",
        status: "active",
        isRecentLaunch: false,
        isCombo: false,
        categoryId: "",
        description: "",
        image: "",
        images: "",
    });
    const [formData, setFormData] = useState(createEmptyForm());
    const [categories, setCategories] = useState<Category[]>([]);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const pageSize = 4;
    const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

    const loadProducts = async () => {
      setLoading(true);
      try {
        const offset = (page - 1) * pageSize;
    
        const [productsRes, categoriesRes] = await Promise.all([
          fetch(`${API}/admin/products?offset=${offset}&limit=${pageSize}`, {
            credentials: "include",
          }),
          fetch(`${API}/admin/categories?limit=200`, {
            credentials: "include",
          }),
        ]);
    
        const productsJson = await productsRes.json();
        const categoriesJson = await categoriesRes.json();
    
        const list = productsJson.data || productsJson.products || [];
        const totalCount =
          productsJson.pagination?.total ??
          (Array.isArray(list) ? offset + list.length : 0);
    
        setItems(list);
        setTotal(totalCount);
        setCategories(categoriesJson.data || categoriesJson.categories || []);
      } catch (e: any) {
        setError(e?.message || "Failed to load products");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    useEffect(() => {
      if (!isAdmin || authLoading) return;
      loadProducts();
    }, [isAdmin, authLoading, page]);

    const goToPage = (nextPage: number) => {
        setPage(nextPage);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleEdit = async (product: Product) => {
        setLoadingDetails(true);
        setModalMode("view");
        setShowModal(true);
        try {
            const res = await fetch(`${API}/admin/products/${product._id}`, {
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to fetch product details");
            const json = await res.json();
            const fullProduct = json.data || product;
            setSelectedProduct(fullProduct);
            setEditingId(product._id);
            setFormData({
                name: fullProduct.name || "",
                price: String(fullProduct.price || 0),
                discountPrice: String(fullProduct.discountPrice || 0),
                stock: String(fullProduct.stock || fullProduct.quantity || 0),
                weight: fullProduct.weight !== undefined && fullProduct.weight !== null ? String(fullProduct.weight) : "",
                status: fullProduct.status === "active" || fullProduct.status === 1 ? "active" : "inactive",
                isRecentLaunch: !!fullProduct.isRecentLaunch,
                isCombo: !!fullProduct.isCombo,
                categoryId: fullProduct.categoryId?._id || fullProduct.categoryId || "",
                description: fullProduct.description || "",
                image: fullProduct.image || "",
                images: Array.isArray(fullProduct.images) ? fullProduct.images.join(", ") : "",
            });
        } catch (e: any) {
            setError(e?.message || "Failed to load product details");
            setSelectedProduct(product);
            setEditingId(product._id);
            setFormData({
                name: product.name || "",
                price: String(product.price || 0),
                discountPrice: String(product.discountPrice || 0),
                stock: String(product.stock || 0),
                weight: product.weight !== undefined && product.weight !== null ? String(product.weight) : "",
                status: product.status === "active" || product.status === 1 ? "active" : "inactive",
                isRecentLaunch: !!product.isRecentLaunch,
                isCombo: !!product.isCombo,
                categoryId: (product as any).categoryId?._id || (product as any).categoryId || "",
                description: product.description || "",
                image: product.image || "",
                images: Array.isArray(product.images) ? product.images.join(", ") : "",
            });
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this product?")) return;
        try {
            const res = await fetch(`${API}/admin/products/${id}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (!res.ok) throw new Error("Delete failed");
            setItems(items.filter((p) => p._id !== id));
            setSuccess("Product deleted successfully");
            setTimeout(() => setSuccess(null), 3000);
        } catch (e: any) {
            setError(e?.message || "Failed to delete product");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const method = editingId ? "PUT" : "POST";
            const endpoint = editingId ? `${API}/admin/products/${editingId}` : `${API}/admin/products`;
            const res = await fetch(endpoint, {
                method,
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    name: formData.name,
                    price: parseFloat(formData.price),
                    discountPrice: formData.discountPrice ? parseFloat(formData.discountPrice) : undefined,
                    stock: parseInt(formData.stock),
                    weight: formData.weight.trim() ? parseInt(formData.weight.trim(), 10) : undefined,
                    status: formData.status,
                    isRecentLaunch: formData.isRecentLaunch,
                    isCombo: formData.isCombo,
                    categoryId: formData.categoryId || undefined,
                    description: formData.description || undefined,
                    image: formData.image || undefined,
                    images: formData.images ? formData.images.split(',').map(s => s.trim()).filter(Boolean) : undefined,
                }),
            });
            if (!res.ok) throw new Error("Save failed");
            const updatedProduct = await res.json();
            const savedProduct = updatedProduct.data || updatedProduct;
            if (editingId) {
                setItems(items.map((p) => (p._id === editingId ? { ...p, ...savedProduct } : p)));
                setSuccess("Product updated successfully");
            } else {
                setItems([...items, savedProduct]);
                setSuccess("Product created successfully");
            }
            setShowModal(false);
            setEditingId(null);
            setFormData(createEmptyForm());
            setSelectedProduct(null);
            setModalMode("create");
            setTimeout(() => setSuccess(null), 3000);
        } catch (e: any) {
            setError(e?.message || "Failed to save product");
        }
    };

    const handleToggleRecentLaunch = async (product: Product) => {
        setTogglingId(product._id);
        try {
            const res = await fetch(`${API}/admin/products/${product._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ isRecentLaunch: !product.isRecentLaunch }),
            });
            if (!res.ok) throw new Error("Update failed");
            const json = await res.json();
            const savedProduct = json.data || json;
            setItems((prev) => prev.map((p) => (p._id === product._id ? { ...p, ...savedProduct } : p)));
            setSuccess(savedProduct.isRecentLaunch ? "Marked as recent launch" : "Removed from recent launches");
            setTimeout(() => setSuccess(null), 3000);
        } catch (e: any) {
            setError(e?.message || "Failed to update recent launch flag");
        } finally {
            setTogglingId(null);
        }
    };

    const handleToggleCombo = async (product: Product) => {
        setTogglingId(product._id);
        try {
            const res = await fetch(`${API}/admin/products/${product._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ isCombo: !product.isCombo }),
            });
            if (!res.ok) throw new Error("Update failed");
            const json = await res.json();
            const savedProduct = json.data || json;
            setItems((prev) => prev.map((p) => (p._id === product._id ? { ...p, ...savedProduct } : p)));
            setSuccess(savedProduct.isCombo ? "Marked as combo" : "Removed from combos");
            setTimeout(() => setSuccess(null), 3000);
        } catch (e: any) {
            setError(e?.message || "Failed to update combo flag");
        } finally {
            setTogglingId(null);
        }
    };

    const filteredProducts = items.filter((p) => {
      const q = search.toLowerCase();

      return (
        (p.name || "").toLowerCase().includes(q) ||
        (p.sku || "").toLowerCase().includes(q) ||
        (p.slug || "").toLowerCase().includes(q) ||
        (p.status || "").toString().toLowerCase().includes(q) ||
        (p.categoryId?.name || "").toLowerCase().includes(q)
      );
    });

    if (authLoading) {
        return (
            <div className="admin-page-header">
                <h1>Loading...</h1>
            </div>
        );
    }

    if (authError) {
        return (
            <div className="admin-page-header">
                <h1>Access Denied</h1>
                <p style={{ color: "red" }}>{authError}</p>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="admin-page-header">
                <h1>Access Denied</h1>
                <p style={{ color: "red" }}>You do not have admin privileges</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="admin-page-header">
                <h1>Loading...</h1>
            </div>
        );
    }

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
              {/* Left Side */}
                <div>
                  <h1>Products</h1>
                  <p>Manage your product inventory</p>

                  {/* ✅ Button नीचे आ गया */}
                  <button
                    onClick={() => {
                      setModalMode("create");
                      setSelectedProduct(null);
                      setEditingId(null);
                      setFormData(createEmptyForm());
                      setShowModal(true);
                    }}
                    style={{
                      padding: "8px 16px",
                      background: "#0f172a",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      marginTop: 10,
                    }}
                  >
                    Add New Product
                  </button>
                </div>
                
                {/* ✅ Right Side Refresh */}
                <RefreshButton onRefresh={loadProducts} loading={loading} />
            </div>

            {error && (
                <div style={{ background: "#fee2e2", color: "#991b1b", padding: 16, borderRadius: 8, marginBottom: 20 }}>
                    {error}
                </div>
            )}

            {success && (
                <div style={{ background: "#dcfce7", color: "#166534", padding: 16, borderRadius: 8, marginBottom: 20 }}>
                    {success}
                </div>
            )}

            {showModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 40, overflowY: "auto", padding: "20px 0" }}>
                    <div style={{ background: "#fff", color: "#0f172a", padding: 24, borderRadius: 10, width: "min(920px, 95vw)", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 15px 50px rgba(0,0,0,0.25)", margin: "auto" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 20, borderBottom: "2px solid #e5e7eb", paddingBottom: 16 }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: 22 }}>{modalMode === "edit" ? "Edit Product" : modalMode === "view" ? "Product Details" : "Add New Product"}</h3>
                                {selectedProduct && (
                                    <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
                                        <span style={{ color: "#6b7280", fontSize: 13 }}>{selectedProduct.sku || selectedProduct._id}</span>
                                        <span className={`admin-badge ${selectedProduct.status === "active" || selectedProduct.status === 1 ? 'success' : 'danger'}`} style={{ fontSize: 11 }}>
                                            {selectedProduct.status === 1 || selectedProduct.status === "active" ? "Active" : "Inactive"}
                                        </span>
                                        {selectedProduct.isRecentLaunch && (
                                            <span className="admin-badge info" style={{ fontSize: 11 }}>Recent Launch</span>
                                        )}
                                        {selectedProduct.isCombo && (
                                            <span className="admin-badge" style={{ fontSize: 11, background: "#8b5cf6", color: "#fff" }}>Combo</span>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                                {modalMode === "view" && selectedProduct && (
                                    <button
                                        onClick={() => setModalMode("edit")}
                                        style={{ padding: "6px 12px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14 }}
                                    >
                                        Edit
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        setShowModal(false);
                                        setSelectedProduct(null);
                                        setEditingId(null);
                                        setModalMode("create");
                                        setFormData(createEmptyForm());
                                    }}
                                    style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 24, lineHeight: 1 }}
                                    aria-label="Close product modal"
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        {loadingDetails ? (
                            <div style={{ textAlign: "center", padding: 40 }}>
                                <p>Loading product details...</p>
                            </div>
                        ) : modalMode === "view" && selectedProduct ? (
                            <>
                                {/* Product Images */}
                                <div style={{ marginBottom: 24 }}>
                                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                                        {selectedProduct.image && (
                                            <img src={`/${selectedProduct.image}`} alt={selectedProduct.name || 'Product'} style={{ width: 200, height: 200, objectFit: "cover", borderRadius: 8, border: "1px solid #e5e7eb" }} />
                                        )}
                                        {selectedProduct.images && selectedProduct.images.map((img, idx) => (
                                            <img key={idx} src={`/${img}`} alt="" style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 8, border: "1px solid #e5e7eb" }} />
                                        ))}
                                    </div>
                                </div>

                                {/* Basic Info */}
                                <div style={{ marginBottom: 24 }}>
                                    <h4 style={{ margin: "0 0 12px 0", fontSize: 16, color: "#374151" }}>Basic Information</h4>
                                    <div style={{ background: "#f9fafb", padding: 16, borderRadius: 8, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, fontSize: 14 }}>
                                        <div><strong>Name:</strong> {selectedProduct.name || selectedProduct.title || "N/A"}</div>
                                        <div><strong>SKU:</strong> {selectedProduct.sku || "N/A"}</div>
                                        <div><strong>Slug:</strong> {selectedProduct.slug || "N/A"}</div>
                                        <div><strong>Category:</strong> {selectedProduct.categoryId?.name || "N/A"}</div>
                                    </div>
                                </div>

                                {/* Description */}
                                {selectedProduct.description && (
                                    <div style={{ marginBottom: 24 }}>
                                        <h4 style={{ margin: "0 0 12px 0", fontSize: 16, color: "#374151" }}>Description</h4>
                                        <div style={{ background: "#f9fafb", padding: 16, borderRadius: 8, fontSize: 14, lineHeight: 1.6 }}>
                                            {selectedProduct.description}
                                        </div>
                                    </div>
                                )}

                                {/* Pricing & Stock */}
                                <div style={{ marginBottom: 24 }}>
                                    <h4 style={{ margin: "0 0 12px 0", fontSize: 16, color: "#374151" }}>Pricing & Stock</h4>
                                    <div style={{ background: "#f9fafb", padding: 16, borderRadius: 8, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, fontSize: 14 }}>
                                        <div><strong>Price:</strong> ₹{selectedProduct.price || 0}</div>
                                        <div><strong>Sale Price:</strong> ₹{selectedProduct.salePrice || selectedProduct.discountedPrice || selectedProduct.discountPrice || 0}</div>
                                        <div><strong>Discount:</strong> {selectedProduct.discount || 0}%</div>
                                        <div><strong>Stock:</strong> {selectedProduct.stock || selectedProduct.quantity || 0} units</div>
                                    </div>
                                </div>

                                {/* Product Specifications */}
                                {(selectedProduct.material || selectedProduct.weight || selectedProduct.shelfLife || selectedProduct.dietType || selectedProduct.storage || selectedProduct.country) && (
                                    <div style={{ marginBottom: 24 }}>
                                        <h4 style={{ margin: "0 0 12px 0", fontSize: 16, color: "#374151" }}>Specifications</h4>
                                        <div style={{ background: "#f9fafb", padding: 16, borderRadius: 8, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, fontSize: 14 }}>
                                            {selectedProduct.material && <div><strong>Material:</strong> {selectedProduct.material}</div>}
                                            {selectedProduct.style && <div><strong>Style:</strong> {selectedProduct.style}</div>}
                                            {selectedProduct.weight && <div><strong>Weight:</strong> {selectedProduct.weight}</div>}
                                            {selectedProduct.shelfLife && <div><strong>Shelf Life:</strong> {selectedProduct.shelfLife}</div>}
                                            {selectedProduct.dietType && <div><strong>Diet Type:</strong> {selectedProduct.dietType}</div>}
                                            {selectedProduct.storage && <div><strong>Storage:</strong> {selectedProduct.storage}</div>}
                                            {selectedProduct.country && <div><strong>Country:</strong> {selectedProduct.country}</div>}
                                        </div>
                                    </div>
                                )}

                                {/* Features */}
                                {selectedProduct.features && (
                                    <div style={{ marginBottom: 24 }}>
                                        <h4 style={{ margin: "0 0 12px 0", fontSize: 16, color: "#374151" }}>Features</h4>
                                        <div style={{ background: "#f9fafb", padding: 16, borderRadius: 8, fontSize: 14, lineHeight: 1.6 }}>
                                            {selectedProduct.features}
                                        </div>
                                    </div>
                                )}

                                {/* Reviews & Ratings */}
                                <div style={{ marginBottom: 24 }}>
                                    <h4 style={{ margin: "0 0 12px 0", fontSize: 16, color: "#374151" }}>Reviews & Ratings</h4>
                                    <div style={{ background: "#f9fafb", padding: 16, borderRadius: 8, display: "flex", gap: 20, fontSize: 14 }}>
                                        <div><strong>Rating:</strong> {selectedProduct.rating || 0} / 5</div>
                                        <div><strong>Total Reviews:</strong> {selectedProduct.reviewCount || 0}</div>
                                    </div>
                                </div>

                                {/* SEO Meta */}
                                {(selectedProduct.metaTitle || selectedProduct.metaDescription || selectedProduct.metaKeywords) && (
                                    <div style={{ marginBottom: 24 }}>
                                        <h4 style={{ margin: "0 0 12px 0", fontSize: 16, color: "#374151" }}>SEO Meta</h4>
                                        <div style={{ background: "#f9fafb", padding: 16, borderRadius: 8, fontSize: 14 }}>
                                            {selectedProduct.metaTitle && <div style={{ marginBottom: 8 }}><strong>Meta Title:</strong> {selectedProduct.metaTitle}</div>}
                                            {selectedProduct.metaDescription && <div style={{ marginBottom: 8 }}><strong>Meta Description:</strong> {selectedProduct.metaDescription}</div>}
                                            {selectedProduct.metaKeywords && <div><strong>Meta Keywords:</strong> {selectedProduct.metaKeywords}</div>}
                                        </div>
                                    </div>
                                )}

                                {/* Timestamps */}
                                <div style={{ marginBottom: 24 }}>
                                    <h4 style={{ margin: "0 0 12px 0", fontSize: 16, color: "#374151" }}>Timestamps</h4>
                                    <div style={{ background: "#f9fafb", padding: 16, borderRadius: 8, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, fontSize: 14 }}>
                                        <div><strong>Created:</strong> {selectedProduct.createdAt ? new Date(selectedProduct.createdAt).toLocaleString() : "N/A"}</div>
                                        <div><strong>Updated:</strong> {selectedProduct.updatedAt ? new Date(selectedProduct.updatedAt).toLocaleString() : "N/A"}</div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <form onSubmit={handleSubmit}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15, marginBottom: 15 }}>
                                    <input
                                        type="text"
                                        placeholder="Product Name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                        style={{ padding: 10, border: "1px solid var(--text-2)", borderRadius: 6 }}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Price"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        required
                                        style={{ padding: 10, border: "1px solid var(--text-2)", borderRadius: 6 }}
                                    />
                                    <select
                                        value={formData.categoryId}
                                        onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                        style={{ padding: 10, border: "1px solid var(--text-2)", borderRadius: 6, gridColumn: "1 / -1" }}
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map((cat) => (
                                            <option key={cat._id} value={cat._id}>
                                                {cat.name || cat.slug || cat._id}
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        placeholder="Discount Price"
                                        value={formData.discountPrice}
                                        onChange={(e) => setFormData({ ...formData, discountPrice: e.target.value })}
                                        style={{ padding: 10, border: "1px solid var(--text-2)", borderRadius: 6 }}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Stock"
                                        value={formData.stock}
                                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                        required
                                        style={{ padding: 10, border: "1px solid var(--text-2)", borderRadius: 6 }}
                                    />
                                    <input
                                        type="number"
                                        min={0}
                                        step={1}
                                        placeholder="Weight in grams (e.g., 500)"
                                        value={formData.weight}
                                        onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                                        style={{ padding: 10, border: "1px solid var(--text-2)", borderRadius: 6 }}
                                    />
                                </div>
                                <div style={{ marginBottom: 15 }}>
                                    <textarea
                                        placeholder="Description"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        style={{ padding: 10, border: "1px solid var(--text-2)", borderRadius: 6, width: "100%", minHeight: 90, fontFamily: "inherit" }}
                                    />
                                </div>
                                <div style={{ marginBottom: 15 }}>
                                    <input
                                        type="text"
                                        placeholder="Main Image URL (e.g., product-name.png)"
                                        value={formData.image}
                                        onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                                        style={{ padding: 10, border: "1px solid var(--text-2)", borderRadius: 6, width: "100%" }}
                                    />
                                    <small style={{ color: "#6b7280", fontSize: 12, display: "block", marginTop: 4 }}>Path will be: /assets/uploaded/item/your-image.png</small>
                                </div>
                                <div style={{ marginBottom: 15 }}>
                                    <textarea
                                        placeholder="Additional Images (comma-separated, e.g., img1.png, img2.png)"
                                        value={formData.images}
                                        onChange={(e) => setFormData({ ...formData, images: e.target.value })}
                                        style={{ padding: 10, border: "1px solid var(--text-2)", borderRadius: 6, width: "100%", minHeight: 60, fontFamily: "inherit" }}
                                    />
                                    <small style={{ color: "#6b7280", fontSize: 12, display: "block", marginTop: 4 }}>Separate multiple images with commas</small>
                                </div>
                                <div style={{ marginBottom: 15 }}>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        style={{ padding: 10, border: "1px solid var(--text-2)", borderRadius: 6, width: "100%" }}
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                                <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 15 }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.isRecentLaunch}
                                        onChange={(e) => setFormData({ ...formData, isRecentLaunch: e.target.checked })}
                                    />
                                    <span>Mark as Recent Launch</span>
                                </label>
                                <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 15 }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.isCombo}
                                        onChange={(e) => setFormData({ ...formData, isCombo: e.target.checked })}
                                    />
                                    <span>Mark as Combo (Health Hamper)</span>
                                </label>
                                <div style={{ display: "flex", gap: 10 }}>
                                    <button
                                        type="submit"
                                        style={{
                                            padding: "10px 16px",
                                            background: "#059669",
                                            color: "#fff",
                                            border: "none",
                                            borderRadius: 6,
                                            cursor: "pointer",
                                        }}
                                    >
                                        {editingId ? "Update Product" : "Create Product"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowModal(false);
                                            setSelectedProduct(null);
                                            setEditingId(null);
                                            setModalMode("create");
                                            setFormData(createEmptyForm());
                                        }}
                                        style={{
                                            padding: "10px 16px",
                                            background: "#9ca3af",
                                            color: "#fff",
                                            border: "none",
                                            borderRadius: 6,
                                            cursor: "pointer",
                                        }}
                                    >
                                        Close
                                    </button>
                                </div>
                            </form>
                        )}
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
                    gap: 20,
                  }}
                >
                  <div>
                    <h3 style={{ margin: 0 }}>
                      All Products ({filteredProducts.length})
                    </h3>
              
                    <div style={{ fontSize: 13, color: "var(--text-2)" }}>
                      Page {page} · Showing {filteredProducts.length} of {total}
                    </div>
                  </div>
              
                  {/* ✅ Search */}
                  <AdminSearchFilter
                    search={search}
                    setSearch={setSearch}
                    placeholder="Search products..."
                  />
                </div>

                <table className="admin-table">
                    <thead>
                        <tr>
                            <th style={{ width: 80 }}>Image</th>
                            <th>Name</th>
                            <th>Price</th>
                            <th>Stock</th>
                            <th>Status</th>
                            <th>Recent</th>
                            <th>Combo</th>
                            <th style={{ width: 150 }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.length > 0 ? (
                            filteredProducts.map((product) => (
                                <tr key={product._id}>
                                    <td>
                                        {product.image ? (
                                            <Image
                                                src={`/${product.image}`}
                                                alt={product.name || 'Product'}
                                                width={50}
                                                height={50}
                                                style={{ objectFit: 'cover', borderRadius: 6 }}
                                            />
                                        ) : (
                                            <div style={{ width: 50, height: 50, background: 'var(--bg-2)', borderRadius: 6 }}></div>
                                        )}
                                    </td>
                                    <td>
                                        <strong>{product.name ?? "-"}</strong>
                                    </td>
                                    <td>
                                        {product.discountPrice && product.discountPrice < (product.price || 0) ? (
                                            <>
                                                <strong>₹{product.discountPrice}</strong>{' '}
                                                <del style={{ color: 'var(--text-2)', fontSize: 13 }}>₹{product.price}</del>
                                            </>
                                        ) : (
                                            <strong>₹{product.price ?? 0}</strong>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`admin-badge ${(product.stock || 0) > 0 ? 'success' : 'danger'}`}>
                                            {product.stock ?? 0} units
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`admin-badge ${product.status === 1 || product.status === "active" ? 'success' : 'danger'}`}>
                                            {product.status === 1 || product.status === "active" ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            onClick={() => handleToggleRecentLaunch(product)}
                                            disabled={togglingId === product._id}
                                            style={{
                                                padding: "6px 10px",
                                                background: product.isRecentLaunch ? "#0ea5e9" : "#e5e7eb",
                                                color: product.isRecentLaunch ? "#fff" : "#111",
                                                border: "none",
                                                borderRadius: 4,
                                                cursor: togglingId === product._id ? "wait" : "pointer",
                                                fontSize: 12,
                                            }}
                                        >
                                            {product.isRecentLaunch ? "Recent" : "Not Recent"}
                                        </button>
                                    </td>
                                    <td>
                                        <button
                                            onClick={() => handleToggleCombo(product)}
                                            disabled={togglingId === product._id}
                                            style={{
                                                padding: "6px 10px",
                                                background: product.isCombo ? "#8b5cf6" : "#e5e7eb",
                                                color: product.isCombo ? "#fff" : "#111",
                                                border: "none",
                                                borderRadius: 4,
                                                cursor: togglingId === product._id ? "wait" : "pointer",
                                                fontSize: 12,
                                            }}
                                        >
                                            {product.isCombo ? "Combo" : "Not Combo"}
                                        </button>
                                    </td>
                                    <td>
                                        <button
                                            onClick={() => handleEdit(product)}
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
                                            onClick={() => handleDelete(product._id)}
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
                                <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-2)' }}>
                                    No products found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, padding: "0 20px 20px", flexWrap: "wrap", gap: 16 }}>
                    <button
                        onClick={() => goToPage(Math.max(1, page - 1))}
                        disabled={page === 1 || loading}
                        style={{
                            padding: "10px 20px",
                            borderRadius: 20,
                            border: "none",
                            background: page === 1 || loading ? "#e5e7eb" : "#FF6600",
                            color: page === 1 || loading ? "#9ca3af" : "#fff",
                            cursor: page === 1 || loading ? "not-allowed" : "pointer",
                            fontWeight: 500,
                            fontSize: 14,
                            transition: "all 0.3s ease",
                        }}
                        onMouseEnter={(e) => {
                            if (page !== 1 && !loading) {
                                e.currentTarget.style.backgroundColor = "#E55B00";
                                e.currentTarget.style.transform = "translateY(-2px)";
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (page !== 1 && !loading) {
                                e.currentTarget.style.backgroundColor = "#FF6600";
                                e.currentTarget.style.transform = "translateY(0)";
                            }
                        }}
                    >
                        Prev
                    </button>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                        <span>Page {page}</span>
                        <span style={{ color: "var(--text-2)" }}>
                            {Math.min((page - 1) * pageSize + 1, total || 0)} - {Math.min(page * pageSize, total || (page * pageSize))}
                        </span>
                    </div>
                    <button
                        onClick={() => goToPage(page + 1)}
                        disabled={loading || ((page * pageSize) >= total && items.length < pageSize)}
                        style={{
                            padding: "10px 20px",
                            borderRadius: 20,
                            border: "none",
                            background: loading || ((page * pageSize) >= total && items.length < pageSize) ? "#e5e7eb" : "#FF6600",
                            color: loading || ((page * pageSize) >= total && items.length < pageSize) ? "#9ca3af" : "#fff",
                            cursor: loading || ((page * pageSize) >= total && items.length < pageSize) ? "not-allowed" : "pointer",
                            fontWeight: 500,
                            fontSize: 14,
                            transition: "all 0.3s ease",
                        }}
                        onMouseEnter={(e) => {
                            if (!loading && !((page * pageSize) >= total && items.length < pageSize)) {
                                e.currentTarget.style.backgroundColor = "#E55B00";
                                e.currentTarget.style.transform = "translateY(-2px)";
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!loading && !((page * pageSize) >= total && items.length < pageSize)) {
                                e.currentTarget.style.backgroundColor = "#FF6600";
                                e.currentTarget.style.transform = "translateY(0)";
                            }
                        }}
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}
