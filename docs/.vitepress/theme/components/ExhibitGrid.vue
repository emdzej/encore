<script setup lang="ts">
import { withBase } from "vitepress";
import { games, statusLabel } from "../games";

const props = withDefaults(defineProps<{ limit?: number }>(), { limit: 0 });
const list = props.limit ? games.slice(0, props.limit) : games;
const shot = (slug: string, file?: string) => (file ? withBase(`/shots/${slug}/${file}`) : "");
const no = (i: number) => String(i + 1).padStart(2, "0");
</script>

<template>
  <div class="exhibits">
    <a v-for="(g, i) in list" :key="g.slug" class="exhibit" :href="withBase(`/games/${g.slug}`)">
      <div class="case" :class="{ empty: !g.cover }">
        <template v-if="g.cover">
          <img class="a" :src="shot(g.slug, g.cover)" :alt="`${g.title} running in ${g.project}`" loading="lazy" />
          <img v-if="g.alt" class="b" :src="shot(g.slug, g.alt)" alt="" loading="lazy" />
        </template>
        <img v-else-if="g.emblem" class="emblem" :src="withBase(g.emblem)" alt="" />
        <span v-else class="pending enc-label">Exhibit in preparation</span>
        <span class="status" :data-status="g.status">{{ statusLabel[g.status] }}</span>
      </div>
      <div class="placard">
        <span class="enc-label">Exhibit {{ no(i) }} · {{ g.year }}</span>
        <h3>{{ g.title }}</h3>
        <p class="maker">{{ g.studio }}</p>
        <p class="project">{{ g.project }} — {{ g.approach.toLowerCase() }}</p>
      </div>
    </a>
  </div>
</template>

<style scoped>
.exhibits {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 28px;
  margin: 24px 0;
}
.exhibit {
  display: flex;
  flex-direction: column;
  text-decoration: none !important;
  color: inherit !important;
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
  box-shadow: 0 0 0 1px var(--vp-c-divider);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}
.exhibit:hover {
  transform: translateY(-3px);
  box-shadow: 0 0 0 1px rgba(232, 161, 58, 0.55), 0 24px 40px -24px rgba(232, 161, 58, 0.35);
}
.case {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-radius: 6px 6px 0 0;
  background: radial-gradient(ellipse at 50% 0%, rgba(232, 161, 58, 0.22), transparent 70%), #0a0f18;
}
.case img.a,
.case img.b {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: opacity 0.5s ease, transform 6s ease;
}
.case img.b { opacity: 0; }
.exhibit:hover .case img.a { transform: scale(1.05); }
.exhibit:hover .case img.b { opacity: 1; transform: scale(1.05); }
.case::after {
  /* Glass reflection. */
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(115deg, rgba(255, 255, 255, 0.08) 0%, transparent 28%, transparent 100%);
  pointer-events: none;
}
.case.empty { display: grid; place-items: center; }
.emblem { width: 46%; opacity: 0.9; filter: drop-shadow(0 0 18px rgba(232, 161, 58, 0.35)); }
.pending { color: var(--enc-dust); }
.status {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1;
  padding: 2px 8px;
  border-radius: 999px;
  font-family: var(--enc-font-label);
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  background: rgba(14, 20, 32, 0.82);
  color: var(--enc-amber-soft);
  border: 1px solid rgba(232, 161, 58, 0.45);
}
.status[data-status="groundwork"] { color: #b6b0a4; border-color: rgba(182, 176, 164, 0.4); }
.placard { padding: 14px 16px 18px; border-top: 1px solid var(--vp-c-divider); }
.placard h3 {
  margin: 6px 0 2px;
  font-family: var(--enc-font-display);
  font-size: 21px;
  font-weight: 600;
  line-height: 1.2;
  border: none;
  padding: 0;
}
.maker { margin: 0; font-size: 14px; color: var(--vp-c-text-2); }
.project { margin: 8px 0 0; font-family: var(--enc-font-label); font-size: 12px; color: var(--vp-c-text-3); }
</style>
