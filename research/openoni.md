# OpenOni: research notes

Source repo: `/Users/mjaskols/Projects/my/openoni` (read-only). Snapshot: 90 commits, 2026-11-02 to
2026-11-07 (4, 6, 43, 15, 14, 8 commits per day). 89 of 90 commit bodies end with a `Claude-Session:`
link, so the project was written almost entirely by agents across many sessions.

---

## 1. Facts

| Item | Value |
|---|---|
| Game | **Oni** (third-person action, Konoko, 15 levels: 0,1,2,3,4,6,8,9,10,11,12,13,14,18,19) |
| Studio / publisher | Bungie West / Gathering of Developers (Rockstar on console), 2001 |
| Original tech | C, MSVC, ~1.5 MB exe. Bungie's in-house engine with module prefixes: Motoko draw engine (`M3`/`MS`/`gl_*`), Akira environment (`AK`), `TM` instance manager, `P3` particles, `AI2`, `SL` (BSL scripting), `WM` UI toolkit, `SS2`/`OS` sound. **OpenGL 1.1 loaded at run time** via `LoadLibraryA("opengl32.dll")` (no import), dead 3dfx paths (FXT1, Glide gamma, `-glide`). **DirectSound** + **MSACM32** (Windows ACM decodes MS ADPCM), mixer thread. **DirectInput** + input event-queue thread. **Bink** (`binkw32.dll`) for 2 movies. `QueryPerformanceCounter` timing. Memory-mapped files. Registry read-only (`Software\Bungie\Oni`). (`docs/re/architecture.md`) |
| Targeted binary | Windows v1.0 `Oni.exe`, 1,527,808 B, CRC-32 `a8223704`, image base 0x400000. Also `binkw32.dll` 286,208 B, CRC-32 `6696be85` (its tables are read at run time too). CD: `Oni (USA).iso`, volume `001228_1801`, 437,792,768 B |
| Name source | Feral's Intel Mac build 1.2.1 (2015), i386 Mach-O with ~6,244 of Bungie's own function names. Used as a **name map only, not the authority** (later version, GCC, Feral changes: new cheats, `-wsafety`, `-parkour`, incompatible `persist.dat`) |
| Approach | **Function-by-function port from disassembly** of the Windows exe (Ghidra), every function citing name + address (`/* ONrGame_Update 0x4xxxxx */`). Quirks and bugs kept. Community knowledge (OniGalore, OniSplit, Daodan) may inform format understanding, but "the exe is the authority and no code is copied". Not an emulator/wrapper |
| Language | C11. Reference readers in Python 3 stdlib (`tools/*.py`). Play page JS |
| LOC (rough) | `src/` ~51,800 lines C (biggest: `particle.c` 3,561, `melee.c` 2,698, `app.c` 2,051, `wm.c` 2,036, `sound.c` 1,995, `chars.c` 1,587, `weapon.c` 1,561). `tests/` ~5,200 lines (44 tests). `tools/` ~2,600 lines Python. Docs ~7,700 lines Markdown (`docs/re/ai.md` alone 1,480, `character.md` 776) |
| Original size | 3,655 functions, ~1,065 KB code (`docs/re/inventory.md`); biggest modules ON 201 KB, AI2 169 KB, P3 75 KB, OBJ 69 KB, MS 48 KB, WM 47 KB |
| Status | All 15 levels **play through to the end of the game** via scripted headless routes, but with the game's own cheats on (invincible, mostly omnipotent; without them only level 1 survives). Presentation partly missing. Marked stand-ins remain (27 `stand-in` comments in `src/`: camera parts, fight-mode maneuver paths, some knockdown/floor). Not ported: developer console/keys (unreachable in v1.0 anyway), camera record/play, turret hum, IMA4 (Mac-only) audio, colour-animating textures |
| gasm version | 0.16.1 (play page vendors `@emdzej/gasm-host` 0.16.1; port plan mentions 0.16.0 pins) |
| Site | https://openoni.emdzej.pl (`docs/public/CNAME`) |
| GitHub | git@github.com:emdzej/openoni.git -> https://github.com/emdzej/openoni |
| Browser play | https://openoni.emdzej.pl/play/ (static page in `docs/public/play/`, user supplies data) |
| Release downloads | None yet: no tags, no `release.yml` (planned in port-plan step 11: gasm bundles for macOS/Linux/Windows). CI uploads `openoni-wasm` artifacts (14-day retention). Companion tool **visextract** (Go, MIT, release binaries for Linux/macOS/Windows: https://github.com/emdzej/visextract) |
| Modern additions | Plays straight from the CD ISO (no installer, no Wine). Runs natively (macOS/Linux/Windows via gasm-run) and in the browser from one `.wasm`. Debug launch params (`--param play=1 level=N at= route= trace= sltrace= ailog= physlog= invincible= omnipotent= unstoppable= call= keys= save= movie= drawfrom= viewer=level cam=`). Widescreen/hi-res planned only as non-default params; currently "the resolution lists only the one screen mode the port has"; UI drawn as at 640x480, scaled (`src/render/ui_draw.c:109`) |
| User data | **Original Windows US CD** (ISO or folder of its files) or an existing installed Oni folder. The game lives only inside the CD's MindVision Installer VISE archive (`ONISETUP.EXE` + `ONISETUP.002`). Installed layout: `Oni.exe`, `binkw32.dll`, `GameDataFolder/level*_Final.{dat,raw}`, `intro.bik`, `outro.bik`, `IGMD/<level>/*.bsl` (95 files, 641,025,194 B). Must be v1.0 exe by size + CRC (Mac/other builds refused with a message) |
| License | GPL-3.0 |
| Siblings (same conventions) | `../openrf` (Return Fire, complete), `../opencmr2` (Colin McRae Rally 2.0, closest analogue: 3D Windows 2000 game on `gasm:gl`), OpenNFSPU (mentioned in e834115). AGENTS.md tells agents to copy their proven pieces (file layer, gasm backend, bundles, play page) |

---

## 2. Screenshots

There are **no screenshots** in the repo's docs. `docs/public/` holds only:

- `docs/public/emblem.svg`: the site's emblem, drawn for the site (not from game data).
- `docs/public/CNAME`.
- `docs/public/play/`: the player (`index.html`, `play.js`, `play.css`, `data.js`, git-ignored
  `openoni.wasm` and `vendor/`).

No `.png/.jpg/.webp/.gif` exist anywhere under `docs/` (outside node_modules). Rationale is the hard
rule "never commit original data or anything derived from it": a screenshot of the game is derived data.
Local captures exist only in git-ignored `out/` (e.g. `bink_60.png`, `bink_200.png`, `bink_700.png`,
`a.png`, `b.png`: Bink decoder frame checks and A/B comparison shots; not publishable).

The site's visual identity instead comes from colour values sampled from the game's menu textures
(navy field, blue circuit traces, chrome lettering with orange halo, slanted button panels), with the
traces/emblem re-drawn (commit 4afa0c8); a separate light theme (8619643). Fonts: Chakra Petch + Inter.

Implication for a knowledge base: if screenshots are wanted, they must be produced on demand from the
user's own copy (e.g. `gasm-run --headless N --screenshot`) and policy must decide whether to publish.

---

## 3. Workflow & tooling

### 3.1 Reverse engineering

- **Ghidra** projects managed by **ghidra-cli** (`ghidra decompile 0xADDR --project oni --program oni.exe`,
  `x-ref to`, `disasm`, `memory`, `script run`). Project `oni` holds `oni.exe` (copy of `game/Oni.exe`)
  and `oni-mac` (Mac 1.2.1). Project `onisetup` holds the CD's setup program and `vise32ex.dll`.
- **Import pitfall**: import with Ghidra's own `analyzeHeadless`
  (`/opt/homebrew/Cellar/ghidra/<v>/libexec/support`, into `~/Library/Caches/ghidra-cli/projects`, after
  `ghidra stop --project <p>`). ghidra-cli's own import left `oni-mac` and `vise32ex.dll` with broken
  listings (`push` decoded as two-byte `MOV`s).
- **zsh pitfall**: keep options in an array (`P=(--project oni --program oni.exe)`, then `$P`): zsh does
  not word-split.
- Ghidra scripts in `tools/ghidra/`:
  - `FillGaps.java`: creates functions auto-analysis missed (vtable methods, callbacks) -> 3,136 to 3,655 functions.
  - `CreateFunctions.java` + `entries.tsv` (80 entries): functions reachable only through tables (pixel
    converters, behaviour handlers). Found because converters "are only reached through tables, so
    Ghidra had no functions for them" (a4ae8b0); Barabbas handlers likewise (0363b4f).
  - `ApplyNames.java` + `names.tsv` (1,609 lines; columns addr, name, module, confidence high/med/low, description).
  - `DumpAllNamed.java` -> `re/all.c` (whole decompile, named, for grep), `DumpMeta.java` -> `re/meta.tsv`
    (addr, name, size, callers, callees, imports, strings), `re/funcs.txt`.
  - `apply-names.sh` runs all of the above idempotently.
  - `inventory.py`: per-module size table for `docs/re/inventory.md`.
- **Cross-binary name transfer** (`tools/ghidra/match_mac.py`), Mac GCC build -> Windows MSVC build:
  1. Strings referenced by exactly one function in each program (source paths reduced to base name:
     `F:\BungieDevelopment\BungieSource\...` vs `/tmp/OniSource...`): 397 pairs.
  2. Call graph: the only unmatched callee/caller left on both sides of a matched pair.
  3. Layout: between consecutive in-order matches (longest increasing run), equal-size gaps matched in
     order if sizes within 4x (linkers keep object-file order).
  4. Neighbourhood: matched callers/callees similarity >= 0.6, mutual best, clear margin.
  Iterate 2-4 to fixpoint. `--validate=<share>` hides part of the string matches and measures precision:
  neighbourhood >= 0.75 right 96-97%, callee 89%, neighbourhood < 0.75 86%, caller 79%, layout 72%.
  Only string + neighbourhood >= 0.75 were accepted: **1,055 names, 45% of code bytes**. ~600 more in
  `re/mac-matches.tsv` awaiting review. A wrong 0.67 match (a list insert named
  `ONrCharacter_SetWeaponVarient`) justified the threshold.
- Bungie naming convention used throughout: `XXr` public, `XXi` internal, `XX` module.
- `re/` holds decompiler dumps, `binkw32.dll`, `onisetup.exe/.c`, `vise32ex.*`, per-module subdirs
  (`ak`, `bink`, `m3`, `on`, `sl`, `tm`, `tr`, `vis`); all git-ignored.
- Each format/system finding goes into a `docs/` page with exact offsets and addresses, each field marked
  **confirmed** vs **inferred**.

### 3.2 Agent instructions (AGENTS.md patterns that look effective)

- **Single-sentence product definition**: "Fidelity is the product. Reproduce the original's behaviour,
  including its quirks and bugs. If something looks wrong, check the disassembly; if the original does
  it, keep it and add a comment. Only fix deviations *of the port* from the original."
- **Five hard rules**: (1) never commit original data or derived data (explicit gitignore list);
  (2) no tables/strings/geometry from the exe in source (load at run time, `src/exe.c`, size+CRC);
  (3) cite the original address in every ported function, names consistent with `names.tsv`;
  (4) never paste decompiler output, write in own words; (5) community knowledge may inform, no code copied.
- **State section kept current** in AGENTS.md: a dense map of every source file -> subsystem -> its
  docs page, plus every debug `--param`. Agents can locate the code for any subsystem without searching.
- **Ordered port plan with a check per step** (`docs/re/port-plan.md`): step 0 extractor, 1 gasm
  skeleton, 2 instance files, 3 decoders, 4 renderer, 5 front end, 6 character, 7 BSL, 8 combat, 9 AI,
  10 audio/movies, 11 release. "Each step ends with something that can be checked against the original."
- **Exact verification oracles in AGENTS.md**: e.g. `files=95 bytes=641025194 hash=9b4bdbfa`,
  `all: hash=66db30fb`; env vars `OPENONI_VISE_SUMMARY`, `OPENONI_DAT_SUMMARY` make tests assert them.
- **"Copy siblings' proven pieces rather than reinventing"** (openrf, opencmr2).
- **Unattended-run rules**: always `--headless`, never open a window, never `screencapture`; use
  `--param drawfrom=N` for long screenshot runs (memory grew to 15 GB over level 1's route otherwise).
- **"Don't unwind loops into per-frame states"**: keep the original's blocking loops.
- **"All data access goes through `src/vfs.h`: no fopen/opendir in the core."**
- **Stand-ins marked in code**; they go as the originals are ported.
- Commit style: imperative subject, body explaining why. Commit bodies consistently name the original
  function+address, what the port did wrong before, and which level now plays through. This makes the
  git log an excellent pitfall log.

### 3.3 Build system

- CMake, two configurations:
  - Native (`cmake -S . -B build`): tools (`openoni-extract`) and headless tests only.
  - gasm (`-DOPENONI_PLATFORM=gasm`, toolchain `.deps/gasm-c-sdk/cmake/gasm-toolchain.cmake`,
    `WASI_SDK_PREFIX`, `GASM_WASM_OPT` Binaryen). `tools/fetch-gasm-sdk.sh` puts wasi-sdk, gasm C SDK,
    Binaryen into `.deps/`; `tools/fetch-gasm-runner.sh macos-universal` fetches `gasm-run`.
  - Produces **two modules**: `openoni.wasm` (Asyncify, for runners without stack switching) and
    `openoni-run.wasm` (stack switching).
- Renderer (`src/render/`) built for gasm only.

### 3.4 Tests

- 44 C tests in `tests/`, registered via a CMake `foreach` + `add_test`, run from repo root with
  `ctest --test-dir build --output-on-failure`.
- Data-dependent: read `OPENONI_DATA=<dir|image>` (default `./game`), `OPENONI_CD=<dir|image>`; **skip
  (exit 0, print "skipped") without data**, so CI (no game data ever) still passes.
- Two styles:
  - **Decoder parity tests**: C decoder vs Python reference reader over *every* asset of the CD, equal
    hash lines (textures 8,918 `69e02682`; geometries 37,862 `8d974ee1`; environments 14 / 450,921 quads
    `1f7ad149`; animations 8,604 `a992f7fd` / 393,903 frames; object animations 1,067 `1f2bffdc`; fonts
    `85c7502f`; sounds 7,386 `97eb43b7`; instances 155,232 / 358,404 links `66db30fb`).
  - **Behaviour tests** staged on real levels: `character_test` (jump ~10.6 up, 37 ticks airborne),
    `physics_test` (stand, run into wall, drop 40), `door_test` (walk through door 18, unlock door 11),
    `console_test`, `chars_test` (training combat demo), `boss_test` (super ninja on level 12),
    `cheat_test`, `sl_test` (compiles all 14 script folders and runs warehouse `main`).
- **Whole-game regression**: scripted routes (`--param route=...`) drive Konoko through each level
  headless; the check is "all 14 levels still play to their end" (stated in many commit bodies, e.g.
  207fe57, 04b70e0). The route strings themselves are not committed (they live in sessions/local).
- **Cross-runner determinism**: `openoni.wasm`, `openoni-run.wasm`, and `openoni.wasm
  --no-stack-switching` must give the same hash line and screenshot; `node ../gasm/runners/web/headless.mjs`
  the same hash line; `tools/web-play-test.mjs` checks the browser page (headless Chrome via CDP) against
  gasm-run.

### 3.5 CI (`.github/workflows/`)

- `ci.yml`: native build + ctest on ubuntu-latest and macos-latest; `openoni-extract` prints usage;
  gasm job on macOS (ANGLE on Metal: "the headless run there is the one checked locally") builds both
  modules and asserts each **refuses to start without the game** (`OpenOni: game data not found`);
  uploads wasm artifacts; site job builds VitePress with pnpm 10 / Node 22.
- `pages.yml`: builds `openoni.wasm`, copies it into the play page (`docs/scripts/copy-wasm.sh`, checks
  wasm magic `0061736d`), vendors gasm + csfs runtime from pinned npm packages
  (`docs/scripts/vendor-web.sh`), builds site, asserts `dist/play/openoni.wasm`,
  `dist/play/vendor/gasm/gasm-worker.js`, `dist/CNAME`, deploys to GitHub Pages. `fetch-depth: 0` for
  `lastUpdated`.

### 3.6 Docs site

- VitePress, `cleanUrls`, dark by default, `lastUpdated`, sitemap.
- **`srcExclude: ["README.md", "AGENTS.md", "re/**"]`**: the RE notes with addresses stay in the repo
  but are not published; public pages are Guide (what, game data, status, theory of operation) and
  Formats (15 pages: vise, dat, txmp, m3gm, akev, tram, oncc, objc, oban, onwc, crsa, sndd, osbd, font, text).
- `ignoreDeadLinks: [/^\/play\//]`, nav "Play" with `target: "_self"` (full page load, not a SPA route).
- "Built for gasm" badge (light/dark variants).
- `docs/guide/theory.md`: a "theory of operation" essay on how Oni works (modules, fixed tick, data as
  templates, AI layering, scripts, saving, lessons for building such a game). Useful pattern for a
  public-facing explainer distinct from the RE notes.

### 3.7 Browser player (`docs/public/play/`)

- `openoni.wasm` in **gasm Worker mode**; canvas via `transferControlToOffscreen`; GL through `gasm:gl`
  (GLES 3 / WebGL 2); page keeps keyboard, mouse (pointer lock), audio.
- Data: user's own installed folder (`<input webkitdirectory>`), **imported into OPFS** (read via
  `FileSystemSyncAccessHandle`) or read in place (`FileReaderSync`), or a **CD image** (ISO) read through
  the VISE layer (e834115). Storage via vendored `csfs` (core/fsa/opfs).
- Query params: `hashframes=N` (virtual time, prints the same `frames=... video_fnv32=... audio_fnv32=...`
  line as gasm-run, `globalThis.__openoniResult`), `batch=N`, `input=SCRIPT` (gasm-run `--input` syntax),
  `size=WxH` (hash runs default 1280x720 = gasm-run headless drawable), `autoplay`; any other param
  passed to the game.
- Vendored runtime never edited: bump pins in `docs/package.json`.

---

## 4. Technical knowledge that generalizes

### 4.1 Platform mapping onto gasm (`src/platform.h`, `src/platform_gasm.c`)

| Original | Port |
|---|---|
| `ONiMain` with blocking loops (front end, game, nested modal dialogs) | Kept: `gasm_main` runs `app_main` once; every loop ends its frame in `plat_wait_frame()` -> `gasm_wait_frame()` (stack switching or Asyncify). Chosen over OpenRF's state-machine unwinding as "closer to the original and cheaper to port" (ScummVM/SDL `main()` run this way) |
| OpenGL 1.1 fixed function | One GLES 3 shader in `src/render/gl_dev.c`: textured, vertex-coloured triangles, alpha test (discard), blending, depth, linear fog on `gl_FragCoord.z*2-1`. Only the GL back end calls GL |
| DirectInput / Win32 mouse | Raw keyboard delivered as **DIK scan codes** (set-1, 0x80 for extended; Esc 0x01, Enter 0x1c, keypad Enter 0x9c, Up 0xc8), pointer locked for mouselook (dx, dy), pads mapped on top |
| DirectSound + mixer thread | One mixer, audio pushed each frame (`gasm_audio_push`); DirectSound calls kept as `ds_*` functions in DirectSound units so volume/pan curves match (`src/sound.c` header) |
| Input event-queue thread | Input latched once per frame; original critical sections become no-ops |
| `QueryPerformanceCounter`/`timeGetTime` | **Frame clock** `plat_time_us()` advancing by the frame period -> deterministic headless runs |
| Files, memory-mapped | `src/vfs.h` only: host dir (case-insensitive, `/` or `\`), ISO 9660, VISE layer; positional reads via `gasm_asset_read_at64` |
| `persist.dat`, `key_config.txt` | `gasm:storage` via `plat_load_user_file`/`plat_save_user_file`; defaults written on first run like the original |
| Command line | `--param name=value` (gasm) / URL query (web) |
| Catch-up frames | `plat_frame_shown()` false for frames never shown; the game skips drawing them |

### 4.2 File layer and CD handling

- **Installer VISE archive** (`docs/formats/vise.md`): segments start with `"ESIV"` + archive id
  `0x3a07bc24` + segment number + u32; setup exe ends with `"ESIV"` + offset of its PE overlay (segment 1).
  Item list frames found by scanning for **32 x 0xff + 0x00 + length + printable name** (bodies differ by
  type). File body has sizes, segment, offset, FILETIMEs, CRC-32 at +0x49 (unaligned).
- **Compression = plain raw deflate stored in byte-swapped 16-bit words**: swap every byte pair (pad odd
  length), then zlib raw inflate. Evidence: bit reader swaps word bytes, distance table ends at 24577,
  length 258, zlib debug strings in compressor. Only dynamic blocks on the CD.
- `src/vfs_vise.c` layers the archive over a mounted ISO/folder and **inflates each file on open**, so
  the game plays straight from the ISO (`gasm-run --asset cd=<image>`, `OPENONI_DATA=<image>`, play page
  disc image). Hashes from the image equal the installed folder's.
- Extraction takes ~10 s, every file CRC-checked. Same reader exists as standalone Go `visextract`.
- Case-insensitive paths with either separator (Windows game, POSIX hosts).

### 4.3 Executable as data source (`src/exe.c`)

- Minimal PE reader maps `Oni.exe` and `binkw32.dll`; refuses wrong size/CRC with a clear message.
- Tables read at run time from the user's exe: template table (114 templates x 0x30 B, count at
  0x558cf0), pixel type table (0x529e78), action/key-name tables (0x52db18, 0x52e220), DIK->LI code map
  (0x5292b8), visibility jitters (0x534cd0), animation-type names (0x54d7c0), default `key_config.txt`
  lines, cheat code table, Bink DLL's Huffman tables/scan order/quantizers/audio bands.
- **Reading instruction operands as data**: layout pointers are not in the template table; startup code
  at 0x51d1c0 stores them with one `mov dword [mem], imm32` per template, and the port reads those
  immediates. Same trick for footstep impact pairs "decoded from 0x4f04f0's own instructions at run time"
  (f71539a).
- `exe_test` checks startup strings by length + CRC so the text itself stays out of the source.

### 4.4 Instance files (.dat/.raw, `TM`)

- Header 0x40, version `0x56523331` ("13RV"), fixed record sizes (descriptor 0x14, template 0x10, name 8);
  descriptors, sorted name directory (binary search), template entries (checksum must match exe's).
- Layouts are **bytecode in the exe** (opcodes 1-4 field of 8/4/2/1 B, 5 fixed array, 6 end, 7 variable
  array with count kind, 8 end, 9 link with tag). The port walks the exe's own layout code.
- Links resolved by name across loaded files, first loaded first (level 0's copy wins); placeholders =
  named instances with no data.
- **64-bit safety**: link fields hold 32-bit handles (`slot << 24 | index`, read via `tm_link()`) instead
  of pointers, so the native 64-bit test build behaves identically; unloading leaves the slot empty
  instead of compacting.

### 4.5 Asset formats decoded (all in `docs/formats/`)

- **TXMP textures**: types ARGB4444, RGB555, ARGB1555, I8, 1-bit, A8, A4I4, ARGB8888, xRGB8888, DXT1, etc.
  Quirks kept: RGB555 widened by shift only (white = 248), ARGB4444 nibble x17, ARGB1555 `c<<3|c>>2`,
  **DXT1 end points shift-only, thirds round red/blue but not green, 3-colour mode's 4th colour opaque
  black** (not transparent as standard DXT1). Mip chain packed without padding; textures 32-byte aligned
  in .raw. TXMB = tiled 640x480 splash (3x2 tiles).
- **M3GM geometry**: triangle strips walked as the draw does; no winding flip because the draw culls by
  face normals.
- **AKEV environment**: quads ("gunk") with texture, **baked vertex shades** (no run-time lighting),
  flags (glass, transparent, ghost, stairs, no-collision, two-sided 0x2a0), octree, room graph (BNVs).
- **TRAM animations**: rotation streams (incl. byte sine tables in exe), root motion, heights; Euler ->
  quaternion with odd conventions (y uses 2pi minus half angle).
- **ONCC/TRAC/body**: 19-part body hierarchy; animation collection maps (state, type, variant) to
  weighted animations.
- **SNDD sounds**: all 7,386 are MS ADPCM (mono/stereo 22,050, mono 44,100). Port decodes MS ADPCM itself
  per published format. **Rounding: predictor shift rounds toward -inf** (ffmpeg's /256 rounds toward 0
  and drifts by tens); matches macOS `afconvert` on full blocks. **Short last block is decoded** because
  the stored durations count it (`afconvert` drops it).
- **OSBD sound objects**: groups (weighted permutations, volume/pitch ranges), ambients (in, two loop
  bases, out, random details; music and dialog are ambients), impulses.
- **BIK 'i' Bink video** ported from `binkw32.dll`: 9 Huffman bundles/plane, 10 block types, AAN IDCT
  (**output stored as byte without clamping: wraps, kept**), RDFT audio (port uses Ooura `rdft` radix-2;
  low bits may differ), YUV->RGB via `_YUV_init` table path (luma clamped 16..235 x 0x950a >> 15; chroma
  factors 0xcc4b, 0x3225, 0x680f, 0x10235). 512x384 at 15 fps. Intro: no key ends it; outro: key/button
  ends it and **the last frame is never shown** (loop tests last frame before `BinkWait`).
- **Fonts** (TSFF/TSFT/TSGA), **text** (SUBT, IGSt, IGSA, IGPG, IGPA, IGHH, StNA), **OBJC** level objects,
  **OBAN** object animations, **ONWC** weapons, **CRSA** corpses.
- BSL scripts are plain text (`IGMD/<level>/*.bsl`).

### 4.6 Rendering

- Original draws through a **software geometry engine** ("motoko software") that transforms and lights
  vertices, then hands GL already-projected points (`glVertex3f(x, y, -z)`); port reproduces that
  pipeline on one GLES 3 shader.
- Environment: marked quads as one mesh, sorted by texture, solid then transparent. Unit 0 `GL_MODULATE`
  texel x shade, unscaled; no reflection maps on environment.
- Characters/objects lit: ambient + up to 4 directional lights; defaults (-0.5,-1,-0.5) 0.7 and
  (0.5,0.5,1) 0.3; ambient 0.85/0.65/0.55 for 0/1/2 lights by graphics quality. **Setter quirk kept**:
  light length computed from x, y, x (z never read) and colour *multiplied* by that length.
- Reflection maps: two passes (mode 7 reflection opaque, mode 8 texture blended `GL_ONE, GL_SRC_ALPHA`):
  texture x light + reflection x light x texture alpha. Sphere-map coords from unnormalised view vector.
- **Fog**: `GL_LINEAR` on screen depth, default 0.25 grey from 0.975 to 1 (n=2, f=5000: ~80 units);
  scripts change it over frames (original's slip: end moves by start's step, kept). Off for sky, 2D,
  additive textures (TXMP flag 0x400). Particles fade alpha by `gl_calculate_fog_factor`.
- **Visibility = ray casting**, not frustum culling: 16-20 rays a side (by quality), jittered pattern
  (25 jitters from exe), cast through octree, marking leaves/quads, stopping at first opaque quad; marks
  aged every 12th pass; nothing recast if camera still > 25 frames; sky drawn while any ray escaped in last
  25 frames. Port keeps the original's pop-in. First 0x2000 marked quads drawn.
- Gamma: original's power ramp applied in a pass before present (`plat_present_hook`); 0.5 = identity.
- Graphics quality drives LOD (triangle budget), mip sharpness/filtering, shadows, particle detail,
  ray count, light count.
- Decals cut to quads and folded over edges (adjacency walk), ring buffer of dynamic decals; shadows are
  decals lerped by height.
- Lens flares: separate pass after scene, no depth test, occlusion by software ray through octree.
- `gasm:gl` video hash covers **uploads only** (buffers, textures, uniforms), not clears/draws: a
  clears-only screen hashes empty `811c9dc5`, so compare screenshots (md5) until something is uploaded.
- `gl_dev_set_dry`: frames before `drawfrom` still run the display's logic (some game state is updated
  during drawing, e.g. contrails' broken links), so a run plays identically with or without drawing.

### 4.7 Timing, randomness, determinism

- Fixed **60 ticks/s**; each loop pass computes elapsed ticks (`iComputeDeltaTicks`) and advances that
  many; draw shows the state after the last tick.
- Two LCG streams (x 0x19660d + 0x3c6ef35f): `UUrRandom` (gameplay) and `UUrLocalRandom` (effects).
  Nothing else random -> same input, same run. This underpins whole-level unattended regression.
- **Consequence**: any newly ported code that draws random numbers shifts later behaviour (e.g. level
  particles made the training AI fight last longer, a1dd567; characters' random size shifted
  `chars_test`, 256b555; sound permutations changed routes, 97afefb). Routes must be re-tuned; the
  route language gained `M<message>,F` to resynchronise on script messages.
- x87 extended precision cannot be reproduced bit-exactly in wasm: the goal is the original's
  *behaviour*, but **every gasm runner must produce identical hashes**. Decoded TRAM rotations are not
  hashed; Python rounds to float where the exe stores, and dumps compared to 5 decimals.
- x87 specifics matter in places: physics uses x87 double-precision `acos` (cb6da2b); WM slider creation
  does x87 `0/0` = integer indefinite 0x80000000 and keeps the low half 0 (`docs/re/wm.md`).

### 4.8 Input

- 100 binding slots (LI code, action), `key_config.txt` parsed (`bind w to forward`), written with exe's
  default lines if absent; actions are bits of a 64-bit mask (forward 21, jump 27, punch 29, ...,
  fire3 40); mouse aim scale exactly 0.25. AI drives the same mask through its executor ("give the AI
  the player's interface").
- `lock_keys` script command narrows the allowed-keys mask (training lessons unlock keys one at a time;
  keys_walk never allowed in training).

### 4.9 Scripting (BSL)

- Lexer ports `SLiToken_Make` token types; port compiles to stack code whose **threads can stop anywhere**
  (sleep, blocking commands like `chr_wait_animation`, `playback_block` returning a sleep).
- Event-driven: trigger volumes, laser triggers, consoles' event lists, characters' die/defeated/hurt
  scripts through a deferred queue.

### 4.10 Saves and persistence

- `persist.dat` reproduced in the original's layout: 0x326a0-byte block; ten continues per level, 0x204
  B each; levels reached, place, pause-screen bits, options; written on each change through gasm storage.
- Save point stores little (number, health, place, facing, inventory, weapons); world not saved; load
  restarts the level and the scripts jump ahead by `save_point`, then `restore_game` restores the player.

### 4.11 UI

- Bungie's WM ported (windows, message queue, focus, capture, modal loops with level drawn behind,
  WMDD data-described dialogs, nine-part PSpc textures, text formatter with colour codes). Menus, pause
  screen, text consoles, Load Game list box, Options (check box, slider, popup, menu classes, WM timers).
- `--param keys=27,32,@546:250` taps keys/clicks into dialogs for unattended runs (desktop is 480 tall).

---

## 5. Lessons learned / pitfalls (evidence-based)

### 5.1 Bugs that cost time (from commit bodies)

| Commit | Symptom | Root cause | Generalisation |
|---|---|---|---|
| e038686 | Projectiles never moved | Particle classes always created first particle at the activation list head; original (0x455e40) puts **decorative classes at the tail** and the gameplay update stops at the first decorative one | List order can be semantic; port insertion order exactly |
| 3ac513f | Shooting range's 18th target ran both `targets_are_gone` and `targets_are_not_gone`, rifle respawned | BSL function frame sized from locals live after top-level statements; `var` inside an `if` block got no slot and a callee overwrote it | Script VM scoping bugs surface only deep in real content; run the actual level scripts end to end |
| 6bb903a | Warehouse outro never started; level 1 couldn't finish | `trigvolume_count` counted all characters incl. Konoko and the dead; original skips dead and applies team mask | Count/query helpers need the original's filters |
| 9e3bb32 | Konoko couldn't climb level 3's stairs | Two-sided quad facing tested from the feet instead of the sweep sphere's start 10 above (dot product at 0x4ec39d uses sphere at ESP+0x7c) | Read which variable the original actually uses; stack-offset details matter |
| dff3e5e | Stack overflow | Particle wall test passed a one-entry list to `akev_collide_point`, which fills a whole leaf's hits | Port callee contracts (buffer sizes) not just call shapes |
| 6d3430c | Knocked-down fighters lay forever | Combat never sent behaviour message 6 (daze/get-up) | Missing message plumbing manifests as frozen AI |
| 7205988 | Combo waited forever | Only 1 of 3 cases of `AI2rMelee_NotifyAnimation` ported | Port all branches of a dispatcher, even "unlikely" ones |
| 572f7b2 | Level 8's LSI conversation stuck on line 1 | `AI2rPath_GoToPoint` raises radius < 3 to 3; without it radius 0 never arrives, neutral circled | Small clamps in originals are load-bearing |
| 8250e08 | Guards turned in circles | Movement waypoints start at the second; first is the start cell | Off-by-one in path setup |
| 0400363, 0a82850 | Halted AIs kept walking | `AI2rPath_Halt` clears movement state; port only stopped the path | Stop/cancel functions usually reset more state than their name says |
| 04b70e0 | Every hurt made neutrals hostile | Missing stray-blow rule (half HP / no definite hostile in range) | |
| 05a68d8 | Unstoppable Konoko still knocked off catwalk | `InflictDamage` checks 0x4e6500 after damage, skipping knockdowns | |
| 6b1ed57 | Shots too inaccurate | Second inaccuracy angle applied always; original only for particles with an owner | |
| 7095611 | Wrong maneuver choice | Selector compares tried maneuver to next heaviest weight, port compared to its own | |
| cd069f1 | Level 1 stalled at first fight / LSI | Spawned bit 0x20 present in some files must be cleared on read (0x4bf290) | Loaders sanitize data; port the sanitizing |
| 0a67856 | Thrower against a wall dropped victim out of level | Victim was placed, not moved through physics (0x4e9330) | Teleporting instead of moving bypasses collision |
| 0a67856 | Creeping striker slid prone and stuck | Combat entry resets movement mode to alert level's | |
| 050962d | Muro couldn't leave his room | `chr_nocollision` must clear physics flags 0x44 (walls and floor) | |
| 2c0ef9d | Fog never drawn | Script fog values kept but no draw used them | Grep for "stored but never read" state |
| 2c0ef9d / lighting.md | "Environment darker than original" | Was an impression, not a measurement; every step of the colour path matches the exe | Never "fix" visuals without a measured capture of the original at same place/settings |
| bf24eef | Wrong handler names | 0x504e30 recorded as flash handler; it is fill (0x504f40 is flash) | Names.tsv errors propagate; correct them in the record |
| physics.md / 97afefb | Konoko held among level 11's console quads after "dog" cutscene | Of a two-sided quad's plane pair the original keeps only the plane facing the sphere's centre | Added `--param physlog=1` to log blocked moves |
| 702c573 | Browser hashes differed from gasm-run | Game draws only frames gasm reports shown; batch > 1 shows fewer frames | Hash runs in browser: batch=1 |
| 2393ef7 | WM menus behind siblings; client mouse messages missing buttons | Menus (flags 0x8000) go in front; buttons in p2 | |
| a6d494a | Potential OOB read | Direction or'd over 5 can be 7, past six facing factors; no profile makes it, port skips rather than read OOB | Keep quirks, but don't keep UB that would crash wasm |

### 5.2 Wrong assumptions corrected

- **"Read the ISO directly is a later nice-to-have"** (port plan step 0) became the default experience
  (e834115): inflating on open is cheap and removes a user step.
- **Mac build as authority**: explicitly rejected; names move only after a check. `d38d7a5`: the melee
  weighting's four switches were lost in the Mac decompile, so it was ported from Windows disassembly
  with the Mac build's *structure* only.
- **Developer console**: present in exe but v1.0 has no way to enable it (cheat id 11 table entry
  missing), so it is deliberately left out (1a4be79). Splash screen at 0x4cae10 is a shared empty `ret`
  in Windows release: nothing to port (e2a7804). Check whether a feature is reachable in the target
  version before porting it.
- Original **level-script bugs kept** (level 6: `console_deactivate` without id disables every console;
  route takes the other way) (86e9144).
- Cheats are used as test infrastructure: invincible/omnipotent/unstoppable are the game's own switches
  (28d22c0), so unattended runs don't add non-original code paths.

### 5.3 What worked well

- **Reference reader in Python + C port, equal hashes over every asset of the CD** before any rendering.
  Decoder correctness was settled in ~2 days for 155k instances and ~60k assets.
- **Plan steps each ending in a verifiable check** -> fast, visible progress (levels 1 to 19 each a
  commit "Level N plays through").
- **Route mini-language** in `app.c` (waits, runs, jumps, aims, fights, consoles, hunts, path planning
  through the rooms graph at run time `Wx,y,z`, cutscene wait `C`, message resync `M`, take-off points
  `U`) turns whole-level playthroughs into regression tests. Planning at run time (W) made routes robust
  to fight outcomes (df92ed2).
- **Trace params** (`trace=N`, `sltrace=1`, `ailog=1`, `physlog=1`) with frame numbers are the main
  debugging instruments.
- **Same module, multiple runners, same hash**: catches Asyncify/stack-switching/browser divergences.
- **Keeping blocking loops** on gasm_wait_frame avoided a large restructuring; nested modal dialogs
  (WM) work naturally.
- **Exe/DLL tables loaded at run time** keeps the repo clean legally and gives exact constants.

### 5.4 Risks/limits noted

- No captured reference from the original (Wine capture "kept outside the repo" still to do): visual
  fidelity is verified by reading the draw path, not pixels.
- Routes play with cheats; AI combat fidelity is not yet validated against real play.
- Browser memory: 1 GiB guest limit; load per level as original.
- `--screenshot` on long runs: runner memory grows by GB (15 GB on level 1 route) unless `drawfrom`.

---

## 6. Reusable checklists / procedures

### 6.1 Project bootstrap (from port-plan steps 0-1)

1. Identify the exact target binary: size + CRC-32; record in AGENTS.md and enforce in an `exe.c` loader
   with a human message for other builds.
2. Find out how the data is packaged on the original media (here: installer archive). Write an extractor
   (C in-tree + stdlib Python reference), with a `--summary` line (`files= bytes= hash=`) that both print.
   Prefer a file-layer backend that reads the media directly.
3. Look for a symbol-bearing sibling build (other platform, later patch, debug build). Import both with
   `analyzeHeadless`; run FillGaps; dump meta (strings, callers, callees); match by unique strings, then
   call graph, layout, neighbourhood; **validate with holdouts**, accept only high-precision methods;
   record in `names.tsv` with confidence + method.
4. Write `architecture.md` (platform APIs, start-up, loops, threads, data) and `inventory.md` (bytes per
   module) before porting. Size estimates come from bytes, not function counts.
5. Write AGENTS.md: product sentence (fidelity), hard rules (no data, no exe tables in source, cite
   addresses, no decompiler paste), data location env vars, RE commands, build/test commands with
   expected hashes, unattended-run rules, commit rules. Keep a "state" section mapping files to systems.
6. Skeleton: `platform.h` contract, gasm backend, `vfs.h` (case-insensitive, both separators), `exe.c`,
   two wasm modules (Asyncify + stack switching), CI that builds both and checks "refuses without data".

### 6.2 Porting a format

1. Find the loader/proc handler in the exe (template registration, `*_ProcHandler`).
2. Write `docs/formats/<x>.md`: offsets, sizes, flags, histograms of values on the CD, addresses,
   confirmed vs inferred.
3. Python reference reader (stdlib only) emitting one hash line per asset + per level + `all:`.
4. C decoder; test prints identical lines; env var to assert the `all` hash.
5. Watch for: odd bit widening, nonstandard DXT/ADPCM behaviour, last partial blocks, rounding
   direction, byte-swapped words, layout bytecode. Compare to an independent decoder (afconvert, ffmpeg)
   only to understand differences, not as authority.

### 6.3 Porting a function/system

1. Decompile + disasm; for switches lost in a decompile, read disassembly.
2. Port in own words, comment `/* Name 0xADDR */`; keep quirks with a comment; mark stand-ins.
3. Port all branches of dispatchers/notifications; check callee buffer contracts; port clamps.
4. Add or extend a staged test on a real level; then rerun all level routes.
5. If random draws changed, retune routes (and expect `chars_test`-style drift), never "fix" the RNG.
6. Commit body: original function+address, what the port did before, what now plays.

### 6.4 Verification matrix per change

- [ ] Native ctest (skips without data, passes in CI).
- [ ] `openoni.wasm`, `openoni-run.wasm`, `openoni.wasm --no-stack-switching`: same hash line, same
      screenshot md5 (remember gasm:gl hash = uploads only).
- [ ] Node headless runner: same hash line.
- [ ] Browser page via headless Chrome (`hashframes`, batch=1, 1280x720): same hash line; ISO case too.
- [ ] All level routes still reach their end.
- [ ] Long runs: `--headless`, `drawfrom=<N>` before `--screenshot`.

### 6.5 Browser player procedure

1. Build module, copy into `docs/public/play/` (check wasm magic), git-ignore it.
2. Vendor runtime from pinned npm packages via script; never edit copies.
3. Worker mode + OffscreenCanvas; OPFS import or in-place File reads; accept installed folder and disc
   image.
4. Expose `hashframes`/`input`/`size` params so the page is testable against the native runner.
5. Pages workflow asserts the wasm, worker and CNAME exist in `dist/`.

### 6.6 Debug instruments worth building early

- Launch params to start at a level/position/save point, run named script functions, cheat switches.
- Script trace with frame numbers; AI log once a second; physics blocked-move log; periodic trace of
  nearby characters/doors.
- Route autopilot with run-time path planning and resync on script messages.
- Fly-through viewer (`viewer=level`, `cam=`).
- Dry-run draw (`drawfrom`) so drawing can be skipped without changing game state.
