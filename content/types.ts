export type GerId = "about" | "vision" | "ai" | "robotics" | "products";

export type Ger = {
  id: GerId;
  name: string;
  blurb: string;
  /** Door / accent colour. */
  accent: string;
};

export type Section = {
  heading: string;
  body?: string;
  bullets?: string[];
};

export type Link = { label: string; href: string };

export type Project = {
  slug: string;
  ger: GerId;
  title: string;
  /** One-line pitch. */
  pitch: string;
  /** e.g. "2025 to now · Technical co-founder" */
  meta?: string;
  /** Path under /public. */
  image?: string;
  imageAlt?: string;
  sections: Section[];
  stack?: string[];
  links?: Link[];
  /** Honest caveats about what is and isn't done. */
  notes?: string[];
  /** Goes on the altar (khoimor) opposite the door. One per ger. */
  featured?: boolean;
};
