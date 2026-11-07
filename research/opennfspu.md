# OpenNFSPU: research notes

Source: `/Users/mjaskols/Projects/my/opennfspu` (read-only), HEAD `4aa6531` (2026-11-04, "Release 0.1.9").
Sibling conventions: `../openrf` (Return Fire), `../opengta` (GTA), `../openballance`, `../opencmr2`.

---

## 1. Facts

| Item | Value |
|---|---|
| Game | Need for Speed: Porsche Unleashed (Europe: *Need for Speed: Porsche 2000*) |
| Studio / publisher | EA Canada / Electronic Arts, 2000 |
| Target binary | Windows `Porsche.exe` **v3.5** (last EA patch), 2,129,965 bytes, CRC-32 `fd2f5573`, linked 2000-03-13, image base 0x400000 |
| Second binary ported | `Drivers/dx7z.dll` ("DX7 3rash", built 2000-03-01, base 0x60000000): the THRASH Direct3D 7 driver |
| Original tech | MSVC 6 C++ (RTTI on, ~360 polymorphic classes, 366 RTTI descriptors). EA libraries: "real" (`\real\cmn`, `\real\pc`, `\real\patch3`: files, BIG/VIV, FSH, streams, timers, input, fonts, net, sound), **EAGL2** (software transform/clip/light + material-as-layer-stack), **FERT** (front-end runtime driven by `.lay`/`.ctr` INI files with an embedded C expression interpreter). Rendering only via **THRASH** (EA's 3D driver ABI: 36 fetched / 41 exported `_THRASH_*` entry points) loaded from `dx7z.dll` (D3D7) or `voodoo2z.dll` (Glide). DirectDraw used directly only for mode enumeration. DirectInput (keyboard/mouse), `joyGetPosEx` joysticks. Audio: EA SND library v4.1g (own software mixer on DirectSound). Movies: EA MAD ("Madcow", MPEG-1-like DCT) + EA-XA ADPCM audio. No Bink, no Miles. Net: WinSock (UDP, IPX/SAP, TCP), TAPI modem, RAS, EA lobby `porsche-entry.earacing.com` |
| Approach | Function-by-function port from disassembly (Ghidra). "Not an emulator or wrapper." Structure of the original kept (C++ classes -> structs + explicit vtable structs, same slot order); only threads, blocking loops and Win32/DirectX are restructured |
| Language | C11 (portable core), CMake. Python (stdlib-only) reference decoders; Python+unicorn fidelity harness; JS for the browser player |
| Size | `src/` ~97k lines in 170 `.c` files: game 33.8k, front 22.6k, render 18.3k, real 13.8k, eagl 3.2k, snd 2.7k, support 0.5k, top-level 2.0k. 47 test files. `tools/nfsfmt.py` 556 lines. `tools/ghidra/names.tsv` 2,716 entries (993 high-confidence) + 46 for dx7z |
| Timeline | 570 commits, 2026-10-30 .. 2026-11-04 (6 days), all from one Claude Code session (`Claude-Session:` trailer on every commit), 13 merge commits from parallel worktree agents (`.claude/worktrees/agent-*`) |
| Status | Single player playable end to end (front end, Quick Race, knockouts, Evolution career, Factory Driver, AI/traffic/police, HUD, sound, replays). Multiplayer: P2P IP, LAN (IPX+SAP), TCP fallback, Internet lobby (self-hosted). Out of scope: modem/serial, Glide path, EA account registration. Waiting on gasm: force feedback, voice chat. Not done: whole-race bit-exact confirmation, widescreen menus, split screen (dead code in original), public lobby. "Work is paused after 0.1.8" (`docs/guide/roadmap.md`) |
| Releases | Tags `0.1.0`..`0.1.9` (no `v` prefix; 0.1.0-0.1.5 all on 2026-11-03). Assets: `opennfspu-<ver>.wasm`, `opennfspu-gasm-<ver>-macos-universal.zip` (`Porsche Unleashed (gasm).app`, ad-hoc signed), `-linux-x86_64.tar.gz`, `-linux-arm64.tar.gz`, `-windows-x86_64.zip`, each with `.sha256` |
| Site | https://opennfspu.emdzej.pl (`docs/public/CNAME`) |
| Browser play | https://opennfspu.emdzej.pl/play/ |
| GitHub | https://github.com/emdzej/opennfspu (`git@github.com:emdzej/opennfspu.git`) |
| Runtime | gasm **0.16.1** (pin: `GASM_VERSION` in `tools/fetch-gasm-sdk.sh`), `gasm:gl` (GLES 3.0 / WebGL 2), built `LOOP THREADS` (Asyncify) |
| Modern additions | True widescreen Hor+ (16:9: 1280x720, 1600x900, 1920x1080, 2560x1440; 16:10: 1280x800, 1680x1050, 1920x1200) appended after the original five sizes; `--param aspect=16:9|16:10|auto` narrows the list; `auto` follows window resizes. Integer-scaled render surfaces (sharper 3D at original layout). Network over gasm-relay (rooms = LAN). Self-hosted Internet lobby server (`--param netserver=1`, game code existed but was never startable). Saves export/import as zip between browser and desktop. ISO image as data source. Player picture loading (BMP/TGA/PCX/JPEG incl. progressive/TIFF decoders written for the port instead of `gimme.dll`). Viewers: `--param car=`, `track=`, `drive=`, `screen=`, `fe=` |
| User must supply | The **installed** game folder updated to 3.5 (`GameData/`, `FEData/`, `Porsche.exe`; `Drivers/dx7z.dll`, `SaveData/`, `fe.txt` used if present) or an ISO 9660+Joliet image of that installed folder (not the setup disc). Retail CD: install on Windows/Wine + patch. Repack ISOs whose `Setup/install.exe` is a RAR SFX: extract with `unar` (7-Zip/p7zip fail "Unsupported Method") (`docs/howto/extract-game.md`) |

---

## 2. Screenshots (`docs/public/screenshots/`)

All are headless renders of `opennfspu.wasm` produced by `tools/screenshots.sh` (gasm-run `--headless N
--screenshot`, cropped to 4:3 with `sips -c 720 960`, JPEG q80). Never game files.

| File | Shows | Generated with |
|---|---|---|
| `menu.jpg` | Main menu (front end over the garage 3D room) | `200` frames, `intro=0` |
| `quickrace.jpg` | Quick Race screen with the car on the lift in the garage | `120`, `intro=0 fe=quickrace` |
| `alps.jpg` | Race in the Alps vs three AI opponents, near chase cam | `900`, `start=384 drive=alps cam=3 opponents=3` |
| `castle.jpg` | Castle track from the chase camera | `500`, `drive=castle cam=3` |
| `canyon.jpg` | Canyon track | `700`, `drive=canyon cam=3` |
| `cockpit.jpg` | Driver's seat camera on the Autobahn in the rain (interior, dash, rain drops) | `500`, `drive=autobahn cam=1` |
| `alps-wide.jpg` | True 16:9 widescreen (Hor+) Alps race, full frame | `WIDE=1`, `aspect=16:9 res=1280x720` |

Referenced in `docs/index.md` (grid with captions) and `docs/guide/beyond.md` (alps-wide).

---

## 3. Workflow and tooling

### Reverse engineering

- **Ghidra via `ghidra` CLI** (ghidra-cli; also a Ghidra MCP is available in the environment). Project `nfspu`,
  programs `porsche.exe` (copy of `game/Porsche.exe`) and `dx7z.dll`. Commands used by agents:
  `ghidra decompile 0xADDR --project nfspu --program porsche.exe`, `x-ref`, `disasm`, `memory`, `function rename`.
- **Scripts** (`tools/ghidra/`):
  - `FillGaps.java`: creates functions auto-analysis missed (vtable methods, callbacks). Raised 6,006 -> 8,013
    functions (`docs/re/inventory.md`). The Win32 message pump around 0x53b744 was in missed code.
  - `AnalyzeAll.java`: the CLI imported `dx7z.dll` with *zero* functions (no analysis); this runs auto-analysis (385 fns).
  - `ApplyNames.java` + `apply-names.sh`: apply `names.tsv` then regenerate grep dumps.
  - `DumpAllNamed.java` -> `re/all.c` (353,670 lines of named decompilation, git-ignored, for grepping only).
  - `DumpMeta.java` -> `re/meta.tsv` (size, callers, callees, imports, strings per function); `re/funcs.txt`.
  - `ImportUsers.java` -> `re/imports.tsv` (import -> callers).
  - `rtti.py` -> `re/rtti.tsv`, `re/vtables.tsv` (classes, vtables, slot lists via MSVC complete object locators).
  - `Dec.java` single-address decompile (creating the function if needed); `merge-names.py`.
- **`names.tsv` is the source of truth** (`addr, name, module, confidence, description`); confidence
  `high|med|low|struct|range` (`struct` = `Class_vN` vtable slot, purpose unknown; `range` = CRT/unidentified
  placeholder). Rename in the TSV, then rerun `apply-names.sh` (`docs/re/README.md`).
- **Module map from link order**: the linker kept object-file order, so each module is a contiguous address
  span; boundaries come from vtable methods, source-file strings (`\real\pc\startup.c`,
  `d:\Nfs\Nfs5\frontend\fert\src\Window.cpp`) and imports. CRT objects start at odd addresses, EA's are
  16-aligned (`docs/re/inventory.md`). Inventory table gives function counts and KB per range; KB is the better
  effort estimate (front end has thousands of tiny accessors).
- **RE notes in prose** (`docs/re/*.md`, ~2,900 lines incl. `formats.md`): layouts, formulas and addresses in
  own words, explicitly no decompiler output; excluded from the published site (`srcExclude`, commit `ba48ea8`).
- **Community format knowledge** allowed as hints (FFmpeg's EA demuxer identified MAD/ASF), exe is the authority.

### Fidelity harness: the original's code under an x86 emulator (`tools/emu/`)

The standout technique. `emu_drive.py` / `emu_forces.py` load `Porsche.exe` sections into **unicorn** (32-bit
x86), rebuild the car (and the racers, globals, road, AI personalities, collision objects with copies of the
original vtables) in the original's memory layout from a dump the port writes, set the **x87 control word**,
call the original function (e.g. drive step 0x49ef50, force task 0x49bcb0), and diff the car struct word by
word against the port's result.

- Dump patches are kept out of the tree as `git apply`-able patches (`drivedump.patch`, `forcesdump.patch`:
  `--param forcesdump=<tick>[:<step>:<last>]`, `--param fdfn=<hex>` function, `--param fdcar=<i>` car).
- Callouts the emulator can't run (world-tree queries, edge query 0x474030, node search 0x4743a0, roof lookup
  0x473290, RTTI casts) are answered from the port's recorded results, so each function is tested in isolation.
- Pointers vs indices: fields that are pointers in the original and indices in the port (+0x434, +0xed4) are
  mapped and compared semantically.
- `sweep.sh` / `sweep_forces.sh`: every Nth tick of the game's own `replay.rpl`.
- `freerun.sh`: **free run** with `FD_CARRY`: the original's outputs are carried into the next call, so the
  original runs on its own values over hundreds of ticks; words changed by code no wrapped call covers are
  reported as `uncovered`. `CAR=-2` all racers, `CAR=-3` knockable objects.
- `wholerace.sh <first> <last> [chunk] [jobs]`: whole replay (6,663 ticks) in parallel chunks (~0.9 GB each).
- `FD_WATCH=<offset>` prints each write to a car word with writer address and stack return addresses;
  `FD_TRACE=<va>,...` prints registers at addresses to find the first divergence.
- `emu_replay.py`: plays replay packets through the original's reader (0x4144d0) and compares with port logs.

### How agents were instructed (`AGENTS.md`, `docs/internals/porting.md`)

Patterns that look effective:

1. **"Fidelity is the product."** Reproduce quirks and bugs; if something looks wrong, check the disassembly;
   if the original does it, keep it and comment. Only fix deviations *of the port*.
2. **Hard legal rules up front**: never commit original data or derivatives; *no data copied from executables
   into source*: tables are **loaded at runtime** from `Porsche.exe` via `src/exe.c` (`exe_data`, `exe_u32`,
   `exe_str`, `exe_f32` by virtual address; size+CRC checked). Even float constants: `#define K(va) exe_f32(va)`
   in `src/game/ai.c`, `car_cars.c`, `real/font.c`. Small algorithmic constants/operands OK.
3. **Cite the original** on every function: `/* BIG_findentry 0x565a30 */`, `/* _THRASH_setstate@8 0x60003ac0 */`.
   Names must match Ghidra/`names.tsv`; no `FUN_xxxxxx` in `src/`.
4. **Don't paste decompiler output** into source or docs.
5. **Pending mechanism** (`src/pending.h`): calls into unported code go to a function with the original name
   in `<dir>/pending.c` with `PENDING_NOTE(0x4xxxxx, "Name")` (logs once) and a neutral return. Never a
   silent stub; `grep -r PENDING_NOTE src` is the to-do list (down to 9 at HEAD).
6. **Static initializers**: MSVC global ctors at table 0x5cb004..0x5cb780 (479 entries) have no callers;
   ported ones go into `PORT_StaticInit` (`src/static_init.c`) in table order.
7. **Data layout rule**: wasm32 is 32-bit like the original, so in-memory structs keep original layout and
   offsets, each field commented `/* +0x1c */`, sizes checked with `_Static_assert` under
   `#if UINTPTR_MAX == 0xffffffffu` (native test build is 64-bit). File formats parsed with explicit byte
   reads, never pointer casts.
8. **Float rule**: `float` everywhere, keep the original's order of operations, don't simplify formulas.
9. **Headless-only verification**: unattended runs always `--headless`; never open a window, never use
   macOS `screencapture`. `./play` is for the human.
10. **Hash discipline**: "The folder and the image must give identical hash lines. A change that alters the
    hashes must be explained by the change." Commit messages routinely state which hashes moved and why
    (e.g. `85b7d27`: "Race-only hash (drive=autobahn, 300 frames) 5777384f -> 5635551f: the HUD now draws
    without fog. FE start unchanged.").
11. **Don't overstate status**; docs/guide/status.md is the honesty page.
12. Each module gets a headless test on real data that skips without it.

### Build system

- CMake, `-DOPENNFSPU_PLATFORM=native|gasm`. Native build = tools + headless tests only (no GL;
  `src/render/thrash*.c` excluded). `platform_gasm.c` is the only file including `gasm.h`.
- `tools/fetch-gasm-sdk.sh`: wasi-sdk, gasm C SDK (`gasm.h`, GLES3 headers + `gasm_gl.c`, CMake toolchain),
  Binaryen `wasm-opt` (133, checksummed; needed for Asyncify) into `.deps/`.
- `tools/fetch-gasm-runner.sh <platform>`: released `gasm-run` with ANGLE + SwiftShader.
- Module built `LOOP THREADS` (`e942f36`): `gasm_main` loops `frame(); gasm_wait_frame();` and gasm's
  cooperative threads carry the network library's threads. Cost: 1.38 -> 1.74 MB, ~6% CPU, same hashes.
  `-DOPENNFSPU_LOOP_THREADS=OFF` builds plain exports.

### CI / release (`.github/workflows/`)

- `ci.yml`: native on macOS+Ubuntu with `-Werror` (GCC on Linux caught `strncpy` warnings, `b137539`), run every
  `build/*_test` (they skip without data: CI is a smoke test), `py_compile` all tools; wasm build -> artifact;
  bundles packaged and smoke-tested on macOS and Linux x86_64; `shellcheck` on all scripts.
- `release.yml`: on `[0-9]+.[0-9]+.[0-9]+` tags; refuses tag != `project(OpenNFSPU VERSION ...)`; builds wasm,
  macOS universal `.app` (iconutil, ad-hoc codesign), Linux x86_64/arm64 + Windows bundles; smoke tests each
  on its own OS (`ubuntu-24.04-arm` for arm64; Windows: `--help`, `--dry-run`); release body from
  `.github/release-notes.md` + generated changelog. `workflow_dispatch` = snapshot `0.0.0-snapshot.<sha>`.
- `pages.yml`: builds the wasm, copies it into `docs/public/play/` (`docs/scripts/copy-wasm.sh`), vendors gasm
  web runtime + csfs from pinned npm packages (`docs/scripts/vendor-web.sh`), VitePress build, deploy.
- `tools/smoke-gasm-bundle.sh`: without data checks files, signature, bundle id, icon, universal runner, that
  gasm-run exits 1 with "game data not found", launcher `--help/--dry-run/--forget-data` against fake folders
  (no FEData, no exe, wrong-size exe, `.cue`, `.iso` -> `--asset cd=`); scratch `HOME`. With
  `OPENNFSPU_SMOKE_DATA=game:NFS_PU.iso` runs headless 400 frames and requires launcher hash == direct gasm-run
  hash == every source's hash. Linux bundles testable on a Mac with Apple `container` (debian:trixie-slim).

### Bundles

- macOS: ANGLE in `Resources/angle/`, launcher passes `--gl-lib` because `codesign --strict` only allows code
  in `Frameworks/` and gasm-run reads SwiftShader's ICD from the ANGLE folder. Linux/Windows: ANGLE next to
  gasm-run. Launchers (`tools/gasm-bundle/`) ask once for the game folder (dialog / zenity / kdialog), check
  it, save location (`~/Library/Application Support/OpenNFSPU/data-location` etc.), `--change-data`,
  `OPENNFSPU_GAME=` for tests (error exit 2 instead of dialog). Icon drawn by `icon.py` (stdlib only; own
  mark, no manufacturer crest).

### Docs site

VitePress in `docs/` (pnpm, Node 22), theme `porsche.css`, no emojis, no version menu, dead links fail the build,
RE notes excluded from nav and build. gasm's official "Built for gasm" badge hotlinked (light/dark/flat; don't
recolor). Sections: guide (status, install, playing, gasm, multiplayer, controls, game-data, beyond, roadmap),
howto (build-from-source, extract-game, release), internals/porting.

### Browser player (`docs/public/play/`)

- gasm **Worker mode**, WebGL 2 in an **OffscreenCanvas** inside the worker. Needs Chrome/Edge/Firefox or
  Safari 17+.
- `data.js`: pick folder (checks `Porsche.exe` = 2,129,965 bytes + `GameData/` + `FEData/`) or disc image
  (checks ISO 9660 volume). "Import and play" copies into **OPFS** via `@emdzej/csfs-opfs` (~520 MB; a hidden
  marker file `.opennfspu-import.json` written last marks a complete import); "Play without importing" reads
  the picked files directly. Imports `fe.txt` too (`a3a9561`).
- `saves.js`: saves in IndexedDB (gasm storage namespace `opennfspu/`), export/import as zip (own stored-zip
  writer; DecompressionStream for deflated imports) in the **same layout as the desktop storage folder**.
- `?hashframes=N` runs N frames on virtual time and prints the same hash line as `gasm-run --headless N`
  (default size 1280x720 = headless drawable); `input=`, `size=`, `relay=`, `room=`, `aspect=`.
- `tools/web-play-test.mjs` (341 lines) drives the page in headless Chrome via DevTools protocol and requires
  the page's hashes to equal gasm-run's and a Node GasmHost run's for the same module/data/input; also the
  import and no-import paths must hash like the folder.
- Keep `@emdzej/gasm-host` version equal to `GASM_VERSION`.

---

## 4. Technical knowledge that generalizes

### Original architecture (map before porting; `docs/re/architecture.md`)

- `entry` 0x5a2aca (CRT) -> `WinMain` 0x4b6500 (splits cmdline, max 32 args) -> `GameMain` 0x4b6840: 128 MB
  swap probe, CD autorun check, `Sys_Init` (fatal handler, UMemory heap 24 MB + 4 MB, `TIMER_init(128)`,
  DirectInput, async file I/O), `Options_Read` (`fe.txt`), `Audio_Init` (256 KB heap), `Render_Init`
  (registry: "Run 3D Setup before running the game."), then outer loop FE -> race -> FE.
- **Option records are the FE<->race interface**: FE writes a race description into option records; the race
  reads them. Settings block 0x6573e8 (0x3e24 bytes) is also the head of every replay file.
- Port restructures exactly three things (`docs/re/port-plan.md`): **threads go** (128 Hz timer becomes a counter
  advanced from the frame clock; input sampled in the frame step; file I/O synchronous with callbacks fired
  where the original would observe completion), **blocking loops become states** (`GameMain`,
  `FEApplication_Run`, `RaceLoop` stepped once per gasm frame, `src/app.c`), **C++ becomes C** with ops tables
  in original slot order.

### Timing model and determinism

- Multimedia timer 128 Hz -> counters at 128, **64 Hz (simulation)** and **32 Hz (input sampling, done on the
  timer thread)**. Each sample = 4-byte control packet per player in a 128-entry ring; sim target = 2 x packet
  count (two sim ticks per input packet). This lockstep-shaped input is why replays and network input-exchange
  are deterministic.
- `Sim_Step` 0x415010: even ticks run AI, contact clearing, even task list; every tick the per-tick task list
  (car physics); odd ticks race/audio/world/car render ticks/scene. So most subsystems effectively run at 32 Hz.
  Countdown: ticks 0..0x1c0 (7 s). Hash tests use `start=384` to skip the fly-in.
- Port: `APP_FRAME_HZ 60`, `APP_AUDIO_RATE 32000` (SND library's native rate) (`src/app.h`). `GetTickCount`
  replaced by `app_ticks_ms()` = frames x 1000/60, so runs repeat; `TIMER_ticks` = that x 128/1000.
- gasm headless runs are deterministic across runners and the browser: frame and audio FNV hashes
  (`video_fnv32`, `audio_fnv32`) are the regression oracle. Headless uses gasm's null GL so hashes don't depend
  on GPU; `--screenshot` uses ANGLE.
- **Heap address dependence is nondeterminism**: original's particle queue is a set keyed by address; in the
  port addresses depended on data source allocations, so folder vs ISO drew rain spray in different orders.
  Fixed by ordering by creation, matching the original's rising heap addresses (`a130d52`).
- Rand: MSVC LCG (214013, 2531011) at 0x5a1579 must be reproduced; sound elements also consume the shared random
  stream (0x537db0), so audio code affects later sim values: port it even if "just audio".

### Floating point fidelity (the hardest part; see section 5)

- Direct3D 7 sets the **x87 to 24-bit precision** when the device is created, so all game float code rounds to
  single precision per operation. C `float` arithmetic in the original's exact operation order reproduces it.
  But the x87 keeps its **wide exponent** at single precision: values decaying through denormals stay exact
  until stored. Port helper `Math_X87(double)` (`src/game/sim_math.h`) rounds to 24 significant bits without
  the float exponent limit.
- Runtime `asin`/`acos` (0x5a27c0, 0x5a0e10) take their root at single precision; `fpatan` exact; port has
  `Math_Asin`, `Math_Acos`. Transcendentals in the projection (`fptan`, `fsin`) taken as correctly rounded
  float of the double result. Angles are in **turns** x 2pi rounded to float before sin/cos (0x532550).
- `__ftol` after every float->int: C truncation matches MSVC's default.
- Constants: read them as their bits, not decimals. `0x3e22f981` is slightly under 1/2pi while `0.15915494f`
  compiles to `0x3e22f983` (`c9523ba`); 0x5b4a00 is a *double* 1/1500 (read as a float gave -473.77; `a7c5785`).
  Reading constants from the exe at runtime (`K(va)`) eliminates this class of bug.
- Coarse sqrt tricks are kept: sphere map coords use "the original's coarse root (0x5f400000, one step with
  1.47 / 0.47)"; distance estimate "halving the float's bits and adding 0x1fc00000" (`docs/re/track-render.md`).
- Clip codes computed from IEEE bit patterns with integer subtraction of magnitudes (no float compares), 5-bit
  index into 32-word tables read from the exe (`docs/re/eagl.md`).

### Rendering on gasm: THRASH (D3D7-era driver ABI) -> GLES 3

Port the **driver DLL** too, not just the game: `src/render/thrash.c` is dx7z.dll's logic (batching, software
cull, state recording, fog tables), `src/render/thrash_dev.c` a small "Direct3D 7 device" on GLES 3 beneath it
(`docs/re/thrash.md`). Key specifics:

- Game projects/clips itself (EAGL) and submits **pre-transformed TL vertices**: `ThrashVertex` FVF 0x1c4
  (32 B: x, y screen px, z 0..1, rhw, diffuse, specular ARGB with specular alpha = vertex fog, u, v) or 0x2c4
  (40 B, second UV set). Raw DrawIndexedPrimitive via `setstate(0x1b3, &prim)`.
- GL mapping: `x,y + 0.5` (D3D7 pixel centres on integer coords), `w = 1/rhw` for perspective-correct
  interpolation, z to -1..1; viewport as **scissor** (pre-transformed verts aren't moved by viewport).
- **One uber fixed-function shader**: two texture stages with D3D `D3DTOP_*`/`D3DTA_*` ops (complement,
  alpha-replicate), specular add, fog (table modes from pixel z, else specular alpha), alpha test. Flat shading
  = first vertex colour (D3D rule) done by spelling triangles out.
- Batcher quirks kept: 253-vertex buffer flushed on prim type change/overflow/state change; depth bias added per
  vertex (`value * 2^-15`, reset each EndScene); points adjusted **in place** (a redrawn point gains bias again);
  `clearwindow` doesn't flush (queued tris land on top of the clear); `setstate(0x1b3)` draws before what's
  queued; software back-face cull by sign bit on top of D3D's.
- `tfree` walks a never-filled list, so textures only go with `treset`; `treset` doesn't clear recorded state 1,
  so a new texture at a reused address is skipped as "already set" (kept).
- `writerect` copies 2 B/px unless format 5, so in 32-bit modes copies half a row (kept).
- Fixed card profile (`caps_init`): GeForce 256-class (subtype 0x12), 2 stages, stencil, table+vertex fog,
  specular, aniso, trilinear, no W-buffer, no AA, 32 MB, every format but 888. Pick the card the game's readme
  targets, so card-dependent branches go the expected way.
- Surfaces: front/back colour textures at mode size x integer scale; **RGB565 in 16-bit modes (keeps the
  original's banding)**, RGB8 in 32-bit; rows top-first so locks and `glReadPixels` agree; `THRASH_present`
  (port addition) letterboxes front buffer onto the drawable with gamma.
- Textures expanded to RGBA8 on upload (palettised, DXT included); pixels kept so CLUT-only updates re-expand.
  Without palette formats DTEX turns 8-bit textures into ARGB4444 (the original's scoring decides).
- **Locks/readbacks are expensive**: movies lock the back buffer every frame (software path); `glReadPixels`
  each time dropped below 60 fps and starved audio. Fix: track surfaces cleared whole (read as colour) or
  written whole by unlock (read from a CPU copy) (`74e6dfa`).
- Lens flare uses `readrect` 4x4 pixels at the sun every 200 ms for occlusion; if reads average >5 ms after 10
  reads the flare stops for good. gasm-run 0.16 returns pixels from `read_pixels` only with `--screenshot`;
  otherwise zeros, so flare shows full strength (`docs/re/render-system.md`).
- Z-buffer can't be read on GLES3/WebGL2 (game doesn't need it). Wireframe not drawable (no polygon mode).
- EAGL guard band: THRASH answers +-2048 so every draw goes the DX7 guard-band path; tris inside the band are
  drawn unclipped.
- Cull subtleties: car model matrices are mirrored (determinant -1), so `R3DObject_Draw` swaps cull 1/2 around
  cars; a self-test camera with a mirrored basis flips winding (`7e3b048`).
- Render-method key (0x6197f8) from options selects material layer groups (headlights, chrome reflections).
- Texture pipeline: FSH shape -> `RTex_convertshape` -> TEXTURE -> DTEX (format scoring: preference list
  position, +20 lost alpha, +20 unsupported, +10 leaving a palette) -> `talloc`/`tupdate`. LRU per texture type
  when card memory is full (types share one size for this reason).
- 8x8 conversion-kernel table between pixel formats, chained up to 10 steps; 16->32 kernels turn colour key 0
  into transparent black; 8888->565 never yields 0 for opaque (black becomes 1).

### Widescreen (port addition, `src/wide.c`, `be90ddf`, `1031477`)

- Append wide modes after the original five display modes; Hor+: EAGL keeps vertical FOV, widens horizontal;
  the sphere test's x, world visible area side planes and sky dome planes use the wider half angle.
- Original's "wide screen" option is a letterbox (main view 0.15..0.85). Front end stays 640x480 pillarboxed.
- HUD drawn at art pixel size (as original at every size) so it's smaller at 1080p.
- **Invariant**: at the original's sizes, hashes must be identical (`tests/wide_default_test.c`, `wide_test.c`).

### File formats (`docs/formats.md`, reference decoder `tools/nfsfmt.py`)

- **RefPack (0x10FB)** LZ77: header flags (0x01 compressed-size field, 0x80 4-byte sizes), `0xfb`, BE size;
  four command forms by first byte (0x00-7f 2 B, 0x80-bf 3 B, 0xc0-df 4 B, 0xe0-fb literals, 0xfc-ff end).
  Other EA codecs dispatched (0x18 4x4-block, 0x30/32/34 BTREE, 0x46) but data uses only 0x10 (ported anyway, `8af51da`).
- **VIV**: BIGF (all BE: magic, size, count, header size, entries offset/size/NUL name) and compact C0FB
  (u16 magic, u16 header size, u16 count, 24-bit BE offset/size).
- **FSH/SHPI**: directory `GIMX`, 4-char names doubling as u32 ids; per-entry record chains (16-byte header: code
  with low byte type and upper 24 bits distance to next record, w, h, centre x/y, x/y on artist sheet). Types
  0x7b P8, 0x7d BGRA, 0x7e 1555, 0x6d 4444, 0x78 565, 0x7f BGR, 0x80 flag = RefPack-compressed pixels; palettes
  0x2a/0x29/0x2d; 0x6f text; 0x7c hotspots. FE screens are cut into 128x128 tiles placed by x, y.
- **4CC compare gotcha**: ids compared as LE u32 (`'Arti'` immediate 0x41727469), so files show them reversed (`itrA`).
- **CRP** (cars/tracks): EA generic chunk tree, 16-byte entries (id, info, count, offset); info bits: 2-char tag
  + 16-bit index, relative offset (16-byte units for dirs, bytes for items), sorted (binary search),
  `info>>5` children / `info>>8` data size. Items: `vt` xyz1, `nm`, `uv`, `df` vertex colours, `pr` primitive
  lists with stream tables and index lists, `$n` face planes, `dz` damage zones (index 0x8000 = damaged shape
  variant), `tr` matrix, `ef` effects, `An`. Metres; car x width, y up, z length; track y **down** in game world.
- **MAD**: EA "Madcow" video (`MADk` key, `MADm` delta, `MADe` predicted-not-reference), 16x16 macroblocks of 7-bit
  YUV 4:2:2, ~15.15 fps; audio in SCHl/SCCl/SCDl/SCEl (`src/real/mad.c`).
- **ASF/PT patch headers**: tagged values (tag, len, BE value; 0xfd sub-header, 0xff end, 0xfe layer separator,
  0xfc padding). **EA-XA R1 ADPCM**: 15 bytes per 28 samples per channel, coefficient pair + shift per frame,
  high nibble first. Music 32 kHz stereo; movies 22.05 kHz.
- **BNK** (`BNKl` v4), patches with key/velocity ranges, root key, envelope, loop, codec 10 = EA-XA.
- **Replays** `.rpl`: 0x1ce28 bytes = settings block (0x3e24) + stop tick + 0x19000 recorded controls (RLE-packed
  steering/throttle/brake/flags in 8-packet blocks every 16 ticks). Only humans are recorded; AI re-drives,
  so replay playback is a full determinism test.
- **FERT** layouts/controls: INI with expressions (`size.value=label.size.width*2`) evaluated through symbol
  text expansion and an embedded C interpreter; port wrote its own evaluator (`src/front/fert_expr.c`) that
  expands exactly as the original. Text part measures itself so `.width` is valid next update.
- **Scene `.scn`**: read with `fscanf("%s")` keyword loop and per-version `fscanf` into object bytes; the port
  keeps elements as byte images and reads them with **the exe's own format strings** (`src/game/scene_crt.c`) so
  CRT quirks carry over (`%d` into 16-bit field spills upper half into next field; camera v2 missing `break`).
- Fonts `.ffn`/`.pfn` (`FNTF`/`FNTP`) drawn as textured quads; localised strings `LOCH`/`LOCI`.
- Developer leftovers to ignore: `vssver.scc`, `FEData/Backup/V3.2.zip`, `*.xls`, `*.h`.

### Audio

- EA SND 4.1g software mixer ported with its structures and arithmetic (`src/snd/`): sources with node chains
  (decoder, per-channel effect, resampler with Catmull-Rom/linear kernels), level ramps over 32 samples, 100 Hz
  library tick interleaved with mixing runs of <=256 samples, reverb. The DirectSound device (thread filling ahead
  of play cursor) becomes a mixer **pulled per frame** for the elapsed time.
- `pu_gasm_frame`: samples = elapsed runner time x 32000/1000 (headless: exactly frame share), capped at 2048
  per frame.
- Streams (music, speech) pulled synchronously from data when the player service asks; streamed banks go
  through an LRU cache that stays silent until loaded (kept).
- Doppler `340/(340+closing speed)`, listener velocity = followed car's (null under TV cams).
- Runner audio workaround history: gasm-run 0.16.0's window audio threw away samples while rebuffering after an
  underrun, so after a long frame (load) sound stayed lost; guest pushed 160 ms then 60 ms silence after gaps
  (`fa52b56`, `60c2873`, `71cd8bc`); dropped when gasm 0.16.1 fixed it (`ecc247f`). Fix in the runtime, not
  the game, when you own both.

### Input

- `input_mode(KEYS_RAW)` mapped to DirectInput `DIK_*` codes the original reads; pads `input_pad(0..3)`
  presented as DirectInput joysticks (keyboard 0, mouse 1, pads from 2), bindings in `fe.txt`
  (`button,2,<n>`, `analog,2,<axis>,<low>,<high>`, `pov,2,<dir>`) (`495e36a`).
- Mouse clicks inside one frame were lost when only held state was read; count "pressed since last frame" as
  down (`c0e6cf0`). Pointer hidden: the FE draws its own cursor.
- Esc short press = game; held 1 s = gasm quit.

### Files / FS

- All data via `src/vfs.h` (no `fopen` in core); case-insensitive, `\` or `/`. Directory or ISO 9660 image with
  **Joliet** names preferred (primary tree is 8.3 only). `vfs.c` shared lineage with OpenRF/OpenGTA.
- Data root `OPENNFSPU_DATA=<dir|image>` for tests (default `./game`); gasm: `--asset-dir` or `--asset cd=`.
- Saves through gasm storage (`plat_save_user_file`), namespace = module filename `opennfspu`, so bundles always
  ship the module as `opennfspu.wasm`.

### Networking on gasm (`docs/re/network.md`)

- gasm:net = outbound WebSocket only (reliable, ordered, binary); no listen, datagrams, broadcast. gasm-relay
  rooms emulate a LAN segment: relay index = address `10.0.0.(i+1)`, DATA to the room = broadcast, unicast =
  address-prefixed broadcast filtered by receivers.
- Port the **original's whole network stack above WinSock** (providers UDP/IPX/TCP, connections, sliding-window
  `llpacket` with Jacobson timeout, session manager CONMAN, game layer, FE screens), and emulate WinSock itself
  (`src/real/wsock.c`), threads/events (`src/real/thread.c`), named pipes in-process (`mempipe.c`).
- Threads keep their structure via gasm cooperative threads (Asyncify); timers advance with frames; main thread
  sleeps inside a frame advance the timer so time-outs still fire.
- Self-tests behind `--param thrash_test=3..10` (WinSock, UDP, gathering, IPX, packets, memory link, TCP);
  `--param netdrop=1` forces the TCP fallback.
- EA lobby replaced by running the game's own server-side code headless (`--param netserver=1`).

### Fonts, images

- Player pictures: own baseline + progressive JPEG decoder with libjpeg's fancy upsampling and fixed-point colour
  conversion for pixel-exactness (`722e648`), TIFF, BMP/TGA/PCX, replacing `gimme.dll`.

---

## 5. Lessons learned / pitfalls (evidence)

1. **Missing static initializers are silent behaviour changes.** `TEXTURE_initstates` (0x535710), one of 479
   MSVC global ctors with no callers, missing => stage-state cache sent address modes under id 0 => every texture
   clamped, roads and grass smeared (`b2d4d24`, `docs/internals/porting.md`). Enumerate `__xc_a..__xc_z` early.
2. **ULP-level divergence is everywhere until you emulate the FPU mode.** Before `e47cee6`, 30-40 car words per
   tick were 1-2 ULPs off and the RNG could be one draw out. Fix list: float steps instead of double
   intermediates, original operation order (torque curve `((rpm - 500 i) K)(b - a) + a`), sine rounded to float,
   angles in turns. Result: 0 differing words over 248 sampled ticks; forces: 0 over 465 steps (`33977ab`).
3. **Denormals under x87 single precision**: steering filter decays through denormals; x87 reached -0 where
   float steps reached +0 (`781a0d1`). Car at rest velocity ~1e-20: squares underflowed in float (`4ae0894`).
   Whole-race free run then found denormal torques on the grid at tick 448 and a car-to-car impulse denominator
   summed in different order at tick 1292 (`364e0ea`). Needed `Math_X87` (24-bit mantissa, wide exponent).
4. **x87 stack semantics change meaning**: AI_Steer stores the speed gap with a pop then divides what's left (the
   target speed alone), so throttle depends on target speed, not the gap. Port "logically" used the gap; opponents
   pulled away slower (`3680542`). Decompiler output hides this; check disassembly for fstp/fdiv sequences.
5. **Constants: double vs float, decimal vs bits** (`a7c5785`: a double 1/1500 read as float = -473.77; showed only
   after front damage, car froze at tick 1008 of replay.rpl. `c9523ba`: 1/2pi bit mismatch; 9999 vs 10000). A
   scan of every float literal against its commented bits followed. Reading constants from the exe avoids it.
6. **Stream lookup scope bugs look like culling bugs.** Holes in cars came from looking up `$n` face planes in the
   car's root instead of the part's own article (`mov ecx, [part]` before 0x59f570) (`7e3b048`). Validated with a
   test over 1,021,844 triangles (`tests/rlayers_planes_test.c`).
7. **Save/restore of render state**: HUD_Draw saves depth func and fog and restores them; the port set ZFUNC
   always directly and never restored, so FE 3D rooms after a race had no depth test (wheels through bodies).
   A "never set" flag (0x5ded4c) was actually the cull pair's value in EAGL's state table (`85b7d27`). Route
   state changes through the same cached setter objects as the original.
8. **Address-ordered containers break determinism across data sources** (`a130d52`); folder vs ISO hash equality
   caught it. Always run two data sources with different allocation patterns.
9. **wasm lacks setjmp**: FERT expression evaluator rewritten without it (`f82c136`).
10. **Readback cost**: per-frame `glReadPixels` for software-path locks killed fps and audio (`74e6dfa`).
11. **Input sampling at frame granularity drops events** (`c0e6cf0`).
12. **Runner bugs can masquerade as game bugs**; audio silence after long frames was gasm-run 0.16.0, fixed upstream
    in 0.16.1 (`ecc247f`). Keep a frame-time logger (`--param frametime=1`, `268b596`).
13. **Ghidra CLI import may skip analysis** (dx7z.dll had 0 functions; `AnalyzeAll.java`). Auto-analysis misses
    vtable-only and callback functions (+2,007 by `FillGaps.java`).
14. **Stale notes accumulate fast** with agents: many commits are "drop a stale pending note"/"the note was stale"
    (`1aa0f27`, `eb74dbb`, `6a6d309`, `a4667b9`, `1dd357f`: docs said "not playable" after it was). Also a stale
    copy-paste: `src/exe.c`'s version error message still says "expected the 2002 release: 774,144 bytes, CRC-32
    a5ca070e" (from a sibling project) while `exe.h` checks 2,129,965 / `fd2f5573`. Add a docs/status sweep step.
15. **Agent hygiene**: agent worktrees got committed by mistake (`2d58c7a` "Untrack the agent worktrees ... ignore
    .claude/"). Add `.claude/` to `.gitignore` before spawning parallel agents.
16. **Some "bugs" are original behaviour to keep**: glows with flags 1/2/0x20/0x40 never draw because a dot product
    of normal (w 0) with camera row (w 1) is scaled by their ratio = 0; "lens" texture missing so some flare
    elements draw nothing; sun at zenith on 5 tracks means no flare; split screen exists but FE overwrites
    COMM_MODE before every race (dead code, `63c4f40`); an unknown room id crashes the original (`4d1b976`). Document
    these with "kept" so later agents don't "fix" them.
17. **Remaining known deviation documented honestly**: FE 3D room models drew upside down; the port adds a half turn
    in `FE3DObject_Draw` because where the original compensates wasn't found (`docs/re/frontend.md`).
18. **ASan on native tests** caught non-NUL-terminated text scanning (`14427f0`). Native 64-bit test build doubles
    as a sanitizer target.
19. **What worked**: format reference decoders in stdlib Python first, then C port must agree (`tex_conv_test.c`
    checks all 10,428 FSH images and 4,424 uploads against `tests/tex_ref.py`/`nfsfmt.py`); viewers
    (`car=`, `track=`, `drive=`) before the front end; a fake recording THRASH for EAGL tests
    (`tests/eagl_fake_thrash.h`, `2bb5399`); per-subsystem self-tests (`THRASH_selftest`, `EAGL_selftest`,
    `CAR_selftest`); porting order by dependency with a visible check per step (`docs/re/port-plan.md`).
20. **Velocity**: dependency-ordered plan + parallel worktree agents + strong conventions got from initial import
    to playable career in ~3 days and multiplayer + bit-exact physics on days 5-6 (see commit dates).

### Verification methods used (ranked by strength)

1. Original's code under unicorn on the port's state, word-by-word diff, then free runs carrying the original's
   own state, then whole-replay parallel runs (`tools/emu/`).
2. The game's own recorded `replay.rpl` (recorded by the original) played to the end: AI re-drives, so any sim
   drift shows. Original reader vs port packet comparison (4,667 packets equal).
3. Frame + audio hash lines from deterministic headless runs; must match across folder vs ISO, gasm-run vs browser
   vs Node host, launcher vs direct, and stay unchanged by opt-in additions.
4. Native tests on real data vs Python reference decoders (counts, bounds, checksums, values from the exe).
5. Headless screenshots for visual checks.

---

## 6. Reusable checklists / procedures

### A. Project bootstrap (day 0)

1. Pin exact target binary (size + CRC-32); write the check into the loader and the launchers and the web page.
2. `.gitignore`: game data, exe copies, `re/` dumps, `out/`, `build*/`, `.deps/`, `.claude/`.
3. AGENTS.md with: fidelity rule, no-data rule (runtime table loading), cite-the-address rule, no decompiler
   paste, PENDING_NOTE convention, headless-only rule, hash discipline, status honesty, commit style.
4. Ghidra: import, run auto-analysis explicitly (check function count > 0), FillGaps for vtables/callbacks, RTTI
   scan -> class/vtable TSV, import-users TSV, full named dump for grep, `names.tsv` with confidence levels.
5. Inventory: address ranges -> modules from link order + source strings + vtables; KB per module as estimate.
6. Architecture note: entry -> main loop -> state transitions, timing model, threads, I/O, rendering stack.
7. Port plan in dependency order, each step with a headless check.
8. Platform contract (`platform.h`) + VFS (dir + ISO 9660/Joliet, case-insensitive) + native host backend for tests.
9. `exe.c`: PE section mapper, `exe_data/u32/f32/str(va)`.

### B. Porting a function

1. Decompile + read disassembly where floats/stack ops matter (fstp/fdiv/fild sequences, float vs double loads).
2. Rename in `names.tsv` (and Ghidra), rerun apply-names.
3. Port with address comment; struct fields with offsets; `_Static_assert` sizes under 32-bit.
4. Keep operation order; floats as float; constants via `K(va)`; MSVC `rand`; `__ftol` = truncation.
5. Unported callees -> pending.c with `PENDING_NOTE`; delete when ported.
6. Check MSVC static-init table for the module's ctors -> `PORT_StaticInit` in table order.
7. Vtable dispatch -> ops table in original slot order.
8. Test on real data (skip without it); run hash cases; explain any hash change in the commit.

### C. D3D-era renderer translation checklist

- Port the vendor driver DLL logic (batching, state recording, quirks) above a minimal D3D-like device on GL.
- TL vertices: +0.5 pixel centre, w = 1/rhw, z remap, viewport as scissor.
- One shader emulating fixed-function stages + specular + fog modes + alpha test; flat shading = first vertex.
- Fixed card caps profile matching the era's recommended card.
- Keep 16-bit surface formats in 16-bit modes; integer upscale; present letterboxed.
- Make locks/readbacks cheap (CPU shadow copies); know the runner's readback behaviour headless.
- Track cull winding with mirrored matrices.

### D. Determinism / physics fidelity procedure

1. Identify the FPU mode the original runs in (D3D7 => 24-bit precision control word 0x007f).
2. Build a unicorn harness that maps the exe, rebuilds state in original layout from a port dump, answers
   callouts from the port's record, runs one function, diffs words.
3. Sweep over a recorded replay at many ticks, both tick phases, every car type (player, AI, traffic, police,
   objects).
4. Free run with carry; then whole race in parallel chunks; use write-watch and trace to localise.
5. Fix with float-order changes, `Math_X87` for denormal-prone paths, single-precision runtime math replicas.
6. Never rely on heap addresses for ordering.

### E. Release / distribution

- Semver tags without `v`, tag == CMake version check in CI.
- Ship `.wasm` + per-OS bundles with pinned runner, `.sha256` files, smoke tests without data on each OS.
- Launchers: remember data location, validate folder, env override for tests that errors instead of prompting.
- macOS: ANGLE in Resources + `--gl-lib` for codesign `--strict`.
- Browser: Worker + OffscreenCanvas + WebGL2, OPFS import with completion marker, saves zip compatible with
  desktop storage layout, `?hashframes=` parity test in headless Chrome.

### F. Ongoing hygiene

- After each milestone: sweep for stale "pending"/"not ported" notes in code and docs; update status page and
  AGENTS state line; grep error strings copied from sibling projects.
- Two data sources (folder + ISO) in the hash suite.
- Keep opt-in additions hash-neutral at defaults with a dedicated test.
