---
title: Theory of operation
---

# Theory of operation

Every ENCORE port ends with a theory of operation: a document that explains how the original game was designed
and how it works — as a program, and as a game — so that anyone can learn from it how to build a game like it.
It is the educational product that sits beside the port, and the clearest answer to the charge that agent-made
ports lose the understanding they were built from (see [On AI](/about/ai)). Every project in the collection now
has one:
[Return Fire](https://openrf.emdzej.pl/guide/theory),
[Grand Theft Auto](https://opengta.emdzej.pl/guide/theory),
[Interstate '76](https://openi76.emdzej.pl/guide/theory),
[Colin McRae Rally 2.0](https://opencmr2.emdzej.pl/guide/theory),
[Porsche Unleashed](https://opennfspu.emdzej.pl/guide/theory),
[Sheep](https://opensheep.emdzej.pl/guide/theory),
[Oni](https://openoni.emdzej.pl/guide/theory),
[Ballance](https://openballance.emdzej.pl/guide/theory) and
[Babo Violent 2](https://openbv.emdzej.pl/guide/theory). Each project's AGENTS.md has a hard rule to keep it
current.

## What it is, and what it is not

It is written for someone who wants to learn how a game of its time is put together — a student, a game
programmer, a curious player — not for someone continuing the port. That changes everything about it:

| A theory of operation | The reverse-engineering notes (`docs/re/`) |
|---|---|
| Explains design: why the game is built this way, what the parts are for | Records facts: what each function does, at which address |
| Prose with diagrams, tables and worked examples | Tables of functions, layouts, offsets, confidence levels |
| No addresses in the main text (an appendix at most) | Every claim tied to an address, marked confirmed or inferred |
| Mechanics in plain terms: how damage, AI, physics, missions work | Mechanics as code paths and data layouts |
| Written once the port is complete (or plays through) | Kept current as each subsystem is ported |
| Ends with lessons for building such a game | Ends with open questions |

The hard rules of every project still apply. No decompiler output, ever — the document is written in your own
words. No game data: no copied tables, strings, levels or art. Small illustrative values are fine when they
explain a mechanism (Oni's page gives the constants of its random number generator, because that *is* the
mechanism), but never a dump. File formats appear as examples of design choices, linking to the format pages
for the details.

## What it covers

The outline below is distilled from Oni's document and OpenI76's plan. Keep the order — it goes from the
outside in, the way a reader builds a mental model — and drop or merge sections that do not apply.

1. **The shape of the program.** Language, size, modules or subsystems and what each is for (Oni's two- and
   three-letter module prefixes make a good table). Start-up, the main loops and how they nest, memory
   management.
2. **Time.** The tick rate, how the loop turns elapsed time into ticks, what is drawn when, the random number
   generators and who uses which. This is where determinism is explained.
3. **The data.** How the game finds and loads its files: archives, indexes, templates and instances, what is
   data and what is code. Why the designers made behaviour data.
4. **The world.** Levels, terrain, roads or rooms, the spatial structure used for collisions and visibility,
   objects, triggers.
5. **The gameplay.** The heart of the document, one subsection per system: the player and characters or
   vehicles, movement and physics, combat and damage, weapons, the AI (its layers, how it perceives, decides
   and acts), missions and scripting (the script machine, its commands, how a mission is assembled from zones,
   paths, spawn points and objectives), the story flow.
6. **Saving.** What a save holds and what it leaves out.
7. **Presentation.** The renderer (software spans and palettes, or the 3D pipeline), the HUD and cockpit, the
   menus, sound and music, the movies.
8. **Lessons for building such a game.** The design ideas worth stealing, each in a sentence or two — Oni's
   "make behaviour data", "use a fixed tick", "let animations drive movement", "give the AI the player's
   interface".
9. **Further reading.** The project's format pages, its `docs/re/` notes, and outside sources.

Diagrams help more than anywhere else in a project: the frame loop, the AI's layers, a mission's state
machine, the renderer's pipeline. Mermaid in VitePress or plain SVG both work.

## When and where

The full theory of operation is written when the game plays through, and kept current after that. Projects still
in progress may publish an early version, as long as it says plainly what is not understood yet. Either way, the
per-subsystem pages in `docs/re/` and `docs/formats/` are kept accurate as each part is ported, because they are
its source material; a theory written from stale notes is worse than none. It is the last step of the port plan,
and the port is not finished until it exists.

Put it at `docs/guide/theory.md` so it is published on the project's site (Oni's lives there, linked from the
site's guide sidebar), and link it from the README and from the game's ENCORE page.

## Checklist

1. Add "Theory of operation" as the last step of `docs/re/port-plan.md` from day one.
2. Keep `docs/re/*.md` and `docs/formats/*.md` current as each subsystem is ported: what it does, how it is
   built, confirmed versus inferred.
3. When the game plays through, write `docs/guide/theory.md` following the outline above, in prose, for a
   reader who wants to build such a game.
4. Check it against the hard rules: no decompiler text, no game data, no addresses in the main text.
5. Add diagrams for the frame loop, the AI and the mission flow at least.
6. End with "Lessons for building such a game" and "Further reading".
7. Publish it in the site's guide sidebar, link it from the README, and tell ENCORE so the game page links it.
