# Inventory and architecture templates

## docs/re/inventory.md

```markdown
# Inventory of <Game.exe>

<Game.exe>, <bytes> bytes, CRC-32 <crc>, image base 0x400000, `.text` <KB> KB.
Functions: <n> after auto-analysis, <m> after FillGaps/CreateFunctions.

Modules follow MSVC link order: each range is one source module. Boundaries come from anchor functions
(strings, imports, source paths), vtables and alignment (CRT objects at odd addresses in some builds).

| Range | Module | Purpose | Anchors | Functions | KB | Port |
|---|---|---|---|---|---|---|
| 0x401000-0x4xxxxx | <module> | <purpose> | <string or import> at 0x4xxxxx | <n> | <KB> | src/<module>.c |
| ... | | | | | | |
| 0x4xxxxx-0x4xxxxx | crt | MSVC runtime | `_rand` at 0x4xxxxx | <n> | <KB> | not ported (rand, qsort, ftol replicated in src/crt.c) |

## Statically linked libraries (not ported)
- zlib 1.1.3 0x...-0x... (own inflate instead)
- D3DX 7 0x...-0x...

## Conventions
- Calling conventions of hot helpers (`__fastcall` FixMul ...)
- Struct sizes seen in allocations

## Open questions
- ...
```

Estimate effort per module in KB of code; function counts mislead where there are many tiny accessors.

## docs/re/architecture.md

```markdown
# Architecture of <Game>

## Facts
| Item | Value |  (binary identity, compiler/CRT, APIs imported, threads, timing source)

## Start-up
entry 0x... -> WinMain 0x... -> ... (heaps, timers, devices, options, first state)

## Main loop and states
- loop shape (PeekMessage / render / Flip), per-frame order of input, simulation, render, present
- state machine variables and values (address, meaning per value)

## Timing
- clock source, tick length, steps per frame, caps, interpolation

## Data and files
- file layer, archives, where each format is read (link to the formats page)

## Rendering, audio, input, network
- API usage with call-site counts; the game's own seams (driver DLL, sound library)

## Globals
| Address | Name | Size | Meaning |

## Recommended port order
1. platform shell 2. file layer + exe tables 3. decoders 4. renderer 5. ... (each step ends with a check)

## Open questions
```

## docs/re/port-plan.md

```markdown
# Port plan

Each step ends with a check that can be run unattended.

## Step 0: file layer
Check: `vfs_test` reads every file from the folder and the image; summary hashes equal.
Done: ...

## Step 1: gasm skeleton
Check: module refuses to start without data ("game data not found", exit 1); with data presents frame 1.

## Step 2: ...
```

Update steps in place with "So far:" and "Done:" paragraphs as work lands.
