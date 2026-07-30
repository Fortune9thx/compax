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
          background: "#070F12",
          color: "#E7ECEA",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <span style={{ fontSize: 13, letterSpacing: "0.1em", color: "#E0654A" }}>APPLICATION ERROR</span>
        <p style={{ fontSize: 15, color: "#9AA5A2" }}>Compax failed to load.</p>
        <button
          onClick={reset}
          style={{
            padding: "10px 20px",
            borderRadius: 999,
            border: "1px solid #00C27A",
            background: "transparent",
            color: "#5FE3A8",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
