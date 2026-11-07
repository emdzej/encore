<script setup lang="ts">
import { computed } from "vue";
import { useData, withBase } from "vitepress";
import { bySlug, statusLabel } from "../games";

const { frontmatter } = useData();
const g = computed(() => bySlug(frontmatter.value.game)!);
const gog = computed(() => `https://www.gog.com/en/games?query=${encodeURIComponent(g.value.title)}`);
</script>

<template>
  <div v-if="g" class="game">
    <figure class="hero" :class="{ empty: !g.cover }">
      <img v-if="g.cover" :src="withBase(`/shots/${g.slug}/${g.cover}`)" :alt="`${g.title} running in ${g.project}`" />
      <img v-else-if="g.emblem" class="emblem" :src="withBase(g.emblem)" alt="" />
      <span v-else class="enc-label">Exhibit in preparation</span>
    </figure>

    <dl class="placard">
      <div><dt>Original</dt><dd>{{ g.year }} · {{ g.studio }} / {{ g.publisher }}</dd></div>
      <div><dt>Technology</dt><dd>{{ g.original }}</dd></div>
      <div><dt>Approach</dt><dd>{{ g.approach }}</dd></div>
      <div>
        <dt>Status</dt>
        <dd>{{ statusLabel[g.status] }}<template v-if="g.version"> · {{ g.version }}</template> — {{ g.statusNote }}</dd>
      </div>
      <div><dt>You bring</dt><dd>{{ g.data }}</dd></div>
    </dl>

    <div class="links">
      <a v-if="g.play" class="btn brand" :href="g.play">Play in the browser</a>
      <a class="btn alt" :href="g.site">{{ g.project }} site</a>
      <a class="btn alt" :href="g.repo">Source on GitHub</a>
      <a v-if="g.version" class="btn alt" :href="`${g.repo}/releases`">Downloads</a>
      <a v-if="g.slug !== 'bv'" class="btn ghost" :href="gog">Look for {{ g.title }} on GOG</a>
    </div>
  </div>
</template>

<style scoped>
.game { margin: 16px 0 8px; }
.hero {
  margin: 0;
  border-radius: 6px;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  background: radial-gradient(ellipse at 50% 0%, rgba(232, 161, 58, 0.25), transparent 70%), #0a0f18;
  box-shadow: 0 0 0 1px rgba(184, 137, 74, 0.35), 0 30px 60px -30px rgba(0, 0, 0, 0.7);
}
.hero img { width: 100%; height: 100%; object-fit: cover; }
.hero.empty { display: grid; place-items: center; }
.hero .emblem { width: 30%; height: auto; object-fit: contain; filter: drop-shadow(0 0 24px rgba(232, 161, 58, 0.4)); }
.placard {
  display: grid;
  grid-template-columns: 1fr;
  margin: 24px 0 0;
  border-top: 2px solid var(--vp-c-brand-1);
}
.placard div {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 16px;
  padding: 10px 0;
  border-bottom: 1px solid var(--vp-c-divider);
}
.placard dt {
  font-family: var(--enc-font-label);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--vp-c-brand-1);
  padding-top: 3px;
}
.placard dd { margin: 0; font-size: 15px; }
.links { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 22px; }
.btn {
  display: inline-block;
  padding: 0 18px;
  line-height: 38px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none !important;
}
.btn.brand { background: var(--vp-button-brand-bg); color: var(--vp-button-brand-text) !important; }
.btn.alt { border: 1px solid var(--vp-c-brand-1); color: var(--vp-c-brand-1) !important; }
.btn.ghost { color: var(--vp-c-text-2) !important; }
.btn:hover { opacity: 0.88; }
@media (max-width: 640px) { .placard div { grid-template-columns: 1fr; gap: 2px; } }
</style>
