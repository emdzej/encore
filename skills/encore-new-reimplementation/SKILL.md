---
name: encore-new-reimplementation
description: Bootstrap a new faithful 1:1 reimplementation of an old PC game targeting the gasm WebAssembly runtime, end to end - choose the approach (port from disassembly, script runtime, source port), pin the exact executable by size and CRC-32, lay out the repository, write AGENTS.md from the bundled template, add fetch-gasm-sdk.sh with a single version pin, the CMake native/gasm platform switch, CI, and reach the first milestone. Use when starting a new ENCORE-style project or when an existing one lacks this scaffolding. This is the entry skill; it routes to encore-reverse-engineering, encore-file-formats, encore-port-function, encore-verification, encore-x87-fidelity, encore-gasm-backend, encore-netcode, encore-modern-additions, encore-data-hygiene and encore-ship-release.
---

# Start a new ENCORE reimplementation

A reimplementation is a from-scratch C11 rewrite of one exact game build, ported function by function (or
run as scripts, or compiled from released source), that runs as one `.wasm` guest on gasm: natively on
macOS, Linux and Windows and in the browser, from the user's own copy. Fidelity is the product.

## Hard rules (apply from the first commit)

1. Never commit original data or anything derived from it (disc images, exe copies, decompiler dumps,
   extracted assets). See `encore-data-hygiene`.
2. No tables, strings, geometry or float constants copied from the executable: read them at run time from
   the user's exe.
3. Every ported function cites its original address: `/* Name 0x4xxxxx */`.
4. Never paste decompiler output; write in your own words.
5. Reproduce quirks and bugs; only fix deviations of the port.
6. Ask the user before tagging, pushing or publishing anything.
7. Credit every outside source you lean on (community wikis, format docs, other builds used for names,
   reference decoders) in `docs/credits.md` as you go, not at the end.
8. The port ends with a theory of operation (`docs/guide/theory.md`); keep `docs/re/` current until then.
   See `encore-theory-of-operation`.

## Step 0 - Check the neighbours

Before any code, search for existing work on the game: decompilation projects, reimplementations, modding
communities, format wikis (GitHub, the game's community sites, modding forums). Record what you find in
AGENTS.md under "Prior work", with links. If a project is active, stop and tell the user: the ENCORE policy is
to contact its people and offer help or findings rather than start a competing port, and never to fork
someone else's decomp and "finish" it. Using published community knowledge to understand formats is fine —
credit it in `docs/credits.md`.

## Step 1 - Choose the approach

Decide with the user and record it in AGENTS.md "What this is".

| Situation | Approach | Example |
|---|---|---|
| Native game code in a Win32 exe (most cases) | Function-by-function port from disassembly (Ghidra) | OpenRF, OpenGTA, OpenCMR2, OpenNFSPU, OpenSheep, OpenOni, OpenI76 |
| Engine/middleware game whose logic is data (Virtools graphs, bytecode) | Port the engine's scheduler/VM and its building blocks; run the original scripts, never hand-translate them | OpenBallance |
| Source released under a compatible licence | Source port: import upstream verbatim in its own commit, replace only the platform beneath | OpenBV |

Read the import table first (`objdump -p`, Ghidra) - it lists the platform surface (DirectDraw only means a
software renderer; Direct3D 7, OpenGL, DirectSound, DirectInput, DirectPlay, Bink, Smacker, Miles, MCI CD
audio). Estimate effort in KB of `.text` per module, not function counts.

## Step 2 - Pin the executable

1. Find the real game binary (launchers and language stubs are not it: Return Fire's game is `RFIRE.BIN`,
   not `RFIRE.EXE`). Prefer the last official patch; note where it lives on the media (it may exist only
   inside an InstallShield cabinet or VISE archive).
2. Record identity:

   ```sh
   stat -f %z game.exe            # Linux: stat -c %s
   crc32 game.exe                 # or: python3 -c 'import zlib,sys;print("%08x"%zlib.crc32(open(sys.argv[1],"rb").read()))' game.exe
   shasum game.exe
   ```

3. Put size and CRC-32 in `src/exe.h` (`EXE_SIZE`, `EXE_CRC32`), in AGENTS.md, in the launchers and in the
   play page. The loader refuses any other build with a message naming the expected size and CRC.

## Step 3 - Repository layout

Copy from the newest sibling rather than writing anew (VFS, `exe.c`, `platform_gasm.c`, bundles, play page).
Grep every copied file for the sibling's name and numbers afterwards: copied error strings go stale.

```
CMakeLists.txt            project(Open<Game> VERSION 0.0.1 LANGUAGES C)
AGENTS.md                 from templates/AGENTS.md
src/                      portable core; platform.h contract; platform_gasm.c (only includer of gasm.h)
  exe.c exe.h             PE mapper: size+CRC check, sections at RVAs, exe_u8..f64/exe_str by VA
  vfs.c vfs.h             folders + ISO 9660 (2048, 2352 MODE1/MODE2), case-insensitive, both separators
  pending.h               PENDING_NOTE(addr, name): log once, neutral return
tests/                    *_test.c against the user's data; skip (exit 0) without it
tools/                    fetch-gasm-sdk.sh, fetch-gasm-runner.sh, ghidra/ (names.tsv, scripts), <fmt>.py
docs/                     VitePress site; docs/re/ and docs/formats/ internal (srcExclude)
```

`.gitignore` (anchored to the root, or `game/` will also match `src/game/`):

```
/cd/
/game/
/re/
/out/
/build*/
/.deps/
/.claude/
/docs/node_modules/
/docs/.vitepress/dist/
/docs/.vitepress/cache/
/docs/public/play/vendor/
/docs/public/play/*.wasm
*.iso
*.bin
*.cue
*.exe
*.dll
```

## Step 4 - AGENTS.md

Copy `templates/AGENTS.md` from this skill to the repository root and fill every `<placeholder>`: identity
(size, CRC, gasm version, siblings), the fidelity sentence, numbered hard rules, layout, data location and
env var, build/test commands, "before claiming a change works" with expected hashes (fill once known),
unattended-run rules, traps, docs rules, release rule, commit rule. Keep it short; long material goes to
`docs/re/*.md`. Further reading: https://encore.emdzej.pl/guides/agents

## Step 5 - gasm SDK pin

`tools/fetch-gasm-sdk.sh` is the single place the gasm version is set; CI, Pages, release and the runner
fetch all call it. Keep `@emdzej/gasm-host` in `docs/package.json` equal to it.

```sh
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
WASI_SDK_VERSION=${WASI_SDK_VERSION:-34}
GASM_VERSION=${GASM_VERSION:-0.16.1}   # keep in step with @emdzej/gasm-host in docs/package.json
if [ "${1:-}" = --version ]; then echo "$GASM_VERSION"; exit 0; fi
case "$(uname -s)-$(uname -m)" in
  Darwin-arm64) PLAT=arm64-macos ;; Darwin-x86_64) PLAT=x86_64-macos ;;
  Linux-x86_64) PLAT=x86_64-linux ;; Linux-aarch64) PLAT=arm64-linux ;;
  *) echo "unsupported host" >&2; exit 1 ;;
esac
mkdir -p .deps
if [ ! -x .deps/wasi-sdk/bin/clang ]; then
  curl -fsSL "https://github.com/WebAssembly/wasi-sdk/releases/download/wasi-sdk-$WASI_SDK_VERSION/wasi-sdk-$WASI_SDK_VERSION.0-$PLAT.tar.gz" | tar xz -C .deps
  rm -rf .deps/wasi-sdk && mv ".deps/wasi-sdk-$WASI_SDK_VERSION.0-$PLAT" .deps/wasi-sdk
  [ "$(uname -s)" = Darwin ] && xattr -dr com.apple.quarantine .deps/wasi-sdk 2>/dev/null || true
fi
if [ "$(cat .deps/gasm-c-sdk/VERSION 2>/dev/null)" != "$GASM_VERSION" ]; then
  curl -fsSL -o .deps/gasm-c-sdk.zip "https://github.com/emdzej/gasm/releases/download/$GASM_VERSION/gasm-c-sdk-$GASM_VERSION.zip"
  rm -rf .deps/gasm-c-sdk && (cd .deps && unzip -q gasm-c-sdk.zip && mv "gasm-c-sdk-$GASM_VERSION" gasm-c-sdk && rm gasm-c-sdk.zip)
  echo "$GASM_VERSION" > .deps/gasm-c-sdk/VERSION
fi
```

Add `tools/fetch-gasm-runner.sh <platform>` (downloads the released `gasm-run`, plus ANGLE for `gasm:gl`
games, into `.deps/gasm-runner-<platform>/` and prints the folder). Use `if/then` rather than `A && B || C`
if shellcheck runs in CI (SC2015).

## Step 6 - CMake platform switch

```cmake
cmake_minimum_required(VERSION 3.24)
project(Open<Game> VERSION 0.0.1 LANGUAGES C)
set(CMAKE_C_STANDARD 11)
set(OPEN<GAME>_PLATFORM native CACHE STRING "native or gasm")
file(GLOB CORE_SRC src/*.c src/*/*.c)              # re-run configure after adding files
list(REMOVE_ITEM CORE_SRC ${CMAKE_SOURCE_DIR}/src/platform_gasm.c)
set(WARN -Wall -Wextra -Wno-unused-parameter)

if(OPEN<GAME>_PLATFORM STREQUAL "gasm")
  include(Gasm)
  gasm_add_game(open<game> ${CORE_SRC} src/platform_gasm.c)
  target_include_directories(open<game> PRIVATE src)
  target_compile_options(open<game> PRIVATE ${WARN} -O2 -ffp-contract=off)
  target_link_options(open<game> PRIVATE -Wl,-z,stack-size=1048576 -Wl,--strip-debug)
  return()
endif()

add_library(og_core STATIC ${CORE_SRC})            # native: tests and tools only
target_include_directories(og_core PUBLIC src)
target_compile_options(og_core PRIVATE ${WARN} -ffp-contract=off)
enable_testing()
file(GLOB TESTS tests/*_test.c)
foreach(t ${TESTS})
  get_filename_component(n ${t} NAME_WE)
  add_executable(${n} ${t})
  target_link_libraries(${n} og_core m)
  add_test(NAME ${n} COMMAND ${n} WORKING_DIRECTORY ${CMAKE_SOURCE_DIR})
endforeach()
```

Configure the gasm build:

```sh
tools/fetch-gasm-sdk.sh
cmake -S . -B build-gasm -DOPEN<GAME>_PLATFORM=gasm -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_TOOLCHAIN_FILE=.deps/gasm-c-sdk/cmake/gasm-toolchain.cmake -DWASI_SDK_PREFIX="$PWD/.deps/wasi-sdk"
cmake --build build-gasm
```

The 1 MiB stack is mandatory: wasm-ld's 64 KiB default overflows silently. Backend details (frame rate,
blocking loops vs `gasm_wait_frame`, audio, input): `encore-gasm-backend`.

## Step 7 - CI (`.github/workflows/ci.yml`)

Jobs, from the sibling projects:

- native build and `ctest` on `macos-latest` and `ubuntu-latest`, with `-Werror` (add a GCC build: it
  catches what clang does not). Tests skip without data, so CI is a smoke test.
- `python3 -m py_compile tools/*.py`.
- wasm build with `-Werror`, uploaded as an artifact; assert the module refuses to start without data
  (exits 1 with "game data not found").
- `shellcheck` on every script.

Add `pages.yml` and `release.yml` later (`encore-ship-release`); copying them early is fine, running them is
not.

## Step 8 - Reverse-engineering setup

Ghidra project with a copy of the exe (git-ignored), `tools/ghidra/names.tsv` (addr, name, module,
confidence, description) as the single record, `apply-names.sh` regenerating `re/all.c` and `re/meta.tsv`,
`FillGaps` for vtable/callback functions, then `docs/re/inventory.md` (address ranges, anchor functions, KB
per module) and `docs/re/architecture.md`. Follow `encore-reverse-engineering`.

## Step 9 - Port plan

Write `docs/re/port-plan.md`: ordered steps, each ending in an automated check. A typical order: 0 file
layer and data access, 1 gasm skeleton, 2 formats, 3 renderer with a viewer param, 4 front end, 5 game core,
6 subsystems, 7 audio and movies, 8 browser player, 9 site, 10 release, then opt-in additions, and last
the theory of operation (`encore-theory-of-operation`).

## Step 10 - First milestone

Done when all of these pass:

1. `exe_test`: the user's exe is found through the VFS, size + CRC match, sections map.
2. `vfs_test`: the same file read from the folder and from the disc image is byte-identical.
3. The gasm module, run without data, exits 1 with "game data not found":
   `gasm-run build-gasm/open<game>.wasm --headless 5`.
4. With data, a headless run prints a stable hash line, identical for `--asset-dir cd` and `--asset cd=<image>`:
   `gasm-run build-gasm/open<game>.wasm --asset cd=<image> --headless 60`.
5. The first format has a decoder with a recorded whole-disc summary hash, confirmed by an independent reader
   (`encore-file-formats`).

Record the hashes in AGENTS.md.

## Routing - which skill next

| Task | Skill |
|---|---|
| Ghidra, names, inventory, cross-build name transfer | `encore-reverse-engineering` |
| Decoding a file format, archives, installers | `encore-file-formats` |
| Porting one function or subsystem | `encore-port-function` |
| Hashes, regressions, Unicorn differential tests | `encore-verification` |
| x87 precision, rounding modes, NaN compares, CRT `rand`/`qsort` | `encore-x87-fidelity` |
| `platform_gasm.c`, graphics/audio/input mapping | `encore-gasm-backend` |
| DirectPlay/WinSock/custom netcode over gasm-relay | `encore-netcode` |
| Widescreen, hi-res, skins as opt-in layers | `encore-modern-additions` |
| What may be committed, wording, data sources | `encore-data-hygiene` |
| Browser player, bundles, release, docs site | `encore-ship-release` |
| Explaining how the game works: the theory of operation | `encore-theory-of-operation` |

## Pitfalls

- Starting on the wrong build: every address becomes wrong. Pin before naming anything.
- Unanchored `.gitignore` entries silently excluding source directories.
- Agent worktrees committed by mistake: ignore `.claude/` before spawning parallel agents.
- Releasing early: keep release tooling unused until the game is ported and the user asks.
- Copying a sibling without grepping for its name, sizes and CRCs.

## Further reading

- https://encore.emdzej.pl/guides/
- https://encore.emdzej.pl/guides/approach
- https://encore.emdzej.pl/guides/project-layout
- https://encore.emdzej.pl/guides/agents
- https://encore.emdzej.pl/guides/lessons
