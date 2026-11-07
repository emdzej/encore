---
name: encore-theory-of-operation
description: Writes the theory-of-operation document for an ENCORE-style game reimplementation - an educational account, in prose with diagrams, of how the original game was designed and how it works as a program and as a game (program shape, time and determinism, data, world, gameplay systems such as physics, damage, AI and mission scripting, saving, presentation, and lessons for building such a game), drawn from the project's reverse-engineering and format notes, with no decompiler text, no game data and no addresses in the main text. Use when a port is complete or plays through, when setting up a new project's port plan (to add it as the final step), or when asked to explain how a ported game works.
---

# Write the theory of operation

Every ENCORE port ends with `docs/guide/theory.md`: how the game was designed and how it works, written for
someone who wants to learn how to build such a game. It is not a reverse-engineering log. The model is
[How Oni works](https://openoni.emdzej.pl/guide/theory).

## When to use

- At project start: add "Theory of operation (after the port)" as the last step of `docs/re/port-plan.md`.
- During the port: keep `docs/re/*.md` and `docs/formats/*.md` accurate per subsystem; they are the sources.
- When the game plays through: write the document.

## Hard rules

1. No decompiler output, paraphrased or otherwise. Write from your understanding, in your own words.
2. No game data: no copied tables, strings, level contents or art. Small values that explain a mechanism (a
   random generator's constants, a tick rate) are fine; dumps are not.
3. No addresses in the main text. If readers need them, add a short appendix pointing to `docs/re/`.
4. Every statement must be backed by the RE notes or the port's code. Mark anything uncertain as such.
5. Write for a learner: explain *why* a system is built the way it is, not only what it does.

## Procedure

1. Read the project's `docs/re/` (architecture, inventory, per-subsystem pages), `docs/formats/`, AGENTS.md and
   the port plan. List the systems that exist in the game.
2. Copy `templates/theory.md` to `docs/guide/theory.md`. Keep the section order; delete sections that do not
   apply, split "The gameplay" into one subsection per system.
3. For each section, write prose first, then add one table or diagram where it carries the point: a module
   table, the frame loop, the AI's layers, a mission's state machine, the renderer's pipeline (Mermaid or SVG).
4. Use the file formats as examples of design decisions and link to their pages instead of repeating them.
5. Write "Lessons for building such a game": 4–8 design ideas, a sentence or two each.
6. Review against the hard rules: grep the file for `0x4` and `0x10` (addresses), for pasted code, and for
   anything that reads like a decompiler.
7. Add it to the site's guide sidebar (`docs/.vitepress/config.ts`), link it from README.md, and note it in
   AGENTS.md's docs map.

## Verification

- Someone who has never seen the code can explain the frame loop, the AI and one mission after reading it.
- No addresses outside an appendix; no decompiler phrasing; no data copied from the game.
- `pnpm build` in `docs/` passes with no dead links.

## Further reading

- https://encore.emdzej.pl/guides/theory
- https://openoni.emdzej.pl/guide/theory (the first one)
- https://encore.emdzej.pl/guides/reverse-engineering
