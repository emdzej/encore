---
title: Manifesto
---

# One more time, please

Have you tried running a game from 1997 lately? I have. Sometimes it works. More often it asks for a DirectX
version nobody ships any more, a 16-bit installer Windows refuses to start, or a CD drive your laptop never had.
Then it crashes on a CPU that is "too fast". Emulation helps, and I have nothing against it — but it is one more
layer between you and the game, and it only solves today's problem. What happens when the platform under the
emulator goes away too?

ENCORE — **E**ngines of **N**ostalgia, **C**lean **O**pen **RE**implementations — is a different answer. We
rebuild the games themselves, from scratch, one to one.

## Why now?

Reimplementing a game used to be a labour of love that took a small team years. Some of the best ones — think
of OpenTTD, OpenRCT2 or OpenMW — took many years, and a few are still going. Is it different now? Yes, and the
numbers make the case better than I can. [Sheep](/games/sheep) was ported in about 29 hours.
[Grand Theft Auto](/games/gta) in two days. [Oni](/games/oni), 3,655 functions of Bungie's engine, plays
through all its levels after six. Those are not toy demos; they are function-by-function ports of the original
programs, checked against the original machine code.

What changed is engineering experience combined with coding agents and good tooling — Ghidra, emulators for
differential testing, deterministic hashes, and a runtime that takes the platform out of the problem. We take
that opportunity to make the games we love available to the next generations, on whatever platform exists, or
will exist, in the future.

## Why rebuild and not emulate?

Because a reimplementation is plain, portable source code. It compiles for platforms that did not exist when the
game came out, and it will compile for the ones that do not exist yet. It can read the original data straight
from a disc image, without an installer. It can fix nothing — on purpose — or it can add a widescreen mode,
when that makes sense, without touching how the game plays.

Faithful comes first. Every port keeps the original's quirks and bugs, because they are part of the game.
Modern additions — 16:9 and 16:10, higher resolutions, gamepads — are opt-in, and each project proves with
hashes that switching them off gives you exactly the original.

## Why gasm?

Every ENCORE game targets [gasm](/gasm), a small WebAssembly game runtime. The game is compiled once to a
`.wasm` module, and thin runners give it video, audio, input and files. The same module runs on Linux, macOS,
Windows and in the browser, with no changes and bit-identical game state on all of them.

Is it a lock-in? Not really. Each port keeps all of its platform code in one backend file, so a fully native
build — SDL, a console SDK, whatever comes next — is a backend away. That matters where WebAssembly performance
is not enough.

## What we don't do

We don't ship games. We don't own the rights to them, and we never include their code, art, sound, music or
data tables. You bring your own copy — the disc you kept, a second-hand one, or a copy bought from a store
such as [GOG](https://www.gog.com/en/), whose mission is to preserve games as well. More on that in
[Bring your own copy](/about/your-copy).

## Join in

Everything is open: the code of every port under the GPL, the [technical guides](/guides/), and a set of
[agent skills](/skills/) that carry what we learned to the next project. If there is a game you want to see
back, the guides are where to start. If you do start one, let me know.

— Michał Jaskólski
