---
title: Lessons learned
---

# Lessons learned

Nine reimplementations and one runtime produced several hundred commits whose bodies explain what went wrong and why. This page collects the lessons that recurred across projects or cost the most time, grouped into fidelity, verification, data and legal, platform, and process. Each lesson is stated as a rule, followed by the evidence: the commit or document where it was learned. Read it before starting a project, and again when something looks wrong and the obvious fix is tempting.

## Fidelity

### 1. Fidelity is the product: keep the bugs

Every project's AGENTS.md opens with the same sentence: reproduce the original's behaviour, including its quirks and bugs; if something looks wrong, check the disassembly; only fix deviations *of the port*. The kept bugs are often visible — Return Fire's lobbed tank shell that never lands, Porsche Unleashed's glows that never draw because a dot product is scaled by zero, Oni's level 6 script disabling every console — and each one is documented as kept so a later agent does not "fix" it. A reimplementation that silently corrects the original is a remake, and it also breaks every test that compares against the original.

Evidence: [OpenRF AGENTS.md](https://github.com/emdzej/openrf/blob/main/AGENTS.md), [OpenNFSPU `63c4f40`](https://github.com/emdzej/opennfspu/commit/63c4f40), [OpenOni `86e9144`](https://github.com/emdzej/openoni/commit/86e9144).

### 2. The decompiler is a reading aid, not a source

Ghidra's output for Colin McRae's `Car_Integrate` dropped the position and angle steps and a 0.2 scale; Tilt, Suspension, SteerBody, WheelHeading and CornerImpulse were all re-ported "from the disassembly". In Porsche Unleashed the decompiler hid an x87 store-and-pop, so the AI's throttle was ported from the speed gap when the original divides the target speed alone — opponents pulled away slower. Oni's melee weighting lost four switches in decompilation. For arithmetic, x87 sequences, byte stores and switches, read the instructions.

Evidence: [OpenCMR2 `ef54dfb`](https://github.com/emdzej/opencmr2/commit/ef54dfb), [`29bfb09`](https://github.com/emdzej/opencmr2/commit/29bfb09), [OpenNFSPU `3680542`](https://github.com/emdzej/opennfspu/commit/3680542), [OpenOni `d38d7a5`](https://github.com/emdzej/openoni/commit/d38d7a5).

### 3. x87 compares are not C compares

`fcom; fnstsw; test ah, 1` treats an unordered result (NaN) as "below"; C's `<` is false for NaN. In Sheep this produced two separate gameplay bugs: a 0/0 speed that should have become 0 instead ran to −11.4 and carried a sheep 237 px off the map, and an `acos` just past 1 should have snapped a sheep to its path's first point. When porting a floating-point comparison, read the flag test, not the decompiler's operator. Ghidra also prints `fmul ST2` for two encodings with opposite operand order, which is why OpenI76 wrote an x87 stack tracer that decodes from bytes.

Evidence: [OpenSheep `38756d4`](https://github.com/emdzej/opensheep/commit/38756d4), [`6251cb9`](https://github.com/emdzej/opensheep/commit/6251cb9), [OpenI76 `a878938`](https://github.com/emdzej/openi76/commit/a878938).

### 4. The FPU control word is game state

Find out which precision and rounding mode the original runs in before porting any float code, because it differs per game. GTA runs at the CRT's 53-bit precision, so values are doubles in registers and floats at stores. Porsche Unleashed runs at 24-bit precision because Direct3D 7 sets it on device creation — but with the x87's wide exponent, so denormal-range values stay exact until stored; OpenNFSPU needed a `Math_X87` helper for that. Interstate '76's `Terrain_Height` sets rounding to "down" and never restores it, so after the first terrain query the whole game rounds down; WebAssembly only rounds to nearest, so OpenI76 corrects each operation with TwoSum and FMA residuals.

Evidence: [OpenGTA `docs/cars.md`](https://github.com/emdzej/opengta/blob/main/docs/cars.md), [OpenNFSPU `e47cee6`](https://github.com/emdzej/opennfspu/commit/e47cee6), [`781a0d1`](https://github.com/emdzej/opennfspu/commit/781a0d1), [OpenI76 `2d39318`](https://github.com/emdzej/openi76/commit/2d39318), [`f1d04c8`](https://github.com/emdzej/openi76/commit/f1d04c8).

### 5. Read constants as bits, ideally from the executable

`0x3e22f981` is slightly under 1/2π, but `0.15915494f` compiles to `0x3e22f983`; a constant at 0x5b4a00 was a double 1/1500 that, read as a float, gave −473.77 and froze a car at tick 1008 of the game's replay — but only after front damage. Both were found only by differential testing. Reading every constant from the user's executable at run time (`#define K(va) exe_f32(va)`) removes this class of bug and the legal question at once.

Evidence: [OpenNFSPU `c9523ba`](https://github.com/emdzej/opennfspu/commit/c9523ba), [`a7c5785`](https://github.com/emdzej/opennfspu/commit/a7c5785).

### 6. Port the C runtime the game links, and every consumer of it

MSVC's `rand` (`state * 214013 + 2531011`, `>> 16 & 0x7fff`) is shared by everything. Colin McRae's `Font_Print` draws three `rand` values per string, so porting the HUD clock with libc's `rand` broke the race; Porsche Unleashed's sound code consumes the same stream as the simulation; in Sheep, generating the default high-score table draws 60 values at start-up and shifts every level. `qsort` matters too: which of two duplicate pak members Interstate '76 loads depends on MSVC's quicksort, and equal-key order in Colin McRae's sorts is observable.

Evidence: [OpenCMR2 `2cb6f32`](https://github.com/emdzej/opencmr2/commit/2cb6f32), [OpenSheep `c4d7012`](https://github.com/emdzej/opensheep/commit/c4d7012), [OpenI76 `docs/re/resources.md`](https://github.com/emdzej/openi76/blob/main/docs/re/resources.md).

### 7. Model the original's undefined reads; don't zero them

The original's reads of uninitialised stack slots and past array ends are behaviour. Colin McRae passed an uninitialised normal that keeps the last one written in place; zeroing it made off-road runs differ between builds. Interstate '76's tiled filler reads a stale row counter that produces a visible four-row band; OpenI76 mirrors it in a global and its harness feeds the original's slot value. GTA's rotated-tile cache was ported LRU-exact because an overshooting step reads the neighbouring slot. Where the original's neighbour in memory is unknowable, guard the read and write down what it read.

Evidence: [OpenCMR2 `5eb382d`](https://github.com/emdzej/opencmr2/commit/5eb382d), [OpenI76 `1417ab4`](https://github.com/emdzej/openi76/commit/1417ab4), [OpenGTA `docs/render.md`](https://github.com/emdzej/opengta/blob/main/docs/render.md).

### 8. Memory layout leaks into behaviour, so it differs in wasm

An out-of-bounds read that hit harmless data in Sheep's `.data` hit the integer sine table in the wasm build, produced a NaN height, and made a sheep vanish after a hurdle — only in the browser. Interstate '76's lighting and translucency tables must stay in one contiguous block because indices run from one into the next. Mission scripts that do pointer arithmetic need an arena whose addresses stand in for the original's. Run the native build under ASan and UBSan with scripted play to find the reads; keep layouts where the original depends on them.

Evidence: [OpenSheep `874afab`](https://github.com/emdzej/opensheep/commit/874afab), [OpenI76 `db16407`](https://github.com/emdzej/openi76/commit/db16407).

### 9. Rendering updates game state

Return Fire's turrets activate from the draw pass and soldiers are removed after 120 undrawn ticks; GTA's sprite trees and HUD blink counters live in the renderer; Oni updates contrail links while drawing. You cannot run the simulation without the renderer, and an enhanced renderer must be a read-only parallel pass with the faithful one still running underneath — which OpenGTA proved by comparing state hashes across `hires` settings in separate processes. Oni's `drawfrom` parameter runs the draw logic without issuing draws, so long runs stay identical.

Evidence: [OpenRF AGENTS.md "Traps"](https://github.com/emdzej/openrf/blob/main/AGENTS.md), [OpenGTA `cd5d5d6`](https://github.com/emdzej/opengta/commit/cd5d5d6), [OpenOni AGENTS.md](https://github.com/emdzej/openoni/blob/main/AGENTS.md).

### 10. The small things are load-bearing

Oni's `GoToPoint` raises a radius below 3 to 3; without that clamp a neutral circled forever and level 8 could not finish. Only one of three branches of a melee notification was ported and a combo waited forever. A missing MSVC static initializer — one of 479 global constructors with no callers — sent texture address modes under id 0 and smeared every road in Porsche Unleashed. A tiny input-mode switch omitted from Colin McRae's loading state meant Escape no longer paused. Port every branch, every clamp, every side effect in order, and enumerate the static-initializer table early.

Evidence: [OpenOni `572f7b2`](https://github.com/emdzej/openoni/commit/572f7b2), [`7205988`](https://github.com/emdzej/openoni/commit/7205988), [OpenNFSPU `b2d4d24`](https://github.com/emdzej/opennfspu/commit/b2d4d24), [OpenCMR2 `4f532dc`](https://github.com/emdzej/opencmr2/commit/4f532dc).

### 11. Generic runtime semantics fail silently

All of Ballance's post-release bugs were in the Virtools runtime, not in the ported building blocks: "myself" parameters that hold their owner (no checkpoint ever fired), recursive output propagation (transformers lost the ball), typed copies into data arrays (the score fell 30 times too fast), group `Show` recursing into children (no HUD). When a gameplay feature does nothing, inspect the scheduler, parameter and container semantics around it before the feature itself. The same holds for script VMs: Oni's shooting range broke on a block-scoped variable without a frame slot.

Evidence: [OpenBallance `139f665`](https://github.com/emdzej/openballance/commit/139f665), [`3483df7`](https://github.com/emdzej/openballance/commit/3483df7), [`a60bef7`](https://github.com/emdzej/openballance/commit/a60bef7), [OpenOni commit log](https://github.com/emdzej/openoni/commits/main).

### 12. Before fixing a "bug", prove it is not the original's

Colin McRae's disc demo runs leave the road around step 230; running the original's own machine code free from the same start takes the same path, so the recordings came from another build and the deviation is documented, not fixed. An "environment darker than the original" report in Oni was an impression; tracing every step of the colour path through the executable showed it matched. Check whether a feature is reachable in the target build before porting it: Oni v1.0's developer console has no enabling cheat, and its splash screen is a shared empty `ret`.

Evidence: [OpenCMR2 `92859ab`](https://github.com/emdzej/opencmr2/commit/92859ab), [OpenOni `2c0ef9d`](https://github.com/emdzej/openoni/commit/2c0ef9d), [`1a4be79`](https://github.com/emdzej/openoni/commit/1a4be79).

## Verification

### 13. Prove every decoder over the whole disc

A decoder is done when it prints one summary hash over every asset on the disc, that hash is recorded and asserted by a test, and something independent agrees with it — the original's own reader under emulation, or a second reader (the projects often wrote a throwaway Python one while exploring; the language does not matter). Oni settled 8,918 textures, 37,862 geometries and 155,232 instances in about two days this way; Colin McRae covered 7,804 DDS, 4,003 TGA, 1,211 models and 604 sounds; Porsche Unleashed checked 10,428 FSH images. The hash goes into an environment variable the C test asserts. A second, independent tool (ffmpeg for Bink and Smacker, `afconvert` for ADPCM) helps explain differences but is not the authority — Oni's ADPCM rounds toward minus infinity where ffmpeg does not.

Evidence: [OpenOni AGENTS.md](https://github.com/emdzej/openoni/blob/main/AGENTS.md), [OpenCMR2 AGENTS.md](https://github.com/emdzej/opencmr2/blob/main/AGENTS.md), [OpenNFSPU `tests/`](https://github.com/emdzej/opennfspu/tree/main/tests).

### 14. Run the original's machine code against the port

Differential execution in Unicorn is the strongest check these projects have. OpenCMR2 maps the executable at its addresses, copies the port's state into the original's data section before each simulation step and diffs the car blocks: bit-exact over all 4,211 steps of a demo, and it found bugs no review would. OpenNFSPU rebuilds cars in the original's layout and diffs word by word, then free-runs the original on its own outputs over a whole race. OpenI76 builds the port as a shared library and compares polygon fillers, terrain queries, physics and whole mission loads byte for byte on random and real inputs. It pays to keep game state at the original's addresses from the start.

Evidence: [OpenCMR2 `92859ab`](https://github.com/emdzej/opencmr2/commit/92859ab), [OpenNFSPU `33977ab`](https://github.com/emdzej/opennfspu/commit/33977ab), [OpenI76 `4a10697`](https://github.com/emdzej/openi76/commit/4a10697), [`66a0edd`](https://github.com/emdzej/openi76/commit/66a0edd).

### 15. Suspect the harness as much as the port

A divergence at step 3200 in Colin McRae was the harness's own clock gating a sound's `rand` draw; the Kenya demo stopped at step 212 because the original's particle emitter read port-private tables, and was stubbed to its three `rand` draws. Unreproducible garbage reads in Interstate '76 get explicit skip lists, never silent tolerance. When a differential test fails, first prove the harness gives the original the same world the port sees.

Evidence: [OpenCMR2 `753a5a0`](https://github.com/emdzej/opencmr2/commit/753a5a0), [`a897a0c`](https://github.com/emdzej/opencmr2/commit/a897a0c), [OpenI76 `tools/emu/`](https://github.com/emdzej/openi76/tree/main/tools/emu).

### 16. Every hash change is explained, never blanket-updated

Golden `video_fnv32`/`audio_fnv32` values live in AGENTS.md and in `tests/hashes.txt`, and "a change that alters the hashes must be explained by the change". Commit bodies state which hash moved and why — "race-only hash 5777384f → 5635551f: the HUD now draws without fog; FE start unchanged". OpenSheep re-baselined exactly the two levels whose idle runs hit a NaN path, with before and after numbers. Upload hashes in `gasm:gl` move with one extra texture and do not cover clears, so confirm with a screenshot before re-baselining.

Evidence: [OpenNFSPU `85b7d27`](https://github.com/emdzej/opennfspu/commit/85b7d27), [OpenSheep `38756d4`](https://github.com/emdzej/opensheep/commit/38756d4), [OpenOni AGENTS.md](https://github.com/emdzej/openoni/blob/main/AGENTS.md).

### 17. Compare across runners and across data sources

The same module, data and input must hash identically on `gasm-run`, the Node runner and the browser, and from a folder and a disc image. The folder-versus-image comparison caught a real bug: Porsche Unleashed ordered a particle queue by heap address, and the two data sources allocate differently. Oni compares its Asyncify and stack-switching builds; the browser needs `batch=1`; GTA's comparison has to account for a frame presented during `gasm_exit`. Each axis catches something the others miss.

Evidence: [OpenNFSPU `a130d52`](https://github.com/emdzej/opennfspu/commit/a130d52), [OpenOni `702c573`](https://github.com/emdzej/openoni/commit/702c573), [OpenGTA `102f8be`](https://github.com/emdzej/opengta/commit/102f8be).

### 18. Isolate determinism from saved state

A saved `HiScore.tab` in Sheep skips the 60 start-up `rand` draws and changes every stream; settings only load on the front-end path, so the bare `level=` harness keeps defaults that the hashes depend on. Headless gasm runs use empty in-memory storage unless given `--storage-dir`; keep it that way for hash runs, and record the harness path in the traps list.

Evidence: [OpenSheep AGENTS.md "Traps"](https://github.com/emdzej/opensheep/blob/main/AGENTS.md), [`c4d7012`](https://github.com/emdzej/opensheep/commit/c4d7012).

### 19. A native build of the same core is a sanitizer and a second compiler

Keeping `gasm.h` out of everything but one backend file lets the whole core build natively. ASan and UBSan found Sheep's browser-only overread and an unterminated text scan in Porsche Unleashed. A GCC `-Werror` build in CI catches what clang does not: format truncation, maybe-uninitialised, array-parameter overflow, `strncpy` truncation. Keep in-data offsets behind accessors so the 64-bit native build and wasm32 behave the same.

Evidence: [OpenSheep `874afab`](https://github.com/emdzej/opensheep/commit/874afab), [OpenNFSPU `14427f0`](https://github.com/emdzej/opennfspu/commit/14427f0), [OpenGTA `5206c47`](https://github.com/emdzej/opengta/commit/5206c47), [`114171b`](https://github.com/emdzej/opengta/commit/114171b).

### 20. Use the game's own recordings and switches as tests

Porsche Unleashed's `replay.rpl` was recorded by the original; only humans are recorded and the AI re-drives, so playing it to the end is a full determinism test. Colin McRae's replays are input recordings with a snapshot at the start. Oni's whole-game regression drives Konoko through every level with a route language, using the game's own invincible and omnipotent cheats so unattended runs add no non-original code paths. Prefer the original's instruments over new ones.

Evidence: [OpenNFSPU `tools/emu/`](https://github.com/emdzej/opennfspu/tree/main/tools/emu), [OpenOni `28d22c0`](https://github.com/emdzej/openoni/commit/28d22c0).

### 21. Make unported code loud

Calls into code not yet ported go to `PENDING_NOTE(0xADDR, "Name")`, which logs once and returns a neutral value; `grep -r PENDING_NOTE src` is the to-do list. Colin McRae's race ran through its real state machine before all loaders existed, so integration never became a big bang. Games that dispatch through addresses in data (Sheep's level descriptors) log `... not ported` once per address, and a long headless run's log becomes a coverage report — once, not every tick.

Evidence: [OpenCMR2 `src/pending.h`](https://github.com/emdzej/opencmr2/blob/main/src/pending.h), [`c8e6ec4`](https://github.com/emdzej/opencmr2/commit/c8e6ec4), [OpenSheep `4bce89a`](https://github.com/emdzej/opensheep/commit/4bce89a), [`6eefabf`](https://github.com/emdzej/opensheep/commit/6eefabf).

## Data and legal

### 22. Read the tables from the user's executable at run time

No table, string, geometry or float constant from the original is committed. A minimal PE mapper checks size and CRC-32, maps sections to their virtual addresses, and code reads by VA. The same trick covers codec tables in `binkw32.dll`, and even instruction operands: Oni's layout pointers are immediates in start-up code, read straight out of the instructions. The repository holds zero copyrighted bytes, the values are exact, and the CRC check doubles as version detection with a clear message for unsupported builds.

Evidence: [OpenSheep `src/exe.c`](https://github.com/emdzej/opensheep/blob/main/src/exe.c), [OpenGTA AGENTS.md](https://github.com/emdzej/opengta/blob/main/AGENTS.md), [OpenOni `f71539a`](https://github.com/emdzej/openoni/commit/f71539a).

### 23. Accept the data as the user has it

Read disc images (2048-byte ISO, raw 2352-byte MODE1 and MODE2), folders, installed copies and the installers themselves. OpenGTA runs straight from Rockstar's unzipped InstallShield cabinets — and found that unshield 1.6.2 fails on a file split across two cabinets, so an install made with it silently differs. Oni's game exists only inside a MindVision VISE archive on the CD; making the archive a file layer turned "read the ISO directly" from a later nice-to-have into the default. Never discard a BIN/CUE for a mixed-mode disc: Interstate '76's soundtrack exists only as its Red Book audio tracks.

Evidence: [OpenGTA `f2898c0`](https://github.com/emdzej/opengta/commit/f2898c0), [OpenOni `e834115`](https://github.com/emdzej/openoni/commit/e834115), [OpenI76 AGENTS.md](https://github.com/emdzej/openi76/blob/main/AGENTS.md).

### 24. Say exactly what the user must own, and nothing more

Never call a game free or freeware without an official source — OpenGTA corrected its docs to "Rockstar's 2002 re-release" for that reason. Never host or link copies. Screenshots are renders of the port, made by script — never desktop captures or the game's own files. Keep reverse-engineering notes, with their addresses, off the public site; the site is for players.

Evidence: [OpenGTA `5206c47`](https://github.com/emdzej/opengta/commit/5206c47), [OpenOni AGENTS.md](https://github.com/emdzej/openoni/blob/main/AGENTS.md), [OpenSheep `e9b3ff1`](https://github.com/emdzej/opensheep/commit/e9b3ff1), [OpenNFSPU `ba48ea8`](https://github.com/emdzej/opennfspu/commit/ba48ea8).

### 25. A public server makes the original's security bugs yours

Babo Violent 2's server had path traversal in map download, sent passwords in clear to every browsing client, trusted client-supplied player IDs and left array indices unchecked. The Go rewrite keeps valid-input behaviour identical, rejects invalid input, and lists every deviation per milestone. Faithfulness stops at the network boundary.

Evidence: [OpenBV `design/server.md`](https://github.com/emdzej/openbv/blob/main/design/server.md), [`7172f85`](https://github.com/emdzej/openbv/commit/7172f85).

## Platform

### 26. Windows tolerated what your VFS must now handle

Case-insensitive names, both separators, doubled separators, `..` relative to the original's working directory. A Sheep sprite table has a leading backslash that the loader appends after its own; Windows ignores `\\`, the port's lookup did not. Babo Violent 2's includes with the wrong case compiled on Windows and macOS and failed on Linux CI, and an unanchored `game/` in `.gitignore` silently excluded new files in `src/game/`. Normalise once, in the VFS, and anchor ignore patterns to the root.

Evidence: [OpenSheep `cc0b7db`](https://github.com/emdzej/opensheep/commit/cc0b7db), [OpenBV `35dfb70`](https://github.com/emdzej/openbv/commit/35dfb70), [`cfde746`](https://github.com/emdzej/openbv/commit/cfde746).

### 27. One clock, owned by the runner

Headless runs are deterministic only if nothing reads wall time. GTA paces everything off rendered audio — one 70 Hz Miles tick is 315 audio frames at 22,050 Hz — which removed a duplicate timer and locked simulation to sound. In a window, push audio for the elapsed runner time, not `rate / fps`, or vsync drift drains or floods the queue (Colin McRae). Return Fire's state-machine rewrite kept the number of presents and clock reads so its output stayed byte-identical.

Evidence: [OpenGTA `5ebdbb6`](https://github.com/emdzej/opengta/commit/5ebdbb6), [OpenCMR2 `0cf854a`](https://github.com/emdzej/opencmr2/commit/0cf854a), [OpenRF `1247f21`](https://github.com/emdzej/openrf/commit/1247f21).

### 28. Input sampled per frame loses taps

A click inside one frame was lost when only held state was read; count "pressed since last frame" as down. Babo Violent 2 latches key and button presses between its 30 Hz ticks. The mirror image applies to scripted input: Colin McRae polls input per 25 Hz simulation step on 60 Hz frames, so a one-frame scripted tap can land in a frame without a step — hold scripted keys for several frames.

Evidence: [OpenNFSPU `c0e6cf0`](https://github.com/emdzej/opennfspu/commit/c0e6cf0), [OpenBV `a7a4ffc`](https://github.com/emdzej/openbv/commit/a7a4ffc), [OpenCMR2 AGENTS.md](https://github.com/emdzej/opencmr2/blob/main/AGENTS.md).

### 29. WebGL punishes the original's habits

Setting the whole device state per draw, as D3D7-era code does, cost about 60 GL calls per draw and 13,400 per frame in Colin McRae — fine natively, frame skipping in the browser. A state shadow sending only deltas cut it to about 900 and doubled native speed; partial buffer and texture uploads followed. Per-frame `glReadPixels` for software-path locks starved audio in Porsche Unleashed until surfaces were tracked on the CPU. Destroy GPU objects for freed textures and grown buffers or memory grows per level (Ballance). Build the state cache in from day one.

Evidence: [OpenCMR2 `0a0a3fc`](https://github.com/emdzej/opencmr2/commit/0a0a3fc), [OpenNFSPU `74e6dfa`](https://github.com/emdzej/opennfspu/commit/74e6dfa), [OpenBallance `353bc4a`](https://github.com/emdzej/openballance/commit/353bc4a).

### 30. Ask the runtime for the capability instead of working around it

OpenBallance waited for gasm's graphics API rather than shipping a software rasteriser, driven by a requirements document written for the runtime's agent; it landed in gasm 0.4.0. When raw keyboard input arrived in gasm 0.5, the keymap file, launcher flags and layout editor built as a workaround were deleted. OpenRF's requirements document produced file-backed assets, folders and Worker mode with OPFS. When a runner bug masquerades as a game bug — silent audio after a long load frame — label the guest's workaround as temporary and remove it when the runner is fixed.

Evidence: [OpenBallance `design/gasm-gfx-requirements.md`](https://github.com/emdzej/openballance/blob/main/design/gasm-gfx-requirements.md), [gasm `5cd7788`](https://github.com/emdzej/gasm/commit/5cd7788), [OpenBallance `9bcd96d`](https://github.com/emdzej/openballance/commit/9bcd96d), [OpenRF `design/gasm-host-requirements.md`](https://github.com/emdzej/openrf/blob/main/design/gasm-host-requirements.md), [gasm `39830c7`](https://github.com/emdzej/gasm/commit/39830c7), [OpenNFSPU `ecc247f`](https://github.com/emdzej/opennfspu/commit/ecc247f).

### 31. Raise the wasm stack and read the CHANGELOG on every pin bump

wasm-ld's default stack is 64 KiB and an overflow silently corrupts the data below it; map, style and level loaders keep large buffers on the stack, so every project links with `-Wl,-z,stack-size=1048576`. Host API changes between gasm versions broke the browser player twice in OpenRF (an unvendored import, a changed `frames` signature). Bump the SDK pin and the npm pin together, and rerun the browser test.

Evidence: [OpenGTA `CMakeLists.txt`](https://github.com/emdzej/opengta/blob/main/CMakeLists.txt), [OpenRF `4f57aec`](https://github.com/emdzej/openrf/commit/4f57aec), [`9492abc`](https://github.com/emdzej/openrf/commit/9492abc).

## Process

### 32. Plan steps that end in an automated check

Colin McRae's and Oni's port plans are ordered steps, each with a machine-checkable completion criterion — a decoder hash, a viewer screenshot, a level that plays through. That is what let agents port Colin McRae's whole offline game in about three days of commits and take Porsche Unleashed from initial import to a playable career in about three. Oni's commit subjects read like a checklist: "Level 3 plays through", "Level 8 plays through".

Evidence: [OpenCMR2 `docs/re/port-plan.md`](https://github.com/emdzej/opencmr2/blob/main/docs/re/port-plan.md), [OpenOni `docs/re/port-plan.md`](https://github.com/emdzej/openoni/blob/main/docs/re/port-plan.md), [OpenOni `9e3bb32`](https://github.com/emdzej/openoni/commit/9e3bb32).

### 33. Commit bodies are the pitfall log

Oni's commit bodies consistently name the original function and address, what the port did wrong, and which level now plays — so the git log answers "has this been seen before?" better than any wiki. GTA's commit bodies are dense design notes on timing and the hires invariants. Write them for the next agent, who will grep them.

Evidence: [OpenOni commit log](https://github.com/emdzej/openoni/commits/main), [OpenGTA `5ebdbb6`](https://github.com/emdzej/opengta/commit/5ebdbb6).

### 34. Agents leave stale notes; sweep at every milestone

Many Porsche Unleashed commits are "drop a stale pending note" or "the note was stale"; its version error still named a sibling project's binary, copied with the file layer. Babo Violent 2's home page denied online play after the server landed, and a screenshot caption said "as the original draws it" after a redesign. Add a sweep of pending notes, status page, AGENTS.md state line and copied error strings to every milestone.

Evidence: [OpenNFSPU `1aa0f27`](https://github.com/emdzej/opennfspu/commit/1aa0f27), [OpenBV docs](https://github.com/emdzej/openbv/tree/main/docs).

### 35. Shared machines need one run at a time

Parallel emulator, test and runner sessions froze the machine OpenI76 was developed on; its AGENTS.md now requires `pgrep -fl gasm-run` before starting, `nice -n 19` on everything, `-j1` tests and sequential regressions. Long `--screenshot` runs grew GPU memory by about 15 MB/s until a Mac froze, hence Oni's `drawfrom` parameter. Parallel worktree agents also committed their worktrees by mistake: ignore `.claude/` before spawning them.

Evidence: [OpenI76 AGENTS.md](https://github.com/emdzej/openi76/blob/main/AGENTS.md), [`8794498`](https://github.com/emdzej/openi76/commit/8794498), [OpenNFSPU `2d58c7a`](https://github.com/emdzej/opennfspu/commit/2d58c7a).

### 36. Record the user's decisions, with dates

Babo Violent 2's HUD was redesigned in one commit and mostly reverted in the next by the user's preference. Its AGENTS.md now records the presentation carve-out "by the user's decision (2026-10-09)", naming the files that hold the deviation. Ask before restyling anything gameplay-adjacent, and write the answer where every future session reads it.

Evidence: [OpenBV `9b2b316`](https://github.com/emdzej/openbv/commit/9b2b316), [`33742e1`](https://github.com/emdzej/openbv/commit/33742e1), [OpenBV AGENTS.md](https://github.com/emdzej/openbv/blob/main/AGENTS.md).
