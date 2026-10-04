import type { Ger, GerId } from "./types";

export const gers: Ger[] = [
  {
    id: "about",
    name: "About & Contact",
    blurb: "Who I am, where I've worked, and how to reach me.",
    accent: "#b8372b",
  },
  {
    id: "vision",
    name: "Computer Vision & 3D",
    blurb: "Turning pixels into geometry: tracking, calibration, reconstruction, and 3D in the browser.",
    accent: "#1d4f9a",
  },
  {
    id: "ai",
    name: "AI & Research",
    blurb: "Forecasting, video generation, and agents that learn a task from a few demonstrations.",
    accent: "#c99316",
  },
  {
    id: "robotics",
    name: "Robotics & Simulation",
    blurb: "Simulators, autonomy stacks, and robots you control with your hands.",
    accent: "#d0611c",
  },
  {
    id: "products",
    name: "Products & Full-stack",
    blurb: "Shipped apps and platforms, from social climbing feeds to an online school.",
    accent: "#2f7d5b",
  },
];

export const gerById = Object.fromEntries(gers.map((g) => [g.id, g])) as Record<GerId, Ger>;
