---
title: "Need for Speed: Porsche Unleashed"
game: nfspu
---

# Need for Speed: Porsche Unleashed

<GameExhibit />

EA Canada's Need for Speed: Porsche Unleashed — sold in Europe as *Need for Speed: Porsche 2000* — gave the series over to a single marque. Its Evolution career walks through the company's history car by car, from the early roadsters to the cars of 2000, with a garage of dealers, used cars, parts and paint; Factory Driver turns you into a test driver working through set tasks; and the races themselves run on a car simulation that took weight and grip more seriously than the arcade instalments around it. It is a game whose character lives in its physics, which makes it a demanding thing to preserve: a reimplementation that drives slightly differently is not really the same game.

OpenNFSPU is a function-by-function port of the last patched Windows executable, `Porsche.exe` version 3.5, into portable C11 running on the gasm runtime. It is not an emulator or a wrapper. The original's structure is kept — its C++ classes become C structs with explicit vtables in the same slot order — and only the threads, the blocking loops and the Win32 and DirectX calls are restructured.

Single player is playable end to end: the front end, Quick Race, knockouts, the Evolution career and Factory Driver, with AI opponents, traffic, police, the HUD, sound and replays. Multiplayer works peer to peer, over LAN and through a self-hosted Internet lobby. The project's own status page is candid about what is not done — a whole-race bit-exact confirmation, widescreen menus, and a public lobby among them — and work is paused after release 0.1.8, with 0.1.9 the latest tag.

## How it was rebuilt

The original is MSVC 6 C++ built on EA's in-house libraries: "real" for files, archives, streams, timers, input and networking; EAGL2 for software transform, clipping and lighting; FERT, a front-end runtime driven by INI layout files with an embedded C expression interpreter; and the EA SND 4.1g software mixer. Rendering goes only through THRASH, EA's 3D driver interface, loaded from a separate DLL — `dx7z.dll` for Direct3D 7. Movies are EA's own MAD video with EA-XA ADPCM audio; there is no Bink and no Miles.

Both binaries were taken apart in Ghidra. Auto-analysis found 6,006 functions in the executable; a gap-filling script for vtable methods and callbacks raised that to 8,013, and the Ghidra command-line import of `dx7z.dll` initially produced no functions at all until analysis was run explicitly. A names table of 2,716 entries, each marked with a confidence level, is the source of truth, and every ported function cites the address it came from. Because the linker kept object-file order, each original module sits in a contiguous address range, which gave the project a module map and an effort estimate before any porting began.

The rules the agents worked under are set out in the repository's [AGENTS.md](https://github.com/emdzej/opennfspu/blob/main/AGENTS.md). No data copied from the executable goes into the source: tables, and even individual float constants, are read at run time from your own `Porsche.exe` by virtual address through [src/exe.c](https://github.com/emdzej/opennfspu/blob/main/src/exe.c). Unported callees go through a logged pending mechanism rather than silent stubs. Structures keep their original layout and offsets, checked by static assertions on 32-bit builds, and float code keeps the original's order of operations.

Only three things in the original's design were deliberately changed, as the port plan records. Threads go: the 128 Hz multimedia timer becomes a counter advanced from the frame clock, input is sampled in the frame step, and file I/O is synchronous with callbacks fired where the original would have observed completion. Blocking loops become states stepped once per gasm frame. And C++ becomes C, with ops tables in the original's slot order.

The new code is the platform layer: a single file that talks to gasm, a virtual file system that reads a folder or an ISO 9660 image with Joliet names, a small Direct3D 7-style device on GLES 3 beneath the ported THRASH driver, and decoders for player pictures that replace the original's `gimme.dll`. The audio mixer, which once ran on a thread filling DirectSound ahead of the play cursor, is now pulled once per frame for the time that has elapsed.

Networking took the most new scaffolding. gasm offers only outbound WebSocket connections, so the project ported the original's whole network stack above WinSock — the UDP, IPX and TCP providers, the sliding-window packet layer, the session manager and the front-end screens — and emulated WinSock itself in [src/real/wsock.c](https://github.com/emdzej/opennfspu/blob/main/src/real/wsock.c), along with Windows threads and events. Rooms on gasm's relay stand in for a LAN segment. The network library's threads keep their shape through gasm's cooperative threads, which is why the module is built in gasm's looping, threaded mode ([e942f36](https://github.com/emdzej/opennfspu/commit/e942f36)). EA's own lobby is gone, so the game's server-side code — present in the original but never startable — now runs headless as a self-hosted lobby.

Checking all of this rests on determinism. Headless gasm runs produce frame and audio hashes that are the regression oracle, and they must agree between a folder and an ISO image, between the desktop runner, the browser and a Node host, and between the launcher and a direct run. A change that moves a hash has to say why in its commit message. Opt-in additions such as widescreen must leave the hashes untouched at the original's sizes, and a dedicated test, [tests/wide_default_test.c](https://github.com/emdzej/opennfspu/blob/main/tests/wide_default_test.c), holds them to it.

The source is about 97,000 lines in 170 C files, with 47 test files. The history runs to 570 commits over six days, from 30 October to 4 November 2026, all from one Claude Code session with parallel worktree agents. A playable career arrived in about three days; multiplayer and bit-exact physics came on days five and six.

## Notable stories

### The original's own code as the referee

The standout technique is a fidelity harness in [tools/emu/](https://github.com/emdzej/opennfspu/blob/main/tools/emu/README.md). It loads `Porsche.exe` into the unicorn x86 emulator, rebuilds the car — and the other racers, the road, the AI personalities and the collision objects — in the original's memory layout from a dump the port writes, calls the original function, and compares the resulting car structure word by word with the port's. Calls the emulator cannot run are answered from the port's own recorded results, so each function is tested in isolation. Sweeps then cover many ticks of the game's own recorded replay, and a free-run mode carries the original's outputs into its next call so it runs on its own values for hundreds of ticks.

### Single precision, and a wide exponent

Direct3D 7 switches the x87 FPU to 24-bit precision when the device is created, so every float operation in the game rounds to single precision. Before [e47cee6](https://github.com/emdzej/opennfspu/commit/e47cee6), thirty to forty words of the car's state were one or two units in the last place out on every tick. Keeping float steps, the original's operation order, sines rounded to float and angles in turns brought the drive step to no differing words over 248 sampled ticks, and [33977ab](https://github.com/emdzej/opennfspu/commit/33977ab) did the same for the ground forces over 465 steps. The subtler catch is that the x87 at single precision still keeps its wide exponent, so values decaying through denormals stay exact until they are stored. The steering filter reached negative zero where plain float reached positive zero ([781a0d1](https://github.com/emdzej/opennfspu/commit/781a0d1)), and a whole-race free run later found denormal torques on the grid ([364e0ea](https://github.com/emdzej/opennfspu/commit/364e0ea)). The answer was a helper, `Math_X87`, in [src/game/sim_math.h](https://github.com/emdzej/opennfspu/blob/main/src/game/sim_math.h), which rounds to 24 significant bits without the float exponent limit.

### What the x87 stack actually divides

The AI's throttle code stores the speed gap with a pop and then divides what is left on the stack — the target speed alone. A decompiler presents this as the gap, and the port at first followed that logical reading; opponents pulled away more slowly than they should. [3680542](https://github.com/emdzej/opennfspu/commit/3680542) restored what the original actually computes.

A similar trap lay in constants: a value at `0x5b4a00` is a double, 1/1500, and read as a float it became -473.77 — which only showed after front damage, when the car froze at tick 1008 of the replay ([a7c5785](https://github.com/emdzej/opennfspu/commit/a7c5785)).

### One missing constructor, every road smeared

MSVC's global constructors have no callers; they sit in a table the C runtime walks at start-up, and the original has 479 of them. One, `TEXTURE_initstates`, was missing early on, so the texture-stage cache sent address modes under the wrong id and every texture was clamped — roads and grass came out smeared. [b2d4d24](https://github.com/emdzej/opennfspu/commit/b2d4d24) runs the ported static initialisers in table order through [src/static_init.c](https://github.com/emdzej/opennfspu/blob/main/src/static_init.c).

### Porting the driver as well as the game

Rather than translating Direct3D calls, the project ported the THRASH driver itself: [src/render/thrash.c](https://github.com/emdzej/opennfspu/blob/main/src/render/thrash.c) carries `dx7z.dll`'s batching, software culling, state recording and fog tables, above a minimal device in [src/render/thrash_dev.c](https://github.com/emdzej/opennfspu/blob/main/src/render/thrash_dev.c) that draws with one shader emulating the fixed-function stages. The driver's quirks are kept, down to a 253-vertex batch buffer and a depth bias that accumulates on redrawn points, and the card profile is pinned to a GeForce 256-class card so card-dependent branches go the expected way. One cost had to be engineered away: movies lock the back buffer every frame, and reading pixels from the GPU each time dropped below 60 fps and starved the audio, until [74e6dfa](https://github.com/emdzej/opennfspu/commit/74e6dfa) let the driver answer locks from what it already knows.

### Heap addresses are not deterministic

The original keeps its particle queue in a set ordered by address. In the port those addresses depended on how the data source allocated memory, so a folder and an ISO image of the same game drew rain spray in different orders, and the frame hashes disagreed. [a130d52](https://github.com/emdzej/opennfspu/commit/a130d52) orders the queue by creation instead, which matches the original's rising heap addresses. It is a good argument for always running two data sources through the hash suite.

The same discipline applies to behaviour that looks like a bug but belongs to the original. Some glows never draw because of how a dot product is scaled; split screen exists in the code but the front end overwrites the communication mode before every race, so it never runs ([63c4f40](https://github.com/emdzej/opennfspu/commit/63c4f40)). These are kept and documented as kept, so that a later agent does not tidy them away. The one known deviation is written down just as plainly: the 3D rooms behind the front-end screens drew upside down, and the port adds a half turn because the place where the original compensates was never found.

## Gallery

<Gallery />

## Getting a copy

OpenNFSPU needs your own copy of the Windows game, installed and updated to version 3.5, EA's last patch. Check `Porsche.exe`: it must be 2,129,965 bytes with CRC-32 `fd2f5573`, and the launchers, the browser player and the game itself all check it and say so if not.

The port reads the installed folder — `GameData/`, `FEData/` and `Porsche.exe`, with `Drivers/dx7z.dll` and `SaveData/` used when present — or an ISO 9660 image with Joliet names made from that installed folder. The original setup disc will not do, nor a repack whose installer is an archive; from a retail CD, install and patch on Windows or under Wine first.

The project's [game data guide](https://opennfspu.emdzej.pl/guide/game-data) gives the details and the commands for making an image, and [Extract the game](https://opennfspu.emdzej.pl/howto/extract-game) covers getting the files out on macOS and Linux without running the installer. [Install](https://opennfspu.emdzej.pl/guide/install) covers the desktop bundles and the browser player, and [Multiplayer](https://opennfspu.emdzej.pl/guide/multiplayer) explains network play over gasm's relay.

Nothing from the game is in OpenNFSPU, on its website or in its bundles; the browser player reads your files in the browser and uploads nothing.

## Further reading

On the project site, the [status page](https://opennfspu.emdzej.pl/guide/status) and the [roadmap](https://opennfspu.emdzej.pl/guide/roadmap) say plainly what works and what does not, [Beyond the original](https://opennfspu.emdzej.pl/guide/beyond) describes the true 16:9 and 16:10 modes and the other additions, and [Porting](https://opennfspu.emdzej.pl/internals/porting) sets out how the code is written. The reverse-engineering notes and the file format reference are kept in the repository rather than on the site: see [docs/re/](https://github.com/emdzej/opennfspu/blob/main/docs/re/README.md), starting with the [architecture](https://github.com/emdzej/opennfspu/blob/main/docs/re/architecture.md) and the [THRASH notes](https://github.com/emdzej/opennfspu/blob/main/docs/re/thrash.md), and [docs/formats.md](https://github.com/emdzej/opennfspu/blob/main/docs/formats.md). The [fidelity harness's README](https://github.com/emdzej/opennfspu/blob/main/tools/emu/README.md) explains how to run the original's code against the port.

Among the ENCORE guides, this project bears most directly on [porting function by function](/guides/porting), [determinism and verification](/guides/verification), [floating point and the compiler](/guides/fidelity) and [graphics, audio, input](/guides/platform-layers). Its network stack is a case study for [networking](/guides/networking), its widescreen for [modern additions](/guides/enhancements), and its six-day history for [working with agents](/guides/agents) and [lessons learned](/guides/lessons). For the wider picture, see [choosing an approach](/guides/approach), [the reverse engineering workflow](/guides/reverse-engineering), [file formats and game data](/guides/formats), [building for gasm](/guides/gasm) and [shipping](/guides/shipping).
