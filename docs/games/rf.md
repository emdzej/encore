---
title: Return Fire
game: rf
---

# Return Fire

<GameExhibit />

Return Fire is capture the flag with armour. Each side has a bunker, a lift, four vehicles and a flag hidden
among decoys somewhere on an island; you choose a tank, a helicopter, a jeep or an armoured support vehicle,
ride it up to the surface and go looking for the enemy's flag while their turrets, drones and soldiers do their
best to stop you. Only the jeep can carry the flag home. It began on the 3DO in 1995 and came to Windows 95 in
1996, with the same top-down island war, a split-screen two-player mode and a soundtrack of classical music
that a small music director moves between as the game goes on.

The Windows edition is worth keeping for a particular reason: its renderer is a software emulation of the 3DO
cel engine, writing 3DO-style cel lists into a locked DirectDraw surface. That is an unusual piece of history
in its own right, and it depends on DirectDraw 8-bit modes, Video for Windows Cinepak decoding and a music
system streamed through AVIFile into DirectSound — exactly the sort of plumbing that modern systems no longer
provide.

OpenRF is a function-by-function reimplementation of `RFIRE.BIN`, the real game program on the CD, with the
same 16.16 fixed-point maths and the original's quirks kept. The whole game is ported for one and two players:
intro and movies, title, the music director, bunker selection and the lift, all four vehicles, weapons and
damage, turrets, the drone, the submarine, soldiers, gates, the flag, random mines, win and loss sequences,
high scores and the two-player split screen with spectating. A few things are not ported yet — the Win32
menus and dialogs (replaced by title-screen keys and launch parameters), pause in two-player, the two-player
bunker status screen, drone radar blips and record/replay among them.

## How it was rebuilt

The starting point was a Ghidra project of `RFIRE.BIN` (431,616 bytes, CRC-32 `64c49a1b`), driven headlessly
through a command-line client, with a script that dumps the whole program as named decompiled C into a
git-ignored folder so code, documentation and Ghidra all share the same names. Ghidra counts 897
non-external functions, of which around 416 were renamed. By the project's own estimate roughly 60% of them
are real game logic and 40% runtime library, Win32, DirectX and Video for Windows glue.

Before any porting, the architecture notes laid out a recommended order — platform shell, asset loaders,
cel rasteriser, world view, object system, vehicles, weapons, enemies, HUD, sound and music, front end, then
two players and replay — and each file format was given its own document and a Python decoder before any C
was written. Every ported function cites the original's name and address in a comment. Nothing is copied
out of the executable into the source: the game's tables are read at run time by mapping the PE sections of
the user's own `RFIRE.BIN`, which is why exactly one build is supported.

The portable core is about 17,100 lines of C11, with about 2,150 lines of tests and some 2,950 lines of Python
tools. New code covers what the original got from Windows: a file layer that reads folders or ISO 9660 disc
images directly, its own Cinepak decoder written from the public bitstream description, a single audio mixer,
and one platform backend for [gasm](https://gasm.emdzej.pl), which runs the same WebAssembly module on macOS,
Linux, Windows and in the browser. The repository starts with a squashed initial import (161 files, a complete
native macOS build) followed by 31 commits over four days that added the disc reader, the portable core, the
gasm backend, the browser player and the bundles, and finally made gasm the only target.

## Notable stories

### Drawing is part of the simulation

Return Fire's draw pass does more than draw. Turrets are activated from the rendering of their model, soldiers
are removed after 120 ticks of not being drawn, wreck timers count from the last tick a wreck was drawn, and
the idle drone checks whether enemy turrets were in view last frame. A headless simulation that skipped
rendering would quietly play a different game, so OpenRF's tests always render the view. The finding is
recorded in the "Traps" section of the project's
[agent instructions](https://github.com/emdzej/openrf/blob/main/AGENTS.md), alongside the other hard-won facts
that must not be reintroduced.

### A bit-exact renderer, checked twice

The world view renderer (`RenderWorldView`) was first ported to Python at the integer and bit level, as
[tools/view.py](https://github.com/emdzej/openrf/blob/main/tools/view.py), and only then to C. A comparison
tool, [tools/render_cmp.py](https://github.com/emdzej/openrf/blob/main/tools/render_cmp.py), runs both over
fixed scenes and seeded random ones and diffs the 8-bit index buffers; the requirement is zero mismatches.
The exact projection tables, matrices and sort rules are written up in the
[rendering notes](https://openrf.emdzej.pl/render).

### Colours ten places off

Sprite pixels in `ART.CAR` do not index the game's own palette but the DirectDraw palette, where the game's
colours start ten slots up because slots 0–9 and 246–255 belong to Windows. This was spotted visually —
water and sand only looked right with the shifted palette — and then confirmed in the disassembly. Status
bar images need the same offset when they are drawn. The details are in the
[ART.CAR notes](https://openrf.emdzej.pl/car).

### Blocking loops become frame steps

The original runs nested blocking loops for the intro, title, game and end sequence. gasm calls the game once
per frame, so every one of those loops became a state with a step function, where one step is one iteration
of the old loop. Because presents and clock reads happen in the same order as before, output stayed
byte-identical to the blocking version
([1247f21](https://github.com/emdzej/openrf/commit/1247f21)). With a virtual clock of one 16 ms tick per
frame at 62.5 Hz, headless runs produce fixed video and audio hashes that must match on the native runner,
the Node runner and the browser.

### When the runtime moves under you

Two updates of the browser host broke the play page without breaking the build. One version made the worker
import a WebGPU module that had not been vendored, so the page never started
([4f57aec](https://github.com/emdzej/openrf/commit/4f57aec)); a later one changed how frames and input are
passed, and the raw keyboard silently stopped reaching the game until the call was updated
([9492abc](https://github.com/emdzej/openrf/commit/9492abc)). The same commit retired the native SDL app,
leaving gasm as the only way the game ships. The lesson the project draws is plain: read the runtime's
changelog on every pin bump, and run the browser test again.

### Asking the runtime for what the game needs

Early gasm loaded whole assets into memory, which for a 285 MB CD meant a heavy, slow start. Rather than work
around it, OpenRF wrote a requirements document for the runtime's own maintainers —
[design/gasm-host-requirements.md](https://github.com/emdzej/openrf/blob/main/design/gasm-host-requirements.md)
— asking for file-backed assets, a folder-as-assets mode with case-insensitive lookup, a Worker mode with an
OPFS provider and a second keyboard layout, each with acceptance criteria. Those features landed in gasm
0.3.0, and the browser player now reads an imported CD lazily from the browser's own storage.

## Gallery

<Gallery />

## Getting a copy

You need the **Windows 95 edition** of Return Fire on CD. OpenRF reads the folders `ART`, `SOUND`, `TITLE` and
`WORLDS` and the file `RFIRE.BIN` from the root of the disc; the other folders are not used. `RFIRE.BIN` is
checked against the one supported build: 431,616 bytes, CRC-32 `64c49a1b`. The project was developed against
the European release (English, French, German, Spanish and Italian). The 3DO version uses different file
formats and is not supported.

The CD can be given as a folder (the disc itself, a mounted image or a copy) or as a disc image read
directly: a plain `.iso`, or a raw `.bin` with 2352-byte sectors in MODE1 or MODE2. The bundles and the
browser player refuse a `.cue`; choose the `.bin` next to it instead. The project's
[game data guide](https://openrf.emdzej.pl/guide/game-data) covers this in full, with
[installation](https://openrf.emdzej.pl/guide/install), [running on gasm](https://openrf.emdzej.pl/guide/gasm),
[extracting a CD image](https://openrf.emdzej.pl/howto/extract-cd) and
[troubleshooting](https://openrf.emdzej.pl/guide/troubleshooting) alongside it.

## Further reading

The OpenRF site has the [user guide](https://openrf.emdzej.pl/guide/), the
[controls](https://openrf.emdzej.pl/guide/controls) and [vehicles](https://openrf.emdzej.pl/guide/vehicles),
and the internals: the [architecture](https://openrf.emdzej.pl/architecture),
[rendering](https://openrf.emdzej.pl/render) and [game simulation](https://openrf.emdzej.pl/game) notes, the
[portable core](https://openrf.emdzej.pl/internals/portable-core), and the file formats —
[ART.CAR](https://openrf.emdzej.pl/car), [RFM maps](https://openrf.emdzej.pl/rfm) and
[STM movies](https://openrf.emdzej.pl/stm). Its [reverse engineering how-to](https://openrf.emdzej.pl/howto/reverse-engineering)
describes the Ghidra workflow.

Among the ENCORE guides, OpenRF illustrates [porting function by function](/guides/porting), the
[reverse engineering workflow](/guides/reverse-engineering), [file formats and game data](/guides/formats),
[determinism and verification](/guides/verification), [building for gasm](/guides/gasm) and
[graphics, audio, input](/guides/platform-layers). [Shipping](/guides/shipping) covers the browser player and
release bundles, and [working with agents](/guides/agents) and [lessons learned](/guides/lessons) pick up the
"Traps" habit and the cross-repository requirements document.
