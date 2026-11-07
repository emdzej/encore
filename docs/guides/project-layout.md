---
title: Anatomy of a project
---

# Anatomy of a project

All ENCORE projects share one repository shape, because each new port began by copying the previous one. The shape is a portable C core in `src/` that never touches the operating system, one backend file that is the only place gasm is called, Python reference tools, data-driven tests that skip without the user's copy, a VitePress site, and git-ignored folders for the original data and everything derived from it. A CMake switch builds either a native test binary or the `.wasm`, one script pins the gasm version, and the original executable is identified by its exact size and CRC-32. This page describes each part, the naming conventions, and why they are arranged this way.

## The tree

```text
open<game>/
├── AGENTS.md              rules, layout, commands, golden hashes, traps
├── CMakeLists.txt         <P>_PLATFORM=native|gasm
├── LICENSE                GPL-3.0
├── README.md
├── src/
│   ├── platform.h         the platform contract (video, input, audio, storage, params, log)
│   ├── platform_gasm.c    the only file that includes gasm.h
│   ├── platform_host.c    native backend for tests and tools (some projects)
│   ├── vfs.h / vfs.c      every file access; directories and disc images
│   ├── vfs_host.c         native directory backend
│   ├── exe.h / exe.c      maps the user's executable, checks size + CRC-32
│   ├── app.c              the frame-driven application loop
│   └── <module>/          ported code, grouped like the original
├── tests/                 <module>_test.c, run on real data, skip without it
├── tools/
│   ├── fetch-gasm-sdk.sh  the single gasm version pin
│   ├── fetch-gasm-runner.sh, package-gasm.sh, smoke-gasm-bundle.sh, gasm-bundle/
│   ├── screenshots.sh, web-play-test.mjs
│   ├── ghidra/            names.tsv, ApplyNames/FillGaps/DumpAllNamed scripts
│   └── <fmt>.py           exploration and cross-check scripts (optional)
├── docs/                  VitePress site; docs/re/ excluded from the build
│   └── public/play/       static browser player (wasm and vendor/ git-ignored)
├── design/                requirement documents for other repositories
├── re/                    git-ignored: decompiler dumps, meta tables
├── out/                   git-ignored: decoder output, local renders
├── cd/ or game/           git-ignored: the user's data
└── .deps/                 git-ignored: wasi-sdk, gasm C SDK, runners
```

Concrete examples: [OpenRF](https://github.com/emdzej/openrf), [OpenCMR2](https://github.com/emdzej/opencmr2), [OpenSheep](https://github.com/emdzej/opensheep). Deviations are small and deliberate:

- OpenSheep keeps its internal notes in `notes/` rather than `docs/re/`, after moving them off the public site ([`e9b3ff1`](https://github.com/emdzej/opensheep/commit/e9b3ff1)).
- OpenNFSPU groups `src/` by the original's libraries: `real/`, `eagl/`, `front/`, `game/`, `render/`, `snd/` ([porting.md](https://github.com/emdzej/opennfspu/blob/main/docs/internals/porting.md)).
- OpenBallance groups by runtime layer: `ck/` (the Virtools runtime), `bb/` (Building Blocks, one file per original DLL), `phys/` (Ipion).
- OpenBV, a source port, has `src/game/` and `src/engine/` vendored from upstream, with all new code in `src/port/`.
- OpenBallance has no AGENTS.md; its `design/analysis.md` adopts OpenRF's rules by reference.

## The portable core and its one backend

The core is plain C11 and compiles natively as well as for wasm32. Two rules keep it portable, and every AGENTS.md states them as invariants:

- **Only `src/platform_gasm.c` includes `gasm.h`.** Everything the game needs from the host goes through `src/platform.h`: present a frame, read keys and pads, push audio, read launch parameters, load and save user files, log. OpenGTA's backend is 272 lines; gasm's guide puts a typical one at about 400.
- **All data access goes through `src/vfs.h`.** There is no `fopen` or `opendir` in the core ([OpenGTA AGENTS.md](https://github.com/emdzej/opengta/blob/main/AGENTS.md), [OpenOni AGENTS.md](https://github.com/emdzej/openoni/blob/main/AGENTS.md)).

The payoff is the native build. Because the core has no platform dependency, it builds on the host with `vfs_host.c` and `platform_host.c`, which gives:

- headless tests against the real data;
- AddressSanitizer and UBSan runs, which found OpenSheep's browser-only out-of-bounds read ([`874afab`](https://github.com/emdzej/opensheep/commit/874afab)) and an unterminated text scan in OpenNFSPU;
- native tools built on the same code, such as OpenSheep's level renderer `tools/overview.c`;
- in OpenI76, a shared library (`-DOPENI76_SHARED=ON`) that the Unicorn harness calls through ctypes.

A comment in OpenSheep's CMakeLists.txt puts it this way: "The whole core compiles natively too (no platform dependency can creep in)."

The backend also pins platform constants to the core's at compile time, for example `_Static_assert(PAD_A == GASM_BTN_A && ...)` in [OpenNFSPU's platform_gasm.c](https://github.com/emdzej/opennfspu/blob/main/src/platform_gasm.c). For what the backend does each frame, see [Building for gasm](/guides/gasm) and [Graphics, audio, input](/guides/platform-layers).

## The CMake platform switch

One cache variable selects the build. From [OpenSheep's CMakeLists.txt](https://github.com/emdzej/opensheep/blob/main/CMakeLists.txt):

```cmake
file(GLOB CORE_SRC src/*.c src/game/*.c)
set(OPENSHEEP_PLATFORM native CACHE STRING "Platform: native (tests) or gasm (the game)")
if(OPENSHEEP_PLATFORM STREQUAL "gasm")
  include(Gasm)
  gasm_add_game(opensheep ${CORE_SRC} src/platform_gasm.c)
  target_link_options(opensheep PRIVATE -Wl,-z,stack-size=1048576 -Wl,--strip-debug)
  return()
endif()
# native: static core library + host pieces + tests/*_test.c + tools
```

Configure the gasm build with the SDK's toolchain file:

```sh
tools/fetch-gasm-sdk.sh
cmake -S . -B build-gasm -DOPENSHEEP_PLATFORM=gasm -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_TOOLCHAIN_FILE=.deps/gasm-c-sdk/cmake/gasm-toolchain.cmake \
  -DWASI_SDK_PREFIX="$PWD/.deps/wasi-sdk"
cmake --build build-gasm
```

Settings every project ended up needing:

| Setting | Why |
|---|---|
| `-Wl,-z,stack-size=1048576` | wasm-ld's default stack is 64 KiB, and an overflow silently corrupts the data below it. Map, style and level loaders keep large buffers on the stack (OpenGTA, OpenBallance, OpenSheep). |
| `-Wl,--strip-debug` | Smaller module. Keep the name section in debug builds for named trap backtraces. |
| `-Wall -Wextra -Wno-unused-parameter`, `-Werror` in CI | OpenSheep requires both builds to be warning-free. |
| A GCC build in CI | GCC catches format truncation, maybe-uninitialised values and array-parameter overflows that clang misses (OpenGTA [`5206c47`](https://github.com/emdzej/opengta/commit/5206c47), [`114171b`](https://github.com/emdzej/opengta/commit/114171b)). |
| `-ffp-contract=off` or per-file FMA pragmas | No fused multiply-add where the original had two roundings (OpenI76, OpenGTA physics). See [Floating point](/guides/fidelity). |
| `file(GLOB ...)` | New files are picked up, but CMake must be re-run after adding one. |

Native builds are for tests and tools only. None of the projects ships a native game binary: the game ships as the `.wasm` plus a released gasm runner. OpenRF dropped its native SDL3 app in 0.4.0 ([`9492abc`](https://github.com/emdzej/openrf/commit/9492abc)).

## Pinning gasm

`tools/fetch-gasm-sdk.sh` is the single place the gasm version is set. It downloads wasi-sdk and the gasm C SDK into `.deps/`, writes a `VERSION` file so a changed pin re-fetches, and prints the pin with `--version` for the runner-fetch and release scripts ([OpenCMR2's script](https://github.com/emdzej/opencmr2/blob/main/tools/fetch-gasm-sdk.sh)):

```sh
WASI_SDK_VERSION=${WASI_SDK_VERSION:-34}
# Keep it in step with @emdzej/gasm-host in docs/package.json (the browser player's runner).
GASM_VERSION=${GASM_VERSION:-0.16.1}
if [ "${1:-}" = --version ]; then echo "$GASM_VERSION"; exit 0; fi
```

The browser player's `@emdzej/gasm-host` version in `docs/package.json` must match. Pins at the time of writing:

| `GASM_VERSION` | Projects |
|---|---|
| 0.16.1 | OpenCMR2, OpenNFSPU, OpenOni, OpenI76 |
| 0.16.0 | OpenSheep |
| 0.13.0 | OpenBV |
| 0.6.0 | OpenGTA, OpenRF, OpenBallance |

A pin bump is a change like any other. Read the runtime's CHANGELOG for host API changes, then re-run the hash checks, the browser test and the bundle smoke tests. OpenRF lost raw keyboard input in the browser when gasm-host 0.6.0 changed `GasmWorker.frames` to take `FrameStep`s, and an earlier bump broke the play page because a new file was not vendored ([`9492abc`](https://github.com/emdzej/openrf/commit/9492abc)).

## Pinning the executable

A function-by-function port is valid for exactly one build, because every address in it refers to that build. Each project therefore checks the user's executable by size and CRC-32 before using it, and refuses anything else with a message that names both values.

| Project | File | Bytes | CRC-32 | Where it is found |
|---|---|---|---|---|
| OpenRF | `RFIRE.BIN` (not `RFIRE.EXE`, a language stub) | 431,616 | `64c49a1b` | CD |
| OpenGTA | `WINO/Grand Theft Auto.exe` (2002 re-release) | 774,144 | `a5ca070e` | Installed folder or InstallShield 5 cabinet |
| OpenI76 | `I76.EXE` / `I76SHELL.DLL` (US v1.0) | 1,019,392 / 471,552 | `4129421d` / `eee0a66d` | Disc 1 |
| OpenCMR2 | `CMR2.exe` v1.11 | 1,228,800 | `44c022f4` | Inside the CD's InstallShield 6 cabinet |
| OpenNFSPU | `Porsche.exe` v3.5 | 2,129,965 | `fd2f5573` | Installed and patched folder |
| OpenSheep | `Sheep.exe` | 380,928 | `b7bcd581` | CD root |
| OpenOni | `Oni.exe` v1.0 / `binkw32.dll` | 1,527,808 / 286,208 | `a8223704` / `6696be85` | Inside the CD's VISE installer archive |

The identity lives in a header, as in [OpenSheep's exe.h](https://github.com/emdzej/opensheep/blob/main/src/exe.h):

```c
#define EXE_FILE       "Sheep.exe"        /* looked up case-insensitively in the data root */
#define EXE_IMAGE_BASE 0x400000u
#define EXE_SIZE       380928u            /* the supported build (Sheep, Empire Interactive, Jan 2001) */
#define EXE_CRC32      0xb7bcd581u        /* CRC-32 (IEEE) of the whole file */
```

It is repeated in AGENTS.md, in the launchers and in the browser player's data check (which validates the size before importing). The same check doubles as version detection. OpenGTA reports "unsupported version (expected the 2002 release: 774,144 bytes, CRC-32 a5ca070e)" for the retail CD's exe. OpenRF prints the size and CRC it found next to the expected ones, and says where the right file is ("Use RFIRE.BIN from the root of the Return Fire for Windows 95 CD", [exe.c](https://github.com/emdzej/openrf/blob/main/src/exe.c)).

Two cautions:

- **Pin DLLs whose tables you read.** OpenOni pins `binkw32.dll` as well, because the Bink decoder reads its Huffman tables from it.
- **Grep for copied messages.** OpenNFSPU's `exe.c` once still printed OpenGTA's expected size and CRC while its `exe.h` checked the right values. Search error strings whenever code is copied from a sibling.

The source port pins content differently. OpenBV's `tools/fetch-content.sh` fetches the GPL data from a pinned upstream commit and checks the file count and the SHA-256 of the tree ([fetch-content.sh](https://github.com/emdzej/openbv/blob/main/tools/fetch-content.sh)).

## What git must never see

Every project's first commit includes a `.gitignore` covering the user's data, copies of the executable, decompiler dumps and decoder output. OpenI76's is the strictest:

```text
/cd/ /cd2/ /i76.exe /i76shell.dll
*.exe *.EXE *.dll *.DLL *.iso *.ISO *.bin *.BIN *.cue *.CUE *.zfs *.ZFS *.smk *.SMK
/re/ /out/
build*/ .deps .scratch/
docs/public/play/vendor/ docs/public/play/*.wasm
```

- **Anchor patterns to the root.** OpenBV's unanchored `game/` also matched `src/game/`, so new files there were silently never added ([`cfde746`](https://github.com/emdzej/openbv/commit/cfde746)).
- **Ignore agent worktrees before starting parallel agents.** OpenNFSPU committed `.claude/worktrees/` by mistake and had to untrack them ([`2d58c7a`](https://github.com/emdzej/opennfspu/commit/2d58c7a)).
- **Keep synthetic fixtures explicit.** OpenNFSPU ignores the game's file extensions but re-allows `tests/fixtures/**`, which the tests' generators create without game data.
- **Screenshots are the only exception.** Renders of the port, made headless by `tools/screenshots.sh`, may be committed for the site. OpenOni commits none at all, treating any game frame as derived data.

## Naming conventions

| What | Convention | Source |
|---|---|---|
| Repository | `open<game>` | all |
| Module | `<repo>.wasm`, always under that name, because gasm derives the storage namespace from the file name | OpenGTA, OpenNFSPU |
| Function | Its name in `tools/ghidra/names.tsv`, never `FUN_xxxxxx`; the address in a comment, `/* BIG_findentry 0x565a30 */` | OpenNFSPU |
| C++ method | `Class_Method(Class *self, ...)`, `Class_ctor`, `Class_dtor` | OpenNFSPU |
| Global | Ghidra's name (`g_` prefix where named), original address in a comment | OpenNFSPU, OpenSheep |
| Source file | Named after the original source file when a string reveals it (`locatbig.c`), else after the module | OpenNFSPU |
| Original convention | Keep it: Bungie's `XXr` public, `XXi` internal prefixes in OpenOni | OpenOni |
| Test | `tests/<module>_test.c`, one ctest entry each | all |
| Data root | `OPEN<GAME>_DATA=<dir or image>`, default `./cd` or `./game` | all |
| Hash assertions | `OPEN<GAME>_<FMT>_SUMMARY` environment variables | OpenCMR2, OpenOni, OpenI76 |
| Tags | Plain semver, no `v`; must equal `project(... VERSION ...)` | all with releases |

## AGENTS.md and the docs

AGENTS.md is the project's working memory. The structure OpenGTA settled on is a good template: what this is (exact binary, size, CRC); hard rules, numbered; a layout table; where the game data goes; build and test commands; the gasm module and its hash contract; reverse-engineering commands and gotchas; docs-site rules; browser player; bundles; releases; commits. OpenOni adds a state section mapping every source file to its subsystem and docs page. OpenRF adds a "Traps (already solved: don't reintroduce)" section. See [Working with agents](/guides/agents).

The VitePress site under `docs/` is for players: guide, status, gallery and the play page. Reverse-engineering notes live in the repository for agents and are kept out of the build with `srcExclude` (`re/**`, `internals/**` in OpenCMR2). The player is a static app in `docs/public/play/`, linked with `target: _self` and excluded from dead-link checks. See [Browser player, releases, docs](/guides/shipping).

`design/` holds documents written for other repositories. OpenRF's `gasm-host-requirements.md` and OpenBallance's `gasm-gfx-requirements.md` specified runtime features, with acceptance criteria, for the agent working in the gasm repository. Both were implemented in gasm releases (0.3.0 and 0.4.0).

## Checklist

1. Create the repository from the closest sibling: `src/platform.h`, `platform_gasm.c`, `vfs.*`, `exe.*`, `tools/fetch-gasm-sdk.sh`, CMake switch, CI.
2. Write `.gitignore` first: data folders, executable copies, `re/`, `out/`, `build*/`, `.deps/`, agent worktrees, the play page's wasm and vendor folder. Anchor every pattern to the root.
3. Set `GASM_VERSION` in `tools/fetch-gasm-sdk.sh` and the same `@emdzej/gasm-host` version in `docs/package.json`.
4. Record the target executable's file name, size and CRC-32 in `exe.h` and AGENTS.md; make the loader refuse others with a message naming both values.
5. Configure both builds; confirm the native build compiles the whole core and the gasm build links with a 1 MiB stack.
6. Add the hard rules to AGENTS.md: no data, no tables from the executable in source, cite addresses, no pasted decompiler output, only `platform_gasm.c` includes `gasm.h`, all file access through `vfs.h`.
7. Make tests read `OPEN<GAME>_DATA` and exit 0 with "skipped" when it is absent, so CI passes without data.
8. Run `-Werror` builds with clang and GCC in CI.
9. Name the module `<repo>.wasm` everywhere it is built, bundled or served.
10. Continue with [Reverse engineering workflow](/guides/reverse-engineering).
