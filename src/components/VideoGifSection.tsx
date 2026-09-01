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

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // If already an 11-char video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Handles watch, shorts, embed, youtu.be, live, nocookie
  const match =
    trimmed.match(/(?:youtube(?:-nocookie)?\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts|live)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/) ||
    trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/) ||
    trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/) ||
    trimmed.match(/\/(?:embed|shorts|v|live)\/([a-zA-Z0-9_-]{11})/);

  return match ? match[1] : null;
}

function toYouTubeEmbed(url: string): string {
  const id = extractYouTubeId(url);
  if (id) {
    return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=1&modestbranding=1&rel=0&playsinline=1`;
  }
  return url;
}

function toInstagramEmbed(url: string): string {
  if (!url) return "";
  const trimmed = url.trim();

  // Match /p/SHORTCODE, /reel/SHORTCODE, or /tv/SHORTCODE
  const match = trimmed.match(/instagram\.com\/(p|reel|tv)\/([a-zA-Z0-9_-]+)/i);
  if (match) {
    const type = match[1].toLowerCase();
    const shortcode = match[2];
    return `https://www.instagram.com/${type}/${shortcode}/embed`;
  }

  // Fallback: strip query params and trailing slash, then append /embed
  const cleanUrl = trimmed.split("?")[0].replace(/\/+$/, "");
  if (cleanUrl.endsWith("/embed")) {
    return cleanUrl;
  }
  return `${cleanUrl}/embed`;
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
  const [isMuted, setIsMuted] = useState(item.muted !== false);
  const [isPlaying, setIsPlaying] = useState(false);

  // IntersectionObserver: play video when in viewport, pause when out
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = isMuted;
    video.defaultMuted = isMuted;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (item.autoplay !== false) {
              video.play().then(() => setIsPlaying(true)).catch(() => {
                /* autoplay blocked — silent fail */
              });
            }
          } else {
            video.pause();
            setIsPlaying(false);
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [isMuted, item.autoplay]);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const resolveMediaSrc = (pathStr?: string) => {
    if (!pathStr) return "";
    return pathStr.startsWith("/") ? pathStr : `/${pathStr}`;
  };

  const src = resolveMediaSrc(item.filePath);
  const thumbSrc = resolveMediaSrc(item.thumbnail);

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
          <div
            style={{ position: "relative", width: "100%", height: "100%", cursor: "pointer" }}
            onClick={togglePlay}
          >
            <video
              ref={videoRef}
              src={src}
              poster={thumbSrc || undefined}
              muted={isMuted}
              loop={item.loop !== false}
              playsInline
              preload="metadata"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
            {/* Audio Toggle Button */}
            <button
              type="button"
              onClick={toggleMute}
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                zIndex: 4,
                background: "rgba(0, 0, 0, 0.6)",
                backdropFilter: "blur(4px)",
                color: "#fff",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "50%",
                width: 34,
                height: 34,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: 13,
                transition: "all 0.2s",
              }}
              title={isMuted ? "Unmute" : "Mute"}
              aria-label={isMuted ? "Unmute audio" : "Mute audio"}
            >
              <i className={`fas ${isMuted ? "fa-volume-mute" : "fa-volume-up"}`} />
            </button>
          </div>
        );

      case "gif":
      case "image": {
        const imageSource = src || thumbSrc;
        if (!imageSource) return null;
        return (
          <img
            src={imageSource}
            alt={item.title || "Media"}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
        );
      }

      case "youtube": {
        const embedSrc = toYouTubeEmbed(item.embedUrl || "");
        return (
          <iframe
            src={embedSrc}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              display: "block",
            }}
            title={item.title || "YouTube Video"}
          />
        );
      }

      case "instagram": {
        const instagramEmbed = toInstagramEmbed(item.embedUrl || "");
        if (!instagramEmbed) return null;
        return (
          <iframe
            src={instagramEmbed}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            scrolling="no"
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              display: "block",
            }}
            title={item.title || "Instagram Post"}
          />
        );
      }

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
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
            gap: "14px",
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
