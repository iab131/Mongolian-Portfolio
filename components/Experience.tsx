"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { gerById, gers } from "@/content/gers";
import { projectBySlug, projectsInGer } from "@/content/projects";
import type { GerId, Project } from "@/content/types";
import { initAudio, unlockAudio } from "@/lib/audio";
import { installQaHooks, qaEnabled } from "@/lib/qa";
import { riderPose } from "@/lib/rider";
import { useStore } from "@/lib/store";
import { Labels } from "./ui/Labels";
import { CampMap, Minimap } from "./ui/Minimap";
import { ProjectDetail } from "./ui/ProjectDetail";
import { ProjectList } from "./ui/ProjectList";
import { TouchControls } from "./ui/TouchControls";

const Stage = dynamic(() => import("./Stage"), { ssr: false, loading: () => <Loading /> });

function Loading() {
  return (
    <div className="loading" role="status" aria-live="polite">
      <svg className="loading-land" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden>
        <path d="M0 70 L40 52 L78 64 L120 38 L160 58 L210 30 L262 60 L300 46 L346 62 L400 44 V120 H0 Z" className="ll-far" />
        <path d="M0 86 L60 74 L130 84 L200 72 L280 82 L340 74 L400 80 V120 H0 Z" className="ll-near" />
      </svg>
      <div className="loading-inner">
        <p className="loading-kicker">Enhe Bai · Portfolio</p>
        <p className="loading-title">Riding out to the camp</p>
        <div className="loading-track" aria-hidden>
          <HorseGlyph className="loading-horse" />
          <span className="loading-line" />
        </div>
        <p className="loading-sub">Saddling the horse…</p>
      </div>
    </div>
  );
}

/** Low-poly horse and rider silhouette, facing right. */
function HorseGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 -8 64 44" aria-hidden>
      <path d="M2 21 L8 15 L16 13 L37 12 L44 4 L49 -1 L51 2 L60 9 L58 13 L50 11 L45 21 L53 27 L56 32 L53 33 L46 28 L39 26 L24 26 L15 30 L5 35 L3 33 L11 27 L9 20 Z" />
      <path d="M27 12 L29 2 L33 -1 L36 3 L34 12 Z" />
      <circle cx="32" cy="-4" r="2.6" />
    </svg>
  );
}

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

// Touch devices get on-screen riding controls.
const coarseQuery = "(pointer: coarse)";
const subscribeCoarse = (cb: () => void) => {
  const m = window.matchMedia(coarseQuery);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
const useCoarsePointer = () =>
  useSyncExternalStore(
    subscribeCoarse,
    () => window.matchMedia(coarseQuery).matches,
    () => false,
  );

/** Becomes true once the visitor has actually ridden for a moment; the controls hint then fades. */
let riddenOnce = false;
function useHasRidden() {
  const [ridden, setRidden] = useState(riddenOnce);
  useEffect(() => {
    if (riddenOnce) return;
    let raf = 0;
    let t = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (Math.abs(riderPose.speed) > 2) t += dt;
      if (t > 1.5) {
        riddenOnce = true;
        setRidden(true);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return ridden;
}

/** Keeps the last value around for `ms` after it goes null, so panels can animate out. */
function useLinger<T>(value: T | null, ms: number) {
  const [shown, setShown] = useState<T | null>(value);
  const [leaving, setLeaving] = useState(false);
  if (value !== null && (value !== shown || leaving)) {
    setShown(value);
    setLeaving(false);
  } else if (value === null && shown !== null && !leaving) {
    setLeaving(true);
  }
  useEffect(() => {
    if (!leaving) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(
      () => {
        setShown(null);
        setLeaving(false);
      },
      reduce ? 0 : ms,
    );
    return () => clearTimeout(t);
  }, [leaving, ms]);
  return { shown, leaving };
}

export function Experience() {
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const s = useStore();
  const coarse = useCoarsePointer();
  const ridden = useHasRidden();
  const drawer = useLinger<Project>(s.projectSlug ? projectBySlug[s.projectSlug] : null, 260);

  useEffect(() => {
    // Probing WebGL needs the DOM, so it can only happen after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWebgl(hasWebGL());
    // Deep links: /?ger=vision or /?project=steria
    const q = new URLSearchParams(window.location.search);
    const project = q.get("project");
    const ger = q.get("ger") as GerId | null;
    const st = useStore.getState();
    if (project && projectBySlug[project]) {
      st.enterGer(projectBySlug[project].ger);
      st.openProject(project);
    } else if (ger && gerById[ger]) {
      st.enterGer(ger);
    }
  }, []);

  useEffect(() => (qaEnabled() ? installQaHooks() : undefined), []);
  useEffect(() => initAudio(), []);

  // Keyboard: E/Enter to go in, Esc to back out one level, M for the map.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      const st = useStore.getState();
      if (e.key === "Escape") {
        if (st.projectSlug) st.closeProject();
        else if (st.overlay) st.setOverlay(null);
        else if (st.mode === "interior") st.exitGer();
        return;
      }
      if (st.projectSlug || st.overlay) return;
      const onButton = t.tagName === "BUTTON" || t.tagName === "A";
      if ((e.code === "KeyE" || (e.key === "Enter" && !onButton)) && st.mode === "world" && st.nearGerId) {
        st.enterGer(st.nearGerId);
      } else if (e.code === "KeyM") {
        st.setOverlay("map");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (webgl === false) {
    return (
      <main className="fallback">
        <TopBar showWorldButtons={false} />
        <p className="fallback-note">Your browser can&apos;t show the 3D steppe, so here is everything as a list.</p>
        <ProjectList />
      </main>
    );
  }

  const project = drawer.shown;
  const world = s.mode === "world";
  const clear = !s.overlay && !s.projectSlug;

  return (
    <main className={`experience${coarse ? " is-touch" : ""}`}>
      <div className="stage" aria-hidden={!!s.overlay || !!s.projectSlug}>
        {webgl && <Stage />}
        <Labels />
      </div>

      <TopBar showWorldButtons />

      {world && clear && <Minimap />}

      {world && clear && !coarse && (
        <div className="prompt-zone">
          {s.nearGerId ? (
            <button
              key={s.nearGerId}
              type="button"
              className="enter-prompt"
              style={{ "--accent": gerById[s.nearGerId].accent } as React.CSSProperties}
              onClick={() => s.enterGer(s.nearGerId!)}
            >
              <kbd>E</kbd>
              <span className="enter-text">
                <span className="enter-kicker">Step inside</span>
                <span className="enter-name">{gerById[s.nearGerId].name}</span>
              </span>
            </button>
          ) : (
            <p className={`controls-hint${ridden ? " is-faded" : ""}`} aria-hidden={ridden}>
              <span className="hint-group">
                <span className="keys">
                  <kbd>W</kbd>
                  <kbd>A</kbd>
                  <kbd>S</kbd>
                  <kbd>D</kbd>
                </span>
                ride
              </span>
              <span className="hint-group">
                <kbd className="wide">Shift</kbd> gallop
              </span>
              <span className="hint-group">
                <kbd>M</kbd> map
              </span>
              <span className="hint-group hint-goal">Ride up to a ger to go in</span>
            </p>
          )}
        </div>
      )}

      {world && clear && coarse && (
        <>
          {!s.nearGerId && (
            <p className={`touch-hint${ridden ? " is-faded" : ""}`} aria-hidden={ridden}>
              Push the stick up to ride. Ride to a ger to go in.
            </p>
          )}
          <TouchControls />
        </>
      )}

      {s.mode === "interior" && s.gerId && <InteriorPanel gerId={s.gerId} />}

      {s.overlay === "list" && (
        <Overlay title="All projects" kicker="Skip the ride" onClose={() => s.setOverlay(null)} wide>
          <ProjectList
            onSelect={(slug) => {
              s.setOverlay(null);
              s.openProject(slug);
            }}
          />
        </Overlay>
      )}
      {s.overlay === "map" && (
        <Overlay title="Ride to…" kicker="Map of the camp" onClose={() => s.setOverlay(null)}>
          <MapView onPick={s.travelTo} />
        </Overlay>
      )}

      {project && (
        <>
          <div className={`panel-scrim${drawer.leaving ? " is-leaving" : ""}`} onClick={s.closeProject} aria-hidden />
          <aside
            className={`panel${drawer.leaving ? " is-leaving" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={project.title}
            style={{ "--accent": gerById[project.ger].accent } as React.CSSProperties}
          >
            <div className="panel-head">
              <span className="orn" aria-hidden />
              <PanelClose onClose={s.closeProject} />
            </div>
            <div className="panel-body">
              <ProjectDetail key={project.slug} project={project} />
              <p className="panel-permalink">
                <a href={`/projects/${project.slug}`}>Permalink to this project</a>
              </p>
            </div>
          </aside>
        </>
      )}
    </main>
  );
}

function SoundToggle() {
  const muted = useStore((s) => s.muted);
  const setMuted = useStore((s) => s.setMuted);
  return (
    <button
      type="button"
      className="hud-btn icon-btn"
      aria-pressed={!muted}
      aria-label="Sound"
      title={muted ? "Sound is off" : "Sound is on"}
      onClick={() => {
        // Create/resume the AudioContext inside the gesture itself.
        if (muted) unlockAudio();
        setMuted(!muted);
      }}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
        <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
        {muted ? (
          <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="square" fill="none" />
        ) : (
          <path d="M16 8.5c1.6 1.8 1.6 5.2 0 7M18.6 6c3 3.3 3 8.7 0 12" stroke="currentColor" strokeWidth="2" fill="none" />
        )}
      </svg>
    </button>
  );
}

function TopBar({ showWorldButtons }: { showWorldButtons: boolean }) {
  const setOverlay = useStore((s) => s.setOverlay);
  return (
    <header className="topbar">
      <div className="brand">
        <strong>Enhe Bai</strong>
        <span>CS @ Waterloo · vision, robotics, 3D, web</span>
      </div>
      {showWorldButtons && (
        <nav className="topbar-actions" aria-label="Site">
          <button type="button" className="hud-btn" onClick={() => setOverlay("map")} aria-label="Map">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
              <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z M9 4v14 M15 6v14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="bevel" />
            </svg>
            <span className="hud-btn-text">Map</span>
          </button>
          <SoundToggle />
          <button type="button" className="hud-btn primary" onClick={() => setOverlay("list")}>
            Skip the ride
          </button>
        </nav>
      )}
    </header>
  );
}

function PanelClose({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <button ref={ref} type="button" className="panel-close" onClick={onClose} aria-label="Close">
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
        <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" />
      </svg>
      <kbd>Esc</kbd>
    </button>
  );
}

function Overlay({
  title,
  kicker,
  onClose,
  wide,
  children,
}: {
  title: string;
  kicker?: string;
  onClose: () => void;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className={`overlay-card${wide ? " wide" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="overlay-head">
          <div>
            {kicker && <p className="kicker">{kicker}</p>}
            <h2>{title}</h2>
          </div>
          <PanelClose onClose={onClose} />
        </div>
        <span className="orn" aria-hidden />
        <div className="overlay-body">{children}</div>
      </div>
    </div>
  );
}

function InteriorPanel({ gerId }: { gerId: GerId }) {
  const ger = gerById[gerId];
  const hoverSlug = useStore((s) => s.hoverSlug);
  const { openProject, exitGer, setHoverSlug } = useStore.getState();
  return (
    <nav className="interior-panel" style={{ "--accent": ger.accent } as React.CSSProperties} aria-label={`${ger.name} projects`}>
      <span className="orn" aria-hidden />
      <div className="interior-head">
        <p className="kicker">Inside the ger</p>
        <h2>{ger.name}</h2>
        <p className="interior-blurb">{ger.blurb}</p>
      </div>
      <ul className="interior-list">
        {projectsInGer(gerId).map((p) => (
          <li key={p.slug}>
            <button
              type="button"
              className={hoverSlug === p.slug ? "is-hover" : undefined}
              onClick={() => openProject(p.slug)}
              onPointerEnter={() => setHoverSlug(p.slug)}
              onPointerLeave={() => setHoverSlug(null)}
              onFocus={() => setHoverSlug(p.slug)}
              onBlur={() => setHoverSlug(null)}
            >
              <span className="il-mark" aria-hidden />
              <span className="il-title">{p.title}</span>
              {p.featured && <span className="badge">Featured</span>}
            </button>
          </li>
        ))}
      </ul>
      <p className="interior-hint">Drag to look around. Click anything on the walls.</p>
      <button type="button" className="exit" onClick={exitGer}>
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
          <path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
        Back outside <kbd>Esc</kbd>
      </button>
    </nav>
  );
}

function MapView({ onPick }: { onPick: (id: GerId) => void }) {
  return (
    <div className="map">
      <CampMap onPick={onPick} labels className="campmap-large" />
      <ul className="map-list">
        {gers.map((g) => (
          <li key={g.id}>
            <button type="button" onClick={() => onPick(g.id)} style={{ "--accent": g.accent } as React.CSSProperties}>
              <span className="ml-swatch" aria-hidden />
              <span className="ml-name">{g.name}</span>
              <small>{projectsInGer(g.id).length} projects</small>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
