<script setup lang="ts">
import { computed, ref } from "vue";
import { useData, withBase } from "vitepress";
import { bySlug } from "../games";

const props = defineProps<{ game?: string }>();
const { frontmatter } = useData();
const g = computed(() => bySlug(props.game ?? frontmatter.value.game));
const src = (file: string) => withBase(`/shots/${g.value!.slug}/${file}`);

const dialog = ref<HTMLDialogElement>();
const current = ref(0);
function open(i: number) {
  current.value = i;
  dialog.value?.showModal();
}
function step(d: number) {
  const n = g.value!.shots.length;
  current.value = (current.value + d + n) % n;
}
</script>

<template>
  <div v-if="g && g.shots.length" class="gallery">
    <button v-for="(s, i) in g.shots" :key="s.file" class="thumb" type="button" @click="open(i)">
      <img :src="src(s.file)" :alt="s.caption ?? ''" loading="lazy" />
      <span v-if="s.caption">{{ s.caption }}</span>
    </button>

    <dialog ref="dialog" class="lightbox" @click.self="dialog?.close()" @keydown.left="step(-1)" @keydown.right="step(1)">
      <figure>
        <img :src="src(g.shots[current].file)" :alt="g.shots[current].caption ?? ''" />
        <figcaption>
          <span class="enc-label">{{ current + 1 }} / {{ g.shots.length }}</span>
          {{ g.shots[current].caption }}
        </figcaption>
      </figure>
      <button class="nav prev" type="button" aria-label="Previous" @click="step(-1)">‹</button>
      <button class="nav next" type="button" aria-label="Next" @click="step(1)">›</button>
      <button class="close" type="button" aria-label="Close" @click="dialog?.close()">×</button>
    </dialog>
  </div>
  <p v-else-if="g?.noShots" class="none">{{ g.noShots }}</p>
</template>

<style scoped>
.gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; margin: 20px 0; }
.thumb {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0;
  text-align: left;
  background: none;
  cursor: zoom-in;
}
.thumb img {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: 4px;
  box-shadow: 0 0 0 1px var(--vp-c-divider);
  transition: box-shadow 0.2s;
}
.thumb:hover img { box-shadow: 0 0 0 1px var(--vp-c-brand-1); }
.thumb span { font-size: 13px; color: var(--vp-c-text-2); }
.lightbox {
  max-width: min(1200px, 94vw);
  padding: 0;
  border: none;
  border-radius: 6px;
  background: #0a0f18;
  color: #ece6da;
  overflow: visible;
}
.lightbox::backdrop { background: rgba(7, 10, 16, 0.88); backdrop-filter: blur(4px); }
.lightbox figure { margin: 0; }
.lightbox img { display: block; max-width: 100%; max-height: 82vh; margin: 0 auto; border-radius: 6px 6px 0 0; }
.lightbox figcaption { padding: 12px 16px; font-size: 14px; display: flex; gap: 12px; align-items: baseline; }
.nav, .close {
  position: absolute;
  background: rgba(14, 20, 32, 0.8);
  color: var(--enc-amber-soft);
  border: 1px solid rgba(232, 161, 58, 0.45);
  border-radius: 999px;
  width: 40px;
  height: 40px;
  font-size: 24px;
  line-height: 1;
}
.nav { top: 45%; }
.prev { left: -20px; }
.next { right: -20px; }
.close { top: -20px; right: -20px; font-size: 20px; }
.none { color: var(--vp-c-text-2); font-style: italic; }
</style>
