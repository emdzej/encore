<script setup lang="ts">
import { withBase } from "vitepress";
import ExhibitGrid from "./ExhibitGrid.vue";

const pillars = [
  {
    label: "01 · Faithful",
    title: "Rebuilt one to one",
    text: "Ported function by function from the original program, quirks and bugs included. Every port is checked against the original — frame hashes, emulated reference runs, pixel diffs.",
  },
  {
    label: "02 · Portable",
    title: "One module, every platform",
    text: "Each game compiles once to WebAssembly for gasm and runs unchanged on macOS, Linux, Windows and in the browser. A native build is always a backend away.",
  },
  {
    label: "03 · Clean",
    title: "Bring your own copy",
    text: "No original code, art, sound or data ships with any project. The game reads your disc or install, checks the exact version, and takes its data from there.",
  },
];

const steps = [
  ["Pick", "a game and pin one exact binary by size and CRC-32"],
  ["Map", "the program in Ghidra: every function, named and dated"],
  ["Decode", "every file format, proved by a hash over the whole disc"],
  ["Port", "function by function, citing original addresses"],
  ["Verify", "with deterministic hashes and the original's own code"],
  ["Ship", "one .wasm, desktop bundles and a browser player"],
];
</script>

<template>
  <div class="home-body">
    <section class="pillars">
      <article v-for="p in pillars" :key="p.label">
        <span class="enc-label">{{ p.label }}</span>
        <h2 class="enc-display">{{ p.title }}</h2>
        <p>{{ p.text }}</p>
      </article>
    </section>

    <section class="block">
      <header>
        <span class="enc-label">The collection</span>
        <h2 class="enc-display">On display</h2>
        <p>Nine games from 1996 to 2008, each in its own case. Most of them you can play in the browser today, from your own copy.</p>
      </header>
      <ExhibitGrid />
      <p class="wing-note">
        Also on display in the gasm wing: <a href="https://gasm.emdzej.pl/play/?game=doom.wasm&autostart">DOOM</a> and
        <a href="https://gasm.emdzej.pl/play/?game=scummvm.wasm&autostart">ScummVM</a>, ported to the same runtime.
      </p>
      <a class="more" :href="withBase('/games/')">The whole collection →</a>
    </section>

    <section class="block split">
      <div class="art"><img :src="withBase('/art/workbench.webp')" alt="A restorer's workbench: a game CD under a magnifying lamp, hex dumps and format diagrams" loading="lazy" /></div>
      <div>
        <span class="enc-label">The conservation lab</span>
        <h2 class="enc-display">How a game gets rebuilt</h2>
        <ol class="steps">
          <li v-for="([verb, rest], i) in steps" :key="verb"><b>{{ verb }}</b> {{ rest }}</li>
        </ol>
        <a class="more" :href="withBase('/guides/')">Read the technical guides →</a>
      </div>
    </section>

    <section class="block split reverse">
      <div class="art"><img :src="withBase('/art/archive.webp')" alt="An archive of index-card drawers, small brass helpers filing cards" loading="lazy" /></div>
      <div>
        <span class="enc-label">For the next restorer</span>
        <h2 class="enc-display">Skills for coding agents</h2>
        <p>
          Most of these ports were written with coding agents, in days rather than years. What they learned the hard way
          is written down as portable agent skills — plain Markdown in the open Agent Skills format, usable from any agent
          that reads them.
        </p>
        <a class="more" :href="withBase('/skills/')">Browse the skills →</a>
      </div>
    </section>

    <section class="block closing">
      <span class="enc-label">Preservation is a team sport</span>
      <h2 class="enc-display">Buy the games. Keep them alive.</h2>
      <p>
        ENCORE does not ship games — we don't own them. Find a copy, second hand or from stores like
        <a href="https://www.gog.com/en/">GOG</a>, whose <a href="https://www.gog.com/en/gog-preservation-program">Preservation Program</a>
        keeps classics working on modern systems, and support the <a href="https://gamehistory.org">Video Game History Foundation</a>.
      </p>
      <a class="more" :href="withBase('/about/')">Read the manifesto →</a>
    </section>
  </div>
</template>

<style scoped>
.home-body { max-width: 1152px; margin: 0 auto; padding: 8px 24px 48px; }
.pillars { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 28px; margin-top: -8px; }
.pillars article { padding: 22px 0 0; border-top: 1px solid var(--vp-c-brand-1); }
.pillars h2 { margin: 10px 0 8px; font-size: 24px; font-weight: 600; }
.pillars p { margin: 0; color: var(--vp-c-text-2); line-height: 1.6; }

.block { margin-top: 96px; }
.block header p, .block p { color: var(--vp-c-text-2); line-height: 1.65; max-width: 640px; }
.block h2 { margin: 8px 0 12px; font-size: clamp(28px, 3.4vw, 38px); font-weight: 500; line-height: 1.15; font-weight: 600; letter-spacing: -0.02em; }
.block a:not(.more) { color: var(--vp-c-brand-1); text-decoration: underline; text-underline-offset: 3px; }
.more { display: inline-block; margin-top: 12px; font-weight: 600; color: var(--vp-c-brand-1); }
.more:hover { color: var(--vp-c-brand-2); }

.split { display: grid; grid-template-columns: 1.1fr 1fr; gap: 48px; align-items: center; }
.split.reverse .art { order: 2; }
.art { border-radius: 6px; overflow: hidden; box-shadow: 0 0 0 1px rgba(184, 137, 74, 0.3), 0 30px 60px -30px rgba(0, 0, 0, 0.7); }
.art img { display: block; width: 100%; aspect-ratio: 16 / 10; object-fit: cover; transition: transform 8s ease; }
.art:hover img { transform: scale(1.04); }

.steps { list-style: none; counter-reset: s; padding: 0; margin: 16px 0 8px; }
.steps li { counter-increment: s; position: relative; padding: 9px 0 9px 44px; border-bottom: 1px solid var(--vp-c-divider); color: var(--vp-c-text-2); }
.steps li::before {
  content: counter(s, decimal-leading-zero);
  position: absolute;
  left: 0;
  top: 11px;
  font-family: var(--enc-font-label);
  font-size: 12px;
  color: var(--vp-c-brand-1);
}
.steps b { color: var(--vp-c-text-1); font-weight: 600; }

.closing { text-align: center; padding: 56px 24px; border-top: 1px solid var(--vp-c-divider); border-bottom: 1px solid var(--vp-c-divider); }
.closing p { margin: 0 auto; }
.closing h2::after { margin-left: auto; margin-right: auto; }
.wing-note { margin-top: 4px; font-size: 14px; }

@media (max-width: 860px) {
  .split { grid-template-columns: 1fr; gap: 24px; }
  .split.reverse .art { order: 0; }
}
</style>
