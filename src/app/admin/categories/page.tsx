"use client";
import { useEffect, useState } from "react";
import { useAdminAuth } from "../../../hooks/useAdminAuth";

type Category = {
    _id: string;
    name?: string;
    slug?: string;
    description?: string;
    image?: string;
    level?: number;
    status?: string;
    isActive?: boolean;
    parentId?: string;
    createdAt?: string;
    updatedAt?: string;
    productCount?: number;
};

export default function AdminCategoriesPage() {
    const { isAdmin, loading: authLoading, error: authError } = useAdminAuth();
    const [items, setItems] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<"create" | "edit" | "view">("create");
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [formData, setFormData] = useState({ name: "", status: "active", image: "" });
    const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

    useEffect(() => {
        if (!isAdmin || authLoading) return;

        async function load() {
            try {
                const res = await fetch(`${API}/admin/categories`, {
                    credentials: "include",
                });
                const json = await res.json();
                setItems(json.data || json || []);
                setLoading(false);
            } catch (e: any) {
                setError(e?.message || "Failed to load categories");
                setLoading(false);
            }
        }
        load();
    }, [isAdmin, authLoading, API]);

    const handleEdit = async (category: Category) => {
        setLoadingDetails(true);
        setModalMode("view");
        setShowModal(true);
        try {
            const [catRes, productsRes] = await Promise.all([
                fetch(`${API}/admin/categories`, { credentials: "include" }),
                fetch(`${API}/admin/products?categoryId=${category._id}&limit=1`, { credentials: "include" })
            ]);
            const catJson = await catRes.json();
            const productsJson = await productsRes.json();
            const fullCategory = (catJson.data || []).find((c: any) => c._id === category._id) || category;
            fullCategory.productCount = productsJson.pagination?.total || 0;
            setSelectedCategory(fullCategory);
            setEditingId(category._id);
            setFormData({
                name: fullCategory.name || "",
                status: fullCategory.status === "active" ? "active" : "inactive",
                image: fullCategory.image || "",
            });
        } catch (e: any) {
            setError(e?.message || "Failed to load category details");
            setSelectedCategory(category);
            setEditingId(category._id);
            setFormData({
                name: category.name || "",
                status: category.status === "active" ? "active" : "inactive",
                image: category.image || "",
            });
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this category?")) return;
        try {
            const res = await fetch(`${API}/admin/categories/${id}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (!res.ok) throw new Error("Delete failed");
            setItems(items.filter((c) => c._id !== id));
            setSuccess("Category deleted successfully");
            setTimeout(() => setSuccess(null), 3000);
        } catch (e: any) {
            setError(e?.message || "Failed to delete category");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const method = editingId ? "PUT" : "POST";
            const endpoint = editingId ? `${API}/admin/categories/${editingId}` : `${API}/admin/categories`;
            const res = await fetch(endpoint, {
                method,
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    name: formData.name,
                    status: formData.status,
                    image: formData.image || undefined,
                }),
            });
            if (!res.ok) throw new Error("Save failed");
            const updatedCategory = await res.json();
            const savedCategory = updatedCategory.data || updatedCategory;
            if (editingId) {
                setItems(items.map((c) => (c._id === editingId ? savedCategory : c)));
                setSuccess("Category updated successfully");
            } else {
                // Ensure the new category has an _id before adding to list
                if (savedCategory && savedCategory._id) {
                    setItems([...items, savedCategory]);
                    setSuccess("Category created successfully");
                } else {
                    // Reload the list to get the new category
                    const refreshRes = await fetch(`${API}/admin/categories`, { credentials: "include" });
                    const refreshJson = await refreshRes.json();
                    setItems(refreshJson.data || []);
                    setSuccess("Category created successfully");
                }
            }
            setShowModal(false);
            setEditingId(null);
            setSelectedCategory(null);
            setModalMode("create");
            setFormData({ name: "", status: "active", image: "" });
            setTimeout(() => setSuccess(null), 3000);
        } catch (e: any) {
            setError(e?.message || "Failed to save category");
        }
    };

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
            <div className="admin-page-header">
                <h1>Categories</h1>
                <p>Manage product categories</p>
                <button
                    onClick={() => {
                        setModalMode("create");
                        setSelectedCategory(null);
                        setEditingId(null);
                        setFormData({ name: "", status: "active", image: "" });
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
                    Add New Category
                </button>
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
                    <div style={{ background: "#fff", color: "#0f172a", padding: 24, borderRadius: 10, width: "min(720px, 94vw)", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 15px 50px rgba(0,0,0,0.25)", margin: "auto" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 20, borderBottom: "2px solid #e5e7eb", paddingBottom: 16 }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: 22 }}>{modalMode === "edit" ? "Edit Category" : modalMode === "view" ? "Category Details" : "Add New Category"}</h3>
                                {selectedCategory && (
                                    <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
                                        <span style={{ color: "#6b7280", fontSize: 13 }}>{selectedCategory.slug}</span>
                                        <span className={`admin-badge ${selectedCategory.status === "active" ? 'success' : 'danger'}`} style={{ fontSize: 11 }}>
                                            {selectedCategory.status === "active" ? "Active" : "Inactive"}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                                {modalMode === "view" && selectedCategory && (
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
                                        setSelectedCategory(null);
                                        setEditingId(null);
                                        setModalMode("create");
                                        setFormData({ name: "", status: "active", image: "" });
                                    }}
                                    style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 24, lineHeight: 1 }}
                                    aria-label="Close category modal"
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        {loadingDetails ? (
                            <div style={{ textAlign: "center", padding: 40 }}>
                                <p>Loading category details...</p>
                            </div>
                        ) : modalMode === "view" && selectedCategory ? (
                            <>
                                {/* Category Image */}
                                {selectedCategory.image && (
                                    <div style={{ marginBottom: 24, textAlign: "center" }}>
                                        <img src={`/assets/images/${selectedCategory.slug}.png`} alt={selectedCategory.name || 'Category'} style={{ maxWidth: "100%", height: "auto", borderRadius: 8, border: "1px solid #e5e7eb" }} />
                                    </div>
                                )}

                                {/* Basic Info */}
                                <div style={{ marginBottom: 24 }}>
                                    <h4 style={{ margin: "0 0 12px 0", fontSize: 16, color: "#374151" }}>Basic Information</h4>
                                    <div style={{ background: "#f9fafb", padding: 16, borderRadius: 8, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, fontSize: 14 }}>
                                        <div><strong>Name:</strong> {selectedCategory.name || "N/A"}</div>
                                        <div><strong>Slug:</strong> {selectedCategory.slug || "N/A"}</div>
                                        <div><strong>Level:</strong> {selectedCategory.level || 0}</div>
                                        <div><strong>Status:</strong> {selectedCategory.status || "inactive"}</div>
                                    </div>
                                </div>

                                {/* Description */}
                                {selectedCategory.description && (
                                    <div style={{ marginBottom: 24 }}>
                                        <h4 style={{ margin: "0 0 12px 0", fontSize: 16, color: "#374151" }}>Description</h4>
                                        <div style={{ background: "#f9fafb", padding: 16, borderRadius: 8, fontSize: 14, lineHeight: 1.6 }}>
                                            {selectedCategory.description}
                                        </div>
                                    </div>
                                )}

                                {/* Product Count */}
                                <div style={{ marginBottom: 24 }}>
                                    <h4 style={{ margin: "0 0 12px 0", fontSize: 16, color: "#374151" }}>Products</h4>
                                    <div style={{ background: "#f9fafb", padding: 16, borderRadius: 8, fontSize: 14 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                            <span style={{ fontSize: 32, fontWeight: "bold", color: "#3b82f6" }}>{selectedCategory.productCount || 0}</span>
                                            <span>products in this category</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Timestamps */}
                                <div style={{ marginBottom: 24 }}>
                                    <h4 style={{ margin: "0 0 12px 0", fontSize: 16, color: "#374151" }}>Timestamps</h4>
                                    <div style={{ background: "#f9fafb", padding: 16, borderRadius: 8, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, fontSize: 14 }}>
                                        <div><strong>Created:</strong> {selectedCategory.createdAt ? new Date(selectedCategory.createdAt).toLocaleString() : "N/A"}</div>
                                        <div><strong>Updated:</strong> {selectedCategory.updatedAt ? new Date(selectedCategory.updatedAt).toLocaleString() : "N/A"}</div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <form onSubmit={handleSubmit}>
                                <div style={{ marginBottom: 15 }}>
                                    <input
                                        type="text"
                                        placeholder="Category Name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                        style={{ padding: 10, border: "1px solid var(--text-2)", borderRadius: 6, width: "100%" }}
                                    />
                                </div>
                                <div style={{ marginBottom: 15 }}>
                                    <input
                                        type="text"
                                        placeholder="Image URL (e.g., category-name.png)"
                                        value={formData.image}
                                        onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                                        style={{ padding: 10, border: "1px solid var(--text-2)", borderRadius: 6, width: "100%" }}
                                    />
                                    <small style={{ color: "#6b7280", fontSize: 12, display: "block", marginTop: 4 }}>Path will be: /assets/uploaded/menu_category/your-image.png</small>
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
                                        {editingId ? "Update Category" : "Create Category"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowModal(false);
                                            setSelectedCategory(null);
                                            setEditingId(null);
                                            setModalMode("create");
                                            setFormData({ name: "", status: "active", image: "" });
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
                <div className="admin-table-header">
                    <h3>All Categories ({items.length})</h3>
                </div>
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Slug</th>
                            <th>Status</th>
                            <th style={{ width: 150 }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length > 0 ? (
                            items.map((category, index) => (
                                <tr key={category._id || `category-${index}`}>
                                    <td>
                                        <strong>{category.name ?? "-"}</strong>
                                    </td>
                                    <td>
                                        <code style={{ fontSize: 12 }}>{category.slug ?? "-"}</code>
                                    </td>
                                    <td>
                                        <span className={`admin-badge ${category.status === "active" ? 'success' : 'danger'}`}>
                                            {category.status === "active" ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            onClick={() => handleEdit(category)}
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
                                            onClick={() => handleDelete(category._id)}
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
                                <td colSpan={4} style={{ textAlign: 'center', padding: 40, color: 'var(--text-2)' }}>
                                    No categories found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
