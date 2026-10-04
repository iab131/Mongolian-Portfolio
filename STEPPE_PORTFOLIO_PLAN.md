# Steppe Portfolio — Plan

Interactive 3D portfolio: ride a horse across the Mongolian grassland. Each **ger** (yurt) is a project category. Ride up, enter, and the projects inside are the detailed case studies.

Status: **Phase 1 greybox built** (2026-10-03). See README.md. Phase 0 decisions taken with defaults: Next.js, 5 gers (About, Vision & 3D, AI & Research, Robotics & Simulation, Products & Full-stack), flat-shaded low-poly, horse only (no rider), English-only UI.

---

## 1. Concept

| Real thing | In the portfolio |
|---|---|
| Open steppe, big sky | The "world" / navigation space |
| Horse | The player (replaces the car in typical Three.js portfolios) |
| Ger camp (*ail*) | Cluster of category gers |
| Ger interior | One category's projects, as objects you can click |
| Ovoo (stone cairn with blue *khadag*) | Spawn point + About/Contact |

**Core loop:** ride → see a ger → "Press E / tap to enter" → interior → click a project object → detail panel → exit → horse waiting outside.

**Non-negotiable:** a plain, fast, no-3D way to reach every project (recruiters won't ride around for 2 minutes). See §7.

---

## 2. Content mapping (draft — needs your input)

Based on `CRUXLY_RESUME_PROJECT.md` and `RESUME_TECH_SKILLS.md`. Only two projects are known, so categories below are a proposal.

| Ger | Category | Projects inside | Exterior prop (idea) |
|---|---|---|---|
| 1 | Computer Vision & Spatial | FieldWalk (tracking, homography, 3D replay), Cruxly CV/image-to-3D pipeline | Eagle on a perch (eagle hunter = sharp eyes / tracking) |
| 2 | Full-stack Web | Cruxly platform (Next.js, Prisma, Clerk, R2, Pusher) | Cart / loaded camel |
| 3 | Simulation & RL | Cruxly MuJoCo climber, Gymnasium env + baselines | Horse-training post (training an agent = training a horse) |
| 4 | About & Contact (the "home" ger, largest) | Bio, resume PDF, links | Smoke from chimney, ovoo next to it |

Keep claims accurate in the UI, per the accuracy notes already in the Cruxly file (e.g. RL = environment + baselines, not a trained agent; depth is relative, not metric).

Content lives in data files (JSON/MDX), fully decoupled from 3D code, so adding a project never touches the scene.

**Project detail panel (HTML overlay, not 3D text):** hero video/GIF → one-line pitch → problem / approach / result → stack chips → links (repo, live) → "accuracy notes" if needed.

---

## 3. World design

```
                 N  (distant mountain ring, fog)
        ┌──────────────────────────────────────┐
        │      [Ger 2]            [Ger 3]       │
        │            [About ger]                │
        │   [Ger 1]                             │
        │                                       │
        │      herd of sheep/goats wandering    │
        │                                       │
        │                 (ovoo) ← spawn        │
        └──────────────────────────────────────┘
                 S
```

- **Size:** small. About 15–20 s of riding from spawn to the farthest ger. Don't build a huge world.
- **Terrain:** rolling hills from analytic noise (one function shared by mesh generation and CPU height queries so the horse sticks to the ground). Worn dirt tracks fade into each ger.
- **Grass:** instanced blades near the camera with wind in the vertex shader; flat painted colour far away. Gold/green palette.
- **Sky:** gradient + stylised clouds, big sun. Mongolia = "Eternal Blue Sky" (*Möngkh Khökh Tengri*), so make the blue deep and vivid.
- **Life:** wandering sheep/goats, an eagle circling, occasional distant horses. Cheap and does most of the atmosphere.
- **Time of day (stretch):** sunset/night with stars and glowing ger doors.
- **Ger orientation:** doors face south, as is traditional. Players approach from the south naturally.

### Ger (procedural, so no asset dependency)
Cylinder lattice wall + cone roof, white felt look, rope bands, red/orange door with painted ornament, *toono* (roof ring) on top, chimney with smoke particles. One parametric component, 4 instances with different props and signs.

### Ger interior (separate scene, loaded on entry)
Traditional layout makes the placement of content natural:
- **Hearth** (centre): glowing; maybe the "contact / about" focal point
- **Two *bagana* pillars** + ***toono*** overhead letting a light shaft in
- **Beds left and right**, **trunks/chests**, low table
- **Altar (*khoimor*) opposite the door**: the "featured" project goes here
- Each project = one object on a wall hanging, trunk, or table. Hover highlights, click opens the detail panel.
- Interior camera: fixed-ish orbit or slow first-person look; no driving.

---

## 4. Player & controls

- **Horse:** low-poly rigged horse with idle / walk / trot / gallop blended by speed. Rider optional (small deel-wearing figure; can be you).
- **Movement:** kinematic controller, not a physics engine. Heightfield for ground, circle colliders for gers/props. Smooth turning with inertia (horse should feel heavy, not like a car).
- **Camera:** third-person follow, spring-damped, looks slightly ahead.
- **Keys:** WASD/arrows, Shift = gallop, E/Enter = enter/interact, Esc = exit/close, M = map/fast-travel.
- **Mobile:** virtual joystick + tap buttons.
- **Audio (opt-in, mute by default due to autoplay rules):** hoofbeats on grass, wind, *morin khuur* ambient, hearth crackle inside. Throat singing only as a subtle stretch easter egg.

---

## 5. Tech stack

Matches what you already used in FieldWalk, so low learning cost.

- **Next.js (App Router) + TypeScript** — chosen over plain Vite so each ger/project has a real URL (`/ger/computer-vision`, `/projects/fieldwalk`), real HTML for SEO/link previews, and a no-3D fallback. The 3D world is a client-only dynamic import.
  - *Alternative:* Vite SPA is simpler if you don't care about shareable project URLs.
- **React Three Fiber + Drei**, **Zustand** for state (mode: world/interior, current project, quality tier, mute).
- **Three.js shaders** for grass and sky. No physics library.
- **Tailwind** for the UI overlay/panels.
- **Assets:** Blender for any custom models; glTF with Draco/meshopt; KTX2 textures. Horse: look for a CC0 rigged low-poly horse (Quaternius animal packs are the first place to check; verify licence and that it has walk/gallop clips), or commission/model one.
- **Hosting:** Vercel or Cloudflare Pages.

---

## 6. Art direction

- **Style:** stylised low-poly / flat-shaded with soft gradients. Cheap to render, hides asset inconsistency, reads clearly at a glance. (Painterly or photoreal is far costlier and not recommended for v1.)
- **Palette:** steppe gold-green, deep sky blue, felt white, plus ger-door/deel accent colours (orange, red, deep blue, yellow).
- **Mongolian identity touches** (please sanity-check these, you know the culture better than I do):
  - Signs in English only. No Cyrillic: the owner is Chinese Mongolian, so any Mongolian text would be traditional vertical script, supplied/checked by the owner.
  - Ornamental patterns (e.g. endless knot, *ulzii*) on doors, trims, panel borders
  - Soyombo as logo/loading mark
  - Blue *khadag* on the ovoo
- **Easter eggs (stretch):** Naadam three games — a tiny archery target, a horse race against a ghost rider, a wrestling pose near the About ger.

---

## 7. Fallbacks & accessibility

- **"Skip the ride" button** always visible: opens a clean list/grid of all projects (same data, same detail panels).
- **Fast-travel menu / minimap:** jump straight to any ger.
- Respect `prefers-reduced-motion` (no camera shake, calmer transitions).
- Captions/labels for any audio; keyboard-reachable UI; all text in real DOM.
- WebGL-unavailable → automatically fall back to the list mode.

---

## 8. Performance budget

- Target 60 fps on a mid laptop iGPU, 30+ on mid phones.
- <100k triangles on screen, <150 draw calls; instance grass, herd, and fences.
- One shadow-casting directional light with a small frustum that follows the horse; everything else baked or unlit.
- Interiors lazy-loaded; first load aims for <5 MB with a themed loading screen (horse silhouette runs along a progress bar).
- Drei `PerformanceMonitor` to drop quality tier (grass density, shadows, pixel ratio) automatically.

---

## 9. Phases

| Phase | Goal | Size |
|---|---|---|
| 0 | Decisions: final categories, project list, collect screenshots/videos per project, pick art/asset sources | S |
| 1 | **Greybox vertical slice:** terrain, capsule "horse," follow camera, 4 box gers, enter → interior box → real project panel with real content. Proves the whole loop. | M |
| 2 | Real horse + animation, procedural ger, grass, sky, paths, fog, mountains | L |
| 3 | Interiors: layout, props, lighting, project hotspots, transitions | M |
| 4 | Life & sound: herd, eagle, smoke, ovoo, audio, loading screen | M |
| 5 | Fallback list mode, deep links/SEO, mobile controls, perf pass, deploy + custom domain | M |
| 6 | Stretch: day/night, Naadam mini-games, Mongolian language toggle | open-ended |

Build **Phase 1 first** and show real content early; polish (Phases 2–4) comes only after the loop feels good.

---

## 10. Risks

| Risk | Mitigation |
|---|---|
| Horse model/animation is the hardest asset | Start with CC0 pack; capsule placeholder until Phase 2; keep gait set minimal (walk/trot/gallop) |
| Scope creep (it's a fun project to over-build) | Phase gates; ship Phase 1 + 5 before polishing |
| Recruiter/visitor patience | Skip button, fast travel, projects reachable in <10 s |
| Mobile performance | Quality tiers, instancing, no realtime shadows on low tier |
| Large first load | Lazy interiors, compressed assets, loading screen |
| Cultural details wrong | You review all text, patterns, and layout conventions |

---

## 11. Open questions

1. Which projects (beyond FieldWalk and Cruxly) and how many categories/gers?
2. Next.js with real URLs per project, or simple Vite SPA?
3. Art style: flat-shaded low-poly (recommended) vs something more painterly?
4. Is the rider you (a deel-wearing character) or just a horse?
5. Language: English only, Mongolian signage with English subtitles, or a full toggle?
6. Do you have a domain and name/tagline to use?
7. Any specific photos/places of home to reference for the landscape (e.g. a particular aimag)? A real reference makes terrain and colours more personal.
