---
name: encore-port-function
description: Ports one function (or one small module) of an original game executable to portable C11 for an ENCORE-style faithful reimplementation on gasm - names it in names.tsv, reads decompile and disassembly, rewrites it in the same structure and arithmetic with a /* Name 0xADDR */ citation, keeps quirks and bugs, maps structs to their original offsets with size asserts, turns C++ classes into structs with explicit vtables, routes unported callees through PENDING_NOTE, handles MSVC static initialisers and CRT behaviour (rand, qsort, ftol), converts blocking loops to frame steps or gasm_wait_frame, and verifies with tests on real data and unchanged headless hashes. Use whenever porting, re-porting or fixing a function from disassembly, or when a port diverges from the original.
---

# Port a function, function by function

One function at a time: same structure, same call order, same arithmetic, own words, original address cited.
Fidelity is the product: reproduce quirks and bugs; only fix deviations of the port.

## When to use

- Porting a function or module listed in `docs/re/port-plan.md`.
- Replacing a `PENDING_NOTE` stub or a marked stand-in with the real port.
- Fixing behaviour that differs from the original (the port is wrong until shown otherwise).

## Inputs required

- The function's address and current name (`tools/ghidra/names.tsv`, `re/all.c`, `re/meta.tsv`).
- Ghidra access for disassembly (see `encore-reverse-engineering`).
- The topic doc it belongs to (`docs/re/<topic>.md`), and the module's port file in `src/`.
- The user's game data for tests (`OPEN<GAME>_DATA=<dir|image>`).

## Hard rules

1. Cite the original on every function and global: `/* Name 0xADDR */`. Names match `names.tsv`; no `FUN_`.
2. Write in your own words. Never paste decompiler output into source or docs.
3. No tables, strings, geometry or float constants from the exe in source: read them via `exe.h` at run time.
4. Keep quirks and bugs; comment them "as the original" and list them under "Quirks kept" in the doc.
5. Only `src/platform_gasm.c` includes `gasm.h`. All file access through `vfs.h`. No `fopen` in the core.
6. No blocking loops in the core unless the project keeps loops on `gasm_wait_frame` (check AGENTS.md).
7. No wall clock, no host randomness, no heap-address ordering in the simulation.
8. A change that moves a golden hash must be explained by the change, in the commit body.

## Procedure

### 1. Name and read

1. Ensure the function, its callees and its globals are named in `names.tsv`; re-run `tools/ghidra/apply-names.sh`.
2. Read the decompile (`tools/fn.sh <addr>` or grep `re/all.c`) and its callers/callees/strings (`re/meta.tsv`).
3. Read the disassembly as well if it has x87 code, float compares, byte stores, stack-relative operands,
   switches, a `__fastcall` helper, or a failed decompile (list in the `encore-reverse-engineering` skill's
   `references/decompiler-traps.md`).
4. Find every reference to it: direct calls, vtable slots (`re/vtables.tsv`), data tables (level hooks,
   handler tables), and the MSVC static-initialiser table (`__xc_a`..`__xc_z`).

### 2. Write the port

Use the templates in `references/templates.md`. In order of attention:

1. **Signature and citation.** `/* Name 0xADDR */` above the definition or beside the declaration.
2. **Structure.** Same branches, same order of calls and side effects, every branch of a dispatcher,
   every clamp, every mode switch and save/restore pair. Do not merge, reorder or "simplify".
3. **Integers.** Same widths and signedness; 16.16 as `(int64_t)a * b >> 16`; truncating division; explicit
   wrap; 8-bit register wraps; negative shifts written as multiplications.
4. **Floats.** `float` storage, the original's operation order, rounding exactly at the original's stores;
   `ftol` = truncation through 64-bit; no FMA. Precision mode and rounding mode per the project's FPU
   helpers (see the `encore-x87-fidelity` skill).
5. **Data.** Structs keep original offsets (`/* +0x1c */`) with `_Static_assert` on size under
   `#if UINTPTR_MAX == 0xffffffffu`; files parsed with explicit byte reads; tables via `exe_*()`.
6. **Classes.** `const XxxVtbl *vt` first member; slots in original order, each commented with its address;
   `Class_Method(Class *self, ...)`, `Class_ctor`, `Class_dtor`.
7. **CRT.** All randomness through the ported MSVC `rand` (`holdrand*214013+2531011`, `>>16 & 0x7fff`);
   sorting and searching through ported `qsort`/`bsearch` where order of equal keys is observable;
   formatted I/O through the exe's own format strings or a typed formatter with identical output.
8. **Callees not yet ported.** A function with the original's name whose body is
   `PENDING_NOTE(0xADDR, "Name")` and a neutral return, in the module's `pending.c`.
9. **Undefined behaviour.** Keep in-bounds-but-weird behaviour. Where the original reads foreign memory,
   out of bounds or uninitialised, either model what it read (a mirror global fed with the original's value)
   or bound it and comment what the original effectively got. Never let it crash wasm.

### 3. Loops and time

- State-machine projects: one former loop iteration per step; return `STEP_FRAME` when it presented,
  `STEP_AGAIN` when the state changed without presenting, `STEP_DONE` when finished. Keep the number and
  order of presents and clock reads.
- `gasm_wait_frame` projects: keep the loop; end each frame with `plat_wait_frame()`.
- Threads become counters advanced from the frame clock; async I/O completes at once with its callback run
  where the original would observe completion; `timeGetTime`/`GetTickCount`/QPC read the virtual clock.

### 4. Static initialisers

If the function (or one it calls) is in the MSVC constructor table, add the call to `PORT_StaticInit` in
table order, with the table slot and the target in a comment. Missing one is a silent behaviour change.

### 5. Document

In `docs/re/<topic>.md`, in your own words: layout with offsets, formula, the address of each piece,
confirmed vs inferred, and two lists: "Quirks kept" and "Port deviations" (each with the reason).

### 6. Test and verify

```sh
cmake --build build && ctest --test-dir build --output-on-failure          # native, real data, skips without it
tools/fetch-gasm-sdk.sh && cmake --build build-gasm
gasm-run build-gasm/<game>.wasm --headless N --asset-dir <data> [--input "..."]   # video_fnv32 / audio_fnv32
gasm-run build-gasm/<game>.wasm --headless N --asset cd=<image>                   # same hash line
```

Compare with the golden hashes in AGENTS.md. If a hash moves, the change must explain it; verify with a
headless screenshot (`--screenshot out/x.png`) and re-baseline in the same commit only the cases it should
move. Where a differential harness exists (`tools/emu/`), add or extend a `diff_*` case for the function
and run it in every FPU mode the game uses.

### 7. Commit

Imperative subject naming the function; body: original name + address, what the port did before, what it
does now, which hashes moved and why, which test covers it.

## Pitfalls

- Porting what the code "means" instead of what it does (x87 stack pops, NaN compares, double vs float).
- Libc `rand` or an extra/missing `rand` draw anywhere: every later random value shifts.
- A forgotten side effect in a loading or setup state (input mode, render state restore).
- Only one case of a dispatcher ported; clamps or filters in helpers dropped.
- Container order by pointer value; list insertion at the wrong end when order is semantic.
- Rendering code that mutates game state skipped in tests or in an enhanced renderer.
- Stale `PENDING_NOTE`s and "not ported" lines in docs after the port lands; error strings copied from a sibling.
- Unanchored assumptions about what a global means; trust data flow over the name you guessed.

Real cases with their commits: `references/traps.md`.

## Verification

- `grep -n 'ADDR' src/` shows the citation; `grep -rn 'FUN_' src/` is empty.
- `grep -rn 'PENDING_NOTE(0xADDR' src/` is empty once ported.
- Native tests pass (and skip cleanly without data); both clang and GCC builds are warning-free with `-Werror`.
- Folder and image give identical hash lines; native runner, Node runner and browser agree.
- Golden hashes unchanged, or changed with an explanation and a screenshot check.

## Further reading

- https://encore.emdzej.pl/guides/porting
- https://encore.emdzej.pl/guides/reverse-engineering
- https://encore.emdzej.pl/guides/fidelity
- https://encore.emdzej.pl/guides/verification
- https://encore.emdzej.pl/guides/gasm
