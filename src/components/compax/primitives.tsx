/* ─── Compax shared primitives (new design system, token-driven) ─── */
"use client";

import React from "react";

/** In-app page header. Title + optional right-aligned actions. No eyebrow,
    no lede — explanatory copy belongs on the landing page, not in the tool. */
export function PageHead({
  title,
  meta,
  actions,
}: {
  title: string;
  /** Short mono figure beside the title, e.g. "7 active". */
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="ce-pagehead">
      <div className="ce-pagehead-l">
        <h1 className="ce-pagetitle">{title}</h1>
        {meta && <span className="ce-pagemeta">{meta}</span>}
      </div>
      {actions && <div className="ce-pagehead-r">{actions}</div>}
    </header>
  );
}

export function StatTile({
  label,
  value,
  unit,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  hint?: string;
}) {
  return (
    <div className="ce-stat">
      <div className="ce-stat-label">{label}</div>
      <div className="ce-stat-value">
        {value}
        {unit && <span className="ce-stat-unit">{unit}</span>}
      </div>
      {hint && <div className="ce-stat-hint">{hint}</div>}
    </div>
  );
}

export function Panel({
  children,
  className,
  style,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  return (
    <div className={`ce-panel${className ? " " + className : ""}`} style={style} onClick={onClick}>
      {children}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="ce-empty">{children}</div>;
}

const TIER_COLORS: Record<string, string> = {
  core: "var(--primary)",
  standard: "var(--signal)",
  provisional: "var(--amber)",
  active: "var(--primary)",
  unstaked: "var(--faint)",
};

export function Tag({ children, tone }: { children: React.ReactNode; tone?: string }) {
  const color = (tone && TIER_COLORS[tone]) || "var(--muted)";
  return (
    <span
      className="ce-tag"
      style={{
        color,
        borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
        background: `color-mix(in srgb, ${color} 10%, transparent)`,
      }}
    >
      {children}
    </span>
  );
}
