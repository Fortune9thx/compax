"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          background: "#0a0b0f",
          color: "#f1f5f9",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <span style={{ fontSize: 13, letterSpacing: "0.1em", color: "#ef4444" }}>APPLICATION ERROR</span>
        <p style={{ fontSize: 15, color: "#94a3b8" }}>Compax failed to load.</p>
        <button
          onClick={reset}
          style={{
            padding: "10px 20px",
            borderRadius: 999,
            border: "1px solid #6366f1",
            background: "transparent",
            color: "#818cf8",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
