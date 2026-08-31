"use client";
import { useEffect, useState, useCallback } from "react";
import { useAdminAuth } from "../../../hooks/useAdminAuth";

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
function isEmbed(type: MediaType) {
  return type === "youtube" || type === "instagram";
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminMediaPage() {
  const { isAdmin, loading: authLoading } = useAdminAuth();
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

  useEffect(() => { if (isAdmin) fetchItems(); }, [isAdmin, fetchItems]);

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

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const fd = new FormData();

      // All form fields as strings (multipart)
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
      if (!res.ok) return setError(json.error || "Save failed");
      flashSuccess(json.message || "Saved");
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
      fetchItems();
    } catch { /* noop */ }
  }

  async function handleDelete(item: MediaItem) {
    if (!confirm(`Delete "${item.title || item.mediaType}" media item? The uploaded file will also be removed.`)) return;
    try {
      await fetch(`${API}/admin/media/${item._id}`, { method: "DELETE", headers: authHeader() });
      flashSuccess("Deleted");
      fetchItems();
    } catch { /* noop */ }
  }

  function f(key: string, val: any) { setForm((prev: any) => ({ ...prev, [key]: val })); }

  function mediaPreview(item: MediaItem) {
    if (item.mediaType === "video" && item.filePath) {
      return <video src={item.filePath} style={{ width: 64, height: 40, objectFit: "cover", borderRadius: 4 }} muted />;
    }
    if ((item.mediaType === "image" || item.mediaType === "gif") && item.filePath) {
      return <img src={item.filePath} alt={item.title} style={{ width: 64, height: 40, objectFit: "cover", borderRadius: 4 }} />;
    }
    if (item.thumbnail) {
      return <img src={item.thumbnail} alt="thumb" style={{ width: 64, height: 40, objectFit: "cover", borderRadius: 4 }} />;
    }
    const icons: Record<string, string> = { youtube: "fa-youtube", instagram: "fa-instagram", video: "fa-film", gif: "fa-image", image: "fa-image" };
    return <div style={{ width: 64, height: 40, background: "#1e293b", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <i className={`fab ${icons[item.mediaType] || "fa-photo-video"}`} style={{ color: "#64748b", fontSize: 18 }} />
    </div>;
  }

  if (authLoading) return <div className="admin-loading">Authenticating…</div>;
  if (!isAdmin) return <div className="admin-loading">Access denied.</div>;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title"><i className="fas fa-photo-video" style={{ marginRight: 10 }} />Homepage Media</h1>
          <p className="admin-page-subtitle">Videos, GIFs, images and embeds shown in the homepage section (below hero slider)</p>
        </div>
        <button className="admin-btn admin-btn-primary" onClick={openCreate}>
          <i className="fas fa-plus" /> Add Media
        </button>
      </div>

      {success && <div className="admin-alert admin-alert-success"><i className="fas fa-check-circle" /> {success}</div>}
      {error && !showModal && <div className="admin-alert admin-alert-error"><i className="fas fa-exclamation-circle" /> {error}</div>}

      {loading ? (
        <div className="admin-loading">Loading media…</div>
      ) : items.length === 0 ? (
        <div className="admin-empty">No media items yet. Add your first video or GIF!</div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Preview</th>
                <th>Title</th>
                <th>Type</th>
                <th>Order</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item._id}>
                  <td>{mediaPreview(item)}</td>
                  <td>
                    <strong>{item.title || <span style={{ color: "#94a3b8" }}>Untitled</span>}</strong>
                    {item.caption && <div style={{ fontSize: 12, color: "#94a3b8" }}>{item.caption}</div>}
                  </td>
                  <td>
                    <span style={{ fontSize: 12, fontFamily: "monospace", background: "#1e293b", padding: "2px 8px", borderRadius: 4 }}>
                      {item.mediaType}
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>{item.order ?? 0}</td>
                  <td>
                    <span style={{
                      padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600,
                      background: item.isActive ? "#dcfce7" : "#fee2e2",
                      color: item.isActive ? "#16a34a" : "#dc2626",
                    }}>
                      {item.isActive ? "Visible" : "Hidden"}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="admin-btn admin-btn-sm admin-btn-secondary" onClick={() => openEdit(item)} title="Edit">
                        <i className="fas fa-pen" />
                      </button>
                      <button
                        className={`admin-btn admin-btn-sm ${item.isActive ? "admin-btn-warning" : "admin-btn-success"}`}
                        onClick={() => handleToggle(item)}
                        title={item.isActive ? "Hide" : "Show"}
                      >
                        <i className={`fas fa-eye${item.isActive ? "-slash" : ""}`} />
                      </button>
                      <button className="admin-btn admin-btn-sm admin-btn-danger" onClick={() => handleDelete(item)} title="Delete">
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
          <div className="admin-modal" style={{ maxWidth: 620, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>{modalMode === "create" ? "Add Media Item" : "Edit Media Item"}</h2>
              <button className="admin-modal-close" onClick={() => setShowModal(false)}><i className="fas fa-times" /></button>
            </div>

            {error && <div className="admin-alert admin-alert-error" style={{ margin: "0 0 12px" }}>{error}</div>}

            <div className="admin-form-grid">
              {/* Type */}
              <div className="admin-form-section">
                <h3 className="admin-form-section-title">Media Type</h3>
                <select className="admin-input" value={form.mediaType} onChange={e => f("mediaType", e.target.value)}>
                  <option value="image">Image</option>
                  <option value="gif">GIF</option>
                  <option value="video">Video (MP4 / WebM)</option>
                  <option value="youtube">YouTube Embed</option>
                  <option value="instagram">Instagram Embed</option>
                </select>
              </div>

              {/* Source */}
              <div className="admin-form-section">
                <h3 className="admin-form-section-title">Source</h3>
                {isHosted(form.mediaType) ? (<>
                  <label className="admin-label">
                    {form.mediaType === "video" ? "Video File (MP4/WebM, max 50 MB)" : "Image / GIF File (max 50 MB)"}
                    {modalMode === "edit" && " — leave blank to keep existing file"}
                  </label>
                  <input
                    className="admin-input"
                    type="file"
                    accept={form.mediaType === "video" ? "video/mp4,video/webm,video/ogg" : "image/*"}
                    onChange={e => setFileInput(e.target.files?.[0] || null)}
                  />
                  <label className="admin-label">Thumbnail / Poster Image (optional)</label>
                  <input
                    className="admin-input"
                    type="file"
                    accept="image/*"
                    onChange={e => setThumbInput(e.target.files?.[0] || null)}
                  />
                </>) : (<>
                  <label className="admin-label">
                    {form.mediaType === "youtube" ? "YouTube URL" : "Instagram Post URL"}
                  </label>
                  <input
                    className="admin-input"
                    type="url"
                    value={form.embedUrl}
                    onChange={e => f("embedUrl", e.target.value)}
                    placeholder={form.mediaType === "youtube" ? "https://www.youtube.com/watch?v=…" : "https://www.instagram.com/p/…"}
                  />
                </>)}
              </div>

              {/* Display text */}
              <div className="admin-form-section">
                <h3 className="admin-form-section-title">Display Text</h3>
                <label className="admin-label">Title</label>
                <input className="admin-input" value={form.title} onChange={e => f("title", e.target.value)} placeholder="Optional overlay title" />
                <label className="admin-label">Caption</label>
                <input className="admin-input" value={form.caption} onChange={e => f("caption", e.target.value)} placeholder="Optional subtitle" />
              </div>

              {/* CTA */}
              <div className="admin-form-section">
                <h3 className="admin-form-section-title">Call to Action</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div><label className="admin-label">Button Text</label><input className="admin-input" value={form.ctaText} onChange={e => f("ctaText", e.target.value)} placeholder="e.g. Shop Now" /></div>
                  <div><label className="admin-label">Button URL</label><input className="admin-input" type="url" value={form.ctaUrl} onChange={e => f("ctaUrl", e.target.value)} placeholder="/products" /></div>
                </div>
              </div>

              {/* Playback (video only) */}
              {form.mediaType === "video" && (
                <div className="admin-form-section">
                  <h3 className="admin-form-section-title">Playback</h3>
                  <div style={{ display: "flex", gap: 24 }}>
                    {[["autoplay", "Autoplay"], ["loop", "Loop"], ["muted", "Muted"]].map(([key, label]) => (
                      <label key={key} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                        <input type="checkbox" checked={form[key]} onChange={e => f(key, e.target.checked)} />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Order & Visibility */}
              <div className="admin-form-section">
                <h3 className="admin-form-section-title">Order & Visibility</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label className="admin-label">Display Order (lower = first)</label>
                    <input className="admin-input" type="number" value={form.order} onChange={e => f("order", e.target.value)} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", paddingTop: 28 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                      <input type="checkbox" checked={form.isActive} onChange={e => f("isActive", e.target.checked)} />
                      <span>Visible on homepage</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="admin-modal-footer">
              <button className="admin-btn admin-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="admin-btn admin-btn-primary" onClick={handleSave} disabled={saving}>
                {saving
                  ? <><i className="fas fa-spinner fa-spin" /> Uploading…</>
                  : <><i className="fas fa-save" /> {modalMode === "create" ? "Add Media" : "Save Changes"}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
