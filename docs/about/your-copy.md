---
title: Bring your own copy
---

# Bring your own copy

ENCORE projects contain no part of the original games: no code, no art, no sound or music, no level data and
no tables copied out of the program. That is a rule in every repository, not a guideline, and it shapes how the
ports are built.

## What the projects read

Each port reads the game from your copy at run time — the CD itself, an image of it (`.iso`, or a raw
`.bin`), or an installed folder, depending on the game. Several of them read the installer archives on the disc
directly, so you never have to run a Windows setup program. Constants and tables the original program carries
are read from your copy of that program when the game starts, not compiled into the port.

Most projects support exactly one version of the original program, identified by its size and CRC-32, because
a function-by-function port is a port of that one build. If your copy is a different version, the game says so
at start-up, naming what it expected. Each game's page in [the collection](/games/) says which version to bring.

In the browser the same applies: you pick your disc or folder, the page checks it, and it is read locally —
nothing is uploaded anywhere. The sites host only the engine.

## Where to get the games

The disc you kept is the best answer. Second-hand copies of most of these games are easy to find. Where a game
is sold today, buy it — from stores such as [GOG](https://www.gog.com/en/), which sells old games without DRM
and, through its [Preservation Program](https://www.gog.com/en/gog-preservation-program), commits to keeping
them working on modern systems. Each game page links to a GOG search for that title; whether a given game is
available there, and in which version, changes over time, so check before you buy.

One exhibit is different: [Babo Violent 2](/games/bv) was released by its authors under the GPL, data included,
so openbv ships with its content.

## What the projects never do

They never link to downloads of the games, never call a game "freeware" or "abandonware" without an official
source saying so, and never commit screenshots, dumps or files derived from game data unless the project's own
rules allow screenshots of the running port. See [Wording](/guides/shipping#wording) in the guides, and the `encore-data-hygiene` agent skill.

Trademarks and copyrights in the original games belong to their owners. ENCORE projects are not affiliated with
them.
