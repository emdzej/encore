---
name: encore-verification
description: Sets up and runs the verification ladder for a faithful 1:1 reimplementation of an old PC game on the gasm WebAssembly runtime - virtual clock at the original tick rate, golden video/audio FNV hash lines compared across gasm-run, the Node runner and the browser, folder-vs-disc-image checks, explained re-baselines, Python reference decoders, Unicorn differential tests of the original's machine code, reference-renderer pixel diffs, scripted whole-game regression, ASan/UBSan native builds, tests that skip without game data, and greppable not-ported coverage. Use when adding or changing ported code, when a hash moves, when bootstrapping test infrastructure for a new port, or before claiming a change works.
---

# ENCORE verification

Every ENCORE port (OpenRF, OpenGTA, OpenCMR2, OpenNFSPU, OpenSheep, OpenOni, OpenBallance, OpenBV, OpenI76) rests on one property: the same `.wasm`, data, parameters and scripted input give the same hash line on every gasm runner. On top of that sit stronger checks. This skill tells you which to build, in what order, and how to run them.

## When to use

- Before claiming any change to ported code works.
- When a golden hash changes and you must decide whether the change explains it.
- When bootstrapping a new port's test infrastructure.
- When a bug appears only in one runner, one data source or the browser.

## Inputs

- The project's AGENTS.md (golden hash lines, exact commands, traps).
- The user's game data: a folder and, ideally, a disc image of the same data. Paths usually come from an env var such as `OPEN<GAME>_DATA=<dir|image>`.
- A built `build-gasm/<game>.wasm` and a native `build/` of the same core.
- A released `gasm-run` (`tools/fetch-gasm-runner.sh <platform>`) and Node 22+.

## Procedure

### 1. Make time virtual

- Replace every `timeGetTime`, `GetTickCount`, `QueryPerformanceCounter` and `clock()` with a clock advanced per frame. Never read wall time in the simulation.
- Set the gasm frame rate to the original's tick rate when that makes the timestep constant (16 ms ticks: `gasm_set_frame_rate(62.5)`; then frame N shows game time `16*(N-1)` ms).
- Keep the number and order of presents and clock reads exactly as the original loop had them.

### 2. Establish the golden hash line

```sh
RUN="$(tools/fetch-gasm-runner.sh macos-universal)/gasm-run"
$RUN build-gasm/game.wasm --asset cd=GAME.ISO --headless 600 --input "100-104:KEY(Enter)" --param level=1
npx -p @emdzej/gasm-host gasm-headless build-gasm/game.wasm --asset cd=GAME.ISO --headless 600 --input "100-104:KEY(Enter)" --param level=1
$RUN build-gasm/game.wasm --asset-dir cd --headless 600 --input "100-104:KEY(Enter)" --param level=1
```

All three must print the same `video_fnv32=… audio_fnv32=… audio_frames=…`. Record the line and the exact command in AGENTS.md. Add a script (`tools/headless-check.sh`) that CI runs.

Input syntax: `FROM-TO:KEY(Code)`, `N:PTR(x,y,L)`, `MOVE(dx,dy)`, `GP0(A0=1)`, pad names like `UP`, `A`. Hold keys at least 5 frames: a one-frame tap can land in a frame with no simulation step.

### 3. Add the browser and the bundles

- The play page accepts `?hashframes=N&input=…&size=1280x720&batch=1` and prints the same line (expose it as `globalThis.__<game>Result`).
- `tools/web-play-test.mjs` drives headless Chrome over CDP, hands the data to the page's own file input (`DOM.setFileInputFiles`), and requires import, later visit, no-import and disc-image runs to match gasm-run.
- The bundle smoke test, with data, runs the headless case through the launcher and requires the same hash as a direct gasm-run.

### 4. Decide every hash change

When a hash moves:

1. Can the change explain it? Write which hash moved, from what to what, and why, in the commit body. Example: "Race-only hash (drive=autobahn, 300 frames) 5777384f -> 5635551f: the HUD now draws without fog. FE start unchanged."
2. Check headless screenshots before and after (`--screenshot out.png`).
3. Re-baseline only the cases the change explains, in the same commit. Never update all hashes blindly.
4. If the change cannot explain it, it is a bug — find it before committing.

### 5. Build the stronger checks, in this order

1. **Decoder parity**: each format's decoder prints one summary hash over every file on the disc, cross-checked once against an independent reader (the original's code under emulation, or a second implementation); the C test asserts it via an env var (`OPEN<GAME>_<FMT>_SUMMARY`).
2. **Viewers** behind `--param` (car, stage, level) as the renderer's first visual check.
3. **Device-state tests** of the GPU-free API recording layer.
4. **The original's own recordings** (replays, demos) played to the end through the port.
5. **Unicorn differential harness** (see `references/differential-harness.md`): original exe mapped at its addresses, port state rebuilt in the original layout, original function run, word-by-word diff. Run in every FPU mode the game uses.
6. **Reference renderer**: a bit-level Python port of the draw routine dumping index buffers for fixed and seeded fuzz scenes; the C renderer must report 0 mismatches.
7. **Whole-game regression**: per-level hashes (`tools/regress.sh | diff - tests/hashes.txt && echo SAME`) or scripted routes that play every level to its end with the game's own cheats.

### 6. Run native builds under sanitizers

```sh
cmake -S . -B build-asan -DCMAKE_C_FLAGS="-fsanitize=address,undefined -g" && cmake --build build-asan
OPEN<GAME>_DATA=cd ctest --test-dir build-asan --output-on-failure
```

wasm does not trap on out-of-bounds reads within linear memory or on use-after-free. Run scripted play natively under ASan/UBSan to find reads that differ between the original's layout and wasm's. Also build with GCC `-Werror` in CI; it catches format truncation and maybe-uninitialised cases clang misses.

### 7. Keep coverage greppable

- Unported callees: `PENDING_NOTE(0xADDR, "Name")` logs once and returns neutral. `grep -rn PENDING_NOTE src` is the to-do list.
- Hooks reached through data tables: log "<addr> not ported" once per address; grep long headless logs for it.
- Stand-ins: mark them with a `stand-in` comment.

## Hard rules

- Headless only in unattended runs: always `--headless`; never open a runner window; never use macOS `screencapture`.
- One run at a time, `nice -n 19`, `pgrep -fl gasm-run` first; kill runs whose log stopped growing.
- Data-dependent tests skip with exit 0 and print "skipped" when data is absent. CI never has game data.
- The module must refuse to start without data with "game data not found" and exit 1, not crash.
- Never "fix" the RNG or the original's behaviour to make a test pass.

## Pitfalls

- **Storage contaminates hashes.** A saved high-score file or settings change the RNG stream. Compare with empty storage (the headless default; avoid `--storage-dir` for hash runs).
- **`gasm:gl` hashes uploads only**, not clears or draws (a clears-only screen hashes `811c9dc5`). One extra texture changes the hash invisibly. Compare screenshots too.
- **Browser batching** shows fewer frames; use `batch=1` for hash runs.
- **Exit frames**: gasm-run calls `gasm_exit` before printing; a game that presents on exit differs from a Worker run. Compare page vs Node host before exit, then that host with exit vs gasm-run.
- **Address-ordered containers** differ between folder and image (different allocation patterns). Always run both.
- **Rendering mutates game state** in several originals (turrets activated by the draw pass, undrawn-tick timers). Headless tests must draw; use a `drawfrom=` dry-run that still runs drawing logic for long runs.
- **Long `--screenshot` runs leak GPU memory** (15 GB seen). Add `--param drawfrom=<N-50>`.
- **Harness bugs masquerade as port bugs**: the harness's own clock or a port-private table read by the original. Mirror tables in the original's layout; stub only callees that are side-effect free or consume only `rand`.
- **Network tests** need `--realtime` and `--allow-net`; virtual time outruns sockets.
- **libm differs native vs wasm**: compare hashes within one build target.

## Verification of this skill's work

You are done when: the golden line matches on gasm-run (folder and image), the Node runner and the browser page; every changed hash is explained in the commit body; native tests pass (or skip without data); the regression script prints SAME or only explained differences; the differential harness reports only identical lines for every function you touched.

## Further reading

- https://encore.emdzej.pl/guides/verification
- https://encore.emdzej.pl/guides/fidelity
- https://encore.emdzej.pl/guides/formats
- https://encore.emdzej.pl/guides/agents
