---
title: Oni
game: oni
---

# Oni

<GameExhibit />

Oni is Bungie West's third-person action game of 2001: Konoko, an agent of the Technological Crimes Task Force, works through
warehouses, airports, power plants and laboratories with her fists, her feet and whatever weapon she can pick up. It mixes hand-to-hand
combat and gunplay, and it was built on Bungie's own engine — a software geometry pipeline
feeding OpenGL 1.1, a scripting language called BSL, a windowing toolkit for its menus and a layered AI. That engine never had a source
release, and the Windows game it shipped in is now a quarter of a century old.

OpenOni is a function-by-function port of the Windows v1.0 `Oni.exe` to C11, running on [gasm](https://gasm.emdzej.pl) natively on
macOS, Linux and Windows and in the browser from a single `.wasm`. Every ported function cites the original's name and address, quirks
and bugs included. It is not an emulator or a wrapper, and it borrows no code from the long-running Oni community projects, whose
knowledge may inform the reading of formats but never replaces the exe as the authority.

The port is under way. Every level plays through to the end of the game, driven by scripted routes, from the training and the warehouse
to the outro movie after level 19. Those routes play with the game's own cheats switched on — invincible and mostly omnipotent —
because their fighting is blind; without the cheats only level 1's route survives its level. Much of the presentation is still missing,
and some pieces remain marked stand-ins in the source (parts of the camera, some fight manoeuvres, some knockdowns), to be replaced as
the originals are ported.

## How it was rebuilt

The target is a single, exact binary: the Windows v1.0 `Oni.exe`, 1,527,808 bytes, CRC-32 `a8223704`. The original is around 1.5 MB of
MSVC-compiled C, and after [Ghidra scripts](https://github.com/emdzej/openoni/blob/main/tools/ghidra/FillGaps.java) recovered functions
that auto-analysis missed (vtable methods, callbacks, functions reached only through tables), it comes to 3,655 functions and roughly
1,065 KB of code. The [inventory](https://github.com/emdzej/openoni/blob/main/docs/re/inventory.md) breaks that down by Bungie's own
module prefixes: the game layer `ON` is the largest at 201 KB, followed by the `AI2` artificial intelligence at 169 KB and the `P3`
particle system at 75 KB.

The work followed an [ordered port plan](https://github.com/emdzej/openoni/blob/main/docs/re/port-plan.md) in which each step ends with
something that can be checked against the original: the extractor, the gasm skeleton, the instance files, the asset decoders, the
renderer, the front end, the character, the scripts, combat, AI, then audio and movies. Before anything was drawn, a Python reference
reader and the C decoders had to produce equal hash lines over every asset on the CD — 8,918 textures, 37,862 geometries, 8,604
animations, 7,386 sounds and 155,232 instances among them.

The platform layer replaces what Oni took from Windows. OpenGL 1.1's fixed function becomes one GLES 3 shader in
[`src/render/gl_dev.c`](https://github.com/emdzej/openoni/blob/main/src/render/gl_dev.c); DirectInput becomes raw scan codes delivered
in DirectInput's own numbering; the DirectSound mixer thread becomes one mixer pushed each frame, with DirectSound's volume and pan
curves kept; and `QueryPerformanceCounter` becomes a frame clock, so headless runs are deterministic. All file access goes through one
[virtual file system](https://github.com/emdzej/openoni/blob/main/src/vfs.h). Rather than unwinding Oni's blocking loops into per-frame
states, the port keeps them: every loop ends its frame in a wait that gasm satisfies with stack switching or Asyncify, which also lets
the nested modal dialogs of Bungie's windowing toolkit work as they did.

The result is about 51,800 lines of C in `src/`, some 5,200 lines across 44 tests, 2,600 lines of Python tooling and 7,700 lines of
documentation. The repository's 90 commits span six days of agent time, 2 to 7 November 2026 (human direction and review not counted), and all but
one of them record the agent session that wrote them.

## Notable stories

### Bungie's names, borrowed from a Mac

The Windows exe has no symbols, but Feral's 2015 Intel Mac build does — around 6,244 of Bungie's own function names. A different
compiler and a later version mean the two cannot be compared byte for byte, so
[`match_mac.py`](https://github.com/emdzej/openoni/blob/main/tools/ghidra/match_mac.py) pairs functions by strings each references
uniquely, then by call graph, by layout between known matches, and by the similarity of their neighbours. Each method was validated by
hiding part of the string matches and measuring how often it recovered them; only the two most precise were accepted, giving [1,055
names covering 45% of the code](https://github.com/emdzej/openoni/commit/df666fd). A wrong match at 0.67 similarity — a list insert
named after a weapon setter — justified the threshold. The Mac build stays a name map and never the authority: when its decompile lost
four switches in the melee weighting, that function was [ported from the Windows
disassembly](https://github.com/emdzej/openoni/commit/d38d7a5) with only the Mac build's structure as a guide.

### Playing straight from the installer

Oni's Windows CD holds no game files in the open; the whole game is packed inside a MindVision Installer VISE archive. Its compression
turned out to be plain raw deflate stored in byte-swapped 16-bit words, documented in the [VISE format
page](https://openoni.emdzej.pl/formats/vise). The port plan treated reading the ISO directly as a later nicety, but inflating each
file on open proved cheap, so [`vfs_vise.c`](https://github.com/emdzej/openoni/commit/e834115) now layers the archive over a mounted
ISO or folder and the game plays from the disc image with no installer, no Windows and no Wine. The hashes from the image equal those
of an installed folder.

### The executable as a data file

A hard rule of the project is that no tables, strings or geometry from the exe appear in the source.
[`src/exe.c`](https://github.com/emdzej/openoni/blob/main/src/exe.c) maps the player's own `Oni.exe` and `binkw32.dll`, checks size and
CRC, and reads what it needs at run time: the template table, key names, the default key configuration, the cheat table. Some values
are not stored as data at all — the layout pointers are written by startup code, one `mov` instruction per template, so the port reads
those instructions' immediates. Footstep impact pairs are [decoded from another function's own
instructions](https://github.com/emdzej/openoni/commit/f71539a) the same way, and the [Bink movie
decoder](https://github.com/emdzej/openoni/commit/7a73d3c) reads its Huffman tables, scan order and quantisers from the DLL, keeping
its unclamped IDCT byte wrap and the outro's last frame that is never shown.

### When a list's order is the logic

For a long time projectiles never moved. The port's particle classes always put a new particle at the head of the activation list; the
original puts decorative classes at the tail, and the gameplay update stops at the first decorative one it meets. [Porting the
insertion order exactly](https://github.com/emdzej/openoni/commit/e038686) made shots fly. The commit log is full of such details:
level 3's stairs could not be climbed until the two-sided quad test used the [sweep sphere's start rather than the
feet](https://github.com/emdzej/openoni/commit/9e3bb32), and a conversation on level 8 stuck on its first line until the port kept
[`AI2rPath_GoToPoint`'s minimum radius of 3](https://github.com/emdzej/openoni/commit/572f7b2).

### Whole levels as regression tests

Oni draws every random number from two generators, so the same input gives the same run. The port builds on that with a route language
in `app.c` — waits, runs, jumps, fights, consoles and paths [planned at run time](https://github.com/emdzej/openoni/commit/df92ed2)
through the level's room graph — that drives Konoko through each level headless. Each "Level N plays through" commit is a checkpoint,
and every change is rechecked against all of them. The cheats that keep the routes alive are [the game's own
switches](https://github.com/emdzej/openoni/commit/28d22c0), so the tests add no code path the original lacks. The price of determinism
is fragility: newly ported code that draws random numbers [shifts everything after
it](https://github.com/emdzej/openoni/commit/a1dd567), and routes have to be retuned rather than the generator touched.

### Keeping the original's mistakes

Fidelity extends to bugs. On level 6, a trigger past one hangar door calls `console_deactivate` without an id and so disables every
console; the script is [kept as it is](https://github.com/emdzej/openoni/commit/86e9144) and the route takes the other way. Equally,
what the original cannot reach is left out: v1.0's developer console is present in the exe, but its enabling cheat has no table entry,
so it [stays unported](https://github.com/emdzej/openoni/commit/1a4be79). And when the environment looked darker than remembered, the
port [traced every step of the colour path](https://github.com/emdzej/openoni/commit/2c0ef9d) through the exe and found it matched — an
impression, not a measurement.

## Gallery

<Gallery />

The project has not published screenshots yet. Its site's look comes from
colours sampled from the game's menu textures, with the emblem and circuit traces redrawn.

## Standing on shoulders

The [OniGalore wiki](https://wiki.oni2.net) and the community's OniSplit and Daodan work are the background the
project may consult; the exe is the authority and no code is copied. Feral's 2015 Intel Mac build of Oni, which
carries about 6,244 of Bungie's own function names, supplied 1,055 matched names to the Windows port. The Bink
audio transform follows Ooura's FFT package, and ADPCM output was compared with FFmpeg and Apple's `afconvert`.
The site uses the Chakra Petch and Inter typefaces.

Tools throughout: [Ghidra](https://ghidra-sre.org) (with Version Tracking), [ghidra-cli](https://github.com/akiselev/ghidra-cli) and [wasi-sdk](https://github.com/WebAssembly/wasi-sdk). Gaps in these credits are bugs — [tell us](https://github.com/emdzej/encore/issues).

## Getting a copy

OpenOni needs the original **Windows US CD** of Oni, either as an ISO image or as a folder of its files, or an Oni folder already
installed by the original installer. It targets the v1.0 `Oni.exe` exactly (1,527,808 bytes, CRC-32 `a8223704`) and also reads
`binkw32.dll`; Mac and other builds are refused with a message saying so.

You do not need to run the installer. Give the [browser player](https://openoni.emdzej.pl/play/) the CD image or folder and the game
reads its files from the installer archive itself. If you prefer an installed folder — levels load a few seconds faster — the
standalone [visextract](https://github.com/emdzej/visextract) tool or the project's own `openoni-extract` writes one from the CD,
checking every file against the archive's CRC-32. The project's guide to [getting the game
files](https://openoni.emdzej.pl/guide/game-data) covers both, and the [status page](https://openoni.emdzej.pl/guide/status) says what
to expect level by level.

There are no release downloads yet; native bundles for macOS, Linux and Windows are the plan's final step.

## Further reading

The project site opens with [the guide](https://openoni.emdzej.pl/guide/), and its [theory of
operation](https://openoni.emdzej.pl/guide/theory) explains how Oni works, from the fixed 60-tick frame to data as templates, the AI's
layers and the mission scripts. The formats section documents each file type, among them [instance
files](https://openoni.emdzej.pl/formats/dat), [textures](https://openoni.emdzej.pl/formats/txmp),
[sounds](https://openoni.emdzej.pl/formats/sndd) and [Bink video](https://openoni.emdzej.pl/formats/bink). The reverse-engineering
notes, with their addresses, stay in the repository rather than on the site: start with the
[architecture](https://github.com/emdzej/openoni/blob/main/docs/re/architecture.md), then
[visibility](https://github.com/emdzej/openoni/blob/main/docs/re/visibility.md),
[physics](https://github.com/emdzej/openoni/blob/main/docs/re/physics.md) and the
[AI](https://github.com/emdzej/openoni/blob/main/docs/re/ai.md). The working rules the agents followed are in
[AGENTS.md](https://github.com/emdzej/openoni/blob/main/AGENTS.md).

Across ENCORE, the most relevant guides are [porting function by function](/guides/porting), the [reverse engineering
workflow](/guides/reverse-engineering), [file formats and game data](/guides/formats), [determinism and
verification](/guides/verification), [floating point and the compiler](/guides/fidelity), [building for gasm](/guides/gasm), [graphics,
audio, input](/guides/platform-layers), [working with agents](/guides/agents) and [lessons learned](/guides/lessons).