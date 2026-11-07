---
title: Reverse engineering workflow
---

# Reverse engineering workflow

The projects read the original executable with Ghidra, run headlessly from the shell so that agents can query it like any other tool. Names are recorded in a tab-separated file under version control rather than in the Ghidra project, and every function is decompiled into one greppable text dump. The binary is inventoried by address range before porting begins. This page covers that loop, the scripts that make Ghidra find every function, how to borrow names from a build that carries symbols, where the decompiler cannot be trusted, and how the port reads tables from the user's executable at run time instead of copying them into source.

## Ghidra from the command line

All function-by-function projects use [ghidra-cli](https://github.com/akiselev/ghidra-cli) (commands as in [OpenGTA's how-to](https://github.com/emdzej/opengta/blob/main/docs/howto/reverse-engineering.md)) against a Ghidra project that holds a git-ignored copy of the user's executable:

```sh
P=(--project gta --program gta.exe)          # zsh: keep options in an array; it does not word-split
ghidra decompile 0x438200 "${P[@]}"
ghidra x-ref 0x438200 "${P[@]}"
ghidra disasm 0x438200 "${P[@]}"
# also used: x-ref to, memory, strings, function rename (check ghidra-cli's help for arguments)
ghidra script run tools/ghidra/DumpAllNamed.java "${P[@]}" -- "$PWD/re/all.c"
```

The program inside the project is a copy (`gta.exe`, `rfire_game.exe`, `cmr2.exe`), never the file in the user's data folder, and it is git-ignored alongside `re/`. A Ghidra MCP server can stand in for the CLI, but every repository documents the CLI.

Setup problems seen in practice, each recorded in AGENTS.md so agents do not repeat them:

| Problem | Symptom | Fix | Source |
|---|---|---|---|
| No `java_home` in ghidra-cli's config | The launcher waits on stdin forever | Set JDK 21 explicitly (`--java-home .../openjdk@21/...` in OpenBallance) | [OpenGTA AGENTS.md](https://github.com/emdzej/opengta/blob/main/AGENTS.md) |
| ghidra-cli's own import | Broken listings: `push` decoded as two-byte `MOV`s | Import with Ghidra's `analyzeHeadless` after `ghidra stop --project <p>`, then query with ghidra-cli | [OpenOni AGENTS.md](https://github.com/emdzej/openoni/blob/main/AGENTS.md) |
| Import without analysis | `dx7z.dll` had zero functions; `VxMath.dll` 0, `CK2.dll` 54 | Run auto-analysis explicitly: OpenNFSPU's `AnalyzeAll.java` (385 functions), OpenBallance's `Reanalyze.java` (726 and 2,794) | [AnalyzeAll.java](https://github.com/emdzej/opennfspu/blob/main/tools/ghidra/AnalyzeAll.java) |
| zsh variable expansion | Options passed as one word | Arrays, as above | OpenOni |

Always check the function count after import. A count of zero, or one far below what `objdump` finds, means analysis did not run.

## Finding every function

Auto-analysis misses functions that are reached only through pointers: virtual methods, callbacks, handler tables. Unported code hides in exactly those gaps, so every project runs a script that creates them:

- `FillGaps.java` creates functions in the unclaimed gaps of `.text`. OpenNFSPU went from 6,006 to 8,013 functions, and the Win32 message pump around 0x53b744 was among the missed code ([inventory](https://github.com/emdzej/opennfspu/blob/main/docs/re/inventory.md)). OpenOni went from 3,136 to 3,655. OpenI76's version creates functions at 16-byte-aligned addresses after `RET`/`INT3`/`NOP` padding.
- `CreateFunctions.java` with an `entries.tsv` creates functions at addresses taken from data tables. OpenOni lists 80 such entries, pixel converters among them, because they "are only reached through tables, so Ghidra had no functions for them" ([`a4ae8b0`](https://github.com/emdzej/openoni/commit/a4ae8b0); [entries.tsv](https://github.com/emdzej/openoni/blob/main/tools/ghidra/entries.tsv)). OpenI76 does the same for BWD2 chunk handlers. OpenSheep marks such addresses with a third column `fn` in its `names.txt`.
- `MakeFunctions.java` (OpenBallance) creates functions at vtable targets. Even so, `re/physics_RT.dll.c` lacked about 180 functions that `objdump` finds, the manager's PostProcess at 0x10007ce0 among them.
- RTTI. For MSVC C++ with RTTI, OpenNFSPU's `rtti.py` walks the complete object locators into `re/rtti.tsv` and `re/vtables.tsv`: classes, vtables and slot lists. It found 366 RTTI descriptors.

## Names as data

`tools/ghidra/names.tsv` is the single source of truth for names, with one row per address ([OpenCMR2](https://github.com/emdzej/opencmr2/blob/main/tools/ghidra/names.tsv)):

```text
# addr	name	module	confidence	description
# confidence: high = read and understood, med = from calls/strings, low = guess
004a9720	WinMain	main	high	Single-instance check (FindWindow), error log c:\error.txt, init, PeekMessage loop ...
```

Confidence levels make uncertainty visible:

| Project | Rows | Levels used |
|---|---|---|
| OpenCMR2 | 1,969 | high 1,422, confirmed 382, med 143, low 15 |
| OpenNFSPU | 2,716 (+46 for `dx7z.dll`) | high, med, low, plus `struct` (a `Class_vN` slot of unknown purpose) and `range` (CRT or unidentified placeholder) |
| OpenGTA | 1,797 | high, med, low; every function from 0x401000 to the CRT |
| OpenOni | 1,609 | high, med, low |
| OpenI76 | 663 (+ `names-shell.tsv`) | high, med, low |

Rename in the TSV, then run the apply script. Never rename only in Ghidra, or the next dump will disagree with the port. OpenCMR2's [apply-names.sh](https://github.com/emdzej/opencmr2/blob/main/tools/ghidra/apply-names.sh) is the whole loop:

```sh
P=(--project cmr2 --program cmr2.exe)
ghidra script run tools/ghidra/FillGaps.java "${P[@]}"
ghidra script run tools/ghidra/ApplyNames.java "${P[@]}" -- "$NAMES"
ghidra script run tools/ghidra/DumpAllNamed.java "${P[@]}" -- "$PWD/re/all.c"
ghidra script run tools/ghidra/DumpMeta.java "${P[@]}" -- "$PWD/re/meta.tsv"
grep -o '^// ==== [^ ]* @ [0-9a-f]*' re/all.c | awk '{print $5, $3}' | sort > re/funcs.txt
```

Keep the record clean. OpenI76 had to drop duplicate rows ([`fd50748`](https://github.com/emdzej/openi76/commit/fd50748)), and OpenOni found a handler recorded as "flash" that was really "fill" ([`bf24eef`](https://github.com/emdzej/openoni/commit/bf24eef)). A wrong name spreads into code and docs until someone corrects the record.

## Dumps to grep

The decompiler output is never committed, but a full, current dump in `re/` makes it searchable without a live Ghidra session:

| File | Contents | Made by |
|---|---|---|
| `re/all.c` | Every function decompiled with current names, `// ==== Name @ addr` separators; 60 s timeout per function with a `FAILED` marker (OpenGTA) | `DumpAllNamed.java` |
| `re/meta.tsv` | Per function: address, name, size, callers, callees, imports, strings | `DumpMeta.java` |
| `re/funcs.txt`, `re/strings.txt`, `re/func_strings.txt` | Function list, strings, strings per function | apply script |
| `re/imports.tsv` | Import → callers | `ImportUsers.java` (OpenNFSPU) |
| `re/summary.txt` | One line per function: address, name, line count, strings, callees | `tools/fnsummary.py` (OpenSheep) |

The dumps are large: 353,670 lines for OpenNFSPU, 41.6k for OpenRF, about 57k for OpenSheep. OpenSheep's `tools/fn.sh <addr>` cuts one function out of `re/all.c` with awk, which gives cheap decompiler access to any tool ([fn.sh](https://github.com/emdzej/opensheep/blob/main/tools/fn.sh)).

## Inventory by address range

MSVC links object files in source order, so each source module occupies a contiguous address range. Map the ranges before porting anything:

1. Find anchor functions from strings and imports: error messages, file names, source paths such as `\real\pc\startup.c` or `d:\Nfs\Nfs5\frontend\fert\src\Window.cpp`.
2. Extend each anchor to its range. Range boundaries show up in vtables and in alignment: in OpenNFSPU, CRT objects start at odd addresses and EA's at 16-byte boundaries.
3. Write `docs/re/inventory.md`: range, module, purpose, function count and KB, plus the statically linked libraries to skip ([OpenCMR2](https://github.com/emdzej/opencmr2/blob/main/docs/re/inventory.md), [OpenOni](https://github.com/emdzej/openoni/blob/main/docs/re/inventory.md) with `tools/ghidra/inventory.py`).

The inventory is also how the work is split. OpenGTA divided its executable into six ranges, inventoried each separately (`docs/re/inventory-1..6.md`, [first range](https://github.com/emdzej/opengta/blob/main/docs/re/inventory-1.md)) and merged the results into `names.tsv`. OpenSheep's `notes/architecture.md` gives an address map from the level resources at 0x401000 to the CRT at 0x43b500. OpenI76 identifies 30 ranges.

Two documents follow the inventory: `architecture.md` (main loop, state machines, timing, file layer, device API usage, globals) and `port-plan.md` (ordered steps, each with a machine-checkable completion criterion). OpenRF wrote its recommended reimplementation order into [architecture.md](https://github.com/emdzej/openrf/blob/main/docs/architecture.md) §4 before porting began.

## Borrowing names from a symbol-bearing build

Look for another build of the same game that kept its symbols: a different platform, a later patch, a debug build. Oni has one. Feral's Intel Mac build 1.2.1 is an i386 Mach-O with about 6,200 of Bungie's own function names. OpenOni's [match_mac.py](https://github.com/emdzej/openoni/blob/main/tools/ghidra/match_mac.py) carries them to the Windows v1.0 executable in four steps over `DumpMeta` dumps of both programs:

1. **Strings.** A string referenced by exactly one function in each program votes for that pair (397 pairs). Source paths are reduced to their base names first.
2. **Call graph.** Around a matched pair, an unmatched callee or caller that is the only one left on both sides is matched too.
3. **Layout.** Between consecutive matches that are in order in both programs, a gap with the same number of unmatched functions on each side is matched in order, if sizes are within a factor of 4.
4. **Neighbourhood.** An unmatched function whose matched callers and callees map onto one candidate's (similarity at least 0.6, mutual best, clear margin) is matched.

Steps 2–4 repeat until nothing changes. `--validate=<share>` hides part of the string matches and measures each method's precision on them: neighbourhood ≥ 0.75 was right 96–97% of the time, callee 89%, neighbourhood < 0.75 86%, caller 79%, layout 72%. Only string and high-neighbourhood matches were accepted, giving 1,055 names covering 45% of the code bytes; about 600 more wait for review in `re/mac-matches.tsv`. A wrong 0.67 match, a list insert named `ONrCharacter_SetWeaponVarient`, justified the threshold.

::: warning A name map, not the authority
The other build is a different version, compiled by a different compiler, with its own changes. Names move only after a check. OpenOni's melee weighting lost four switches in the Mac decompile, so it was ported from the Windows disassembly, using the Mac build for structure only ([`d38d7a5`](https://github.com/emdzej/openoni/commit/d38d7a5)).
:::

## Where the decompiler lies

Treat decompiled C as a reading aid. For numeric code, anything involving the x87, and any function whose behaviour surprises you, read the disassembly. The projects collected these cases:

| Case | What happened | Source |
|---|---|---|
| Dropped arithmetic | Ghidra's `Car_Integrate` 0x435470 omitted the position and angle steps (`v dt - dv dt/2`) and a 0.2 scale on dv. Tilt, Suspension, SteerBody, WheelHeading and CornerImpulse were then also ported "from the disassembly". | OpenCMR2 [`ef54dfb`](https://github.com/emdzej/opencmr2/commit/ef54dfb), [`29bfb09`](https://github.com/emdzej/opencmr2/commit/29bfb09) |
| Dropped stores, merged products | "The type byte comes from a byte store the decompiler drops"; products merged in network code | OpenCMR2 [network.md](https://github.com/emdzej/opencmr2/blob/main/docs/re/network.md) |
| x87 stack semantics | `AI_Steer` stores the speed gap with a pop, then divides what is left (the target speed). The "logical" port used the gap, and opponents pulled away more slowly. | OpenNFSPU [`3680542`](https://github.com/emdzej/opennfspu/commit/3680542) |
| x87 compares with NaN | `fcom; fnstsw; test ah,1` treats unordered as "below"; C's `<` is false for NaN. Two gameplay bugs, a sheep running 237 px off the map among them. | OpenSheep [`38756d4`](https://github.com/emdzej/opensheep/commit/38756d4), [`6251cb9`](https://github.com/emdzej/opensheep/commit/6251cb9) |
| Register direction | Ghidra prints `fmul ST2` for both `d8 ca` and `dc ca`. `x87trace.py` follows the register stack from the bytes and prints SSA assignments. | OpenI76 [`a878938`](https://github.com/emdzej/openi76/commit/a878938), [x87trace.py](https://github.com/emdzej/openi76/blob/main/tools/ghidra/x87trace.py) |
| Calling convention | `FixMul` 0x438300 is `__fastcall` (ECX, EDX); Ghidra hides its arguments until the signature is set | OpenRF [AGENTS.md](https://github.com/emdzej/openrf/blob/main/AGENTS.md) |
| Merged stack slots | Two variables in one slot read as one; x87 and draw functions unreliable | OpenBallance [reverse-engineering.md](https://github.com/emdzej/openballance/blob/main/docs/howto/reverse-engineering.md) |
| No output at all | `Emergency_UpdateAll` 0x419880 cannot be decompiled; ported from disassembly | OpenGTA |
| Which variable is read | A two-sided quad's facing was tested from the feet; the dot product at 0x4ec39d uses the sweep sphere at ESP+0x7c, 10 units higher | OpenOni [`9e3bb32`](https://github.com/emdzej/openoni/commit/9e3bb32) |
| Constant width | 0x5b4a00 is a double (1/1500); read as a float it is -473.77. `0x3e22f981` is slightly under 1/2π while the literal `0.15915494f` compiles to `0x3e22f983`. | OpenNFSPU [`a7c5785`](https://github.com/emdzej/opennfspu/commit/a7c5785), [`c9523ba`](https://github.com/emdzej/opennfspu/commit/c9523ba) |
| Struct offset | A caps bit at dword +0x44 of `D3DDEVICEDESC7` was taken for `DRAWPRIMITIVES2EX`; it is `ZBUFFERLESSHSR`, so the z-buffer was never cleared | OpenCMR2 [`90b9f07`](https://github.com/emdzej/opencmr2/commit/90b9f07) |

Small disassemblers sit next to Ghidra for this: OpenSheep's capstone-based [dis.py](https://github.com/emdzej/opensheep/blob/main/tools/dis.py) (run it with `python -P` from the repository root, because a file named `dis.py` shadows the standard library module), OpenBallance's `objdump -d --x86-asm-syntax=intel`, and OpenI76's `dis.sh`. The strongest check is to run the original code itself; see [Determinism and verification](/guides/verification).

## Reading tables from the executable at run time

No table, string, geometry or float constant from the original goes into source. The user's executable is a data file: `src/exe.c` maps it after the size and CRC check, and the code reads values by virtual address. This keeps copyrighted bytes out of the repository, and the values are exactly the shipped ones.

- Mapping. A minimal PE reader (OpenGTA's is 105 lines) parses `e_lfanew`, the COFF header and the section headers, and maps the sections at their RVAs in a `SizeOfImage` buffer, with `.bss` reading as zero ([OpenRF exe.c](https://github.com/emdzej/openrf/blob/main/src/exe.c)).
- Accessors. `exe_u8/u16/u32/s16/s32/f32/f64`, `exe_str`, `exe_wtext` (UTF-16 to ASCII), `exe_ptr`, and `exe_mut` for the few tables the original changes in place ([OpenSheep exe.h](https://github.com/emdzej/opensheep/blob/main/src/exe.h)).
- Loaders. Modules register loaders (`EXE_LOADER(fn)` in OpenRF) that copy tables into C structures at start-up. OpenRF's `tools/gen_*.py` generate descriptor modules from the executable: addresses, counts, types and loader code, never contents. The executable is needed to regenerate them, never to build.
- Constants. OpenNFSPU reads float constants by address with `#define K(va) exe_f32(va)` in `ai.c`, `car_cars.c` and `font.c`, which removes the decimal-versus-bits class of bug entirely.
- Immediates. When values live in instructions rather than tables, read the instruction operands. OpenOni's start-up code at 0x51d1c0 stores layout pointers with one `mov dword [mem], imm32` per template, and the port reads those immediates. Footstep impact pairs are decoded "from 0x4f04f0's own instructions at run time" ([exe.c](https://github.com/emdzej/openoni/blob/main/src/exe.c)).
- Format strings and bytecode. OpenNFSPU parses scene files with the executable's own `fscanf` format strings, so CRT quirks carry over ([scene_crt.c](https://github.com/emdzej/opennfspu/blob/main/src/game/scene_crt.c)). OpenOni walks the instance-file layouts as the bytecode they are in the executable.
- DLLs too. OpenCMR2, OpenSheep and OpenOni read Bink's Huffman tables, scan orders and quantisers from the user's `binkw32.dll`, and validate them (OpenSheep checks that the scan table is a permutation).
- Strings in tests. OpenOni's `exe_test` checks start-up strings by length and CRC, so the text itself stays out of the source.

For research, small readers print values at an address: [opencmr2 tools/exe.py](https://github.com/emdzej/opencmr2/blob/main/tools/exe.py) `<va> [count] [u32|u16|u8|i32|f32|s]`, OpenRF's `rfexe.py`, OpenBallance's `peread.py`. Their output goes to the terminal, never into source.

## Writing findings down

Findings go into `docs/re/<topic>.md` (or `notes/`) in your own words: layouts, formulas, addresses, never decompiler output. Conventions that keep confidence visible:

- Mark each field **confirmed** or **inferred**, and give the address that would confirm it (OpenOni, OpenI76). OpenBallance uses `[V]` verified against disassembly, `[D]` decompile cross-checked, `[H]` hypothesis.
- End every page with **Open questions** (OpenRF).
- Record fields the game never reads as "never read", with the reader's address, rather than guessing their meaning (OpenRF RFM 0x04 and 0x41, STM 0xB4).
- Name the port file and its test on each page (OpenI76).

For a script-driven engine the first tool is different. OpenBallance's `tools/ck.py` reads the Virtools chunk format and dumps every behaviour graph to `re/graphs/*.txt`, and `bbindex.py`/`bbmap.py` map every Building Block GUID to its DLL and execute function. "Most questions are answered there, not in disassembly" ([reverse-engineering.md](https://github.com/emdzej/openballance/blob/main/docs/howto/reverse-engineering.md)).

## Checklist

1. Copy the executable into a git-ignored Ghidra program; import with `analyzeHeadless` if ghidra-cli's import gives broken listings; set JDK 21 for ghidra-cli.
2. Run auto-analysis explicitly and check the function count against `objdump`.
3. Run `FillGaps`, create functions from data tables (`entries.tsv`), and for C++ extract RTTI classes and vtables.
4. Start `tools/ghidra/names.tsv` with `addr name module confidence description`; name from strings, imports and error messages first.
5. Write `apply-names.sh` to apply names and regenerate `re/all.c`, `re/meta.tsv` and `re/funcs.txt`; git-ignore `re/`.
6. Inventory the executable by address range with anchors and KB per module; list the libraries to skip.
7. Write `architecture.md` and a `port-plan.md` whose steps each end with a check.
8. Look for a symbol-bearing build; if one exists, match by strings and neighbourhood, validate with holdouts, and accept only high-precision methods.
9. For every arithmetic-heavy or surprising function, read the disassembly; trace x87 sequences from the bytes.
10. Write `exe.c` with PE mapping and accessors by virtual address; read every table, string and constant from it.
11. Document each finding in your own words with addresses and confidence; end each page with open questions. Continue with [Porting function by function](/guides/porting).
