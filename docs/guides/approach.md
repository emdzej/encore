---
title: Choosing an approach
---

# Choosing an approach

Every ENCORE project rebuilds an old PC game so that the same WebAssembly module runs on gasm natively and in a browser, and plays like the original. Nine projects have taken three routes to get there: a function-by-function port of the original executable from its disassembly (seven projects), a reimplementation of the engine that runs the game's own scripts (one project, a Virtools game), and a port of released source code with only the platform beneath it replaced (one project). This page explains what each route involves, what it costs, what it buys, and how to tell which one a given game needs.

## Before anything: check the neighbours

Search for existing work on the game first — decompilation projects, reimplementations, modding communities,
format wikis. Record what you find in the project's `AGENTS.md` under "Prior work". If a project is active, get
in touch and offer help or findings instead of starting a competing port, and never fork someone else's
decompilation to "finish" it. Published community knowledge is a fine way to understand formats; credit it in
`docs/credits.md` from the first day. See [On AI](/about/ai).

## The three routes at a glance

| Route | What you write | What stays original | Projects |
|---|---|---|---|
| Function-by-function port from disassembly | C for every function of the game's executable, citing each original address | Behaviour, data formats, arithmetic, quirks; the game data the user supplies | [Return Fire](/games/rf), [GTA](/games/gta), [Interstate '76](/games/i76), [Colin McRae Rally 2.0](/games/cmr2), [Porsche Unleashed](/games/nfspu), [Sheep](/games/sheep), [Oni](/games/oni) |
| Script runtime plus engine port | A runtime compatible with the engine's file format and scheduler, the engine's building blocks, and its physics | The game logic, which stays in the user's own script/graph files and is executed as-is | [Ballance](/games/ballance) |
| Source port | Shims for every platform API the source calls (GL 1.x, sound middleware, sockets, files, database) | The game and engine source, compiled unchanged apart from a few marked edits | [Babo Violent 2](/games/bv) |

None of the projects is an emulator or a wrapper. OpenNFSPU's AGENTS.md says so directly ("It is not an emulator or a wrapper: every subsystem is ported function by function", [AGENTS.md](https://github.com/emdzej/opennfspu/blob/main/AGENTS.md)); OpenSheep's home page lists "no DirectX, no Wine and no virtual machine". Where an x86 emulator appears (Unicorn in OpenCMR2, OpenNFSPU and OpenI76) it is a test oracle that runs the original machine code next to the port; it never ships. See [Determinism and verification](/guides/verification).

## Function-by-function port from disassembly

The default route. The original `.exe` is imported into Ghidra, every function is named and understood, and the port re-expresses each one in C with the same structure, call order and arithmetic. Each ported function carries its original name and address (`/* Map_Load 0x438200 */` in [OpenGTA](https://github.com/emdzej/opengta/blob/main/AGENTS.md)), so any line of the port can be checked against the binary. The workflow is described in [Reverse engineering workflow](/guides/reverse-engineering) and [Porting function by function](/guides/porting).

### What it buys

- Exact behaviour, including the bugs players remember. Return Fire's lobbed tank shell that never lands and the drone pitch limit that never applies are kept on purpose ([OpenRF AGENTS.md](https://github.com/emdzej/openrf/blob/main/AGENTS.md)).
- A port that can be proven equal to the original. Because the port mirrors the original function by function, the original's own machine code can be run on the port's state and compared word by word. OpenCMR2's simulation became bit-exact over all 4,211 steps of the Fra01 demo this way ([`92859ab`](https://github.com/emdzej/opencmr2/commit/92859ab)); OpenNFSPU reached 0 differing car words over 248 sampled ticks ([`e47cee6`](https://github.com/emdzej/opennfspu/commit/e47cee6)); OpenI76 diffs renderer, terrain, physics and mission scripts byte for byte, including the x87 rounding mode ([`f1d04c8`](https://github.com/emdzej/openi76/commit/f1d04c8)).
- Determinism across runners, because everything that was integer stays integer and every random number comes from a port of the original CRT's generator.
- A clean legal posture: the user supplies the original executable, the port reads its tables at run time, and no copyrighted bytes enter the repository.

### What it costs

The work is proportional to the amount of original code, best measured in kilobytes of `.text` rather than in function counts. OpenCMR2's inventory says so explicitly: "KB of original code is the better effort estimate than the function count" ([inventory](https://github.com/emdzej/opencmr2/blob/main/docs/re/inventory.md)); OpenNFSPU found the same, because its front end has thousands of tiny accessors ([inventory](https://github.com/emdzej/opennfspu/blob/main/docs/re/inventory.md)).

Statically linked libraries are excluded from the count. OpenCMR2 has 3,583 functions in about 1,023 KB, of which about 3,250 functions and 950 KB remain after removing zlib, D3DX and the CRT. OpenI76 counts 574,903 bytes of executable code without the MSVC runtime, plus 351 KB in the front-end DLL.

It also requires the user's own copy of that binary at run time, since the port reads its tables from it.

Finally, it requires a single pinned binary. Every address in the port is valid for exactly one build, so the loader refuses any other build by size and CRC-32. See [Anatomy of a project](/guides/project-layout#pinning-the-executable).

### Variations within the route

- **Porting a driver DLL as well as the game.** OpenNFSPU ports `dx7z.dll`, EA's THRASH Direct3D 7 driver, as well as `Porsche.exe`, and puts a small D3D7-like device on GLES 3 underneath. The game's real rendering interface is the THRASH ABI, not Direct3D. gasm's DirectX 7 skill gives the general rule: "Port at the highest seam the game has, not at the DirectX API" ([porting-directx7 skill](https://github.com/emdzej/gasm/blob/main/site/dev/skills/porting-directx7/SKILL.md)).
- **Re-implementing middleware.** OpenGTA re-implements the Miles Sound System calls the game makes, then ports the game's sound modules on top ([audio](https://github.com/emdzej/opengta/blob/main/docs/audio.md)). OpenCMR2 emulates DirectSound buffers and DirectPlay 4. OpenNFSPU ports EA's SND 4.1g software mixer with its own arithmetic.
- **Embedded interpreters.** Many "native" games carry a script VM, which is ported as ordinary functions: GTA's MISSION.INI interpreter, Oni's BSL compiler, Interstate '76's mission FSM stack machine ([fsm.md](https://github.com/emdzej/openi76/blob/main/docs/re/fsm.md)), Porsche Unleashed's FERT expression evaluator.
- **Keeping blocking loops or unwinding them.** OpenRF, OpenGTA, OpenCMR2 and OpenNFSPU turn blocking loops into per-frame state machines. OpenOni keeps them and yields with `gasm_wait_frame`, which it judged "closer to the original and cheaper to port" ([architecture.md](https://github.com/emdzej/openoni/blob/main/docs/re/architecture.md)). See [Porting function by function](/guides/porting#blocking-loops).

## Script runtime plus engine port

Some games have almost no game-specific native code. Ballance is built on Virtools Dev 2.1: `Player.exe` is a generic player, and the game is a set of `.cmo`/`.nmo` files holding behaviour graphs that the engine's DLLs execute. OpenBallance therefore ports the engine, not the game:

- a CK2-compatible runtime that loads the user's files and runs the original graphs, with the scheduler ported from `CK2.dll` ([ck-runtime.md](https://github.com/emdzej/openballance/blob/main/docs/ck-runtime.md));
- the 184 distinct Building Blocks the game uses, ported one by one from their DLLs;
- the Ipion physics engine, ported function by function from `physics_RT.dll`.

The alternative, translating the 4,469 behaviour nodes into hand-written C, was considered and rejected as "Option B" ([analysis.md](https://github.com/emdzej/openballance/blob/main/design/analysis.md), section 2). It would have meant re-deriving Virtools' link delays, priorities and parameter-pull semantics for every graph. Porting the scheduler once bounds the work.

The bugs found after release confirm the trade-off. They were all in the generic runtime, not in individual blocks: "myself" parameters ([`139f665`](https://github.com/emdzej/openballance/commit/139f665): no checkpoint ever fired), recursive output propagation ([`3483df7`](https://github.com/emdzej/openballance/commit/3483df7)), typed copies into data arrays ([`a60bef7`](https://github.com/emdzej/openballance/commit/a60bef7)). Fixing one runtime rule fixed every graph that depended on it.

Choose this route when the executable is a generic engine host and the game's behaviour lives in data the engine interprets. The cost is front-loaded: the scheduler must be exact before anything works, and a tracer that lists every block executed per frame (`run_test` with `TRACE_FROM`) becomes the main debugging tool.

## Source port

When the source has been released under a licence that allows it, the game code is compiled as-is and only the platform is replaced. Babo Violent 2's C++ source is GPL-3.0 ([Daivuk/BaboViolent2](https://github.com/Daivuk/BaboViolent2)). OpenBV:

- imports it at a pinned upstream commit, normalised to UTF-8/LF, in a commit of its own ([`eb9a62d`](https://github.com/emdzej/openbv/commit/eb9a62d)), so that the next commit ([`a7a4ffc`](https://github.com/emdzej/openbv/commit/a7a4ffc)) shows every port change;
- leaves only 12 `OPENBV_GASM` markers in about 100k lines of vendored code;
- puts everything else in `src/port/`: an OpenGL 1.x implementation on GLES 3 with CPU T&L, an FMOD 3 shim on a software mixer, baboNet over WebSockets, file calls redirected with `--wrap` at link time ([fs_gasm.c](https://github.com/emdzej/openbv/blob/main/src/port/fs_gasm.c)), and a reader for SQLite's file format instead of SQLite ([sqlite_shim.cpp](https://github.com/emdzej/openbv/blob/main/src/port/sqlite_shim.cpp)).

The fidelity question changes from "does the port behave like the binary" to "does the platform layer behave like the platform the source was written for". Windows behaviour wins where the source has Windows and Linux branches. `FindFirstFile` is emulated in NTFS order so that map lists match Windows ([win_find.cpp](https://github.com/emdzej/openbv/blob/main/src/port/win_find.cpp)). Collapsing the old DLL boundaries into one module exposed classes with the same name and different constants, which had to be renamed apart.

A source port does not remove reverse-engineering work. OpenBV's Go multiplayer server was written from a 2,305-line specification of the C++ server, with `file:line` citations and struct layouts generated by compiling the original headers for wasm32 ([server.md](https://github.com/emdzej/openbv/blob/main/design/server.md)).

## Deciding

Work through these questions in order.

| Question | If yes |
|---|---|
| Is the source available under a licence that permits a port? | Source port. Pin the upstream commit, import it in its own commit, replace the platform in a separate directory. |
| Is the executable a generic engine host, with the game in data the engine interprets (graphs, behaviour blocks)? | Script runtime. Port the scheduler and the blocks the data uses; run the original data unchanged. |
| Otherwise | Function-by-function port of the executable. |

Within the function-by-function route, decide these up front:

- **Which binary.** Pick one build and pin it by size and CRC-32: the last patch (OpenNFSPU targets v3.5), a re-release (OpenGTA targets Rockstar's 2002 `Grand Theft Auto.exe`), or the original release when patches change formats (OpenI76 refuses later patches because they compress ZFS).
- **Which seam.** Port the highest layer the game itself owns: a driver DLL, a sound library, a file layer. Below that seam, write platform code.
- **Loops.** State machines (smaller, no Asyncify) or `gasm_wait_frame` (closer to the original, needs Asyncify or stack switching). gasm's own notes recommend state machines for new code because Asyncify costs size and speed.
- **What is out of scope.** List paths that are unreachable in the target version (Oni's developer console has no enabling cheat in v1.0, [`1a4be79`](https://github.com/emdzej/openoni/commit/1a4be79)), dead code (Porsche Unleashed's split screen), and services that no longer exist (EA's lobby, account servers).

### Reading the import table first

The import table is the cheapest survey of the platform surface, and it often settles the renderer question before any code is read:

| Project | What the imports showed | Consequence |
|---|---|---|
| OpenI76 | `I76.EXE` imports only `DDRAW!DirectDrawCreate` | v1.0 is a pure 8-bit software renderer; port it integer for integer and present RGBA |
| OpenOni | No OpenGL import; `LoadLibraryA("opengl32.dll")` at run time | The GL 1.1 calls are found through strings and call sites, not the import table |
| OpenCMR2 | Direct3D 7 through statically linked D3DX 7, zlib 1.1.3 | Exclude D3DX and zlib from the inventory; emulate D3D7 fixed function on `gasm:gl` |
| OpenNFSPU | Rendering only through THRASH entry points fetched from `dx7z.dll` | Port the driver DLL as well |
| OpenGTA | SciTech MGL, Miles MSS32, `SMACKW32.DLL` | Re-implement the Miles calls; write a Smacker decoder |
| OpenBallance | A generic Virtools player plus engine DLLs | Port the engine, run the data |

### Hybrid cases

The routes are not exclusive. OpenBallance's physics is a function-level port of `physics_RT.dll` inside a runtime port. OpenBV's client is a source port, and its server is a new implementation in another language, checked against functions extracted verbatim from the C++ into native test drivers. OpenOni ports the Windows binary but takes names from Feral's Mac build, which carries symbols. Choose per subsystem when the game mixes kinds of code.

### When a route turns out wrong

Signs that the chosen route needs revisiting:

- Most of the porting effort goes into restating data as code. That points to a runtime port, as OpenBallance concluded before it started.
- Platform shims grow game-specific special cases. The seam is too low; move it up to the game's own layer.
- Behaviour drifts that nobody can explain from the code. The port has likely simplified something the original depends on: operation order, a CRT routine, an uninitialised value. A function-by-function port with a differential harness finds these; reading alone often does not (OpenCMR2 [`92859ab`](https://github.com/emdzej/opencmr2/commit/92859ab)).

::: tip Copy from siblings
Every later project started by copying proven pieces from earlier ones: the VFS and ISO reader, `exe.c`, the gasm backend, the bundles, the browser player and CI. OpenCMR2, OpenOni and OpenI76 all say so in their AGENTS.md. Choose the closest sibling as a template: OpenCMR2 for a Direct3D 7 game on `gasm:gl`, OpenRF or OpenSheep for a 2D software renderer, OpenBallance for a `gasm:gfx` renderer.
:::

## The nine projects

Sizes are the original's function counts as recorded in each project's inventory. Durations are the span of commit dates where the history shows the whole port. OpenRF and OpenBallance start with a squashed import of an already working port, so their total time is not known.

| Game (year) | Approach | Original size | Agent time (commit span) | Status |
|---|---|---|---|---|
| [Return Fire](/games/rf) (1996) | Function by function | 897 functions (825 auto + 72 created), ~416 renamed | Squashed import, then 31 commits in 4 days | Whole game ported, 1P and 2P; releases 0.1.0–0.4.0 |
| [Grand Theft Auto](/games/gta) (1997) | Function by function | 1,797 names in `names.tsv`, every function from 0x401000 to the CRT | 2 days | Every single-player subsystem ported; missions not yet compared with the original; releases 0.1.0, 0.2.0 |
| [Interstate '76](/games/i76) (1997) | Function by function, Unicorn-diffed | 2,172 functions in `I76.EXE` + 990 in `I76SHELL.DLL` | 3 days so far | In progress: missions t01–t04 play to a win, the rest not yet played through; no release |
| [Colin McRae Rally 2.0](/games/cmr2) (2000) | Function by function, Unicorn-diffed | 3,583 functions, ~1,023 KB code (~3,250 / 950 KB to port) | 4 days | Whole offline game playable; release 0.1.4 |
| [Porsche Unleashed](/games/nfspu) (2000) | Function by function (game + THRASH driver DLL), Unicorn-diffed | 8,013 functions after creating missed ones (6,006 before) | 6 days | Single player end to end, multiplayer over relay; release 0.1.9, paused |
| [Sheep](/games/sheep) (2000) | Function by function | 1,024 functions | ~29 hours | Port complete; no full play-through or side-by-side yet; no tag |
| [Oni](/games/oni) (2001) | Function by function | 3,655 functions, ~1,065 KB code | 6 days | All 15 levels play through via scripted routes with the game's cheats on; no release |
| [Ballance](/games/ballance) (2004) | Script runtime + engine port | Engine DLLs: CK2 2,794, CK2_3D 3,907, VxMath 726, physics_RT 1,946 functions; 184 Building Blocks used | Squashed import | Complete; release 0.1.3 |
| [Babo Violent 2](/games/bv) (2.11) | Source port | ~99.5k lines of vendored C++ | 2 days (client + server milestones) | Client 0.1.0; Go server milestones 1–5 |

Agent time is the span from the first to the last commit. It does not include the human time spent choosing the game, steering the work, reviewing it and play-testing.

A few patterns stand out:

- **Speed follows sequencing.** OpenCMR2 ported the whole offline game in about three days of agent commits because "the plan sequenced work so every step had an automated check". OpenNFSPU reached a playable career in about three days and bit-exact physics plus multiplayer on days five and six. See [Working with agents](/guides/agents).
- **Speed can outrun verification.** OpenSheep's 29-hour port lists its gaps honestly: regression covers 23 of 35 levels, with no full play-through and no side-by-side with the original ([PLAN.md](https://github.com/emdzej/opensheep/blob/main/PLAN.md)).
- **Fidelity has levels.** Three projects prove bit-exactness against the original's machine code. The others verify through careful reading, reference decoders and cross-runner determinism. OpenBallance's physics is "deterministic, not bit-exact, and nothing can be" under x87. See [Floating point and the compiler](/guides/fidelity).

## Checklist

1. Check the licence situation. If source is available and redistributable, plan a source port and record the upstream commit.
2. Inspect the executable's imports and size. If it is a generic engine host with the game in data files, plan a runtime port; otherwise plan a function-by-function port.
3. Choose the exact target build. Record its size, CRC-32 and where it lives on the retail media.
4. Estimate effort in KB of `.text` per module, excluding statically linked libraries (CRT, zlib, D3DX).
5. Identify the highest seam the game owns (driver DLL, middleware, file layer) and decide what becomes platform code below it.
6. Decide state machines versus `gasm_wait_frame` for the main loop before porting the first loop.
7. Write down what is out of scope: unreachable features, dead code, defunct services.
8. Write the decision, its reasons and the pinned target into AGENTS.md, so later sessions do not reopen it.
9. Pick the closest sibling project as a template and copy its file layer, `exe.c`, gasm backend and CI rather than writing them again. Continue with [Anatomy of a project](/guides/project-layout).
