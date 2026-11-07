# Differential harness: the original's machine code vs the port

Three ENCORE ports run the original executable's functions in Unicorn (32-bit x86) on the port's state and compare results word for word. This reference distils their designs.

| | OpenCMR2 | OpenNFSPU | OpenI76 |
|---|---|---|---|
| Code | `tools/emu/sim_diff.c` (C, built with `-DOPENCMR2_UNICORN=<dir>`) | `tools/emu/emu_drive.py`, `emu_forces.py`, `emu_replay.py` | `tools/emu/x86.py` + `diff_*.py`; port built as shared `libi76core` (`-DOPENI76_SHARED=ON`) called via ctypes |
| State | the original's data section as one block at 0x516000-0x831fff, port math tables at their original addresses, cars on a synthetic heap | car, racers, globals, road, AI, collision objects rebuilt in the original layout from a port dump, original vtables copied | random or real inputs fed to both |
| Granularity | each sim pass per step, compared after the port's step | one function per call | one function per call; whole `Mission_Load`; per-frame vehicle functions |
| Scale | all 4,211 steps of a demo | sweeps every Nth tick of a 6,663-tick replay; parallel chunks of about 0.9 GB each | `regress.sh` over every diff, every mission, ~25 vehicle functions upright and upside down |

## Design rules

1. **Map the exe at its image base**: headers, sections, zeroed BSS, a stack, a heap, a sentinel return address, an import-stub page. Any access outside mapped memory or a jump into the import table faults with its address.
2. **Put state where the original expects it.** Easiest if the port already keeps globals at original addresses (a state image accessed as `gm32(0x52f2ac)`). Otherwise write a dump from the port (kept out of tree as a `git apply`-able patch behind `--param <x>dump=<tick>`) and rebuild the original layout in the harness.
3. **Set the x87 control word** the game runs with (`fpcw = 0x027F` default; D3D7 games 0x007f; round-down 0x067f). Run each diff in every mode the game reaches.
4. **Answer callouts from recordings.** Functions the emulator cannot run (spatial queries, RTTI casts, OS calls) are answered from the port's recorded results so each function is tested in isolation.
5. **Compare semantically where representations differ**: fields that are pointers in the original and indices in the port are mapped before comparing.
6. **Free runs**: carry the original's outputs into its next call (`FD_CARRY`) so it runs on its own values; report words changed by code no wrapped call covers as `uncovered`.
7. **Localise**: `FD_WATCH=<offset>` prints each write with writer address and return addresses; `FD_TRACE=<va>,...` prints registers at addresses.
8. **Random inputs plus real data**: random convex polygons in both windings, random tables and textures; then whole real missions.
9. **Explicit skip lists** for known-unreproducible cases (reads outside a texture into stale heap; negative table indices), by name. Never silent tolerance.
10. **Uninitialised stack reads**: read the original's slot value and feed it to the port's mirror global.
11. **Output only non-identical lines plus counts**, so a clean run is short.
12. **Run sequentially and niced** (`xargs -P 1`, `nice -n 19`): parallel emulator runs froze a shared machine.

## Known harness traps

- The harness's own clock gating a `rand` draw differently looked like a port divergence at step 3,200.
- An original function reading port-private tables stopped a stage at step 212: mirror the tables in the original layout, or stub the callee to its `rand` draws only.
- Unicorn ignores x87 precision control (64-bit always) and its `fyl2x`/`f2xm1` are less exact than hardware. Confirm such results by error analysis.
- Recordings shipped with the game may come from another build: if the original's code run free from the same start drifts the same way, document it as a known issue.

## What it found (evidence)

- x87 64-bit vs 24-bit rounding; spin damping only with a corner on the ground; dents moving a vertex normal 3x; a damage counter decrementing per step (opencmr2 `92859ab`).
- 1-2 ULP divergence in 30-40 car words per tick until float order and single-precision helpers matched (opennfspu `e47cee6`); denormal torques at tick 448 and a denominator summed in another order at tick 1,292 (`364e0ea`).
- 3,300 polygons identical including ties (openi76 `4a10697`); the rounding mode left set by `Terrain_Height` (`2d39318`).
