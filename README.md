# Steppe Portfolio

Ride a horse across the steppe. Each ger is a category of work; go inside and click what's on the walls. Plan: [STEPPE_PORTFOLIO_PLAN.md](STEPPE_PORTFOLIO_PLAN.md).

```bash
npm install
npm run dev
```

## Controls

W A S D / arrows ride · Shift gallop · E or Enter go into a ger · Esc back out · M map. "Skip the ride" lists everything without 3D.

## Layout

| Path | What |
|---|---|
| `content/` | All text. `gers.ts` (categories), `projects.ts` (projects, featured flag, accuracy notes). Adding a project never touches 3D code. |
| `lib/layout.ts` | Where gers, the ovoo and spawn sit. North is -z; doors face south. |
| `lib/terrain.ts` | `heightAt(x, z)`, shared by the terrain mesh and the horse. |
| `lib/store.ts` | Zustand: world/interior mode, current ger, open project, overlays, spawn. |
| `lib/labels.ts` | 3D-anchored labels rendered as ordinary DOM (not drei `Html`). |
| `components/world/` | `Horse` (procedural model + walk/trot/gallop), `Rider` (kinematic controller, chase camera, sun, dust), `Grass` (GPU blades on the GLSL terrain twin), `Ger`, `Props`, `Ovoo`, `Life` (herd, eagle, clouds, far ridge, rocks), `Particles`, `Terrain`, `SkyDome`. |
| `lib/ornament.ts`, `lib/worldMaterials.ts`, `lib/merge.ts` | Shared procedural ornament/felt textures, material roles, and a merge-by-material part builder. |
| `lib/audio.ts` | Synthesized wind, hoofbeats, hearth, UI clicks (muted by default). |
| `components/interior/` | Ger interior: structure, stove, daylight shaft, furnishings, `Hanging` (a project on the wall). |
| `components/Experience.tsx` | HUD, keyboard, overlays, project panel, WebGL fallback, deep links. |
| `app/projects/` | Plain HTML list and `/projects/[slug]` pages (static, SEO, no 3D). |

Deep links: `/?ger=vision`, `/?project=steria`.

## Quality tiers and QA

- High tier: shadows, bloom/vignette, 90k grass. Low tier (phones, low memory, or when `PerformanceMonitor` sees a drop): no shadows/post, 22k grass.
- `?qa` (always on in dev) exposes `window.__THREE_GAME_TEST_HOOKS__` (states: `ride`, `ger-door`, `interior`, `project-panel`, `project-list`) and `window.__THREE_GAME_DIAGNOSTICS__` for the threejs-qa-release canvas inspector. Evidence and scorecard: `artifacts/final-evidence.md`.
- In dev use `http://localhost:3000` (Next allows one dev server per folder).
