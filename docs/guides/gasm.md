---
title: Building for gasm
---

# Building for gasm

Every ENCORE project ships as one WebAssembly module that runs on [gasm](https://gasm.emdzej.pl): natively through `gasm-run` (wasmtime with wgpu or ANGLE), in browsers, and headless in Node, with bit-identical game state. This page covers what gasm provides and what it deliberately does not, how a 1990s Windows main loop maps onto gasm's runner-driven frames, how game data reaches the guest, the C toolchain the projects use, the one-backend-file rule, the native build kept alongside for tools and sanitizers, performance, and how to work with the runtime as it evolves. The authoritative reference is gasm's [`spec/ABI.md`](https://github.com/emdzej/gasm/blob/main/spec/ABI.md); this page records how the ports use it.

## What gasm is

- A portable game runtime: each game is compiled once to a wasm32 module (the *guest*); thin per-platform *runners* implement a small, stable core-wasm import ABI with no Component Model.
- Status: "experimental proof of concept". The ABI version is still 0; additions keep it at 0 because runners link unknown imports as traps, and guests probe for newer imports with `gasm.has`.
- Sandboxed: no filesystem, environment or arguments; every pointer and handle validated (a violation traps the guest, never crashes the runner); network and saved files go through player consent.
- Determinism across runners is the core property. Headless, `time_ms` and the WASI clocks are virtual and `random_get` is a fixed sequence. See [Determinism and verification](/guides/verification).
- The base wasm features are what current clang emits by default. No threads, SIMD or exception handling in the baseline; opt-in real threads arrived in 0.14.0 but make runs nondeterministic.

## The ABI in brief

| Kind | Name | Notes |
|---|---|---|
| export | `gasm_abi_version()` | must return 0 |
| export | `gasm_init()` | 0 = ok; set frame rate and audio, load assets |
| export | `gasm_frame()` | one simulation and render step; never re-entrant |
| export (opt) | `gasm_run()` | own-loop game, for runners that switch stacks |
| export (opt) | `gasm_exit()` | player quits: flush saves |
| custom section | `gasm.title`, `gasm.manifest` | default window title; capabilities |
| import | `gasm` | log, time, frame rate, 2D video, audio push, pads, raw keys, pointer, gamepads, assets, params |
| import (opt) | `gasm:gl` **or** `gasm:gfx` | OpenGL ES 3.0 with WebGL 2's rules, or a WebGPU subset; never both |
| import (opt) | `gasm:net`, `gasm:storage`, `gasm:fetch`, `gasm:media`, `gasm:clipboard`, `gasm:files` | WebSocket, key/value saves, HTTP, streamed audio, clipboard, files for the player |

Conventions to know: variable-size results return the full length and copy only if it fits (call with `cap = 0` first); `-1` means "not there"; misuse traps.

## The frame model

The runner calls `gasm_frame` at the rate set by `gasm_set_frame_rate` (default 60, range 1–1000) on a fixed timestep independent of display refresh. Input is sampled before each call and is stable within it; `time_ms` is fixed within a frame. The runner may run several frames back to back to catch up and show only the last — `gl.frame_shown()` and `gfx.begin_frame` return 0 on those frames so the guest can skip drawing.

Original games block: `while (PeekMessage…) { Input_Poll(); Game_Frame(); }`, nested menu loops, modal dialogs, `Sleep`. The projects use three shapes.

| Shape | How | Used by |
|---|---|---|
| State machines per `gasm_frame` | each blocking loop becomes a state whose step is one iteration of the old loop; `app_frame` polls, steps, repeats until a step presents | [rf](/games/rf) (`STEP_FRAME \| STEP_AGAIN \| STEP_DONE`), [sheep](/games/sheep), [gta](/games/gta) (`game_run_begin/step/end`), [cmr2](/games/cmr2) (its `WinMain` already runs one frame per idle pass), [nfspu](/games/nfspu) (`src/app.c`) |
| Own loop with `gasm_wait_frame` | define `gasm_main()`, keep the blocking loops, call `gasm_wait_frame()` once per frame; built with Asyncify (`game.wasm`, any runner) and as `game-run.wasm` (stack switching: wasmtime async, JSPI in Chromium and Node 24+) | [oni](/games/oni) (every loop ends in `plat_wait_frame()`), [nfspu](/games/nfspu) (`LOOP THREADS`, so the network library's threads run as cooperative threads) |
| Entry point cut in three | everything before the loop from `gasm_init`, one pass per `gasm_frame`, shutdown from `gasm_exit` | [bv](/games/bv) (`bv2_gasm_init`, `paint()`, `bv2_gasm_exit`) |

[oni](/games/oni) chose its own loop as "closer to the original and cheaper to port", and nested modal dialogs then work naturally. [rf](/games/rf) and [cmr2](/games/cmr2) chose state machines; gasm's own guidance is that Asyncify costs size and speed and per-frame callbacks or state machines are preferable for new code. [nfspu](/games/nfspu) measured the `LOOP THREADS` build at 1.38 → 1.74 MB and about 6% CPU, with the same hashes ([`e942f36`](https://github.com/emdzej/opennfspu/commit/e942f36)).

Whatever the shape, keep the number and order of presents and clock reads the original had, and **never add a blocking loop** — loading inside a state update is fine because the runner waits for the frame.

::: warning Asyncify rules
Each of these has been a bug ([`gasm_loop.c`](https://github.com/emdzej/gasm/blob/main/sdk/c/src/gasm_loop.c)): yield through an indirect call; run `--asyncify` before `-O2`; put `gasm_loop_frame` on the remove list; instrument nothing between an unwind and `asyncify_stop_unwind`; wrap `exit` (`--wrap=exit`) when static destructors could yield. Asyncify does not save `__stack_pointer`; the cooperative scheduler does it per thread. `gasm_add_game(... LOOP ...)` handles all of this.
:::

## Game data: assets, not files

There is no filesystem. Assets are a flat, read-only name → bytes map chosen by the launcher, read with positioned reads straight into guest memory and never preloaded natively.

- `--asset-dir [prefix=]dir` exposes every regular file recursively as `/`-separated names. Lookup is **ASCII case-insensitive**; exact names win; explicit `--asset` entries override folder entries.
- `--asset cd=GAME.ISO` passes a disc image as one asset; the guest mounts ISO 9660 itself over `gasm_asset_read_at64` ([cmr2 `src/platform_gasm.c`](https://github.com/emdzej/opencmr2/blob/main/src/platform_gasm.c)). [rf](/games/rf) and [sheep](/games/sheep) also accept raw MODE1/2352 `.bin`; `.cue` files are refused with a helpful message.
- Sizes are 64-bit. `asset_size` reports −2 at 2 GiB and over; [gta](/games/gta) needs `asset_read_at64` for its 58 MB music tracks streamed in 64 KB reads, which is why 0.6.0 is its minimum.
- `--asset-dir` keeps files open lazily (at most 64 at a time in current gasm); [ballance](/games/ballance) documents "Too many open files" with older runners (`ulimit -n 4096` or use the image).
- Saves go to `gasm:storage`. The namespace is the module's file name, so every project ships its module under one fixed name (`opencmr2.wasm`, `opennfspu.wasm`) to share saves between desktop and browser.
- Launch parameters arrive through `gasm_param` (`--param k=v`, or the URL query in the browser). [rf](/games/rf) puts them into wasi-libc's `setenv` so the core's `getenv` works unchanged.

All core file access goes through one `vfs.h` (no `fopen` in the core), with case-insensitive lookup, both separators, and original-relative path normalisation. See [File formats and game data](/guides/formats).

## Toolchain setup (C)

The projects use the gasm C SDK with wasi-sdk 34; the target is `wasm32-wasip1`. A fetch script pins one version for the SDK and the runner ([cmr2 `tools/fetch-gasm-sdk.sh`](https://github.com/emdzej/opencmr2/blob/main/tools/fetch-gasm-sdk.sh)):

- `WASI_SDK_VERSION=34`, `GASM_VERSION=0.16.1`; `--version` prints the pin.
- Downloads `wasi-sdk-34.0-<plat>.tar.gz` and `gasm-c-sdk-$V.zip` from gasm's releases into `.deps/`; writes `.deps/gasm-c-sdk/VERSION` so a pin bump re-fetches; strips the macOS quarantine attribute.
- [nfspu](/games/nfspu) and [oni](/games/oni) also fetch Binaryen `wasm-opt`, needed for `LOOP` builds.

CMake switches platform with one cache variable:

```cmake
set(OPENCMR2_PLATFORM native CACHE STRING "Platform: native or gasm")
if(OPENCMR2_PLATFORM STREQUAL "gasm")
  include(Gasm)
  gasm_add_game(opencmr2 ${CORE_SRC} ${GL_SRC} src/app.c src/platform_gasm.c ${GASM_GL_SOURCE})
  target_include_directories(opencmr2 PRIVATE src)
  target_compile_options(opencmr2 PRIVATE ${CMR2_WARN} -O2)
  target_link_options(opencmr2 PRIVATE -Wl,-z,stack-size=1048576 -Wl,--strip-debug)
  return()
endif()
```

```sh
tools/fetch-gasm-sdk.sh
cmake -S . -B build-gasm -DOPENCMR2_PLATFORM=gasm -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_TOOLCHAIN_FILE=.deps/gasm-c-sdk/cmake/gasm-toolchain.cmake \
  -DWASI_SDK_PREFIX="$PWD/.deps/wasi-sdk"
cmake --build build-gasm
```

`gasm_add_game(<target> [LOOP [THREADS]] srcs…)` ([`sdk/c/cmake/Gasm.cmake`](https://github.com/emdzej/gasm/blob/main/sdk/c/cmake/Gasm.cmake)) sets the `.wasm` suffix and include paths, adds `-fno-exceptions` for C++, links with `-mexec-model=reactor` (link-only: passing it with `-c` errors) and `-lm`. `LOOP` adds `gasm_loop.c`, `-Wl,--wrap=exit`, and writes both `<t>.wasm` (Asyncify) and `<t>-run.wasm` (stack switching). `LOOP THREADS` adds cooperative and POSIX threads on a deterministic scheduler, each costing its C stack plus a 256 KiB Asyncify buffer, and no `-run.wasm`.

Flags that matter:

- **`-Wl,-z,stack-size=1048576`.** wasm-ld's default stack is 64 KiB and an overflow silently corrupts the data below it, with no trap. [gta](/games/gta)'s map loaders and [ballance](/games/ballance)'s level loading keep large buffers on the stack.
- **`-Wl,--strip-debug`** in release; keep the name section when you want named wasm backtraces on traps.
- **Link-time wrapping** for vendored source: [bv](/games/bv) links with `-Wl,--wrap=fopen,remove,opendir,readdir,closedir,stat` so the original code calls its file API unchanged.
- **Line-buffer stdout** (`setvbuf(stdout, NULL, _IOLBF, 0)`) or log lines sit in the buffer.

## One backend file

`src/platform.h` is the contract the portable core sees: present, keys, pads, params, ticks, audio, storage, log. `src/platform_gasm.c` is the **only** file that includes `gasm.h` (about 270–400 lines in the projects). The GL back end is the only GL user. This keeps the core compilable natively, makes the platform surface reviewable in one file, and lets a later runtime or platform be a second backend.

A typical `gasm_init` ([cmr2](/games/cmr2), abridged from [`src/platform_gasm.c`](https://github.com/emdzej/opencmr2/blob/main/src/platform_gasm.c)):

```c
GASM_TITLE("Colin McRae Rally 2.0");

GASM_EXPORT("gasm_init") int32_t cmr2_gasm_init(void)
{
    gasm_set_frame_rate(APP_FRAME_HZ);
    gasm_audio_config(APP_AUDIO_RATE, 2);
    gasm_input_mode(GASM_INPUT_KEYS_RAW);
    init_keys();
    if (!mount_game()) {
        plat_log("OpenCMR2: game data not found. Pass the CD image (gasm-run opencmr2.wasm --asset cd=CMR2.ISO) "
                 "or the CD's files (--asset-dir <folder with data1.hdr, Game, FrontEnd>)");
        return 1;
    }
    return app_init() ? 0 : 1;
}
```

The "game data not found" path is load-bearing: CI and bundle smoke tests run the module without data and require that message and exit 1, not a crash. On quit, call `app_exit()` and `__wasi_proc_exit(0)`.

## The native build

The same sources build natively with a host backend (`platform_host.c`, `vfs_host.c`) for tools, headless tests on real data, profilers, and ASan/UBSan — important because wasm does not trap on use-after-free. The native build is 64-bit and wasm32 is 32-bit like the original, so:

- keep in-memory structs in the original layout with each field's offset commented, and `_Static_assert` sizes under `#if UINTPTR_MAX == 0xffffffffu` ([nfspu](/games/nfspu));
- keep offsets in data, not host pointers, behind accessors ([cmr2](/games/cmr2) PP_F models; [oni](/games/oni) 32-bit handles `slot << 24 | index`);
- parse file formats with explicit byte reads, never pointer casts.

libm may differ between the native and wasm builds; compare hashes within one target.

## Debugging

- Traps print a wasm backtrace with function names when the name section is kept.
- "indirect call type mismatch": a mismatched function-pointer cast; use a typed wrapper.
- wasm has no `setjmp`: [nfspu](/games/nfspu) rewrote the FERT expression evaluator without it.
- `gasm-run --profile out.json` samples every millisecond and writes Firefox Profiler format; `--gl-stats` prints GL calls per frame by name; `--info` prints the manifest and whether this runner can run the game.
- `node -e 'WebAssembly.Module.imports(…)'` lists imports; all must come from gasm modules or WASI.
- A frame-time logger behind a parameter (`--param frametime=1` in [cmr2](/games/cmr2) and [nfspu](/games/nfspu)) catches slow frames in a window, since headless clocks are virtual.

## Performance

- NES emulation in wasm costs 1.5× native on wasmtime Cranelift AOT and 1.6× on V8 (Apple M1 Pro, gasm README).
- Per-call host overhead is negligible at a few hundred calls per frame and not negligible for GL-heavy code. [cmr2](/games/cmr2)'s per-draw full state reapplication was about 60 GL calls per draw, 13,400 per frame; a state shadow sending only deltas cut it to about 900 and fixed browser frame skipping ([`0a0a3fc`](https://github.com/emdzej/opencmr2/commit/0a0a3fc)). See [Graphics, audio, input](/guides/platform-layers#gl-performance).
- Upload textures as RGBA8: ANGLE emulates RGB8, L8 and LA8 on Metal and D3D, and an upload took 10–60 ms ([`0722df1`](https://github.com/emdzej/gasm/commit/0722df1)).
- Hashing is not free: [gta](/games/gta) measured about 27 ms to hash a 2560×1920 frame; use `--no-hash` for performance runs.
- Measure before optimising: some "obvious" micro-optimisations were slower under gasm's JIT ([gta](/games/gta) [docs/hires.md](https://github.com/emdzej/opengta/blob/main/docs/hires.md)).

## Probing capabilities and minimum versions

`gasm_has("gasm:gfx", 8)` or `gasm_has("gasm.asset_size64", …)` probes an import before use; the capabilities manifest's `requires` list makes a runner that lacks something refuse the game up front. When a project adopts a new import, it raises its documented minimum runner: older runners trap at [ballance](/games/ballance)'s `gpu_destroy` when a level starts, which is recorded in its troubleshooting page ([`353bc4a`](https://github.com/emdzej/openballance/commit/353bc4a)).

## Ask the runtime, don't work around it

When a game needs something gasm lacks, the projects write a requirements document for the runtime repository and wait for it, rather than building a permanent workaround.

- [rf](/games/rf)'s [`design/gasm-host-requirements.md`](https://github.com/emdzej/openrf/blob/main/design/gasm-host-requirements.md): file-backed assets, `--asset-dir` with case-insensitive lookup, Worker mode with an OPFS provider, a second keyboard layout — with acceptance criteria and "numbers come from real runs". Implemented in gasm 0.3.0 ([`39830c7`](https://github.com/emdzej/gasm/commit/39830c7)).
- [ballance](/games/ballance)'s [`design/gasm-gfx-requirements.md`](https://github.com/emdzej/openballance/blob/main/design/gasm-gfx-requirements.md): textures and samplers, explicit layouts with dynamic offsets, viewport/scissor/depth bias, text input, lazy assets and Worker gfx, written for the agent implementing gasm (ABI changes start in `spec/abi.json`, both runners change together, validation errors trap). All landed in gasm 0.4.0 ([`5cd7788`](https://github.com/emdzej/gasm/commit/5cd7788)); a software-rasteriser fallback was kept only as a contingency.
- Workarounds that are needed meanwhile are temporary and labelled. [ballance](/games/ballance)'s keymap file and launcher flags were deleted (−253 lines) once gasm 0.5 had raw keys ([`9bcd96d`](https://github.com/emdzej/openballance/commit/9bcd96d)). [cmr2](/games/cmr2) and [nfspu](/games/nfspu) pushed silence after long frames to dodge a gasm-run 0.16.0 audio bug and dropped it when 0.16.1 fixed it upstream ([`d7ab36a`](https://github.com/emdzej/opencmr2/commit/d7ab36a), [`ecc247f`](https://github.com/emdzej/opennfspu/commit/ecc247f)).

## Version pins across projects

| Repo | `GASM_VERSION` |
|---|---|
| opencmr2, opennfspu, openoni, openi76 | 0.16.1 |
| opensheep | 0.16.0 |
| openbv | 0.13.0 |
| opengta, openrf, openballance | 0.6.0 |

One pin drives the SDK, the runner download and — kept in step by hand — `@emdzej/gasm-host` in `docs/package.json` for the browser player. On a bump, read gasm's [CHANGELOG](https://github.com/emdzej/gasm/blob/main/CHANGELOG.md) for host API changes and re-run the browser test: gasm-host 0.6.0 changed `GasmWorker.frames` to `FrameStep`s and the raw keyboard silently stopped reaching [rf](/games/rf) until the call changed ([`9492abc`](https://github.com/emdzej/openrf/commit/9492abc)); 0.4.0 made `gasm-worker.js` import `webgpu-gfx.js`, and without vendoring it the page never started ([`4f57aec`](https://github.com/emdzej/openrf/commit/4f57aec)). Shipping is covered in [Browser player, releases, docs](/guides/shipping).

## Checklist

1. Add `tools/fetch-gasm-sdk.sh` with a single `GASM_VERSION` and `WASI_SDK_VERSION=34`; mirror the pin in `docs/package.json`.
2. Add a `<P>_PLATFORM=native|gasm` CMake switch; build the gasm target with `gasm_add_game`, `-O2`, `-Wl,-z,stack-size=1048576`, `-Wl,--strip-debug`.
3. Write `src/platform.h`; make `src/platform_gasm.c` the only includer of `gasm.h`; set the title with `GASM_TITLE`.
4. In `gasm_init`: frame rate, audio config, input mode, mount data, and a clear "game data not found" with return 1.
5. Choose the frame shape: state machines, `gasm_main` + `gasm_wait_frame` (`LOOP`), or init/frame/exit split. Never add a blocking loop.
6. Route all file access through `vfs.h` over `gasm_asset_read_at64`; support folder and disc image; refuse `.cue` with guidance.
7. Ship the module under one fixed name so the storage namespace is stable.
8. Keep the native build of the same core for tests, tools and sanitizers; assert 32-bit struct layouts.
9. Skip drawing on catch-up frames via `frame_shown`/`begin_frame`.
10. Put a GL state cache and partial uploads in from the start; upload RGBA8.
11. When gasm lacks something, write a requirements doc for the runtime with acceptance criteria; label any interim workaround and remove it on upgrade.
12. On every pin bump: read the CHANGELOG, re-vendor, re-run hashes, the browser test and bundle smoke tests.
