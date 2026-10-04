"use client";

import { gers } from "@/content/gers";
import { projectsInGer } from "@/content/projects";
import { setLabelEl } from "@/lib/labels";
import { useStore } from "@/lib/store";

/** DOM labels that follow 3D anchors (see LabelAnchor). Real text, real buttons. */
export function Labels() {
  const mode = useStore((s) => s.mode);
  const gerId = useStore((s) => s.gerId);
  const hoverSlug = useStore((s) => s.hoverSlug);
  const nearGerId = useStore((s) => s.nearGerId);
  const { openProject, setHoverSlug } = useStore.getState();

  return (
    <div className="labels">
      {mode === "world" &&
        gers.map((g) => (
          <div
            key={g.id}
            ref={(el) => setLabelEl(`ger-${g.id}`, el)}
            className={`label3d ger-sign${nearGerId === g.id ? " is-near" : ""}`}
            style={{ "--accent": g.accent } as React.CSSProperties}
          >
            <span className="ger-sign-band" aria-hidden />
            <span className="ger-sign-name">{g.name}</span>
          </div>
        ))}
      {mode === "interior" &&
        gerId &&
        projectsInGer(gerId).map((p) => (
          <button
            key={p.slug}
            type="button"
            tabIndex={-1}
            ref={(el) => setLabelEl(`hang-${p.slug}`, el)}
            className={`label3d hanging-label${hoverSlug === p.slug ? " is-hover" : ""}`}
            onClick={() => openProject(p.slug)}
            onPointerEnter={() => setHoverSlug(p.slug)}
            onPointerLeave={() => setHoverSlug(null)}
          >
            {p.featured && (
              <>
                <span className="hanging-star" aria-hidden />
                <span className="sr-only">Featured: </span>
              </>
            )}
            {p.title}
          </button>
        ))}
    </div>
  );
}
