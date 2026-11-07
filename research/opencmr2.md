# OpenCMR2 (Colin McRae Rally 2.0) — research notes

Source repo: `/Users/mjaskols/Projects/my/opencmr2` (read-only). Mined 2026-11-07 from AGENTS.md, README.md,
docs/ (guide, howto, internals, re, formats), tools/, tests/, .github/workflows, and git history (327 commits,
2026-10-31 .. 2026-11-03).

---

## 1. Facts

| Item | Value |
|---|---|
| Game | Colin McRae Rally 2.0, PC (Windows) |
| Studio / publisher | Codemasters (developed and published), 2000 (version resource says 2001) |
| Original tech | Win32, DirectDraw 7 + Direct3D 7 fixed-function (hardware or software T&L) through statically linked D3DX 7 (`CD3duContext`); DirectSound (+DirectSound3D/HRTF options); DirectInput 7 (keyboard, pads, force feedback); DirectPlay 4 + DirectPlayLobby 3; ACM (`Msadp32.acm`) for MS-ADPCM music; Bink 1 (`binkw32.dll`) for movies; statically linked zlib 1.1.3. No threads of its own. Simulation in 16.16 fixed point; renderer in float |
| Target binary | `CMR2.exe` v1.11, 1,228,800 bytes, CRC-32 `44c022f4`, SHA-1 `299a29409e92242b4f66f50388a5866d46babf02`, PE32 i386, base 0x400000, not packed. `CMR2Network.exe` (same size, different build) is not targeted. European CD (`CMR2.ISO`, ISO 9660, 683,599,872 bytes; five languages). US/Polish/budget releases unverified |
| Approach | Function-by-function port from disassembly/decompilation (Ghidra, 3,583 functions, ~1,023 KB code; ~3,250 functions / 950 KB to port after excluding zlib, D3DX, CRT). Every function cites `/* Name 0x4xxxxx */`. New code only for platform layers (D3D7-on-GLES3, DirectSound mixer, DirectPlay-on-relay, VFS/ISO/InstallShield readers, inflate) and Bink 1 decoder (from published format descriptions; codec tables read from user's `binkw32.dll` at run time) |
| Language | C11, CMake; Python 3 stdlib reference tools; JS for the browser player |
| LOC | ~65,200 lines C in `src/` (game 25.0k, fe 11.2k, sim 9.8k, top-level 5.2k, world 4.6k, render 4.3k, net 2.8k, audio 2.4k) + 2.6k lines tests + ~1.7k lines tools + 900-line Unicorn diff harness + ~1k lines play page JS/HTML |
| Duration | 4 days of commits (2026-10-31 to 2026-11-03), agent-driven (commits carry `Claude-Session:` trailers) |
| Status | 0.1.4. Whole offline game playable: rallies, championships, arcade, time trial, challenge, split-screen and alternate (hot-seat) 2-4 players, service area, replays, ghosts, movies, saves. Network game (DirectPlay over gasm-relay) runs a full rally between two instances but was not race-tested end to end. Known issues: disc demo runs drift off their recorded path (original code does the same on the same state), menus don't scale with resolution (as original) |
| Runtime | gasm 0.16.1 (`gasm:gl` = GLES 3.0/WebGL 2, `gasm:storage`, `gasm:net`, audio push 44.1 kHz stereo, 60 Hz frame loop); native runners macOS/Linux/Windows + browser |
| Site | https://opencmr2.emdzej.pl (`docs/public/CNAME`) |
| GitHub | `git@github.com:emdzej/opencmr2.git` → https://github.com/emdzej/opencmr2 |
| Browser play | https://opencmr2.emdzej.pl/play/ |
| Releases | Tags `0.1.0`..`0.1.4` (plain semver, no `v`), GitHub Releases: macOS universal `.app` zip (ad hoc signed), Linux x86_64/arm64 tar.gz (`opencmr2.sh`, `--install-desktop`), Windows x86_64 zip (`OpenCMR2.cmd`, with ANGLE), raw `opencmr2-<ver>.wasm`; each with `.sha256` |
| Modern additions | 16:9 and 16:10 modes (1280x720..2560x1440, Hor+ in race, pillarboxed menus/movies/HUD); display modes up to 2048x1536 with original 1024 art; network play over relay (desktop + browser in one race); browser player with OPFS import and save export/import as zip; `--param` viewers (`car=`, `stage=`, `mode=`, `language=`, `frametime=1`, `audiolog=1`) |
| User must supply | Own CMR2 PC CD: an `.iso`/`.bin` image or the CD folder (FrontEnd, Game, SetupRep, Sounds, CountrySpecific, ~650 MB), or an installed copy. `CMR2.exe` is read straight out of the InstallShield 6 cabinet (`data1.hdr`/`data1.cab`/`data2.cab`) — no install step. Nothing is bundled or downloaded |
| Siblings | OpenRF (Return Fire, complete), OpenNFSPU (Porsche Unleashed) — explicit "copy their proven pieces" policy |

## 2. Screenshots (`docs/public/screenshots/`)

All are renders of the port, produced headless by `tools/screenshots.sh` (scripted `--input`, `--screenshot-filtered`,
1024x768x32 mode, cropped from the 1280x720 headless drawable to 960x720, JPEG via `sips`). Referenced from `docs/index.md`.

| File | Shows |
|---|---|
| `menu.jpg` | The main menu (frame 3000 after skipping logo movies + language select) |
| `service.jpg` | The service area's stage-information page in Finland (map, weather forecast) |
| `start-lights.jpg` | The start gantry's lights counting down, Finland |
| `stage-start.jpg` | "Green: away from the line" — car leaving the start |
| `demo-1.jpg` | Attract-mode demo run on gravel with the split times HUD |
| `demo-2.jpg` | Demo run on snow |
| `demo-3.jpg` | Demo run on tarmac from a trackside camera |
| `wide-stage.jpg` | 16:9 start line in Finland, forest wider at both sides (port addition) |
| `wide-demo.jpg` | 16:9 demo run on gravel |

Other site art: `hero.svg`/`hero-still.svg` (generated by `tools/hero-svg.py`: SMIL animation imitating the menu's
ribbon of letters — own drawing, nothing from the game), `favicon.svg` (also the app icon via `tools/make-icns.sh`).

## 3. Workflow & tooling

### Reverse engineering

- **Ghidra via ghidra-cli** (github.com/akiselev/ghidra-cli), project `cmr2`, program `cmr2.exe` (git-ignored copy).
  Agents run `ghidra decompile 0xADDR --project cmr2 --program cmr2.exe`, `x-ref to`, `disasm`, `memory`.
- **`tools/ghidra/apply-names.sh`** — the central loop: runs `FillGaps.java` (creates functions auto-analysis missed:
  vtable methods, callbacks; idempotent), `ApplyNames.java` (applies `names.tsv`), then `DumpAllNamed.java` /
  `DumpMeta.java` to regenerate `re/all.c` (every function decompiled, for grep), `re/meta.tsv` (addr, name, size,
  callers, callees, imports, strings), `re/funcs.txt`, `re/strings.txt`, `re/func_strings.txt`. `re/` is git-ignored.
- **`tools/ghidra/names.tsv`** (1,969 rows) — the single source of truth for names: `addr name module confidence
  description`. Confidence levels: high (read and understood) 1,422, confirmed 382, med 143, low 15. Rename in TSV,
  re-run script; never rename only in Ghidra.
- **`tools/exe.py <va> [count] [u32|u16|u8|i32|f32|s]`** prints values at VAs (research only).
- **`tools/iscab.py`** — InstallShield 5/6 reference reader (list, extract, `--crc`), mirrors `src/vfs_cab.c`.
- **`tools/bfl.py`, `tools/cmr2fmt.py`** — stdlib Python reference decoders (BFL containers; TGA/DDS→PNG,
  WAV/ADPCM→WAV, PP_F→OBJ+MTL+PNG). Output to git-ignored `out/`. `--summary` prints hashes the C tests must match.
- **`tools/bink-ref.sh`** — ffmpeg decodes `cm.bik` to yuv420p, CRC-32 over all frames → `OPENCMR2_BINK_VIDEO` for `bink_test`.
- **`tools/emu/sim_diff.c` (Unicorn differential harness)** — the standout tool. It maps CMR2.exe's code and constants
  at 0x400000-0x515fff, the port's game-state image at the original data-section addresses (0x516000-0x831fff, with
  the port's math tables at their original addresses), cars/damage/collision/replays on a synthetic heap, plus stack.
  Before each `Sim_StepCars` it copies the port's state into the emulator, runs the original's machine code
  (0x433890 and other passes, with entry hooks), and compares car blocks after the port's step. Any access outside
  mapped regions stops with the address. `FREE=1` lets the original drive on its own state. Built with
  `-DOPENCMR2_UNICORN=<dir>` (Python wheel's unicorn dir has include+lib). Commit `92859ab`.
- Inventory-first: `docs/re/inventory.md` maps the exe by address range with **anchor functions** (identified from
  strings/imports) and KB per subsystem — "KB of original code is the better effort estimate than the function count".

### Agent instructions (AGENTS.md patterns that look effective)

- One paragraph "What this is" with exact binary identity (size + CRC), runtime version, sibling repos to copy from.
- **"Fidelity is the product."** Reproduce quirks and bugs; if something looks wrong, check the disassembly; if the
  original does it, keep it and comment. Only fix deviations *of the port*.
- **Hard rules** (numbered, short): never commit original data or derivatives (lists every ignored path and file type);
  no tables/strings/geometry copied from the exe — load at run time via `src/exe.c` with size+CRC check; cite every
  ported function `/* Name 0x4xxxxx */`, names consistent with `names.tsv`; never paste decompiler output, write in
  own words; community modding notes may inform, exe is the authority.
- Exact build/test commands incl. hash env vars (`OPENCMR2_BFL_SUMMARY`, `OPENCMR2_FMT_IMAGES/_MODELS/_SOUNDS`).
- Data location guidance (network volume is slow → use local copy for tests).
- **Unattended-run rules**: always `--headless`; never open a window, never macOS `screencapture`; hold scripted keys
  several frames (`9000-9004:KEY(Enter)`) because a one-frame tap can land in a frame with no sim step; network tests
  with two `--realtime --allow-net` instances on a local `gasm-relay`, "kill only your own relay's PID".
- Docs site rules: no emojis, don't overstate state (`status.md` is the public record), internal RE pages excluded
  from build (`srcExclude`), dead links fail the build, badge hotlinked unmodified, theme colours specified.
- `docs/internals/porting.md`: same function order, same arithmetic, 16.16 stays 16.16 with `(int64_t)a*b>>16`,
  explicit wrap-around, MSVC `rand()` LCG ported and seeded where the original seeds; all file access via `vfs.h`
  (no `fopen` in core); in-place offset data read through accessors, never host pointers written into it;
  `platform_gasm.c` is the only file including `gasm.h`, `render/d3d7.c`/`gl_dev.c` the only GL users; frame clock
  replaces `timeGetTime()`; **never add a blocking loop**.
- `docs/re/port-plan.md`: ordered steps 0-11, **each ending with a concrete check** (native test against user data,
  or headless hash/screenshot). Updated in place with "So far:" / "Done:" paragraphs as work lands.
- `src/pending.h` `PENDING_NOTE(addr, name)`: not-yet-ported calls log their name+address once and return neutral —
  keeps the original's call order visible while porting top-down.

### Build system

- CMake, two builds: native (`build/`, tests and tools only, 64-bit host) and gasm (`-DOPENCMR2_PLATFORM=gasm`,
  toolchain `.deps/gasm-c-sdk/cmake/gasm-toolchain.cmake`, wasi-sdk). `tools/fetch-gasm-sdk.sh` pins `GASM_VERSION`
  (single pin, kept in step with `@emdzej/gasm-host` in `docs/package.json`).
- `./play <iso|dir>`: fetches SDK + runner into `.deps/` on first use, builds, runs in a window (`GASM_RUN=` for a
  local gasm build).
- Packaging: `tools/package-gasm.sh <ver> <platform> <runner dir> <out>` → bundles; `tools/fetch-gasm-runner.sh`
  (includes ANGLE libEGL/libGLESv2/SwiftShader — needed next to gasm-run for `gasm:gl`); `tools/smoke-gasm-bundle.sh`
  checks a bundle with no data: must exit 1 with "game data not found" (not crash), launcher `--help`/`--dry-run`
  against fake data layouts (CD folder, install folder with a 1,228,800-byte exe, things that must be refused).
  Launchers remember the data location (`--change-data`).

### CI (`.github/workflows/`)

- `ci.yml`: native build+ctest on macOS and Ubuntu (tests skip without data → smoke only), `py_compile` all tools,
  wasm build uploaded as artifact, bundles for all four platforms, smoke tests on macOS and Linux, `shellcheck` on all
  scripts.
- `release.yml`: on `[0-9]+.[0-9]+.[0-9]+` tags; tag must equal CMake version; builds, packages on each OS
  (macOS for iconutil/codesign), smoke tests incl. Windows, creates release with `.github/release-notes.md`.
- `pages.yml`: builds the wasm, copies it into `docs/public/play/` (`docs/scripts/copy-wasm.sh`), pnpm install,
  vendors gasm runtime, VitePress build, deploys to Pages.

### Docs site

VitePress in `docs/` (pnpm 10, Node 22), `cleanUrls`, `srcExclude: [README.md, AGENTS.md, CONTEXT.md, re/**, formats/**,
internals/**]`, `ignoreDeadLinks: [/^\/play\//]`. Custom theme `docs/.vitepress/theme/cmr2.css` in the game's menu
palette (sage, mint, white; red only on logo dots and warnings). Published pages: guide (index, status, game-data,
playing, network, gasm), howto (build, extract-cd), play. Internal pages stay in repo as agent knowledge base.

### Browser player (`docs/public/play/`, copied from OpenNFSPU)

- `index.html`, `play.js` (509 lines), `data.js`, `saves.js`, `play.css`; `vendor/` from `docs/scripts/vendor-web.sh`
  (copies pinned `@emdzej/gasm-host` and `@emdzej/csfs-*` npm packages; never edit copies). Both wasm and vendor are
  git-ignored; Pages workflow builds them.
- Game runs in gasm's Worker mode; canvas handed over with `transferControlToOffscreen`; WebGL 2 inside the worker;
  page keeps input and audio. Data via OPFS (`FileSystemSyncAccessHandle`) after "Import and play" (~610 MB), or
  directly from picked files (`FileReaderSync`) for "Play without importing". A hidden marker file written last
  detects incomplete imports. Folder validation: `FrontEnd`, `Game`, and the cabinet or a 1.11 exe; strips installer,
  manual, Acrobat, DirectX. ISO check = ISO 9660 volume; game validates the rest.
- Saves in IndexedDB (`gasm:storage` namespace `opencmr2`, same as desktop's `<data>/gasm/opencmr2`); export/import zip.
- Dev params: `?hashframes=N` (virtual-time run printing the same `video_fnv32/audio_fnv32` line as
  `gasm-run --headless N`), `input=` (gasm-run `--input` syntax), `size=WxH` (default 1280x720 to match headless),
  `batch=`, `autoplay`. `tools/web-play-test.mjs` drives this in headless Chrome via CDP
  (`DOM.setFileInputFiles` into `<input webkitdirectory>`), imports to OPFS, reruns from OPFS, runs without import —
  each run's hash must equal gasm-run's.

## 4. Technical knowledge that generalizes

### Program structure (and why the port was "easy" structurally)

- `WinMain` 0x4a9720: single-instance `FindWindowA`, debug log `c:\error.txt`, `AtExit_Register` callbacks,
  `PeekMessage` loop calling `Input_Poll` 0x4b7a40 + `Game_Frame` 0x4d0780 once per idle iteration. **Already
  one-frame-per-call**: maps directly onto `gasm_frame`. Loading is synchronous inside a state update — acceptable on
  gasm (runner waits for the frame).
- Top-level modes: 0 front end, 2 world (service/loading), 3 race. Each runs a tiny **process framework**
  (0x49c0a0-0x49c400): process slots (state word + frame counter), `{update, draw}` state tables, byte-triple
  transition tables `(state, kind, event, next)`, pending-switch priority bits 24-25. Ported as-is
  (`src/game/proc.c`); code-address state tables replaced by C tables in the same order; transition tables read
  from the exe at run time (0x519120 etc.).
- **Game state image** (`src/game/mem.c`): the original's whole data section 0x516000-0x831c7c is malloc'd; first
  0x14000 bytes copied from the exe at start, the rest zero (BSS). Ported code accesses globals by original address
  (`gm32(0x52f2ac)`), with one-line accessors in `gstate.h`. This avoids copying any table into source, keeps
  run-time-filled tables behaving identically, and made the Unicorn diff possible (same addresses).
- Car state kept as the original's 0xc24-byte block addressed by offset (`src/sim/car.h`); embedded pointers kept beside it.

### Timing and determinism

- `Timer_Sample` 0x4a9b70 latches `timeGetTime()` once per frame; `Timer_Centis` builds 1/100 s on it. Port drives
  it from a clock advanced by the gasm frame period → headless runs deterministic.
- **Fixed 25 Hz simulation** (`+0xa98` float 25.0 per car, set only by `Car_Init`): `Sim_StepCount` 0x42c890 converts
  latched times to steps (`round(ms*0.001*rate)`), **capped at 5 steps per frame**, fraction×65536 into `+0xa90`;
  `Race_PoseInterp` 0x41d060 interpolates drawn poses. At 60 Hz: 0 or 1 step per frame.
- Stage time = step count ×4 (1/100 s), so timing is exact regardless of frame rate. Per-frame fades (lamps, weather)
  scaled by 25/measured fps.
- Input polled per sim step → scripted inputs must be held several frames.
- **MSVC CRT reproduced exactly** (`src/crt.c`): `rand()` LCG `holdrand*214013+2531011 >>16 &0x7fff`, and msvcrt's
  `qsort` (middle-element quicksort with ≤8-element "move greatest to end" short sort) because equal-key ordering
  in the game's sorts is observable. `Font_Print` draws three `rand()` values per string printed, so the shared
  random sequence advances with HUD text — porting the clock HUD with libc `rand` broke it (`2cb6f32`).
- **x87 precision**: `FILD; FMUL m64; FISTP` modelled as `X87_MulRound` (product rounded to 64-bit mantissa, then
  round-to-nearest); earlier 24-bit model was wrong (`92859ab`). Caveat: 64-bit is Unicorn's behaviour (ignores
  precision control); real hardware under D3D7 may leave FPU at 24-bit — unconfirmed (`a897a0c`).
- Math tables (`Math_InitTables` 0x4b7b20): sine/tan 4,096 int32, sqrt 4,096 u16, asin 4,096, atan 512; angles 4,096
  per turn; built from double constants the port reproduces exactly (`tests/math_test.c`).

### Physics

- 120 functions / 116 KB in 0x428000-0x445000, 16.16 fixed point (~10,000 `>>16` in decompiled code), no float in
  the sim path except specific x87 conversions. Handling base parameters are **immediates in `Car_Init`** (switch on
  14 handling classes) — ported as code, not a table. Set-ups 7 bytes per car.
- Ported passes: controls, integration, tilt, steering body, suspension, wheel heading, ground contact, tyres,
  drivetrain, revs, surface grip, corner velocities/impulses, road following, walls (`fin.dat`), scenery collision
  (256,185 cylinders vs ~10k boxes on disc), car-to-car (fully inelastic: restitution term ×0 at 0x48b0c7), free body
  for loose/rolling cars, recovery, damage (vertex-colour-encoded crumple limits: RGB−0x80 = max move per axis in
  1/64 unit), loose parts, misfire, aerials.
- Replays are **input recordings** (4-byte RLE control frames per step) with a snapshot at the go (damage record +
  whole 0xc24 car block + progress + state changes) → they double as end-to-end physics tests.
- Collision mesh `.hpc`: quadtree (5 levels, 4x4 children), 16.16 vertices, triangle chosen by mean-y nearest caller's.

### Rendering (D3D7 fixed function → GLES 3 / WebGL 2)

- Two layers: `src/render/d3d7.c` records device state with D3D7 defaults and D3D7 structure layouts, GPU-free so
  native tests can check it (`tests/d3d7_test.c`: 205's 27 texture records, 30 batches, 672 triangles);
  `src/render/gl_dev.c` back end (adapted from OpenNFSPU's THRASH device) implements: flip chain, two-stage
  texture combiner (every `D3DTOP` up to `DOTPRODUCT3` plus bump ops 22/23, every `D3DTA` with modifiers), alpha
  test, fog (linear/exp/exp2 vertex fog from eye depth or range), pre-transformed `XYZRHW` path, and new here:
  D3D7 T&L in the vertex shader (row vectors, normals by inverse-transpose of world-view, point/spot/directional
  lights with range/attenuation/cone, four material sources, local/infinite viewer specular, generated texcoords
  camera-space normal/position/reflection with texture matrices). State changes → shader key.
- Pre-transformed vertices mapped by D3D's viewport rule to the same screen coordinates as transformed ones, in a
  form linear in clip space so GL clipping stays exact.
- All textures decoded on CPU to RGBA8, one mip level (disc has none). DXT1/DXT5 decoded with bit-replicated
  endpoints and truncated 1/3, 2/3 mixes. 16-bit surface formats (565/4444/1555) and their banding NOT reproduced.
- Original's own render-state layer ported above the emulation (`rstate.c`: cached setters, including the quirk
  that the first `Render_AlphaBlend(0)` does nothing because cache starts at 0 while device state is on).
- Caps emulate a single hardware-T&L card. A misread caps bit (`0x6e0c34` thought `DRAWPRIMITIVES2EX`, actually
  `ZBUFFERLESSHSR` in `dpcTriCaps.dwRasterCaps`) left the z-buffer uncleared and broke the service-area car (`90b9f07`).
- Reflections: cube env maps (option 0x80) rendered per car (six faces with own z-buffers), static env map (option 8),
  bump env map with luminance (option 0x10) packed as RGBA8 decoded signed in shader.
- Display adapter emulation (`render/display.c`) replays the DirectDraw mode-enum callback rules (≥640x480, 16/32 bpp,
  3 buffers fit VRAM minus texture share) over a fake 64 MB card's 4:3/5:4 list. Mode change reloads archives,
  textures, fonts as original does. ≥1024 wide → original's 1024 art sets.
- **Widescreen technique** (`ddafd7a`): `D3d_ScreenSize` reports the 4:3 screen of the mode's height (1280x720 →
  960x720), so all game layout/projection logic sees a normal 4:3 mode. GL back end offsets that screen to centre
  (`ox=(W-w)/2`) for pre-transformed x, viewport, scissor, clears, readback. `D3d_SetWide` on only during race
  draws: edges at 0 or w (within a pixel) snap to full-screen edges; full-screen viewport clipped to whole width
  while keeping the 4:3 mapping → Hor+ with unchanged vertical FOV; HUD/mirror/3D-to-2D projections stay put. Off:
  pillarbox + black sides.
- **Performance on WebGL** (critical): original-style "set whole state per draw" = ~60 GL calls/draw, 13,400/frame.
  A GL state shadow sending only deltas cut to ~900/frame, 2x native speed, fixed browser frame skipping
  (`0a0a3fc`). Then: dirty-range VB uploads via `glBufferSubData` (`eff6984`), triangle queue/car shading upload only
  written vertices, per-frame textures (mud, movies) via `glTexSubImage2D` (`654615d`), indices on device and VAOs
  (`4cd5427`, `20f12b5`). Released as 0.1.1 "the race's stutter fixed".

### Audio

- `src/audio/dsound.c`: DirectSound buffer emulation (create, duplicate, lock/copy, play looped/once, stop, status,
  volume in 1/100 dB, pan, frequency) over one mixer rendering 44.1 kHz stereo pushed per frame. Original sound layer
  ported on top (200 sounds, 32 voices, handle = slot in low 6 bits; volume→attenuation formula ported exactly).
- Engine: 13 WAVs per engine bank, three RPM bands from tables in exe, Doppler in replays, camera-distance fade.
- Music `.adp` = RIFF MS-ADPCM stereo 44.1 kHz, block align 2,048 → own decoder streaming through VFS (replaces ACM).
- **Audio push sizing**: push samples for the *elapsed runner time since last frame* (accumulator, capped 2048), not
  `rate/fps` — otherwise window vsync drift drains or floods the queue, choppy for seconds (`0cf854a`). Headless,
  `gasm_time_ms` is frame-derived so hashes are unchanged.
- gasm 0.16.0 runner bug: after a long load the queue drained and the runner dropped samples while rebuffering;
  workaround push of 160 ms silence after a >60 ms gap (`f50c634`, `1dc2052`), removed when gasm 0.16.1 fixed it
  (`d7ab36a`). `--param audiolog=1` logs peak/mean/RMS every 5 s to check sound headless.
- Force feedback (DirectInput effects driven by "camera shake" record) left out — gasm has none.

### Input

- DirectInput scancodes kept: gasm raw keyboard mapped to `DIK_*`, pads from `input_pad(0..3)`; original bindings
  and `Controller.rcf` logic ported. Two keyboard players (arrows / keypad).
- Input has a menu mode vs race mode (0x49ea90); omitting the switch in the loading state made Esc arrive as the
  menu's 0x20 not the pause's 0x400 → Esc didn't pause (`4f532dc`, released 0.1.2).

### Files, FS, data formats

- VFS (`src/vfs.c`, from OpenNFSPU): host dirs and ISO 9660 images, case-insensitive, `/` or `\` (disc mixes
  `Fra02Hi.bfl`/`fra01hi.bfl`). `vfs_cab.c` overlays the InstallShield 6 cabinet so the exe and demo runs appear at
  installed paths. Cabinet: `ISc(` headers, 0x57-byte file descriptors, files may span volumes, compressed data =
  chunks of u16 length + raw deflate; stale duplicate entries (first wins). Own RFC 1951 inflate (`src/inflate.c`).
- Registry (`HKLM\SOFTWARE\Codemasters\Colin McRae Rally 2`) replaced by launch parameters.
- **BFL container**: optional gzip (zlib `gzopen` passes plain files through) → `CMPR` + u32 size → payload; archives
  have a trailing directory (size, offset, namelen, name padded to 4) + final u32 dir offset; no entry count.
  `Bfl_Find` lower-case basename linear first-match. Texture lookup `.dds` then `.tga`; TGA/`C`-DXT5 archive pairs;
  track textures and car `a` sets exist only as DXT5 → DXT decoder mandatory.
- **PP_F** models (`.c3d/.sky/.gro/.obj/.sht`): memory images with offsets relocated into pointers by
  `C3d_Fixup` 0x4b93c0. Port keeps offsets + accessors (native test build is 64-bit). Record sizes verified by
  "sum of arrays == header +0x08" across all files. Vertex FVF 0x2d2 (48 bytes). Polygon texture indices rebased by
  the running global texture count — a latent order dependency.
- Textures: TGA type 2 bottom-up only (top-down refused), DDS DXT1/DXT5. Sounds: canonical 44-byte WAV header read at
  fixed offsets (no chunk walk); empty `cut.wav` members alias `ditch.wav`'s offset.
- Text: one CRLF string per line, Latin-1, empty lines skipped (not counted), no end test. Fonts `.pcf`+atlas with
  kerning pairs; one garbage glyph record (`hel_20pt` `Í` all 0xcd bytes = uninitialised memory in the font tool) —
  port gives it no kerning to avoid reading past the file.
- Stage archive = 25 member types (`.hpc` collision, `.csp` starts, `.tre` shadow tree, `.hor` horizons, `.cat`
  centre line, `fin.dat` walls, `.tsc` trackside camera splines, `.ai0-2`, `.srf`, `.cod` pace notes, replays `.grp`).
- AI drivers: small **neural nets** per stage (`.ai0..2`: 4-4-2 net for steering, 1-2 for throttle/brake, 64-entry
  tanh-like squash table, racing lines per centre-line point) — ported in `src/game/ai.c`.
- Saves: `Controller.rcf`, `GameInfo.rcf`, `game_<n>.rcs`, leaderboards, replays → `gasm:storage` keys with the same
  names. Save-format compatibility with the original is explicitly not a goal.

### Video (Bink 1, revision `i`)

- 640x480; `cm.bik` 549 frames @25, `intro.bik` 2,760 @30, per-rally movies with five language audio tracks.
- `src/bink.c` (917 lines) from public format descriptions: 9 bundles, 10 block kinds, 16 Huffman code sets, bit-plane
  DCT coefficients, 16 quant matrices, integer IDCT; audio = RDFT with critical-band quantisers, 1/16 overlap.
  **Codec tables read from user's `binkw32.dll` at run time** (same trick as exe tables) — no tables in source.
  Every frame of every movie bit-exact vs ffmpeg; audio to float precision.

### Network

- DirectPlay 4 subset emulated over gasm-relay rooms (`src/net/dplay.c`): session enumeration async, host/join with
  password, players with data, directed/broadcast messages, system messages, host migration to lowest member. Native
  build has an in-memory relay for `tests/dplay_test.c`.
- Original's model kept: each car's 30-byte quantised state sent every step (not guaranteed), dead-reckoning
  predictor (place += v dt + drag; revs quadratic) with halfway blending and snaps. Kind-2 replays store poses.

## 5. Lessons learned / pitfalls (with evidence)

1. **The decompiler silently drops arithmetic.** Ghidra's output for `Car_Integrate` 0x435470 dropped the position
   and angle steps (`v dt - dv dt/2`) and a 0.2 scale on dv; ported from disassembly instead (`ef54dfb`). Same for
   Tilt, Suspension, SteerBody, WheelHeading, CornerImpulse (`29bfb09`..`bbf4017` titles say "from the disassembly").
   Net code: "the type byte comes from a byte store the decompiler drops" and "where the decompiler merges products"
   (`docs/re/network.md`). Rule: for numeric hot code, read the disassembly, not the decompiler.
2. **Differential testing against the original's machine code in Unicorn** made the sim bit-exact over all 4,211
   steps of the Fra01 demo (`92859ab`), and found bugs no review would: x87 64-bit vs 24-bit rounding; spin damping
   and wheel forces only with a corner on the ground (a jump at 0x43554b); dents move a vertex normal by 3x its move;
   a damage chip counter decrementing per step. Prerequisite: game state at original addresses (state image).
3. **Harness bugs masquerade as port bugs**: a step-3200 divergence was the harness's own `Timer_Centis` clock gating a
   roll sound's `rand` draw differently (`753a5a0`); Kenya stopped at step 212 because original `Particle_Emit` read
   port-private tables — stubbed to just its three `rand` draws (`a897a0c`).
4. **Know when the "bug" is the original.** Demo runs leave the road at ~step 230; running the original's code free on
   the same start takes the same path, so the recordings likely come from another build. Documented as known issue
   rather than "fixed" (`92859ab`, `9a8df91`, `docs/guide/status.md`).
5. **Uninitialised data in the original must be modelled, not zeroed.** `Car_CornerGround` passed an uninitialised
   normal; the original writes in place at +0x4a4 so an off-mesh corner keeps the last one. Garbage made off-road
   runs differ between builds (`5eb382d`). Similarly the cars' `BU/B2/B3` texture-flag path leaves a variable
   unassigned holding the previous texture's flags (`docs/re/render.md`), and a sprite without texture causes later
   sprites to use the next sprite's vertices.
6. **Shared PRNG side effects are everywhere**: text printing consumes `rand()`; HUD clock jitter from the shared rand
   (`2cb6f32`); misfire uses `rand` through the FPU. Use the original CRT's generator for *all* consumers.
7. **Caps bits matter**: misidentified `ZBUFFERLESSHSR` → no z clear → broken service car (`90b9f07`). Read the exact
   struct offset in the disassembly (dword +0x44 of `D3DDEVICEDESC7`).
8. **Mode switches hidden in loading states**: input-mode switch omitted → Esc didn't pause (`4f532dc`). Port each
   state's side effects in order, including tiny calls.
9. **WebGL call overhead dominates**: per-draw full state reapplication was fine natively but made the browser skip
   frames; state shadowing + partial uploads were required (`0a0a3fc`, `eff6984`, `654615d`). Build the state cache
   into the GL backend from day one.
10. **Audio pacing must follow the runner's clock**, not nominal fps (`0cf854a`); runtime bugs get temporary,
    clearly-labelled workarounds removed on upgrade (`f50c634` → `d7ab36a`).
11. **Pointers in data vs 64-bit native tests**: keep offsets + accessors in one place (PP_F, stage tables), so the same
    code runs in wasm32 and in 64-bit native tests (`docs/re/port-plan.md` ground rules).
12. **Scripted-input timing**: one-frame taps can be lost because input is polled per sim step (25 Hz on 60 Hz frames);
    hold 5 frames (`AGENTS.md`, `docs/re/network.md`). Network instances must run `--realtime` or they never meet.
13. **What worked well**: Python stdlib reference decoders + C decoders compared by summary hashes over the whole disc
    (7,804 DDS, 4,003 TGA, 1,211 models, 604 WAVs, 10 music, 72 fonts; image `58c9384f`, models `f6bd27a1`, sounds
    `76f48a11`), same hash from folder and ISO; viewers (`--param car=`, `stage=`) as the renderer's first check before
    any gameplay; ffmpeg as Bink oracle; headless `video_fnv32/audio_fnv32` equality across gasm-run, Node runner,
    wasmtime and the browser page.
14. **Port top-down in the original's call order with PENDING stubs** — the race ran through its real state machine
    with the viewer as temporary host before all loaders existed (`c8e6ec4`), so integration was never a big bang.
15. **Speed**: the whole offline game was ported in ~3 days of agent commits, because the plan sequenced work so every
    step had an automated check, and RE notes were written in docs as each function was ported.
16. **Things deliberately not reproduced** (documented): 16-bit surface formats/banding, mip chains, force feedback,
    registry, original save format compatibility, D3DX/DirectDraw (mode bookkeeping only).

## 6. Reusable checklists / procedures

### A. Project bootstrap (day 0)

1. Identify the exact binary: size, CRC-32, SHA-1, PE sections, packer check. Write it into AGENTS.md and make the
   loader (`exe.c`) refuse others.
2. Find where the exe lives on the retail media (here: inside an InstallShield cabinet) and write a reader so users
   need only the disc/ISO; reference reader in Python first, C second, compare CRCs of all files.
3. Ghidra import + auto-analysis + a FillGaps script; set up `names.tsv` + apply/dump script producing grep-able
   `all.c`, `meta.tsv` (callers/callees/strings), `funcs.txt`. Git-ignore all derived dumps.
4. Write `inventory.md`: address ranges, anchor functions from strings/imports, KB per subsystem, statically linked
   libraries to skip (zlib, D3DX, CRT).
5. Write `architecture.md`: main loop, mode/state machines, timing model, file layer, device API usage (vtable offsets
   with call-site counts), globals layout.
6. Write `port-plan.md`: ordered steps, each with a machine-checkable completion criterion.
7. Copy proven pieces from sibling ports (VFS/ISO, gasm platform file, GL device, bundles, play page, CI).
8. AGENTS.md: identity, fidelity rule, hard rules on data/decompiler output, build/test commands with hash env vars,
   headless-only rules, docs rules, commit rules.

### B. Per-function porting procedure

1. Name in `names.tsv` (with confidence) → re-run apply script.
2. Read decompile; for any arithmetic-heavy or suspicious function read the disassembly too (stores of bytes,
   FPU sequences, branches over blocks).
3. Port in the same structure/call order; cite `/* Name 0xADDR */`; keep integer widths, 16.16 multiplies, wrap,
   rounding, uninitialised-variable behaviour, out-of-range reads (bounded only when they'd crash the port, with a
   comment).
4. Tables/strings: read from the exe at run time via VA; never copy.
5. Unported callees: `PENDING_NOTE(addr, name)` with neutral return.
6. Document layout/formula in the matching docs page in own words; mark confirmed vs inferred with the address that
   would confirm.
7. Add/extend a native test that runs on user data and skips without it.

### C. Verification ladder

1. Format decoders: Python reference vs C, whole-disc summary hashes; same from folder and ISO.
2. Asset viewers via launch params; headless screenshots.
3. Device emulation state tests without GPU.
4. Fixed-point tables/helpers vs constants computed from the exe.
5. Sim: replays/demo runs as end-to-end tests; record-then-replay self-consistency.
6. Differential harness: original code in Unicorn on the port's state at the original addresses, compare per pass per
   step; mirror any port-private tables in the original's layout; stub only side-effect-free (or rand-only) callees.
7. Headless video/audio hash equality across runners (native, Node, wasmtime, browser `?hashframes=`).
8. Scripted full-flow tests (front end → stage → results) with keys held ≥5 frames.
9. Perf: `--param frametime=1` per-section timing of slow frames in a window (headless clocks are virtual).
10. Audio sanity headless: `--param audiolog=1` peak/mean/RMS.

### D. D3D7-era renderer on GLES3/WebGL2

- Split API-recording layer (testable, D3D defaults/layouts) from GL backend.
- Shader key from render + texture-stage state; implement fixed-function T&L, two-stage combiner, vertex fog, alpha test.
- Pre-transformed vertices through the same viewport rule, linear in clip space.
- GL state shadow from the start; partial VB/texture updates; VAOs; keep index buffers on device.
- Emulate one plausible card's caps; verify each caps bit's struct offset in disassembly.
- Widescreen: lie about screen size (4:3 of mode height), centre with offset, Hor+ only in 3D views, edge-snapping of
  2D at 0/w within a pixel; pillarbox UI.

### E. Release/distribution checklist

- Single version pin for runtime SDK and web host package.
- Bundles per platform with runner (+ANGLE on Windows), launchers remembering data location, `--help`/`--dry-run`.
- Smoke test without data: clean "data not found" exit code 1; fake-layout acceptance/refusal tests.
- Tag = CMake version, plain semver; `.sha256` per artifact; release notes file in repo.
- Browser player: Worker + OffscreenCanvas, OPFS import with completion marker, play-without-import path, save zip
  export/import, `?hashframes` parity test in headless Chrome.
- Site: product pages only; RE/format notes excluded; status page conservative; screenshots are port renders made by
  a script, never game files.
