# OpenBallance: research notes

Source repo: `/Users/mjaskols/Projects/my/openballance` (read-only). Mined 2026-11-07 at commit `8a15bad`
(12 commits; the first, `306a281`, is a squashed import of the whole working port, so history shows only
post-launch fixes).

## 1. Facts

| Item | Value |
|---|---|
| Game | **Ballance** (marble/ball-rolling puzzle-platformer, 12 levels) |
| Original studio / publisher | Cyparade (developer) / Atari (publisher) |
| Year | 2004 (CD dated 2004-02-23, multilingual, German installer covering DE/EN/ES/IT/FR) |
| Original tech | **Virtools Dev 2.1** (CK version `0x13022002`, file version 8). `Player.exe` (generic Virtools player, 471 fn) hosts `CK2.dll` (2,794 fn), `VxMath.dll` (726 fn), `CK2_3D.dll` (3,907 fn) + `CKDX8Rasterizer.dll` (Direct3D 7/8 fixed function), managers `Dx5InputManager` (DirectInput), `DX7SoundManager`, `ParameterOperations`, 20 Building Block DLLs incl. Terratools `TT_*.dll` and `physics_RT.dll` (Ipion "ipion 99/07/10" + qhull, 1,946 fn) |
| Targeted original | The retail CD (Atari/Cyparade 2004-02-23). Game logic lives in `base.cmo` + `3D Entities/*.nmo` + `3D Entities/PH/*.nmo`; levels in `3D Entities/Level/Level_01..12.NMO` |
| Approach | **Script runtime**: a CK2-compatible runtime loads the user's `.cmo/.nmo` and executes the original Virtools behaviour graphs. The ~184 Building Blocks are ported one by one from their DLLs; the physics is a function-level port of the Ipion (IVP) engine from `physics_RT.dll`. Graphs are *not* hand-translated (rejected "Option B", `design/analysis.md` sec. 2) |
| Language | C11 (core), Python 3 tools, JS for the browser player, VitePress site |
| LOC | ~27,100 lines of C in `src/` (bb 7.2k, ck 6.4k, phys 9.6k, render 1.2k, rest ~2.7k). Docs ~14.8k lines of Markdown (IVP specs alone ~9.5k) |
| Status | **Complete and released** (0.1.3). Boot, intro, full menu, tutorial, all 12 levels with modules/transformers/extras/checkpoints/sectors, lives/score, pause, game over, highscores, sound + music, original keyboard and mouse controls incl. rebinding, settings/highscore saves. Known gaps (`docs/guide/status.md`): physics not numerically compared against recordings of the original; `Text Display` debug overlay not drawn; 3D sprites unlit; `Delete Dynamic Objects` no-op; debug BBs report zeros |
| Site | https://openballance.emdzej.pl (CNAME in `docs/public/CNAME`, GitHub Pages) |
| GitHub | `git@github.com:emdzej/openballance.git` -> https://github.com/emdzej/openballance |
| Browser play | https://openballance.emdzej.pl/play/ (WebGPU required: Chrome/Edge, Safari 26+, Firefox 141+) |
| Releases | https://github.com/emdzej/openballance/releases, tags plain semver without `v` (`0.1.3`). Assets: `openballance-gasm-<ver>-macos-universal.zip` (`Ballance (gasm).app`, ad-hoc signed), `-linux-x86_64/arm64.tar.gz` (`openballance.sh`, `--install-desktop`), `-windows-x86_64.zip` (`OpenBallance.cmd`), plus bare `openballance-<ver>.wasm`, with checksums |
| Runtime | gasm >= **0.6.0** (needs `gasm:gfx` textures/samplers/explicit layouts/viewport from 0.4.0, raw keyboard/pointer from 0.5.0, `gpu_destroy` + `GASM_TITLE` from 0.6.0). Pin: `GASM_VERSION` in `tools/fetch-gasm-sdk.sh`, mirrored by `@emdzej/gasm-host` in `docs/package.json` |
| Modern additions | Runs on macOS/Linux/Windows/browser from one `.wasm`; reads ISO/BIN, mounted CD (InstallShield cabinets decompressed on the fly) or installed folder; gamepad mapping onto DirectInput codes; launch params `language=0..4`, `unlockall=1`, `mode=viewer level=N` (fly-through), `dump2d=N` (debug); hold-Esc to quit; 4:3 pillarboxing into any window; browser OPFS import + IndexedDB saves |
| User must supply | Own Ballance copy: disc image (`Ballance.iso` or `.bin` of bin/cue), the CD or a copy of its files (`Setup/data1.hdr`, `data1.cab`, `data2.cab`), or an installed game folder (`base.cmo`, `3D Entities/`, `BuildingBlocks/`, `Sounds/`, `Textures/`). No assets shipped or converted |

Run: `gasm-run openballance.wasm --rom Ballance.iso` or `--asset-dir /path`. Saves: `--storage-dir`.

## 2. Screenshots (`docs/public/screenshots/`, all 960x720 JPEG, made with gasm headless runner)

| File | Content |
|---|---|
| `intro.jpg` | The intro (atari.avi movie texture / boot) |
| `menu.jpg` | Main menu (Start, Highscore, Options, Credits, Exit pill buttons) over the 3D menu level with floating tracks, towers and pink flames |
| `level-select.jpg` | Level selection screen |
| `options.jpg` | Options screen |
| `highscore.jpg` | Highscore table |
| `tutorial.jpg` | Level 1 tutorial text overlay |
| `level01.jpg` | Level 1: wooden ball on stone track with blue rails, two lantern towers, sunset sky box, 3 spare-ball HUD icons (hero image of README/site) |
| `level02.jpg` .. `level07.jpg`, `level09.jpg` .. `level12.jpg` | One gameplay shot per level |
| `level08-extra.jpg` | Level 8: extra-points pickup with silver balls orbiting a glow (TT Extra BB) |
| `pause.jpg` | Pause menu |
| `game-over.jpg` | Game over screen |
| `viewer.jpg` | The level viewer (`mode=viewer`) fly-through |

Gallery page `docs/gallery.md`; recipe in `docs/howto/headless.md` (frame ~990 menu, 1000+Enter level
select, 1150+Enter load level 1, ~1750 start prompt (Y=Q dismiss tutorial), ~1930 ball appears).

## 3. Workflow and tooling

### Agent guidance
No `AGENTS.md`/`CLAUDE.md` in the repo. The equivalent guidance is:
- `design/analysis.md`: explicitly says the layout "mirrors OpenRF" and invokes "OpenRF's rule 2". OpenRF's
  `AGENTS.md` (`/Users/mjaskols/Projects/my/openrf/AGENTS.md`) hard rules therefore apply: (1) never commit
  original data or derivatives; (2) no data copied from the executable in source (here: nothing from the
  original's graphs/geometry/strings enters the tree; everything loads at runtime); (3) cite the original
  address in every ported function; (4) never paste decompiler output. "Fidelity is the product": keep
  quirks, only fix deviations of the port.
- `docs/howto/reverse-engineering.md`: the 5-step RE workflow (below), "Decompiler output is never pasted
  into the source", "The original binaries and data are never committed".
- `design/gasm-gfx-requirements.md`: written *for an agent implementing gasm changes* (read gasm's
  `AGENTS.md`, `spec/ABI.md`; ABI changes start in `spec/abi.json` + `node scripts/gen-abi.mjs`; both
  runners change together; validation errors trap, never panic).
- `.gitignore` encodes rule 1: `/cd/ /game/ /data /re/ /out/ *.iso *.cue *.mdf *.nrg`.
- Clean-room constraint on physics: "port from our own decompilation. Do not consult the leaked Ipion
  source" (`design/analysis.md` sec. 1 Physics).
- Commits carry `Claude-Session:` trailers: the port was built by Claude Code sessions.

### RE process (`docs/howto/reverse-engineering.md`, `design/analysis.md` "Ghidra")
1. **Graphs first.** Python readers (`tools/ck.py` full CKStateChunk reader + behaviour-graph dumper,
   `tools/nmo.py` object table) dump every graph with parameters and links to `re/graphs/*.txt`
   (39 files). Most questions are answered there, not in disassembly.
2. **Which BBs are used.** `tools/bbindex.py` / `bbmap.py` produce `re/bb_inventory.txt` and
   `re/bb_map.txt` (GUID -> count, DLL, execute fn, callback fn, name). `tools/opsindex.py` extracts
   parameter-operation registrations; `tools/cktypes.py` holds CKPGUID types with parents.
3. **Decompile/disassemble.** Ghidra headless via ghidra-cli, project `ballance`, one program per DLL.
   Scripts in `tools/ghidra/`: `Reanalyze.java` (disassemble exports + re-run analysis: VxMath 0 -> 726
   functions, CK2 54 -> 2,794), `MakeFunctions.java` (functions at vtable targets), `FixNoReturn.java`,
   `FixOpSignatures.java`, `DumpAllNamed.java` (-> `re/<dll>.c`). `tools/ghidra-bb-import.sh` = fresh
   import + analysis + BB discovery + dump; `tools/bbpass.sh` iterates "make functions from BB labels,
   re-dump" until none left; `tools/bbextract.py` writes each used BB's decl/creation/execute/callback to
   `re/bb/<dll>/<name>.c`; `tools/bbview.py DLL NAME` shows pin layout + bodies compactly;
   `tools/peread.py` reads bytes/strings at a VA. Where the decompiler is unreliable (x87, merged stack
   slots, draw functions) read `objdump -d --x86-asm-syntax=intel` / capstone.
4. **Specify, then port.** Large subsystems get a written spec with addresses first (the docs pages), and
   are ported from the spec, citing addresses. Spec docs use confidence tags `[V]` verified vs
   disassembly, `[D]` decompile cross-checked, `[H]` hypothesis.
5. **Verify** with headless runs: `run_test` traces, probes, screenshots.
- `tools/check_bbdecl.py`: checks every `BB_DECL(var, a, b, "Name", fn)` in `src/bb` against
  `re/bb_map.txt` (GUID <-> name consistency).
- `tools/view.py`: reference software renderer of a level `.NMO` to PNG (validates the geometry decoders
  in `ck.py` before the real renderer existed).
- `tools/wait-gasm-release.sh`: polled emdzej/gasm releases until `spec/abi.json` had `create_texture`
  (the port waited on gasm gfx v1).

Ghidra gotchas: pass `--java-home .../openjdk@21/...` (auto-detect hangs in `LaunchSupport`); import-time
analysis finds almost nothing in these DLLs; `re/physics_RT.dll.c` lacked ~180 functions objdump finds
(vtable methods such as the manager's PostProcess 0x10007ce0).

### Build
- CMake 3.24, `-DOPENBALLANCE_PLATFORM=native|gasm`. gasm: `include(Gasm)` + `gasm_add_game(openballance
  ...)`, toolchain `.deps/gasm-c-sdk/cmake/gasm-toolchain.cmake`, wasi-sdk in `.deps/wasi-sdk`, `-O2`,
  link `-Wl,-z,stack-size=1048576` (level loading keeps large buffers on the stack: 1 MiB instead of
  64 KiB) and `--strip-debug`.
- Native: static `ob_core` with `src/render/gpu_null.c` (null GPU) + test executables; this is tools and
  tests only, no native game build.
- `src/platform_gasm.c` is the *only* file including `gasm.h`; `platform.h` is the contract.

### Tests (`docs/howto/tests.md`)
Need game data (`OPENBALLANCE_DATA`, default `./data` symlink), so CI only compiles them.
- `ck_test`: loads every `.cmo/.nmo` and checks object counts (expected counts from `tools/ck.py`).
- `cab_test`: every file read from the InstallShield cabinets equals the installed folder.
- `run_test N`: boots `base.cmo` headless for N frames, lists which BBs ran and which are missing.
  Env-var probes: `KEYS="from-to:hexDIK,..."`, `TRACE_FROM`+`-vN` (every BB executed), `PHYSDEBUG=n`
  (+`PHYSCONTACTS`, `PHYSALL`), `PHYSPROBE=1|2` (flat-ground ball probe, 4000 m floor), `DUMPARRAY`,
  `DUMPGROUP`, `WATCHPOS`, `WATCHPARAM`, `BOXES`, `SETCELLS="array:col:value"` (e.g. unlock all),
  `MEMSTAT`, later `MOVEENT/MOVEENT2/3/4`, `DUMPENTS`, `SENDMSG` (commits `3483df7`, `139f665`).
  Example: `KEYS="1000-1005:1c,1150-1155:1c,1750-1755:10,1900-2500:d0" PHYSDEBUG=20 ./build/run_test 2500`.
- Headless gasm: `gasm-run ... --headless 2072 --no-hash --input "1000-1005:A,..." --screenshot x.png`.

### CI (`.github/workflows/`)
- `ci.yml`: native build (macOS + Ubuntu) + `py_compile tools/*.py`; wasm build -> artifact; bundle jobs
  package via `tools/package-gasm.sh` for macOS-universal, linux-x86_64/arm64, windows-x86_64 and
  smoke-test (`tools/smoke-gasm-bundle.sh`: run bundled `gasm-run` without data -> must print "game data
  not found" and exit 1, not crash; launcher `--help`/`--dry-run` against fake installed/CD/iso/bin
  layouts); shellcheck on all scripts; Linux needs `libasound2t64`.
- `pages.yml`: builds wasm, `docs/scripts/copy-wasm.sh`, `vendor-web.sh` (gasm web host into
  `public/play/vendor`), VitePress build, deploy. `fetch-depth: 0` for lastUpdated.
- `release.yml`: on `X.Y.Z` tag; builds, packages all platforms, smoke-tests, publishes with checksums and
  `.github/release-notes.md`.
- App icon generated from the site favicon (`tools/icon.py`, stdlib-only PNG scaling so CI has no Pillow;
  `tools/make-icns.sh`).

### Docs site
VitePress (`docs/`, Node 22, pnpm 10). Sections: guide (intro, status, install, game-data, running,
browser, controls, parameters, troubleshooting), howto (build, tests, headless, release, RE), internals
(architecture, CK2 runtime, BB specs, physics + IVP specs, design records included via
`<!--@include: ../../design/*.md-->`). "Built for gasm" badge from `gasm.emdzej.pl/badge/`. Custom theme
`docs/.vitepress/theme/ballance.css`.

### Browser player (`docs/public/play/`: `index.html`, `play.js`, `cd.js`, `play.css`)
- Uses `@emdzej/gasm-host` (GasmHost, GasmWorker, WebGpuGfx, BrowserInput, IdbStorage, Resampler) and
  `@emdzej/csfs-{core,fsa,opfs}`.
- **Worker mode** when the browser has WebGPU in workers: canvas transferred (OffscreenCanvas), game data
  read lazily from OPFS (`FileSystemSyncAccessHandle`) or picked files (`FileReaderSync`). Otherwise main
  thread + full preload into memory.
- `cd.js`: user picks folder (installed or CD layout) or image (`.iso` or raw MODE1/2352 `.bin`), it is
  validated (`INSTALLED_REQUIRED = base.cmo, 3D Entities/Menu.nmo, Level_01.NMO`; CD = `data\d*.(hdr|cab)`)
  and imported into OPFS namespace `openballance-data`; skips program folders (BIN, BUILDINGBLOCKS,
  MANAGERS, PLUGINS, RENDERENGINES, HELP); a hidden marker `.openballance-import.json` is written last so
  incomplete imports are detected.
- Saves in IndexedDB namespace `openballance`. Query params: game params pass through
  (`/play/?unlockall=1`), plus `hashframes=N` (run N frames on virtual time and print the same
  `frames=... video_fnv32=... audio_fnv32=...` line as `gasm-run --headless`, exposed as
  `globalThis.__openballanceResult`), `autoplay`, `main` (force main thread).

## 4. Technical knowledge that generalizes

### Virtools CK2 2.1 file format (`.cmo` / `.nmo`)
- 64-byte header (`Nemo Fi`), zlib'd header1 (object table + plugin GUID deps), zlib'd data: manager
  chunks then one `CKStateChunk` per object. Chunk = u32 version
  (`dataVer | classId<<8 | chunkVer<<16 | options<<24`, chunkVer = 7), u32 dword count, payload, optional
  ID / sub-chunk / manager lists (options 1/4/2). Inside the payload fields are grouped under
  **identifiers** forming a linked list `[id, next index, fields...]`; readers `ck_seek(&r, id)`.
- Object references in chunks saved with option 8 are indices into the file's object table.
- `CKObject::Load` (0x24021053): id `0x4` -> hidden, `0x18` -> hierarchically hidden (0x200), neither ->
  visible (0x40). `CKBeObject`: `0x800` scripts, `0x10` attributes, `0x40` priority.
- Behavior (id `0x20`): flags; `0x8000` prototype GUID+version; `0x4` priority; `0x10` compatible class;
  `0x40000` target. Save-mask order: sub-behaviours (0x100), links (0x80000), param ops (0x4000), pIn
  (0x200), pOut (0x400), locals (0x20000), inputs (0x800), outputs (0x1000).
- ParameterIn id `0x1000` direct source / `0x2000` shared; Param value modes: 0 sub-chunk, 1 buffer, 2 object
  ref, 3 none; four legacy GUIDs remapped. **ParameterLocal id `0x200` = "myself" parameter**
  (`SetAsMyselfParameter` 0x240095a6): its value is the owner behaviour's object (missing this broke all
  checkpoints, commit `139f665`).
- Inventory of Ballance: 4,469 behaviour nodes; 184 distinct BBs in 3,885 BB nodes (530 `Op`), 584 graph
  nodes. Top DLLs: Logics 62 BBs/1,800 uses (`Get/Set Cell` 350), TT_Toolbox_RT 28/264, Visuals,
  Narratives, physics_RT 14/196, Controllers (Key Event 170), Interface (2D Text 110).
- Levels carry no scripts; semantics come from **group names** the gameplay scripts iterate:
  `Phys_Floors`, `Phys_FloorRails`, `PS_Levelstart`, `PE_Levelende`, `PC_Checkpoints`, `PR_Resetpoints`,
  `Sector_NN`, `P_Modul_NN`, `P_Ball_*`, `P_Trafo_*`, `P_Extra_*`, `Sound_HitID_NN`, `Sound_RollID_NN`,
  `Shadow`, `DepthTestCubes`. Each `P_*` group is instantiated from the matching `PH/P_*.nmo` prefab.
- `base.cmo`'s `Level` object owns nine top-level scripts (`Loading_Manager`, `Default Level`,
  `Event_handler`, `Level_Init`, ...).

### Virtools behaviour engine semantics (`docs/ck-runtime.md`, from CK2.dll 0x24000000)
- **Frame** (`CKBehaviorManager::Execute` 0x2400c40c): (1) for each object with scripts in registration
  order, apply pending activation requests (flags `0x10400000` -> Activate(active, reset), clear
  `0x10c00000`); (2) for each object, execute each active script in script order.
- **Activate(active, reset)**: reset clears link delays to initial, empties the delayed list, recursively
  deactivates sub-behaviours, deactivates IOs, flags `&= 0xef3fffbf |= 0x80000000`; a script activates its
  input 0.
- **Execute**: BBs (`flags & 0x8`) call the prototype function; return bit 0 clear (`CKBR_OK`) deactivates,
  `CKBR_ACTIVATENEXTFRAME` (1) keeps active. Graphs: *Prepare* (fire active source IOs; delay 0 ->
  activate destination now, else queue with current delay), rebuild an execution stack (sub-behaviours
  last to first, so the first is on top); *Loop* (pop, execute, propagate outputs; zero-delay links
  activate the destination and insert its owner into the stack **by priority**; bounded by
  `BehaviorMaxIteration`, "Infinite Loop Detected"); *End* (decrement queued delays, fire at < 1; graph
  stays active if links remain queued or any child has flags 0x41).
- Net rule: delay-0 link fires within the same frame; delay *n* fires *n* frames later; a behaviour
  activated through a delayed link runs the frame after the link fired.
- **Parameters are pulled**: reading a parameter whose source is an operation output runs the operation
  first (`DoOperation` 0x240098bb). Op without a function copies input 1.
- **pOut propagation is recursive**: `CKParameterOut::DataChanged` forwards through destination chains
  (graph output exporting an inner one forwards to its own destinations). One hop only broke transformers
  (commit `3483df7`); fixed depth-limited recursion in `src/ck/ck_param.c`.
- `CKDataArray::SetElementValueFromParameter` on a parameter column goes through `CopyValue` which requires
  compatible types (CK2 0x2400824d); without the check a bool landed in a float cell and score drained at
  60/s instead of 2/s (commit `a60bef7`).
- `Show` on a `CKGroup` shows its members, with Hierarchy recursing into 3D and 2D children (Visuals
  FUN_257815c0); missing -> HUD invisible (`a60bef7`).
- `Restore IC` used 54x: initial-condition save/restore of objects must exist (`ck_read_object_state`,
  `CKScene::SetObjectInitialValue`).
- **RNG**: msvcrt `rand()` LCG `seed = seed*214013 + 2531011; return (seed>>16) & 0x7fff` (`src/ck/ck.h`
  `ck_rand`). One stream shared by all BBs, so BB execution order matters for determinism
  (`docs/particles.md` sec. 10).
- Registry: installer settings under `HKLM\Software\Ballance\Settings` emulated by a callback
  (`Language` from launch param, default 1 English) in `src/app.c`.
- Deferred-command pattern in physics_RT BBs: constraint/force/listener BBs enqueue a 16-byte command that
  is retried every frame until bodies exist; lets scripts create a hinge before physicalizing.

### Ipion (IVP) physics (`docs/physics.md`, `ivp_core.md`, `ivp_collision.md`, `ivp_contact.md`)
- No symbols, no RTTI; subsystem names inferred from call graphs, address clustering, constants and a few
  strings (`IVP_Handle`, `IVP_SurfaceBuilder_Ledge_Soup`, German OV-tree error "Mehr als 27 Kinder",
  profiler line `TOT ... COLL DYN UNIV CONTR INTEGR HULL SHORT CRITIC`, qhull tag `ipion 99/07/10`).
- Feel constants: 1 Virtools unit = 1 m; gravity game-set **(0,-20,0)** (manager default -9.81, IVP
  default +9.83); **time factor 2** (sim runs at twice real time); frame-time smoothing `s = (dt + 3s)/4`;
  fixed **PSI 1/66 s** (132 PSIs per real second); friction/elasticity combine by multiplication; damping
  `v *= exp(-d*dt)` (1-x for small args) +0.1 when calm; ball inertia 0.4 m r^2; control = fixed impulse
  per PSI along world axes; sleep test every 10-15 PSIs with random counter; anomaly limits 2000 m/s and
  pi/2 rad per PSI; contact distances 0.001/0.01/0.02/0.023/0.045/0.22.
- Ball radius 2; ball = type 3 with dummy zero ledge; concave floors = one 2-triangle "pancake" ledge per
  face; convex meshes = qhull hull ledge. Pair classes: single-ledge pairs -> plain mindist; multi-ledge ->
  OO watcher holding per-ledge-pair mindists. Recursive mindist never instantiated (root hull disabled):
  port as assert.
- Hot path: ball vs floor triangle ledges (minimize BF/BK/BP, backside pierce walk; event solver cases).
- Ball-ball synapse order used the entity *pointer* value: port needs a deterministic replacement (CK id).
- **Precision**: x87 with 64-bit mantissa during simulation (event loop sets PC). Port uses f64 for
  intermediates, f32 exactly where the original stores f32. "Deterministic, not bit-exact, and nothing
  can be." Inverse-sqrt bit-trick seeds + 4-5 Newton steps are accurate to 3e-16, so `1/sqrt` suffices.
  `mov [0],0` is IVP's assert.
- Port strategy chosen: option (a) faithful staged port (glue -> core/integration -> ball on ledges ->
  convex -> constraints -> listeners), with hybrid (c) (own discrete collision feeding ported friction
  and impact solvers) as fallback. Custom engine (b) rejected because seams/rails/rest jitter would feel
  wrong. Load-time parts (qhull, compact-ledge builder) replaced by own builders producing the same
  structures.

### Rendering on gasm (`src/render/render.c`, `design/gasm-gfx-requirements.md`)
- Target is D3D7/8 fixed function on gasm gfx (WebGPU-style JSON descriptors, WGSL). One WGSL shader with
  uniforms `Frame {viewproj, ambient, fog, lights[8], eye}` and `Draw {world, diffuse, emissive, params,
  ambient, vp, spec}` via dynamic offsets into a per-frame uniform ring; texture+sampler bind group per
  material stage; pipeline cache keyed by (blend, Z test/write, cull, alpha test, fog, stage count).
- Per-vertex D3D7 lighting: emissive + ambient*mat ambient + sum diffuse*N.L*attenuation (point/spot
  `1/(a0+a1 d+a2 d^2)` within range, spot falloff). Fog linear/exp/exp2 from eye distance. Specular
  (local viewer, `(N.H)^power`) added after the texture stage only when material specular non-black and
  power > 0 (commit `fd4a1f6`: "the rails shine again").
- **WGSL matrix gotcha**: row-vector matrices uploaded as-is read as their transpose, so `M * v` computes
  `v * M` (comment at top of `render.c`).
- Non-sRGB surface: DX8 blends in gamma space; don't use `-srgb` formats.
- Colour-keyed textures converted to alpha in the guest; mipmaps generated in the guest (WebGPU has none).
- Movie texture: `atari.avi` is Microsoft Video 1 (CRAM), decoded per frame into a 256x256 texture via
  `write_texture` (`src/movie.c`).
- Depth bias for decal shadows; `DepthTestCubes` depth-only pass (`writeMask: 0`); sky rendered first
  (TT Sky builds its own mesh: `docs/sky.md`); particles drawn last in blended pass, depth test on, write
  off.
- 2D: text via a post-render hook per 2D entity in Z order (`docs/fonts.md` sec. 7); 640x480 logical
  render context, quads scaled; text is bytes (cp1252), umlauts index the glyph table directly.
  `-0.25 px / +0.25 texel` D3D pixel-centre offsets (keep the UV one to avoid neighbour-cell bleeding).
- 4:3 picture pillarboxed via `set_viewport`/`set_scissor_rect`; mouse mapped from drawable pixels into
  the 640x480 context using the same letterbox math (`src/app.c read_input`).
- GPU objects must be freed (`gpu_destroy`) for destroyed textures/meshes, replaced textures and grown
  buffers, else memory grows per level (commit `353bc4a`).
- Fonts: Arial / Arial Black system fonts used by debug text need metric-compatible substitutes
  (Arimo/Liberation); visible game text is the `Font_1.tga` bitmap font with a glyph table `float
  g[256][6]` filled from a data array.

### Audio
- Guest mixer (`src/audio.c`, `src/ck/ck_sound.c`): PCM16/8 WAV mono/stereo 11-48 kHz decoded by the
  guest; output 44.1 kHz stereo float, 735 frames per 60 Hz frame pushed with `gasm_audio_push`.
- CKSound chunk ids: `0x1000`/`0x100000` file name, `0x400000` flags, priority, gain, pan, pitch (+3D
  settings).

### Input
- gasm 0.5 raw mode (`GASM_INPUT_KEYS_RAW`), `gasm_key_state` bits keyed by W3C `KeyboardEvent.code`
  mapped to **DirectInput DIK scan codes** (table `DIK_OF` in `src/platform_gasm.c`, reused verbatim by
  openi76). This makes in-game key rebinding work as in the original.
- Gamepad mapped onto DIK codes (d-pad arrows, A/Start Enter, B Esc, X Space, L/R LShift, Y Q, Select F1).
  Without a keyboard, typed text characters press their key for one frame.
- Pointer: `gasm_pointer` (x, y floats + buttons at +32), cursor visibility through
  `GASM_INPUT_POINTER_HIDDEN` following the game's `Show Mouse Cursor`.
- Before gasm 0.5: a keymap file (`keymap.txt`) mapped keys to 12 pad buttons; deleted in `9bcd96d`.
- Escape: tap goes to the game, hold ~1 s quits the runner (browser fullscreen eats Esc).

### Timing
- `gasm_set_frame_rate(60)`; every frame `ck_process(&ctx, 1000.0f/60)` (fixed 16.67 ms). Physics then
  integrates smoothed dt x 2 in fixed 1/66 s PSIs with interpolated write-back. Deterministic headless
  hashes (`video_fnv32`, `audio_fnv32`).

### Saves and FS
- `Database.tdb` (TT_DatabaseManager arrays: settings, highscores) via `gasm_storage_get/set`; before the
  first save the installer's copy in the game data is read (`load_user` fallback in `src/app.c`). Save
  errors decoded (`GASM_STORAGE_ERR_KEY/SIZE/QUOTA/IO`) and logged (`353bc4a`).
- VFS: host folders, ISO 9660 images, InstallShield cabinets (`src/iscab.c`, layouts from unshield docs,
  checked against Ballance's `data1.hdr` version 0x0100600c = major 6; per-file DEFLATE via own
  `src/inflate.c`, MD5 checked). Mount order in `mount_game`: folder assets (installed or CD folder with
  cabinets) then the `rom` asset (ISO -> cabinets).
- Path normalisation: `\` -> `/`, `.`/`..` resolved (original runs from `Bin\`, so `..\x` names the game
  folder; leading `..` dropped). gasm runners fold case for folder assets.
- `--asset-dir` keeps every file open: "Too many open files" -> `ulimit -n 4096` or use the image.
- `gasm_asset_read_at` takes u32 offsets; reads chunked (<= 1 GiB per call).

## 5. Lessons learned / pitfalls

1. **Run the original scripts, don't translate them.** 4,469 nodes would have meant silently re-deriving
   Virtools scheduling (link delays, priorities, parameter pull) per graph. Porting the scheduler from
   CK2.dll once + 184 BBs bounded the work (`design/analysis.md` sec. 2).
2. **Port the scheduler first, then build a tracer.** "Subtle ordering bugs will look like gameplay bugs"
   (analysis risk 2). `run_test` with `TRACE_FROM` and missing-BB listing is the main debugging tool.
3. **Post-release bugs were all CK2 semantics, not BB logic**: myself-parameters (`139f665`: no checkpoint
   ever fired, level 3 turnstiles never activated), recursive pOut propagation (`3483df7`: transformer
   exploded the old ball and placed no new one), typed CopyValue into data arrays (`a60bef7`: score fell
   30x too fast), group Show recursion (`a60bef7`: HUD missing). Lesson: when a gameplay feature silently
   fails, inspect the generic runtime semantics around the failing graph.
4. **Decompiler vs disassembly**: for x87 float code and stack-merged slots the disassembly wins
   (`docs/gameplay_bbs.md` intro, `docs/fonts.md`). Ghidra didn't create functions at vtable targets;
   run a MakeFunctions script.
5. **Bit-exact physics vs x87 is not achievable**; aim for deterministic f64 with f32 rounding at stores
   (`docs/ivp_core.md` 0.2). Validation plan: record trajectories from the original under Wine/VM (still
   an open gap in status).
6. **Pointer-dependent ordering** in the original (ball-ball synapse by entity address) must be replaced
   by a stable key.
7. **Uninitialised stack reads in the original** (particle BBs with pins missing read garbage) need a
   documented sane choice (`docs/particles.md` "Uncertain").
8. **Wait for the runtime rather than hacking around it**: the port drove gasm gfx v1 with a formal
   requirements doc (R1 textures/samplers, R2 explicit layouts + dynamic offsets, R3 viewport/scissor/
   depth bias, R4 text input, R5 lazy assets / worker gfx) and kept a software-rasterizer fallback only as
   contingency. All landed in gasm 0.4.0 (`5cd7788`).
9. **Keymap workarounds are throwaway**: once gasm got raw keys (0.5), the keymap file, launcher
   `--keymap` flags and the player's layout editor were deleted (`9bcd96d`, -253 lines). Prefer asking
   the runtime for the real capability.
10. **Free GPU objects** or older runners trap / memory grows; bump minimum runner when adopting a new
   import (`353bc4a`: older runners trap at `gpu_destroy` when a level starts, documented in
   troubleshooting).
11. **Stack size**: wasm default 64 KiB is too small for level loading; link with 1 MiB.
12. **Release tags without `v`**: workflow only triggers on `X.Y.Z` (`8a15bad`).
13. **Original quirks kept but bounded**: e.g. TT Sky's second `On` leaks a duplicate sky; port may destroy
   the old one since the game only fires once (`docs/sky.md` sec. 8). Level 1 starts facing away from
   the track: that's the original (troubleshooting page).
14. CD data hidden in InstallShield cabinets: supporting "point at the CD" needs a cab reader in addition
   to ISO 9660; verify with `cab_test` that every cabinet file equals the installed copy.

## 6. Reusable checklists / procedures

### Porting a script-driven engine game (Virtools-like)
1. Identify the engine version and how much native game code exists (Ballance: almost none).
2. Write a Python reader for the container format + graph dumper; dump all graphs to text.
3. Inventory every BB/opcode by GUID with use counts; map GUID -> DLL -> execute/callback address.
4. Port the scheduler/VM from the engine DLL with addresses; write a spec page.
5. Run the boot script headless with stub BBs; log which BBs fire and which are missing.
6. Implement BBs in usage order (Logics -> Narratives/Visuals/Interface -> Controllers/Sounds -> TT_*),
   one C file per original DLL, each `BB_DECL` checked against the map by script.
7. Physics/renderer last-mile: spec first, then staged port with a playable milestone each stage.
8. Probes as env vars in the headless runner (watch params, dump arrays/groups, force cells, move
   entities, send messages).

### Release procedure (`docs/howto/release.md`)
1. Set version in `CMakeLists.txt` `project(... VERSION X.Y.Z)`; commit.
2. `git tag X.Y.Z && git push origin X.Y.Z` (no `v`).
3. Workflow builds wasm, packages 4 platforms with `tools/package-gasm.sh`, smoke-tests macOS + Linux,
   publishes with checksums.
4. Keep `GASM_VERSION` (`tools/fetch-gasm-sdk.sh`) and `@emdzej/gasm-host` (`docs/package.json`) in step.

### Headless screenshot recipe
`gasm-run build-gasm/openballance.wasm --rom Ballance.iso --headless 2072 --no-hash --input
"1000-1005:A,1150-1155:A,1750-1755:Y,1900-2400:DOWN" --screenshot level1.png`; level N via
`--param unlockall=1` and DOWN N-1 times before frame 1150.

### Browser player checklist
- Worker mode if WebGPU-in-worker, else main thread + preload; OPFS import with a completion marker
  written last; skip original program-code folders on import; saves in IndexedDB; `hashframes=N` parity
  with `gasm-run --headless`; game params via query string.

### Data-source checklist (CD-era games)
- Accept: disc image (ISO, raw 2352 BIN), mounted CD / folder copy, installed folder.
- Handle installer archives (InstallShield cabs) natively; verify against an installed copy.
- Case-insensitive lookup; normalise `\`, `.`, `..` relative to the original's working dir.
- Clear "game data not found" message with exit 1 (smoke-tested in CI).
