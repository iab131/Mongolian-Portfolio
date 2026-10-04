# Steppe Portfolio — premium pass evidence (2026-10-03)

Skills used (installed from github.com/majidmanzarpour/threejs-game-skills into `~/.claude/skills`): `threejs-game-director` (lead), `threejs-aaa-graphics-builder` (SKILL + all 4 references), `threejs-game-ui-designer` (+ ui-patterns), `threejs-gameplay-systems` (+ game-feel), `threejs-debug-profiler` (+ playbook), `threejs-qa-release` (+ inspector), `threejs-audio-generator` (worker). Credential probe: TRIPO/GEMINI/ELEVENLABS all MISSING → all assets procedural, audio synthesized (Web Audio).

## Captures (run `premium-2`, production build `next start`, `?qa`)
Manifest: `artifacts/evidence.json` — 10 captures (5 states × desktop/mobile) + motion artifacts. `check_evidence.py` → passed, 13 artifacts.

| View | Result | calls | tris | geos | tex | entropy | edges | contrast | console/page errors |
|---|---|---|---|---|---|---|---|---|---|
| desktop ride | PASS, budget ok | 215 | 385k | 190 | 38 | 6.34 | 0.431 | 158 | 0/0 |
| desktop ger-door | PASS | 182 | 379k | 190 | 38 | 6.56 | 0.485 | 170 | 0/0 |
| desktop interior | PASS | 84 | 26k | 74 | 42 | 6.85 | 0.563 | 152 | 0/0 |
| desktop project-panel | PASS | — | — | — | — | 6.26 | 0.451 | 151 | 0/0 |
| desktop project-list | PASS | — | — | — | — | 4.20 | 0.210 | 97 | 0/0 |
| mobile ride (low tier) | PASS | 138 | 164k | 139 | 14 | 6.18 | 0.342 | 151 | 0/0 |
| mobile ger-door | PASS | 102 | 161k | 102 | 7 | 6.38 | 0.374 | 177 | 0/0 |
| mobile interior | PASS | 37 | 21k | 52 | 20 | 5.68 | 0.395 | 109 | 0/0 |
| mobile project-panel | PASS | | | | | 4.89 | 0.403 | 140 | 0/0 |
| mobile project-list | PASS | | | | | 3.31 | 0.254 | 107 | 0/0 |

Renderer counts are whole-frame (shadow + scene + post passes; `info.autoReset` off, reset each frame). The list/panel views are mostly DOM, so their low entropy/high dominant colour is the intended flat UI.

Baseline (run `baseline`, greybox): desktop ride 33 calls / 54k tris / 3 tex, entropy 4.62, edges 0.086, contrast 62.

Render settings: high tier = DPR ≤ 2, PCF soft shadows (1 caster, 2048, follows horse), post = Bloom (threshold 0.9) + Vignette + ACES in post (2 passes beyond render/output), 90k grass blades. Low tier (coarse pointer / ≤4 GB / PerformanceMonitor decline) = DPR ≤ 1.5, no shadows, no post, 22k blades. Interior: 1 shadow-casting spotlight (1024).
Bottleneck: GPU vertex/fill from grass on the high tier; draw calls dominated by horse parts + ger material groups (gers are merged per material). Tradeoff: desktop interior textures (42) include world textures still cached after leaving the steppe.

## Motion evidence
- `artifacts/motion/locomotion.webm` — real keyboard input: stand → trot (W) → gallop (Shift) → turn (D) → stop.
- `artifacts/motion/gallop-sheet.png`, `trot-sheet.png` — side-view gait strips (paused stepping). Trot shows diagonal pairs; gallop shows gathered/extended phases, suspension, extended neck, streaming tail, dust on hoof contacts.
- Recorder: `artifacts/motion/record.mjs`.

## Scorecard (genre mapping: hero = horse+tack; obstacles = gers/landmarks; interactables = doors, approach rings, wall hangings)

| Category | Before | After | Evidence |
|---|---|---|---|
| Art direction | 1 | 2.5 | Shared key/meander ornament across ger bands, doors, saddle cloth, interior frieze/rugs, UI frames and signs; felt/painted-wood/deep-blue palette everywhere |
| Hero (horse) | 0.5 | 2 | Layered body masses, jointed legs with hooves, mane, long tail, bridle, Mongolian wooden saddle with studs, stirrups; walk/trot/gallop blend; still faceted/blocky at close range |
| Landmarks (gers) | 1 | 2.5 | Felt cover, ornament band, 12 roof ropes + wall ties, toono crown, painted medallion door + lintel, step stones, chimney smoke, signature prop per ger |
| Interactables | 1 | 2.5 | Approach ring + door glow on proximity, prompt banner; interior hangings with ornament frames, hover lift + gold glow, chest/altar furniture, linked side list |
| World | 1 | 2.5 | GPU grass with wind + horse push, painted ground map, rugged snow mountains, far ridge, clouds, herd that scatters, soaring eagle, rocks, ovoo cairn with khadag |
| Materials | 1 | 2 | Shared world/interior material kits, procedural felt + ornament textures, merged-by-material props; little PBR variety beyond wood/felt/iron/silver |
| Lighting/render | 1 | 2 | Sun key following horse w/ soft shadows, hemi fill, cool rim, ACES, bloom only on emissive, contact blobs; interior daylight shaft + flickering stove |
| VFX/motion | 0 | 2 | Hoof dust on contacts, chimney smoke, dust motes, grass wind, flag/scarf flutter, approach ring pulse, gallop FOV ease, hover/drawer transitions |
| UI/HUD | 1 | 2.5 | Themed felt/painted-wood panels, minimap w/ live horse marker + fast travel, contextual prompt, drawer + bottom sheets, touch stick/gallop/enter, sound toggle |
| Performance evidence | 1.5 | 2.5 | Before/after whole-frame metrics, budgets per tier, quality tiers + PerformanceMonitor, production build tested |

Average after: **2.3**, no category below 2 → meets the skill's "premium" threshold (not "showcase").
Automatic failures: none observed (no placeholder primitives in active shots, HUD not stat cards, no overlap of play path, renderer diagnostics present).

## Checks run
- `npx tsc --noEmit`, `npx eslint .` — clean. `npm run build` — success (31 static pages).
- Canvas inspector manifest above; `check_evidence.py` passed.
- UI worker: Playwright touch test on iPhone 13 emulation (stick moves/steers/releases, pointercancel + blur release, gallop aria-pressed), audio context unlock/suspend; text-fit/overlap measurement at 1280×720 and 390×664.

## Remaining weaknesses
- Horse is procedural and faceted; a rigged GLB (e.g. Tripo with a key, or a CC0 pack) would be the next hero upgrade.
- Featured altar item is ~200 px wide from the interior start view; desktop interior side panel covers part of the west wall.
- Audio levels unverified by ear (headless).
- Minimap ger dots are 26–30 px tap targets (full map overlay has larger ones).
- World labels (ger signs) are not occluded by the horse in side views.
- Low tier grass is sparse on phones by design (22k blades).

---

# Pass 2 (2026-10-03): camp life, rider, ovoo hill, CPU

Added: horseman in a deel (stands in the stirrups at a gallop, posts at the trot); five herds (horses, Bactrian camels, cattle, sheep, goats), one instanced draw call per species with legs and grazing heads animated in the vertex shader; the ovoo moved onto a hill east of the spawn and scaled to radius 3.4 with a track up to it; white horsehair tug (clan standard) with gilded trident head; outdoor argal (dried dung) fire with flames, embers, smoke and an argal pile; cow pats in the cattle meadow.

## Why the CPU looked heavy, and what changed
- Measured (production, 60 Hz): main thread ~10–20% busy; the cost is three.js draw-call submission, nothing pathological.
- The 40% in Task Manager is mostly outside the page: the `next dev` server (Turbopack recompiling on every file edit), plus QA browsers/builds that were running.
- Real issue found: R3F rendered on every display refresh. With vsync off (stand-in for a 144–240 Hz panel) the uncapped page pinned the main thread at **99.3%**. Fix: `frameloop="never"` + `FrameCap` (≤60 fps, 30 fps when idle, 30 with a project open, 15 under the list overlay). Same test with the cap: ~31–39% (mostly the browser's own 1,400+ Hz empty rAF callbacks, which a real panel won't produce); at a normal 60 Hz: **17.7%**.
- Static parts of the horse and rider are merged per joint (`lib/mergeChildren.ts`); herds skip per-frame bounds work.

## Captures (run `premium-6`, production build)
| View | calls | tris | tex | errors |
|---|---|---|---|---|
| desktop ride | 245 | 429k | 35 | 0/0 |
| desktop ger-door | 199 | 420k | 39 | 0/0 |
| desktop interior | 84 | 26k | 42 | 0/0 |
| mobile ride (low) | 157 | 181k | 15 | 0/0 |
| mobile ger-door | 112 | 175k | 17 | 0/0 |
| mobile interior | 37 | 21k | 33 | 0/0 |

All 10 manifest captures PASS; `check_evidence.py` passed (13 artifacts). Tradeoff: mobile ride/list are 157–158 draw calls vs the 150 starting budget (+5%), from the rider and herds; the low tier already drops shadows, post, the eagle and contact decals.

Close-ups: `artifacts/closeups/sheet.png` (rider, ovoo hill, camp, each herd). Gait: `artifacts/motion/gallop-sheet.png`, `trot-sheet.png`, `locomotion.webm`. Perf scripts: `artifacts/perf/*.mjs`.
