import Image from "next/image";
import Link from "next/link";
import { gers } from "@/content/gers";
import { projectsInGer } from "@/content/projects";

/**
 * Every project, grouped by ger. The no-3D way in.
 * With `onSelect` (inside the world) items open the panel; without it they link to /projects/[slug].
 */
export function ProjectList({ onSelect }: { onSelect?: (slug: string) => void }) {
  return (
    <div className="project-list">
      {gers.map((g) => (
        <section key={g.id} className="list-ger" style={{ "--accent": g.accent } as React.CSSProperties}>
          <header className="list-ger-head">
            <span className="orn" aria-hidden />
            <h2>{g.name}</h2>
            <p>{g.blurb}</p>
          </header>
          <ul>
            {projectsInGer(g.id).map((p) => {
              const inner = (
                <>
                  <span className="card-thumb">
                    {p.image ? (
                      <Image src={p.image} alt="" width={320} height={200} sizes="(max-width: 640px) 100vw, 320px" />
                    ) : (
                      <span className="card-glyph" aria-hidden>
                        {p.title[0]}
                      </span>
                    )}
                    {p.featured && <span className="badge card-badge">Featured</span>}
                  </span>
                  <span className="card-body">
                    <strong>{p.title}</strong>
                    <span>{p.pitch}</span>
                  </span>
                </>
              );
              return (
                <li key={p.slug}>
                  {onSelect ? (
                    <button type="button" className="card" onClick={() => onSelect(p.slug)}>
                      {inner}
                    </button>
                  ) : (
                    <Link className="card" href={`/projects/${p.slug}`}>
                      {inner}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
