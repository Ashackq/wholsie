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
}: {
  item: MediaItem;
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
    borderRadius: "16px",
    overflow: "hidden",
    width: "100%",
    height: "100%",
    aspectRatio: "9 / 16",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
    transform: "translateZ(0)",
    background: "#0f172a",
  };

  const overlayStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 35%, transparent 65%)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    padding: "16px 14px",
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
                top: 12,
                right: 12,
                zIndex: 4,
                background: "rgba(0, 0, 0, 0.6)",
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
                color: "#fff",
                border: "1px solid rgba(255, 255, 255, 0.25)",
                borderRadius: "50%",
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: 12,
                transition: "all 0.2s ease",
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
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              overflow: "hidden",
              borderRadius: "16px",
              background: "#000",
            }}
          >
            <iframe
              src={instagramEmbed}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              scrolling="no"
              style={{
                position: "absolute",
                top: "-42px",
                left: "-18%",
                width: "136%",
                height: "calc(100% + 220px)",
                border: "none",
                display: "block",
                transform: "scale(1.2)",
                transformOrigin: "center 26%",
              }}
              title={item.title || "Instagram Post"}
            />
          </div>
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
                  fontSize: "15px",
                  fontWeight: 700,
                  lineHeight: 1.25,
                  textShadow: "0 2px 6px rgba(0,0,0,0.6)",
                }}
              >
                {item.title}
              </p>
            )}
            {item.caption && (
              <p
                style={{
                  margin: "0 0 10px",
                  fontSize: "12px",
                  opacity: 0.9,
                  lineHeight: 1.35,
                  textShadow: "0 1px 4px rgba(0,0,0,0.5)",
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
                  fontSize: "12px",
                  padding: "6px 16px",
                  borderRadius: "20px",
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
 * Homepage Video/GIF section (Phase 10) in exact 9:16 portrait ratio.
 *
 * Placement: after hero slider, before category banners.
 *
 * Layout rules:
 *  - No active media → renders nothing (returns null)
 *  - 1 item  → centered portrait card (9:16)
 *  - 2–4 items → centered responsive portrait grid (9:16)
 *  - 5+ items → portrait Swiper carousel (exact 9:16 per card)
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

  // ── 1 item: centered portrait card ───────────────────────────────────────────
  if (items.length === 1) {
    return (
      <section
        style={{
          width: "100%",
          padding: "20px 16px 28px",
          overflow: "hidden",
        }}
        aria-label="Featured media"
      >
        <div style={{ maxWidth: "320px", width: "100%", aspectRatio: "9 / 16", margin: "0 auto" }}>
          <MediaCard item={items[0]} />
        </div>
      </section>
    );
  }

  // ── 2–4 items: responsive portrait grid (exact 9:16) ────────────────────────
  if (items.length >= 2 && items.length <= 4) {
    return (
      <section
        style={{
          width: "100%",
          padding: "20px 16px 28px",
          overflow: "hidden",
        }}
        aria-label="Featured media"
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, 200px), ${
              items.length === 2 ? "300px" : items.length === 3 ? "280px" : "260px"
            }))`,
            gap: "16px",
            justifyContent: "center",
            maxWidth:
              items.length === 2
                ? "640px"
                : items.length === 3
                ? "920px"
                : "1160px",
            margin: "0 auto",
          }}
        >
          {items.map((item) => (
            <div key={item._id} style={{ width: "100%", aspectRatio: "9 / 16" }}>
              <MediaCard item={item} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  // ── 5+ items: portrait Swiper carousel (exact 9:16) ─────────────────────────
  return (
    <section
      className="media-portrait-section"
      style={{
        width: "100%",
        padding: "20px 0 28px",
        overflow: "hidden",
        position: "relative",
      }}
      aria-label="Featured media"
    >
      <style>{`
        .media-portrait-section .swiper-wrapper {
          align-items: stretch;
        }
        .media-portrait-section .swiper-slide {
          height: auto !important;
          aspect-ratio: 9 / 16 !important;
          display: flex !important;
        }
        .media-portrait-section .swiper-slide > div {
          width: 100% !important;
          height: 100% !important;
          aspect-ratio: 9 / 16 !important;
        }
        .media-portrait-section .swiper-button-prev,
        .media-portrait-section .swiper-button-next {
          color: #fff;
          background: rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          width: 38px;
          height: 38px;
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
          transition: all 0.2s ease;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .media-portrait-section .swiper-button-prev:after,
        .media-portrait-section .swiper-button-next:after {
          font-size: 14px;
          font-weight: 700;
        }
        .media-portrait-section .swiper-button-prev:hover,
        .media-portrait-section .swiper-button-next:hover {
          background: rgba(0, 0, 0, 0.75);
          transform: scale(1.08);
        }
        .media-portrait-section .swiper-pagination-bullet {
          background: #64748b;
          opacity: 0.5;
        }
        .media-portrait-section .swiper-pagination-bullet-active {
          background: #ef4444;
          opacity: 1;
          width: 20px;
          border-radius: 6px;
          transition: all 0.3s ease;
        }
      `}</style>
      <Swiper
        modules={[Autoplay, Navigation, Pagination]}
        spaceBetween={14}
        slidesPerView={1.3}
        autoplay={{ delay: 6000, disableOnInteraction: false, pauseOnMouseEnter: true }}
        navigation
        pagination={{ clickable: true, dynamicBullets: true }}
        loop={items.length > 5}
        breakpoints={{
          480: { slidesPerView: 2, spaceBetween: 14 },
          640: { slidesPerView: 2.5, spaceBetween: 14 },
          768: { slidesPerView: 3, spaceBetween: 16 },
          1024: { slidesPerView: 4, spaceBetween: 16 },
          1280: { slidesPerView: 4.5, spaceBetween: 18 },
          1440: { slidesPerView: 5, spaceBetween: 18 },
        }}
        style={{ padding: "0 24px 38px" }}
      >
        {items.map((item) => (
          <SwiperSlide
            key={item._id}
            style={{
              aspectRatio: "9 / 16",
              height: "auto",
              display: "flex",
            }}
          >
            <MediaCard item={item} />
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
