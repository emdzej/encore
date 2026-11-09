---
title: Colin McRae Rally 2.0
game: cmr2
---

# Colin McRae Rally 2.0

<GameExhibit />

Colin McRae Rally 2.0 is Codemasters' rally game for the PC: eight rallies of point-to-point stages on gravel, snow and tarmac, a co-driver reading
pace notes, a service area between stages, arcade circuits and split-screen for up to four. Under the bonnet it is a careful piece of late-nineties
engineering — a car simulation in 16.16 fixed point stepping at a fixed 25 Hz, AI drivers steered by small neural networks, and a renderer written
against Direct3D 7's fixed-function pipeline. That last part is what makes it fragile today. It leans on DirectDraw mode enumeration, DirectPlay for
network play and an ACM codec for its music, all of which have been quietly disappearing from modern systems.

OpenCMR2 is a function-by-function port of the game's program, `CMR2.exe` version 1.11, to C11 on the [gasm](/gasm) runtime. It runs natively on
macOS, Linux and Windows, and in the browser. The whole offline game is playable: rallies and championships, arcade, time trial and challenge,
split-screen and hot-seat for two to four players, the service area, replays, ghosts, the movies and saves. The network game, rebuilt on a relay in
place of DirectPlay, runs a full rally between two instances but has not yet been raced end to end. The latest release is 0.1.4.

The port keeps the original's behaviour rather than tidying it. Its project rules put it in four words — "fidelity is the product" — and its known
issues include things the original does too: the disc's attract-mode demo runs drift off their recorded path, and the menus do not scale with
resolution.

## How it was rebuilt

The starting point was a Ghidra analysis of `CMR2.exe` — 3,583 functions and about 1,023 KB of code, of which roughly 3,250 functions and 950 KB
remained to port once the statically linked zlib, D3DX and C runtime were set aside. Names live in a single tab-separated file of 1,969 entries, each
with a confidence level, and an inventory maps the program by address range with anchor functions identified from strings and imports. The port plan
was written as ordered steps, each ending in a concrete, machine-checkable test. Every ported function carries a `/* Name 0x4xxxxx */` comment
pointing back at the original address, and nothing is copied from the executable into the source: tables, strings and transition tables are read from
the user's own `CMR2.exe` at run time, after a size and checksum check.

The game turned out to be structurally kind to a port. Its `WinMain` already calls one game frame per idle loop iteration, which maps straight onto
gasm's frame callback, and its modes run on a tiny process framework of state slots and byte-triple transition tables that was ported as-is. The most
consequential decision was the game state image: the original's whole data section is allocated as one block at start-up, its initialised part copied
from the executable, and ported code reads globals by their original addresses. That keeps run-time-filled tables behaving exactly as they did, and —
as it turned out — made the differential harness described below possible.

New code is confined to what Windows used to supply. A Direct3D 7 layer records device state with D3D7's own defaults and structure layouts, and a
GLES 3 / WebGL 2 back end implements the two-stage texture combiner, vertex fog, alpha test and the full fixed-function transform and lighting in a
vertex shader. A DirectSound emulation feeds one 44.1 kHz stereo mixer; a subset of DirectPlay 4 runs over gasm-relay rooms; a virtual file system
reads host folders, ISO 9660 images and the InstallShield 6 cabinet, with its own inflate. The Bink 1 movie decoder was written from published format
descriptions, and — the same trick as with the executable — reads its codec tables from the user's own `binkw32.dll`. Some things were deliberately
left out and documented as such: 16-bit surface formats and their banding, mip chains, force feedback and compatibility with the original save format.

The result is about 65,200 lines of C in `src/`, plus tests, Python reference tools, a 900-line emulator harness and the browser player. The history
runs to 327 commits over four days of agent time (31 October to 3 November 2026, not counting human review and testing); the whole offline game was
ported in about three of them.

## Notable stories

### Running the original against the port

The standout tool is a differential harness built on the Unicorn CPU emulator. It maps `CMR2.exe`'s code and constants at their original addresses and
places the port's game state image over the original data section. Before each simulation step it copies the port's state into the emulator, runs the
original machine code for the same pass, and compares the car blocks afterwards; any access outside the mapped regions stops with the address. With
it, the car simulation became bit-exact over all 4,211 steps of the Fra01 demo, and it found faults no review would have: rounding from a 64-bit
rather than 24-bit x87 model, spin damping and wheel forces that apply only with a corner on the ground, dents that move a vertex normal by three
times the vertex's own move, and a damage counter decrementing every step
([92859ab](https://github.com/emdzej/opencmr2/commit/92859abd42ced109da999d5a400c35c5395e8c93),
[tools/emu/sim_diff.c](https://github.com/emdzej/opencmr2/blob/main/tools/emu/sim_diff.c)).

The harness had bugs of its own, which looked exactly like port bugs. A divergence at step 3,200 was the harness's clock gating a roll sound's random
draw differently ([753a5a0](https://github.com/emdzej/opencmr2/commit/753a5a024f5e6e2cb851c004db2dbc175d93951d)), and a Kenya run stopped at step 212
because the original's particle code read tables private to the port; it was stubbed down to its three random draws
([a897a0c](https://github.com/emdzej/opencmr2/commit/a897a0cdc2ec175ad0be7a58e52f129a53a8411d)).

### When the decompiler drops the arithmetic

Ghidra's output for `Car_Integrate` silently left out the position and angle steps and a 0.2 scale on the velocity change. The function was ported
again from the disassembly ([ef54dfb](https://github.com/emdzej/opencmr2/commit/ef54dfbf875aa29c77142e788149795d0c3f2370)), and the same treatment
followed for the tilt, suspension, steering body, wheel heading and corner impulse passes. The rule that came out of it is simple: for numeric hot
code, read the disassembly, not the decompiler.

### Knowing when the bug is the original's

The demo runs on the disc leave the road at around step 230. Letting the original's own code drive freely from the same start takes the same path, so
the recordings most likely came from a different build of the game. Rather than "fixing" this, the port keeps the behaviour and lists it as a known
issue ([92859ab](https://github.com/emdzej/opencmr2/commit/92859abd42ced109da999d5a400c35c5395e8c93)). The same discipline applies to uninitialised
data: when a car corner leaves the collision mesh, the original keeps the last ground normal written in place, and modelling that rather than zeroing
it is what made off-road runs agree ([5eb382d](https://github.com/emdzej/opencmr2/commit/5eb382d9a691985f1c1cd4c61c11071d07cf5fb2)).

### A random number generator shared with the text

The port reproduces Microsoft's C runtime exactly — its `rand()` generator and even its `qsort`, because the order of equal keys in the game's sorts
is visible. The reason became clear when the HUD clock was ported with the host's `rand`: the game's font printer draws three random values for every
string it prints, so the shared sequence advances with the text on screen, and the clock's jitter depends on it
([2cb6f32](https://github.com/emdzej/opencmr2/commit/2cb6f321bc18b1d12e763439a5d86b8caab69015),
[src/crt.c](https://github.com/emdzej/opencmr2/blob/main/src/crt.c)).

### From 13,400 GL calls a frame to 900

Setting the whole device state for every draw, as the original does through Direct3D, was fine natively but made the browser skip frames: about sixty
GL calls per draw and 13,400 per frame. A shadow of the GL state that sends only what changed brought it to about 900 per frame and doubled native
speed ([0a0a3fc](https://github.com/emdzej/opencmr2/commit/0a0a3fc9275bb183b3dfa7d3366ec7fb2451365c)). Partial vertex buffer uploads
([eff6984](https://github.com/emdzej/opencmr2/commit/eff6984b5f7ff4536f2419de80f539918f9b15e0)), in-place texture updates for mud and movies
([654615d](https://github.com/emdzej/opencmr2/commit/654615d08761f79b75cbf430a41515ca009f50b2)) and indices kept on the device
([4cd5427](https://github.com/emdzej/opencmr2/commit/4cd54275dab8e004085ca27dea1d1b2ef42cee5b)) followed, and the stutter fix shipped as 0.1.1.

### Widescreen by telling a white lie

The 16:9 and 16:10 modes work by reporting to the game the 4:3 screen of the mode's height — 960 by 720 for a 1280 by 720 mode — so all of its layout
and projection logic sees an ordinary 4:3 display. The GL back end centres that screen, and during race drawing only, widens the 3D view to the full
width while keeping the vertical field of view, snapping 2D elements that touch the edges. Menus, movies and the HUD stay pillarboxed
([ddafd7a](https://github.com/emdzej/opencmr2/commit/ddafd7a7b85d04ca30da2712b81b9780060ffa8d)).

## Gallery

<Gallery />

## Standing on shoulders

Every Bink movie is checked bit-exact against [FFmpeg](https://ffmpeg.org)'s decoder, while the codec tables
come from the `binkw32.dll` on your own disc. Community modding notes for the game were allowed as hints, with the
exe as the authority. The statically linked zlib 1.1.3 in `CMR2.exe` was replaced by the project's own inflate,
checked against Python's zlib.

Tools throughout: [Ghidra](https://ghidra-sre.org), [ghidra-cli](https://github.com/akiselev/ghidra-cli), the [Unicorn](https://www.unicorn-engine.org) emulator and [wasi-sdk](https://github.com/WebAssembly/wasi-sdk). Gaps in these credits are bugs — [tell us](https://github.com/emdzej/encore/issues).

## Getting a copy

OpenCMR2 needs your own copy of Colin McRae Rally 2.0 for PC on CD-ROM; nothing from the game is bundled or downloaded. It reads the disc's folders
(`FrontEnd`, `Game`, `SetupRep`, `Sounds`, `CountrySpecific`, about 650 MB) either as a folder or as a disc image — an `.iso`, or a raw `.bin` in the
browser player — and an installed copy of the game also works.

The port is pinned to one program: `CMR2.exe` version 1.11, 1,228,800 bytes, identified by size and checksum. On the CD it sits inside the
InstallShield cabinet (`data1.hdr`, `data1.cab`, `data2.cab`), and OpenCMR2 reads it from there in place, so no installation or extraction step is
needed. The release it was built against is the European CD, with five languages; the US release, the Polish one and later budget releases have not
been checked yet, and other versions of the program will need their own checks.

The project's [game data guide](https://opencmr2.emdzej.pl/guide/game-data) lists what is read and where it lives, [Extract the
CD](https://opencmr2.emdzej.pl/howto/extract-cd) covers making a folder copy, and [Playing](https://opencmr2.emdzej.pl/guide/playing) explains the
desktop bundles and the [browser player](https://opencmr2.emdzej.pl/play/), which can import the data into browser storage or play straight from the
picked files. Network play is set up as described in [Network play](https://opencmr2.emdzej.pl/guide/network).

## Further reading

The project site's [theory of operation](https://opencmr2.emdzej.pl/guide/theory) explains how Colin McRae Rally 2.0 works. The site also covers [what works today](https://opencmr2.emdzej.pl/guide/status), [the gasm runtime](https://opencmr2.emdzej.pl/guide/gasm) and
[building from source](https://opencmr2.emdzej.pl/howto/build). The reverse-engineering notes, format descriptions and porting rules are kept in the
repository rather than on the site: the [architecture](https://github.com/emdzej/opencmr2/blob/main/docs/re/architecture.md),
[inventory](https://github.com/emdzej/opencmr2/blob/main/docs/re/inventory.md) and [port
plan](https://github.com/emdzej/opencmr2/blob/main/docs/re/port-plan.md), the [renderer
notes](https://github.com/emdzej/opencmr2/blob/main/docs/re/render.md), the [AI drivers](https://github.com/emdzej/opencmr2/blob/main/docs/re/ai.md)
and [network game](https://github.com/emdzej/opencmr2/blob/main/docs/re/network.md), the [file
formats](https://github.com/emdzej/opencmr2/blob/main/docs/formats/index.md), and the [porting
rules](https://github.com/emdzej/opencmr2/blob/main/docs/internals/porting.md).

Across the collection, OpenCMR2 is a good companion to several ENCORE guides: [porting function by function](/guides/porting) and the [reverse
engineering workflow](/guides/reverse-engineering) for the method, [determinism and verification](/guides/verification) and [floating point and the
compiler](/guides/fidelity) for the differential harness and the x87 rounding, [graphics, audio, input](/guides/platform-layers) for the Direct3D 7
emulation, [networking](/guides/networking) for DirectPlay on a relay, [modern additions](/guides/enhancements) for widescreen, and [working with
agents](/guides/agents) and [lessons learned](/guides/lessons) for how four days of commits came together.
