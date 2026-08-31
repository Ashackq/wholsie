"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

// ── Types ──────────────────────────────────────────────────────────────────────

interface MediaItem {
  _id: string;
  mediaType: "video" | "gif" | "image" | "youtube" | "instagram";
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
}

// ── YouTube embed URL helper ───────────────────────────────────────────────────

function toYouTubeEmbed(url: string): string {
  // Accept: https://www.youtube.com/watch?v=ID  |  https://youtu.be/ID  |  already an embed
  const match =
    url.match(/[?&]v=([^&#]+)/) ||
    url.match(/youtu\.be\/([^?#]+)/) ||
    url.match(/embed\/([^?#]+)/);
  const id = match?.[1];
  return id
    ? `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&modestbranding=1`
    : url;
}

// ── Single media card ─────────────────────────────────────────────────────────

function MediaCard({
  item,
  fullWidth = false,
}: {
  item: MediaItem;
  fullWidth?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // IntersectionObserver: play video when in viewport, pause when out
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.play().catch(() => {
              /* autoplay blocked — silent fail */
            });
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  const src = item.filePath
    ? item.filePath.startsWith("/")
      ? item.filePath
      : `/${item.filePath}`
    : "";

  const cardStyle: React.CSSProperties = {
    position: "relative",
    borderRadius: fullWidth ? 0 : "16px",
    overflow: "hidden",
    width: "100%",
    background: "#0f172a",
    aspectRatio: fullWidth ? "21/7" : "16/9",
  };

  const overlayStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 60%)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    padding: fullWidth ? "32px 48px" : "20px 24px",
    zIndex: 2,
    pointerEvents: "none",
  };

  const textStyle: React.CSSProperties = {
    color: "#fff",
    pointerEvents: "auto",
  };

  const renderMedia = () => {
    switch (item.mediaType) {
      case "video":
        return (
          <video
            ref={videoRef}
            src={src}
            poster={item.thumbnail || undefined}
            muted={item.muted !== false}
            loop={item.loop !== false}
            playsInline
            preload="metadata"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        );

      case "gif":
      case "image":
        return (
          <img
            src={src || item.thumbnail || ""}
            alt={item.title || "Media"}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
            loading="lazy"
          />
        );

      case "youtube":
        return (
          <iframe
            src={toYouTubeEmbed(item.embedUrl || "")}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              display: "block",
            }}
            title={item.title || "Video"}
          />
        );

      case "instagram":
        return (
          <iframe
            src={`${item.embedUrl}/embed`}
            allow="autoplay; encrypted-media"
            allowFullScreen
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              display: "block",
            }}
            title={item.title || "Instagram"}
          />
        );

      default:
        return null;
    }
  };

  const hasOverlay = item.title || item.caption || item.ctaText;

  return (
    <div style={cardStyle}>
      {renderMedia()}

      {/* Gradient overlay + text + CTA */}
      {hasOverlay && (
        <div style={overlayStyle}>
          <div style={textStyle}>
            {item.title && (
              <p
                style={{
                  margin: "0 0 4px",
                  fontSize: fullWidth ? "28px" : "17px",
                  fontWeight: 700,
                  lineHeight: 1.2,
                  textShadow: "0 1px 4px rgba(0,0,0,0.4)",
                }}
              >
                {item.title}
              </p>
            )}
            {item.caption && (
              <p
                style={{
                  margin: "0 0 14px",
                  fontSize: fullWidth ? "16px" : "13px",
                  opacity: 0.85,
                  lineHeight: 1.4,
                }}
              >
                {item.caption}
              </p>
            )}
            {item.ctaText && item.ctaUrl && (
              <Link
                href={item.ctaUrl}
                className="common_btn"
                style={{
                  display: "inline-block",
                  fontSize: "13px",
                  padding: "9px 22px",
                }}
              >
                {item.ctaText}
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── VideoGifSection ───────────────────────────────────────────────────────────

/**
 * Homepage Video/GIF section (Phase 10).
 *
 * Placement: after hero slider, before category banners.
 *
 * Layout rules (from implementation plan §13):
 *  - No active media → renders nothing (returns null)
 *  - 1 item  → full-width
 *  - 2–4 items → responsive grid (1 col mobile / 2 col desktop)
 *  - 5+ items → Swiper carousel
 *
 * Videos play only when in viewport (IntersectionObserver inside MediaCard).
 * Fetches GET /api/media on mount; uses empty-array fallback gracefully.
 */
export default function VideoGifSection() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"}/media`
    )
      .then((res) => res.json())
      .then((data) => {
        setItems(data.data || []);
        setLoaded(true);
      })
      .catch(() => {
        setLoaded(true); // fail silently — section just won't render
      });
  }, []);

  // Don't render anything until fetch completes (avoids layout shift)
  if (!loaded) return null;
  // No active media → nothing shown (per spec)
  if (items.length === 0) return null;

  // ── 1 item: full-width ──────────────────────────────────────────────────────
  if (items.length === 1) {
    return (
      <section
        style={{
          width: "100%",
          margin: "0 0 0",
          overflow: "hidden",
        }}
        aria-label="Featured media"
      >
        <MediaCard item={items[0]} fullWidth />
      </section>
    );
  }

  // ── 2–4 items: responsive grid ──────────────────────────────────────────────
  if (items.length >= 2 && items.length <= 4) {
    const cols = items.length === 2 ? 2 : items.length === 3 ? 3 : 2;
    return (
      <section
        style={{
          width: "100%",
          padding: "0 0 0",
          overflow: "hidden",
        }}
        aria-label="Featured media"
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: "12px",
            padding: "16px",
          }}
        >
          {items.map((item) => (
            <MediaCard key={item._id} item={item} />
          ))}
        </div>
      </section>
    );
  }

  // ── 5+ items: Swiper carousel ───────────────────────────────────────────────
  return (
    <section
      style={{
        width: "100%",
        padding: "16px 0",
        overflow: "hidden",
        position: "relative",
      }}
      aria-label="Featured media"
    >
      <Swiper
        modules={[Autoplay, Navigation, Pagination]}
        spaceBetween={12}
        slidesPerView={1}
        autoplay={{ delay: 6000, disableOnInteraction: false }}
        navigation
        pagination={{ clickable: true }}
        loop
        breakpoints={{
          640: { slidesPerView: 2 },
          1024: { slidesPerView: 3 },
        }}
        style={{ padding: "0 16px 36px" }}
      >
        {items.map((item) => (
          <SwiperSlide key={item._id}>
            <MediaCard item={item} />
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
