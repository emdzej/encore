# Porting traps, with the commits that found them

Each row cost a debugging session in an ENCORE project. Check the port against the whole list when a ported
system misbehaves.

## Structure and side effects

| Trap | Case | Commit |
|---|---|---|
| Missing static initialiser | `TEXTURE_initstates` 0x535710 not run: every texture clamped | https://github.com/emdzej/opennfspu/commit/b2d4d24 |
| Init never done | RNG table never filled: every random placement at one spot | https://github.com/emdzej/opensheep/commit/b79cd8a |
| State not cleared on load | Hint box kept stale text pointing into freed memory | https://github.com/emdzej/opensheep/commit/fdc1f0d |
| Mode switch in a loading state | Input left in menu mode: Esc did not pause | https://github.com/emdzej/opencmr2/commit/4f532dc |
| Save/restore pair dropped | Depth function and fog not restored after the HUD: no depth test in FE rooms | https://github.com/emdzej/opennfspu/commit/85b7d27 |
| One branch of a dispatcher | 1 of 3 cases of `AI2rMelee_NotifyAnimation`: combo waited forever | https://github.com/emdzej/openoni/commit/7205988 |
| Missing filter in a query | `trigvolume_count` counted dead characters and Konoko | https://github.com/emdzej/openoni/commit/6bb903a |
| Missing clamp | `AI2rPath_GoToPoint` raises radius < 3 to 3; radius 0 never arrived | https://github.com/emdzej/openoni/commit/572f7b2 |
| Callee buffer contract | One-entry list passed where a leaf's hits are written: stack overflow | https://github.com/emdzej/openoni/commit/dff3e5e |
| Loader sanitising | Spawned bit 0x20 must be cleared on read (0x4bf290) | https://github.com/emdzej/openoni/commit/cd069f1 |
| Semantic list order | Decorative particle classes go at the tail; the update stops at the first | https://github.com/emdzej/openoni/commit/e038686 |
| Wrong variable | Facing tested from the feet; the original uses the sweep sphere's start | https://github.com/emdzej/openoni/commit/9e3bb32 |
| Rendering changes state | Turrets activate from the draw pass; undrawn soldiers removed after 120 ticks | OpenRF AGENTS.md "Traps" |
| Uninitialised value modelled | An off-mesh corner keeps the last ground normal written in place at +0x4a4 | https://github.com/emdzej/opencmr2/commit/5eb382d |
| Uninitialised stack slot | Tiled filler's stale row counter makes a visible 4-row band; mirrored in a global | https://github.com/emdzej/openi76/commit/1417ab4 |

## Arithmetic

| Trap | Case | Commit |
|---|---|---|
| x87 stack semantics | Throttle depends on the target speed, not the gap | https://github.com/emdzej/opennfspu/commit/3680542 |
| NaN compare | Unordered treated as below; sheep speed ran to -11.4 | https://github.com/emdzej/opensheep/commit/38756d4 |
| Double read as float | 1/1500 read as -473.77; car froze at tick 1008 | https://github.com/emdzej/opennfspu/commit/a7c5785 |
| Decimal vs bits | 1/2pi literal one ULP off the original's constant | https://github.com/emdzej/opennfspu/commit/c9523ba |
| Mixed storage widths | `Integrate` adds x unrounded but y and z as floats | https://github.com/emdzej/openi76/commit/8fc7730 |
| Rounding mode leaks | `Terrain_Height` sets RC down and never restores it | https://github.com/emdzej/openi76/commit/2d39318 |
| Negative index in wasm | Harmless overread in the original became NaN in the browser build | https://github.com/emdzej/opensheep/commit/874afab |

## CRT and ordering

| Trap | Case | Commit / file |
|---|---|---|
| Shared `rand` | `Font_Print` draws three `rand()` per string; HUD text advances the stream | https://github.com/emdzej/opencmr2/commit/2cb6f32 |
| Start-up `rand` draws | Default high-score table draws 60 values; re-baseline | https://github.com/emdzej/opensheep/commit/c4d7012 |
| New code draws random numbers | Level particles made a training fight last longer; routes retuned | https://github.com/emdzej/openoni/commit/a1dd567 |
| `qsort` order | Which duplicate pak member wins depends on MSVC's sort | https://github.com/emdzej/openi76/blob/main/docs/re/resources.md |
| Heap-address order | Particle queue keyed by address: folder and ISO drew in different orders | https://github.com/emdzej/opennfspu/commit/a130d52 |
| No `setjmp` in wasm | Expression evaluator rewritten without it | https://github.com/emdzej/opennfspu/commit/f82c136 |

## Behaviour that is the original's

Before "fixing", run the original's code on the same state if a harness exists. OpenCMR2's demo runs leave
the road at about step 230, and the original's code run free on the same start does the same; it is
documented as a known issue, not fixed (https://github.com/emdzej/opencmr2/commit/92859ab). Oni's environment
looked "darker than the original" as an impression, but every step of the colour path matched the exe
(https://github.com/emdzej/openoni/commit/2c0ef9d): never change visuals without a measured capture of the
original at the same place and settings.
