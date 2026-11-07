---
title: Working with agents
---

# Working with agents

Almost every commit in the ENCORE projects carries a `Claude-Session:` trailer: the ports were written by coding agents, steered by one person. What made that work was not the model but the scaffolding around it — an AGENTS.md that states the product, the rules, the commands and the expected outputs; a plan whose every step ends in a check a machine can run; commit bodies that serve as the project's memory; and rules for running unattended on a shared machine. This page describes those patterns with their evidence and ends with an AGENTS.md template distilled from the best of the nine projects.

## How fast it went

The commit history shows whole ports in days. The trailers make the sessions visible; the dates are commit dates.

| Project | Commits | Span | Notes |
|---|---|---|---|
| [OpenSheep](https://github.com/emdzej/opensheep) | 76 | 2026-11-01 13:31 to 11-02 18:39, about 29 h | One long session, same trailer on every commit; all 35 levels ported |
| [OpenGTA](https://github.com/emdzej/opengta) | 48 | 2026-10-02 to 10-03, two days | Every single-player subsystem; inventory in six parallel address ranges, port in "waves" |
| [OpenCMR2](https://github.com/emdzej/opencmr2) | 327 | 2026-10-31 to 11-03, four days | Whole offline game in about three days; bit-exact simulation via Unicorn |
| [OpenNFSPU](https://github.com/emdzej/opennfspu) | 570 | 2026-10-30 to 11-04, six days | One session; 13 merge commits from parallel worktree agents |
| [OpenOni](https://github.com/emdzej/openoni) | 90 | 2026-11-02 to 11-07, about six days | 89 of 90 commits with a trailer, across many sessions; all 15 levels play through |
| [OpenI76](https://github.com/emdzej/openi76) | 78 | 2026-11-06 to 11-07 | In progress, differential-tested from the first filler |

Speed outran verification in places — OpenSheep's own plan lists the full play-through, the side-by-side comparison and 12 levels outside the regression as still open — so the patterns below are as much about keeping fast work honest as about making it fast.

## What made AGENTS.md effective

The strongest files ([OpenCMR2](https://github.com/emdzej/opencmr2/blob/main/AGENTS.md), [OpenSheep](https://github.com/emdzej/opensheep/blob/main/AGENTS.md), [OpenI76](https://github.com/emdzej/openi76/blob/main/AGENTS.md), [OpenRF](https://github.com/emdzej/openrf/blob/main/AGENTS.md), [OpenGTA](https://github.com/emdzej/opengta/blob/main/AGENTS.md)) share a shape. Each element earns its place by preventing a specific failure.

### A one-paragraph identity

The exact binary (name, version, size, CRC-32), the gasm version, what the project is not ("not an emulator or a wrapper"), and the sibling repositories to copy from. An agent that knows the CRC cannot drift onto another build's addresses; one that knows the siblings copies a proven VFS instead of writing a new one.

### The product sentence

"**Fidelity is the product.** Reproduce the original's behaviour, including its quirks and bugs. If something looks wrong, check the disassembly; if the original does it, keep it and add a comment. Only fix deviations *of the port*." Without it, a capable agent improves the game. With it, the default action on a surprise is to read the disassembly.

### Numbered hard rules

Short, numbered, stable: never commit original data or derivatives (with the exact ignored paths); no tables copied from the executable, read them at run time; cite the address on every function; never paste decompiler output; community knowledge informs, the exe decides. Numbers let commits and reviews refer to "rule 2", and OpenBallance, which has no AGENTS.md, still invokes "OpenRF's rule 2" in its design document ([`design/analysis.md`](https://github.com/emdzej/openballance/blob/main/design/analysis.md)). Architecture invariants belong here too: only `platform_gasm.c` includes `gasm.h`, all data access through `vfs.h`, no blocking loops.

### A path map

A table of every directory and its purpose, and in OpenOni a dense state section mapping every source file to its subsystem and docs page, plus every debug `--param`. Agents locate code without searching, and the map shows where a new file belongs.

### Copy-paste commands with expected outputs

Build, test, headless run, regression — each a block that runs as written. Then the outputs: OpenRF records `--headless 689 ... demo=fire` → `video_fnv32=d014dcfb audio_fnv32=f1520dc1 audio_frames=486158`; OpenOni records `files=95 bytes=641025194 hash=9b4bdbfa` for its installer extractor; OpenBV records the frame-600 menu hash. An expected value turns "it seems to work" into a diff.

### "Before claiming a change works"

OpenSheep's block is two commands: `play_test` prints "ok", and `tools/regress.sh | diff - tests/hashes.txt && echo SAME`. OpenRF's adds zero renderer mismatches, byte-identical test WAVs for refactors, and a look at a headless frame for anything visible. Agents are optimistic about their own changes; a named gate is cheaper than a review.

### A traps list

"Traps (already solved: don't reintroduce)" — one line per hard-won fact. OpenRF: rendering mutates game state; sprite pixels index the palette shifted by 10; digital input needs magnitude bytes or vehicles move at 1/256 speed. OpenSheep: compare hashes with empty storage; `level=W.L` skips the pause menu; run Python helpers with `-P` because a local `dis.py` shadows the standard library. Each entry is a bug that will otherwise be found again by the next session.

### Dated user decisions

OpenBV's AGENTS.md records a presentation carve-out "by the user's decision (2026-10-09)" and names the files that hold it. Without a record, a later session either reverts the deviation or widens it; OpenBV's HUD was redesigned and reverted in consecutive commits before the rule existed ([`9b2b316`](https://github.com/emdzej/openbv/commit/9b2b316), [`33742e1`](https://github.com/emdzej/openbv/commit/33742e1)).

### Boundaries on irreversible actions

"Ask before tagging or pushing." OpenI76 goes further: the release tooling exists but must not be run, added to CI or tagged until the game is ported and the user asks.

## Commits as memory

The commit rule in every project is "imperative subject, body explaining why". The best bodies name the original function and address, what the port did wrong before, and what check now passes — OpenOni's "Level 8 plays through: GoToPoint's minimum radius, one-way doors…" ([`572f7b2`](https://github.com/emdzej/openoni/commit/572f7b2)), OpenNFSPU's "race-only hash 5777384f → 5635551f: the HUD now draws without fog" ([`85b7d27`](https://github.com/emdzej/opennfspu/commit/85b7d27)), OpenBV's "38 of 41 shots identical byte for byte" ([`11ae1ce`](https://github.com/emdzej/openbv/commit/11ae1ce)). The result is a log an agent can grep for "has this happened before", and a second changelog of design decisions.

Keep the session trailer the agent adds. It links each commit to the session that wrote it, which is how the timelines above could be reconstructed, and it makes a bad change traceable to its context.

## Plans that end in checks

OpenCMR2's and OpenOni's `docs/re/port-plan.md` are ordered steps — extractor, gasm skeleton, decoders, renderer, front end, simulation, scripts, audio, release — and "each step ends with something that can be checked against the original". OpenCMR2 updates the plan in place with "So far:" and "Done:" paragraphs. OpenRF's architecture notes give a recommended port order before any porting. A step without an automated check is where an agent declares victory early; a step with one either passes or tells the agent what to fix.

## Working in parallel

- **Inventory by address range.** MSVC links objects in source order, so a module is a contiguous address range. OpenGTA split its executable into six ranges, inventoried each separately (`docs/re/inventory-1.md` to `-6.md`, work files `re/names/1..6.tsv`) and merged them into one `names.tsv`; the port then came in waves ([`82cc3ea`](https://github.com/emdzej/opengta/commit/82cc3ea)). Ranges are independent, so they parallelise without merge conflicts.
- **Format owners.** OpenRF's architecture notes refer to "the ART.CAR agent", "the RFM agent", "the video agent": each format had an owner producing `docs/<fmt>.md`, `tools/<fmt>.py` and samples, from a shared briefing (`docs/CONTEXT.md`).
- **Worktree agents.** OpenNFSPU merged 13 branches from parallel worktree agents — and committed the worktrees themselves by mistake once ([`2d58c7a`](https://github.com/emdzej/opennfspu/commit/2d58c7a)). Put `.claude/` (or your agent's equivalent) in `.gitignore` before spawning them.
- **Cross-repository requests.** When the game needs something from the runtime, write a requirements document for the runtime's agent, with acceptance criteria and numbers from real runs: OpenRF's [`design/gasm-host-requirements.md`](https://github.com/emdzej/openrf/blob/main/design/gasm-host-requirements.md) became gasm 0.3.0's file-backed assets and Worker mode; OpenBallance's [`design/gasm-gfx-requirements.md`](https://github.com/emdzej/openballance/blob/main/design/gasm-gfx-requirements.md) became gasm 0.4.0's graphics.

## Unattended runs on a shared machine

Agents run builds, emulators, Ghidra and the game for hours. The rules that kept the machine usable, from [OpenI76's AGENTS.md](https://github.com/emdzej/openi76/blob/main/AGENTS.md) after parallel runs froze it:

- One run at a time per session. `pgrep -fl gasm-run` before starting; one run next to another session's single run is acceptable, niced ([`8794498`](https://github.com/emdzej/openi76/commit/8794498)).
- Everything under `nice -n 19`: `cmake --build build -j2`, `ctest -j1`, gasm builds `-j1`, regressions through `xargs -P 1`. A full Ghidra dump counts as a run.
- Kill hung runs as soon as their log stops growing.
- Headless only: always `--headless`, never a runner window, never macOS `screencapture` (it captures the user's desktop).
- Hold scripted keys several frames (`9000-9004:KEY(Enter)`): a one-frame tap can fall in a frame without a game step.
- Long `--screenshot` runs leak GPU memory (about 15 MB/s, 15 GB over Oni's level 1 route): add a parameter that draws only the last frames (`--param drawfrom=<N-50>`) before the first long run.
- Launchers get test hooks so no dialog can block: an environment variable for the data location that exits 2 instead of asking, `--dry-run`, and `HOME`/`XDG_*`/`APPDATA` pointed at a scratch directory.

Tool traps worth stating up front, because an agent cannot ask: ghidra-cli without `java_home` in its config waits on stdin forever (OpenGTA); ghidra-cli's own import can leave listings broken, so import with `analyzeHeadless` (OpenOni); the CLI can import a DLL with zero functions, so run analysis explicitly and check the count (OpenNFSPU); zsh does not word-split, so keep option lists in arrays; use `/usr/bin/cc` where `cc` may be aliased (OpenSheep).

## Sweeping stale notes

Agents write notes faster than they retire them. OpenNFSPU has a run of commits that only drop stale pending notes ([`1aa0f27`](https://github.com/emdzej/opennfspu/commit/1aa0f27)); its version-mismatch message still named a sibling project's executable, copied along with the file layer. OpenBV's site said online play was not there after the server shipped. At every milestone, sweep: `grep -rn PENDING_NOTE src`, the `... not ported` lines in a long headless log, the status page, the AGENTS.md state line, and error strings copied from siblings. Names files need the same care — OpenI76 removed duplicate rows from `names.tsv` twice ([`fd50748`](https://github.com/emdzej/openi76/commit/fd50748)).

## AGENTS.md template

Distilled from OpenCMR2, OpenSheep, OpenI76, OpenRF, OpenGTA and OpenBV. Replace every `<placeholder>`; delete sections that do not apply yet. The same file is in the [`encore-new-reimplementation`](/skills/) skill as `templates/AGENTS.md`.

````markdown
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

## Layout

| Path | What |
|---|---|
| `src/` | Portable core, in the original's module order: <modules>. `exe.c` (PE mapper), `vfs.c` (folders, ISO 9660, <archive>), `crt.c` (MSVC `rand`/`qsort`) |
| `src/platform.h`, `src/platform_gasm.c` | The platform contract and its only gasm implementation |
| `tests/` | Native tests against the user's data; each skips (exit 0) without it |
| `tools/` | Reference decoders (`<fmt>.py`, stdlib only), `ghidra/` scripts and `names.tsv`, `fetch-gasm-sdk.sh` (the one `GASM_VERSION` pin), `fetch-gasm-runner.sh`, `regress.sh`, `screenshots.sh`, `package-gasm.sh`, `smoke-gasm-bundle.sh`, `web-play-test.mjs` |
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
````

## Checklist

- [ ] AGENTS.md states the exact binary (size, CRC-32), the gasm version and the siblings to copy from.
- [ ] The product sentence: fidelity, keep quirks, fix only the port's deviations.
- [ ] Numbered hard rules on data, executable tables, address citations and decompiler output; `.gitignore` matches them.
- [ ] A path map and a state section kept current.
- [ ] Copy-paste build, test and headless commands, with the expected hash lines.
- [ ] A "before claiming a change works" block.
- [ ] A traps list, extended whenever a bug takes more than one attempt.
- [ ] User decisions recorded with dates and the files they affect.
- [ ] "Ask before tagging or pushing"; release tooling gated until the port is done.
- [ ] Commit bodies name the original function and address, the old wrong behaviour, and the check that now passes; session trailers kept.
- [ ] Port plan with an automated check per step, updated in place.
- [ ] Parallel work split by address range or format; `.claude/` (or equivalent) ignored before worktree agents start.
- [ ] Unattended-run rules: one run at a time, `nice -n 19`, `pgrep` first, headless only, keys held several frames, `drawfrom` for long screenshot runs, launcher test hooks.
- [ ] Stale-note sweep at every milestone.
