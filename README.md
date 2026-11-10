# ENCORE

**Engines of Nostalgia, Clean Open REimplementations** — a game preservation project.

**Site: [encore.emdzej.pl](https://encore.emdzej.pl)**

[![Built for gasm](https://gasm.emdzej.pl/badge/built-for-gasm-flat.svg)](https://gasm.emdzej.pl)

ENCORE collects faithful, from-scratch reimplementations of old PC games. Each one is ported from the original
program, checked against it, and compiled once to WebAssembly for [gasm](https://gasm.emdzej.pl), so the same
module runs on macOS, Linux, Windows and in the browser. None of them ship any part of the original game: you
bring your own copy — the disc you kept, a second-hand one, or one bought from a store such as
[GOG](https://www.gog.com/en/).

This repository is the aggregator: the site, the technical guides, and a set of agent skills distilled from the
ports.

| Game | Year | Project | Site |
|---|---|---|---|
| Micro Machines | 1994 | [openmm](https://github.com/emdzej/openmm) | [openmm.emdzej.pl](https://openmm.emdzej.pl) |
| Return Fire | 1996 | [openrf](https://github.com/emdzej/openrf) | [openrf.emdzej.pl](https://openrf.emdzej.pl) |
| Grand Theft Auto | 1997 | [opengta](https://github.com/emdzej/opengta) | [opengta.emdzej.pl](https://opengta.emdzej.pl) |
| Interstate '76 | 1997 | [openi76](https://github.com/emdzej/openi76) | [openi76.emdzej.pl](https://openi76.emdzej.pl) |
| Colin McRae Rally 2.0 | 2000 | [opencmr2](https://github.com/emdzej/opencmr2) | [opencmr2.emdzej.pl](https://opencmr2.emdzej.pl) |
| Need for Speed: Porsche Unleashed | 2000 | [opennfspu](https://github.com/emdzej/opennfspu) | [opennfspu.emdzej.pl](https://opennfspu.emdzej.pl) |
| Sheep | 2000 | [opensheep](https://github.com/emdzej/opensheep) | [opensheep.emdzej.pl](https://opensheep.emdzej.pl) |
| Oni | 2001 | [openoni](https://github.com/emdzej/openoni) | [openoni.emdzej.pl](https://openoni.emdzej.pl) |
| Ballance | 2004 | [openballance](https://github.com/emdzej/openballance) | [openballance.emdzej.pl](https://openballance.emdzej.pl) |
| Babo Violent 2 | 2008 | [openbv](https://github.com/emdzej/openbv) | [openbv.emdzej.pl](https://openbv.emdzej.pl) |

## Layout

- `docs/` — the VitePress site (`pnpm install && pnpm dev`). Game metadata lives in
  `docs/.vitepress/theme/games.ts`; each game has a page in `docs/games/`.
- `skills/` — agent skills in the open [Agent Skills](https://agentskills.io) format. See
  [skills/README.md](skills/README.md) for installation.
- `research/` — the raw notes mined from each project, the source material for the guides and skills.
- `design/` — brand concepts (generated emblem explorations; the final logo is `docs/public/logo.svg`).

## Brand

Theme "the vault": a contemporary gallery at night — ink `#0E1420`, amber `#E8A13A`, brass `#B8894A`,
parchment `#EFE6D4`, with an iridescent pressed-disc accent. Display type Space Grotesk, labels IBM Plex Mono,
body Inter. The logo (`docs/public/logo.svg`) is an E drawn as scanlines with a play notch, inside a seal ring;
in the hero it sits as the label on a spinning disc. Key art was generated with FAL (Nano Banana 2.1) and lives
in `docs/public/art/`; earlier explorations are in `design/`.
