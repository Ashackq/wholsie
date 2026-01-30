"use client";

import React from "react";

type Props = {
  onRefresh: () => void;
  loading?: boolean;
};

export default function AdminRefreshButton({
  onRefresh,
  loading = false,
}: Props) {
  return (
    <button
      onClick={onRefresh}
      disabled={loading}
      style={{
        padding: "8px 12px",
        borderRadius: 8,
        border: "1px solid #e5e7eb",
        background: loading ? "#f3f4f6" : "#fff",
        cursor: loading ? "not-allowed" : "pointer",
        fontSize: 13,
        fontWeight: 500,
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
      title="Refresh"
    >
      {loading ? (
        <i className="fas fa-spinner fa-spin"></i>
      ) : (
        <i className="fas fa-rotate-right"></i>
      )}
    </button>
  );
}
