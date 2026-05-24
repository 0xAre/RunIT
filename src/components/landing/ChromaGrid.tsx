"use client";

import { useRef, useCallback } from "react";

interface ChromaCardProps {
  children: React.ReactNode;
  gradientFrom?: string;
  gradientTo?: string;
  borderColor?: string;
  spotlightColor?: string;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * ChromaCard — Single card with mouse-tracked radial spotlight
 * Adapted from Obscura's .chroma-card hover effect
 */
export function ChromaCard({
  children,
  gradientFrom = "rgba(8, 58, 61, 0.8)",
  gradientTo = "transparent",
  borderColor = "#00ADB5",
  spotlightColor = "rgba(0, 173, 181, 0.12)",
  style,
  className = "",
}: ChromaCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    card.style.setProperty("--mouse-x", `${x}%`);
    card.style.setProperty("--mouse-y", `${y}%`);
  }, []);

  const handleMouseEnter = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty("--spotlight-opacity", "1");
    card.style.setProperty("--card-border-color", borderColor);
  }, [borderColor]);

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty("--spotlight-opacity", "0");
    card.style.setProperty("--card-border-color", "rgba(255,255,255,0.08)");
  }, []);

  return (
    <div
      ref={cardRef}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        position: "relative",
        overflow: "hidden",
        border: "1px solid var(--card-border-color, rgba(255,255,255,0.08))",
        borderRadius: "20px",
        background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
        transition: "border-color 0.3s ease, transform 0.2s ease",
        padding: "2rem",
        "--mouse-x": "50%",
        "--mouse-y": "50%",
        "--spotlight-opacity": "0",
        "--spotlight-color": spotlightColor,
        ...style,
      } as React.CSSProperties}
    >
      {/* Spotlight layer */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at var(--mouse-x) var(--mouse-y), var(--spotlight-color), transparent 70%)`,
          opacity: "var(--spotlight-opacity)" as any,
          transition: "opacity 0.3s ease",
          pointerEvents: "none",
          zIndex: 2,
        }}
        aria-hidden="true"
      />
      <div style={{ position: "relative", zIndex: 3 }}>{children}</div>
    </div>
  );
}

interface ChromaGridProps {
  children: React.ReactNode;
  columns?: number;
  gap?: number;
  className?: string;
}

/**
 * ChromaGrid — Editorial flexible grid container for ChromaCards
 * Adapted from Obscura's .chroma-grid — editorial/flexible variant (no fixed 280px)
 */
export default function ChromaGrid({
  children,
  columns,
  gap = 16,
  className = "",
}: ChromaGridProps) {
  return (
    <div
      className={className}
      style={{
        display: "grid",
        gridTemplateColumns: columns
          ? `repeat(${columns}, 1fr)`
          : "repeat(auto-fit, minmax(260px, 1fr))",
        gap,
        width: "100%",
      }}
    >
      {children}
    </div>
  );
}
