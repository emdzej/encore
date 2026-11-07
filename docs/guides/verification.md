---
title: Determinism and verification
---

# Determinism and verification

A faithful reimplementation is only as good as the evidence that it behaves like the original. Every ENCORE project rests on one property: the same `.wasm`, the same game data, the same parameters and the same scripted input give the same frame and audio hashes on every runner. On top of that sit progressively stronger checks — decoder parity over the whole disc, the original's own recordings played back, the original's machine code run in an emulator against the port's state, and scripted play-throughs of the whole game. This page describes each technique, the projects that use it, and the traps found along the way.

## The foundation: one module, one hash line

gasm runs a guest headless and prints a hash line over everything it presented and played:

```sh
gasm-run game.wasm --asset cd=GAME.ISO --headless 600 \
  --input "100-104:KEY(Enter),200:PTR(320,240,L)" --param level=1
# frames=600 presented=… size=…
# video_fnv32=1be66dd1 audio_fnv32=b56bc7ab audio_frames=220500
```

The same line comes out of the Node runner (`npx -p @emdzej/gasm-host gasm-headless`) and out of each project's browser player with `?hashframes=N&input=…`. gasm's own determinism suite asserts identical FNV-1a hashes across wasmtime JIT, wasmtime AOT and V8, on Linux x86_64/arm64, macOS and Windows ([gasm `spec/ABI.md`](https://github.com/emdzej/gasm/blob/main/spec/ABI.md)). Inside the guest, `time_ms` and the WASI clocks are virtual in headless runs and `random_get` is a fixed splitmix64 sequence, so a guest that takes time only from the runner is deterministic by construction.

The places a single module is compared:

| Comparison | How | Used by |
|---|---|---|
| gasm-run vs Node runner | same command, `gasm-headless` | every project |
| gasm-run vs browser | headless Chrome over CDP drives `?hashframes=N` | [cmr2](/games/cmr2), [nfspu](/games/nfspu), [rf](/games/rf), [sheep](/games/sheep), [gta](/games/gta), [bv](/games/bv), [oni](/games/oni) (`tools/web-play-test.mjs`) |
| Asyncify vs stack switching | `game.wasm`, `game-run.wasm`, `game.wasm --no-stack-switching` | [oni](/games/oni) |
| Folder vs disc image | `--asset-dir cd` vs `--asset cd=GAME.ISO` | [rf](/games/rf), [nfspu](/games/nfspu), [i76](/games/i76), [cmr2](/games/cmr2) |
| Installed folder vs installer cabinets | `--asset-dir game` vs `--asset-dir installer` | [gta](/games/gta) |
| Release bundle vs bare runner | headless run through the launcher must equal a direct `gasm-run` | [nfspu](/games/nfspu), [bv](/games/bv), [gta](/games/gta) |

## A virtual clock at the original's tick rate

Determinism starts with time. Each project replaces `timeGetTime`, `GetTickCount` or `QueryPerformanceCounter` with a clock advanced by the frame, and picks a gasm frame rate that makes the original's variable timestep collapse to a constant.

| Project | Original timing | Port |
|---|---|---|
| [rf](/games/rf) | `timeGetTime()>>4`, 16 ms ticks, delta clamped 0..12 | `set_frame_rate(62.5)`, 16 ms per present; delta is always one tick |
| [sheep](/games/sheep) | `elapsed_ms / 16` ticks per frame, cap 6 | `gasm_set_frame_rate(125/2)`, `virt_ms += 16` per present |
| [gta](/games/gta) | 70 Hz Miles timer, `Timer_WaitTicks(3)` (23.33 fps), front end `Sleep(35 - elapsed)` | levels at 70 Hz, front end at 1000/35 Hz; the timer counts rendered audio ([`5ebdbb6`](https://github.com/emdzej/opengta/commit/5ebdbb6)) |
| [cmr2](/games/cmr2) | `Timer_Sample` latches `timeGetTime()` per frame; fixed 25 Hz sim, capped at 5 steps | 60 Hz frames, clock advanced by the frame period |
| [nfspu](/games/nfspu) | 128 Hz multimedia timer thread | `app_ticks_ms()` = frames × 1000/60, `TIMER_ticks` derived from it |
| [i76](/games/i76) | `GetTickCount` as seconds, variable dt | `--param tick=<ms>` fixed step for headless runs |
| [bv](/games/bv) | `dkcInit(30)` fixed 30 Hz with catch-up | 60 Hz gasm frames; the engine timer reads the WASI clock, virtual headless |

[rf](/games/rf) shows why the choice matters: at 62.5 Hz frame N shows game time 16 × (N − 1) ms, so a moment in the game maps to an exact frame (`N = ceil(T/16) + 1`; 11,000 ms is frame 689), and frames are byte-identical across runners. Keep the number and order of presents and clock reads exactly as the original's loop had them — [rf](/games/rf)'s conversion of blocking loops into stepped states was checked byte-identical against the blocking version ([`1247f21`](https://github.com/emdzej/openrf/commit/1247f21)).

::: warning Scripted input and slow simulation ticks
When the game polls input per simulation step rather than per frame, a one-frame tap can land in a frame with no step. [cmr2](/games/cmr2) (25 Hz sim on 60 Hz frames) and [i76](/games/i76) both require scripted keys to be held several frames: `9000-9004:KEY(Enter)`, not `9000:KEY(Enter)`.
:::

## Golden hashes in AGENTS.md

Each project records reference hash lines next to the exact command that produces them, and treats any change as something the commit must explain.

| Project | Run | Recorded line |
|---|---|---|
| [rf](/games/rf) | `--headless 689 --param skip_intro=1 --param play=1 --param demo=fire` | `video_fnv32=d014dcfb audio_fnv32=f1520dc1 audio_frames=486158` ([AGENTS.md](https://github.com/emdzej/openrf/blob/main/AGENTS.md)) |
| [rf](/games/rf) | `--headless 900 … --param play2=1 --param demo=2p` | `video_fnv32=660f4ab4 audio_fnv32=31f91835 audio_frames=635040` |
| [bv](/games/bv) | frame 600, main menu, no input | `video_fnv32=1be66dd1 audio_fnv32=b56bc7ab` ([AGENTS.md](https://github.com/emdzej/openbv/blob/main/AGENTS.md)) |
| [gta](/games/gta) | `--asset-dir installer`, no hires | `video_fnv32=67c465c2 audio_fnv32=15edf4c8` ([docs/hires.md](https://github.com/emdzej/opengta/blob/main/docs/hires.md)) |
| [sheep](/games/sheep) | 23 levels × 1500 frames via `--param level=W.L` | one `video_fnv32` per level in [`tests/hashes.txt`](https://github.com/emdzej/opensheep/blob/main/tests/hashes.txt) |

The rule, in [nfspu](/games/nfspu)'s wording: "The folder and the image must give identical hash lines. A change that alters the hashes must be explained by the change." Commit messages then state which hashes moved and why — for example [`85b7d27`](https://github.com/emdzej/opennfspu/commit/85b7d27): "Race-only hash (drive=autobahn, 300 frames) 5777384f -> 5635551f: the HUD now draws without fog. FE start unchanged."

Re-baselining is a deliberate act:

- [sheep](/games/sheep) re-baselined every level when start-up high-score generation began drawing 60 `rand()` values, shifting every later stream ([`c4d7012`](https://github.com/emdzej/opensheep/commit/c4d7012)).
- [sheep](/games/sheep) [`38756d4`](https://github.com/emdzej/opensheep/commit/38756d4) re-baselined exactly the two levels whose idle runs hit a fixed NaN path, with before and after numbers.
- Never update all hashes blindly; check headless screenshots before and after.

### Things that move hashes without a real change

- **Persistent storage.** A saved `HiScore.tab` changes [sheep](/games/sheep)'s RNG stream; settings load only on the front-end path. Compare with empty storage (headless runs use an empty in-memory store unless `--storage-dir` is given).
- **GL upload hashing.** For `gasm:gl` games `video_fnv32` covers uploads (buffers, textures, uniforms), not clears or draws: a clears-only screen hashes `811c9dc5` ([oni](/games/oni)). One extra texture changes the hash with no visible difference. Compare screenshots (md5) as well.
- **Browser batching.** Games that skip drawing on frames gasm reports as not shown present fewer frames when the page batches; hash runs in the browser use `batch=1` ([oni](/games/oni) [`702c573`](https://github.com/emdzej/openoni/commit/702c573)).
- **Exit frames.** gasm-run calls `gasm_exit` before printing its hash; a game that presents a last frame on exit hashes differently in a Worker that cannot report it. [gta](/games/gta) and [bv](/games/bv) compare the page with a Node host before exit, and that host with exit against gasm-run.
- **Heap layout.** Uninitialised or past-the-end reads stay deterministic across runners but change when allocations change ([gasm `AGENTS.md`](https://github.com/emdzej/gasm/blob/main/AGENTS.md)). See [Floating point and the compiler](/guides/fidelity#memory-the-original-never-meant-to-read).

## Two data sources

Running the same scene from a folder and from a disc image is a cheap test with a high yield, because the two allocate memory differently. [nfspu](/games/nfspu)'s particle draw queue was a set keyed by address; folder and ISO drew rain spray in different orders until the queue was ordered by creation, matching the original's rising heap addresses ([`a130d52`](https://github.com/emdzej/opennfspu/commit/a130d52)). Make "folder == image" part of the hash suite, and where the game also ships inside an installer, add "installed == cabinets" ([gta](/games/gta) `cab_test`, [ballance](/games/ballance) `cab_test`).

## Decoder parity over the whole disc

Before any renderer exists, each format's decoder must print one summary hash over every file on the disc, checked against an independent reader — the original's code under emulation or a second implementation. [cmr2](/games/cmr2) covers 7,804 DDS, 4,003 TGA, 1,211 models, 604 WAVs, 10 music files and 72 fonts; [oni](/games/oni) 8,918 textures, 37,862 geometries and 155,232 instances. Tests read the expected values from environment variables (`OPENCMR2_FMT_IMAGES`, `OPENONI_DAT_SUMMARY`, `OPENI76_ZFS_SUMMARY`). Independent decoders such as ffmpeg or `afconvert` are oracles for understanding a difference, not authorities. Details are in [File formats and game data](/guides/formats).

## The original's own recordings

Games that record replays as input streams are free end-to-end physics tests.

- [cmr2](/games/cmr2) replays are 4-byte RLE control frames per step plus a snapshot at the go; the disc's demo runs play through the real race state machine.
- [nfspu](/games/nfspu)'s `replay.rpl` records only the human; AI re-drives, so any simulation drift shows. The original's replay reader run in the emulator agreed with the port on 4,667 packets.

Know when the drift is the original's: [cmr2](/games/cmr2)'s demo runs leave the road around step 230, and the original's code run free from the same start takes the same path, so the recordings likely come from another build. It is documented as a known issue rather than "fixed" ([`92859ab`](https://github.com/emdzej/opencmr2/commit/92859ab)).

## Differential testing with the original's machine code

The strongest technique in the collection: load the original executable into [Unicorn](https://www.unicorn-engine.org/), put the port's state into the original's memory layout, run the original function, and compare the result word for word with the port's.

| | [cmr2](/games/cmr2) | [nfspu](/games/nfspu) | [i76](/games/i76) |
|---|---|---|---|
| Harness | [`tools/emu/sim_diff.c`](https://github.com/emdzej/opencmr2/blob/main/tools/emu/sim_diff.c) (C) | [`tools/emu/emu_drive.py`](https://github.com/emdzej/opennfspu/blob/main/tools/emu/emu_drive.py), `emu_forces.py` (Python) | [`tools/emu/x86.py`](https://github.com/emdzej/openi76/blob/main/tools/emu/x86.py) + `diff_*.py`, port built as `libi76core` via ctypes |
| State | game-state image at the original data-section addresses (0x516000–0x831fff) | car, racers, globals, road, AI rebuilt in the original layout from a port dump, with copies of the original vtables | random or real inputs fed to both sides |
| Unit | every pass of `Sim_StepCars` per step | one function per call (drive step 0x49ef50, force task 0x49bcb0) | one function: polygon fillers, clippers, terrain, physics integrators, per-frame vehicle functions, mission load, FSM |
| Result | bit-exact over all 4,211 steps of the Fra01 demo ([`92859ab`](https://github.com/emdzej/opencmr2/commit/92859ab)) | 0 differing words over 248 sampled ticks; forces 0 over 465 steps ([`33977ab`](https://github.com/emdzej/opennfspu/commit/33977ab)) | 3,300 polygons identical, ties included ([`4a10697`](https://github.com/emdzej/openi76/commit/4a10697)) |

What made each work:

- **Memory at the original's addresses.** [cmr2](/games/cmr2) keeps the original's whole data section as one allocated block, accessed by original address (`gm32(0x52f2ac)`). That decision made the diff possible. Any access outside mapped regions stops with the address.
- **Callouts answered from recordings.** [nfspu](/games/nfspu) answers world-tree queries, edge queries and RTTI casts the emulator cannot run from the port's recorded results, so each function is tested in isolation. Fields that are pointers in the original and indices in the port are compared semantically.
- **Free runs.** `freerun.sh` carries the original's outputs into its next call, so the original runs on its own values over hundreds of ticks; `wholerace.sh` splits a 6,663-tick replay into parallel chunks. `FD_WATCH=<offset>` prints each write to a car word with its writer address; `FD_TRACE=<va>` prints registers at addresses to find the first divergence.
- **Every mode the game uses.** [i76](/games/i76) runs each diff at round-to-nearest and at round-down (control words 0x27f and 0x67f), because the game changes rounding mode mid-run. [`tools/emu/regress.sh`](https://github.com/emdzej/openi76/blob/main/tools/emu/regress.sh) runs every diff, then every mission's objects, start pass and FSM, then about 25 per-frame vehicle functions upright and upside down (`--upside` reaches flip and death branches), printing only non-identical lines plus counts.
- **Explicit skip lists.** Cases that cannot be reproduced (reads past a texture into stale heap) are detected and skipped by name (`BELOW_OUTSIDE`, `STALE_ROW`), never tolerated silently. Where the original reads an uninitialised stack slot, the harness reads the original's slot and feeds it to the port's mirror global ([`1417ab4`](https://github.com/emdzej/openi76/commit/1417ab4)).

The bugs this found are ones no review would: x87 64-bit vs 24-bit rounding, spin damping applied only with a corner on the ground, a damage counter decrementing per step ([cmr2](/games/cmr2)); 1–2 ULP divergence in 30–40 car words per tick and denormal torques on the grid at tick 448 ([nfspu](/games/nfspu) [`e47cee6`](https://github.com/emdzej/opennfspu/commit/e47cee6), [`364e0ea`](https://github.com/emdzej/opennfspu/commit/364e0ea)).

::: warning Harness bugs look like port bugs
[cmr2](/games/cmr2)'s divergence at step 3,200 was the harness's own `Timer_Centis` clock gating a roll sound's `rand` draw differently ([`753a5a0`](https://github.com/emdzej/opencmr2/commit/753a5a0)). The Kenya stage stopped at step 212 because the original's `Particle_Emit` read port-private tables; it was stubbed to just its three `rand` draws ([`a897a0c`](https://github.com/emdzej/opencmr2/commit/a897a0c)). Mirror port-private tables in the original's layout, and stub only callees that are side-effect free or consume nothing but `rand`. Note also that Unicorn's `fyl2x`/`f2xm1` are less exact than real FPUs; [i76](/games/i76) proved its gamma row correct by error analysis instead.
:::

## A reference renderer and a pixel diff

[rf](/games/rf) wrote [`tools/view.py`](https://github.com/emdzej/openrf/blob/main/tools/view.py), an integer- and bit-level Python port of `RenderWorldView` 0x419dd0, before the C renderer. It dumps 8-bit index buffers for seven fixed scenes; [`tools/render_cmp.py`](https://github.com/emdzej/openrf/blob/main/tools/render_cmp.py) runs the C `render_test` and requires 0 mismatches, and `--fuzz N` adds N random scenes from a fixed seed. [i76](/games/i76) and [ballance](/games/ballance) keep similar reference renderers for meshes and levels.

## Whole-game regression with scripted input

Hashes on a menu prove little about level 9. Projects make the whole game reachable headlessly.

- **Per-level hashes.** [sheep](/games/sheep) [`tools/regress.sh`](https://github.com/emdzej/opensheep/blob/main/tools/regress.sh) runs 23 levels × 1,500 frames and diffs against `tests/hashes.txt`: `tools/regress.sh | diff - tests/hashes.txt && echo SAME`.
- **Routes with the game's own cheats.** [oni](/games/oni) drives Konoko through every level with a route mini-language in `src/app.c` (waits, runs, jumps, fights, consoles, path planning through the room graph at run time, `M<message>` to resynchronise on script messages). The invincible/omnipotent/unstoppable switches are the game's own ([`28d22c0`](https://github.com/emdzej/openoni/commit/28d22c0)), so test runs add no non-original code paths. The check in many commits is "all 14 levels still play to their end". Any newly ported code that draws random numbers shifts later behaviour; routes are retuned, the RNG is never "fixed" ([`a1dd567`](https://github.com/emdzej/openoni/commit/a1dd567), [`97afefb`](https://github.com/emdzej/openoni/commit/97afefb)).
- **Probes in the headless runner.** [ballance](/games/ballance)'s `run_test` takes `KEYS="from-to:hexDIK"`, `TRACE_FROM`, `PHYSDEBUG`, `WATCHPARAM`, `SETCELLS` and lists which building blocks ran and which are missing.
- **Recipes in AGENTS.md.** [bv](/games/bv) keeps exact `--input` strings for Host tab, Start, weapon and spawn, so an agent reaches gameplay without exploring.

Long `--screenshot` runs grow runner memory by gigabytes ([oni](/games/oni) saw 15 GB over level 1). Use a `drawfrom=<N-50>` parameter that skips drawing until near the end — but keep the display's logic running, because some state updates during drawing.

## Rendering mutates game state

[rf](/games/rf)'s turrets activate from the draw pass, soldiers are removed after 120 undrawn ticks, and wreck timers count from the last drawn tick. [gta](/games/gta)'s sprite draw trees and HUD blink counters live in the renderer. Headless tests must render the view; the simulation cannot be run alone. A dry-run draw (`gl_dev_set_dry` in [oni](/games/oni)) skips GPU work while still running the drawing code.

## Native builds under sanitizers

wasm does not trap on use-after-free or out-of-bounds reads within linear memory. Building the same core natively for tests gives ASan and UBSan for free.

- [sheep](/games/sheep) found a browser-only "sheep lost after a hurdle": `g_sin[t/2]` with negative `t` read the draw list's tail (≈0.0) in the original but an integer table (NaN as a float) in wasm. ASan + UBSan with scripted play found it and a `g_anim[-1]` read ([`874afab`](https://github.com/emdzej/opensheep/commit/874afab)).
- [nfspu](/games/nfspu) ASan caught non-NUL-terminated text scanning ([`14427f0`](https://github.com/emdzej/opennfspu/commit/14427f0)).
- [gta](/games/gta) runs a GCC `-Werror` build in CI because GCC catches format truncation and maybe-uninitialised cases clang does not.

## Tests that skip without game data

Game data is never redistributable, so CI never has it. Data-dependent tests read a path from an environment variable (`OPENRF_DATA`, `OPENI76_DATA`, `OPENONI_DATA=<dir|image>`) and exit 0 with "skipped" when it is absent, so CI still builds and runs them as smoke tests. CI also asserts that the wasm refuses to start without data with a clear message ("game data not found", exit 1), and bundle smoke tests check the same through each launcher.

## Coverage of what is not ported yet

Porting top-down leaves calls into code that does not exist yet. Make them visible and greppable:

- `PENDING_NOTE(addr, name)` in `src/pending.h` ([cmr2](/games/cmr2), [nfspu](/games/nfspu)): logs the original's name and address once and returns a neutral value. `grep -r PENDING_NOTE src` is the to-do list (9 left at [nfspu](/games/nfspu)'s HEAD).
- Address-to-function maps for hooks reached through data: [sheep](/games/sheep)'s level descriptors hold exe addresses; an unknown one logs "… not ported" once per address ([`4bce89a`](https://github.com/emdzej/opensheep/commit/4bce89a)). Grep long headless logs for it.
- Marked stand-ins: [oni](/games/oni) keeps 27 `stand-in` comments in `src/` that go as originals are ported.

## Saying what has not been verified

Status pages list the gaps honestly: [gta](/games/gta) has not compared frames captured from the original; [ballance](/games/ballance)'s physics has not been compared numerically against recordings of the original; [oni](/games/oni) has no captured reference and plays its routes with cheats on; [sheep](/games/sheep)'s regression covers 23 of 35 levels. A future project should set up original-vs-port capture early. See [Lessons learned](/guides/lessons).

## Checklist

1. Replace every OS clock with a frame-advanced virtual clock; set the gasm frame rate to the original's tick rate where that makes the timestep constant.
2. Record a golden hash line and its exact command in AGENTS.md; check it in CI with a script (`tools/headless-check.sh` in [bv](/games/bv)).
3. Compare gasm-run, the Node runner and the browser page (`?hashframes=N`, `batch=1`) for the same module, data and input.
4. Run every hash case from both a folder and a disc image; add installer cabinets where the game ships in them.
5. Run hash comparisons with empty storage and default settings.
6. Give every format a whole-disc summary hash asserted from the C tests, cross-checked once against an independent reader.
7. Play the original's own replays or demos through the port as end-to-end tests.
8. Build a Unicorn harness: original exe mapped, port state in the original layout, callouts answered from recordings, word-by-word diff; run it in every FPU mode the game uses.
9. Keep a single regression script that prints only non-identical lines; run it niced and sequentially.
10. Make every level reachable headlessly (level parameters, cheats the game already has, scripted routes) and hash each.
11. Build natively with ASan and UBSan and run scripted play under it.
12. Make data-dependent tests skip without data; assert "game data not found" exits cleanly.
13. Keep unported calls greppable (`PENDING_NOTE`, "not ported" logs, stand-in comments).
14. Explain every hash change in the commit body; re-baseline only the cases the change explains.
