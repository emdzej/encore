---
title: Grand Theft Auto
game: gta
---

# Grand Theft Auto

<GameExhibit />

Before the series went three-dimensional, Grand Theft Auto was a game seen from straight above: three
cities — Liberty City, San Andreas and Vice City — built from blocks and drawn by DMA Design's own
software rasteriser, with traffic, trains, police, a radio and a mission script for every level. It is
the root of one of the best-known lines in games, and its Windows build leans on things that have
aged badly: SciTech's MGL over DirectDraw, the Miles Sound System, a Smacker intro and an x87 floating
point unit set up just so. Keeping it playable means keeping all of that behaving the way it did.

OpenGTA is a reimplementation in C11 of the Windows executable from Rockstar's 2002 re-release, read in
Ghidra and ported to run on gasm, natively and in the browser. Its own status page describes it as early
but complete in scope: every part of the single-player game is reimplemented, from the intro movie
through the menus to the three cities with their traffic, police, trains and missions.

What it still needs is playing. Whole missions have not yet been played through and compared with the
original, so differences and bugs are expected. Networked games are left out on purpose — DirectPlay
behaves as it would on a machine with no service provider — and only the 32 bpp path of the renderer has
been ported, not the 8, 15 and 16 bpp ones.

## How it was rebuilt

The target is a single binary: `WINO/Grand Theft Auto.exe` from the 2002 re-release, 774,144 bytes,
CRC-32 `a5ca070e`, stripped. It was loaded into Ghidra and inventoried in six contiguous address ranges —
MSVC linked its objects in source order, so each module occupies one range — with a document per range
recording conventions, modules, structures and open questions. The names are kept as data in
[`tools/ghidra/names.tsv`](https://github.com/emdzej/opengta/blob/main/tools/ghidra/names.tsv), 1,797
rows with a module, a confidence level and a description, covering every function from `0x401000` up to
the C runtime. Each ported function cites its address in a comment, and the agent instructions forbid
pasting decompiler output: layouts, formulas and addresses are described in the project's own words.
Before a format was ported, a small Python reference decoder turned city maps and tile sheets into PNGs
to confirm the understanding against real data.

The port works bottom-up — map and style loaders, the renderer, sprites, text and fonts, the frontend,
sound, the game core, then cars, peds, missions, the HUD, traffic, objects, trains and police, and
finally the movie. New code sits only where the platform is: the core never touches a file or the host
directly, but goes through a virtual file layer and a small platform interface, and
[`src/platform_gasm.c`](https://github.com/emdzej/opengta/blob/main/src/platform_gasm.c) is the only file
allowed to include `gasm.h`. Blocking loops became per-frame state machines: the frontend runs one pass
of WinMain's 35 ms menu loop per call, and a level runs `Game_Run` one step at a time at 70 Hz.

The source tree holds about 56,700 lines in `src/`, of which some 37,100 are the game itself and 3,900
are the high-resolution additions, alongside around 7,700 lines of tests across 23 test programs and
roughly 7,600 lines of Markdown documentation. The whole history — 48 commits, tags `0.1.0` and `0.2.0`
— falls on 2 and 3 October 2026, every commit made from a Claude Code session.

## Notable stories

### The executable as a data file

The vehicle, ped, weapon and object tables, the junction and slope tables, the camera parameters, the
names of the mission script's types and opcodes, the character maps and the credits are not in the
repository at all. A minimal PE reader,
[`src/exe.c`](https://github.com/emdzej/opengta/blob/main/src/exe.c), checks the size and CRC of the
user's executable and reads those tables by virtual address at run time. Nothing copyrighted is
committed, the values are by construction the shipped ones, and the check doubles as version detection,
refusing retail or patched builds with a clear message.

### Playing straight from the installer

The re-release came as a zipped InstallShield setup. Rather than ask macOS and Linux users to run a
Windows installer, OpenGTA reads the cabinets in place with its own InstallShield 5 reader,
[`src/iscab.c`](https://github.com/emdzej/opengta/blob/main/src/iscab.c), written from unshield's format
documentation and present from the
[initial import](https://github.com/emdzej/opengta/commit/f2898c0056b1062a5970f1565fd6610464a951f6).
One file, `Music/Track8.wav`, is split across `data1.cab` and `data2.cab`; unshield 1.6.2 fails on it,
and because the game quietly keeps the previous track's length when a track is missing, an install made
that way differs without saying so. A test byte-compares every cabinet file with the installed game, and
the headless hashes must match whichever of the two data roots is used.

### One clock, taken from the sound card

The original starts a 70 Hz Miles timer and waits three ticks per frame, which gives 23.33 game frames a
second without catching up slow frames. The port
[paces everything off rendered audio](https://github.com/emdzej/opengta/commit/5ebdbb65e4f1a182685c2dd809e086b65f47a7e5):
one tick is 315 audio frames at 22,050 Hz, and `Timer_WaitTicks` reports whether the game may run rather
than blocking. That removed the game core's own copy of the timer and locked simulation and sound
together, so the same module, data and input give identical video and audio hashes on the native runner,
the Node runner and the browser. The sound itself runs over a port of the Miles 3.6B software mixer in
[`src/audio/mss.c`](https://github.com/emdzej/opengta/blob/main/src/audio/mss.c), down to its 8-bit
output.

### Double precision, rounded where the original stored

The car physics are x87 code. The C runtime sets 53-bit precision at start-up and nothing changes it, so
the original computes in double precision in registers and rounds to float only where it stores. The
[car port](https://github.com/emdzej/opengta/commit/d239d0833913fa96fb2c5bea985fc68f21eedddf) computes in
`double` in the original's operand order, converts at exactly those stores — including the ones that
leave a value unrounded in a register — and switches off fused multiply-add in the physics files. The
[Cars page](https://opengta.emdzej.pl/cars#precision) is candid about what remains: `fsin` and `fcos`
differ from libm in the last bit, so native and wasm builds are each deterministic but not necessarily
equal to one another.

### Reading past the edge, faithfully

DMA's rasteriser was ported integer for integer: 16.16 edge stepping with its particular rounding, an
8-bit carry trick reproduced, a reciprocal table whose out-of-bounds reads are counted rather than
followed. Its texture coordinates are 8-bit, so stepping past a tile's edge reads the neighbouring tile.
The rotated-tile cache in
[`src/render/poly.c`](https://github.com/emdzej/opengta/blob/main/src/render/poly.c) is ported down to
its least-recently-used order for the same reason: an overshooting step reads the next slot, and what is
in that slot depends on the cache's history. Nothing clears the back buffer either, so uncovered pixels
keep the previous frame, as they always did.

### High resolution without touching the game

The renderer feeds game state — draw trees, corner caches, HUD blink counters — so an enhanced renderer
cannot simply replace it. The
[hires pass](https://github.com/emdzej/opengta/commit/cd5d5d6ff88f881ad9bd6b6291d375615d8cc85f) keeps the
faithful renderer running and walks the same draw order a second time, each corner carrying a faithful
integer position for every visibility and ordering decision and an exact position for drawing. It is
proven by running each setting in its own process and comparing the game state hash, the faithful frame
checksums and the audio hash. Measurement then shaped the
[speed-up](https://github.com/emdzej/opengta/commit/bd228bbb19be6ef465abe4c6b940213c78f4a095): overdraw
was only 1.17 screens a frame, so culling was dropped, and restructuring the bilinear filtering made it
about 4.5 times faster, to 12 ms a frame at 4x in wasm.

## Gallery

<Gallery />

## Getting a copy

OpenGTA needs the Windows version from Rockstar's 2002 re-release, the one distributed as
`GTAINSTALLER.zip`. It checks the executable: `WINO/Grand Theft Auto.exe`, 774,144 bytes, CRC-32
`a5ca070e`. The 1997 DOS version, other Windows builds, the retail CD executable and the London 1969
and 1961 expansions are not supported; London is planned as variant switches on the same port.

Two forms of that release work, and OpenGTA works out which one it has been given. One is the installed
folder, with `GTADATA/`, `WINO/` and `Music/`. The other is the unzipped installer itself, with
`data1.cab` and `data2.cab` read in place on every run and nothing extracted. The browser player copies
only the files the game reads into its storage — about 320 MB, most of it music. Saves and high scores
live in gasm's storage rather than the game folder, seeded on first run from the game's own
`PLAYER_A.DAT`.

The project's [game data guide](https://opengta.emdzej.pl/guide/game-data) has the details, [Installing](https://opengta.emdzej.pl/guide/install)
covers the macOS, Linux and Windows bundles, and [Playing in the browser](https://opengta.emdzej.pl/guide/browser) explains the import.

## Further reading

On the project site: the [status page](https://opengta.emdzej.pl/guide/status), the
[internals overview](https://opengta.emdzej.pl/internals/) with topic notes such as the
[city renderer](https://opengta.emdzej.pl/render), [sound and music](https://opengta.emdzej.pl/audio),
the [Smacker intro movie](https://opengta.emdzej.pl/movie) and the
[hires renderer](https://opengta.emdzej.pl/hires), the [data formats](https://opengta.emdzej.pl/formats),
and the [reverse-engineering notes](https://opengta.emdzej.pl/re/) with their
[workflow](https://opengta.emdzej.pl/howto/reverse-engineering).

In the ENCORE guides: [choosing an approach](/guides/approach), [the reverse engineering workflow](/guides/reverse-engineering),
[porting function by function](/guides/porting), [file formats and game data](/guides/formats),
[determinism and verification](/guides/verification), [floating point and the compiler](/guides/fidelity),
[building for gasm](/guides/gasm), [graphics, audio, input](/guides/platform-layers),
[modern additions](/guides/enhancements), [shipping](/guides/shipping), [working with agents](/guides/agents)
and [lessons learned](/guides/lessons).
