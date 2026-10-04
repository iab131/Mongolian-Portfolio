import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectDetail } from "@/components/ui/ProjectDetail";
import { projectBySlug, projects } from "@/content/projects";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = projectBySlug[slug];
  if (!p) return {};
  return {
    title: `${p.title} · Enhe Bai`,
    description: p.pitch,
    openGraph: { title: p.title, description: p.pitch, images: p.image ? [p.image] : undefined },
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = projectBySlug[slug];
  if (!project) notFound();
  return (
    <div className="page-shell">
      <div className="page-band" aria-hidden>
        <span className="orn" />
      </div>
      <main className="page page-narrow">
        <nav className="page-nav">
          <Link href="/projects">← All projects</Link>
          <Link href={`/?project=${project.slug}`}>See it in the ger →</Link>
        </nav>
        <ProjectDetail project={project} headingLevel={1} />
      </main>
    </div>
  );
}
