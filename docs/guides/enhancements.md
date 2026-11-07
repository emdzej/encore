---
title: Modern additions
---

# Modern additions

Fidelity is the product, but a game that runs on a 2026 laptop, a browser and a 4K display can offer things the original could not: widescreen views, higher internal resolutions, filtered art, network play without dead servers, saves that move between machines. The ENCORE projects add these under three rules — opt-in, display-only where possible, and proven harmless with hashes — so that with every addition switched off the port still draws, sounds and plays exactly as the original. This page sets out the rules, the techniques used for widescreen and high resolution, what the projects chose not to change, and how saves are made portable. Additions in networking are covered in [Networking](/guides/networking).

## The rules

1. **Default is the original.** Every addition sits behind a launch parameter, a new entry in the game's own option list, or a play-page setting, and gets a line on the status page. [i76](/games/i76)'s plan states it for each planned addition: "Each gets a `--param`, a play-page setting and a line in the status page; default stays the original."
2. **Display-only where possible.** An addition reads game state and writes only its own frame; it never feeds back into the simulation. Where the renderer itself feeds game state, the faithful renderer keeps running underneath (see below).
3. **Prove it with hashes, off and on.** With the addition off, golden hashes are unchanged. With it on, the game-state hash, the faithful frames and the audio hash are unchanged. Each setting runs in its own process, with a control run of the off setting twice.
4. **Plan the seams.** Additions enter through pre-planned seams: a framebuffer size parameter, a split at screen-space polygons for a GPU backend ([i76](/games/i76)), an appended mode list ([nfspu](/games/nfspu)), a screen-size query ([cmr2](/games/cmr2)).

| Project | Addition | Switch | Proof |
|---|---|---|---|
| [cmr2](/games/cmr2) | 16:9 and 16:10 modes, Hor+ in race | new display modes in the game's list | game logic only ever sees a 4:3 screen |
| [nfspu](/games/nfspu) | true 16:9/16:10 Hor+ | modes appended after the original five; `--param aspect=16:9\|16:10\|auto` | [`tests/wide_default_test.c`](https://github.com/emdzej/opennfspu/blob/main/tests/wide_default_test.c): identical hashes at the original's sizes |
| [gta](/games/gta) | `hires=2\|3\|4`, `hires_ui`, `upscale`, `skin`, `shadows=1`, `grade=1` | `--param` / URL query | [`tests/hires_test.c`](https://github.com/emdzej/opengta/blob/main/tests/hires_test.c): state hash and faithful frame CRC chain identical across settings |
| [bv](/games/bv) | 16:9 UI canvas, redesigned menus | always on, by the user's dated decision | gameplay hashes; HUD reverted to the original |
| [rf](/games/rf), [sheep](/games/sheep) | runner upscaling filters only | `--filter`, play-page menu | no game change at all |

## What the collection adds, project by project

Most additions are about *reaching* the game, not changing it:

- [rf](/games/rf): disc images read directly; gamepads (pad 0/1 as P1/P2); two players on one keyboard; gasm's upscaling filters; the window title through the `gasm.title` section; launch parameters (`level`, `play`, `play2`, `viewer`, `p1/p2`) and scripted `demo=` modes. No widescreen.
- [sheep](/games/sheep): very few by design — `level=W.L`, a synthetic `ini=` (the retail disc has no `Sheep.ini`), a level viewer, browser filters, save zip export and import.
- [gta](/games/gta): the hires family (`hires`, `hires_ui`, `upscale`, `skin`, `shadows`, `grade`), all display-only; runs from the unzipped installer.
- [cmr2](/games/cmr2): 16:9/16:10 modes, display modes up to 2048×1536, network play over a relay mixing desktop and browser, `--param` viewers (`car=`, `stage=`, `mode=`, `language=`).
- [nfspu](/games/nfspu): true Hor+ widescreen, integer-scaled surfaces, network over the relay, a self-hosted lobby server, player picture decoders, ISO images, viewers (`car=`, `track=`, `drive=`, `screen=`, `fe=`).
- [ballance](/games/ballance): ISO, BIN, mounted CD or installed folder; gamepads mapped onto DirectInput codes; `language=`, `unlockall=1`, `mode=viewer`; 4:3 pillarboxing into any window.
- [oni](/games/oni): plays straight from the CD's installer archive; debug parameters (`play=1 level=N`, `route=`, `trace=`, cheats). Widescreen and hi-res planned only as non-default parameters.
- [i76](/games/i76) (planned, opt-in): 16:9/16:10 in the software renderer with cockpit and HUD re-anchored, higher resolutions, a GL renderer behind the polygon seam, network melee over `gasm:net` replacing Activenet.
- [bv](/games/bv): 16:9 everywhere, redesigned menus with a baked Rubik font, a multi-session server with an admin web UI.

## Proving an addition harmless

The proof has two halves, and both are automated.

**Off: nothing changed.** Run the project's golden hash cases with the addition absent and with its switch explicitly at the default. Both must equal the recorded lines in AGENTS.md. [nfspu](/games/nfspu)'s `wide_default_test.c` and `wide_test.c` pin this for widescreen: at the original's sizes the hashes are identical. Its site screenshots are made the same way, the wide one with explicit parameters (`aspect=16:9 res=1280x720`) so that it is reproducible.

**On: only the picture changed.** The video hash necessarily moves when the picture changes, so compare what must not move:

1. The game-state hash — every car, pedestrian, object and player record, the RNG states and the mission, as [gta](/games/gta)'s [`tests/hires_test.c`](https://github.com/emdzej/opengta/blob/main/tests/hires_test.c) computes it natively.
2. A CRC chain over the faithful frames, which the faithful renderer still produces underneath.
3. The audio hash from `gasm-run --headless`, which an addition has no reason to touch.

Run each setting in its own process, so a static left over from one run cannot mask a difference, and run the off setting twice as a control. A sequence for one scripted route:

```sh
R="--asset-dir installer --headless 1150 --param mission=1 --input $ROUTE"
gasm-run opengta.wasm $R                       # off
gasm-run opengta.wasm $R                       # off again: the control
gasm-run opengta.wasm $R --param hires=2       # audio_fnv32 must equal the off runs
gasm-run opengta.wasm $R --param hires=4
```

Also compare runners with the addition on: integer-only enhanced paths agree on gasm-run, the Node runner and the browser like the faithful ones do (see [Determinism and verification](/guides/verification)).

## Widescreen

### Tell the game it has a 4:3 screen ([cmr2](/games/cmr2))

[cmr2](/games/cmr2)'s technique ([`ddafd7a`](https://github.com/emdzej/opencmr2/commit/ddafd7a)) keeps all of the game's layout and projection logic in a normal 4:3 mode:

- `D3d_ScreenSize` reports the 4:3 screen of the mode's height: 1280×720 is reported as 960×720.
- The GL back end offsets that screen to the centre (`ox = (W - w) / 2`) for pre-transformed x, viewport, scissor, clears and readback. Outside races the sides are black: menus, movies and HUD are pillarboxed.
- `D3d_SetWide` is on only during race draws. Then viewport and draw edges at 0 or w (within a pixel) snap to the full-screen edges, and a full-screen viewport is clipped to the whole width while keeping the 4:3 mapping: Hor+ with an unchanged vertical field of view. HUD, mirror and 3D-to-2D projections stay where they were.

Modes run from 1280×720 to 2560×1440, and display modes up to 2048×1536 use the original's 1024-wide art sets. The game's own code never learns the screen is wide, which is why the addition cannot leak into game logic.

### True Hor+ in the engine ([nfspu](/games/nfspu))

[nfspu](/games/nfspu) adds 16:9 (1280×720, 1600×900, 1920×1080, 2560×1440) and 16:10 (1280×800, 1680×1050, 1920×1200) after the original's five sizes ([`be90ddf`](https://github.com/emdzej/opennfspu/commit/be90ddf), [`1031477`](https://github.com/emdzej/opennfspu/commit/1031477); [`src/wide.c`](https://github.com/emdzej/opennfspu/blob/main/src/wide.c)). EAGL keeps its vertical field of view and widens the horizontal one; the visibility sphere test's x, the world visible-area side planes and the sky dome planes all use the wider half-angle. The front end stays 640×480 pillarboxed; the HUD is drawn at its art's pixel size, as the original does at every size, so it is smaller at 1080p. `--param aspect=auto` follows window resizes for the next race. The original's own "wide screen" option is a letterbox (main view 0.15..0.85) and is left as it was. The invariant is a test: at the original's sizes, hashes are identical ([user guide](https://github.com/emdzej/opennfspu/blob/main/docs/guide/beyond.md)).

Integer-scaled render surfaces give sharper 3D at the original layout.

### A wider UI canvas in a source port ([bv](/games/bv))

[bv](/games/bv)'s UI was laid out in 800×600 units. The port uses a 1066×600 canvas (600 × 16/9) defined in [`src/game/ui.h`](https://github.com/emdzej/openbv/blob/main/src/game/ui.h), renders at the largest 16:9 size fitting the window (default 1920×1080, minimum 640×360), and removes the 4:3 pillarbox and stretch options ([`cfde746`](https://github.com/emdzej/openbv/commit/cfde746)). This is a presentation deviation recorded in AGENTS.md as the user's decision with its date, naming the files that hold it. Gameplay fidelity is untouched.

### Where there is none

[rf](/games/rf) has no widescreen: its logic is 320×240 and its "hi-res" is the same cels rasterised at 2×. [sheep](/games/sheep) stays native 640×480 rgb565 by design. [oni](/games/oni) lists only the one screen mode it has, with widescreen planned only as a non-default parameter. Leaving it out is a valid choice; say so on the status page.

## Higher resolution as a second pass ([gta](/games/gta))

[gta](/games/gta)'s faithful renderer is DMA's integer rasteriser at 640×480. The hires renderer ([`src/render/hires/`](https://github.com/emdzej/opengta/tree/main/src/render/hires), [`cd5d5d6`](https://github.com/emdzej/opengta/commit/cd5d5d6), [docs/hires.md](https://github.com/emdzej/opengta/blob/main/docs/hires.md)) is a display-only second pass at 2×, 3× or 4× (up to 2560×1920):

- It re-walks the same draw order with each corner carrying two values: `f`, the faithful integer position used for **every** visibility, culling, winding and order decision, and `h`, the exact projection × N in 1/256 px, used only for drawing.
- It writes only its own frame and texture caches.
- HUD, front end and cutscenes: hooks next to each faithful draw call record glyph, sprite and picture draws during a frame and replay them at N×, with Scale2x/3x on 8-bit indices for pixel art, Catmull-Rom for pictures and bilinear for the movie.
- Sampling is bilinear **clamped to the tile's own edges**, because the faithful 8-bit wrap bleeds into neighbouring tiles; integer-only so all runners agree.
- Proof: game state hash and the CRC of faithful frames identical with `hires=1/2/4` in separate processes; gasm audio hash unchanged.

Performance came from measurement, not guesses ([`bd228bb`](https://github.com/emdzej/opengta/commit/bd228bb)): measured overdraw was only 1.17 screens per frame, so hidden-face culling could gain at most 8%; the time was all in bilinear filtering. Pre-filtering the texels a trapezoid span crosses into a line, then one blend per pixel done as one 64-bit multiply on 16-bit lanes (exhaustively verified exact), made it about 4.5× faster: 12 ms per frame at 4× in wasm, with no SIMD or threads. Some micro-optimisations were slower under gasm's JIT.

## Art: upscaling and skins

- `upscale=xbr|xbr4|scale2x|scale4x` upscales [gta](/games/gta)'s art at load; `hires_ui=scale|nearest|bilinear` chooses UI scaling.
- `skin=a,b` overlays PNG replacement art (tiles, sprites, paint masks, fonts, pictures) in priority order, with `@1x..@4x` per-resolution variants ([`eea406f`](https://github.com/emdzej/opengta/commit/eea406f)). Tools keep the legal line: `skin_template --extract` writes reference PNGs from the user's data marked "not to distribute", and a procedural sample skin uses no game data so the repository can ship one that works.
- The zero-cost alternative is the runner's present filters (`sharp`, `nearest`, `xbr`, `fsr`, `crt`, integer scale), which change nothing in the game ([rf](/games/rf), [sheep](/games/sheep)).

## Shadows and colour

[gta](/games/gta)'s `shadows=1` casts shadows from block heights and `grade=1` applies a per-city colour grade, both in the hires pass and both off by default.

## When rendering feeds game state

An enhanced renderer cannot simply replace the faithful one when drawing has side effects. [rf](/games/rf)'s turrets activate from the draw pass and wreck timers count from the last drawn tick; [gta](/games/gta)'s sprite draw trees, corner caches and HUD blink counters live in the renderer; [oni](/games/oni)'s contrails update during drawing. Keep the faithful renderer running every frame and add the enhanced pass beside it. [i76](/games/i76) plans its GPU renderer behind a polygon-level seam for the same reason: the game's own code still produces the screen-space polygons.

## What not to change

- **Gameplay, HUD and controls.** [bv](/games/bv) redesigned its HUD ([`9b2b316`](https://github.com/emdzej/openbv/commit/9b2b316)) and reverted it the next commit, except the health gauge and scoreboard, by user preference ([`33742e1`](https://github.com/emdzej/openbv/commit/33742e1)). Ask before restyling anything gameplay-adjacent, and record the decision with its date.
- **The original's bugs and quirks.** They are documented as "kept", not fixed by an addition.
- **The original's modes alongside new ones.** [nfspu](/games/nfspu)'s network play keeps both of the original's race modes; its lobby server runs the game's own server code.
- **Defaults.** A setting added to the play page must start at the original's value.

## Saves that move between browser and desktop

`gasm:storage` stores one key per file. The desktop keeps `<data dir>/gasm/<namespace>/<key>`, one file per key; the browser keeps IndexedDB database `gasm`, store `kv`, keys `<namespace>/<key>`. The namespace is the module file name, so every project ships its module under one name (`opencmr2.wasm`, `opennfspu.wasm`, `opengta.wasm`) natively and in the browser.

| Where | Location of the saves |
|---|---|
| desktop (gasm-run) | `<data dir>/gasm/<namespace>/<key>`, one file per key, written atomically; macOS example `~/Library/Application Support/gasm/openbv/` |
| headless runs | an empty in-memory store, unless `--storage-dir <dir>` is given |
| browser | IndexedDB `gasm`, store `kv`, keys `<namespace>/<key>` |

Map the original's save files and registry values onto keys with the same names ([cmr2](/games/cmr2): `Controller.rcf`, `GameInfo.rcf`, `game_<n>.rcs`; [sheep](/games/sheep): settings as 4-byte LE values, save slots, `HiScore.tab`). Keys are 1–128 bytes of `[A-Za-z0-9._-]`, so paths need an encoding ([bv](/games/bv): lowercased path with `/` turned into `--`; a stored file shadows the asset of the same name).

The play pages then export saves as a zip of one file per key in **the same layout as the desktop storage folder**, and import such a zip — so saves move both ways ([sheep](/games/sheep) `saves.js`, [nfspu](/games/nfspu), [cmr2](/games/cmr2)). [nfspu](/games/nfspu) writes its own stored-zip writer and uses `DecompressionStream` for deflated imports; [sheep](/games/sheep) allows import only while no game runs. Save-format compatibility with the *original* game is explicitly not a goal in [cmr2](/games/cmr2); [rf](/games/rf) keeps the original's high-score format; [oni](/games/oni) keeps `persist.dat` in the original's layout. Choose and document which.

## Other conveniences

- Reading disc images and installer archives directly, so users need no Windows installer ([cmr2](/games/cmr2) InstallShield cabinets, [oni](/games/oni) VISE, [gta](/games/gta) unzipped installer). See [File formats and game data](/guides/formats).
- Viewers behind parameters (`car=`, `stage=`, `track=`, `mode=viewer`) that double as the renderer's first test.
- Player picture loading in [nfspu](/games/nfspu): its own baseline and progressive JPEG decoder (with libjpeg's fancy upsampling for pixel-exactness), TIFF, BMP, TGA and PCX, replacing `gimme.dll`.

## Checklist

1. Write down the seam each addition will use before porting the code it touches.
2. Put every addition behind a parameter, an appended option or a play-page setting that defaults to the original; add a status-page line.
3. Add a test that the golden hashes are identical with the addition off.
4. With it on, compare game-state hash, faithful-frame CRCs and audio hash against off, each setting in its own process, plus a control run.
5. For widescreen, prefer lying to the game about screen size and widening only the 3D view; snap 2D edges; pillarbox UI.
6. For higher resolution, run a second display-only pass that takes every decision from the faithful values.
7. Keep the faithful renderer running when drawing has side effects.
8. Measure before optimising an enhanced renderer; keep it integer where runners must agree.
9. Ask before changing presentation near gameplay; record user decisions with dates in AGENTS.md.
10. Ship the module under one fixed name; export and import saves as a zip in the desktop storage layout.
