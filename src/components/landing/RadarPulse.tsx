"use client";

import { useEffect, useRef } from "react";

interface RadarPulseProps {
  size?: number;
  color?: string;
  rings?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * RadarPulse — Obscura-style expanding concentric rings
 * Mimics the radarPulse animation from obscura-app.com
 */
export default function RadarPulse({
  size = 600,
  color = "0, 173, 181",
  rings = 3,
  className = "",
  style,
}: RadarPulseProps) {
  const delays = [0, 1.1, 2.2]; // stagger each ring

  return (
    <div
      className={className}
      style={{
        position: "absolute",
        width: size,
        height: size,
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        zIndex: 0,
        ...style,
      }}
      aria-hidden="true"
    >
      {delays.slice(0, rings).map((delay, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: `1px solid rgba(${color}, ${0.25 - i * 0.07})`,
            animation: `radarPulse 3.4s linear infinite`,
            animationDelay: `${delay}s`,
            transformOrigin: "center center",
          }}
        />
      ))}

      {/* Static center dot */}
      <span
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: `rgb(${color})`,
          transform: "translate(-50%, -50%)",
          boxShadow: `0 0 12px 4px rgba(${color}, 0.5)`,
        }}
      />
    </div>
  );
}
