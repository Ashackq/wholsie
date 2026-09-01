"use client";
import { useEffect, useState, useCallback } from "react";
import { useAdminAuth } from "../../../hooks/useAdminAuth";
import AdminSearchFilter from "../../../components/AdminSearchFilter";
import RefreshButton from "../../../components/RefreshButton";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

// ── Types ─────────────────────────────────────────────────────────────────────

type MediaType = "video" | "gif" | "image" | "youtube" | "instagram";

interface MediaItem {
  _id: string;
  mediaType: MediaType;
  filePath?: string;
  embedUrl?: string;
  thumbnail?: string;
  title?: string;
  caption?: string;
  ctaText?: string;
  ctaUrl?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  order?: number;
  isActive?: boolean;
  createdAt?: string;
}

const emptyForm = (): any => ({
  mediaType: "image" as MediaType,
  embedUrl: "",
  title: "",
  caption: "",
  ctaText: "",
  ctaUrl: "",
  autoplay: true,
  loop: true,
  muted: true,
  order: "0",
  isActive: true,
});

function authToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
}

function authHeader(): HeadersInit {
  const token = authToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function isHosted(type: MediaType) {
  return type === "video" || type === "gif" || type === "image";
}

export default function AdminMediaPage() {
  const { isAdmin, loading: authLoading, error: authError } = useAdminAuth();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(emptyForm());
  const [fileInput, setFileInput] = useState<File | null>(null);
  const [thumbInput, setThumbInput] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/media`, { headers: authHeader() });
      const json = await res.json();
      setItems(json.data || []);
    } catch {
      setError("Failed to load media items");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin || authLoading) return;
    fetchItems();
  }, [isAdmin, authLoading, fetchItems]);

  function flashSuccess(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  }

  function openCreate() {
    setForm(emptyForm());
    setFileInput(null);
    setThumbInput(null);
    setModalMode("create");
    setEditingId(null);
    setShowModal(true);
    setError(null);
  }

  function openEdit(item: MediaItem) {
    setForm({
      mediaType: item.mediaType,
      embedUrl: item.embedUrl || "",
      title: item.title || "",
      caption: item.caption || "",
      ctaText: item.ctaText || "",
      ctaUrl: item.ctaUrl || "",
      autoplay: item.autoplay !== false,
      loop: item.loop !== false,
      muted: item.muted !== false,
      order: item.order ?? "0",
      isActive: item.isActive !== false,
    });
    setFileInput(null);
    setThumbInput(null);
    setModalMode("edit");
    setEditingId(item._id);
    setShowModal(true);
    setError(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (modalMode === "create" && isHosted(form.mediaType) && !fileInput) {
      setError(`Please select a ${form.mediaType === "video" ? "video" : "image/GIF"} file to upload`);
      return;
    }

    if (!isHosted(form.mediaType) && !form.embedUrl?.trim()) {
      setError(`Please enter a valid ${form.mediaType === "youtube" ? "YouTube" : "Instagram"} URL`);
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();

      Object.entries(form).forEach(([key, val]) => {
        fd.append(key, String(val));
      });

      if (fileInput) fd.append("file", fileInput);
      if (thumbInput) fd.append("thumbnail", thumbInput);

      const token = authToken();
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

      const url = modalMode === "create"
        ? `${API}/admin/media`
        : `${API}/admin/media/${editingId}`;
      const method = modalMode === "create" ? "POST" : "PUT";

      const res = await fetch(url, { method, headers, body: fd });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Save failed");
        return;
      }
      flashSuccess(json.message || "Saved successfully");
      setShowModal(false);
      fetchItems();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(item: MediaItem) {
    try {
      await fetch(`${API}/admin/media/${item._id}/toggle-active`, { method: "PATCH", headers: authHeader() });
      flashSuccess(item.isActive ? "Media hidden from homepage" : "Media set to visible");
      fetchItems();
    } catch {
      setError("Failed to update status");
    }
  }

  async function handleDelete(item: MediaItem) {
    if (!confirm(`Delete "${item.title || item.mediaType}" media item? The uploaded file will also be removed.`)) return;
    try {
      const res = await fetch(`${API}/admin/media/${item._id}`, { method: "DELETE", headers: authHeader() });
      if (!res.ok) throw new Error("Delete failed");
      flashSuccess("Media item deleted successfully");
      fetchItems();
    } catch {
      setError("Failed to delete media item");
    }
  }

  function f(key: string, val: any) {
    setForm((prev: any) => ({ ...prev, [key]: val }));
  }

  function mediaPreview(item: MediaItem) {
    const rawPath = item.filePath || item.thumbnail;
    const src = rawPath ? (rawPath.startsWith("/") ? rawPath : `/${rawPath}`) : "";

    const icons: Record<string, string> = {
      youtube: "fa-youtube",
      instagram: "fa-instagram",
      video: "fa-film",
      gif: "fa-image",
      image: "fa-image",
    };

    if (item.mediaType === "video" && src) {
      return (
        <video
          src={src}
          style={{ width: 64, height: 44, objectFit: "cover", borderRadius: 4 }}
          muted
        />
      );
    }
    if ((item.mediaType === "image" || item.mediaType === "gif") && src) {
      return (
        <img
          src={src}
          alt={item.title || "Media"}
          style={{ width: 64, height: 44, objectFit: "cover", borderRadius: 4 }}
          onError={(e) => {
            (e.target as HTMLElement).style.display = "none";
          }}
        />
      );
    }
    return (
      <div
        style={{
          width: 64,
          height: 44,
          background: "#f1f5f9",
          borderRadius: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid #e2e8f0",
        }}
      >
        <i className={`fab ${icons[item.mediaType] || "fa-photo-video"}`} style={{ color: "#64748b", fontSize: 18 }} />
      </div>
    );
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

  if (loading && items.length === 0) {
    return (
      <div className="admin-page-header">
        <h1>Loading...</h1>
      </div>
    );
  }

  const filteredItems = items.filter((item) => {
    const q = search.toLowerCase();
    return (
      (item.title || "").toLowerCase().includes(q) ||
      (item.caption || "").toLowerCase().includes(q) ||
      (item.mediaType || "").toLowerCase().includes(q) ||
      (item.ctaText || "").toLowerCase().includes(q)
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
          <h1>Homepage Media</h1>
          <p>Manage videos, GIFs, images, and embeds for the homepage section</p>
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
            Add New Media
          </button>
        </div>

        <RefreshButton onRefresh={fetchItems} loading={loading} />
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
                  {modalMode === "create" ? "Add Media Item" : "Edit Media Item"}
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
              {/* Section: Type */}
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ margin: "0 0 12px 0", fontSize: 15, color: "#374151", borderBottom: "1px solid #f3f4f6", paddingBottom: 6 }}>
                  Media Type
                </h4>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Media Type *</label>
                  <select
                    value={form.mediaType}
                    onChange={(e) => f("mediaType", e.target.value)}
                    style={{ padding: 10, border: "1px solid #d1d5db", borderRadius: 6, width: "100%", outline: "none" }}
                  >
                    <option value="image">Image (PNG, JPG, WebP)</option>
                    <option value="gif">GIF</option>
                    <option value="video">Video (MP4 / WebM)</option>
                    <option value="youtube">YouTube Embed</option>
                    <option value="instagram">Instagram Embed</option>
                  </select>
                </div>
              </div>

              {/* Section: Source */}
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ margin: "0 0 12px 0", fontSize: 15, color: "#374151", borderBottom: "1px solid #f3f4f6", paddingBottom: 6 }}>
                  Media Source
                </h4>
                {isHosted(form.mediaType) ? (
                  <>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                        {form.mediaType === "video" ? "Video File (MP4/WebM, max 50 MB)" : "Image / GIF File (max 50 MB)"}
                        {modalMode === "edit" && " — leave empty to keep current file"}
                      </label>
                      <input
                        type="file"
                        accept={form.mediaType === "video" ? "video/mp4,video/webm,video/ogg" : "image/*"}
                        onChange={(e) => setFileInput(e.target.files?.[0] || null)}
                        style={{ padding: 8, border: "1px solid #d1d5db", borderRadius: 6, width: "100%" }}
                      />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                        Thumbnail / Poster Image (optional)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setThumbInput(e.target.files?.[0] || null)}
                        style={{ padding: 8, border: "1px solid #d1d5db", borderRadius: 6, width: "100%" }}
                      />
                    </div>
                  </>
                ) : (
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                      {form.mediaType === "youtube" ? "YouTube Video URL *" : "Instagram Post URL *"}
                    </label>
                    <input
                      type="url"
                      placeholder={form.mediaType === "youtube" ? "https://www.youtube.com/watch?v=..." : "https://www.instagram.com/p/..."}
                      value={form.embedUrl}
                      onChange={(e) => f("embedUrl", e.target.value)}
                      required
                      style={{ padding: 10, border: "1px solid #d1d5db", borderRadius: 6, width: "100%", outline: "none" }}
                    />
                  </div>
                )}
              </div>

              {/* Section: Display text */}
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ margin: "0 0 12px 0", fontSize: 15, color: "#374151", borderBottom: "1px solid #f3f4f6", paddingBottom: 6 }}>
                  Display Text & Overlay
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Summer Collection Launch"
                      value={form.title}
                      onChange={(e) => f("title", e.target.value)}
                      style={{ padding: 10, border: "1px solid #d1d5db", borderRadius: 6, width: "100%", outline: "none" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Caption / Subtitle</label>
                    <input
                      type="text"
                      placeholder="e.g. Watch the preview now"
                      value={form.caption}
                      onChange={(e) => f("caption", e.target.value)}
                      style={{ padding: 10, border: "1px solid #d1d5db", borderRadius: 6, width: "100%", outline: "none" }}
                    />
                  </div>
                </div>
              </div>

              {/* Section: CTA */}
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ margin: "0 0 12px 0", fontSize: 15, color: "#374151", borderBottom: "1px solid #f3f4f6", paddingBottom: 6 }}>
                  Call to Action Button
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Button Text</label>
                    <input
                      type="text"
                      placeholder="e.g. Explore Now"
                      value={form.ctaText}
                      onChange={(e) => f("ctaText", e.target.value)}
                      style={{ padding: 10, border: "1px solid #d1d5db", borderRadius: 6, width: "100%", outline: "none" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Button URL</label>
                    <input
                      type="text"
                      placeholder="e.g. /products"
                      value={form.ctaUrl}
                      onChange={(e) => f("ctaUrl", e.target.value)}
                      style={{ padding: 10, border: "1px solid #d1d5db", borderRadius: 6, width: "100%", outline: "none" }}
                    />
                  </div>
                </div>
              </div>

              {/* Section: Playback (video only) */}
              {form.mediaType === "video" && (
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ margin: "0 0 12px 0", fontSize: 15, color: "#374151", borderBottom: "1px solid #f3f4f6", paddingBottom: 6 }}>
                    Video Playback
                  </h4>
                  <div style={{ display: "flex", gap: 20, background: "#f9fafb", padding: 12, borderRadius: 8 }}>
                    {[
                      ["autoplay", "Autoplay"],
                      ["loop", "Loop"],
                      ["muted", "Muted"],
                    ].map(([key, label]) => (
                      <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
                        <input
                          type="checkbox"
                          checked={form[key]}
                          onChange={(e) => f(key, e.target.checked)}
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Section: Order & Visibility */}
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ margin: "0 0 12px 0", fontSize: 15, color: "#374151", borderBottom: "1px solid #f3f4f6", paddingBottom: 6 }}>
                  Display Order & Visibility
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "center" }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Display Order (lower = first)</label>
                    <input
                      type="number"
                      value={form.order}
                      onChange={(e) => f("order", e.target.value)}
                      style={{ padding: 10, border: "1px solid #d1d5db", borderRadius: 6, width: "100%", outline: "none" }}
                    />
                  </div>
                  <div style={{ paddingTop: 20 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
                      <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(e) => f("isActive", e.target.checked)}
                      />
                      <span>Visible on Homepage</span>
                    </label>
                  </div>
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
                  {saving ? "Saving..." : modalMode === "create" ? "Add Media" : "Update Media"}
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
            <h3>All Media Items ({filteredItems.length})</h3>
          </div>
          <div>
            <AdminSearchFilter
              search={search}
              setSearch={setSearch}
              placeholder="Search media..."
            />
          </div>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Preview</th>
              <th>Title & Caption</th>
              <th>Type</th>
              <th>Order</th>
              <th>Status</th>
              <th style={{ width: 220 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length > 0 ? (
              filteredItems.map((item, index) => (
                <tr key={item._id || `media-${index}`}>
                  <td>{mediaPreview(item)}</td>
                  <td>
                    <strong>{item.title || <span style={{ color: "var(--text-2)" }}>Untitled</span>}</strong>
                    {item.caption && <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 2 }}>{item.caption}</div>}
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: 12,
                        fontFamily: "monospace",
                        background: "#f1f5f9",
                        padding: "3px 8px",
                        borderRadius: 4,
                        textTransform: "uppercase",
                        fontWeight: 600,
                      }}
                    >
                      {item.mediaType}
                    </span>
                  </td>
                  <td>{item.order ?? 0}</td>
                  <td>
                    <span className={`admin-badge ${item.isActive ? "success" : "danger"}`}>
                      {item.isActive ? "Visible" : "Hidden"}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => openEdit(item)}
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
                      onClick={() => handleToggle(item)}
                      style={{
                        padding: "6px 10px",
                        background: item.isActive ? "#f59e0b" : "#10b981",
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer",
                        marginRight: 8,
                        fontSize: 12,
                      }}
                    >
                      {item.isActive ? "Hide" : "Show"}
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
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
                <td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--text-2)" }}>
                  No media items found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
