# AGENTS.md

Guidance for coding agents working in this repository. Humans: see [README.md](README.md) and
[open<game>.example.org](https://open<game>.example.org).

<!--
  ENCORE template. Replace every <placeholder>. Delete sections that do not apply yet, but keep the
  numbering of the hard rules stable once agents have seen them. Keep this file short enough to be read
  in full at the start of every session: facts, rules, commands, traps. Long explanations belong in
  docs/re/*.md, linked from here.
-->

## What this is

Open<Game> is a faithful, from-scratch reimplementation of **<Game>** (<Studio> / <Publisher>, <Platform>,
<Year>), the program `<EXE>` version <x.y> (<size> bytes, CRC-32 `<crc32>`), in C11. It targets
[gasm](https://github.com/emdzej/gasm) **<GASM_VERSION>** (`open<game>.wasm`: native runners on macOS, Linux
and Windows, and the browser). A native build exists for tools and headless tests only. Sibling projects with
the same conventions: `../<sibling>` (<what it is>); copy their proven pieces (file layer, gasm backend,
bundles, play page) rather than reinventing them.

It is not an emulator or a wrapper: every subsystem is ported function by function from the original
executable. **Fidelity is the product.** Reproduce the original's behaviour, including its quirks and bugs.
If something looks wrong, check the disassembly; if the original does it, keep it and add a comment. Only
fix deviations *of the port* from the original. Real undefined behaviour (reads past an array, uninitialised
stack words) is guarded, with a comment describing what the original reads.

**What the port adds** comes after the faithful game and is always opt-in: the default is the original.
Each addition gets a `--param`, a play-page setting and a line on the public status page, and must leave
the default hashes unchanged.

## Decisions by the user

<!-- Dated, with the files that hold the deviation. Agents must not widen or revert these on their own. -->

- <YYYY-MM-DD>: <decision, e.g. "menus are 16:9; gameplay and HUD stay original"> (`<file>`, `<file>`).

## State

Step <n> of `docs/re/port-plan.md`. Works: <list>. Not ported yet: <list>. `grep -rn PENDING_NOTE src`
is the to-do list; `docs/guide/status.md` is the public record. Read `docs/re/port-plan.md` (the order of
work, each step with its check), `docs/re/architecture.md` and `docs/re/inventory.md`.

## Hard rules

1. **Never commit original data or anything derived from it.** `cd/`, `game/`, `<exe copy>` (the Ghidra
   copy), `re/` (decompiler dumps), `out/` (decoded assets) are git-ignored: keep it that way. No disc
   images, archives, extracted textures, models, sounds, movies or cover scans. <Exception, if any: the
   site's screenshots in `docs/public/screenshots/`, renders of the port made by `tools/screenshots.sh`,
   never the game's own files.>
2. **No data copied from the executable into the source tree.** Tables, strings, geometry and float
   constants are read at run time from the user's `<EXE>` through `src/exe.h` (`exe_u8/u16/u32/s32/f32/f64`,
   `exe_str`; size + CRC checked). Small algorithmic constants and instruction operands are fine.
3. **Cite the original.** Every ported function names its source: `/* Name 0x4xxxxx */`; globals keep their
   address in the declaration comment. Names match `tools/ghidra/names.tsv`, the record; no `FUN_xxxxxx`
   in `src/`.
4. **Don't paste decompiler output** into source or docs. Write the port and the notes in your own words;
   describe layouts, formulas and addresses.
5. Community knowledge (<prior art>) may inform format understanding; the exe is the authority and no code
   is copied.
6. **All data access goes through `src/vfs.h`**: no `fopen` or `opendir` in the core. `src/platform_gasm.c`
   is the only file that includes `gasm.h`.
7. **Never add a blocking loop or a thread** in the core; keep the number and order of presents and clock
   reads the original has.
8. **Explain the game, not only port it.** Keep `docs/re/` and `docs/formats/` accurate as each subsystem is
   ported; when the game plays through, write `docs/guide/theory.md`, the theory of operation: how the game
   was designed and how it works, in prose, for someone who wants to build such a game. No decompiler text,
   no game data, no addresses in the main text.

## Layout

| Path | What |
|---|---|
| `src/` | Portable core, in the original's module order: <modules>. `exe.c` (PE mapper), `vfs.c` (folders, ISO 9660, <archive>), `crt.c` (MSVC `rand`/`qsort`) |
| `src/platform.h`, `src/platform_gasm.c` | The platform contract and its only gasm implementation |
| `tests/` | Native tests against the user's data; each skips (exit 0) without it |
| `tools/` | Exploration and cross-check scripts (`<fmt>.py`, optional), `ghidra/` scripts and `names.tsv`, `fetch-gasm-sdk.sh` (the one `GASM_VERSION` pin), `fetch-gasm-runner.sh`, `regress.sh`, `screenshots.sh`, `package-gasm.sh`, `smoke-gasm-bundle.sh`, `web-play-test.mjs` |
| `docs/` | VitePress site (`guide/`, `howto/`), player in `docs/public/play/`. `docs/re/` and `docs/formats/` are internal notes, excluded from the build |

## Game data

The user's copy: `<path to image>` (<size> bytes). Development copy: `./cd` (`bsdtar -xf <image> -C cd`).
Tests and tools read `OPEN<GAME>_DATA=<dir|image>` (default `./cd`) and skip without data. The folder and
the image must give identical results.

## Build and test

```sh
cmake -S . -B build && cmake --build build && ctest --test-dir build      # native: tests and tools
tools/fetch-gasm-sdk.sh
cmake -S . -B build-gasm -DOPEN<GAME>_PLATFORM=gasm -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_TOOLCHAIN_FILE=.deps/gasm-c-sdk/cmake/gasm-toolchain.cmake -DWASI_SDK_PREFIX="$PWD/.deps/wasi-sdk"
cmake --build build-gasm                                                  # -> build-gasm/open<game>.wasm
```

Sources are globbed: re-run both configure lines after adding a file. Both builds must be warning-free.

**Before claiming a change works:**

```sh
OPEN<GAME>_<FMT>_SUMMARY=$(tools/<fmt>.py --summary cd) ctest --test-dir build --output-on-failure
RUN=.deps/gasm-runner-macos-universal/gasm-run
$RUN build-gasm/open<game>.wasm --asset cd=<image> --headless <N> --input "<script>"   # folder: --asset-dir cd
tools/regress.sh 2>/dev/null | diff - tests/hashes.txt && echo SAME
```

Expected: `video_fnv32=<hash> audio_fnv32=<hash> audio_frames=<n>` for `<N> <params>`, identical for the
folder and the image, on gasm-run and on the Node runner (`npx -p @emdzej/gasm-host gasm-headless`). A change
that alters a hash must be explained by the change: say which hash moved and why in the commit body, check it
with a screenshot, and re-baseline `tests/hashes.txt` in the same commit. Compare hashes with empty storage.

## Reverse engineering

- Ghidra project `<game>`, program `<game>.exe` (a copy of `cd/<EXE>`, base 0x400000), via ghidra-cli:
  `ghidra decompile 0xADDR --project <game> --program <game>.exe`, plus `x-ref to`, `disasm`, `memory`.
- `tools/ghidra/apply-names.sh` applies `names.tsv` (addr, name, module, confidence, description) and
  regenerates `re/all.c`, `re/meta.tsv` (size, callers, callees, strings) and `re/funcs.txt`. Rename in the
  TSV, never only in Ghidra.
- For arithmetic, x87 code, switches and byte stores, read the disassembly: the decompiler drops and merges
  operations.
- Record findings in the matching `docs/re/` page with exact layouts and addresses; mark confirmed vs inferred.
- Unported callees go to `PENDING_NOTE(0xADDR, "Name")` (logs once, neutral return); never a silent stub.

## Unattended runs

- Always `--headless`; never open a runner window, never use macOS `screencapture`.
- One run at a time, niced: `pgrep -fl gasm-run` first; `nice -n 19` for builds (`-j2`), tests (`-j1`),
  regressions (`xargs -P 1`) and full Ghidra dumps. Kill hung runs (a log that stopped growing).
- Hold scripted keys several frames (`100-104:KEY(Enter)`): a one-frame tap can land in a frame without a
  game step.
- Long `--screenshot` runs grow GPU memory: use `--param drawfrom=<N-50>`.
- Launcher tests: point `HOME`/`XDG_*`/`APPDATA` at a scratch dir and use `OPEN<GAME>_DATA` / `--dry-run`, so
  no dialog can block.

## Traps (already solved: don't reintroduce)

<!-- One line or short paragraph per hard-won fact, with the address or commit. Add to it whenever a bug
     took more than one attempt. Examples of the kind of entry that pays off: -->

- `<trap>` (<address or commit>).
- ghidra-cli without `java_home` in its config waits on stdin forever.
- In zsh, keep option lists in an array (`P=(--project <game> --program <game>.exe)`, then `$P`).

## Docs site

VitePress in `docs/` (`cd docs && pnpm install && pnpm build`), published by `.github/workflows/pages.yml`.
No emojis. Don't overstate the state (`docs/guide/status.md`). Say "bring your own copy"; never call the game
free or freeware without an official source; never host or link copies. The "Built for gasm" badge is
hotlinked unmodified from `https://gasm.emdzej.pl/badge/`. New pages go in the sidebar; dead links fail the
build.

## Releases

Plain semver tags, no `v`; the tag must equal `project(Open<Game> VERSION ...)`. **Ask before tagging or
pushing.** <Until the game is ported: don't run the bundle tooling and don't tag.>

## Commits

Imperative subject. The body says why, names the original function and address, what the port did wrong
before, and which check now passes (which hashes moved and why). Never commit `cd/`, `game/`, `re/`, `out/`,
`build*/`, `.deps/`, `.claude/`, `docs/node_modules/`.
