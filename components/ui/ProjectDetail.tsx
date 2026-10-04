import Image from "next/image";
import { gerById } from "@/content/gers";
import type { Project } from "@/content/types";

/** Project write-up. Used in the in-world panel and on /projects/[slug]. */
export function ProjectDetail({ project, headingLevel = 2 }: { project: Project; headingLevel?: 1 | 2 }) {
  const ger = gerById[project.ger];
  const H = headingLevel === 1 ? "h1" : "h2";
  return (
    <article className="project-detail" style={{ "--accent": ger.accent } as React.CSSProperties}>
      {project.image && (
        <div className="project-hero">
          <Image src={project.image} alt={project.imageAlt ?? ""} width={1000} height={600} sizes="(max-width: 640px) 100vw, 560px" />
        </div>
      )}
      <header className="project-header">
        <p className="project-ger">
          <span className="diamond" aria-hidden />
          {ger.name}
        </p>
        <H className="project-title">{project.title}</H>
        {project.meta && <p className="project-meta">{project.meta}</p>}
      </header>
      <p className="project-pitch">{project.pitch}</p>

      {project.sections.map((s) => (
        <section key={s.heading} className="project-section">
          <h3>{s.heading}</h3>
          {s.body && <p>{s.body}</p>}
          {s.bullets && (
            <ul className="bullets">
              {s.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
        </section>
      ))}

      {project.stack && project.stack.length > 0 && (
        <section className="project-section">
          <h3>Stack</h3>
          <ul className="chips">
            {project.stack.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
      )}

      {project.links && project.links.length > 0 && (
        <section className="project-section">
          <h3>Links</h3>
          <ul className="links">
            {project.links.map((l) => (
              <li key={l.href}>
                <a href={l.href} target="_blank" rel="noreferrer">
                  {l.label}
                  <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden>
                    <path d="M5 3h8v8M13 3L3 13" fill="none" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {project.notes && project.notes.length > 0 && (
        <section className="project-section project-notes">
          <h3>Accuracy notes</h3>
          <ul className="bullets">
            {project.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
