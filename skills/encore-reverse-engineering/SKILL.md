---
name: encore-reverse-engineering
description: Sets up and runs the reverse-engineering loop for a faithful reimplementation of an old Windows game - pins the target binary by size and CRC-32, imports it into Ghidra driven headlessly from the shell (ghidra-cli), creates the functions auto-analysis misses, keeps names in a version-controlled names.tsv with confidence levels, regenerates greppable full decompile dumps, inventories the executable by address range, borrows names from a symbol-bearing build, flags where the decompiler cannot be trusted, and reads tables from the user's executable at run time. Use when starting RE on a new game, when naming or understanding a function before porting it, when the decompiler output looks wrong or suspicious, or when a table or constant from the exe is needed in the port.
---

# Reverse engineering for an ENCORE port

Read the original executable so that each function can be ported exactly. The decompiler is a reading aid;
the disassembly and the binary are the authority. Nothing you read here is pasted into the repository.

## When to use

- Bootstrapping RE on a new target (steps 1-7).
- Before porting any function: name it, understand it, decide whether the disassembly must be read (step 8).
- When a port behaves differently from the original and the decompiled C looks plausible (step 8).
- When the port needs a table, string or constant from the executable (step 9).

## Inputs required

- The user's original executable (and any DLL whose code or tables matter), never committed.
- Its exact size and CRC-32 (step 1 computes them).
- Ghidra plus a headless driver (ghidra-cli, `analyzeHeadless`, or a Ghidra MCP server), JDK 21.
- The repository's `tools/ghidra/` folder (create it from `references/scripts.md` if absent).

## Hard rules

1. Never commit the executable, its Ghidra copy, `re/` (dumps) or `out/`. They are git-ignored.
2. Never paste decompiler output into source or docs. Describe layouts, formulas and addresses in your own words.
3. `tools/ghidra/names.tsv` is the record. Rename there, then apply; never only in Ghidra.
4. No `FUN_xxxxxx` in `src/`. A function you port gets a real name first.
5. Tables, strings, geometry and float constants are read from the user's exe at run time, never typed into source.
6. A symbol-bearing build of another version is a name map, not the authority.

## Procedure

### 1. Pin the binary

```sh
python3 -c 'import sys,zlib;d=open(sys.argv[1],"rb").read();print(len(d),"%08x"%(zlib.crc32(d)&0xffffffff))' game/Game.exe
```

Record the file name, size, CRC-32 and image base in `src/exe.h` and AGENTS.md. Find the real game binary:
launchers and language stubs are not it (Return Fire's game is `RFIRE.BIN`, not `RFIRE.EXE`). Note where it
lives on the retail media (CD root, InstallShield cabinet, VISE archive, installed folder).

### 2. Create the Ghidra project

```sh
cp game/Game.exe ./game.exe                     # the Ghidra copy; git-ignored
P=(--project game --program game.exe)           # zsh: arrays, it does not word-split
```

Import it. If ghidra-cli's own import produces broken listings (for example `push` decoded as two-byte
`MOV`s), stop the project and import with Ghidra's `analyzeHeadless` instead. Set `java_home` (JDK 21) in
ghidra-cli's config, or the launcher waits on stdin forever.

### 3. Make Ghidra find every function

1. Run auto-analysis explicitly (`AnalyzeAll.java` / `Reanalyze.java`). Check the function count; zero or
   far below `objdump -d` means analysis did not run.
2. Run `FillGaps.java`: functions in unclaimed `.text` gaps (after `RET`/`INT3`/`NOP` padding, 16-byte aligned).
3. Run `CreateFunctions.java` over `tools/ghidra/entries.tsv`: addresses taken from data tables (handlers,
   converters, level hooks, chunk handlers) that nothing calls directly.
4. For MSVC C++ with RTTI, extract classes, vtables and slot lists (complete object locators) to
   `re/rtti.tsv` and `re/vtables.tsv`; create functions at every vtable target.

### 4. Names as data

Create `tools/ghidra/names.tsv` (format and confidence levels in `references/names-tsv.md`). First naming
pass from strings, imports, error messages, file names and source paths. Then run the apply loop:

```sh
tools/ghidra/apply-names.sh     # FillGaps, ApplyNames, DumpAllNamed -> re/all.c, DumpMeta -> re/meta.tsv, re/funcs.txt
```

Search the dumps instead of opening functions one by one:

```sh
grep -n '^// ==== ' re/all.c | grep -i sound          # function list by name
awk -v a="@ 004a9720" 'index($0,"// ==== ")==1 { p = index($0,a) > 0 } p' re/all.c   # one function (OpenSheep's tools/fn.sh)
awk -F'\t' '$2 ~ /Car_/' re/meta.tsv                 # sizes, callers, callees, strings
```

### 5. Inventory by address range

MSVC links object files in source order, so each source module is a contiguous range. Find anchor functions
(strings, imports, source paths), extend them to ranges, and write `docs/re/inventory.md` with range,
module, purpose, function count and KB of code (template in `references/inventory-template.md`). Mark
statically linked libraries (CRT, zlib, D3DX) as not ported. Estimate effort in KB, not function counts.
Large executables can be split into ranges and inventoried in parallel, then merged into `names.tsv`.

### 6. Architecture and plan

Write `docs/re/architecture.md` (entry, main loop, state machines, timing, threads, file layer, device API
usage, globals) and `docs/re/port-plan.md`: ordered steps, each ending with a machine-checkable check.

### 7. Borrow names from a symbol-bearing build (if one exists)

Look for another platform's build, a later patch or a debug build that kept symbols. Import it into the same
project, dump `meta.tsv` for both, and match by: unique strings (source paths reduced to base names), then
call-graph uniqueness, link-order layout, neighbourhood similarity. Iterate to a fixpoint. Hide a share of the
string matches and measure each method's precision; accept only high-precision methods (in OpenOni: strings
and neighbourhood >= 0.75, right 96-97%). Record accepted names with confidence and method; keep the rest for
review.

### 8. Read one function before porting it

1. Read the decompile in `re/all.c` and its callers, callees and strings in `re/meta.tsv`.
2. Read the disassembly as well whenever any trigger in `references/decompiler-traps.md` applies: x87 code,
   FP compares, byte stores, stack-relative operands, switches, `__fastcall` helpers, a failed decompile, or
   any behaviour that differs from the original.
3. Name the function, its globals and its struct fields in `names.tsv` with an honest confidence; apply.
4. Write the finding in the topic doc in your own words: layout with offsets, formula, addresses, each field
   marked confirmed or inferred, "never read" fields with the reader's address, open questions at the end.

### 9. Tables from the executable

Read them through `src/exe.h` at run time (`exe_u32(va)`, `exe_f32(va)`, `exe_str(va)`, `exe_ptr(va)`), copied
into C structures by a registered loader. For research, print values with a small reader
(`tools/exe.py <va> [count] [u32|u16|u8|i32|f32|s]`); output goes to the terminal only. Values held in
instructions (`mov dword [mem], imm32` per entry) are read from the instruction operands. Read float
constants by address (`#define K(va) exe_f32(va)`) rather than writing decimals. Codec tables in vendor DLLs
(`binkw32.dll`) are read the same way, with the DLL pinned by size and CRC.

## Pitfalls

- Analysis silently skipped on import (a DLL with zero functions).
- Vtable-only and callback functions missing, so unported code hides in gaps.
- `__fastcall` helpers whose arguments Ghidra hides until the signature is set.
- Names that are wrong but confident (a handler recorded as "flash" that was "fill"); duplicate rows.
- Constants read as the wrong width (a double read as a float) or as decimals instead of bits.
- A struct offset misidentified (a caps bit taken for the neighbouring flag).
- Features present in the exe but unreachable in the target version: check reachability before porting.
- Parallel Ghidra full dumps on a shared machine: run one at a time, niced.

## Verification

- Function count after import and after each creation script is recorded in the inventory.
- `apply-names.sh` runs cleanly and `re/funcs.txt` has no `FUN_` entry for any function referenced in `src/`.
- `grep -rn 'FUN_' src/` returns nothing.
- `names.tsv` has no duplicate addresses: `cut -f1 tools/ghidra/names.tsv | grep -v '^#' | sort | uniq -d` is empty.
- Every table the port uses is read through `exe.h`: no long literal arrays copied from the exe in `src/`.
- Where doubt remains about a function's arithmetic, a differential test runs the original's code on the
  port's state (see the `encore-verification` skill).

## Further reading

- https://encore.emdzej.pl/guides/reverse-engineering
- https://encore.emdzej.pl/guides/porting
- https://encore.emdzej.pl/guides/project-layout
- https://encore.emdzej.pl/guides/fidelity
- https://encore.emdzej.pl/guides/verification
