---
name: encore-gasm-backend
description: Builds the gasm WebAssembly backend for a C/C++ reimplementation of an old PC game - fetch script pinning GASM_VERSION and wasi-sdk 34 (wasm32-wasip1), a CMake native|gasm switch with gasm_add_game, 1 MiB stack, the platform.h contract with platform_gasm.c as the only includer of gasm.h, the frame model (state machines per gasm_frame, or gasm_main + gasm_wait_frame via Asyncify/stack switching, or init/frame/exit split), assets via --asset-dir/--asset cd=image with case-insensitive lookup and 64-bit positioned reads, storage namespaces, catch-up frames, capability probing with gasm.has, a native build for tools and sanitizers, and version-pin bumps. Use when scaffolding a new port's runtime layer, converting a blocking Win32 main loop, wiring data loading or saves, debugging traps, or upgrading the gasm pin.
---

# ENCORE gasm backend

gasm runs one wasm32 module natively (`gasm-run`), in browsers and headless in Node with bit-identical state. The ENCORE ports all share one backend shape. This skill sets it up.

## When to use

- Scaffolding a new port (after the target binary is identified).
- Converting the original's `WinMain`/message pump/nested loops to gasm's runner-driven frames.
- Adding data loading, saves, launch parameters, input mode or audio configuration.
- A trap, silent memory corruption or a "game data not found" problem.
- Bumping `GASM_VERSION`.

## Inputs

- The core sources in C11 (or vendored C++), already free of Win32 calls behind a `platform.h` contract.
- The sibling project to copy from (OpenCMR2 is the usual template: `tools/fetch-gasm-sdk.sh`, `src/platform_gasm.c`, `src/vfs.c`).
- The original's timing model (tick rate, loop shape) from the architecture notes.

## Procedure

### 1. Pin and fetch the toolchain

`tools/fetch-gasm-sdk.sh` sets `WASI_SDK_VERSION=34` and `GASM_VERSION=<x.y.z>` (one pin for SDK and runner), downloads `wasi-sdk-34.0-<plat>.tar.gz` and `https://github.com/emdzej/gasm/releases/download/$V/gasm-c-sdk-$V.zip` into `.deps/`, writes `.deps/gasm-c-sdk/VERSION` so a pin bump re-fetches, and strips macOS quarantine. Add Binaryen `wasm-opt` if you will build `LOOP`. Mirror the pin as `@emdzej/gasm-host` in `docs/package.json`. `tools/fetch-gasm-runner.sh <platform>` downloads the released `gasm-run` (with ANGLE for `gasm:gl`).

### 2. CMake switch

```cmake
set(OPENX_PLATFORM native CACHE STRING "Platform: native or gasm")
if(OPENX_PLATFORM STREQUAL "gasm")
  include(Gasm)
  gasm_add_game(openx ${CORE_SRC} src/app.c src/platform_gasm.c)   # add LOOP [THREADS] for an own loop
  target_compile_options(openx PRIVATE -O2 -ffp-contract=off)
  target_link_options(openx PRIVATE -Wl,-z,stack-size=1048576 -Wl,--strip-debug)
  return()
endif()
# native: static core + host backend (platform_host.c, vfs_host.c) + tests + tools
```

```sh
tools/fetch-gasm-sdk.sh
cmake -S . -B build-gasm -DOPENX_PLATFORM=gasm -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_TOOLCHAIN_FILE=.deps/gasm-c-sdk/cmake/gasm-toolchain.cmake -DWASI_SDK_PREFIX="$PWD/.deps/wasi-sdk"
cmake --build build-gasm
```

Add `${GASM_GL_SOURCE}` for GLES 3 via `gasm_gl.c` (not if you provide your own GL 1.x entry points), `${GASM_VFILE_SOURCE}` for `FILE*` over assets.

### 3. Write the backend file

`src/platform_gasm.c` is the only file that includes `gasm.h`. Start from `references/platform_gasm-skeleton.c`. It must:

- `GASM_TITLE("<Game>")`.
- Export `gasm_abi_version` (return `GASM_ABI_VERSION`), `gasm_init`, `gasm_frame`, `gasm_exit` with `GASM_EXPORT("…")`.
- In `gasm_init`: `gasm_set_frame_rate(<original tick rate>)`, `gasm_audio_config(<rate>, 2)`, `gasm_input_mode(GASM_INPUT_KEYS_RAW [| POINTER_HIDDEN])`, mount data, and on failure log "<Game>: game data not found. Pass …" and return 1.
- In `gasm_frame`: read pads/keys/pointer once, run one app frame, push audio for elapsed runner time.
- On game quit: `app_exit(); __wasi_proc_exit(0);`.

### 4. Choose the frame shape

| Original loop | Shape | Build |
|---|---|---|
| already one frame per idle pass, or loops easy to step | state machines: each blocking loop becomes a state whose step is one old iteration; `app_frame` steps until one presents | plain `gasm_add_game` |
| many nested blocking loops, modal dialogs | define `gasm_main()`, keep loops, end each frame with `gasm_wait_frame()` | `gasm_add_game(t LOOP …)` → `t.wasm` (Asyncify) and `t-run.wasm` (stack switching) |
| original threads that must keep their structure | as above with cooperative threads | `LOOP THREADS` (no `-run.wasm`; 256 KiB Asyncify buffer per thread) |
| source port with `while (mainLoop());` | cut `WinMain` into init / one pass / exit | plain |

Keep the number and order of presents and clock reads. Never add a blocking loop.

### 5. Wire data

- Folder: `--asset-dir <dir>` (names `/`-separated, ASCII case-insensitive). Image: `--asset cd=<image>` and mount ISO 9660 (2048, raw 2352 MODE1/MODE2) yourself over `gasm_asset_read_at64`, looping short reads. Reject `.cue` with guidance.
- Mount order: image asset first if present, else per-file assets. All core access through `vfs.h`; normalise `\` to `/`, `.`/`..`, double separators, relative to the original's working directory.
- Launch parameters: `gasm_param`. Optionally `setenv` them so core `getenv` works.

### 6. Wire saves

- `gasm_storage_get/set`; keys 1-128 bytes of `[A-Za-z0-9._-]`, values ≤ 1 MiB. Decode and log `GASM_STORAGE_ERR_KEY/SIZE/QUOTA/IO`.
- Namespace = module file name: always ship `open<game>.wasm` under that exact name.
- Seed first-run saves from the game's own default files where the original did.

### 7. Catch-up frames and capabilities

- Skip drawing when `gasm_gl_frame_shown()` returns 0 (or `gasm_gfx_begin_frame` returns 0), but keep any game logic the draw path runs.
- Probe newer imports with `gasm_has("gasm.set_title", 14)` style calls before use; put hard requirements in the manifest's `requires` and raise the documented minimum runner when you adopt a new import.

### 8. Keep the native build

Same core, host backend, 64-bit: `_Static_assert` original struct sizes under `#if UINTPTR_MAX == 0xffffffffu`; keep data offsets, not host pointers; parse files with explicit byte reads. Use it for tests on real data, tools, profilers, ASan/UBSan.

## Hard rules

- Only `platform_gasm.c` includes `gasm.h`; only the GL back end calls GL.
- No `fopen`/`opendir` in the core; no wall clock in the simulation; no threads or blocking loops in the core.
- Link with `-Wl,-z,stack-size=1048576`: the 64 KiB default overflows silently into data.
- `-mexec-model=reactor` is link-only (`gasm_add_game` handles it).
- The module must exit 1 with "game data not found" when data is missing; CI asserts it.

## Pitfalls

- "indirect call type mismatch": a function-pointer cast with the wrong signature. Use a typed wrapper.
- wasm has no `setjmp`/`longjmp` (without EH): rewrite code that uses them.
- Asyncify rules: yield through an indirect call; `--asyncify` before `-O2`; `gasm_loop_frame` on the remove list; `--wrap=exit`. Let `gasm_add_game(LOOP)` do it.
- Line-buffer stdout (`setvbuf(stdout, NULL, _IOLBF, 0)`).
- Too many open files with `--asset-dir` on older runners: `ulimit -n 4096` or use the image.
- Upload textures as RGBA8; RGB8/L8/LA8 stall ANGLE 10-60 ms.
- Per-draw full GL state is ~60 calls/draw: add a state cache and partial uploads from day one.
- Pin bumps change host APIs (`GasmWorker.frames` became `FrameStep`s in 0.6.0; 0.4.0's worker imports `webgpu-gfx.js`). Read the CHANGELOG, re-vendor, re-test the browser.
- When gasm lacks something, write a requirements doc for the runtime repo (acceptance criteria, numbers from real runs) and label any interim workaround for removal.

## Verification

```sh
RUN="$(tools/fetch-gasm-runner.sh macos-universal)/gasm-run"
$RUN build-gasm/openx.wasm --headless 10 ; echo "exit=$?"            # no data: message + exit 1
$RUN build-gasm/openx.wasm --asset cd=GAME.ISO --headless 600       # hash line
$RUN build-gasm/openx.wasm --asset-dir cd --headless 600            # same line
npx -p @emdzej/gasm-host gasm-headless build-gasm/openx.wasm --asset-dir cd --headless 600   # same line
node -e 'const fs=require("fs");console.log(WebAssembly.Module.imports(new WebAssembly.Module(fs.readFileSync("build-gasm/openx.wasm"))).map(i=>i.module+"."+i.name).join("\n"))'
$RUN --info build-gasm/openx.wasm
```

All imports must come from `gasm`, `gasm:*` or `wasi_snapshot_preview1`.

## Further reading

- https://encore.emdzej.pl/guides/gasm
- https://encore.emdzej.pl/guides/platform-layers
- https://encore.emdzej.pl/guides/shipping
- https://github.com/emdzej/gasm/blob/main/spec/ABI.md
