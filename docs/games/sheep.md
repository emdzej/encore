---
title: Sheep
game: sheep
---

# Sheep

<GameExhibit />

Sheep is a herding puzzle from Mind's Eye Productions, published by Empire Interactive in 2000. You do not drive the
flock so much as lean on it: the sheep keep away from you, so every level is a matter of standing in the right place, at
the right moment, until they amble into the pen. Around that one idea the game builds six worlds — a polygon farm, a
castle with a catapult, a circuit board in space, a desert of rope bridges, a city at night — each with a bonus game,
plus a final level and four training levels on an army camp. It is gentle, odd and very much of its moment, and it ran
on a stack of DirectDraw, DirectSound, DirectInput and Bink that modern machines no longer offer in the shape it
expects.

OpenSheep is a from-scratch reimplementation of that game. It reads the original `Sheep.exe` from your CD for its tables
and constants, but none of the original code runs: every function was ported by hand from the disassembly into portable
C, with the original address cited above each one. The result runs on macOS, Linux and Windows through the gasm runtime,
and in the browser.

The port is, in its own words, complete: the front end, all 35 levels, the flock, four shepherds, four breeds,
power-ups, results, high scores, saves, credits, attract demos, movies, sound, music and the developers' own debug keys.
What remains is verification — a full play-through, a side-by-side comparison with the original, and the twelve levels
not yet covered by the regression run — and a first tagged release, which has not happened yet.

## How it was rebuilt

The target is one exact build: `Sheep.exe` from the CD root, 380,928 bytes, CRC-32 `b7bcd581`, linked in January 2001
for a multi-language release. OpenSheep checks size and checksum at start-up and refuses anything else with a message
naming both, because the whole port depends on reading that file's tables at known addresses
([`src/exe.h`](https://github.com/emdzej/opensheep/blob/main/src/exe.h)).

The original is MSVC C++ for Win32: a 640x480 16-bit DirectDraw surface, a DirectSound mixer working in hundredths of a
decibel, DirectInput for keyboard, mouse and joystick, and Bink 1 movies through `binkw32.dll`. Ghidra, driven headless
from the command line, decompiled it into a single greppable dump; a 292-line names file grew as functions were
understood, and a summary tool mapped all 1,024 functions by size, strings and callees. A small capstone disassembler
sat alongside for the cases where the decompiler's C is not to be trusted. The file formats — the `.xp` archives, RNC
ProPack compression, run-length sprites, the level files — were decoded first in Python and then given readers in C.

The four hard rules in the project's [`AGENTS.md`](https://github.com/emdzej/opensheep/blob/main/AGENTS.md) shape
everything else: no original data or derivatives in git; no tables copied out of the executable (they are read at run
time through accessors such as `exe_u32` and `exe_str`, and even the registry value names come from the exe's own
strings); the original address on every ported function and global; and no pasted decompiler output. The rule above the
rules is that fidelity is the product. Quirks and bugs are kept and commented; only deviations of the port are fixed.

The new code is small and kept in its place. The core is about 23,500 lines of C11 that compiles natively as well as to
WebAssembly, so no platform dependency can creep in; one file, `src/platform_gasm.c`, is the only one allowed to include
`gasm.h`. It presents the rgb565 framebuffer, feeds the software mixer's output to the host, maps raw keys to
DirectInput codes, and turns the registry and side files into storage keys. A Bink 1 decoder of its own, structured
after FFmpeg's, plays the movies. The browser player is about a thousand lines of plain JavaScript modules on top.

The whole thing came together in 76 commits between the afternoon of 1 November 2026 and the evening of the next day —
roughly 29 hours of wall-clock time, in one long agent session.

## Notable stories

### Zero bytes of game data

Most reimplementations keep a few tables they lifted from the original. OpenSheep keeps none.
[`src/exe.c`](https://github.com/emdzej/opensheep/blob/main/src/exe.c) loads your `Sheep.exe`, maps its PE sections to
their virtual addresses, and registered loaders fill C structs from it: level descriptors, menu pages, fonts, palettes,
constants, even the breed and shepherd names through the exe's own pointer tables
([`c28a96e`](https://github.com/emdzej/opensheep/commit/c28a96e)). The movie decoder does the same with `binkw32.dll`,
reading its scan order, Huffman trees and quantisation matrices from the user's copy and checking them as it goes
([`src/bink.c`](https://github.com/emdzej/opensheep/blob/main/src/bink.c)). The price is a hard version pin; the reward
is a repository with nothing in it that belongs to anyone else.

### When the decompiler's less-than is not x87's

The original compares floats with `fcom`, `fnstsw` and a test of the flags, and that sequence treats an unordered result
— a NaN — as "below". C's `<` says false. Two real gameplay bugs came from that gap. In one, a sheep's speed came out as
0/0; the original turns that into a target of zero, the port kept the NaN, and the speed ran away to −11.4 until the
sheep stood 237 pixels off the map ([`38756d4`](https://github.com/emdzej/opensheep/commit/38756d4)). In the other, an
`acos` of a dot product a hair past 1 produced a NaN that the original snaps to a path's first point; the port's
comparison failed and sent the sheep to x = 0 ([`6251cb9`](https://github.com/emdzej/opensheep/commit/6251cb9)). The
lesson written into the workflow: read the flag test in the disassembly, not the decompiler's operator.

### The sheep that vanished only in the browser

After a hurdle, sheep went missing — counted as lost — but only in the browser build. On a jump's landing tick the
original reads its sine table at a negative index. On Windows that read lands in the tail of a draw list that happens to
sit just before it and comes back as roughly zero; in WebAssembly the neighbour is an integer sine table, the float is a
NaN, and the sheep's height goes with it. Running the native build under AddressSanitizer and UndefinedBehaviorSanitizer
found it, along with a read one before the start of an animation array. Both are now guarded, with a comment saying what
the original actually read ([`874afab`](https://github.com/emdzej/opensheep/commit/874afab)).

### Every random number in its place

The game draws from a 1,024-entry table filled from MSVC's `rand` seeded with zero. Forget to fill it and every draw is
zero, which put every randomly placed object on one spot
([`b79cd8a`](https://github.com/emdzej/opensheep/commit/b79cd8a)). Fill it but miss a consumer and the whole stream
shifts: generating the default high-score table takes 60 calls to `rand` at start-up, and porting it moved every level's
hashes, which were re-baselined in a commit that says why
([`c4d7012`](https://github.com/emdzej/opensheep/commit/c4d7012)). A saved high-score file skips that generation, so
regression runs are made with empty storage. The run itself is 23 levels of 1,500 frames each, hashed and diffed against
[`tests/hashes.txt`](https://github.com/emdzej/opensheep/blob/main/tests/hashes.txt), and the browser player has a mode
that must produce the same hashes as the native runner.

### A quirk worth keeping, and its one exception

In the original, a duplicated sound buffer starts with a base volume of zero rather than one, so every duplicate plays
at −70 dB and only the first instance of an overlapping sound is heard. OpenSheep's mixer keeps that, as the original.
The exception is music: a loaded music sound must still get its duplicate voice, and until that was found the walkman
power-up never started its radio ([`c1feb7c`](https://github.com/emdzej/opensheep/commit/c1feb7c)).

### Code the game only reaches by address

Each level's descriptor holds the executable addresses of its hooks — init, tick, draw, shepherd states, move routines,
gates — so a missing port stays invisible until that path runs. The port maps each address to a C function and logs "not
ported" once per unknown address ([`4bce89a`](https://github.com/emdzej/opensheep/commit/4bce89a)), which turns long
headless runs into a coverage report. Sometimes a level's own table names one of the standard routines, so those are now
found by address as well ([`6eefabf`](https://github.com/emdzej/opensheep/commit/6eefabf)); see
[`src/levels.c`](https://github.com/emdzej/opensheep/blob/main/src/levels.c).

## Gallery

<Gallery />

## Getting a copy

You need your own **Sheep CD for Windows**. OpenSheep reads it in place: the original `Sheep.exe` (which must be the
supported build — 380,928 bytes, CRC-32 `b7bcd581` — or the game will say what it found and stop), `binkw32.dll` for the
decoder's tables, the `.xp` archives and the `Data/` folder with the movies and music. All told that is about 490 MB;
the installer and DirectX on the disc are not used. Other releases of the game will not pass the check.

You can hand it over as the disc itself, a folder copy, an `.iso`, or a raw MODE1/2352 `.bin` — for a `.cue` and `.bin`
pair, pass the `.bin`. In the [browser player](https://opensheep.emdzej.pl/play/) you pick the folder or the image, and
it can copy the files into the browser's private storage so later visits start at once.

The project's guide covers [installing](https://opensheep.emdzej.pl/guide/install), [the game
data](https://opensheep.emdzej.pl/guide/game-data), [playing](https://opensheep.emdzej.pl/guide/playing) and [the
controls](https://opensheep.emdzej.pl/guide/controls). No release has been tagged yet, so desktop bundles will appear on
the [releases page](https://github.com/emdzej/opensheep/releases) when the first one is cut; until then the [build
guide](https://opensheep.emdzej.pl/guide/build) explains how to make your own.

## Further reading

The project site is deliberately for players: its [guide](https://opensheep.emdzej.pl/guide/), the [developer
options](https://opensheep.emdzej.pl/guide/developer) and the [gallery](https://opensheep.emdzej.pl/gallery). The
internals were moved off the site into the repository ([`e9b3ff1`](https://github.com/emdzej/opensheep/commit/e9b3ff1)):
[`notes/architecture.md`](https://github.com/emdzej/opensheep/blob/main/notes/architecture.md) has the address map, main
loop and state machine, and [`notes/formats.md`](https://github.com/emdzej/opensheep/blob/main/notes/formats.md) every
file the game reads and the source file that reads it. What is still open lives in
[`PLAN.md`](https://github.com/emdzej/opensheep/blob/main/PLAN.md).

In the ENCORE guides, Sheep is a good companion to [choosing an approach](/guides/approach), the [reverse engineering
workflow](/guides/reverse-engineering) and [porting function by function](/guides/porting); its x87 and memory-layout
stories belong with [floating point and the compiler](/guides/fidelity) and [determinism and
verification](/guides/verification). The platform side is covered in [building for gasm](/guides/gasm) and [graphics,
audio, input](/guides/platform-layers), and the speed of the port — and how it outran its own verification — in [working
with agents](/guides/agents) and [lessons learned](/guides/lessons).
