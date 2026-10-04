import type { Metadata } from "next";
import Link from "next/link";
import { ProjectList } from "@/components/ui/ProjectList";

export const metadata: Metadata = {
  title: "Projects · Enhe Bai",
  description: "Every project, grouped by ger: computer vision & 3D, AI & research, robotics & simulation, products & full-stack.",
};

export default function ProjectsPage() {
  return (
    <div className="page-shell">
      <div className="page-band" aria-hidden>
        <span className="orn" />
      </div>
      <main className="page">
        <nav className="page-nav">
          <Link href="/">← Ride the steppe</Link>
        </nav>
        <header className="page-hero">
          <p className="kicker">Enhe Bai · Portfolio</p>
          <h1 className="page-title">Projects</h1>
          <p className="page-lede">Everything from the ger camp, without the ride. Each group is one ger.</p>
        </header>
        <ProjectList />
      </main>
    </div>
  );
}
