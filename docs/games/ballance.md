---
title: Ballance
game: ballance
---

# Ballance

<GameExhibit />

Ballance is a quiet, exacting game. You roll a ball through tracks suspended in the sky — rails, ramps,
seesaws, turnstiles — and at certain points a transformer changes it from wood to stone to paper, each
with its own weight and grip. Cyparade made it and Atari published it in 2004, on a multilingual CD whose
German installer also carries English, French, Spanish and Italian. Twelve levels, a tutorial, a
highscore table, and physics that feel exactly right or not at all.

It is worth preserving for an unusual reason. Almost none of Ballance is native game code. It was built
in Virtools Dev 2.1, an authoring tool in which the game's logic is drawn as behaviour graphs and saved
into `.cmo` and `.nmo` files, then run by a generic Virtools player and a stack of engine DLLs. The game
lives or dies with that runtime, and with the Ipion physics engine inside `physics_RT.dll`. When those
DLLs stop running, the game goes with them, even though its scripts are sitting intact on the disc.

OpenBallance is complete and released. The boot sequence, the intro, the whole menu, the tutorial and
all twelve levels play — modules, transformers, extra points, checkpoints, sectors, lives and score,
pause, game over and highscores — with sound, music and the original keyboard and mouse controls,
including rebinding. The project's own status page lists what remains: the physics has not yet been
compared numerically against recordings of the original, a debug text overlay is not drawn, 3D sprites
are unlit, and a few debug-only blocks report zeros.

## How it was rebuilt

The obvious approach would have been to read the behaviour graphs and translate them into C, one by one.
The initial analysis considered and rejected exactly that. Ballance has 4,469 behaviour nodes; hand
translation would have meant re-deriving Virtools' scheduling — link delays, priorities, parameters
pulled through operations — separately for every graph, with subtle ordering bugs that look like gameplay
bugs. Instead OpenBallance is a script runtime. A new CK2-compatible runtime loads the files from your
copy and executes the original graphs, so the game's logic is the game's own.

That turned the job into three bounded ports. The behaviour scheduler was ported from `CK2.dll`, with the
addresses cited, and written up as a specification of the frame loop, activation, link delays and
parameter propagation. The Building Blocks the graphs call — 184 distinct ones across 3,885 uses — were
ported one by one from their DLLs, one C file per original DLL, each declaration checked by script
against a map of GUIDs, DLLs and execute functions dumped from the binaries. And the physics is a
function-level port of the Ipion engine from `physics_RT.dll`, which ships with no symbols and no RTTI:
subsystem names were inferred from call graphs, constants and a handful of strings, including a German
error message in the OV-tree. The rule on physics was clean-room — port from the project's own
decompilation, and do not consult the leaked Ipion source.

The tooling came first. Python readers for the CK2 file format dump every graph, with its parameters and
links, to text, and most questions were answered there rather than in disassembly. Ghidra did the rest,
with scripts to coax it into finding functions it missed at import: re-analysis took `VxMath.dll` from
none to 726 functions and `CK2.dll` from 54 to 2,794. Where the decompiler misread x87 code or merged
stack slots, the disassembly won. Large subsystems were specified in writing before they were ported,
with confidence tags on each claim.

The new code is the platform underneath: a renderer that reproduces Direct3D 7/8 fixed-function
lighting, fog and specular in a single WGSL shader on gasm's graphics interface, a guest audio mixer, a
Microsoft Video 1 decoder for the intro movie, an ISO 9660 reader, and an InstallShield cabinet reader
with its own DEFLATE so the game can run straight off the CD. One file, `src/platform_gasm.c`, talks to
gasm; everything else sees a small platform contract. The source is about 27,100 lines of C — 9,600 of
them physics, 7,200 Building Blocks and 6,400 the CK2 runtime — alongside roughly 14,800 lines of
Markdown documentation, most of it specifications of Ipion. The public history begins with a single
squashed import of the working port on 1 October 2026; the fixes that follow, up to release 0.1.3,
are dated between then and 3 October.

## Notable stories

### Waiting for the runtime

When the port began, gasm had no textures, samplers, viewports or depth bias, and OpenBallance needed all
of them. Rather than work around the gap with a software rasteriser, the project wrote a formal
requirements document for gasm's graphics interface — addressed to the agent that would implement it —
and kept the rasteriser only as a contingency. Everything requested landed in gasm 0.4.0. The same
patience paid off again with input: a keymap file, launcher flags and a layout editor in the browser
player were all deleted once gasm 0.5.0 offered raw keys, which are mapped onto DirectInput scan codes
so the game's own key settings work as they did.
Evidence: [design/gasm-gfx-requirements.md](https://github.com/emdzej/openballance/blob/main/design/gasm-gfx-requirements.md),
[9bcd96d](https://github.com/emdzej/openballance/commit/9bcd96d).

### No checkpoint ever fired

After launch, no checkpoint fired, and later sectors — level 3's turnstiles among them — never
activated. The Building Blocks were fine. The fault was in the runtime: a local parameter saved with
identifier `0x200` is a "myself" parameter, whose value is the object that owns the behaviour. The
loader ignored the flag, so the checkpoint's arming proximity test had no second object and stopped on
its first frame.
Evidence: [139f665](https://github.com/emdzej/openballance/commit/139f665).

### The ball that vanished in the transformer

Rolling into a transformer exploded the old ball and placed no new one. Virtools forwards a changed
output parameter through chains of destinations, so a graph output that exports an inner one passes the
value on to its own destinations in turn. The port stopped after one hop, and the new ball type never
reached the variable that chooses which ball to create. Recursive propagation, with a depth limit,
brought it back.
Evidence: [3483df7](https://github.com/emdzej/openballance/commit/3483df7),
[src/ck/ck_param.c](https://github.com/emdzej/openballance/blob/main/src/ck/ck_param.c).

### Points falling thirty times too fast

Two more runtime details surfaced in one commit. Writing a parameter into a data array goes through a
copy that requires compatible types; without the check, a boolean landed in a float cell and the score
drained at 60 points a second rather than 2. And `Show` on a group shows its members, recursing into
children, which is why the HUD had been invisible. Every post-release bug shared this shape — generic
engine semantics, not game logic — and the lesson the project draws is to inspect the runtime around a
graph whenever a feature fails silently.
Evidence: [a60bef7](https://github.com/emdzej/openballance/commit/a60bef7).

### Deterministic, not bit-exact

Ipion simulates on the x87 with a 64-bit mantissa, at twice real time, in fixed steps of 1/66 of a
second, with gravity set by the game to -20. The port uses doubles for intermediates and rounds to single
precision exactly where the original stores a float; its own specification puts it plainly:
deterministic, not bit-exact, and nothing can be. One ordering in the original depended on the memory
address of each ball, which no port can reproduce, so a stable key replaces it.
Evidence: [docs/ivp_core.md](https://github.com/emdzej/openballance/blob/main/docs/ivp_core.md),
[docs/physics.md](https://github.com/emdzej/openballance/blob/main/docs/physics.md).

## Gallery

<Gallery />

## Standing on shoulders

The community-published [Virtools SDK 2.1 headers](https://github.com/doyaGu/Virtools-SDK-2.1) supplied vtable
order and method names, and the public Ipion sources supplied class and field names; the leaked Ipion source was
deliberately not consulted. The InstallShield cabinet layouts come from the documentation and sources of
[unshield](https://github.com/twogood/unshield) — no code taken. The behaviour of the qhull library linked into
`physics_RT.dll` was documented and replaced by a small hull builder.

Tools throughout: [Ghidra](https://ghidra-sre.org), [ghidra-cli](https://github.com/akiselev/ghidra-cli), [Capstone](https://www.capstone-engine.org) and [wasi-sdk](https://github.com/WebAssembly/wasi-sdk). Gaps in these credits are bugs — [tell us](https://github.com/emdzej/encore/issues).

## Getting a copy

OpenBallance ships no game data and converts nothing; it reads your own copy of Ballance as it runs. It
accepts a disc image (`Ballance.iso`, or the `.bin` of a bin/cue pair), the CD itself or a folder copied
from it, or an installed game folder containing `base.cmo`, `3D Entities/`, `BuildingBlocks/`, `Sounds/`
and `Textures/`. On the CD the game sits inside InstallShield cabinets (`Setup/data1.hdr`, `data1.cab`,
`data2.cab`); OpenBallance decompresses and checks each file as the game opens it, so nothing needs
installing or extracting. The language — English, German, French, Spanish or Italian — is a launch
parameter.

The project's [game data guide](https://openballance.emdzej.pl/guide/game-data) has the details, with
[installing](https://openballance.emdzej.pl/guide/install), [running on gasm](https://openballance.emdzej.pl/guide/running),
[playing in the browser](https://openballance.emdzej.pl/guide/browser) (WebGPU is required) and
[launch parameters](https://openballance.emdzej.pl/guide/parameters). Releases for macOS, Linux and
Windows, and the bare `.wasm`, are on the [releases page](https://github.com/emdzej/openballance/releases).

## Further reading

On the project site, the [status page](https://openballance.emdzej.pl/guide/status) sets out what works
and what does not, and the [internals](https://openballance.emdzej.pl/internals/) begin with the
[architecture](https://openballance.emdzej.pl/internals/architecture) and the
[initial analysis](https://openballance.emdzej.pl/internals/analysis) that chose a script runtime over
translation. The [Virtools runtime specification](https://openballance.emdzej.pl/ck-runtime) and the
[gameplay Building Blocks](https://openballance.emdzej.pl/gameplay_bbs) describe the engine; the physics
is covered from the [physics manager](https://openballance.emdzej.pl/physics) down through
[IVP core and dynamics](https://openballance.emdzej.pl/ivp_core),
[collision detection](https://openballance.emdzej.pl/ivp_collision) and
[contact response](https://openballance.emdzej.pl/ivp_contact). The
[reverse-engineering workflow](https://openballance.emdzej.pl/howto/reverse-engineering) and
[headless runs](https://openballance.emdzej.pl/howto/headless) show how the work was done.

Among the ENCORE guides, OpenBallance is the clearest case study in [choosing an approach](/guides/approach)
— when to run a game's scripts rather than port its code. The [reverse engineering workflow](/guides/reverse-engineering),
[file formats and game data](/guides/formats), [floating point and the compiler](/guides/fidelity),
[building for gasm](/guides/gasm), [graphics, audio, input](/guides/platform-layers),
[working with agents](/guides/agents) and [lessons learned](/guides/lessons) all draw on it.
