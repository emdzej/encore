---
title: Guides
---

# Guides

<div class="enc-banner"><img src="/art/workbench.webp" alt="A restorer's workbench: a game CD under a magnifying lamp, hex dumps and format diagrams" /></div>

These guides describe how the ENCORE projects rebuild old PC games as faithful, from-scratch reimplementations that run on the [gasm](/gasm) WebAssembly runtime. They are distilled from nine projects — [Return Fire](/games/rf), [Grand Theft Auto](/games/gta), [Interstate '76](/games/i76), [Colin McRae Rally 2.0](/games/cmr2), [Need for Speed: Porsche Unleashed](/games/nfspu), [Sheep](/games/sheep), [Oni](/games/oni), [Ballance](/games/ballance) and [Babo Violent 2](/games/bv) — and every recommendation points at the commit, file or document it came from. They are written for developers starting a reimplementation of their own, and for the coding agents that do much of the work: almost every commit in these projects carries an agent session trailer.

## Who this is for

- Developers who own a game they care about and want it to keep running, on every platform, from the original disc.
- Agent operators who need rules, commands and checks precise enough that an unattended session produces faithful code rather than plausible code.
- Contributors to an existing ENCORE project who want to know why the conventions are what they are.

The guides assume you can read C and x86 disassembly, or are willing to learn on the job. They do not assume prior experience with gasm.

## The lifecycle of a reimplementation

Every project went through the same stages, in roughly this order. Each stage ends with something a machine can check.

1. **Pick the game and the approach.** Function-by-function port from disassembly (most projects), a script runtime for an engine game ([Ballance](/games/ballance) runs Virtools behaviour graphs), or a source port when the code is released ([Babo Violent 2](/games/bv)). See [Choosing an approach](/guides/approach).
2. **Pin the binary.** One executable, identified by size and CRC-32, refused with a clear message if it differs. Every address in the project is only valid for that build.
3. **Inventory.** Map the executable by address range, name functions in a TSV that is the single source of truth, estimate effort in kilobytes of code, write an ordered port plan with a check per step.
4. **Formats.** Decode every file the game reads and prove it: one summary hash over the whole disc, asserted by a test and confirmed by an independent reader.
5. **Port.** Function by function, in the original's call order, citing every address, reading tables from the user's executable at run time, keeping every quirk.
6. **Verify.** Deterministic headless runs with frame and audio hashes, identical across runners and data sources; differential execution of the original's machine code where precision matters.
7. **Platform.** Map DirectDraw, Direct3D, DirectSound, DirectInput and the rest onto gasm's small ABI, in one backend file.
8. **Ship.** A browser player that reads the user's own disc, native bundles for macOS, Linux and Windows, a documentation site.

## The guides

### Start here

| Guide | What it covers |
|---|---|
| [Choosing an approach](/guides/approach) | Port from disassembly, script runtime or source port; what each costs and when it fits |
| [Anatomy of a project](/guides/project-layout) | Repository layout, the portable core, the CMake platform switch, what is git-ignored |

### Reading the original

| Guide | What it covers |
|---|---|
| [Reverse engineering workflow](/guides/reverse-engineering) | Ghidra headless, names as data, full decompile dumps, inventory by address range, cross-build name transfer |
| [Porting function by function](/guides/porting) | Citing addresses, own-words rule, pending stubs, struct layouts, keeping quirks, reading the exe at run time |
| [File formats and game data](/guides/formats) | Reference decoders, summary hashes, disc images, installers and cabinets read in place |

### Getting it right

| Guide | What it covers |
|---|---|
| [Determinism and verification](/guides/verification) | Headless hashes, golden values, cross-runner parity, differential testing in Unicorn, replays as tests |
| [Floating point and the compiler](/guides/fidelity) | x87 precision and rounding modes, NaN compares, constants by their bits, FMA contraction, CRT `rand` and `qsort` |

### The platform

| Guide | What it covers |
|---|---|
| [Building for gasm](/guides/gasm) | SDK pin, toolchain, frame model, blocking loops versus state machines, stack size, Asyncify |
| [Graphics, audio, input](/guides/platform-layers) | DirectDraw and Direct3D on `video_present`, `gasm:gl` and `gasm:gfx`; DirectSound mixers; DirectInput scan codes |
| [Networking](/guides/networking) | DirectPlay, WinSock and custom protocols over WebSockets and gasm-relay; rewriting a server |
| [Modern additions](/guides/enhancements) | Widescreen, high resolution, skins and upscalers as opt-in layers that leave the default hashes unchanged |

### Shipping

| Guide | What it covers |
|---|---|
| [Browser player, releases, docs](/guides/shipping) | The play page, OPFS import, saves export, release workflow and bundles, the documentation site, wording |
| [Working with agents](/guides/agents) | What made AGENTS.md effective, commit discipline, unattended-run rules, and a full AGENTS.md template |
| [Lessons learned](/guides/lessons) | The cross-project lessons, grouped, each with its evidence |
| [Theory of operation](/guides/theory) | The document every port ends with: how the game was designed and how it works |

::: tip Agent skills
The same material is packaged as [agent skills](/skills/): procedural, command-level instructions an agent loads when it starts a project, ports a function, decodes a format or cuts a release. The guides explain why; the skills say what to do next.
:::
