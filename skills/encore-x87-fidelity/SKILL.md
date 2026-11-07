---
name: encore-x87-fidelity
description: Ports x87/MSVC floating-point and CRT behaviour bit-exactly into C compiled for WebAssembly (wasm32 via wasi-sdk) - identifying FPU precision and rounding mode per phase (53-bit CRT default, 24-bit under Direct3D 7, RC changed by the game), double-evaluate/float-store, wide-exponent single precision, exact rounding-mode emulation, -ffp-contract=off, x87 stack order, NaN compare semantics, __ftol truncation, float constants read by address, single-precision runtime asin/acos, libm differences, MSVC rand/qsort, 16.16 fixed point, and modelling uninitialised or out-of-bounds reads. Use when porting any function with float maths, FP compares, float-to-int conversion, random numbers or sorting from a 1990s/2000s Windows game, or when a differential test shows ULP-level or NaN divergence.
---

# ENCORE x87 fidelity

Bit-exact simulation is what lets replays, demos and differential tests line up. The original computed on the x87 through MSVC's runtime; wasm has IEEE float and double with round-to-nearest only. This skill is the procedure the ENCORE ports used to close that gap.

## When to use

- Porting a function containing `fld`/`fstp`/`fmul`/`fdiv`/`fcom`/`fistp`/`fldcw`, a call to `__ftol`, `rand`, `qsort`, `bsearch`, `asin`/`acos`/`sin`/`cos`.
- A differential test (see `encore-verification`) shows 1-2 ULP differences, a NaN, a sign of zero, or an RNG one draw out.
- Writing a server or tool in another language that must match the game's floats (Go, Python).

## Inputs

- Disassembly of the function (not only the decompile). An x87 stack tracer helps: Ghidra prints `fmul ST2` for both `d8 ca` and `dc ca`.
- The list of every `fldcw` site in the executable and what CRT start-up and the graphics API do to the control word.
- `src/exe.h` accessors for reading constants by virtual address (`exe_f32(va)`, `exe_f64(va)`).

## Procedure

### 1. Establish the FPU state per phase

| Evidence in the original | Precision | Port model |
|---|---|---|
| CRT `_controlfp(_PC_53, _MCW_PC)`, nothing else touches PC (no Direct3D) | 53-bit | evaluate in `double`, round to `float` at each original store |
| Direct3D 7 device created (sets control word 0x007f) | 24-bit | `float` arithmetic in the original order; wide-exponent helper for denormal paths |
| `fldcw` setting RC down/up and not restoring | 53-bit, RC varies | global mode + exact correction layer |
| Physics engine sets 64-bit mantissa (e.g. Ipion) | 64-bit | `double` intermediates, `float` at stores; accept "deterministic, not bit-exact" and say so |

Write the result into the project's RE notes with the addresses. Treat the rounding mode as game state: a function that sets RC and never restores it changes everything after it (OpenI76 `Terrain_Height` 0x491f00 rounds down from the first terrain query on).

### 2. Configure the compiler

```cmake
target_compile_options(<core> PRIVATE -ffp-contract=off)
```

Or per file: `#pragma clang fp contract(off)` / `#pragma STDC FP_CONTRACT OFF`. Keep the original's operation order; never simplify, factor or reorder a formula. In Go, round each product explicitly to `float32` (Go fuses multiply-add on arm64).

### 3. Port the arithmetic

- **53-bit**: compute in `double` in the original's operand order; cast to `float` exactly where the original does `fstp dword`. Reproduce values that stay in a register unrounded across a would-be store.
- **24-bit**: compute in `float`. Where values can be denormal for a float but not for the x87's wide exponent, round with `Math_X87` (see `references/patterns.md`).
- **RC not nearest**: route each add/sub/mul/div/sqrt through `fpu_add`/`fpu_mul`/… which compute in nearest and correct by the exact error (TwoSum, `fma` residual). Run every diff in each mode the game reaches.
- **x87 stack order**: follow `fstp` pops and `fdiv`/`fdivr` direction from the bytes. A store-with-pop followed by a divide may divide what is left, not what you expect.

### 4. Port compares by their flag test

For `fcom`/`fcomp` then `fnstsw ax` then `test ah, mask` (ST0 = `a`, operand = `b`):

| Test | Set when | C with the same truth table |
|---|---|---|
| `test ah, 0x01` | `a < b` or unordered | `!(a >= b)` |
| `test ah, 0x41` | `a <= b` or unordered | `!(a > b)` |
| `test ah, 0x40` | `a == b` or unordered | `!(a < b || a > b)` |

Then check whether the branch is `jz` or `jnz`. Confirm which operand is ST0 in the disassembly; the decompiler's `<` hides NaN behaviour.

### 5. Port float-to-int

- `__ftol` truncates via 64-bit `fistp`, keeping the low 32 bits; out-of-range and NaN give the integer indefinite's low half (0). Use the `ftol` helper in `references/patterns.md`.
- A bare `fistp` rounds in the current RC mode (nearest by default): use `llrint` under the modelled mode, or a dedicated helper like OpenCMR2's `X87_MulRound` for `FILD; FMUL m64; FISTP`.
- x87 `0/0` converted to int gives 0x80000000.

### 6. Read constants by address

```c
#define K(va) exe_f32(va)      /* float constant at a VA in the user's exe */
#define KD(va) exe_f64(va)     /* double constant */
```

Never retype a decimal: `0.15915494f` is `0x3e22f983` but the original's 1/2π was `0x3e22f981`. Check whether the instruction loads `dword` (float) or `qword` (double).

### 7. Transcendentals

- Identify the runtime routine the game calls (`asin` 0x5a27c0-style CRT functions) and whether it takes its root at single precision; port a replica (`Math_Asin`, `Math_Acos`).
- `fsin`/`fcos`/`fptan` produce 64-bit mantissas; libm may differ in the last bit and may differ between native and wasm. Compare hashes within one build target. Build generated tables from integer-exact formulas where possible.
- In another language, port the same libm the client uses (OpenBV ported musl `sinf`/`cosf` to Go).

### 8. The CRT

- MSVC `rand`: `holdrand = holdrand*214013 + 2531011; return (holdrand>>16) & 0x7fff;`, seeded where the original seeds. Route **every** consumer through it (text printing, sound, particles all draw from the shared stream).
- `qsort`/`bsearch`: port msvcrt's algorithm (middle-element quicksort, short sort for ≤8 elements) when equal-key order is observable.
- Parsing with `sscanf`/`fscanf`: use the exe's own format strings so CRT quirks carry over.

### 9. Integers and memory

- 16.16 stays 16.16: `(int32_t)(((int64_t)a * b) >> 16)`, explicit wrap, C truncating division, signedness of loads, 8-bit wraps.
- Negative left shift is UB in C: write a multiplication.
- Uninitialised reads: model what the original gets (last value written in place, a stale stack slot mirrored in a global), never zero it silently.
- Out-of-bounds reads: return the value the original's neighbour held (often ≈0) with a comment naming it; keep contiguous table layouts where indices run across tables.
- Never order by heap address; use creation order or a stable id.

## Hard rules

- Read the disassembly for every float function; the decompiler drops arithmetic, merges products and hides stack pops.
- Keep `float` storage where the original stores `float`, `double` where it stores `double`.
- No float constant or table copied into source: read it from the user's executable.
- Guard real UB with a comment describing the original's effective value; never "fix" original behaviour.

## Pitfalls

- Denormals: x87 at single precision keeps them exact until stored; float steps flush or round differently (−0 vs +0 seen).
- A double constant read as a float gives garbage that may show only on a rare path.
- NaN payloads differ across hosts: compare NaN as NaN in golden tests; keep NaN bits out of hashed state.
- C++ argument evaluation order is unspecified: `f(rand(), rand())` differs between compilers. Pick one, document it.
- The emulator may not model precision control; real hardware under D3D7 may differ. Record unconfirmed assumptions.

## Verification

- Differential test of the function against the original in Unicorn, with the control word set per mode: 0 differing words.
- Golden hashes unchanged, or changed and explained.
- Native ASan/UBSan run of scripted play clean.

## Further reading

- https://encore.emdzej.pl/guides/fidelity
- https://encore.emdzej.pl/guides/verification
- https://encore.emdzej.pl/guides/porting
- `references/patterns.md` in this skill
