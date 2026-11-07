# ENCORE agent skills

Procedural instructions for coding agents doing faithful 1:1 reimplementations of old PC games on the
[gasm](https://gasm.emdzej.pl) WebAssembly runtime. Each skill is a directory with a `SKILL.md` in the open
[Agent Skills](https://agentskills.io) format (YAML frontmatter `name` + `description`, Markdown body), plus
optional `references/` and `templates/`. They are agent-neutral: plain Markdown, shell commands and file
templates. The background and evidence for every rule are in the guides at
https://encore.emdzej.pl/guides/.

## Catalogue

| Skill | Use it to |
|---|---|
| [`encore-new-reimplementation`](encore-new-reimplementation/SKILL.md) | Start a project end to end: choose the approach, pin the exe, lay out the repo, write AGENTS.md from the template, pin the gasm SDK, set up CMake and CI, reach the first milestone. The entry skill; routes to the others |
| [`encore-reverse-engineering`](encore-reverse-engineering/SKILL.md) | Set up Ghidra headless, keep names in a TSV, dump the whole decompile for grepping, inventory the binary by address range, transfer names from a symbol-bearing build |
| [`encore-port-function`](encore-port-function/SKILL.md) | Port one function or subsystem: own words, address citation, quirks kept, tables read from the exe, pending stubs, struct offsets, a test and a hash check |
| [`encore-file-formats`](encore-file-formats/SKILL.md) | Decode a file format, archive or installer and prove it with a whole-disc summary hash and an independent check |
| [`encore-verification`](encore-verification/SKILL.md) | Deterministic headless hashes, golden values, cross-runner and cross-source parity, regressions, differential testing against the original in Unicorn |
| [`encore-x87-fidelity`](encore-x87-fidelity/SKILL.md) | Reproduce x87 precision and rounding modes, NaN compares, `__ftol`, constants by their bits, FMA contraction, and the MSVC CRT's `rand` and `qsort` |
| [`encore-gasm-backend`](encore-gasm-backend/SKILL.md) | Write `platform_gasm.c` and map DirectDraw/Direct3D/OpenGL, DirectSound/Miles/FMOD, DirectInput and files onto gasm's ABI |
| [`encore-netcode`](encore-netcode/SKILL.md) | Carry DirectPlay, WinSock or a custom protocol over `gasm:net` WebSockets and gasm-relay; rewrite an original server |
| [`encore-modern-additions`](encore-modern-additions/SKILL.md) | Add widescreen, high resolution, skins or upscaling as opt-in layers that leave the default hashes unchanged |
| [`encore-data-hygiene`](encore-data-hygiene/SKILL.md) | Keep game data and decompiler output out of the repo, read tables from the user's exe, accept every source format, word the docs correctly |
| [`encore-ship-release`](encore-ship-release/SKILL.md) | Build the browser player, package native bundles, cut a release, publish the docs site |

## Installation

Copy the skill directories (not this README) into the directory your agent scans. Project-level
directories are committed with the project, so every session and every collaborator gets them.

```sh
git clone https://github.com/emdzej/encore /tmp/encore
mkdir -p .agents/skills && cp -R /tmp/encore/skills/encore-* .agents/skills/
```

Replace `.agents/skills` with the directory for your agent:

| Agent | Project directory | User directory |
|---|---|---|
| Cross-tool convention (read by Codex, Cursor, Gemini CLI, OpenCode) | `.agents/skills/` | `~/.agents/skills/` |
| Claude Code | `.claude/skills/` | `~/.claude/skills/` |
| OpenAI Codex | `.agents/skills/` (from the working directory up to the repository root) | `~/.agents/skills/` |
| OpenCode | `.opencode/skills/` (also reads `.claude/skills/` and `.agents/skills/`) | `~/.config/opencode/skills/` |
| Cursor | `.cursor/skills/` (also reads `.agents/skills/`, `.claude/skills/`, `.codex/skills/`) | `~/.cursor/skills/` |
| Gemini CLI | `.gemini/skills/` (alias `.agents/skills/`, which takes precedence) | `~/.gemini/skills/` |

For any other agent, consult your agent's documentation for its skills directory. Each skill directory is
self-contained, so copying a single one also works:

```sh
cp -R /tmp/encore/skills/encore-ship-release .claude/skills/
```

To update, pull the repository and copy again; the skills hold no local state.

## Agents without skill support

Any agent that reads `AGENTS.md` (or an equivalent instructions file) can use the skills as plain documents.
Copy them into the repository, for example to `docs/agent-skills/`, and add a section to `AGENTS.md`:

```md
## Skills

Before each kind of task, read the matching file and follow it:

- Starting or restructuring the project: `docs/agent-skills/encore-new-reimplementation/SKILL.md`
- Ghidra, names, inventory: `docs/agent-skills/encore-reverse-engineering/SKILL.md`
- Porting a function: `docs/agent-skills/encore-port-function/SKILL.md`
- A file format: `docs/agent-skills/encore-file-formats/SKILL.md`
- Hashes and differential tests: `docs/agent-skills/encore-verification/SKILL.md`
- Float code: `docs/agent-skills/encore-x87-fidelity/SKILL.md`
- The gasm backend: `docs/agent-skills/encore-gasm-backend/SKILL.md`
- Networking: `docs/agent-skills/encore-netcode/SKILL.md`
- Opt-in additions: `docs/agent-skills/encore-modern-additions/SKILL.md`
- Anything touching game data or user-facing wording: `docs/agent-skills/encore-data-hygiene/SKILL.md`
- Player, bundles, release, site: `docs/agent-skills/encore-ship-release/SKILL.md`
```

If the copies must not be published on the project's site, add `agent-skills/**` to VitePress `srcExclude`
(or keep them outside `docs/`).

## Licence and contributions

The skills are part of the ENCORE repository. Corrections are welcome as pull requests; every rule should
point at evidence in one of the projects, as the guides do.
