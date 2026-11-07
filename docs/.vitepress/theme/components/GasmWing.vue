<script setup lang="ts">
import { withBase } from "vitepress";
import { gasmWing } from "../games";
</script>

<template>
  <div class="wing">
    <article v-for="w in gasmWing" :key="w.title" class="item">
      <a class="case" :href="w.play"><img :src="withBase(w.image)" :alt="`${w.title} running on gasm`" loading="lazy" /></a>
      <div class="placard">
        <span class="enc-label">gasm wing · {{ w.year }}</span>
        <h3>{{ w.title }}</h3>
        <p class="maker">{{ w.studio }}</p>
        <p>{{ w.what }}</p>
        <p class="bring"><b>You bring:</b> {{ w.bring }}</p>
        <p class="links"><a :href="w.play">Play in the browser</a> · <a :href="w.source">Source in gasm</a></p>
      </div>
    </article>
  </div>
</template>

<style scoped>
.wing { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 28px; margin: 24px 0; }
.item { display: grid; grid-template-columns: 1fr; border-radius: 6px; background: var(--vp-c-bg-soft); box-shadow: 0 0 0 1px var(--vp-c-divider); overflow: hidden; }
.case { display: block; aspect-ratio: 16 / 10; overflow: hidden; background: #0a0f18; }
.case img { width: 100%; height: 100%; object-fit: cover; transition: transform 6s ease; }
.item:hover .case img { transform: scale(1.05); }
.placard { padding: 14px 18px 18px; border-top: 1px solid var(--vp-c-divider); }
.placard h3 { margin: 6px 0 2px; font-family: var(--enc-font-display); font-size: 22px; font-weight: 600; border: none; padding: 0; }
.placard p { margin: 8px 0 0; font-size: 14px; line-height: 1.55; color: var(--vp-c-text-2); }
.placard .maker { margin-top: 0; }
.bring b { color: var(--vp-c-text-1); font-weight: 600; }
.links a { color: var(--vp-c-brand-1); font-weight: 600; text-decoration: none; }
</style>
