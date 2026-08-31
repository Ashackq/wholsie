import { Schema, model } from "mongoose";

const homepageMediaSchema = new Schema(
  {
    // ── Type ──────────────────────────────────────────────────────────────────
    mediaType: {
      type: String,
      enum: ["video", "gif", "image", "youtube", "instagram"],
      required: true,
    },

    // ── Source ────────────────────────────────────────────────────────────────
    // For hosted types (video / gif / image): path returned by /api/admin/upload
    filePath: String,
    // For embeds (youtube / instagram): the raw URL
    embedUrl: String,

    // ── Poster / thumbnail ────────────────────────────────────────────────────
    thumbnail: String, // used as poster for <video> and fallback for GIF/image

    // ── Display text ──────────────────────────────────────────────────────────
    title: String,
    caption: String,

    // ── CTA ───────────────────────────────────────────────────────────────────
    ctaText: String,  // e.g. "Shop Now"
    ctaUrl: String,   // internal or external URL

    // ── Video controls ────────────────────────────────────────────────────────
    autoplay: { type: Boolean, default: true },
    loop: { type: Boolean, default: true },
    muted: { type: Boolean, default: true },

    // ── Ordering & visibility ─────────────────────────────────────────────────
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Sort by `order` ASC so the public API can simply find + sort without extra logic
homepageMediaSchema.index({ isActive: 1, order: 1 });

export const HomepageMedia = model("HomepageMedia", homepageMediaSchema);
