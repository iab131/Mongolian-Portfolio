"use client";

import { useEffect, useRef } from "react";
import { gerById } from "@/content/gers";
import type { GerId } from "@/content/types";
import { GER_SITES, OVOO } from "@/lib/layout";
import { riderPose } from "@/lib/rider";
import { useStore } from "@/lib/store";

// North-up map of the camp. Static parts are SVG; the horse marker is moved every frame from
// riderPose (no React renders). Gers are real buttons laid over the SVG.

const CX = 0;
const CZ = 4;
const R = 62; // world units from the centre to the map rim

const pct = (v: number, c: number) => `${(((v - c + R) / (2 * R)) * 100).toFixed(2)}%`;

function useHorseMarker(ref: React.RefObject<SVGGElement | null>) {
  useEffect(() => {
    let raf = 0;
    let last = "";
    const loop = () => {
      const el = ref.current;
      if (el) {
        let x = riderPose.x - CX;
        let z = riderPose.z - CZ;
        const d = Math.hypot(x, z);
        const max = R - 5;
        if (d > max) {
          x *= max / d;
          z *= max / d;
        }
        const t = `translate(${(x + CX).toFixed(1)} ${(z + CZ).toFixed(1)}) rotate(${((-riderPose.yaw * 180) / Math.PI).toFixed(1)})`;
        if (t !== last) {
          el.setAttribute("transform", t);
          last = t;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ref]);
}

/** The camp drawn as a felt disc. `labels` adds ger names (large map only). */
export function CampMap({
  onPick,
  labels = false,
  className,
}: {
  onPick: (id: GerId) => void;
  labels?: boolean;
  className?: string;
}) {
  const horse = useRef<SVGGElement>(null);
  useHorseMarker(horse);

  return (
    <div className={`campmap ${className ?? ""}`}>
      <svg viewBox={`${CX - R} ${CZ - R} ${R * 2} ${R * 2}`} aria-hidden>
        <defs>
          <radialGradient id="cm-ground" cx="50%" cy="45%" r="60%">
            <stop offset="0" stopColor="#a9ab52" />
            <stop offset="0.7" stopColor="#7f8a3c" />
            <stop offset="1" stopColor="#5c6a2e" />
          </radialGradient>
        </defs>
        <circle cx={CX} cy={CZ} r={R - 0.5} fill="url(#cm-ground)" />
        {/* Faint range rings and a meridian, like a painted compass rose */}
        <g className="cm-grid">
          <circle cx={CX} cy={CZ} r={R * 0.66} />
          <circle cx={CX} cy={CZ} r={R * 0.33} />
          <line x1={CX} y1={CZ - R} x2={CX} y2={CZ + R} />
          <line x1={CX - R} y1={CZ} x2={CX + R} y2={CZ} />
        </g>
        <circle cx={CX} cy={CZ} r={R - 1.6} className="cm-rim" />
        <path d={`M${CX} ${CZ - R + 3} l-4 8 h8 z`} className="cm-north" />

        {/* Ovoo: a stone cairn with a blue scarf */}
        <g transform={`translate(${OVOO.x} ${OVOO.z})`} className="cm-ovoo">
          <path d="M-3.4 2.4 L0 -3.6 L3.4 2.4 Z" />
          <rect x={-0.6} y={-6} width={1.2} height={3} />
        </g>
        {labels && (
          <text x={OVOO.x + 5.5} y={OVOO.z + 1.8} className="cm-label cm-label-soft cm-label-start">
            Ovoo
          </text>
        )}

        {GER_SITES.map((s) => (
          <g key={s.id} transform={`translate(${s.x} ${s.z})`}>
            <circle r={s.radius + 3.2} className="cm-ger-ring" />
            <circle r={s.radius + 1.6} fill={gerById[s.id].accent} className="cm-ger" />
            <circle r={s.radius * 0.3} className="cm-ger-crown" />
            {labels && (
              <text y={s.radius + 8} className="cm-label">
                {gerById[s.id].name}
              </text>
            )}
          </g>
        ))}

        <g ref={horse} className="cm-horse">
          <circle r={8} className="cm-horse-halo" />
          <path d="M0 -7 L4.8 5 L0 2.6 L-4.8 5 Z" />
        </g>
      </svg>

      {GER_SITES.map((s) => (
        <button
          key={s.id}
          type="button"
          className="cm-hit"
          style={{ left: pct(s.x, CX), top: pct(s.z, CZ), "--accent": gerById[s.id].accent } as React.CSSProperties}
          onClick={() => onPick(s.id)}
          aria-label={`Ride to ${gerById[s.id].name}`}
        >
          {!labels && <span className="cm-tip">{gerById[s.id].name}</span>}
        </button>
      ))}
    </div>
  );
}

/** Compact corner minimap; clicking a ger fast-travels there. */
export function Minimap() {
  const travelTo = useStore((s) => s.travelTo);
  const setOverlay = useStore((s) => s.setOverlay);
  return (
    <nav className="minimap" aria-label="Minimap">
      <CampMap onPick={travelTo} />
      <button type="button" className="minimap-expand" onClick={() => setOverlay("map")} aria-label="Open the full map">
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
          <path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </button>
    </nav>
  );
}
