---
title: Floating point and the compiler
---

# Floating point and the compiler

A 1990s Windows game computed its floats on the x87 FPU, through the MSVC runtime, in whatever precision and rounding mode the CRT, Direct3D or the game itself left in the control word. WebAssembly has IEEE single and double arithmetic with round-to-nearest only, and clang is free to fuse, reorder and assume. Bit-exact physics — the property that lets replays, demos and differential tests line up — means modelling the FPU state the original ran in, telling the compiler not to help, and reproducing the CRT's `rand`, `qsort` and float-to-int conversion. It also means modelling what the original read from memory it never meant to read. This page collects what the ENCORE projects learned, with the evidence.

## Find the FPU state first

Before porting any float code, establish which precision and rounding the original actually runs with. The answer differs per game and decides the whole porting strategy.

| Project | FPU state in the original | Port strategy |
|---|---|---|
| [gta](/games/gta) | CRT sets `_controlfp(_PC_53, _MCW_PC)` at 0x49e925; nothing changes it (MGL only masks exceptions; DirectDraw doesn't touch the FPU) | compute in `double` in the original's operand order, round to `float` at the original's stores |
| [sheep](/games/sheep) | default 53-bit, no Direct3D | the same; `ftol()` mirrors `__ftol` |
| [i76](/games/i76) | control word 0x27f (53-bit, nearest) at start, then the game changes RC | exact rounding-mode emulation ([`src/render/fpu.h`](https://github.com/emdzej/openi76/blob/main/src/render/fpu.h)) |
| [nfspu](/games/nfspu) | Direct3D 7 sets **24-bit precision** when the device is created (control word 0x007f) | `float` arithmetic in the original's order, plus `Math_X87` for the wide exponent |
| [cmr2](/games/cmr2) | sim in 16.16 fixed point; specific x87 conversions (`FILD; FMUL m64; FISTP`) | `X87_MulRound`: product rounded to a 64-bit mantissa, then to nearest |
| [ballance](/games/ballance) | Ipion physics sets 64-bit mantissa during simulation | `double` intermediates, `float` where the original stores `float`; "deterministic, not bit-exact" |
| [oni](/games/oni) | x87 extended precision | goal is the original's behaviour; every runner identical |

Check two things in the disassembly: every `fldcw` site, and what the CRT start-up and any graphics API initialisation do to the control word. [cmr2](/games/cmr2)'s notes flag an open question honestly: its 64-bit model matches Unicorn, which ignores precision control, but real hardware under D3D7 may leave the FPU at 24-bit — unconfirmed ([`a897a0c`](https://github.com/emdzej/opencmr2/commit/a897a0c)). An earlier 24-bit model there was wrong ([`92859ab`](https://github.com/emdzej/opencmr2/commit/92859ab)).

### 53-bit precision: double in registers, float at stores

With the MSVC default, expressions are evaluated in double precision in x87 registers and rounded to float only when stored. Port the expression in `double`, in the original's operand order, and convert to `float` exactly where the original executes an `fstp dword`. Watch for the stores that are *not* there: [gta](/games/gta)'s lateral tyre force and `Phys_PointVelocity`'s x stay unrounded in a register while y is stored ([docs/cars.md](https://github.com/emdzej/opengta/blob/main/docs/cars.md)); [i76](/games/i76)'s `Integrate` adds x's product unrounded but y and z as floats ([`8fc7730`](https://github.com/emdzej/openi76/commit/8fc7730)).

### 24-bit precision under Direct3D 7

Every float operation rounds to single precision, so C `float` arithmetic in the original's exact order reproduces it — except that the x87 at single precision keeps its **wide exponent**. Values decaying through the float denormal range stay exact until stored. [nfspu](/games/nfspu)'s steering filter decays through denormals; the x87 reached −0 where float steps reached +0 ([`781a0d1`](https://github.com/emdzej/opennfspu/commit/781a0d1)); a car at rest with velocity around 1e-20 underflowed its squares in float ([`4ae0894`](https://github.com/emdzej/opennfspu/commit/4ae0894)). The fix is a rounding helper that keeps a double's exponent ([`src/game/sim_math.c`](https://github.com/emdzej/opennfspu/blob/main/src/game/sim_math.c)):

```c
/* A value rounded as the x87 at single precision rounds it: to 24 significant
   bits, with the x87's wide exponent. */
double Math_X87(double x)
{
    int e;
    double m = frexp(x, &e);
    return ldexp((double)(float)m, e);
}
```

The full fix list in [nfspu](/games/nfspu) ([`e47cee6`](https://github.com/emdzej/opennfspu/commit/e47cee6), [`33977ab`](https://github.com/emdzej/opennfspu/commit/33977ab)): float steps instead of double intermediates, the original's operation order (the torque curve as `((rpm - 500 i) K)(b - a) + a`), sine rounded to float, angles in turns × 2π rounded to float before sin/cos. Result: 0 differing car words over 248 sampled ticks.

## The rounding mode is game state

[i76](/games/i76) found that `Terrain_Height` 0x491f00 sets the x87 rounding control to *down* and never restores it ([`2d39318`](https://github.com/emdzej/openi76/commit/2d39318)). From the first terrain query on, every frame and every later mission load runs rounding down; only the first mission load and the front end before it run at nearest. `DrawPoly` 0x43d730 sets *up* around every filler (the `1.5 × 2^52` rounding trick becomes a ceiling: a top-left fill rule) and restores it; `Terrain_Draw` sets *down* for its quadtree and restores it.

WebAssembly has only round-to-nearest, so the port keeps the current mode in a global and corrects each nearest result by its exact error ([`f1d04c8`](https://github.com/emdzej/openi76/commit/f1d04c8)):

```c
static inline double fpu_mul(double a, double b)
{
    double p = a * b;
    if (g_fpu_round == FPU_NEAREST || p == 0 || isinf(p) || isnan(p)) return p;
    return fpu_fix(p, fma(a, b, -p));   /* the exact error of the product */
}
```

Additions use TwoSum for the error term, quotients and square roots an `fma` residual, and exact-zero sums follow the sign rules of the active mode. Transcendentals (`fsincos`, `fpatan`, `fyl2x`/`f2xm1`) use libm plus a final-store correction only. Every differential test runs in both modes the game uses (0x27f and 0x67f).

::: tip Scan every fldcw early
A function that sets the rounding mode and never restores it changes every later computation. List all `fldcw` sites in the inventory, model the control word globally, and test in each mode the game reaches.
:::

## Tell the compiler not to help

- **No contraction.** clang may fuse `a*b + c` into an FMA, which rounds once instead of twice. [i76](/games/i76) compiles its core with `-ffp-contract=off`; [gta](/games/gta) disables contraction with pragmas in its physics files. The explicit `fma()` calls in `fpu.h` are deliberate error terms, not contractions.
- **Other languages too.** Go fuses multiply-add on arm64; [bv](/games/bv)'s Go server rounds each product to float32 explicitly, and its C++ reference drivers are built with `-ffp-contract=off` ([`11ae1ce`](https://github.com/emdzej/openbv/commit/11ae1ce)).
- **Keep the order of operations.** Do not simplify formulas, hoist common factors or swap operands. [nfspu](/games/nfspu)'s rule: "`float` everywhere, keep the original's order of operations, don't simplify formulas."
- **Evaluation order is unspecified in C++.** `CVector3f(rand(), rand(), rand())` evaluates x, y, z under clang and probably z, y, x under MSVC x86. [bv](/games/bv) chose clang's order (it matches the wasm client and stays checkable) and documented the choice.

## Read the x87 stack, not the decompiler

The decompiler hides x87 stack semantics that change meaning.

- [nfspu](/games/nfspu)'s `AI_Steer` stores the speed gap with a pop and then divides what is left — the target speed alone. Throttle depends on target speed, not on the gap; the port "logically" used the gap and opponents pulled away more slowly ([`3680542`](https://github.com/emdzej/opennfspu/commit/3680542)).
- Ghidra prints `fmul ST2` for both `d8 ca` and `dc ca`, which differ in direction. [i76](/games/i76)'s [`tools/ghidra/x87trace.py`](https://github.com/emdzej/openi76/blob/main/tools/ghidra/x87trace.py) follows the register stack along a path, decodes register forms from bytes and prints SSA assignments ([`a878938`](https://github.com/emdzej/openi76/commit/a878938)).
- [cmr2](/games/cmr2)'s decompiler output for `Car_Integrate` dropped the position and angle steps and a 0.2 scale; it was ported from disassembly. For numeric hot code, read the disassembly.

## Comparisons with NaN

An x87 compare is `fcom`/`fcomp`, `fnstsw ax`, then a flag test. `test ah, 0x01` (or `0x41`) treats *unordered* as "below" or "below-or-equal". C's `<` and `<=` are false for NaN. [sheep](/games/sheep) hit this twice:

- Sheep speed 0/0 produced NaN; the original's compare made the target 0, the port kept NaN and the speed ran to −11.4, putting a sheep 237 px off the map ([`38756d4`](https://github.com/emdzej/opensheep/commit/38756d4)).
- `acos` of a dot product just past 1 gave NaN; the original snaps to the path's first point, the port's `<=` failed and `ftol(NaN)` gave x = 0 ([`6251cb9`](https://github.com/emdzej/opensheep/commit/6251cb9)).

When porting an FP compare, read the flag test in the disassembly (`tools/dis.py` with capstone in [sheep](/games/sheep)) and write the C that has the same truth table: "below or unordered" is `!(a >= b)`, not `a < b`.

NaN *payloads* are nondeterministic across hosts. [bv](/games/bv)'s golden data recorded on arm64 failed on x86-64 CI until tests compared NaN as NaN ([`b790e1c`](https://github.com/emdzej/openbv/commit/b790e1c)). Keep NaN bits out of hashed state.

## Float to integer

MSVC calls `__ftol` after a float-to-int conversion, which truncates. C's cast truncates too, but out-of-range values differ. [sheep](/games/sheep) mirrors `__ftol` 0x43ca04 — truncation through a 64-bit `fistp`, low 32 bits kept, out-of-range and NaN giving the integer indefinite's low half ([`src/game.h`](https://github.com/emdzej/opensheep/blob/main/src/game.h)):

```c
static inline int32_t ftol(double v)
{
    if (!(v > -9223372036854775808.0 && v < 9223372036854775808.0)) return 0;   /* 0x8000000000000000 */
    return (int32_t)(uint32_t)(uint64_t)(int64_t)v;
}
```

[oni](/games/oni)'s WM slider creation does x87 `0/0` and keeps the low half of the integer indefinite 0x80000000. Where the original uses `fistp` under the current rounding mode rather than `__ftol`, the result rounds instead of truncating — [cmr2](/games/cmr2)'s `X87_MulRound` models exactly that `FILD; FMUL m64; FISTP` sequence.

## Constants: read the bits

A float constant written as a decimal may not be the original's bits. [nfspu](/games/nfspu)'s `0x3e22f981` is slightly under 1/2π while `0.15915494f` compiles to `0x3e22f983` ([`c9523ba`](https://github.com/emdzej/opennfspu/commit/c9523ba)). A *double* 1/1500 at 0x5b4a00 read as a float gave −473.77, showed only after front damage, and froze a car at tick 1,008 of `replay.rpl` ([`a7c5785`](https://github.com/emdzej/opennfspu/commit/a7c5785)). Reading constants from the user's executable at run time (`#define K(va) exe_f32(va)`) removes this class of bug and keeps the data out of the repository; see [Porting function by function](/guides/porting).

## Transcendentals and libm

- **Single-precision runtime functions.** [nfspu](/games/nfspu)'s runtime `asin`/`acos` (0x5a27c0, 0x5a0e10) take their root at single precision while `fpatan` is exact; the port has `Math_Asin` and `Math_Acos`. Projection `fsin`/`fptan` are taken as the correctly rounded float of the double result.
- **Double-precision ones.** [oni](/games/oni)'s physics uses x87 double-precision `acos` ([`cb6da2b`](https://github.com/emdzej/openoni/commit/cb6da2b)).
- **libm is not the FPU.** `fsin`/`fcos` produce 64-bit mantissas; libm differs in the last bit. libm may also differ between the native test build and wasm, so native tests and wasm are each deterministic but not necessarily equal. Compare hashes only within one build target ([gta](/games/gta) [docs/cars.md](https://github.com/emdzej/opengta/blob/main/docs/cars.md)). [rf](/games/rf)'s generated tables are off by one in rare entries for the same reason; build tables from integer-exact formulas where possible.
- **Across languages, port the libm.** A correctly rounded `cosf` differs in the last bit from musl's, and `(short)(x*100)` amplified it into a different coordinate on the wire; [bv](/games/bv) ported musl's `sinf`/`cosf` to Go ([`11ae1ce`](https://github.com/emdzej/openbv/commit/11ae1ce)).
- **Coarse tricks are behaviour.** [nfspu](/games/nfspu) keeps the original's coarse square root for sphere-map coordinates (magic `0x5f400000`, one step with 1.47 / 0.47) and a distance estimate made by halving a float's bits and adding `0x1fc00000`.

## The C runtime is part of the game

- **`rand()`.** Every project reproduces MSVC's LCG: `holdrand = holdrand * 214013 + 2531011; return (holdrand >> 16) & 0x7fff` ([cmr2 `src/crt.c`](https://github.com/emdzej/opencmr2/blob/main/src/crt.c), [sheep `src/rng.c`](https://github.com/emdzej/opensheep/blob/main/src/rng.c)).
- **Shared streams.** One generator feeds everything, so unrelated code shifts the sequence. [cmr2](/games/cmr2)'s `Font_Print` draws three `rand()` values per string, so porting the HUD clock with libc `rand` broke the simulation ([`2cb6f32`](https://github.com/emdzej/opencmr2/commit/2cb6f32)). [nfspu](/games/nfspu)'s sound elements consume the shared stream (0x537db0): port them even if "just audio". [ballance](/games/ballance)'s building blocks share one stream, so their execution order matters. [sheep](/games/sheep)'s default high-score generation draws 60 values at start-up. [bv](/games/bv)'s float `rand` makes no `rand()` call when `from == to`: call counts must match.
- **`qsort` and `bsearch`.** Equal-key order is observable. [cmr2](/games/cmr2) ports msvcrt's middle-element quicksort with its ≤8-element short sort; in [i76](/games/i76) 11 names exist in two archives and which copy wins depends on MSVC's sort, so `qsort` and `bsearch` live in [`src/crt.c`](https://github.com/emdzej/openi76/blob/main/src/crt.c).
- **Format strings.** [nfspu](/games/nfspu) reads scene files with the exe's own `fscanf` format strings so CRT quirks carry over (`%d` into a 16-bit field spills its upper half into the next field).

## Integer arithmetic

- **16.16 fixed point stays 16.16.** [cmr2](/games/cmr2)'s simulation has about 10,000 `>>16` in decompiled code; multiplies are `(int64_t)a*b >> 16` with explicit wrap-around. [rf](/games/rf) keeps each `FixMul` term separate; [gta](/games/gta) keeps its 16.16 edge stepping with the original's `+0x8000` vs `+0x7fff` rounding and the `add ecx,eax; adc bl,al` 8-bit carry trick.
- **C truncating division, signedness of loads, 8-bit register wraps** are all observable ([gta](/games/gta) per-function checklist).
- **Undefined behaviour in C that was defined on x86.** A negative left shift is UB; write it as a multiplication ([sheep](/games/sheep) [`874afab`](https://github.com/emdzej/opensheep/commit/874afab)).
- **wasm checks indirect call signatures.** A mismatched function-pointer cast traps with "indirect call type mismatch"; use a typed wrapper ([gasm `AGENTS.md`](https://github.com/emdzej/gasm/blob/main/AGENTS.md)).

## Memory the original never meant to read

The original's out-of-bounds and uninitialised reads returned whatever lay next to them in its address space. In wasm the neighbours differ.

- **Uninitialised values must be modelled, not zeroed.** [cmr2](/games/cmr2)'s `Car_CornerGround` passed an uninitialised normal; the original writes in place at +0x4a4, so an off-mesh corner keeps the last one. Garbage made off-road runs differ between builds ([`5eb382d`](https://github.com/emdzej/opencmr2/commit/5eb382d)). [i76](/games/i76)'s tiled affine filler reads a stale stack row counter that produces a visible 4-row band; the port mirrors it in a global ([`1417ab4`](https://github.com/emdzej/openi76/commit/1417ab4)).
- **Out-of-bounds reads change with layout.** [sheep](/games/sheep)'s `g_sin[t/2]` with negative `t` read ≈0.0 in the original and NaN in wasm; `arc_sin()` now returns 0 for a negative index, with a comment naming what the original read. [gta](/games/gta)'s `recip[i]` table is read out of range by the original; the port uses 0 and counts `poly_recip_oob`. [oni](/games/oni) skips a direction index that can reach 7 past six facing factors rather than read out of bounds ([`a6d494a`](https://github.com/emdzej/openoni/commit/a6d494a)).
- **Keep layouts where indices run across tables.** [i76](/games/i76)'s `lum`, `tbl`, glow and remap tables sit in one contiguous block `g_rtab` 0x5af150 because indices run from one into the next. [gta](/games/gta)'s 8-bit texel wrap reads the neighbouring tile and its rotated-tile LRU cache's neighbour slot, so the LRU is ported exactly.
- **Arenas with original-like addresses** where scripts do pointer arithmetic ([i76](/games/i76)'s FSM, [`db16407`](https://github.com/emdzej/openi76/commit/db16407)).
- **Never order by address.** [nfspu](/games/nfspu)'s particle queue keyed by address differed between folder and ISO ([`a130d52`](https://github.com/emdzej/opennfspu/commit/a130d52)); [ballance](/games/ballance)'s ball–ball synapse order used entity pointers and needs a stable key.
- **Zero what the original zeroed.** [cmr2](/games/cmr2) keeps its globals in one zeroed block; gasm's `glMapBufferRange` with an invalidate bit now zeroes the mapped copy because leftover heap bytes were uploaded and hashes depended on heap layout ([gasm CHANGELOG](https://github.com/emdzej/gasm/blob/main/CHANGELOG.md)).

Where the original reads unrelated memory, use a documented neutral value and list it under "Port deviations". Where an unchecked bound would corrupt the port, stop with a fatal error rather than write past it.

## When bit-exactness is out of reach

[ballance](/games/ballance)'s Ipion physics runs at a 64-bit mantissa through a long event loop; the port uses `double` intermediates, `float` at stores, and states "deterministic, not bit-exact, and nothing can be" ([docs/ivp_core.md](https://github.com/emdzej/openballance/blob/main/docs/ivp_core.md)). [oni](/games/oni) targets the original's behaviour while requiring identical hashes on every gasm runner. That is a legitimate end state if it is stated, and if every runner still agrees. See [Determinism and verification](/guides/verification).

## Checklist

1. Find every `fldcw` and the CRT/graphics API initialisation; write down precision and rounding per phase of the game.
2. Compile the core with `-ffp-contract=off` (or per-file pragmas); keep the original's operation order and never simplify formulas.
3. 53-bit games: compute in `double`, round to `float` at the original's stores, keep the original's register-resident values.
4. 24-bit games: compute in `float` in the original's order; use a wide-exponent rounding helper on denormal-prone paths.
5. Games that change RC: keep a global mode and route every affected operation through an exact correction layer; test in each mode.
6. Read the disassembly for x87 stack order (`fstp` pops, `fdiv` direction) and for every FP compare's flag test; port NaN behaviour.
7. Mirror `__ftol` and any `fistp` under the current rounding mode.
8. Read float and double constants from the executable by address; never retype decimals.
9. Reproduce single- or double-precision runtime transcendentals where the original used them; compare hashes within one build target only.
10. Port MSVC `rand`, `qsort`, `bsearch` and any CRT parsing the game's behaviour depends on; route every consumer of the shared stream through it.
11. Keep 16.16 multiplies, wrap-around, truncating division and signedness exactly.
12. Model uninitialised and out-of-bounds reads the original performs; never order anything by address; guard real UB with a comment naming the original's effective value.
