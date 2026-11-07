# OpenI76: research notes

Source repo: `/Users/mjaskols/Projects/my/openi76` (read-only). Mined 2026-11-07 at commit `9260d8a`
(78 commits, 4 on 2026-11-06 and 74 on 2026-11-07: a very fast, agent-driven port in progress).

## 1. Facts

| Item | Value |
|---|---|
| Game | **Interstate '76** (vehicular combat, 1970s funk setting; Trip story T01-T17, scenarios S01-S07, melee M01-M15, A01) |
| Original studio / publisher | Activision (developed and published) |
| Year | 1997 (exe linked 1997-03-16) |
| Original tech | Win32, MSVC. `I76.EXE` imports `DDRAW!DirectDrawCreate` only: **v1.0 is a pure software renderer into an 8-bit palettized DirectDraw surface** (no Direct3D, no Glide; HW rendering arrived with the 1.1 patch and Nitro Pack). `DSOUND`, WinMM `mciSendCommandA` + `aux*` (**CD audio over MCI**), `joyGetPosEx`, GDI, `GetAsyncKeyState`. Movies: RAD Smacker 2 (`SMACKW32.DLL`, by ordinal). Multiplayer: Activenet `ANETDLL.DLL` (`dp*` API). Front end in `I76SHELL.DLL` (`ShellMain` / `ShellWindowProc` via `GetProcAddress`, `Shell_Load` 0x401000) |
| Targeted original | US v1.0 (Internet Archive item `interstate-76-activision-1997`): `I76.EXE` 1,019,392 bytes CRC-32 `4129421d` (base 0x400000, `.text` 652 KB, 2,172 functions after CreateFunctions) and `I76SHELL.DLL` 471,552 bytes CRC-32 `eee0a66d` (990 functions, 351 KB `.text`). Later patches compress ZFS and change MSN: refused |
| Approach | **Function-by-function port** from the exe/DLL, every function cited `/* Name 0x4xxxxx */`, and **differentially tested by running the original machine code in Unicorn** against the port built as a shared library. Bit-exact including x87 rounding-mode emulation |
| Language | C11 core (`-ffp-contract=off`), Python 3 tools (stdlib + Unicorn in `.deps/emu-venv`) |
| LOC | ~21,400 lines C in `src/` (incl. headers; ~19,000 in .c). To port: 574,903 bytes of exe code without the MSVC runtime + 351 KB shell |
| Status | **Research + in-progress port, step 3 of the plan, not playable.** Done: file layer (ISO 9660, raw 2352, cue), I76.ZFS, ZIX index, exe check, 8-bit present path, renderer core (DrawPoly, all 17 filler entries, clippers, line, queue, terrain, roads, sky, objects, shadows, palette/gamma), objects/LDEF, vehicles' loading + weapons + effects' loading, AI set-up + orders + path search, classes' start pass, vehicle physics/engine/damage/death/wreck, input + pilot camera + game loop frame, FSM VM. Not yet: other camera modes and cockpit, mission script game-side actions, effects, firing, AI driving, HUD, shell (I76SHELL.DLL), audio, CD music, movies |
| Site | Planned https://openi76.emdzej.pl (no site yet; no `docs/.vitepress`, no `docs/public`). Plan step 9: VitePress, GitHub Pages CNAME, theme from the cover (burnt orange, yellow lettering with black extrude, blue ring, stencil silhouettes) as generated SVG, not the scan |
| GitHub | `git@github.com:emdzej/openi76.git` -> https://github.com/emdzej/openi76 |
| Browser play | none yet (planned `docs/public/play/`, copied from opencmr2) |
| Releases | none. `tools/package-gasm.sh`, `smoke-gasm-bundle.sh`, `tools/gasm-bundle/`, `release.yml` exist but AGENTS.md forbids running them or tagging until the game is ported and the user asks |
| Runtime | gasm **0.16.1** (`GASM_VERSION` in `tools/fetch-gasm-sdk.sh`; `.deps` is a symlink to `../opencmr2/.deps`, same pins). Uses `video_present` (RGBA from palette), raw keyboard, gamepad, `GASM_TITLE("Interstate '76")` |
| Modern additions (planned, opt-in) | 16:9/16:10 in the software renderer with cockpit/HUD re-anchored; higher resolutions; a GL renderer on `gasm:gl` behind the polygon seam (32-bit colour, filtering, lum/tbl in shaders); network melee via `gasm:net` + `gasm-relay` replacing Activenet. Each gets a `--param`, a play-page setting and a line in the status page; default stays the original |
| Current debug params | `--param mission=t01.msn [cam=x,y,z,yaw,pitch]` static view; `play=1` runs the ported game loop; `tick=<ms>` fixed step for headless; `trace=<frames>` logs the user's vehicle |
| User must supply | Own v1.0 CDs: disc 1 `I76_CD1.ISO` (program + data; or extracted folder), later disc 2 as `I76_CD2.BIN/.CUE` (data track + 16 Red Book audio tracks of the soundtrack, plus 29 story movies). Run: `gasm-run openi76.wasm --headless N --asset cd=I76_CD1.ISO` or `--asset-dir cd` (both must give the same `video_fnv32`) |

## 2. Screenshots

There is **no `docs/public/screenshots/`** (no site yet). AGENTS.md rule 1 allows only renders of the port
there. Local, git-ignored renders exist in `out/` (not for publishing as-is): `boot.png` (disc 1 loading
screen), `t01.png`/`t01b.png` (T01 static camera: terrain, sky), `t01_ter.png`, `objs_t01*.png`,
`shadow_t01*.png` (objects with shadows), `veh_t01.png`, `goon1_0.png` (the Goon vehicle textured),
`zmap6t01.png` (VQ road map), `play1.png`/`play2.png` (`play=1` game loop: 640x480 software render from the
driver's eye over the orange Picard Piranha hood, desert canyon terrain, cloud-textured sky, no HUD yet).

## 3. Workflow and tooling

### Agent instructions (`AGENTS.md`, 8.4 KB)
- "Fidelity is the product": reproduce quirks and bugs; if something looks wrong check the disassembly;
  only fix deviations of the port.
- Siblings with the same conventions: `../opencmr2` (Colin McRae Rally 2.0, the template), `../openrf`,
  `../opensheep`; "copy their proven pieces (file layer, gasm backend, bundles, play page) rather than
  reinventing them". Input DIK table copied from OpenBallance (`src/platform_gasm.c` line ~102).
- **Hard rules**: (1) never commit original data or derivatives (`cd/`, `cd2/`, `i76.exe`,
  `i76shell.dll`, `re/`, `out/`; `.gitignore` also blocks `*.exe *.dll *.iso *.bin *.cue *.zfs *.smk`);
  exception: site screenshots that are renders of the port. (2) No data copied from the exe in source:
  tables loaded at runtime by `src/exe.c` with size + CRC check; small constants/operands fine, tables/
  geometry/strings not. (3) Cite the original in every function; names consistent with Ghidra
  (`tools/ghidra/names.tsv` with columns addr/name/module/confidence/description, 663 entries; and
  `names-shell.tsv`). (4) No decompiler output in source or docs. (5) Community knowledge (Open76,
  "That Tony" hackingonspace posts) may inform formats; exe is the authority; no code copied.
- **Unattended runs: one at a time, niced** ("parallel runs have frozen it"): `pgrep -fl gasm-run` before
  starting; everything under `nice -n 19` (`cmake --build build -j2`, `ctest -j1`, gasm build `-j1`,
  regressions via `xargs -P 1`); Ghidra full-dump scripts count as a run; kill hung runs (log stopped
  growing). One run next to another session's single run is OK (commit `8794498`).
- **GPU memory leak in long `--screenshot` runs** (~15 MB/s seen in openoni until the Mac froze): long runs
  need a `drawfrom=<N-50>` param that draws only the last frames.
- Always `--headless`; never open a window, never macOS `screencapture`. **Hold scripted keys a few
  frames**: a one-frame tap can fall in a frame without a game step.
- Commits: imperative subject, body explains why.

### RE process
- Ghidra project `i76` with two programs (`i76.exe`, `i76shell.dll` as copies), driven by ghidra-cli:
  `ghidra decompile 0xADDR --project i76 --program i76.exe`, `x-ref to`, `disasm`, `memory`.
- `tools/ghidra/`: `AnalyzeAll.java`, `FillGaps.java` (create functions at 16-byte-aligned addresses after
  RET/INT3/NOP padding in `.text`), `CreateFunctions.java` (BWD2 chunk handlers reachable only via data
  tables), `ApplyNames.java` + `apply-names.sh` (apply names.tsv and regenerate `re/<prog>.c`,
  `re/<prog>.meta.tsv` (size, callers, callees, strings), `re/<prog>.funcs.txt` for grepping),
  `DumpAllNamed.java`, `DumpMeta.java`, `dis.sh`/`dis.py` (plain disassembly from ghidra-cli JSON),
  **`x87trace.py`** (follows the x87 register stack along a path of instructions and prints SSA
  assignments; decodes register forms from bytes because Ghidra prints `fmul ST2` for both `d8 ca` and
  `dc ca`). Ports of hand-written x87 fillers follow its operation order exactly.
- Module map from MSVC link order: contiguous ranges = one source module, named by the strings they use
  (`docs/re/architecture.md`, 30 ranges from app/FSM/AI/weapons/HUD/graphics/sound/input/files/terrain/
  roads/memory + MSVC runtime 0x4969f0-0x4a5000 not ported).
- Effort estimated in KB of `.text` per module.
- Findings go into `docs/re/*.md` with exact layouts and addresses, marked confirmed vs inferred; each page
  names its port file and its diff test.

### Differential testing harness (`tools/emu/`, the core technique)
- `x86.py`: loads the PE image at its addresses into Unicorn (headers, sections, zero BSS), maps a stack,
  heap, sentinel return address and an import-stub page; any access outside mapped memory or a jump into
  the import table faults with its address; FPU control word settable (`fpcw = 0x027F`).
- The port is built as `libi76core` (`-DOPENI76_SHARED=ON`) and called via ctypes; `diff_*.py` feed the
  same random or real inputs to both and compare output **byte for byte**: `diff_poly` (random convex
  polygons, both windings, random surface/colour tables/textures), `diff_clip`, `diff_line`, `diff_draw`,
  `diff_view`, `diff_geom`, `diff_palette`, `diff_queue`, `diff_crt` (rand/qsort/bsearch), `diff_terrain`
  (20,000 cell queries), `diff_terrvis`, `diff_terrdraw`, `diff_terrpatch`, `diff_sky`, `diff_roads`,
  `diff_objects` (whole mission loads; `--start`; `--call NAME [--upside]` runs one per-frame function on
  every vehicle after the start pass, incl. flipped-over vehicles), `diff_objdraw`, `diff_engine`,
  `diff_phys` (integrators on random inputs), `diff_fsm` (mission scripts 150 frames), `mission.py` (runs
  the original's `Mission_Load` 0x484410 completely, serving file reads from the port's resource layer
  and stubbing heap, CRT locale and display imports: t01 reads 494 files, 94 entities, 719 nodes).
- Known-unreproducible cases (reads outside the texture into stale heap / row tables; negative-u table
  indices) are detected and skipped explicitly (`BELOW_OUTSIDE`, stale-slot address map `STALE_ROW`).
- Where the original reads an uninitialised stack slot, the harness reads the original's slot value and
  feeds it to the port's mirror global (`g_poly_stale_row`, commit `1417ab4`).
- `tools/emu/regress.sh`: runs every diff, at nearest **and** `--down`, niced and sequential; then every
  mission's objects/start/objdraw, every mission's FSM, and ~25 vehicle `--call` functions on t01 and s04
  upright and upside-down. Output: only non-"identical" lines plus counts.

### Format tooling
- Python reference decoders, stdlib only: `tools/zfs.py list|census|extract|--summary`, `tools/i76fmt.py`
  (bwd2, png, --summary), `tools/fsm.py` (dump a mission's script), `tools/bwd2_tables.py`,
  `tools/exe.py`, `tools/pcx-ref.py` (ffmpeg comparison), `tools/view.py` (reference renderer: a car and a
  terrain tile).
- C decoders in `src/fmt/` must agree with Python via **FNV-1a summary hashes** passed through env vars:
  `OPENI76_ZFS_SUMMARY` (914be107), `OPENI76_FMT_BWD2`, `OPENI76_FMT_IMAGES` (1b3ea575),
  `OPENI76_FMT_GEO` (abb1495e).

### Build, tests, CI
- CMake `-DOPENI76_PLATFORM=native|gasm`; `gasm_add_game(openi76 ...)`, `-O2`, stack 1 MiB,
  `--strip-debug`; native static `i76_core` + every `tests/*_test.c` auto-globbed.
- Tests read `OPENI76_DATA` (default `./cd`) and **skip with exit 0 without data**, so CI can run them as
  smoke tests: `chunks_test` (port's chunk tables = exe's, every mission walks), `exe_test` (size/CRC,
  sections), `fmt_test`, `input_test` (input.map/gamekey.map chords, ramps, typed keys), `pcx_test`
  (ffmpeg-equal hash), `res_test` (pak members, null names, cache, duplicate-name resolution),
  `tex_test`, `vfs_test`, `world_test` (all 39/40 missions' WDEF/TDEF).
- `ci.yml`: native macOS + Ubuntu build + ctest + py_compile all tools; wasm build artifact. Bundles and
  pages workflows deferred.
- `.scratch/` (git-ignored) holds working notes, disassembly snippets, modes tables (`modes.txt`,
  `modmap.txt`, `archtable.md`).

## 4. Technical knowledge that generalizes

### Data formats (all confirmed against disc 1 unless noted)
- **I76.ZFS** (63.8 MB, 3,847 members, stored uncompressed in v1.0): header 28 bytes `ZFSF`, version 1,
  name length 16, 100 entries per directory block, count, 0, first block offset 0x1c. Directory blocks are
  a linked list (`u32 next` + 100 x 36-byte entries `name[16], offset, index, size, timestamp, flags`).
  Flags 0 in v1.0 (patches compress: refuse).
- **ZIX file index** (`I76MAX.ZIX` full / `I76MIN.ZIX` minimal, installed as `i76.zix`): CRLF text; count;
  roots between dashed lines (`0 c:\i76\debug i76_cd2 'Disk 2` = disc prompt, then `DIR: <dir>` or
  `CD<n>: <dir>`); then `<root> <name>` per file. The game **never searches directories**; it looks names
  up in this index. Records 48 bytes, sorted case-insensitively, duplicates keep all roots. Disc 2 found by
  label `I76_CD2` + presence of `int12f01.smk`; CD located by volume label (`Cd_FindByLabel` 0x484c20).
- **BWD2 tagged chunks**: `tag[4]` (`REV\0`), `u32 size` including the 8-byte header, payload. Every file
  starts `BWD2` (size 8) then `REV`, then a type chunk (`SDFC VCFC VTFC WDFC GDFC WDEF(.msn) VDFC XDFC
  ECNK`). Chunks tile 854 files exactly. 46 top-level tags. Loaders walk via 16-byte tables
  `{tag[8], handler, flags}` (flag 2 = payload-only; 0x400 repeats); `EXIT` ends.
- **Palettes/images**: `.act` 768 bytes 8-bit RGB (not 6-bit VGA); `.map` `u32 w,h` + indices; `.cbk` VQ
  codebook `u32 n` + 16-byte 4x4 codewords (max 4,096); `.vqm` `u32 w,h, char cbk[12], u32 0x200`, then
  `u16` per 4x4 block: bit 15 set -> solid colour `v&0xff`, else codeword index; packed ones cropped at
  edges. `.pak` + `.pix` bundles (884, 13,585 members: geo/vqm/tmt). `.lum`/`.tbl` 256x256 shade and
  translucency tables per world.
- **.geo** meshes: `OEG.` header 0x24 bytes, vertices, same count of normals, faces (55 bytes + 16 per
  corner: index, count, RGB, plane, flags, 13-char texture or vehicle paint slot like `V1 FT LF`,
  corners `{vertex, normal, u, v}`). Axes x right, y up, z forward.
- **Terrain** `.TER`: zones of 0x8000 bytes (128x128 u16 cells of 5 m: bits 0-11 height in 0.1 m, bit 12
  flag, bits 13-15 class). World grid 128x128 zones (81.92 km); mission map 80x80 zones at (24,24).
- **Missions** `.MSN` (BWD2): WDEF (WREV, WRLD palette/lum/tbl/sky/lighting), TDEF (ZMAP, ZONE), RDEF
  (RSEG point-pair strips), ODEF, LDEF, ADEF (FSM), EXIT.
- **Resources** (`docs/re/resources.md`): pak index sorted with MSVC `_qsort` on 16 chars ignoring case,
  looked up with `_bsearch`; 11 names exist in two paks and **which copy wins depends on MSVC's sort**
  (`burnwood.vqm` -> `aobilb0m.pak`), so `qsort`'s exact algorithm (shortsort selection sort, swap) was
  ported in `src/crt.c`.
- **Vehicles**: `.vcf` (VCFC, SPEC, WEPN) -> `.vdf` (VDFC, SOBJ, VLOC, VGEO 7 LODs x 4 damage states,
  VCHK, COLP, WLOC wheels, HLOC hard points, ETBL), `.vtf` paint, `compnent.cdf`. Default user vehicle
  `vppirna1` (from 0x4a8448 copied by WinMain before the shell's choice); missing -> "No User vehicle in
  mission".
- Other: `.gpw` `GAS0` sound groups, `.npt` briefing text, text key binding `.map`/`.def` files,
  Smacker 2 movies 640x480 pal8 22 kHz u8 mono, PCX loading screens.

### Rendering (8-bit software rasterizer on gasm)
- Present: 8-bit frame + palette expanded to RGBA in the guest, `gasm_video_present` (`plat_present`).
  Deterministic -> headless `video_fnv32` hash is a test oracle.
- `DrawPoly(ctx, verts, count, colour, mode)` 0x43d730 with a **9-bit mode** indexing a 512-entry clip
  table and a 512-entry fill table (25 distinct routines: flat, Gouraud, 22 textured variants). Vertex = 6
  floats `{x, y, w=1/z, u*w, v*w, q}`; q = light term, fillers shade by `1-q`.
- Lighting/translucency via tables: `lum[(shade<<8)|colour]` (32 shades: `round((1-q)*7936) & 0xff00`),
  `tbl[texel<<8|dest]`, glow, remap; all in one contiguous block `g_rtab` 0x5af150 because indices can run
  from one table into the next: **keep the layout**.
- Perspective filler: exact u,v every 16 pixels with the next run's divide overlapped (Quake-style),
  remainder via `{r, 1/r}` table, last pixel separately.
- Render queue: depth-bucketed (4096 buckets), drawn far to near, with occluder span lists; none of the
  pools are bounds-checked. Sky drawn straight onto the surface before the flush; cloud drift is
  per-drawn-frame (frame-rate dependent).
- Gamma rows: `pow(i/255, 1/g)*255` truncated; even gamma 1.0 is not identity (24 entries one below).
  Display set-palette passes count as end (quirk kept), forces colour 0 black.
- Two port seams for additions: framebuffer size as parameter (original already does 320x240, 480x360,
  640x480), and the renderer split at screen-space polygons (software filler or `gasm:gl` backend).

### Floating point determinism (the big one)
- MSVC start: control word 0x27f (53-bit precision, round to nearest; `_controlfp(_PC_53)` only sets PC).
- **DrawPoly sets RC = up around every filler** (magic `1.5*2^52` rounding becomes ceiling: top-left fill
  rule; every float op inside rounds up).
- **`Terrain_Height` 0x491f00 sets RC = down and never restores it** (commit `2d39318`): from the first
  terrain query on, the whole game (every frame, every later mission load) rounds down; only the first
  mission load and the front end before it run at nearest. Terrain_Draw sets down for its quadtree and
  restores.
- WebAssembly has only round-to-nearest. `src/render/fpu.h` keeps `g_fpu_round` and computes each op in
  nearest then corrects with its exact error: TwoSum for add/sub, `fma` residuals for mul/div/sqrt, signed
  zero rules for exact-zero sums; all four x87 RC modes. Core compiled with `-ffp-contract=off`.
  Transcendentals (`fsincos`, `fpatan`, `fyl2x/f2xm1`) use libm + final-store correction only.
- Every diff test runs in both modes the game uses (0x27f and 0x67f).
- Per-op float/double storage matters: e.g. `Integrate` adds x's product unrounded but y and z as floats
  (commit `8fc7730`). Comparisons on floats' bits as signed integers are kept.
- Emulator caveat: Unicorn's `fyl2x`/`f2xm1` are less exact than real FPUs; the port's gamma row was proven
  hardware-correct by error analysis instead (`render.md` palette section).

### Timing
- Game clock (`src/clock.c`): GetTickCount in seconds (`fild` unsigned x 0.001 as float), dt default 0.06,
  sub-steps per vehicle `n = ftol(20*dt) + 1` (max 20), each `dt * 1/n` from a table built per mission in
  the current rounding mode (entry 20 overlaps the next variable: a frame >= 0.95 s gets near-zero steps).
  Script clock = steps summed after the first three ticks. gasm frame rate `APP_FRAME_HZ 60`;
  `--param tick=<ms>` and `g_clock_fake_ms` for deterministic headless runs.
- Vehicles far from the camera (> 25 units) take a cheaper once-a-frame step.

### Scripting VM (mission FSM, `docs/re/fsm.md`)
- ADEF's FSM chunk: tables of actions (name -> code via a chain of comparisons; 96 codes `null`..`stopCB`;
  unknown fatal), entities, sounds (wav must be in resources; smk checked on disc), paths, machines,
  constants, code (op, arg) pairs.
- Stack machine, 0x10bc bytes each: 4 KB stack, action args, flag, ip/frame/sp; 14 ops (push imm/addr/val,
  arg addr/val, sp adjust, jump, jump-unless-flag, **yield**, call, return, action, negate flag). 1000
  steps per machine per frame; > 800 sets a flag the AI reads; 1000 exits the game.
- Loaded into an **arena whose addresses stand in for the original's 32-bit pointers** so the machines'
  pointer arithmetic is the original's (commit `db16407`). Identical to the original on all 40 missions.

### Input (`docs/re/input.md`)
- 83-entry action table read from the exe at runtime (analog/held/pressed kinds, centre/min/max, ramp
  shift). `input.map` blocks of chords (`+ device channel` / `- device channel`, max 8), `_plus/_minus`
  held actions create ramped analog bindings; empty chord always met (quirk kept). Keyboard driver with
  release mask, Alt quirk, typed-key ring, fed from DIK scan codes from gasm raw `key_state` plus key
  events (`scan_of[]` table).

### Audio / CD audio / video (planned, `port-plan.md`)
- Disc 2 is mixed mode: track 1 MODE1/2352 data, tracks 2-17 Red Book audio (32.9 min soundtrack).
  **Converting the BIN to ISO throws away the music.** Plan: `vfs_cue.c` exposing tracks as raw 44.1 kHz
  s16 stereo PCM ranges; fallback FLAC/Ogg/WAV via dr_flac/stb_vorbis; else silence logged once. Port the
  MCI play/loop/aux-volume calls onto that source. Browser could decode MP3/AAC via `gasm:media`.
- Sound: DirectSound-style mixer, gpw engine loops, Doppler/3D pan, output `audio_push`, `audio_fnv32`.
- Movies: own Smacker 2 decoder in C, checked against `ffmpeg -f framemd5`; pal8 640x480 fits the 8-bit
  presenter.

### RNG / CRT
- MSVC `rand()` LCG `seed*214013+2531011 >> 16 & 0x7fff`, seed at 0x4ebc90; `qsort` and `bsearch` ported
  from the CRT because behaviour depends on them (duplicate-name resolution).

## 5. Lessons learned / pitfalls

1. **The x87 rounding mode is game state.** A function that sets RC and never restores it changes every
   later computation (`2d39318`). Scan all `fldcw` sites early, model RC globally, run every diff in each
   mode the game actually uses.
2. **Emulate rounding modes exactly in wasm** with TwoSum/fma correction rather than giving up on
   bit-exactness (`f1d04c8`); disable FP contraction (`-ffp-contract=off`) or the compiler fuses ops.
3. **Ghidra lies about x87 register direction** (`fmul ST2` ambiguity); trace from bytes (`x87trace.py`,
   `a878938`).
4. **Differential execution beats reading**: run the original function in Unicorn on random inputs and
   compare byte for byte (`4a10697`: 3,300 polygons identical, ties included). Scales up to whole mission
   loads (`66a0edd`) and per-frame vehicle functions (`32b5989`, `--upside` to reach death/flip branches).
5. **Original reads of uninitialised stack slots are real behaviour** (tiled affine filler's stale row
   counter produces a visible 4-row band, `1417ab4`): mirror in a global and feed the original's slot value
   in the harness. Unreproducible garbage reads get explicit skip lists, not silent tolerance.
6. **CRT behaviour leaks into gameplay**: which duplicate pak member wins depends on MSVC qsort; port the
   CRT pieces (`docs/re/resources.md`).
7. **Keep memory layouts where indices overflow** across adjacent tables (`g_rtab`), and use an arena with
   original-like addresses where scripts do pointer arithmetic (`db16407`).
8. **Misidentified surfaces**: what looked like a screen clear was the shadow mask's surface (`5e5d528`).
   Trust the data flow, not the name you guessed.
9. **Machine contention**: parallel emulator/test/gasm runs froze the shared machine; one at a time,
   `nice -n 19`, `pgrep` first (AGENTS.md). Long screenshot runs leak GPU memory: draw only the last frames.
10. **Scripted input**: hold keys several frames; a one-frame tap can land in a frame with no game step.
11. **Don't release early**: bundle/release tooling copied but deliberately unused until the port is done.
12. **Mixed-mode CDs**: never delete the BIN/CUE; the audio tracks exist only there.
13. **Names file hygiene**: duplicates crept into `names.tsv` (`fd50748`, `31c71df`); keep one record.
14. Gotcha in timing tables: the sub-step reciprocal table's entry 20 aliases the next variable.
15. Prior art (Open76 Unity/C#) used for format hints only; licence to be checked before close reading.
16. Stray empty directories `t01.rtm/` and `vppirna1.vcf/` at the repo root (probably a tool writing to a
   name-as-path); worth guarding extract tools against creating dirs at repo root.

## 6. Reusable checklists / procedures

### Starting a function-by-function port (from `docs/re/port-plan.md` step 0-2)
1. Disc inventory + format census (sizes, CRCs, imports: the import table tells you the platform surface).
2. Scaffold from the newest sibling (AGENTS.md, CMake native|gasm, `.gitignore` for all original data,
   fetch-gasm-sdk with a single pin, CI).
3. Ghidra: import, AnalyzeAll, FillGaps, CreateFunctions for data-reached handlers; first naming pass from
   strings (error messages, file names, script action names); names.tsv with module + confidence.
4. Exe loader checking size + CRC; tables read at runtime, never committed.
5. File layer: ISO 9660, raw 2352, cue; archive layer; resolve names exactly as the original (index file).
6. Python reference decoder + C decoder per format, agreeing via FNV-1a summary hashes; one doc page each.
7. Find the original's own module boundaries (link order) and estimate effort in KB of `.text`.
8. Each step has an explicit **Check** (test, hash, diff) before moving on.

### Porting one function
1. Name it in Ghidra/names.tsv; read decompile, then disassembly (x87 via x87trace).
2. Write the doc section (layout, formula, addresses, quirks kept; confirmed vs inferred).
3. Port in own words with `/* Name 0xADDR */`; arithmetic through `fpu.h` if it can run outside nearest.
4. Add/extend a `tools/emu/diff_*.py` (random inputs + real mission data), run at nearest and `--down`.
5. Add it to `regress.sh`; run niced; commit with the check stated.

### Faithful-first, additions-later
- Default = original. Additions only through pre-planned seams (framebuffer size param; polygon-level
  renderer split), each with `--param`, a play-page setting and a status-page line.

### Disc-2 / CD audio checklist
- Keep BIN/CUE; extract track 1 as ISO for data; FLAC masters of audio tracks; core plays raw PCM from
  BIN+CUE first, then FLAC/Ogg/WAV, then silence; port MCI calls (play track, loop, aux volume).
