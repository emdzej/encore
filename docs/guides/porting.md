---
title: Porting function by function
---

# Porting function by function

A function-by-function port rewrites each function of the original executable in C, in its own words, with the same structure, the same call order and the same arithmetic, and labels it with the original's name and address. Quirks and bugs stay. C++ classes become structs with explicit vtables in the original slot order. In-memory layouts keep their original offsets, since wasm32 is a 32-bit target like the original. Blocking loops are either unwound into per-frame states or kept and suspended with `gasm_wait_frame`. Calls into code not yet ported log themselves once instead of vanishing. This page sets out those conventions and the traps behind them: static initialisers, the CRT, hidden side effects. Floating-point exactness is covered separately in [Floating point and the compiler](/guides/fidelity).

## The rules every project states

These come from the hard rules in each AGENTS.md ([OpenGTA](https://github.com/emdzej/opengta/blob/main/AGENTS.md), [OpenCMR2](https://github.com/emdzej/opencmr2/blob/main/AGENTS.md), [OpenOni](https://github.com/emdzej/openoni/blob/main/AGENTS.md)) and from OpenNFSPU's [porting conventions](https://github.com/emdzej/opennfspu/blob/main/docs/internals/porting.md):

1. **Fidelity is the product.** "Reproduce quirks and bugs. If something looks wrong, check the disassembly; if the original does it, keep it and add a comment. Only fix deviations of the port."
2. **Cite the original** on every ported function and global, with names consistent with `names.tsv`. There is no `FUN_xxxxxx` anywhere in `src/`.
3. **Write in your own words.** Never paste decompiler output into source or docs; describe layouts, formulas and addresses.
4. **No data from the executable in source.** Tables, strings, geometry and float constants are read at run time through `exe.h`. Small algorithmic constants and operands are fine.
5. **Community knowledge may inform; the executable is the authority.** No code is copied from prior art.

## Address citations

The citation goes on the definition or next to the declaration, in one of a few accepted forms:

```c
/* BIG_findentry 0x565a30 */                 /* name + address (OpenNFSPU) */
/* _THRASH_setstate@8 0x60003ac0 */          /* a driver DLL's export, at the DLL's base */
/* 0x40aea0 */                               /* address only (OpenSheep) */
static int track_count;   /* 0x6b2a40 */     /* a global */
int32_t width, height;    /* +0x0c, +0x10 */ /* a struct field at its original offset */
```

Citations make the port auditable line by line, and they drive tooling. Differential harnesses look functions up by address, OpenSheep maps addresses from level descriptors to C functions, and `grep -r 0x4xxxxx src` answers "is this ported?".

## Order of work

There are two orders, and both worked:

- Top-down, in the original's call order, with pending stubs. OpenCMR2 ran the race through its real state machine, with the viewer as a temporary host, before all the loaders existed ([`c8e6ec4`](https://github.com/emdzej/opencmr2/commit/c8e6ec4)), "so integration was never a big bang".
- Bottom-up by dependency. OpenGTA went map and style loaders → renderer → sprites → text and fonts → front-end state machine → audio → game core → subsystems → movie, keeping unported functions as explicit stubs with addresses.

Either way, follow a written `port-plan.md` whose steps each end with a check: a native test on real data, a headless hash or a screenshot ([OpenCMR2](https://github.com/emdzej/opencmr2/blob/main/docs/re/port-plan.md), [OpenOni](https://github.com/emdzej/openoni/blob/main/docs/re/port-plan.md)). Update the plan in place with "Done:" paragraphs as steps land. Build viewers (`--param car=`, `stage=`, `track=`, `mission=`) before the front end, so the renderer can be checked before any gameplay exists.

## Keeping quirks, bounding undefined behaviour

Keep what the original does, and comment it as kept. Examples the projects deliberately preserved:

- Return Fire's 2P game polls input after objects update, so vehicles see the previous frame's input.
- GTA's `Music_PlayTrack` only makes offsets even, so a 16-bit stereo track at offset 2 mod 4 plays with its channels swapped.
- Colin McRae's first `Render_AlphaBlend(0)` does nothing, because the cache starts at 0 while the device state is on.
- Oni's fog script moves the fog end by the start's step.
- In Sheep, every DirectSound duplicate starts at base volume 0, so only the first instance of an overlapping sound is audible.
- Porsche Unleashed's glows with flags 1/2/0x20/0x40 never draw, because a scaling ratio evaluates to 0.

Mark each one in the topic doc's "Quirks kept" list so that a later session does not "fix" it.

What changes is undefined behaviour that would crash or diverge in wasm. Bound it, and write down what the original effectively did:

- OpenSheep's `g_sin[t/2]` with negative `t` read the draw list's tail (about 0.0 as a float) in the original, but the integer sine table in wasm, which gave NaN. `arc_sin()` returns 0 for negative indices ([`874afab`](https://github.com/emdzej/opensheep/commit/874afab)).
- OpenOni skips a direction index that can reach 7 past six facing factors, because no profile produces it ([`a6d494a`](https://github.com/emdzej/openoni/commit/a6d494a)).
- OpenGTA uses 0 for out-of-range reciprocal-table reads and counts them (`poly_recip_oob`). Where the original checks no bounds, it stops with a fatal error rather than corrupt memory.
- Negative left shifts are UB in C; write them as multiplications.

Where the original reads uninitialised memory, model it rather than zeroing it. OpenCMR2's `Car_CornerGround` passed an uninitialised normal that the original writes in place at +0x4a4, so an off-mesh corner keeps the last one ([`5eb382d`](https://github.com/emdzej/opencmr2/commit/5eb382d)). OpenI76's tiled affine filler reads a stale row counter from the stack, which produces a visible 4-row band; the port mirrors it in a global ([`1417ab4`](https://github.com/emdzej/openi76/commit/1417ab4)).

## Integer arithmetic

- 16.16 stays 16.16: `(int64_t)a * b >> 16` ([OpenCMR2 porting.md](https://github.com/emdzej/opencmr2/blob/main/docs/internals/porting.md)). Multiply each term separately when the original does; OpenRF's projection `FixMul`s every term of its row-vector products on its own.
- Keep C's truncating division, explicit wrap-around, 8-bit register wraps and the signedness of each load. OpenGTA reproduces an `add ecx,eax; adc bl,al` carry trick in its rasteriser.
- `__ftol` is truncation through a 64-bit integer; out-of-range values and NaN give the low 32 bits of 0x8000000000000000. OpenSheep's `ftol()` mirrors 0x43ca04 ([game.h](https://github.com/emdzej/opensheep/blob/main/src/game.h)).
- Where the original compares floats by their bits as signed integers, do the same.

## C++ classes as structs with explicit vtables

OpenNFSPU's original is MSVC 6 C++ with about 360 polymorphic classes. Each class becomes a struct whose first member is a pointer to a `const` ops table, with the slots in the original's order and each slot commented with its address ([texture.h](https://github.com/emdzej/opennfspu/blob/main/src/real/texture.h)):

```c
typedef struct {
    void (*destroy)(struct TexManager *self, int free_it);                                     /* 0x535910 */
    Texture *(*create)(struct TexManager *self, const uint8_t *shape, uint32_t flags, const char *name); /* 0x535ef0 */
} TexManagerVtbl;                                                                              /* 0x5bb6c8 */

typedef struct TexManager {
    const TexManagerVtbl *vt;    /* +0x00 */
    void *device;                /* +0x04 */
    Texture *stage[2];           /* +0x08, +0x0c: selected textures */
    int32_t count;               /* +0x10: textures made (names "tex%d") */
} TexManager;

#if UINTPTR_MAX == 0xffffffffu
_Static_assert(sizeof(Texture) == 0x54 && sizeof(TexManager) == 0x14, "the original's layouts");
#endif
```

Methods are `Class_Method(Class *self, ...)`, constructors `Class_ctor` and destructors `Class_dtor`. The slot lists come from the RTTI scan (`re/vtables.tsv`). Wherever the original dispatches through a vtable, dispatch through `vt`. Cull subtleties and other per-class behaviour then stay attached to the right class.

## Memory layout

wasm32 has 32-bit pointers like the original, so in-memory structures can keep their exact layout. The native test build is 64-bit, which shapes how this is done.

- Offsets in comments, sizes asserted under 32-bit only. Comment every field with its offset and guard the `_Static_assert` with `#if UINTPTR_MAX == 0xffffffffu`. In the 64-bit build only pointer-free file-format structs keep their size.
- Parse files with explicit byte reads, never by casting a pointer to a struct, so that both builds read them.
- Offsets and accessors instead of relocated pointers. OpenCMR2's PP_F models and stage tables are memory images whose offsets the original relocates into pointers. The port keeps the offsets and reads through accessors, so the same code runs in wasm32 and in 64-bit tests. OpenOni stores 32-bit handles (`slot << 24 | index`, read through `tm_link()`) where the original stored pointers.
- The whole data section at its original addresses. OpenCMR2 allocates the original's data section 0x516000–0x831c7c, copies the first 0x14000 bytes from the executable and zeroes the rest (BSS). Ported code reads globals by original address through one-line accessors ([mem.c](https://github.com/emdzej/opencmr2/blob/main/src/game/mem.c), [gstate.h](https://github.com/emdzej/opencmr2/blob/main/src/game/gstate.h)):

  ```c
  static inline uint32_t Gs_Players(void) { return gm32(0x52afb4) >> 0xd & 0xf; }      /* 0x405d70 */
  ```

  This keeps tables filled at run time behaving identically, and it is what made the Unicorn differential harness possible: the original's code and the port share one address map.
- Arenas for script pointers. OpenI76 loads mission scripts into an arena whose addresses stand in for the original's 32-bit pointers, so the machines' pointer arithmetic is the original's ([`db16407`](https://github.com/emdzej/openi76/commit/db16407)).
- Adjacent tables stay adjacent. OpenI76's shade, translucency, glow and remap tables live in one contiguous block (`g_rtab` 0x5af150) because indices run from one table into the next.
- Never order by heap address. OpenNFSPU's particle queue was a set keyed by address. Folder and ISO data sources allocated differently and drew rain spray in different orders, until the queue was ordered by creation, which matches the original's rising heap addresses ([`a130d52`](https://github.com/emdzej/opennfspu/commit/a130d52)). OpenBallance replaces an ordering by entity pointer with the CK id.

## Blocking loops

The gasm runner owns the frame loop: it calls `gasm_frame` once per fixed timestep, and the guest may not block. The original's loops (`PeekMessage` and render loops, loading screens, "press a key", movies, modal dialogs) need one of two treatments.

**Unwind into state machines.** Each former loop becomes a state with a step function that performs exactly one iteration. OpenRF's contract ([app.h](https://github.com/emdzej/openrf/blob/main/src/app.h)):

```c
/* STEP_FRAME: the step presented a frame; call it again next frame.
   STEP_AGAIN: nothing presented (the state changed); poll and step again within the same frame.
   STEP_DONE:  finished without presenting; the owner moves on (then returns STEP_AGAIN itself). */
typedef enum { STEP_FRAME, STEP_AGAIN, STEP_DONE } Step;
```

`app_frame` polls, steps, and repeats until a step presents. Because one step is one iteration of the old loop, the number and order of presents and clock reads are unchanged, and the output is byte-identical to the blocking version ([`1247f21`](https://github.com/emdzej/openrf/commit/1247f21)). OpenGTA does the same with `game_run_begin/step/end`, switching the frame rate between its 35 ms front-end loop and the 70 Hz game. OpenNFSPU steps `GameMain`, `FEApplication_Run` and `RaceLoop`. OpenCMR2's `WinMain` was already one frame per call.

**Keep the loops and yield.** OpenOni keeps every loop; each one ends its frame in `plat_wait_frame()`, which calls `gasm_wait_frame()`. Nested modal dialogs work naturally. Build with `gasm_add_game(<t> LOOP ...)`, which produces two modules: `<t>.wasm` (Asyncify, runs everywhere) and `<t>-run.wasm` (stack switching). Both must give the same hashes. OpenNFSPU builds `LOOP THREADS` so that gasm's cooperative threads can carry the network library's threads; the module grew from 1.38 to 1.74 MB and used about 6% more CPU, with unchanged hashes ([`e942f36`](https://github.com/emdzej/opennfspu/commit/e942f36)).

Whichever you choose, the original's threads go. OpenNFSPU's 128 Hz multimedia timer becomes a counter advanced from the frame clock, input is sampled in the frame step, and asynchronous file I/O completes at once, with its callback run where the original would have observed completion. Wall-clock reads become a virtual clock advanced per present. See [Determinism and verification](/guides/verification) and [Building for gasm](/guides/gasm).

## What is not ported yet

Unported code must never be silent. Three mechanisms:

- `PENDING_NOTE` (OpenCMR2, OpenNFSPU, [pending.h](https://github.com/emdzej/opencmr2/blob/main/src/pending.h)): a call into unported code goes to a function with the original's name that logs its name and address once and returns a neutral value. `grep -r PENDING_NOTE src` is the to-do list; OpenNFSPU was down to 9 at HEAD.

  ```c
  #define PENDING_NOTE(addr, name) do { \
          static int noted_; \
          if (!noted_) { noted_ = 1; plat_log("pending: " name " " #addr); } \
      } while (0)
  ```

- "not ported" by address. OpenSheep's level descriptors hold executable addresses of hooks, mapped to C functions in `levels.c` and `moves.c`. An unknown address logs `level <what> hook 0x… not ported` once ([levels.c](https://github.com/emdzej/opensheep/blob/main/src/levels.c)), so long headless runs double as a coverage detector. Log once, not every tick ([`4bce89a`](https://github.com/emdzej/opensheep/commit/4bce89a)), and fall back by address when a level's table names a standard routine ([`6eefabf`](https://github.com/emdzej/opensheep/commit/6eefabf)).
- Stand-in comments. OpenOni marks temporary approximations with `stand-in` in a comment (27 at the time of writing), and they go as the originals are ported.

Notes go stale quickly. OpenNFSPU has a run of commits that only drop stale pending notes ([`1aa0f27`](https://github.com/emdzej/opennfspu/commit/1aa0f27)). Sweep code and docs for them after each milestone.

## Static initialisers

MSVC runs global constructors from a table before `WinMain`. Nothing calls them directly, so a search for callers finds none, and missing one is a silent change in behaviour. In OpenNFSPU the table runs from 0x5cb004 to 0x5cb780 (479 entries). The missing `TEXTURE_initstates` (0x535710) sent address modes under id 0, so every texture was clamped and roads and grass were smeared ([`b2d4d24`](https://github.com/emdzej/opennfspu/commit/b2d4d24)). Ported constructors are called from `PORT_StaticInit` in table order ([static_init.c](https://github.com/emdzej/opennfspu/blob/main/src/static_init.c)):

```c
void PORT_StaticInit(void)
{
    TEXTURE_initstates();   /* 0x5cb754 -> 0x535710: the texture stage-state cache's state ids and values */
}
```

Enumerate the table (`__xc_a`..`__xc_z`) early, and check it for each module you port. In a source port the same trap appears as constructor order across translation units. OpenBV's `GameVar` constructor read `bv2.db` before the SQLite shim's globals existed, so the shim is constructed on first use.

Initialisation order matters at run time too. OpenSheep's random table was never filled, so every `rng_next()` returned 0 and all random placement collapsed to one spot ([`b79cd8a`](https://github.com/emdzej/opensheep/commit/b79cd8a)).

## The C runtime is part of the game

Port the CRT routines whose behaviour is observable, exactly, and route every consumer through them:

- `rand`. The MSVC LCG `holdrand = holdrand * 214013 + 2531011; return holdrand >> 16 & 0x7fff`, seeded where the original seeds it. Every consumer shares one stream, so a port that uses libc `rand` anywhere, or skips a draw, shifts everything after it:
  - OpenCMR2's `Font_Print` draws three `rand()` values per string, so HUD text advances the sequence ([`2cb6f32`](https://github.com/emdzej/opencmr2/commit/2cb6f32)).
  - OpenNFSPU's sound elements consume the shared stream, so sound must be ported even where it seems to be "just audio".
  - OpenSheep's default high-score table draws 60 values at start-up ([`c4d7012`](https://github.com/emdzej/opensheep/commit/c4d7012)).

  OpenGTA has three generators (a 5-word additive one reseeded at every level start, the CRT's, and a sound LCG); identify them all.
- `qsort` and `bsearch`. Equal keys make sort order observable. OpenCMR2 ports msvcrt's middle-element quicksort with its short sort of 8 or fewer elements ([crt.c](https://github.com/emdzej/opencmr2/blob/main/src/crt.c)). In OpenI76, which of two pak members with the same name wins depends on MSVC's sort ([resources.md](https://github.com/emdzej/openi76/blob/main/docs/re/resources.md), [crt.c](https://github.com/emdzej/openi76/blob/main/src/crt.c)).
- Formatted I/O. OpenNFSPU parses scene files with the executable's own `fscanf` format strings, so a `%d` into a 16-bit field spills into the next field, as in the original. OpenGTA replaces `sprintf` on game text with a typed mini-formatter that gives the same output for the shipped texts without the UB.
- Platform enumeration. OpenBV emulates `FindFirstFile` in NTFS order (sorted by upper-cased name) so that map lists match Windows.

## Side effects that hide in small places

- Rendering mutates game state. Return Fire's turrets activate from the draw pass, and soldiers are removed after 120 undrawn ticks. GTA's sprite draw trees and HUD blink counters live in the renderer. Headless tests must render, and an enhanced renderer must run alongside the faithful one, not instead of it.
- Mode switches inside loading states. OpenCMR2 omitted the input-mode switch in a loading state, so Esc arrived as the menu's 0x20 instead of the pause's 0x400 and did not pause ([`4f532dc`](https://github.com/emdzej/opencmr2/commit/4f532dc)). Port each state's side effects in order, tiny calls included.
- Save and restore. OpenNFSPU's `HUD_Draw` saves and restores depth function and fog. The port set them directly and never restored them, so front-end 3D rooms after a race had no depth test ([`85b7d27`](https://github.com/emdzej/opennfspu/commit/85b7d27)). Route state changes through the same cached setters as the original.
- All branches of a dispatcher. OpenOni's combo waited forever because only one of three cases of `AI2rMelee_NotifyAnimation` was ported ([`7205988`](https://github.com/emdzej/openoni/commit/7205988)).
- Callee contracts. A one-entry list passed to a function that fills a whole leaf's hits overflowed the stack ([`dff3e5e`](https://github.com/emdzej/openoni/commit/dff3e5e)).
- Small clamps are load-bearing. `AI2rPath_GoToPoint` raises a radius below 3 to 3; without it a radius of 0 never arrives ([`572f7b2`](https://github.com/emdzej/openoni/commit/572f7b2)).
- Loaders sanitise data. A spawned bit 0x20 present in some files must be cleared on read (0x4bf290, [`cd069f1`](https://github.com/emdzej/openoni/commit/cd069f1)).
- List order can be semantic. Oni's particle classes put decorative classes at the tail, and the gameplay update stops at the first decorative one ([`e038686`](https://github.com/emdzej/openoni/commit/e038686)).

## Recording the work

Each port step extends a native test on real data that skips without it, and updates the topic doc with layouts, formulas, addresses, "Quirks kept" and "Port deviations". It must also leave the headless hashes unchanged, or explain in the commit body why they moved (OpenNFSPU [`85b7d27`](https://github.com/emdzej/opennfspu/commit/85b7d27) gives before and after values). Commit bodies that name the original function and address, what the port did before and what now works make the history a searchable pitfall log. See [Determinism and verification](/guides/verification) and [Working with agents](/guides/agents).

## Checklist

1. Name the function in `names.tsv` with module and confidence; re-run the apply script.
2. Read the decompile, then the disassembly for floats, byte stores, stack-relative operands and branches over blocks.
3. Port in your own words, in the same structure and call order, with `/* Name 0xADDR */`.
4. Read every table, string and constant through `exe.h`.
5. Keep integer widths, 16.16 products, wrap-around, truncation and the original's operation order.
6. Keep quirks and comment them; bound UB that would crash wasm and document what the original read; model uninitialised reads.
7. Give structs their original offsets and `_Static_assert` their sizes under 32-bit; turn vtables into ops tables in slot order.
8. Route unported callees through `PENDING_NOTE` (or a log-once address map) with a neutral return.
9. Check the static-initialiser table for the module's constructors and add them to `PORT_StaticInit` in order.
10. Route all randomness, sorting and searching through the ported CRT.
11. Port every branch of dispatchers, every clamp, and every mode switch and save/restore pair.
12. Extend a test on real data, run the hash cases, and explain any hash change in the commit body.
