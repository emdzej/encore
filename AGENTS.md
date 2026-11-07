# AGENTS.md — ENCORE aggregator

This repository is the ENCORE site (VitePress, `docs/`), its technical guides (`docs/guides/`) and agent skills
(`skills/`). The game ports live in their own repositories (`../open*`), the runtime in `../gasm`.

## Hard rules

1. Never add game data, original code, or anything derived from game data, except screenshots a project already
   publishes in its own `docs/public/screenshots/`. OpenOni publishes none by rule — do not add any.
2. Every fact in a guide, skill or game page must come from a project repository or `research/`. Link evidence as
   `https://github.com/emdzej/<repo>/blob/main/<path>` or `/commit/<hash>`. Do not invent numbers.
3. Never call a game freeware or abandonware without an official source; never claim a store does or does not sell
   a game. "Bring your own copy" is the wording.
4. Skills follow the Agent Skills format: `skills/<name>/SKILL.md` with `name` equal to the directory name and a
   `description` saying what and when. Keep them agent-neutral.
5. Guides are neutral technical reference. The manifesto (`docs/about/index.md`) speaks as "we", the project;
   no personal names on the site.

## Adding a game

1. Add an entry to `docs/.vitepress/theme/games.ts` (sorted by original release year).
2. Copy the project's published screenshots to `docs/public/shots/<slug>/` (convert large PNGs to WebP).
3. Write `docs/games/<slug>.md` with `game: <slug>` frontmatter, `<GameExhibit />` and `<Gallery />`.
4. Mine the project into `research/open<name>.md` and fold new lessons into the guides and skills.
5. When the project publishes its theory of operation (`docs/guide/theory.md` on its site), link it from the game page.

## Commands

```sh
cd docs && pnpm install
pnpm dev      # http://localhost:5173
pnpm build    # must pass with no dead links before pushing
```

Deploys go through `.github/workflows/pages.yml` on push to `main`.
