# OpenSheep (Sheep, 2000) — research notes

Source repo: `/Users/mjaskols/Projects/my/opensheep` (read-only). All citations are paths in that repo or commit hashes.

## 1. Facts

| Item | Value |
|---|---|
| Game | **Sheep** (puzzle/herding game: steer a flock to its pen by where you stand; the sheep keep away from you) |
| Studio / publisher | Mind's Eye Productions / Empire Interactive |
| Year | 2000 (the disc's build is linked 2001-01-08: multi-language release with a Polish install, `MiscPl/`) |
| Original tech | Win32 PE i386, MSVC C++ (classes `CInput`, draw manager, surface manager), **DirectDraw** 640x480 16-bit (rgb565/555, windowed or fullscreen), **DirectSound** (DuplicateSoundBuffer, 1/100 dB volumes), **DirectInput** (keyboard, mouse, joystick + force feedback), **Bink 1** movies via `binkw32.dll`, registry for settings, InstallShield + DirectX installer on the disc |
| Target binary | `Sheep.exe` from the CD root, 380,928 bytes, CRC-32 `b7bcd581`, image base `0x400000` (`src/exe.h`: `EXE_SIZE`, `EXE_CRC32`). Checked at start-up; any other build is refused with a message naming size and CRC |
| Approach | **Function-by-function port from disassembly** (Ghidra decompile dump + capstone), "faithful, from-scratch": every ported function carries `/* 0x40aea0 */`; quirks and bugs kept. No emulator, no Wine. Formats were first decoded with Python tools, then readers written in C |
| Language | C11 (portable core) + one gasm backend file (`src/platform_gasm.c`, the only includer of `gasm.h`). Browser player in plain JS modules. Site in VitePress/Vue |
| LOC | ~23.5k lines C in `src/` (largest: `sheep.c` 1794, `lv6.c` 1404, `player.c` 1369, `moves.c` 1334, `bink.c` 1190, `bonus.c` 1109); ~1.3k lines tools+tests; ~1k lines browser player JS |
| Timeline | 76 commits, **2026-11-01 13:31 → 2026-11-02 18:39** (~29 h wall clock), all carrying the same `Claude-Session:` trailer — the whole port was done in one long agent session |
| Status | "Port is complete": front end, all 35 levels (6 worlds x 4 + bonus game each, final level 7.1, four training levels 9.1–9.4), flock, 4 shepherds, 4 breeds, power-ups, results, high scores, saves, credits, attract demos, Bink, sound/music, mouse/keyboard/pads, developer debug keys. Not yet: full play-through, side-by-side comparison with original, 12 levels outside regression, first release tag (`PLAN.md`) |
| Site | https://opensheep.emdzej.pl (`docs/public/CNAME`) |
| GitHub | `git@github.com:emdzej/opensheep.git` → https://github.com/emdzej/opensheep |
| Browser play | https://opensheep.emdzej.pl/play/ (static app in `docs/public/play/`) |
| Releases | None tagged yet (`git tag` empty). `release.yml` on plain semver tag (`0.1.0`, no `v`) builds `opensheep-<ver>.wasm` + bundles: `opensheep-gasm-<ver>-macos-universal.zip` (`Sheep (gasm).app`, ad-hoc signed), `-linux-x86_64/arm64.tar.gz`, `-windows-x86_64.zip`, each with `.sha256` |
| Runtime | gasm 0.16.0 (`GASM_VERSION` single source of truth in `tools/fetch-gasm-sdk.sh`, mirrored by `@emdzej/gasm-host` 0.16.0 in `docs/package.json`), wasi-sdk 34 |
| Modern additions | Very few by design (fidelity is the product): runs on macOS/Linux/Windows/browser; launch params `level=W.L`, `ini=...` (a synthetic `Sheep.ini` — the retail disc has none), `view=1` level viewer, `trace=1`; browser upscaling filters (`sharp|nearest|xbr|fsr|crt`, integer scale) from gasm's presenter; saves export/import as zip; CD import into OPFS. No widescreen/hi-res: native 640x480 rgb565 |
| User must supply | Own **Sheep CD for Windows** (~490 MB needed of 502 MiB disc) as disc, folder copy, `.iso` or raw MODE1/2352 `.bin` (not the `.cue`). Uses `Sheep.exe` (tables), `binkw32.dll` (codec tables), `main.xp`, `Sound.xp`, `world00..09.xp`, `Data/` (Biks, music). GOG/other versions not supported (CRC check) |
| License | GPL-3.0; Bink decoder follows FFmpeg (LGPL 2.1+) as reference |

## 2. Screenshots (`docs/public/screenshots/`, all 640x480 progressive JPEG, 1.5 MB total)

Taken with headless `gasm-run --screenshot`, saved as JPEG (AGENTS.md "The site"). Referenced from `docs/gallery.md` (all) and `docs/index.md` (farm, castle, space, city, herders, dodgems). `farm.jpg` is also the `og:image`.

| File | Shows |
|---|---|
| `menu.jpg` | The main menu (front end over the menu level) |
| `herders.jpg` | Choosing a herder: Bo Peep, Adam Halfpint, Motley or Shep |
| `world-intro.jpg` | A frame of a world's Bink intro movie (own decoder) |
| `level-select.jpg` | Polygon Farm's levels: Polygon Fields, Barn Yards, Barn Dance, Road and Track |
| `farm.jpg` | World 1 farmyard level, flock among fences |
| `pause.jpg` | The pause menu over a level |
| `castle.jpg` | World 2 castle level with tower and catapult |
| `sack-race.jpg` | World 2 bonus game (sack race) |
| `space.jpg` | World 3 level on a circuit board in space |
| `space-asteroids.jpg` | World 3 level by asteroids and a black hole |
| `pink.jpg` | World 4: flock on a red floor next to a pink wall |
| `desert.jpg` | World 5 desert level, rope bridges over a chasm |
| `race-cars.jpg` | World 5 bonus game: kart race |
| `city.jpg` | World 6 city street at night, burning car |
| `dodgems.jpg` | World 6 bonus game: dodgems |
| `final.jpg` | World 7 final level, pillars and pens |
| `training.jpg` | Training level on an army camp |

Hard rule: screenshots (frames of the running game) are the only original-derived content allowed in git — no extracted sprites/sounds/movies (AGENTS.md rule 1).

## 3. Workflow & tooling

### Reverse engineering
- **Ghidra headless via CLI** (`ghidra script run ... --project sheep --program sheep_game.exe`), no MCP referenced in-repo.
  - `tools/ghidra/names.txt` (292 lines): `<hex addr> <name>` with `#` section comments; optional third column `fn` = disassemble + create function at an address only reached via tables (function pointers in level descriptors).
  - `tools/ghidra/ApplyNames.java` applies names (functions renamed, other addresses labelled). `tools/ghidra/DumpAllNamed.java` decompiles every function into one file `re/all.c` (~57k lines, `// ==== <name> @ <addr>` separators).
  - `tools/ghidra/apply.sh` = rename + re-dump in one step, prints function count.
- `tools/fn.sh <addr>`: awk out one function from `re/all.c` — cheap, greppable decompiler access for agents without a live Ghidra.
- `tools/fnsummary.py` → `re/summary.txt`: one line per function: address, name, line count, strings referenced, callees. A map for triage (1024 functions).
- `tools/dis.py <exe> <va> [n]`: capstone x86-32 disassembler over the PE sections. Used to check FP compare semantics (`fcom`/`test ah`) the decompiler hides.
- Format decoders in Python, first readers then inspection aids: `xp.py` (archives), `rnc.py` (RNC ProPack m2), `spr.py`, `blo.py`; `out/survey.txt`, `out/*.dir.txt` are archive surveys (git-ignored).
- Native C tools on the same core: `tools/overview.c` (render a whole level after N ticks to PPM, scaled), `tools/bik.c` (decode all frames of a movie, dump one frame, measure audio discontinuities at transform-block seams).
- `notes/architecture.md` (address map, main loop, app state machine, level descriptor field offsets, object arrays, sorted renderer, "where it lives in the port" table) and `notes/formats.md` (every file the game reads + which `src/` file reads it). Internal; moved off the public site in `e9b3ff1`.

### Agent instructions (AGENTS.md patterns worth copying)
- **"Fidelity is the product."** Reproduce quirks and bugs; if something looks wrong check the disassembly; if the original does it, keep it and comment. Only fix deviations *of the port*. Real UB (reads past arrays, uninitialised stack) is guarded with a comment describing what the original does.
- **Hard rules**, numbered: (1) never commit original data or derivatives (`cd/`, `re/`, `out/`, `sheep_game.exe`, ISO git-ignored); (2) **no tables copied from the executable** — read at run time via `exe_u8/u16/u32/s16/s32/f32/f64`, `exe_str`, `exe_wtext`; same for `binkw32.dll`'s tables; (3) cite the original address on every ported function and global; (4) don't paste decompiler output — write in your own words.
- **Layout table** mapping paths → responsibilities, including which file is the only one allowed to include `gasm.h`.
- **"Before claiming a change works"** block: exact commands (`play_test` prints "ok"; `regress.sh | diff - tests/hashes.txt && echo SAME`). Hash changes must be explained and re-baselined in the same commit, checked with screenshots.
- **Headless run recipe** with concrete `--input` syntax (`FROM-TO:KEY(Code)`, `MOVE(dx,dy)`, `PTR(x,y,L+R)`, `GP0(A0=1)`), `--screenshot`, `--storage-dir`; "Never open a runner window in unattended runs."
- **Traps** section — terse, high-value gotchas (see §5).
- Status paragraph telling the agent what phase it is in ("mostly fixing deviations found by verification").
- Release: "Ask before tagging or pushing."

### Build system
- CMake ≥3.24, sources globbed (`file(GLOB CORE_SRC src/*.c)`; re-run configure after adding files). Two configurations:
  - native (`build/`): static `opensheep_core` + host pieces (`vfs_host.c`, `storage_file.c`, `input_none.c`) → `play_test`, `xp_test`, `overview`, `bik`. "The whole core compiles natively too (no platform dependency can creep in)."
  - gasm (`build-gasm/`): `include(Gasm)` + `gasm_add_game(opensheep ...)` from the gasm C SDK toolchain; `-O2`, `-Wl,-z,stack-size=1048576`, `--strip-debug`.
- Warnings: `-Wall -Wextra -Wno-unused-parameter`, both builds must be warning-free; CI wasm job uses `-Werror`.
- `tools/fetch-gasm-sdk.sh` (wasi-sdk + gasm C SDK into `.deps/`), `tools/fetch-gasm-runner.sh <platform>` (released `gasm-run`, prints its folder).

### CI (`.github/workflows/`)
- `ci.yml`: native build on macOS + Ubuntu, `python3 -m py_compile tools/*.py`, wasm build with `-Werror`, upload artifact. Tests are *compiled only* — data isn't redistributable.
- `release.yml`: tag `[0-9]+.[0-9]+.[0-9]+` or `workflow_dispatch` snapshot; wasm job, then per-OS bundle jobs (macOS runner for `iconutil`/`codesign`), each smoke-tested on its own OS (`tools/smoke-gasm-bundle.sh`), SHA-256 files, GitHub Release.
- `pages.yml`: deploy site from `main`.
- Packaging (`tools/package-gasm.sh`): module + released `gasm-run` + per-OS launcher (`tools/gasm-bundle/`: `launch-macos.sh` (bash 3.2-safe, remembers CD in `~/Library/Application Support/OpenSheep/cd-location`, AppleScript dialog, logs to `~/Library/Logs/OpenSheep/gasm.log`, Option-at-launch to re-pick, `OPENSHEEP_CD` / `--dry-run` test hooks), `opensheep.sh` (+ `--install-desktop`), `OpenSheep.cmd`/`opensheep.ps1`, `.desktop`). Generated README per platform. No AOT `.cwasm` because `gasm-run --compile` only targets the host.
- Icon: `tools/icon/source.png` (generated) → `make-icons.py` (Pillow, run by hand, outputs committed) → favicon, `.icns`, Linux, Windows icons (`17e9e2a`).

### Docs site (VitePress, `docs/`)
- `config.ts`: `cleanUrls`, `lastUpdated`, local search, sitemap, `srcExclude: README.md, AGENTS.md`, `ignoreDeadLinks: [/^\/play\//]`; nav "Play" uses `target: "_self"` so `/play/` is a full page load of a static app, not a VitePress route. editLink to GitHub; footer with copyright disclaimer.
- Custom theme (`.vitepress/theme/index.ts`) extends DefaultTheme via layout slots:
  - **`Flock.vue`** in `home-hero-image`: canvas boids — 8 sheep with amble wobble, separation (<34 px), cohesion, flee-from-pointer (<120 px, quadratic), hedge margins, damping 0.94, speed cap 2.4 / 0.45; fixed-seed LCG (same flock every visit); drawn from CSS custom properties (`--flock-*`) re-read every 30 frames + MutationObserver on `<html class>` for dark mode; `prefers-reduced-motion` → simulate 300 steps then draw still; IntersectionObserver/`document.hidden` pause; DPR capped at 2. **No game assets** — thematic, legally clean hero.
  - **`Facts.vue`** in `home-hero-actions-after`: pill row "4 shepherds, 4 breeds · 23 levels hash-checked · 0 bytes of game data".
  - `pasture.css` "quiet pasture" palette: grass `#2f6b1f` accent, wool `#fbfaf6` background, HUD gold for small details; rounded heading font stack; full dark variant.
- Pages: home (hero + features + "Built for gasm" badge light/dark + screenshot grid), `gallery.md` (CSS grid of figures), `guide/` (index, install, game-data, playing, controls, developer, build).
- `docs/scripts/copy-wasm.sh` (checks `\0asm` magic, copies to `public/play/`), `docs/scripts/vendor-web.sh` (copies pinned `@emdzej/gasm-host` + `@emdzej/csfs-{core,fsa,opfs}` into `public/play/vendor/`, records version; output git-ignored).

### Browser player (`docs/public/play/`: `index.html`, `play.js` 466, `cd.js` 182, `saves.js` 148, `play.css`)
- gasm **Worker mode** (`GasmWorker.start({wasm, assets, params, storage:'opensheep', onLog, onAudio})`): worker runs the game and reads the CD on demand — from OPFS (`FileSystemSyncAccessHandle`) or straight from picked files (`FileReaderSync`). Module compiled once and shared.
- CD picking (`cd.js`): `showDirectoryPicker` (Chromium) or `<input webkitdirectory>` fallback; image via file input. `checkFolder` accepts the CD folder or one level above it, keeps only what's needed (`SHEEP.EXE`, `BINKW32.DLL`, `*.XP`, `DATA/`, `MISC*/`), verifies required files and exe size. `checkImage` parses ISO 9660 PVD at sector 16 for both 2048-byte cooked and 2352-byte raw (16-byte header) layouts, lists the root dir, detects `.cue`.
- OPFS import: streams each file through `TransformStream` for progress (no whole file in memory), writes a hidden marker `.opensheep-import.json` **last** (import without it = incomplete), `navigator.storage.persist()` with timeout (Firefox may never answer), quota error → friendly "~490 MB" message, detects "in use by another tab" (sync access handle lock).
- Main loop: rAF accumulator, fixed timestep at `worker.frameRate`, max 4 frames per batch (only last presented), one batch in flight (worker sets the pace), clamp 100 ms after tab switches, resync if >4 periods behind.
- Audio: inline AudioWorklet ring queue (prime at 60 ms, cap 200 ms, drop oldest), gasm `Resampler` to the context rate, started inside the click gesture, mute in localStorage.
- Display: gasm `GlPresenter` (WebGL 2) with filters + integer scale; Canvas2D fallback.
- Input: `BrowserInput` raw keys; preventDefault on everything except browser shortcuts (Cmd/Ctrl+key, F4–F12); **Esc tap → game, Esc held 1 s → stop** (mirrors gasm-run); cancel Alt keyup (Left Alt is the creep button; Firefox/Chrome steal focus on Alt release, `3b873ed`); pointer lock when game's input mode requests it (bit 4), requested immediately (M key gesture may still count) and on click, status line hint when refused (`442944f`).
- Saves (`saves.js`): gasm stores them in IndexedDB `gasm`/`kv` under `opensheep/` keys; export as zip of one file per key = same layout as desktop `<data dir>/gasm/opensheep` / `--storage-dir`, so saves move both ways; import only while no game runs (`4bd4efb`).
- Test hooks: `?hashframes=N` runs N frames on **virtual time** as fast as possible and prints the same `frames=... video_fnv32=... audio_fnv32=...` line as `gasm-run --headless` (`globalThis.__opensheepResult`), `__opensheepFramePng()`, `?autoplay`.
- `tools/web-play-test.mjs`: headless Chrome via CDP, `DOM.setFileInputFiles` into the page's own input, runs import → OPFS run → re-run (later visit) → folder without import → disc image; each must match native `gasm-run --headless` hashes. Serves `dist` with a Python ThreadingHTTPServer with `request_queue_size = 128` (default backlog 5 reset Chrome's parallel module fetches).

## 4. Technical knowledge that generalizes

### Original architecture (Sheep.exe)
- Address map by range (`notes/architecture.md`): level resources 0x401000, file layer/fonts/sound buffers 0x404000, level load + `App_Frame` state machine 0x406cc0–0x40aea0, HUD/menus/demos 0x40b000, player 0x415000, DirectSound 0x4189d0, flock AI 0x41a000, sprite blitters 0x41f000, INI/RNG/TGA 0x422000, per-level code 0x423000–0x435fff, DirectDraw 0x436000, WinMain/DirectInput 0x438220, `.xp` 0x43a7f0, MSVC CRT 0x43b500+ (`rand` 0x43ca87). Mapping the binary into ranges early makes subsystem ports parallelisable.
- `WinMain` loop: messages; **while a Bink movie is set, the movie is driven instead of App_Frame**; otherwise `App_Frame` then present. Port: `movie.c`; the frame that starts a movie skips its present (trap).
- App state machine `g_appState` 0x4a1ed0 + sub-state: 0 logos, 1 prologue, 2 intro, 3/4/8/9 load+level frame, 6 world map, 10 results, 11 credits, 12 hi-score entry, 13–17 end splashes (600 frames each).
- Levels: descriptor table at 0x44adec indexed `world*6 + level`; fields are **exe addresses of hooks** (init, tick, draw hooks, release, shepherd states ≥100, move routines, gates). Port maps each address → C function (`src/levels.c`, `src/moves.c`) and logs `... not ported` once per address for unknown ones — a run-time coverage detector (grep long headless logs for it).

### Timing / frame-rate fidelity
- Original level frame runs `elapsed_ms / 16` ticks (cap 6), then draws once. **Port: one 16 ms tick per presented frame at 62.5 Hz** (`gasm_set_frame_rate(125/2)`); virtual clock `virt_ms += 16` per present, so `plat_ticks_ms` is deterministic.
- Bink movies (25 fps) are paced against the 16 ms app ticks: show frame `shown` when `shown*1000*den/num <= ticks*16` (`src/movie.c`). Movie audio 22050 Hz is upsampled 2x to the 44100 mixer by linear interpolation.
- Hold-key semantics: gasm `key_state` for held + `key_events` for ordered presses (catches taps shorter than a frame); presses reported to the first `plat_poll` of a frame only (`src/platform_gasm.c`).

### Determinism and RNG
- MSVC `rand`: `state = state*0x343fd + 0x269ec3; return state>>16 & 0x7fff` (`src/rng.c`). Game RNG: 1024-entry table filled from `srand(0)` from index 1023 down, read with wrapping index; reset when a demo starts.
- Anything that calls `rand` at start-up shifts every level's stream: default high-score table generation draws 60 `rand`s (0x40ef50) → re-baseline (`c4d7012`); a saved `HiScore.tab` skips that, so **compare hashes with empty storage** (trap).
- Forgetting the table fill made every `rng_next()` 0 and collapsed all random placement to one spot (`b79cd8a`).
- Settings load only on the front-end path; `level=` harness keeps defaults, which the regression hashes depend on.

### Floating-point fidelity (x87/MSVC)
- Positions are `float` storage, expressions evaluated in double and rounded to float on store (as MSVC x87 code). `ftol()` mirrors `__ftol` 0x43ca04: truncation through 64-bit `fistp`, keep low 32 bits; out-of-range/NaN → 0 (0x8000000000000000 low bits) (`src/game.h`).
- **x87 compares with NaN**: `fcom; fnstsw; test ah,1` (or `0x41`) treat *unordered* as "below"/"below-or-equal". C's `<`/`<=` are false for NaN. Two real bugs: sheep speed 0/0 NaN → target should become 0; port kept NaN, speed ran to −11.4, sheep 237 px off-map (`38756d4`); `acos` of dot just past 1 → NaN → original snaps to path's first point, port's `<=` failed and `ftol(NaN)` gave x=0 (`6251cb9`). Rule: when porting an FP compare, read the flag test in the disassembly (`tools/dis.py`), not the decompiler's `<`.
- Negative left shift is UB in C: write as multiplication (`874afab`).

### Memory-layout-dependent original behaviour
- Out-of-bounds reads in the original hit whatever lies next in `.data`; in wasm, a different neighbour. `g_sin[t/2]` with negative t on a jump's landing tick: original read draw-list tail (≈0.0 as float); in wasm the integer sine table preceded it → NaN y → sheep vanished, counted lost, only in the browser build. Fix: `arc_sin()` returns 0 for negative index, documented (`874afab`, `src/game.h`). Same commit: `g_anim[-1]` after a pickup unmapped its id → spare record in front of the array. **Found by running under ASan + UBSan** natively.

### File formats (all in `notes/formats.md`)
- **`.xp` archive**: no header; footer (last 16 bytes) `u32 dir_off, u32 dir_len, "XCELZLIB"` (misnomer — data is RNC). Directory: listings `{u32 first_node, u32 count, name\0}` (root "ROOT"), nodes `{u32 data_off, node_size, stored, unpacked, next_node; u8 flags; u32 name_len; name\0}`, node_size = 25+len+1; dir node `stored==0xFFFFFFFF`; every listing starts with `..`; `flags&1` = RNC packed. Names upper-case 8.3-ish; tree starts at `DATA/`.
- **RNC ProPack method 2**: 18-byte BE header `"RNC\x02", u32 unpacked, u32 packed, u16 crc(unpacked), u16 crc(packed), u8 leeway, u8 chunks`; CRC-16 reflected 0xA001; MSB-first bitstream interleaved with literal bytes, raw literal runs of 12+4n. Verified on all 2,465 packed files by CRC.
- **SPR sprites**: 44-byte header (frame count, file size, flag, char[32] name padded with `0xCD` — MSVC debug-heap fill written straight to disk), table `{u32 off, u16 group(frames per direction), u16 index}`; frame `{u32 size, i32 w,h,hot_x,hot_y}` + per-row RLE: `0x80..0xff` skip 256−b, `0x01..0x3f` b pixels `{u8 alpha(1..4=25..100%), u16 rgb565}`, `0x40..0x7f` b−0x3f opaque rgb565, row end `0x00`. Variants: plain, clipped, mirrored, scaled (0x420320), sheared shadow (0x4197b0). Tinted sprites are copied into bank 399 and drawn from there (`3936e98`).
- **BLO level**: `"PC"`, version ≥13, 128x120 cells of 32x24 px (4096x2880 px level); strings, tile-anim frames, object placements, sprite strip paths, map u16 (`&0x3fff` tile, bits 14–15 mirror/flip), 32x24 rgb565 tiles, layer1 u16, layer2 u32 (low byte = cell type; types 1–2 not drawn by map pass), layer3, then 0x30000 + 0x9000 bytes of tables — checked on all 36 levels. Each distinct transformed tile gets its own surface appended, cell rewritten.
- Others: `.TGA`/`.TGB` 640x480 RLE TGA (24/32-bit), `.TIM` (hard time limit at +8 in 16 ms ticks; normal ×2, easy +18000), `.SLF` text sound list, `.POS` 56-byte animated object records, `.NPF` paths `{i16 flag, ticks, x, y}`, `.SPC` 256x18-byte special cells (older files 8/16 bytes), `.ANM` command lists (sprite/loop/sound/end; direction ≥9 drawn mirrored as 16−dir), `.REC` demos = four RLE streams `{u16 value, i16 ticks}` (buttons, x, y, magnitude), UTF-16LE `.TX?` texts with language-letter extensions, `.FNT` bitmap fonts (ranges + RLE coverage glyphs), tuning `.TXT` (variable names are exe strings), 640x480 24-bit BMPs, RIFF PCM WAVs, Bink 1 rev `i`.
- **HiScore.tab**: 0x800 bytes, 60 entries x 0x20, checksum byte; obfuscation: stored byte i = plain − `"KevDos Rules OK!"[(0x780−i) & 15]`.
- **Saves** `Saves\Game%02d.sav`: 0x44 bytes, version 5 → stored as storage keys (folder = the store).

### Reading tables from the user's exe at run time (`src/exe.c`)
- Load `Sheep.exe` from the mounted data, check size + CRC-32, map PE sections to their RVAs in a `SizeOfImage` buffer (.bss reads 0), then run registered `ExeLoader`s that fill C structs. Accessors by VA: `exe_u8..f64`, `exe_str`, `exe_wtext` (UTF-16→ASCII), `exe_mut` for the few tables the original modifies in place (menu items/text buffers). Even registry value names come from exe strings (`src/save.c` `reg_key`). Breed/shepherd names read via the exe's pointer tables (`c28a96e`).
- Same trick for codec tables: Bink scan order, patterns, Huffman trees, quant matrices, WMA critical frequencies read from the user's `binkw32.dll` at file offsets, validated (e.g. `perm64` checks the scan table is a permutation) (`src/bink.c`).
- Payoff: zero copyrighted bytes in the repo; legal posture "0 bytes of game data"; version pinning becomes a hard requirement.

### Rendering on gasm
- Core draws into a 640x480 rgb565 `Framebuffer` exactly like the DirectDraw surface (tiles re-packed to the surface's format at load; identity in rgb565). `plat_present` widens 5/6-bit channels by bit replication to RGBA and calls `gasm_video_present`. Scaling/filters are the host's job.
- Map: camera clamped to header bounds, fine scroll `x&31`, `y%24`; 20x20 (21 when scrolled) cells blitted with outer row/col clipped.
- Depth-sorted pass (0x40c1f0, `src/render.c`): 23 rows x 4 layers of buckets (cap 0x7e), bubble-sort by depth+height, per row draw sprites then that row's foreground cells (whole or through 32x24 per-type masks), then 2–3 extra rows below screen. Record kinds: shadow, sprite (scaled by an exe constant), text.

### Audio
- Software mixer in the core replicates DirectSound semantics: 256 voices, buffer flags (music/sfx/loop/once/stream/keep/track/fade), duplicates (DuplicateSoundBuffer) sharing PCM, streamed music read in 8192-frame chunks, volume in 1/100 dB: `ds = ftol(-(7000 − 7000·base·vol·group))`; distance attenuation 1 within 80 px, 0 beyond 400 px. Output 44100 Hz stereo float → `gasm_audio_push` per frame (`src/sound.c`).
- Quirk kept: a duplicate's base volume starts at 0 not 1.0 → every duplicate plays at −70 dB, so only the first instance of an overlapping sound is heard. But a *loaded music* sound must get its duplicate voice (walkman power-up never started FunkyRadio until `c1feb7c`).

### Input
- `gasm_input_mode(GASM_INPUT_KEYS_RAW)`: the game owns the keyboard (no keymap→pad), table maps `GASM_KEY_*` (W3C `KeyboardEvent.code` order) → USB HID `KEY_*` → DIK codes in `input.c`; configured run/creep/action keys read from the exe. Mouse via `gasm_pointer` (float x/y/dx/dy + buttons), capture = `POINTER_HIDDEN|POINTER_LOCKED`. Joystick = first connected `gasm_gamepad` slot, buttons >0.5, axes at value index 32/33. `_Static_assert` that core `PAD_*` bits equal gasm button bits.
- The original's ReadMe and input code are the authority for controls: "activate" = creep button; Space shouts; pad 4 holds map (`3e5d1f2`, docs were wrong first).

### Data / filesystem / case
- VFS backends, first match wins: asset `cd` (or `rom`) as ISO 9660 image streamed via `gasm_asset_read_at` (short reads looped; 32-bit offsets); else the disc's files as individual assets (`--asset-dir`), names tried as spelled then upper-cased, `\`→`/`, leading `./` stripped. `.cue` detected by sniffing text and rejected with a helpful message. Archive lookups normalise to upper case, `/`, collapse repeated separators — some sprite tables have a leading backslash the loader appends after its own; Windows ignores `\\`, the lookup didn't (`cc0b7db`).
- Registry + files next to the game → `gasm_storage_get/set` keys (settings as 4-byte LE values, save slots, `HiScore.tab`, `Sheep0001.bmp` screenshots, `Recording.rec`). Desktop: one file per key in `<data dir>/gasm/opensheep`.

### Video codec
- Own Bink 1 (`BIKi`, 640x480, 25 fps, one audio track) decoder structured after FFmpeg's `bink.c`/`binkaudio.c`/`binkdsp.c`/`bink_demux.c`; binkb and 'k' paths omitted (unused on the disc). `tools/bik.c` validates every frame decodes and measures audio seam jumps.

### Fonts / languages
- Language letter chosen from `"eefgiseepckjrh"` (registry `Language`); languages ≥8 draw panel texts in Ariel12 instead of TextYellow/TextBlue sprites (`c19597b`); fonts for languages past the 7th aren't on the disc. Keep original string bugs (Polish `NACIŚNIJ` stored as `NACINIJ`).

### Testing
- `tests/play_test.c`: native, against real data: load 1.1, assert flock size 17 (10 + 7 from markers), no movement with no input in 120 ticks, place a sheep on the ramp's special cells → penned, clock at limit−1 → level over → end state 4. White-box asserts on simulation state.
- `tests/xp_test.c`: archives decode.
- `tools/regress.sh`: 23 levels x 1500 frames via `gasm-run --param level=W.L --headless` → `video_fnv32` per level, diffed against `tests/hashes.txt`.
- Browser parity: `web-play-test.mjs` hashes must equal native runner's. Bundle smoke: `smoke-gasm-bundle.sh` (with CD: level 1.1 600 frames hash).

## 5. Lessons learned / pitfalls

1. **Decompiler `<` is not x87's compare.** NaN handling differs; read `fcom/fcomp + test ah, 1|0x41` in the disassembly. Two separate gameplay bugs (`38756d4`, `6251cb9`).
2. **OOB reads differ by memory layout.** The original's harmless overread became NaN in wasm only — a browser-only "sheep lost after a hurdle" bug. Run native builds under ASan/UBSan with scripted play to find these; guard with a comment stating what the original read (`874afab`).
3. **Hash regressions need explained re-baselines.** Commit `c4d7012` re-baselines because start-up `rand` draws (hi-score defaults) shift every stream; `38756d4` re-baselines exactly the two levels whose idle runs hit the NaN path, with before/after numbers. Never blanket-update.
4. **Persistent storage contaminates determinism.** A saved `HiScore.tab` changes the RNG stream; settings only load on the front-end path. Run hash comparisons with empty storage and the bare `level=` harness (AGENTS.md Traps).
5. **Init order bugs look like logic bugs.** Unfilled RNG table → everything spawned at one spot (`b79cd8a`); hint box not cleared on level load → stale text pointing into freed memory over the world map (`fdc1f0d`).
6. **Indirect dispatch hides unported code.** Level descriptors hold exe addresses; a missing port only shows when that path runs. Log-once `not ported` + long headless runs as coverage (`src/levels.c`, `src/moves.c`, `4bce89a` log once not every tick). A level's own table may name a *standard* routine — fall back by address (`6eefabf`).
7. **Windows path tolerance**: double separators, case-insensitivity — normalise in the VFS (`cc0b7db`).
8. **Docs drift from the original**: controls were described wrong until checked against the ReadMe and input code (`3e5d1f2`). Treat original docs + code as spec for user docs too.
9. **Browser input traps**: Alt keyup steals focus (Firefox menu bar/Chrome menu) → preventDefault keyup too (`3b873ed`); pointer lock needs a user gesture → request on the key's gesture and on click, tell the user when refused (`442944f`); Windows Alt+Shift layout switch can't be blocked — document it; Esc is the browser's pointer-lock release — use tap vs hold.
10. **Static server backlog**: Python `http.server` default backlog 5 caused intermittent module-graph failures under headless Chrome (`tools/web-play-test.mjs`).
11. **Python tool named `dis.py` shadows stdlib** when run from its directory → run helpers with `python -P` from repo root (AGENTS.md Traps). Also `/usr/bin/cc` because `cc` may be aliased.
12. **Keep RE notes off the public site** — architecture/formats moved to `notes/` (`e9b3ff1`): site = users (guide, gallery, player), repo notes = agents.
13. **Harness vs real path**: `level=W.L` skips pause menu/results; real path is `ini=BYPASS_FRONTEND 1;START_WORLD W;START_LEVEL L` + a key on the loading screen. Pause-menu page routines switch on the item last *picked* (0x4b9104), not the cursor.
14. **Verification gaps acknowledged**: regression covers 23/35 levels, no full play-through, no side-by-side with the original, Linux/Windows bundles only smoke-tested on macOS (`PLAN.md`). Speed of the port (~29 h) outran verification.
15. **Platform isolation pays**: only `platform_gasm.c` includes `gasm.h`; the core builds natively, enabling ASan/UBSan, native tools (`overview`, `bik`) and white-box tests on the same code.

## 6. Reusable checklists / procedures

### A. Project bootstrap (day 0)
1. Identify the exact target binary: size + CRC-32; write them into a header and refuse other builds with a message naming both.
2. Git-ignore: disc folder, ISO, the exe copy, decompiler dumps (`re/`), extraction output (`out/`). Write the hard rules (no data, no copied tables, cite addresses, no pasted decompiler output) into AGENTS.md first.
3. Ghidra project + `names.txt` + ApplyNames/DumpAll scripts + `fn.sh` + `fnsummary.py` + capstone `dis.py`. Re-dump after every naming pass.
4. Survey archives; write Python decoders for container + compression; verify compression by CRC on *every* file.
5. CMake with two configurations (native core+tests+tools; gasm game), globbed sources, warnings-as-errors in CI. Fetch scripts pinning gasm + wasi-sdk versions in one place.
6. `notes/architecture.md` with an address-range map and the main loop/state machine; `notes/formats.md` with each file and its reader.

### B. Porting a function
1. `tools/fn.sh <addr>` for the decompile; `tools/dis.py` for anything with FP compares, shifts, or array indexing with possibly negative indices.
2. Write in your own words; header comment `/* 0xADDR */`; globals cite addresses.
3. Constants/tables → `exe_*()` reads by VA, not literals (small algorithmic constants OK).
4. Keep quirks; comment "as the original". Guard real UB and describe the original's effective value.
5. Register hook/move routine in the address→function map; check logs for `not ported`.
6. Build both configs warning-free; `play_test` ok; `regress.sh | diff`; if hashes change, explain why, screenshot-check, re-baseline in the same commit.

### C. Determinism checklist
- Fixed frame rate equal to original tick (here 62.5 Hz = 16 ms); virtual ms clock advanced per present.
- Reproduce CRT `rand` exactly and every start-up `rand` consumer in order.
- Floats stored as float, evaluated as double, `ftol` truncation semantics, x87 NaN compare semantics.
- Hashes with empty storage; bare-level harness with default settings.
- Native vs browser hash parity test (virtual time, no input).

### D. gasm backend checklist
- Exports `gasm_abi_version`, `gasm_init` (set frame rate, input mode, key table, audio config, mount data, build argv from params), `gasm_frame` (one app frame, then push audio), `gasm_exit`. `GASM_TITLE(...)`.
- Data: image asset (`cd`/`rom`) via ISO 9660 over `asset_read_at` (loop short reads), else per-file assets with case fallback; reject `.cue` with guidance.
- Input: `KEYS_RAW` when the game wants its own bindings; state + ordered events; pointer lock via input mode; static-assert pad bit equality.
- Storage: registry values and side files as storage keys; document the desktop folder.
- Video: core framebuffer in the original's pixel format, convert in present.

### E. Browser player checklist
- Worker mode; assets from OPFS import or direct `File`s; folder picker + webkitdirectory fallback; ISO/raw-bin sniffing; required-file and exe-size check before running.
- OPFS import streamed, marker written last, persist() with timeout, quota and lock errors mapped to human messages.
- Fixed-timestep rAF with batch cap, one batch in flight, tab-switch clamp.
- AudioWorklet queue with prime/cap, started in a user gesture; mute persisted.
- Key handling: preventDefault except browser shortcuts; cancel Alt keyup; Esc tap/hold; pointer lock on gesture with status hint.
- Saves export/import as zip matching the desktop storage layout.
- `?hashframes=N` virtual-time hash mode + headless Chrome test comparing to native runner.

### F. Release / site checklist
- Semver tag without `v` → wasm + per-OS bundles (module + released runner + launcher that remembers the CD, logs to a known place, has `--dry-run`/env test hooks) + SHA-256; smoke-test each on its own OS.
- Site: VitePress, `/play/` as static app (`target: _self`, `ignoreDeadLinks`), vendored runtime script with recorded versions, copy-wasm script checking wasm magic, screenshots only as headless `--screenshot` JPEG frames, a themed hero component that uses no game assets (Flock.vue pattern), a "facts" pill row, built-for-gasm badge, copyright footer.
- Ask before tagging/pushing.
