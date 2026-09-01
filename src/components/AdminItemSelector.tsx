"use client";
import React, { useState, useRef, useEffect, useMemo } from "react";

export type SelectableItem = {
  _id: string;
  name: string;
  slug?: string;
  title?: string;
};

type Props = {
  label?: string;
  placeholder?: string;
  emptyLabel?: string;
  items: SelectableItem[];
  selectedIds: string[] | string;
  onChange: (ids: any) => void;
  mode?: "multiple" | "single";
  loading?: boolean;
  helpText?: string;
};

export default function AdminItemSelector({
  label,
  placeholder = "Search...",
  emptyLabel = "All (No restriction)",
  items = [],
  selectedIds,
  onChange,
  mode = "multiple",
  loading = false,
  helpText,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize selected IDs to array
  const currentSelectedArray: string[] = useMemo(() => {
    if (!selectedIds) return [];
    if (Array.isArray(selectedIds)) return selectedIds;
    return [String(selectedIds)];
  }, [selectedIds]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filtered items based on search
  const filteredItems = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return items;
    return items.filter((item) => {
      const name = (item.name || item.title || "").toLowerCase();
      const slug = (item.slug || "").toLowerCase();
      return name.includes(q) || slug.includes(q);
    });
  }, [items, searchTerm]);

  // Map of selected items for chip display
  const selectedItemsMap = useMemo(() => {
    const map = new Map<string, SelectableItem>();
    items.forEach((item) => {
      if (currentSelectedArray.includes(item._id)) {
        map.set(item._id, item);
      }
    });
    return map;
  }, [items, currentSelectedArray]);

  const handleToggleItem = (id: string) => {
    if (mode === "single") {
      if (currentSelectedArray.includes(id)) {
        onChange("");
      } else {
        onChange(id);
        setIsOpen(false);
      }
    } else {
      if (currentSelectedArray.includes(id)) {
        onChange(currentSelectedArray.filter((i) => i !== id));
      } else {
        onChange([...currentSelectedArray, id]);
      }
    }
  };

  const handleRemoveItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (mode === "single") {
      onChange("");
    } else {
      onChange(currentSelectedArray.filter((i) => i !== id));
    }
  };

  const handleSelectAll = () => {
    const allIds = filteredItems.map((i) => i._id);
    const combined = Array.from(new Set([...currentSelectedArray, ...allIds]));
    onChange(combined);
  };

  const handleClearAll = () => {
    if (mode === "single") {
      onChange("");
    } else {
      onChange([]);
    }
  };

  return (
    <div ref={containerRef} style={{ marginBottom: 14, position: "relative" }}>
      {label && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 5,
          }}
        >
          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
            {label}
          </label>
          {mode === "multiple" && currentSelectedArray.length > 0 && (
            <span style={{ fontSize: 12, color: "#6b7280" }}>
              {currentSelectedArray.length} selected
            </span>
          )}
        </div>
      )}

      {/* Main Trigger Box */}
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          minHeight: 42,
          padding: "6px 10px",
          border: isOpen ? "1px solid #3b82f6" : "1px solid #d1d5db",
          borderRadius: 6,
          background: "#fff",
          cursor: "pointer",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 6,
          boxShadow: isOpen ? "0 0 0 2px rgba(59, 130, 246, 0.15)" : "none",
          transition: "all 0.15s ease-in-out",
          boxSizing: "border-box",
          width: "100%",
        }}
      >
        {currentSelectedArray.length === 0 ? (
          <span style={{ color: "#9ca3af", fontSize: 13, padding: "2px 4px" }}>
            {emptyLabel}
          </span>
        ) : (
          currentSelectedArray.map((id) => {
            const item = selectedItemsMap.get(id);
            const displayName = item ? item.name || item.title || item.slug || id : id;
            return (
              <span
                key={id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#eff6ff",
                  color: "#1e40af",
                  border: "1px solid #bfdbfe",
                  borderRadius: 4,
                  padding: "3px 8px",
                  fontSize: 12,
                  fontWeight: 500,
                  maxWidth: "100%",
                }}
              >
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: 220,
                  }}
                  title={displayName}
                >
                  {displayName}
                </span>
                <button
                  type="button"
                  onClick={(e) => handleRemoveItem(id, e)}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#6b7280",
                    cursor: "pointer",
                    padding: 0,
                    fontSize: 14,
                    lineHeight: 1,
                    display: "flex",
                    alignItems: "center",
                  }}
                  title="Remove"
                >
                  ×
                </button>
              </span>
            );
          })
        )}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          {currentSelectedArray.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClearAll();
              }}
              style={{
                border: "none",
                background: "transparent",
                color: "#9ca3af",
                cursor: "pointer",
                fontSize: 12,
                padding: "2px 4px",
              }}
              title="Clear selection"
            >
              Clear
            </button>
          )}
          <span style={{ color: "#9ca3af", fontSize: 11 }}>
            <i className={`fas fa-chevron-${isOpen ? "up" : "down"}`} />
          </span>
        </div>
      </div>

      {helpText && (
        <small style={{ display: "block", color: "#6b7280", fontSize: 12, marginTop: 4 }}>
          {helpText}
        </small>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            background: "#fff",
            borderRadius: 8,
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
            border: "1px solid #e5e7eb",
            zIndex: 100,
            maxHeight: 280,
            display: "flex",
            flexDirection: "column",
            boxSizing: "border-box",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Box & Quick Controls */}
          <div
            style={{
              padding: 8,
              borderBottom: "1px solid #f3f4f6",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div style={{ position: "relative", width: "100%" }}>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={placeholder}
                autoFocus
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "7px 10px 7px 28px",
                  fontSize: 13,
                  border: "1px solid #e5e7eb",
                  borderRadius: 6,
                  outline: "none",
                }}
              />
              <i
                className="fas fa-search"
                style={{
                  position: "absolute",
                  left: 9,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#9ca3af",
                  fontSize: 12,
                }}
              />
            </div>

            {mode === "multiple" && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  padding: "0 2px",
                }}
              >
                <button
                  type="button"
                  onClick={handleSelectAll}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#3b82f6",
                    cursor: "pointer",
                    fontWeight: 600,
                    padding: 0,
                  }}
                >
                  Select all matching ({filteredItems.length})
                </button>
                {currentSelectedArray.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#ef4444",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    Clear all
                  </button>
                )}
              </div>
            )}
          </div>

          {/* List of items: Left-aligned Name, Right-aligned Checkbox */}
          <div style={{ overflowY: "auto", flex: 1, padding: "4px 0" }}>
            {loading ? (
              <div style={{ padding: "16px", textAlign: "center", color: "#6b7280", fontSize: 13 }}>
                <i className="fas fa-spinner fa-spin" style={{ marginRight: 6 }} />
                Loading items...
              </div>
            ) : filteredItems.length === 0 ? (
              <div style={{ padding: "16px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
                No matches found
              </div>
            ) : (
              filteredItems.map((item) => {
                const isSelected = currentSelectedArray.includes(item._id);
                const itemName = item.name || item.title || item.slug || item._id;

                return (
                  <div
                    key={item._id}
                    onClick={() => handleToggleItem(item._id)}
                    style={{
                      padding: "9px 14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      cursor: "pointer",
                      background: isSelected ? "#f0fdf4" : "transparent",
                      transition: "background 0.1s ease",
                      borderBottom: "1px solid #f9fafb",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = "#f8fafc";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    {/* Left Aligned Product Name */}
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: isSelected ? 600 : 400,
                        color: isSelected ? "#15803d" : "#1e293b",
                        textAlign: "left",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        flex: 1,
                        userSelect: "none",
                      }}
                      title={itemName}
                    >
                      {itemName}
                    </span>

                    {/* Right Aligned Checkbox with explicit width/height to override global form styling */}
                    <input
                      type={mode === "multiple" ? "checkbox" : "radio"}
                      checked={isSelected}
                      onChange={() => {}}
                      style={{
                        width: 16,
                        height: 16,
                        minWidth: 16,
                        maxWidth: 16,
                        margin: 0,
                        padding: 0,
                        cursor: "pointer",
                        pointerEvents: "none",
                        accentColor: "#059669",
                        flexShrink: 0,
                      }}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
