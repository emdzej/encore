---
title: Agent skills
---

<script setup>
import { data as skills } from "./skills.data";
const tree = (s) => `https://github.com/emdzej/encore/tree/main/skills/${s.name}`;
</script>

# Agent skills

<div class="enc-banner"><img src="/art/archive.webp" alt="An archive of index-card drawers; small brass helpers file cards in an open drawer" /></div>

Most ENCORE ports were written with coding agents. These skills carry what those sessions learned — the
procedures that worked, the rules that kept ports faithful, and the traps that cost days — to whoever starts the
next one. They are plain Markdown in the open [Agent Skills](https://agentskills.io) format: a folder per skill
with a `SKILL.md` (a name, a description saying when to use it, and the procedure), plus reference files and
templates. Any agent that supports skills can load them; any agent that does not can still be pointed at them
from its `AGENTS.md`.

Start with <code>encore-new-reimplementation</code>: it walks through bootstrapping a project and hands over to
the others as the work moves on.

<div class="enc-skills">
  <a v-for="s in skills" :key="s.name" class="enc-skill" :href="tree(s)">
    <code>{{ s.name }}</code>
    <p>{{ s.description }}</p>
  </a>
</div>

## Installing them

Clone the repository and copy the skills into the directory your agent reads skills from:

```sh
git clone https://github.com/emdzej/encore
cp -R encore/skills/encore-* <your-project>/.agents/skills/
```

The [skills README](https://github.com/emdzej/encore/tree/main/skills#readme) lists the directories common agents
use (project-level and per-user), and how to reference the skills from an `AGENTS.md` for agents that do not load
skills by themselves.

## How they relate to the guides

The [guides](/guides/) are the long form, written for people: why things are done a certain way, with the
evidence. The skills are the short form, written for agents: what to do, in which order, and how to check it.
Each skill links to the guide pages behind it.
