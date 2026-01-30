"use client";

import React from "react";

type Props = {
  search: string;
  setSearch: (value: string) => void;
  placeholder?: string;
};

export default function AdminSearchBar({
  search,
  setSearch,
  placeholder = "Search...",
}: Props) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        marginBottom: 0,
      }}
    >
      <input
        type="text"
        value={search}
        placeholder={placeholder}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          padding: "10px 14px",
          width: 220,
          borderRadius: 8,
          border: "1px solid #e5e7eb",
          fontSize: 14,
          outline: "none",
        }}
      />
    </div>
  );
}
