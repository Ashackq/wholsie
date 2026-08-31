import React from "react";

interface Offer {
  title: string;
  badgeText?: string;
}

interface OfferBadgeProps {
  offers: Offer[];
  /** Maximum number of badges to show before truncating */
  maxBadges?: number;
}

/**
 * OfferBadge — displays offer promotion badges on product cards.
 * Used in the Products page Offers tab (?category=offers).
 *
 * Renders the badgeText if set, otherwise falls back to the offer title.
 * Multiple offers are shown up to maxBadges (default 2).
 */
export default function OfferBadge({ offers, maxBadges = 2 }: OfferBadgeProps) {
  if (!offers || offers.length === 0) return null;

  const visible = offers.slice(0, maxBadges);
  const overflow = offers.length - visible.length;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "4px",
        alignItems: "center",
      }}
    >
      {visible.map((offer, idx) => {
        const label = offer.badgeText?.trim() || offer.title;
        return (
          <span
            key={idx}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              background: "linear-gradient(135deg, #ff6b35 0%, #f7c59f 100%)",
              color: "#fff",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.4px",
              textTransform: "uppercase",
              padding: "3px 8px",
              borderRadius: "20px",
              boxShadow: "0 2px 6px rgba(255,107,53,0.35)",
              whiteSpace: "nowrap",
              maxWidth: "120px",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={label}
          >
            <i
              className="fas fa-tag"
              style={{ fontSize: "8px", flexShrink: 0 }}
              aria-hidden="true"
            />
            {label}
          </span>
        );
      })}
      {overflow > 0 && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: "rgba(255,107,53,0.12)",
            color: "#ff6b35",
            fontSize: "10px",
            fontWeight: 700,
            padding: "3px 7px",
            borderRadius: "20px",
            whiteSpace: "nowrap",
          }}
        >
          +{overflow} more
        </span>
      )}
    </div>
  );
}
