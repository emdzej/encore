# gasm (game assembly): research notes

Source: `/Users/mjaskols/Projects/my/gasm` at `e9ec41e` "Release 0.16.1" (2026-11-03), 114 commits. These notes come from a read-only pass over AGENTS.md, README.md, CHANGELOG.md, spec/, design/, sdk/, runners/, site/ and the sibling ports (opencmr2, opennfspu, opengta, opensheep, openbv).

## 1. What it is

- **One line:** a portable game runtime. Each game is compiled once to a single wasm32 `.wasm` (the **guest**). Thin per-platform **runners** implement a small, stable, core-wasm import ABI (no Component Model). The same module runs natively (wasmtime + wgpu/ANGLE), in browsers (WebAssembly + WebGPU/WebGL 2) and headless in Node, with **bit-identical game state** (README.md:3-8).
- **Status:** "experimental proof of concept" (spec/ABI.md:3). The ABI version is still **0**. Additions keep it at 0 because runners link unknown imports as traps. Guests probe for newer imports with `gasm.has` (CHANGELOG.md header).
- **Current release:** **0.16.1** (2026-11-03). Tags have no `v` prefix. Package versions (`gasm-sdk`, `gasm-host`, `@emdzej/gasm-host`) follow the tag.
- **Site:** https://gasm.emdzej.pl (docs and playable demos at `/demos/`, player at `/play/`).
- **GitHub:** https://github.com/emdzej/gasm. Releases: https://github.com/emdzej/gasm/releases
- **License:** MIT for the spec, runners, relay, bindings and demo games. Some bundled guests carry their own licenses:
  - `doom.wasm`: GPL-2.0.
  - `scummvm.wasm`: GPL-3.0.
  - SDL 3 and gasm's SDL drivers: zlib.
  - `nes.wasm`: contains tetanes-core (MIT/Apache).
  - GPL games ship their complete source archives next to the binary (README.md:179-193).
- **Design goals** (from AGENTS.md, ABI.md and how-it-works):
  1. **Determinism across runners is the core property.** Most tests assert identical FNV-1a hashes of the video, audio and GPU-upload streams across:
     - wasmtime JIT, wasmtime AOT and V8;
     - Linux x86_64/arm64, macOS and Windows (`tests/golden/determinism.txt`, 92 cases).
  2. **The runner drives frames.** The guest exports `gasm_frame`, which runs once per fixed timestep. Reasons given (ABI.md "Why the runner drives the frames"):
     - browsers cannot block;
     - input sampled between calls makes each frame a pure step, which serves tests, lockstep and future rollback;
     - the runner owns catch-up, pause, Escape and Worker mode.
  3. **Sandbox and consent.**
     - No filesystem, environment or arguments.
     - Every pointer and handle is validated: a violation traps the guest, never crashes the runner.
     - Network and saved files go through player consent.
     - Storage namespaces are chosen by the runner, never by the guest.
  4. **Machine-readable ABI.**
     - `spec/abi.json` is the source of truth.
     - `scripts/gen-abi.mjs` generates `spec/gasm.h` and the Rust `sys.rs`.
     - `--check` verifies both runners' signatures, constants and key tables against it.
  5. **Language-agnostic.** Rust (`gasm-sdk`), C/C++ (C SDK + CMake), SDL 3 (unpatched, as a "private platform"), Godot 4.7 (a gasm platform), ScummVM, DOOM.

### Badge

Three SVGs in `site/public/badge/`. The usage guidance is in site/dev/badge.md.

| Variant | Size | Use on | URL |
|---|---|---|---|
| light | 120x44 | light pages | `https://gasm.emdzej.pl/badge/built-for-gasm-light.svg` |
| dark | 120x44 | dark pages | `https://gasm.emdzej.pl/badge/built-for-gasm-dark.svg` |
| flat | 118x20 | READMEs, next to other shields | `https://gasm.emdzej.pl/badge/built-for-gasm-flat.svg` |

Exact Markdown snippet, from site/dev/badge.md:

```md
[![Built for gasm](https://gasm.emdzej.pl/badge/built-for-gasm-flat.svg)](https://gasm.emdzej.pl)
```

HTML version that switches with dark mode:

```html
<a href="https://gasm.emdzej.pl">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://gasm.emdzej.pl/badge/built-for-gasm-dark.svg">
    <img src="https://gasm.emdzej.pl/badge/built-for-gasm-light.svg" alt="Built for gasm" width="120" height="44">
  </picture>
</a>
```

Rules: link the badge to `https://gasm.emdzej.pl`. Don't recolor, stretch or crop it. It is for games (guests), not for runners or tools. Self-hosting is fine (MIT).

The sibling ports put the light badge in their player page footer: `Powered by <a href="https://gasm.emdzej.pl"><img src=".../built-for-gasm-light.svg" ...></a>` (opencmr2/docs/public/play/index.html).

## 2. The ABI surface (spec/ABI.md, spec/abi.json, spec/gasm.h)

### Module shape

| Kind | Name | Notes |
|---|---|---|
| export | `memory` | All pointers are i32 offsets into it. |
| export | `gasm_abi_version() -> i32` | Must return 0. |
| export | `gasm_init() -> i32` | 0 = ok. Sets the frame rate and audio, loads assets, creates GPU resources. |
| export | `gasm_frame()` | One simulation + render step. |
| export (opt) | `gasm_run() -> i32` | Own-loop game, for runners that switch stacks. |
| export (opt) | `_initialize` | WASI reactor constructors. Called first. |
| export (opt) | `gasm_exit()` | Player quits: flush saves. Best effort. |
| custom section | `gasm.title` | The game's name: the default title. |
| custom section | `gasm.manifest` | Capabilities manifest (JSON). |
| import | `gasm`, `gasm:gfx` or `gasm:gl`, `gasm:net`, `gasm:fetch`, `gasm:media`, `gasm:storage`, `gasm:clipboard`, `gasm:files`, `wasi_snapshot_preview1` | |

- **Base wasm features:** whatever current rustc and clang emit by default (bulk-memory, sign-ext, mutable-globals, nontrapping-fptoint, multivalue, reference-types, extended-const). The spec says "**No threads, SIMD or exception handling**" (ABI.md:10).
- Two later additions go beyond that baseline:
  - opt-in real threads (wasi-threads, 0.14.0);
  - Godot uses wasm exceptions for setjmp/longjmp (`-mllvm -wasm-enable-sjlj`, AGENTS.md "Godot"), and wasm-opt must get the module's exact feature set (`--all-features` emits encodings the runners refuse).

### Lifecycle and frame model

1. Instantiate, then `_initialize`.
2. Check `gasm_abi_version() == 0`.
3. `gasm_init()`.
4. `gasm_frame()` at `set_frame_rate` Hz (default 60, range 1-1000) on a **fixed timestep**, independent of display refresh. Rules:
   - The runner may run several frames back to back to catch up and shows only the last. Guests can skip drawing on those frames: `gfx.begin_frame` returns 0, `gl.frame_shown()` returns 0.
   - Never re-entrant.
   - Input is sampled before each call and is stable within it.
5. The game ends on user quit (`gasm_exit` is called first), on a trap, or on WASI `proc_exit`.

- **Own main loop:** the loop helpers export `gasm_frame` and run `main` with `wait_frame()`. They come in two flavours, built from one link:
  - **Asyncify** inside the guest (`game.wasm`): runs everywhere.
  - **Stack switching** (`game-run.wasm`): exports `gasm_run`, and the guest calls `gasm.yield_frame()` each frame. Supported by wasmtime async natively, and by JSPI in Chromium and Node 24+. About a third smaller: ScummVM 10.6 MB vs 16.1 MB. Runners that can't switch stacks refuse the `-run` build.
- **Watchdog:** a guest call that runs longer than `--call-timeout` (default 30 s) traps.
- **Memory cap:** 1 GiB by default (`--memory-limit`).
  - Natively: a wasmtime ResourceLimiter, so growth past the cap traps at once.
  - JS: checked after each call, with the same message.
- **Threads:** the guest is single-threaded by default.
- **Runners never call a guest again after it trapped or exited** (`GasmHost.dead`).

### Conventions

- **Variable-size results:** the call returns the full length and copies only if it fits in `cap`. Call with `cap = 0` first, then with a buffer of that size.
- **Missing things:** `-1` means "not there".
- **Misuse traps:** bad pointers, never-issued handles, invalid descriptors, non-UTF-8 strings.
- **gfx handles:** u32 from 1, in creation order, never reused.

### `gasm` core (about 23 functions in a minimal runner)

| Area | Calls |
|---|---|
| General | `log`, `has(name)` (probe `"gasm:gfx"` or `"gasm.asset_size64"`), `time_ms` (virtual in headless runs, fixed within a frame), `set_frame_rate`, `max_threads`, `utc_offset_minutes`, `set_title`, `set_fullscreen` / `is_fullscreen` (honoured only within 5 s of a key press or click) |
| 2D video | `video_present(ptr,w,h,stride)`: RGBA8, up to 4096², copied, letterboxed by the runner. `video_set_aspect(num,den)`: e.g. 4:3 for 320x200 games. |
| Audio | `audio_config(rate, ch)`: 8-192 kHz, 1-2 channels, default 44100/2. `audio_push(ptr, frames)`: interleaved f32. The runner resamples and keeps about 60 ms of latency. It drops the oldest audio when the guest runs ahead and plays silence on underrun. |
| Pads | `input_pad(player)`: a 12-bit mask for virtual pads 0-3. A=0 B=1 X=2 Y=3 L=4 R=5 SELECT=6 START=7 UP..RIGHT=8-11. |
| Raw input | `input_mode(KEYS_RAW / POINTER_HIDDEN / POINTER_LOCKED)`. `key_state` (32-byte bitset of `GASM_KEY_*`, W3C `KeyboardEvent.code` names). `key_events` (4-byte down/up records, no auto-repeat). `pointer` (48 bytes: drawable xy, frame xy un-letterboxed, dx/dy, wheel, buttons, pressed/released, flags). `gamepad(slot)` (204 bytes, W3C standard mapping). `gamepad_name`. `text_input` (UTF-8, `\b` and `\n`). |
| Assets | `asset_size`, `asset_size64`, `asset_read`, `asset_read_at`, `asset_read_at64`, `asset_count`, `asset_name(i)` (sorted), `asset_version` (embedder replaced it). |
| Params | `param(name)`: a flat string map (`--param k=v`, URL query in the browser). Not for secrets. |
| Own loop | `yield_frame`: only inside `gasm_run`. |

### Optional modules

- **`gasm:gfx`:** a WebGPU subset with WGSL shaders.
  - JSON descriptors create shaders, buffers, textures (2D, rgba8unorm or rgba8unorm-srgb, up to 8192, mips), samplers, bind group layouts, pipelines and bind groups.
  - Per-frame calls take scalars only: `begin_frame`, `set_pipeline`, `set_bind_group[_offsets]`, viewport, scissor, vertex and index buffers, `draw[_indexed]`, `end_frame`, `destroy`.
  - The runner owns depth24plus + 4x MSAA and the single render pass.
  - Not included: render targets, cube maps, compute, stencil, storage textures.
  - Every misuse traps identically on every runner, the null GPU included. Native uses wgpu (Metal, Vulkan, D3D12). The browser uses `navigator.gpu`.
- **`gasm:gl`:** OpenGL ES 3.0 with WebGL 2's rules (224 functions).
  - Browser: WebGL 2. Native: ANGLE in a WebGL-compatibility context (Metal, D3D11, Vulkan, or SwiftShader without a GPU). Headless: null GL.
  - GL errors are recorded and the game carries on; boundary violations trap.
  - A shared model (`lib/gl.js` == `gl.rs`) validates first, and hashes come from the model.
  - Query and fence results are ready from the next frame on.
  - The default framebuffer has depth24/stencil8, no alpha, no MSAA, and is not preserved between frames.
  - A module imports `gasm:gfx` **or** `gasm:gl`, not both.
  - C SDK: drop-in `<GLES3/gl3.h>` + `gasm_gl.c` (gen loops, string arrays, `glMapBufferRange` emulated in guest memory, client-side arrays emulated, a state cache that skips redundant calls).
- **`gasm:net`:** WebSocket semantics only (browsers have no raw sockets).
  - Calls: `open(ws/wss url)`, `state`, `send`, `recv`, `close`. Non-blocking: poll each frame.
  - Limits: 16 connections, 4096-message send queue.
  - Pair it with `gasm-relay` (WebSocket rooms) for lockstep. Only message contents may affect the simulation, never arrival timing.
- **`gasm:fetch`:** HTTP(S) made by the runner.
  - Calls: `request(json desc, body)`, `state`, `status`, `headers`, `read`, `close`.
  - Limits: 16 requests, 16 MiB request bodies, 64 MiB response bodies.
  - No cookies or cache. Forbidden headers are refused identically on every runner. The User-Agent is chosen by the runner (`--app-id`).
  - Headless runs can record and replay it (`--fetch-record` / `--fetch-replay`).
- **`gasm:media` (0.16.0):** the runner fetches, decodes and plays an https audio stream (radio, tracks), mixed after the game's audio and never hashed.
  - Needs the manifest's `"media": true` plus the player's yes, or `--allow-media`.
- **`gasm:storage`:** a per-game key/value store.
  - Calls: `get`, `set` (returns `ERR_KEY` / `_SIZE` / `_QUOTA` / `_IO`), `delete`, `count`, `key(i)`.
  - Limits: keys 1-128 bytes of `[A-Za-z0-9._-]`, values up to 1 MiB, 16 MiB per namespace.
  - Native: `<data dir>/gasm/<namespace>/<key>`, one file per key, written atomically. Browser: IndexedDB `gasm`, store `kv`, keys `<ns>/<key>`.
  - Headless runs use an empty in-memory store unless given `--storage-dir`.
  - The namespace is the module file name, else the launcher's manifest `id`, else `--storage-id`.
- **`gasm:clipboard`:** `set_text` always works. `get_text` works only during the frame that carries the player's Ctrl/Cmd+V.
- **`gasm:files`:** `save(name, mime, data)` and `state`. Files for the player.
  - Native: `Pictures/<game>/` or `Downloads/<game>/`, after consent. Browser: a download.
  - The game never learns the path.
  - Opening files (a picker) is on the roadmap and not done.
- **WASI subset** (own implementation, identical in Rust and JS):
  - `fd_write` on fd 1 and 2 goes to the log (never to stdout, which carries the hash lines).
  - Clocks: virtual in headless runs.
  - `random_get`: a fixed splitmix64 sequence in headless runs.
  - `fd_prestat_get` returns EBADF, so there is **no filesystem**. Everything else returns ENOSYS.
  - `proc_exit` ends the game.

### Files and assets

- Assets are a flat, **read-only** name -> bytes map chosen by the launcher. By convention `rom` is the content file of emulators.
- **Never preloaded** natively or from Node folders. Reads are positioned reads straight into guest memory. Measured: a 200 MB asset read at random offsets cost no extra RSS.
- **Sizes are 64-bit:** `asset_size` reports `-2` for 2 GiB and over.
- **Folders:**
  - `--asset-dir [prefix=]dir` exposes every regular file, recursively, as `/`-separated relative paths (`ART/ART.CAR` or `cd/ART/ART.CAR`).
  - Lookup is **ASCII case-insensitive**. Exact names win, and explicit `--asset` entries override folder entries. On a case collision the runner warns and takes the first sorted name.
  - Hidden entries and symlinks are skipped. Files are opened lazily, at most 64 at a time.
- **Mods:** `--mods <dir>` mounts `*.pck` and `*.zip` as `mods/<name>`. A `<stem>.json` manifest next to a mod can ask for hosts.
- **C stdio:** `gasm_vfile.h` gives a `FILE*` over assets (streamed) or storage (written on `fclose`), via `fopencookie`.
- **Game data supplied by the user (the pattern the sibling ports use):**
  - **Native:**
    - `gasm-run game.wasm --asset-dir <CD folder>` for loose files, or `--asset cd=<image.iso>` for a disc image. The guest mounts ISO 9660 itself over `asset_read_at64`: opencmr2 `src/platform_gasm.c:334-369`, `vfs_mount_image`.
    - The shipped bundles' launcher scripts ask for the data location once and remember it (`~/Library/Application Support/OpenCMR2/data-location`), then build the gasm-run command line (opencmr2/tools/gasm-bundle/launch-macos.sh).
  - **Browser:**
    - The page picks a folder (`showDirectoryPicker`, falling back to `<input webkitdirectory>`) or an image file.
    - `directoryHandleEntries` / `fileListEntries` from gasm-host list the files.
    - Then one of two paths:
      - (a) **Play in place:** Worker-mode asset spec `{kind:'files', entries}`, read with `FileReaderSync`.
      - (b) **Import once into OPFS:** streamed copy with `@emdzej/csfs-opfs`, plus a hidden marker file written last so a partial import is detectable. Then `{kind:'opfs', dir:NAMESPACE}`, read via `FileSystemSyncAccessHandle` with no preloading. Later visits start instantly.
    - The site never hosts game data, and "nothing you pick leaves your computer" (opencmr2/docs/public/play/data.js:1-20, 140-188).

### Capabilities manifest (0.12.0)

```json
{ "manifest": 1, "name": "…", "requires": ["gasm:gl"], "hosts": ["api.met.no","*.example.org"], "files": true, "media": true, "icon": "icon.png", "id": "mygame" }
```

- **Embedding:** Rust `gasm::manifest!`, C `GASM_MANIFEST({...})` from `gasm_manifest.h` (top-level asm `.custom_section`), or the launcher gives it (`--manifest`, or asset `gasm.manifest`).
- **`requires`:** checked before instantiation; a runner that lacks something refuses the game.
- **`hosts`, `files`, `media`:** asked about once, up front.
- **`id`:** counts only from the launcher, never when embedded in the module.
- `gasm-run --info game.wasm` prints the manifest and whether this runner can run the game.

## 3. Guest-author guide

### SDK setup (C/C++: the path the sibling ports use)

- Release asset: `gasm-c-sdk-<version>.zip`. Contents:
  - `include/gasm.h` (generated);
  - `gasm_loop.h`, `gasm_thread.h`, `gasm_manifest.h`, `gasm_vfile.h`;
  - `GLES3/gl3.h` and `GLES2/*`;
  - `src/gasm_loop.c`, `gasm_thread.c`, `gasm_pthread.c`, `gasm_vfile.c`, `gasm_gl.c`, `gasm_gl_proc.c`;
  - `cmake/gasm-toolchain.cmake`, `cmake/Gasm.cmake`;
  - `example/`, `example-loop/`.
- **wasi-sdk 34** (gasm pins it too). The toolchain looks for it in this order:
  1. `-DWASI_SDK_PREFIX`;
  2. `$WASI_SDK_PATH`;
  3. `../tools/wasi-sdk` inside a gasm checkout.

  It includes `wasi-sdk-p1.cmake`, so the target is **wasm32-wasip1** (sdk/c/cmake/gasm-toolchain.cmake).
- **Sibling fetch script** (`tools/fetch-gasm-sdk.sh`, e.g. opencmr2):
  - Pins `WASI_SDK_VERSION=34` and **`GASM_VERSION=0.16.1`**: the single version pin, also used for the runner download.
  - `--version` prints the pin.
  - Downloads `wasi-sdk-34.0-<plat>.tar.gz` and `https://github.com/emdzej/gasm/releases/download/$V/gasm-c-sdk-$V.zip` into `.deps/`.
  - Writes `.deps/gasm-c-sdk/VERSION`, so a pin bump re-fetches.
  - Strips the macOS quarantine attribute.
  - Comments say to keep `@emdzej/gasm-host` in `docs/package.json` in step with the pin.
  - Current pins:

    | Repo | `GASM_VERSION` |
    |---|---|
    | opencmr2, opennfspu, openoni, openi76 | 0.16.1 |
    | opensheep | 0.16.0 |
    | openbv | 0.13.0 |
    | opengta, openrf, openballance | 0.6.0 |

### CMake integration (the platform switch, as in the siblings)

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

Configure: `cmake -S . -B build-gasm -D<P>_PLATFORM=gasm -DCMAKE_BUILD_TYPE=Release -DCMAKE_TOOLCHAIN_FILE=.deps/gasm-c-sdk/cmake/gasm-toolchain.cmake -DWASI_SDK_PREFIX="$PWD/.deps/wasi-sdk"`.

The native build of the same sources (with `platform_host.c` and `vfs_host.c`) serves tests, tools and ASan. All gasm calls live in `platform_gasm.c` (about 400 lines), behind `src/platform.h` (site/dev/porting-directx7.md "The shape of a port").

### What `gasm_add_game(<t> [LOOP [THREADS]] srcs…)` does (sdk/c/cmake/Gasm.cmake)

- Sets the `.wasm` suffix and adds the gasm.h and SDK include paths.
- Adds `-fno-exceptions` for C++.
- Links with `-mexec-model=reactor` (no `main`; `_initialize` runs the constructors). The flag is link-only: passing it with `-c` errors.
- Links `-lm`.
- Entry points are exported in code: `GASM_EXPORT("gasm_init")`, and the same for `gasm_abi_version` and `gasm_frame`.
- **`LOOP`:**
  - adds `gasm_loop.c` and `-Wl,--wrap=exit`;
  - needs Binaryen `wasm-opt` (`GASM_WASM_OPT`);
  - writes `<t>-run.wasm` (no Asyncify, `-O2`);
  - writes `<t>.wasm` with `--asyncify --pass-arg=asyncify-removelist@gasm_loop_frame -O2`;
  - Debug builds use `-g` instead of `-O2`;
  - `GASM_LOOP_STACK_SIZE` sets the suspended-stack buffer (default 1 MiB; ScummVM uses 4 MiB).
- **`LOOP THREADS`:**
  - cooperative threads (`gasm_thread.h`) and POSIX threads on a deterministic scheduler;
  - each thread costs its C stack plus a 256 KiB Asyncify buffer;
  - no `-run.wasm`.
- **Optional sources:** `${GASM_VFILE_SOURCE}` (needs `_GNU_SOURCE`), `${GASM_GL_SOURCE}`, `${GASM_GL_PROC_SOURCE}`.
- **Without CMake:** `clang --target=wasm32-wasip1 -mexec-model=reactor -O2 -Iinclude game.c -o game.wasm -lm`.
- **Freestanding:** `--target=wasm32 -nostdlib -Wl,--no-entry`.

### Rust

- Crate `gasm-sdk = "0.16"` (lib name `gasm`), `crate-type = ["cdylib"]`, `lto = true`, `panic = "abort"`, target `wasm32-unknown-unknown`.
- `gasm::game!(T)` exports the entry points and installs a panic hook that logs the panic. Own loops use `main_loop!` or `threaded_main_loop!`.
- GL through the gasm fork of glow: `[patch.crates-io] glow = { git = "https://github.com/emdzej/gasm" }`.
- On some macOS installs, link with wasi-sdk's `wasm-ld` because rust-lld can't find `libLLVM.dylib`.

### Build flags and settings that matter

- **`-Wl,-z,stack-size=1048576`:** wasm-ld's default stack is **64 KiB**, and an overflow silently corrupts the data below it, with no trap (porting-directx7.md "Build" and "Traps").
- **`-Wl,--strip-debug`** in release (opencmr2) makes a smaller module. Keep the name section if you want named backtraces: traps print a wasm backtrace with function names when the name section is kept (games.md section 8).
- **`-fno-exceptions`** for C++. Godot is the exception: it uses wasm EH only for setjmp/longjmp.
- **x87 precision:** reproduce 80-bit rounding where bit-exactness matters, with helpers like opencmr2's `X87_MulRound` (porting-directx7.md).
- **Line-buffer stdout** (`setvbuf(stdout,NULL,_IOLBF,0)`), or log lines sit in the buffer until it fills (games.md, "Porting an existing C game").

### Debugging

- **Native build of the same code** (C: `platform_host.c`; Rust: the `gasm::native` stub host, `guests/parity`). Use it for lldb, sanitizers, profilers and parity hashes. ASan matters because wasm does not trap on use-after-free.
- **Debug wasm:** `CMAKE_BUILD_TYPE=Debug` makes `wasm-opt -g` keep names in loop builds. Godot has `make godot-mt-names` (SCons `gasm_names=yes`).
- **`gasm-run --profile out.json`:** samples the main thread every millisecond with wasmtime's GuestProfiler and writes Firefox Profiler format, including the share of time spent in runner calls (0.16.0).
- **Other `gasm-run` flags:**
  - `--gl-stats`: GL calls per frame, by name.
  - `--info`.
  - `--headless N --screenshot out.png`: renders GPU and GL games offscreen.
  - `--window-screenshot frames:out.png`.
  - `GASM_AUDIO_LOG=1`: logs the audio queue once a second.
  - `GASM_ANGLE_BACKEND=metal|opengl|vulkan|d3d11`.
- **Headless runs as a test suite:** `--headless N --input "100-104:KEY(Enter),200:PTR(320,240,L),300-600:GP0(B0+A1=1)" --storage-dir`. It prints `frames=… presented=… size=…` and `video_fnv32=… audio_fnv32=… audio_frames=…`.
  - Node gives the same hashes: `npx -p @emdzej/gasm-host gasm-headless`.
  - The sibling players reproduce it in Chrome with `?hashframes=N&input=…`.
- **Imports check:** `node -e 'WebAssembly.Module.imports(...)'` lists the imports. All of them must come from gasm modules or WASI.

### Performance notes (measured, Apple M1 Pro)

- NES emulation in wasm costs **1.5x** native on wasmtime Cranelift AOT and **1.6x** on V8 (README "Results").
- DOOM runs at 2,700-3,000 frames/s headless.
- Per-call host overhead is negligible at a few hundred calls per frame. It is not negligible for GL-heavy engines:
  - 0.10.0 made the GL model constant-time per vertex array: Godot went from 22 to 97 fps on ANGLE.
  - 0.16.0 added a state cache in `gasm_gl.c`: NiP went from 57.7k to 35.0k calls per frame.
  - A third of a Godot headless main thread was gasm-run's GL layer.
- **Asyncify** costs size and speed. Prefer per-frame callbacks or state machines for new code. Both DX7 ports use state machines.
- **SIMD:** not part of the ABI baseline. For Godot, `-msimd128` "adds nothing", and `-O3`/speed was only 3.7 % faster than `-Oz` at 1.7x the size (CHANGELOG 0.16.0).
- **Textures:** upload RGBA8. ANGLE emulates RGB8, L8 and LA8 on Metal and D3D, and an upload took 10-60 ms (CHANGELOG 0.15.0).
- **Catch-up frames:** check `frame_shown` / `begin_frame` and skip drawing on catch-up frames.

### Limits of wasm and gasm, and when to go native

- **Threads:**
  - Default: single wasm thread.
  - Cooperative threads: deterministic, Asyncify builds only.
  - Real threads (`wasm32-wasip1-threads`, shared memory): native OS threads; browser Workers only on **cross-origin isolated** pages in Worker mode (the site uses a COOP/COEP service worker, `isolate-sw.js`). Headless runs allow 0 threads, so games must fall back to the main thread.
  - Threads make runs nondeterministic.
- **Not available:**
  - filesystem, sockets other than WebSocket, raw UDP/ENet, file open dialogs;
  - touch (multi-finger), rumble/force feedback;
  - render targets in `gasm:gfx`;
  - desktop GL, Vulkan, `SDL_GPU`;
  - in Godot: C# and GDExtension;
  - mobile runners (roadmap).
- **JIT-less platforms** (iOS, consoles) need AOT `.cwasm`, WAMR or wasm2c.
- **When to go native instead** (inference from the docs): when you need multi-core parallelism with determinism, OS features outside the ABI (filesystem writes, arbitrary sockets, haptics, native dialogs), vendor GPU APIs or compute, or more than about 1 GiB of memory (configurable natively; browsers are tight, and iOS less). Even then, gasm's ports keep a native `platform_host.c` build for tooling.

## 4. Runners and shipping

- **`gasm-run`** (crate `gasm-host`, Rust): wasmtime (JIT, or AOT `.cwasm` with `--allow-precompiled`), wgpu, ANGLE (loaded at run time from next to the binary or `--gl-lib`; from Electron 43.7.7), winit, cpal, gilrs, tungstenite and rustls/ring.
  - Release builds: macOS universal (+ `.app` bundles), Linux x86_64/arm64 (X11; Wayland through XWayland for GL games), Windows (D3D12/Vulkan, WASAPI).
  - Embeddable through `Session`, `headless::run`, `window::run`, `Game::load/frame`.
- **Browser:** `@emdzej/gasm-host` on npm. Dependency-free ESM: `gasm-host.js` + `lib/`, `webgpu-gfx.js`, `gasm-worker.js`, `gasm-present.js` (WebGL 2 upscalers), `gasm-splash.js`, `isolate(-sw).js`, `headless.mjs`.
  - Main thread (`GasmHost`) or Worker mode (`GasmWorker`): transferables only, no SharedArrayBuffer, so GitHub Pages works.
  - `gasm:gl` games in a Worker get a transferred `glCanvas` (needs 0.14.0+).
  - `gasm:gfx` games in a Worker need WebGPU in workers (Chromium).
  - JSPI is used when available for `-run` builds.
- **Node headless:** `gasm-headless`.
- **Relay:** `gasm-relay`, as `ghcr.io/emdzej/gasm-relay` or in the release bundles.
- **Other targets in the platform notes:** iOS and consoles via AOT, MCUs via WAMR or wasm3, SBCs.
- **Release assets** (release.yml): `gasm-<v>-<platform>.tar.gz/.zip` (gasm-run, relay, games, run-* scripts, ANGLE + `ANGLE-NOTICES.txt`), `gasm-<v>-macos-apps.zip`, games zip with `THIRD-PARTY.txt`, `gasm-c-sdk-<v>.zip`, `gasm-sdl3-<v>.zip`, DOOM and ScummVM source archives. The release also publishes crates.io (`gasm-sdk`, `gasm-host`) and npm via OIDC trusted publishing.

### How a sibling port ships natively (opencmr2/tools)

- `fetch-gasm-runner.sh <platform>` downloads `gasm-$V-<platform>` from gasm releases: gasm-run + ANGLE (libEGL, libGLESv2, SwiftShader + ICD) + LICENSE.
- `package-gasm.sh <version> <platform> <runner dir> <out>` produces:
  - macOS: `<Game> (gasm).app` (ANGLE in `Contents/Resources/angle/` with `--gl-lib`, because `codesign --strict` allows code only in `Frameworks/`; signed ad hoc) and `.zip`;
  - Linux: `.tar.gz`; Windows: `.zip`;
  - each with a `.sha256`;
  - no game data, and no `.cwasm` (`--compile` only targets the host it runs on).
- Launchers in `tools/gasm-bundle/` (`launch-macos.sh`, `opencmr2.sh`, `OpenCMR2.cmd`/`.ps1`, `.desktop`) find or ask for the data and run `gasm-run --asset-dir <folder>` or `--asset cd=<image>`. `smoke-gasm-bundle.sh` tests a bundle without data.
- The module is always named `opencmr2.wasm`, so its storage namespace `opencmr2` is the same natively and in the browser.

### Browser player pattern (docs/public/play/ in the sibling sites)

- **Files:**
  - `index.html` with an importmap for `@emdzej/csfs-*`;
  - `play.js` (runner loop);
  - `data.js` or `cd.js` (pick, check, OPFS import);
  - `saves.js` (export and import of IndexedDB saves as a zip);
  - `play.css`;
  - `<game>.wasm` (git-ignored, copied by `docs/scripts/copy-wasm.sh`, which checks the `\0asm` magic);
  - `vendor/gasm/` and `vendor/csfs/` (git-ignored, from `docs/scripts/vendor-web.sh` after `pnpm install`; the pins are in `docs/package.json`: `@emdzej/gasm-host 0.16.1`, `@emdzej/csfs-* 0.3.0`).
- **What vendor-web.sh copies:** `gasm-host.js`, `gasm-worker.js`, `webgpu-gfx.js`, `gasm-present.js`, `lib/*.js`, `input-script.mjs` renamed to `.js` (so every server serves it as JavaScript), LICENSE and a VERSION file. "Never edit the copies."
- **openbv variant:** vendors only `gasm-host.js` + `lib/` into `public/play/`, with no Worker and no csfs.
- **Pages CI:** fetch SDK -> cmake build -> `copy-wasm.sh` -> `vendor-web.sh` -> VitePress build -> `test -f dist/play/<game>.wasm` and `vendor/gasm/gasm-worker.js`.
- **Run loop** (opencmr2/docs/public/play/play.js:238-290):
  ```js
  worker = await GasmWorker.start({ wasm, assets: data.assetSpecs(source), params,
    storage: 'opencmr2', hashing, virtualTime, onLog, onAudio, keyboard: true,
    allowNet: !!params.relay, glCanvas: canvas.transferControlToOffscreen(), size: displaySize() });
  // rAF tick: acc += min(dt,100); due = min(4, floor(acc/period)); one batch in flight:
  worker.frames(steps /* {pads, input} */, true, { size, copy }).then(...)
  ```
  - A fresh canvas is made for each start (a canvas transfers only once).
  - Audio goes through an AudioWorklet ring (`GasmOut`) fed by `onAudio(samples, rate, channels)`.
  - Holding Escape for 1 s stops the game.
  - `pagehide` -> `worker.exit()`.
  - The `fullscreenchange` listener sets `worker.fullscreen`.
  - URL params that the page doesn't use become game params.
- **Game data picking:** "Choose a disc image" (`.iso`/`.bin`) or "Choose the CD's folder".
  1. Check: find the root, keep only the folders and files the game reads, require key files, check exe size and CRC.
  2. Then "Import and play" (OPFS, about 610 MB for CMR2, `navigator.storage.persist()` offered) or "Play without importing".
- **opengta:** a 2D game (`video_present` 640x480) scaled up with `gasm-present` 'sharp'. Extra OPFS folders mounted with prefixes (`skins/<name>/…`), like `--asset-dir skins=…`.

## 5. Pitfalls and lessons (cited)

**Toolchain**
1. Homebrew rust has no wasm targets: use the rustup `stable` toolchain and set `RUSTC` explicitly (AGENTS.md "Toolchain traps").
2. rust-lld can't find `libLLVM.dylib` on some macOS installs: link with wasi-sdk's `wasm-ld` (AGENTS.md; games.md section 2).
3. `-mexec-model=reactor` is link-only (AGENTS.md).
4. wasi-sdk per-host sysroots differ. gasm overlays the host-independent sysroot so guests are byte-identical on every host (AGENTS.md; commit `0b1d3ad`).
5. Every download is SHA-256 pinned (AGENTS.md; CHANGELOG 0.6.0).

**C, wasm and the ABI**

6. **wasm checks indirect call signatures:** a mismatched function-pointer cast traps with "indirect call type mismatch". Fix it with a typed wrapper (AGENTS.md; games.md "Porting").
7. **The 64 KiB default stack overflows silently:** raise it (porting-directx7.md "Traps").
8. **Uninitialised or past-the-end reads** stay deterministic across runners but change when allocations change. DOOM's renderer reads past lumps, so glue changes move its hashes (ABI.md "Determinism"; AGENTS.md). opencmr2 keeps its globals in one zeroed block.
9. **Determinism rules** for the simulation: only `+ - * / sqrt` on floats, no clocks or OS randomness, no `HashMap` iteration. NaN payloads are nondeterministic (AGENTS.md "Invariants"; games.md section 5).
10. **Unknown imports link as traps.** Don't "fix" this: tetanes-core leaves wasm-bindgen imports behind (AGENTS.md).
11. **`bool::then_some` evaluates eagerly:** `(h>0).then_some(Conn(h))` dropped `Conn(-1)` and closed handle -1, which traps (AGENTS.md; CHANGELOG 0.9.0; commit `86eb88e`).

**Asyncify**

12. Asyncify rules, each one a bug (top of `gasm_loop.c`; AGENTS.md):
    - yield through an indirect call;
    - run `--asyncify` before `-O2`;
    - put `gasm_loop_frame` on the remove list;
    - instrument nothing between an unwind and `asyncify_stop_unwind`;
    - wrap `exit` (`--wrap=exit`) when static destructors could yield.
13. Asyncify doesn't save `__stack_pointer`: the scheduler saves and restores it for each cooperative thread (AGENTS.md).

**GL**

14. **Redundant-state cache (`gasm_gl.c`):**
    - use fixed tables (a growing table walked on each delete made Godot 15x slower);
    - forget deleted names by generation counter;
    - never cache uniforms looked up with `[`;
    - never skip an upload;
    - verify with pixel-identical screenshots, not only hashes (AGENTS.md; CHANGELOG 0.16.0; commit `905e086`).
15. **`glMapBufferRange` with an invalidate bit:** the mapped copy must be zeroed. Otherwise leftover heap bytes were uploaded and hashes depended on heap layout (CHANGELOG 0.16.0).
16. **WebGL wants typed arrays that match the pixel type** (Float32Array for FLOAT and so on): float textures sampled zeros in browsers (CHANGELOG 0.9.0; commit `d3d56a2`).
17. **The null GL reported 0 for `MAX_VERTEX_OUTPUT_COMPONENTS` and similar,** so Godot rejected shaders with varyings headless. Null limits are now WebGL 2's minimums, and `gen-abi --check` compares the native and JS tables (CHANGELOG 0.9.0; commit `f3fd326`).
18. **Upload hashes move without visible change:** one extra texture changes `video_fnv32`. Compare screenshots first (porting-directx7.md).
19. **RGB8, L8 and LA8 uploads stall ANGLE by 10-60 ms:** upload RGBA8 (CHANGELOG 0.15.0; commit `0722df1`).
20. **SDL must not import `gasm:gl` into every SDL game,** because importing it makes the module a GL game. Use a weak `gasm_gl_get_proc_address` in an object file, not an archive (AGENTS.md).

**Runner behaviour**

21. **Audio underrun recovery** discarded the samples it was waiting for, so audio stayed silent after a long load frame. Fixed in 0.16.1 (CHANGELOG; commit `3fbc27d`). Earlier, 0.10.0 grew the buffer (60 -> 150 ms) and rebuilt the stream on device change (commit `9593ab0`).
22. **Godot** must skip catch-up frames: they piled up work with near-zero deltas and made hitches worse. It also mixes audio by elapsed time (CHANGELOG 0.10.0 and 0.14.0).
23. **Pool thread count:** a `get_thread_count()` of 0 made the culler cull everything in scenes of more than 1000 instances. Report at least 1 (CHANGELOG 0.15.0).
24. **Never spawn a thread the runner refuses:** with `-fno-exceptions`, a refused `std::thread` aborts. Size pools from `gasm.max_threads()` (AGENTS.md).
25. **Window resize:** the Godot platform never reported resizes, so games rendered at their starting size in a corner (CHANGELOG 0.9.1; commit `27f69e2`).
26. **Storage namespaces:** every Godot game shared `gasm/godot/` until the namespace became the pack name or the launcher's manifest `id` (CHANGELOG 0.13.0).
27. **Precompiled modules:** `.cwasm` is unsandboxed native code, so `--allow-precompiled` is required. Only run ones you compiled yourself (guide section 7).

**CI and testing**

28. **Hangs:** every runner call in the determinism suite has a 300 s limit, after CI stalled on Windows for an hour (AGENTS.md; commit `c4b877b`).
29. **Headless Chrome:**
    - Chrome 154 leaves headless downloads as empty `.crdownload` files;
    - tests share a debugging port, so run them one at a time;
    - background `node` gets SIGTTIN, so redirect `</dev/null`;
    - `?hashframes` can't test net or fetch (AGENTS.md).
30. **Build hygiene:**
    - the macOS make is 3.81 (no grouped targets);
    - zsh doesn't word-split variables;
    - bash 3.2 has no empty-array expansion under `set -u`;
    - run `scripts/linux-container.sh clean` after Linux container runs (AGENTS.md).
31. **Browser specifics:**
    - pads appear late in browsers;
    - arrow keys share keypad scan codes in DX `WM_KEYDOWN` tables;
    - `D3DRECT` is x1,y1,x2,y2;
    - caps bit `0x8000` = ZBUFFERLESSHSR, and reporting it made CMR2 skip its depth clears (porting-directx7.md "Traps").

Agent skill: `site/dev/skills/porting-directx7/SKILL.md` is a checklist version of the DirectX 7 guide, written from the opencmr2 and opennfspu ports (commit `216bd74`).

## 6. Screenshots (site/public/screenshots, webp)

They are generated by `scripts/screenshots.sh`: headless `gasm-run` for most, headless Chrome for the player. Captions are from site/index.md and site/guide/index.md.

| File | What it shows | Made with |
|---|---|---|
| `doom.webp` (74 KB) | DOOM (doomgeneric, C) with OPL music, at 4:3, sharp filter | `doom.wasm --asset wad=doom1.wad --screenshot-filtered --filter sharp`, 1400 frames |
| `sky.webp` (82 KB) | ScummVM playing Beneath a Steel Sky, upscaled with xBR | `scummvm.wasm --asset-dir roms/bass`, xbr |
| `sumo.webp` (11 KB) | Sumo: 3D on `gasm:gfx` (WebGPU), lockstep netplay demo | `--input "130-900:RIGHT+A"` |
| `textured.webp` (104 KB) | Mipmapped textures, samplers, instancing, dynamic offsets on gasm:gfx | `textured.wasm` |
| `gltest.webp` (40 KB) | OpenGL ES 3 C code on gasm:gl in the browser player (WebGL 2) | `web-smoke.mjs` on `?game=gltest.wasm` |
| `godot3d.webp` (24 KB) | Godot 4.7 Compatibility renderer in 3D: shadows, PBR, physics | `godot.wasm --asset game.pck=scene3d.pck`, ANGLE |
| `godot2d.webp` (7.5 KB) | A Godot platformer: 2D physics, signals, a following camera | platformer.pck with scripted jumps |
| `egui.webp` (84 KB) | egui's demo, unchanged, painted by egui_glow on gasm:gl (Rust, through glow) | `eguidemo` with scripted pointer clicks |
| `woodeneye.webp` (12 KB) | SDL 3's woodeneye-008, source unchanged, on SDL for gasm | `sdl3-woodeneye` with W key + mouse move |
| `filters.webp` (24 KB) | One DOOM frame four ways: sharp, xBR, FSR, CRT (`--filter`, player filter menu) | 4 filtered DOOM shots composited |
| `player.webp` (55 KB) | The browser player running ScummVM: game, files, Worker mode, keyboard layout and the 2D filter controls at the top | headless Chrome on `runners/web/` |
