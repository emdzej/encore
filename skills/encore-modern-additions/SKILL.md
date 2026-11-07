---
name: encore-modern-additions
description: Adds opt-in modern features to a faithful reimplementation of an old PC game on gasm without changing the original - widescreen (report a 4:3 screen at the mode's height and widen only the 3D view, or true Hor+ with appended modes), higher internal resolution as a display-only second pass, art upscaling and PNG skins, cast shadows and colour grades, and saves portable between browser and desktop - each behind a parameter or appended option with the original as default, and proven harmless with golden hashes off and state/audio hashes on. Use when asked for widescreen, hi-res, HD art, filters, shadows, or save export/import, or when reviewing whether an addition leaks into gameplay.
---

# ENCORE modern additions

Fidelity is the product; additions come after the faithful game and never change it unless asked. This skill is the procedure the ENCORE ports used for widescreen, hi-res, art and portable saves.

## When to use

- A user asks for widescreen, higher resolution, filtered or replacement art, shadows, a colour grade.
- Saves must move between the browser player and the desktop bundle.
- Reviewing a change that touches presentation near gameplay (HUD, menus, controls).

## Inputs

- The port with its golden hash lines (AGENTS.md) and regression scripts.
- The seam the addition will use: a screen-size query, the mode list, a framebuffer-size parameter, a polygon-level renderer split.
- The user's decision, with a date, for anything that changes presentation by default.

## Rules

1. **Default is the original.** Every addition sits behind `--param`, an entry appended to the game's own option list, or a play-page setting that starts at the original's value. Add a line to the status page.
2. **Display-only.** The addition reads game state and writes only its own frame and caches. Every visibility, culling, ordering and timing decision still comes from the faithful values.
3. **Keep the faithful renderer running** if drawing has side effects in the original (turrets activated by the draw pass, undrawn-tick timers, sprite trees in the renderer).
4. **Prove it**: hashes unchanged with it off; state hash, faithful frame CRCs and audio hash unchanged with it on.
5. **Ask before restyling** HUD, menus or controls. Record any accepted deviation in AGENTS.md with its date and the files that hold it.

## Procedure

### Widescreen, technique A: lie about the screen (OpenCMR2)

1. Make the screen-size query report the 4:3 screen of the mode's height (1280×720 → 960×720). All layout and projection logic then runs as in a 4:3 mode.
2. In the GL back end, offset that screen to the centre (`ox = (W - w) / 2`) for pre-transformed x, viewport, scissor, clears and readback. Outside the 3D view, sides stay black (pillarboxed menus, movies, HUD).
3. Add a "wide" flag on only while the 3D view draws: viewport and draw edges at 0 or w (within a pixel) snap to the full-screen edges; a full-screen viewport is clipped to the full width while keeping the 4:3 mapping. Result: Hor+ with unchanged vertical FOV; HUD and 3D-to-2D projections stay put.
4. Add the wide modes to the emulated display-mode list.

### Widescreen, technique B: true Hor+ in the engine (OpenNFSPU)

1. Append wide sizes after the original's (16:9: 1280×720, 1600×900, 1920×1080, 2560×1440; 16:10: 1280×800, 1680×1050, 1920×1200). Optional `--param aspect=16:9|16:10|auto` narrows the list.
2. Keep vertical FOV; widen horizontal. Update every place that uses the half-angle: visibility sphere test, world visible-area side planes, sky dome planes.
3. Leave the original's own "wide screen" option (often a letterbox) as it was; keep the front end 4:3 pillarboxed.
4. Test: at the original's sizes, hashes identical (`tests/wide_default_test.c`).

### Widescreen, technique C: widen the UI canvas (source ports, OpenBV)

Change the layout units (800×600 → 1066×600, i.e. 600 × 16/9) in one header; anchor what hung on the right edge to the new width. This is a presentation deviation: only with the user's dated decision.

### Higher resolution as a second pass (OpenGTA)

1. Run the faithful renderer as before.
2. Add a pass that re-walks the same draw order with each vertex carrying two values: `f` (faithful integer position, used for every decision) and `h` (exact projection × N, sub-pixel, used only for drawing).
3. For HUD/front end/cutscenes, record each faithful draw call during the frame and replay it at N× (Scale2x/3x on 8-bit indices for pixel art, Catmull-Rom for pictures, bilinear for movies).
4. Sample bilinear clamped to each tile's own edges (the faithful 8-bit wrap bleeds into neighbours). Integer-only so runners agree.
5. Profile before optimising: measure overdraw and where time goes; some micro-optimisations are slower under gasm's JIT. Use `--no-hash` for performance runs (hashing a 2560×1920 frame costs ~27 ms).

### Art

- Load-time upscalers behind `upscale=xbr|xbr4|scale2x|scale4x`.
- PNG skins behind `skin=a,b` (priority order, `@1x..@4x` variants with nearest fallback). Tools that extract reference art from the user's data mark output "not to distribute"; any sample skin shipped in the repo is procedural.
- The zero-cost option is the runner's present filters: `gasm-run --filter sharp|nearest|xbr|fsr|crt --integer-scale`; the browser's `gasm-present` has the same. No game change.

### Portable saves

1. Map the original's save files and registry values to `gasm:storage` keys with the same names (keys 1-128 bytes of `[A-Za-z0-9._-]`; encode paths, e.g. lowercase and `/` → `--`).
2. Ship the module under one fixed file name everywhere: it is the storage namespace (`<data dir>/gasm/<ns>/<key>` on desktop; IndexedDB `gasm`/`kv`, `<ns>/<key>` in the browser).
3. In the play page, export a zip of one file per key in the desktop folder's layout and import the same (stored-zip writer; `DecompressionStream` for deflated input). Allow import only while no game runs.
4. Decide and document whether saves stay compatible with the original game's format.

## Proof

```sh
# off: must equal AGENTS.md's golden lines
gasm-run game.wasm --asset-dir cd --headless 1150 --input "$ROUTE"
gasm-run game.wasm --asset-dir cd --headless 1150 --input "$ROUTE" --param <addition>=<default>
# on: audio_fnv32 must equal the off runs; run each setting in its own process; off twice as control
gasm-run game.wasm --asset-dir cd --headless 1150 --input "$ROUTE" --param <addition>=<value>
```

Plus a native test (like OpenGTA's `tests/hires_test.c`) that hashes the game state (every entity record, RNG states, mission) and CRCs the faithful frames across settings in separate processes.

## Hard rules

- Never let an addition feed the simulation, the RNG or timing.
- Never change defaults; never fix original bugs as part of an addition.
- Never ship original art or derived art in the repo or on the site.
- Keep both of the original's modes where an addition offers a new one (e.g. network race modes).

## Pitfalls

- A renderer swap that stops the faithful draw silently changes gameplay where drawing mutates state.
- HUDs drawn at art pixel size get smaller at high resolutions; that is the original's behaviour, document it rather than scaling silently.
- Filtering across tile edges reads neighbours the faithful renderer would wrap into.
- Presentation churn: a HUD redesign reverted next commit (OpenBV `9b2b316` → `33742e1`). Ask first.

## Further reading

- https://encore.emdzej.pl/guides/enhancements
- https://encore.emdzej.pl/guides/verification
- https://encore.emdzej.pl/guides/platform-layers
- https://encore.emdzej.pl/guides/shipping
