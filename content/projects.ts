import type { GerId, Project } from "./types";

// Sources: Resume/CRUXLY_RESUME_PROJECT.md, Resume/RESUME_TECH_SKILLS.md, about-me.md.
// Only state what those sources state. Keep the accuracy notes.

const CRUXLY_NOTES = [
  "Image-to-3D reconstruction is implemented, but scale is assumed or only partly calibrated.",
  "MiDaS depth is relative, not metric.",
  "PPO training and full-route simulation are not implemented yet. The RL work is an environment plus baselines, not a trained agent.",
];

export const projects: Project[] = [
  // ───────────────────────── About & Contact ─────────────────────────
  {
    slug: "about-me",
    ger: "about",
    featured: true,
    title: "Enhe Bai",
    pitch:
      "Computer Science (co-op) student at the University of Waterloo who builds across AI research, computer vision, robotics, 3D graphics and full-stack web.",
    meta: "University of Waterloo · 2025 to 2030",
    sections: [
      {
        heading: "Hi",
        body: "Most of my projects mix at least two of AI research, computer vision, robotics, 3D graphics and full-stack web. This portfolio is a ger camp on the steppe: each ger holds one kind of work.",
      },
      {
        heading: "Award",
        bullets: ["Mathematics National Scholarship at Waterloo (15 recipients out of 1,300 students)."],
      },
      {
        heading: "Outside of code",
        bullets: ["Racing and F1 (sim racing)", "Badminton", "Climbing and bouldering", "Soccer"],
      },
    ],
    links: [
      { label: "GitHub", href: "https://github.com/iab131" },
      { label: "LinkedIn", href: "https://www.linkedin.com/in/enhebai/" },
    ],
  },
  {
    slug: "work",
    ger: "about",
    title: "Work",
    pitch: "Internships, research, and the companies I've helped build.",
    sections: [
      {
        heading: "Software Engineering Intern · TMX Group (Toronto Stock Exchange)",
        body: "May 2026 to now",
        bullets: [
          "Async Python checker for 5 Hive tables (up to 5x faster) with Kafka email alerts.",
          "Automated quarterly reports (GCP, SQL, Google Sheets) deployed on AWS EKS with Docker and Helm, saving 4 hours a quarter.",
          "Gemini chatbot that routes missing-trade alerts and loads form data into the database.",
        ],
      },
      {
        heading: "Applied ML Researcher · RBC Borealis, Let's Solve It",
        body: "Jan to Apr 2026",
        bullets: [
          "City traffic forecasting with graph Fourier transforms and bi-axis Mamba.",
          "Built STAE-Spectral-Mamba (PEMS-BAY MAE 1.580 to 1.550; 3.283 MAE on METR-LA).",
        ],
      },
      {
        heading: "Technical Co-Founder · ARISE",
        body: "Apr 2025 to now",
        bullets: ["LEGO robotics simulator and education platform. See the Robotics ger."],
      },
      {
        heading: "Full-stack Developer · Elis Academy",
        body: "Jun to Aug 2025",
        bullets: [
          "Next.js site run from Notion, so staff update it without code (saves 12+ hours a month).",
          "Lazy-loaded video cut load time by 1.4 s.",
          "Contact form email system.",
        ],
      },
      {
        heading: "Engineer · Ambition",
        bullets: [
          "Features for a social learning app: the Waymond and Viamond AI agents, texting, AI-generated lesson plans and visuals, interest matching and community tools.",
        ],
      },
    ],
  },
  {
    slug: "skills",
    ger: "about",
    title: "Skills",
    pitch: "The tools I reach for.",
    sections: [
      { heading: "Languages", bullets: ["Python, C/C++, C#, Java, JavaScript, TypeScript, SQL, HTML/CSS, PHP"] },
      {
        heading: "AI / ML",
        bullets: [
          "PyTorch, TensorFlow, Transformers, Mamba/SSMs, graph ML, OpenCV, YOLO, RAG, LangChain, ChromaDB, diffusion video models",
        ],
      },
      {
        heading: "Robotics and simulation",
        bullets: ["ROS 2, Unity, ProjectAirSim, MuJoCo, MQTT, Jetson Nano, AR"],
      },
      { heading: "3D and graphics", bullets: ["Three.js, React Three Fiber, Gaussian splats"] },
      {
        heading: "Data and cloud",
        bullets: ["PostgreSQL, MongoDB, Firestore, Supabase, Kafka, Cloudflare R2, Docker, Kubernetes, GCP, AWS"],
      },
      { heading: "Web", bullets: ["Next.js, React, Node.js, FastAPI, Flask, Prisma, Tailwind CSS, Vercel"] },
    ],
  },
  {
    slug: "contact",
    ger: "about",
    title: "Contact",
    pitch: "Say hi. I'm happy to talk about co-op roles, research, or anything on the steppe.",
    sections: [],
    links: [
      { label: "GitHub · iab131", href: "https://github.com/iab131" },
      { label: "LinkedIn · enhebai", href: "https://www.linkedin.com/in/enhebai/" },
      { label: "Previous site", href: "https://enhe-bai.vercel.app" },
    ],
  },

  // ───────────────────────── Computer Vision & 3D ─────────────────────────
  {
    slug: "steria",
    ger: "vision",
    featured: true,
    title: "Steria (FieldWalk)",
    pitch: "Turns soccer broadcast video into a 3D replay you can watch from any angle.",
    image: "/projects/fieldwalk.jpg",
    imageAlt: "3D soccer replay of a broadcast play",
    sections: [
      {
        heading: "Problem",
        body: "A broadcast shows one camera angle. To understand a play tactically, you want to see it from above, from a player's view, or following the ball.",
      },
      {
        heading: "Approach",
        bullets: [
          "Python pipeline with OpenCV and YOLO-based detection (plus ByteTrack and RT-DETR evaluation) to extract player and ball tracks from broadcast video, with HSV field masking and preview-based validation.",
          "Pitch keypoint detection, camera calibration, and homography to project 2D detections into field coordinates, with temporal smoothing and per-frame quality checks.",
          "Compact JSON replay format: 10 FPS coordinate frames interpolated to smooth 60 FPS playback in the browser.",
        ],
      },
      {
        heading: "Result",
        body: "A Next.js + React Three Fiber stadium with 9 camera modes, including tactical, broadcast, free-camera, player-follow and ball-follow views.",
      },
    ],
    stack: ["Next.js", "TypeScript", "Three.js", "React Three Fiber", "Zustand", "Python", "OpenCV", "YOLO", "ByteTrack", "Homography"],
    links: [{ label: "Live demo", href: "https://steria.udulaa.com" }],
  },
  {
    slug: "cruxly-vision",
    ger: "vision",
    title: "Cruxly · Wall to 3D",
    pitch: "From one photo of a climbing wall to a structured 3D scene of panels and holds.",
    image: "/projects/cruxly-wall.jpg",
    imageAlt: "Climbing wall with detected holds",
    sections: [
      {
        heading: "Approach",
        bullets: [
          "Detects holds, validates detector class compatibility, segments hold silhouettes, estimates relative depth with MiDaS, and builds colored point clouds.",
          "Reconstructs multi-panel walls from a single RGB image with plane fitting, panel separation, homography calibration, and T-nut lattice detection, mapped into shared world coordinates with provenance-tagged scale estimates.",
          "Generates distinct 3D hold meshes from silhouettes, PCA size and orientation, sampled colors, and depth-residual protrusion, instead of generic blocks.",
          "Typed geometry pipeline from Hold2D to WallScene3D to MuJoCo scenes, exported as JSON, PLY and OBJ.",
        ],
      },
      {
        heading: "Data tooling",
        body: "Polygon and box annotation, YOLO detection/segmentation export, validation, leakage checks, stats, contact sheets and uncertain-label tracking.",
      },
    ],
    stack: ["Python", "FastAPI", "OpenCV", "NumPy", "Ultralytics YOLO", "MiDaS", "Segment Anything"],
    links: [{ label: "Cruxly", href: "https://cruxxly.vercel.app" }],
    notes: CRUXLY_NOTES.slice(0, 2),
  },
  {
    slug: "gaussian-splat-viewer",
    ger: "vision",
    title: "Scene Gaussian Splat Viewer",
    pitch: "View 3D Gaussian splat scenes in the browser, record a camera path, and export it as an MP4.",
    sections: [
      {
        heading: "What it does",
        bullets: ["Loads Gaussian splat scenes in the browser.", "Records a camera path through the scene.", "Exports the path as an MP4 video."],
      },
    ],
    stack: ["Gaussian splats"],
  },
  {
    slug: "aerolab",
    ger: "vision",
    title: "AeroLab · Wind Tunnel",
    pitch: "Drop a 3D model into a browser wind tunnel and watch the air flow around it.",
    image: "/projects/windtunnel.jpg",
    imageAlt: "Airflow visualised around a model in a virtual wind tunnel",
    sections: [{ heading: "What it does", body: "A browser wind tunnel built with React Three Fiber: load a model and see the flow around it." }],
    stack: ["React Three Fiber", "Three.js"],
  },
  {
    slug: "marauders-map",
    ger: "vision",
    title: "Marauder's Map",
    pitch: "A Harry Potter style parchment map that shows people moving as footprints, from Wi-Fi sensing.",
    image: "/projects/marauder.jpg",
    imageAlt: "Parchment map with footprints",
    sections: [{ heading: "What it is", body: "A visual plugin for RuView (Wi-Fi sensing) that draws detected people as footprints on a parchment map." }],
  },

  // ───────────────────────── AI & Research ─────────────────────────
  {
    slug: "stae-spectral-mamba",
    ger: "ai",
    featured: true,
    title: "STAE-Spectral-Mamba",
    pitch: "City traffic forecasting with graph Fourier transforms and bi-axis Mamba.",
    meta: "RBC Borealis, Let's Solve It · Jan to Apr 2026",
    sections: [
      { heading: "Problem", body: "Forecast traffic across a road network from its sensors (207 sensors on METR-LA)." },
      { heading: "Approach", body: "Graph Fourier transforms over the sensor graph combined with a bi-axis Mamba state-space model." },
      {
        heading: "Result",
        bullets: ["PEMS-BAY MAE improved from 1.580 to 1.550.", "3.283 MAE on METR-LA, the best public reproducible result I found."],
      },
    ],
    stack: ["PyTorch", "Mamba / SSMs", "Graph ML"],
  },
  {
    slug: "ms-dts-rope",
    ger: "ai",
    title: "MS-DTS-RoPE",
    pitch: "Long, multi-shot text-to-video without retraining.",
    sections: [
      {
        heading: "Approach",
        bullets: [
          "Changes how the video model tracks time during denoising.",
          "Adds storyboard shots with hard cuts and soft transitions.",
          "Keeps characters consistent across shots.",
        ],
      },
      { heading: "Setup", body: "Built on Wan2.1 with an 8-run ablation harness." },
    ],
    stack: ["Diffusion video models", "Wan2.1", "PyTorch"],
  },
  {
    slug: "again",
    ger: "ai",
    title: "again",
    pitch: "Do a task about 3 times and again learns the procedure, proves it correct, then runs the repeats with zero AI calls.",
    meta: "Agents for Humans Hackathon",
    image: "/projects/again.jpg",
    imageAlt: "again showing a workflow inferred from three demonstrations",
    sections: [
      {
        heading: "How it works",
        bullets: [
          "Watches a few demonstrations of the same task.",
          "Infers the rules behind them and asks about cases the demos didn't cover.",
          "Runs later repeats deterministically, without model calls.",
        ],
      },
    ],
    stack: ["Strands Agents SDK"],
  },
  {
    slug: "skillrouter",
    ger: "ai",
    title: "SkillRouter",
    pitch: "Open-source agent skills that scan a repo, recommend skills, and safely find, write and audit new ones.",
    sections: [{ heading: "Design", body: "Local-first, no network access by default." }],
    stack: ["Agent skills"],
  },
  {
    slug: "clarifi",
    ger: "ai",
    title: "ClariFi",
    pitch: "Financial and career guidance with a RAG chatbot over 1,000+ PDF pages, plus a mock interview scorer.",
    sections: [
      { heading: "What it does", bullets: ["RAG chatbot over 1,000+ pages of PDFs.", "Mock interview scorer using Llama 3.1."] },
    ],
    stack: ["RAG", "Llama 3.1"],
  },
  {
    slug: "spotilike",
    ger: "ai",
    title: "Spotilike",
    pitch: "An AI music recommender that makes playlists from your mood.",
    sections: [],
    stack: ["Flask", "MongoDB", "TensorFlow", "Gemini", "Spotify API"],
  },

  // ───────────────────────── Robotics & Simulation ─────────────────────────
  {
    slug: "arise",
    ger: "robotics",
    featured: true,
    title: "ARISE",
    pitch: "All-in-one robotics education: design, code with blocks, and test LEGO-style robots in a physics sim.",
    meta: "Apr 2025 to now · Technical co-founder",
    image: "/projects/arise.jpg",
    imageAlt: "ARISE robotics simulator",
    sections: [
      {
        heading: "Product",
        bullets: [
          "Unity physics sim with 55 brick types and AR.",
          "Block-based coding for students.",
          "Cloud saves (Firebase) for 200+ students, plus a Next.js web platform.",
        ],
      },
      {
        heading: "Traction",
        bullets: [
          "Grew out of the Scarborough STEM Alliance (100+ workshops, 1,000+ youth).",
          "Pitched to YC, a16z and Founders Inc.",
          "Accepted to the North Forge Founder Program; top 15 of 160 at the Queens Entrepreneurs Competition.",
        ],
      },
    ],
    stack: ["Unity", "C#", "Firebase", "Next.js", "AR"],
    links: [{ label: "arisesim.com", href: "https://www.arisesim.com" }],
  },
  {
    slug: "cruxly-sim",
    ger: "robotics",
    title: "Cruxly · Climber Sim",
    pitch: "A 19-DOF MuJoCo climber, plus a Gymnasium RL environment with scripted and random baselines.",
    sections: [
      {
        heading: "Climber",
        body: "15-body, 19-DOF articulated climber with joint limits, contact sites, configurable mass and height, four-contact static-pose settling, support constraints, and wall collision handling.",
      },
      {
        heading: "Environment",
        bullets: [
          "Gymnasium single-hand-reach task: 77-D observations, 5-D position-control actions, phase-based task states.",
          "Decomposed rewards, contact validation, support-preservation penalties, wall-penetration checks, fall detection and success-duration requirements.",
          "Scripted, no-op and random baselines with deterministic checks and biomechanics metrics (reach ratio, COM stability, support error, joint margins).",
        ],
      },
    ],
    stack: ["MuJoCo", "Gymnasium", "Python"],
    notes: [CRUXLY_NOTES[2]],
  },
  {
    slug: "redteamhacks",
    ger: "robotics",
    title: "RedTeamHacks",
    pitch: "A ROS 2 autonomy stack for a simulated drone.",
    image: "/projects/redteam.jpg",
    imageAlt: "Simulated drone mission",
    sections: [
      {
        heading: "What it does",
        bullets: [
          "Reads arrows and counts spheres with OpenCV.",
          "Spots vehicles with YOLO11.",
          "Chooses its route with a mission state machine.",
        ],
      },
    ],
    stack: ["ROS 2", "OpenCV", "YOLO11"],
  },
  {
    slug: "kenesis",
    ger: "robotics",
    title: "Kenesis",
    pitch: "A two-wheel robot with a 3-joint arm, driven by hand gestures through Snap AR glasses.",
    sections: [{ heading: "Result", body: "Runs on a Jetson Nano with under 100 ms of lag from gesture to motion." }],
    stack: ["Jetson Nano", "Snap AR glasses"],
  },
  {
    slug: "battle-of-school",
    ger: "robotics",
    title: "Battle of School",
    pitch: "Robot simulation and control for a BracketBot model (54 links, 53 joints).",
    image: "/projects/robot.jpg",
    imageAlt: "Robot control panel with puppet mode and presets",
    sections: [{ heading: "What it includes", bullets: ["URDF viewer.", "Teleop moves and presets."] }],
    stack: ["URDF", "Robotics"],
  },

  // ───────────────────────── Products & Full-stack ─────────────────────────
  {
    slug: "cruxly",
    ger: "products",
    featured: true,
    title: "Cruxly",
    pitch: "A climbing platform: share problems, annotate beta, and talk about it in real time.",
    image: "/projects/cruxly-hero.jpg",
    imageAlt: "Cruxly climbing platform",
    sections: [
      {
        heading: "Platform",
        bullets: [
          "Climbing-problem uploads with location metadata, social feeds, likes, saves and comments.",
          "Image-based commenting with text, image, video and gallery support, R2 uploads, optimistic UI, pagination and real-time Pusher events.",
        ],
      },
      {
        heading: "Beta annotator",
        body: "Multi-step sequences with a draggable 13-joint climber, pose presets (heel hook, toe hook, drop knee, flag, cross, high step, dyno), freehand drawing, arrows, labels, undo and annotated-image export.",
      },
      {
        heading: "Beyond the web app",
        body: "The same project includes the wall-to-3D vision pipeline (Vision ger) and the MuJoCo climber (Robotics ger).",
      },
    ],
    stack: ["Next.js", "React", "TypeScript", "Prisma", "PostgreSQL", "Clerk", "Cloudflare R2", "Pusher", "Leaflet"],
    links: [{ label: "cruxxly.vercel.app", href: "https://cruxxly.vercel.app" }],
  },
  {
    slug: "cubby",
    ger: "products",
    title: "Cubby",
    pitch: "A shared 3D grid of rooms, one per person, showing what they build and love.",
    sections: [
      {
        heading: "How it works",
        body: "Visitors ask their own Claude for a \"room code\" and paste it in. The grid grows as rooms fill up.",
      },
    ],
    stack: ["Three.js", "Supabase", "Google sign-in", "Vercel"],
    links: [{ label: "cubbyroom.vercel.app", href: "https://cubbyroom.vercel.app" }],
  },
  {
    slug: "ctrl",
    ger: "products",
    title: "CTRL",
    pitch: "Show your computer a task once and it learns to repeat it.",
    sections: [
      {
        heading: "How it works",
        body: "A Windows recorder (Sender) and player (Receiver) share .ctrl workflow files, with UI automation through FlaUI.",
      },
    ],
    stack: ["C#", "FlaUI", "Windows"],
  },
  {
    slug: "elis-academy",
    ger: "products",
    title: "Elis Academy",
    pitch: "A Next.js site run from Notion, so staff update it without code.",
    meta: "Jun to Aug 2025 · Full-stack developer",
    image: "/projects/elis.jpg",
    imageAlt: "Elis Academy website",
    sections: [
      {
        heading: "Result",
        bullets: ["Saves staff 12+ hours a month.", "Lazy-loaded video cut load time by 1.4 s.", "Contact form email system."],
      },
    ],
    stack: ["Next.js", "Notion API"],
  },
  {
    slug: "ambition",
    ger: "products",
    title: "Ambition",
    pitch: "Features for a social learning app, including the Waymond and Viamond AI agents.",
    image: "/projects/waymond.jpg",
    imageAlt: "Waymond, a pixel-art TV character",
    sections: [
      {
        heading: "What I built",
        bullets: ["Waymond and Viamond AI agents.", "Texting.", "AI-generated lesson plans and visuals.", "Interest matching and community tools."],
      },
    ],
  },
  {
    slug: "qgc-virtual",
    ger: "products",
    title: "QGC Virtual",
    pitch: "Setting up Queens Glen Online, a real online school.",
    sections: [],
    stack: ["Moodle", "PostgreSQL", "Zoom", "Cloudflare"],
  },
];

export const projectBySlug = Object.fromEntries(projects.map((p) => [p.slug, p])) as Record<string, Project>;

/** Featured first, then in file order. */
export function projectsInGer(id: GerId): Project[] {
  const list = projects.filter((p) => p.ger === id);
  return [...list.filter((p) => p.featured), ...list.filter((p) => !p.featured)];
}
