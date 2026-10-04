# Steppe Portfolio — premium pass progress

## Intent and constraints
- User request (2026-10-03): install threejs-game-skills and "improve the quality of the site".
- Bar: premium (every scorecard category ≥ 2, avg ≥ 2.3) within the existing scope: portfolio, not a game with fail states.
- Keep all content/claims as-is (content/*). English only. **No Cyrillic Mongolian anywhere.** Don't invent Mongolian script.
- No API keys (Tripo/Gemini/ElevenLabs all MISSING) → everything procedural, audio synthesized with Web Audio.
- Stack stays Next.js 16 + R3F 9 + drei 10 + three 0.184 + zustand.

## Design brief (genre: explorable portfolio)
- Promise: ride a horse across a sunlit steppe camp and step into gers that hold the work.
- Primary verb: ride (trot/gallop/turn). Secondary: enter ger, inspect hanging, open project, fast-travel.
- 5–30 s loop: spot a ger sign → ride to its door → prompt → enter → browse walls → open a project → back out.
- No fail state by design; "risk" is visitor patience → skip-the-ride list, map, deep links stay first-class.
- Next decision communicated by: ger signs, door glow + ground ring on approach, minimap, prompt banner.

## Scorecard genre mapping
- Hero = horse (+ tack). Obstacles/enemies = gers & landmarks as navigational structures (no enemies; don't invent).
- Interactables = ger doors/approach rings, interior hangings, chests. World = steppe terrain, grass, mountains, herd, sky.
- VFX = hoof dust, chimney smoke, grass wind, approach ring, hover/enter transitions. UI = HUD, prompt, panels, minimap, touch.

## Art direction
Stylized low-poly, late-afternoon sun ("Eternal Blue Sky": deep blue zenith). Felt white + painted orange wood + deep blue + gold-green grass.
Geometric Mongolian-style ornament (key/meander bands, no script) shared across ger doors, trims, interior, UI borders (lib/ornament.ts).

## Ownership (this pass)
- Lead: components/world/*, lib/terrain.ts, lib/layout.ts, lib/labels.ts, lib/ornament.ts, components/Stage.tsx (render pipeline/post), lib/qa.ts, lib/rider.ts.
- Worker "interior": components/interior/* only.
- Worker "ui": components/Experience.tsx, components/ui/*, app/globals.css, app/projects/*, new lib/audio.ts.

## Baseline (run `baseline`, production build, ?qa)
- desktop ride: calls 33, tris 53.7k, geos 63, tex 3; entropy 4.62 edges 0.086 contrast 62.3
- desktop interior: calls 28, tris 1.6k; entropy 5.96 edges 0.349 contrast 202.8
- Scores (before): Art 1, Hero 0.5, Landmarks 1, Interactables 1, World 1, Materials 1, Lighting 1, VFX 0, UI 1, Perf 1.5 → ~0.9

## Status
- [x] Skills installed (~/.claude/skills/threejs-*), QA hooks + diagnostics, baseline captured
- [x] World pass (lead): procedural horse w/ walk/trot/gallop + tack + dust; authored gers (merged by material, ornament band, ropes, painted door, approach ring, contact shadow, chimney smoke); signature props per ger; ovoo cairn w/ fluttering khadag; GPU grass (60k high / 22k low) on GLSL terrain twin with wind + horse push; painted ground map; rugged mountains; far ridge; clouds; herd (2 calls) that scatters from the horse; soaring eagle; rocks; lighting (sun key follows horse, hemi fill, cool rim); post (bloom/vignette/ACES) on high tier; PerformanceMonitor → low tier.
  - WIP metrics (dev): desktop ride 248 calls / 297k tris / 38 tex (before shadow trim); mobile(low) ride 139 calls / 146k tris / 14 tex.
  - Dev server note: only one `next dev` per folder (shared :3300); use http://localhost (127.0.0.1 is blocked for /_next in dev).
- [x] Interior pass (worker) — components/interior/*
- [x] UI pass (worker) — HUD, minimap, touch, audio, pages
- [x] Integration, after-captures (run premium-2), scorecard 2.3 avg, artifacts/final-evidence.md
