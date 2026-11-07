<script setup lang="ts">
import { withBase } from "vitepress";
import { games } from "../games";

// Deterministic dust: positions are fixed so SSR and client render the same markup.
const motes = Array.from({ length: 28 }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  return {
    left: `${(r(1) * 100).toFixed(2)}%`,
    top: `${(30 + r(2) * 70).toFixed(2)}%`,
    size: `${(1 + r(3) * 2.4).toFixed(2)}px`,
    delay: `${(-r(4) * 18).toFixed(2)}s`,
    duration: `${(12 + r(5) * 14).toFixed(2)}s`,
    drift: `${(r(6) * 60 - 30).toFixed(1)}px`,
  };
});

const playable = games.filter((g) => g.play).length;
</script>

<template>
  <section class="vault" aria-labelledby="vault-title">
    <div class="vault-art" aria-hidden="true">
      <picture>
        <source media="(max-width: 760px)" :srcset="withBase('/art/hero-vault-sm.webp')" />
        <img :src="withBase('/art/hero-vault.webp')" alt="" fetchpriority="high" />
      </picture>
      <div class="beam" />
      <div class="dust">
        <span
          v-for="(m, i) in motes"
          :key="i"
          :style="{ left: m.left, top: m.top, width: m.size, height: m.size, animationDelay: m.delay, animationDuration: m.duration, '--drift': m.drift }"
        />
      </div>
      <div class="scan" />
    </div>

    <div class="vault-copy">
      <div class="disc" aria-hidden="true">
        <div class="disc-surface" />
        <div class="disc-sheen" />
      <svg class="seal" viewBox="0 0 64 64" aria-hidden="true">
        <circle class="label" cx="32" cy="32" r="30" />
        <circle class="ring" cx="32" cy="32" r="28.5" />
        <circle class="ring dotted" cx="32" cy="32" r="24.5" />
        <g class="e">
          <path d="M19 17h6v30h-6zM20.4 28.6v6.8l4.6-3.4z" fill-rule="evenodd" />
          <rect x="26.5" y="17" width="18.5" height="1.9" />
          <rect x="26.5" y="20.1" width="16" height="1.9" />
          <rect x="26.5" y="29.5" width="13" height="1.9" />
          <rect x="26.5" y="32.6" width="10.5" height="1.9" />
          <rect x="26.5" y="42" width="16" height="1.9" />
          <rect x="26.5" y="45.1" width="18.5" height="1.9" />
        </g>
      </svg>
      </div>

      <p class="enc-label kicker">A game preservation project</p>
      <h1 id="vault-title" class="title">ENCORE</h1>
      <p class="expansion">
        <b>E</b>ngines of <b>N</b>ostalgia, <b>C</b>lean <b>O</b>pen <b>RE</b>implementations
      </p>
      <p class="tagline">
        Old PC games rebuilt from scratch, faithfully, to run on whatever platforms come next. Bring your own copy
        of the game.
      </p>
      <div class="actions">
        <a class="btn brand" :href="withBase('/games/')">Visit the collection</a>
        <a class="btn alt" :href="withBase('/guides/')">Read the guides</a>
      </div>
      <dl class="tally">
        <div><dt>exhibits</dt><dd>{{ games.length }}</dd></div>
        <div><dt>play in browser</dt><dd>{{ playable }}</dd></div>
        <div><dt>platforms</dt><dd>4</dd></div>
      </dl>
    </div>
  </section>
</template>

<style scoped>
.vault {
  position: relative;
  min-height: min(92vh, 820px);
  margin-top: calc(var(--vp-nav-height) * -1);
  padding: calc(var(--vp-nav-height) + 48px) 24px 72px;
  display: flex;
  align-items: center;
  overflow: hidden;
  background: var(--enc-ink);
  color: #ece6da;
  isolation: isolate;
}

.vault-art { position: absolute; inset: 0; z-index: -1; }
.vault-art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 70% 50%;
  transform-origin: 70% 55%;
  animation: drift 40s ease-in-out infinite alternate;
}
.vault-art::after {
  /* Darken the left third, where the copy sits, and fade into the page. */
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(14, 20, 32, 0.96) 0%, rgba(14, 20, 32, 0.78) 32%, rgba(14, 20, 32, 0.15) 62%, transparent 80%),
    linear-gradient(180deg, rgba(14, 20, 32, 0.55) 0%, transparent 22%, transparent 70%, var(--vp-c-bg) 100%);
}

.beam {
  position: absolute;
  top: -10%;
  left: 58%;
  width: 34%;
  height: 120%;
  background: linear-gradient(180deg, rgba(242, 195, 116, 0.2), transparent 70%);
  filter: blur(18px);
  transform: skewX(-14deg);
  mix-blend-mode: screen;
  animation: flicker 7s ease-in-out infinite;
}

.dust { position: absolute; inset: 0; z-index: 1; }
.dust span {
  position: absolute;
  border-radius: 50%;
  background: rgba(242, 195, 116, 0.85);
  box-shadow: 0 0 6px rgba(242, 195, 116, 0.8);
  opacity: 0;
  animation-name: mote;
  animation-iteration-count: infinite;
  animation-timing-function: linear;
}

.scan {
  /* A faint CRT sweep over the whole vault, once every few seconds. */
  position: absolute;
  inset: 0;
  z-index: 2;
  background: linear-gradient(180deg, transparent 0%, rgba(242, 195, 116, 0.06) 50%, transparent 100%);
  background-size: 100% 220px;
  background-repeat: no-repeat;
  animation: sweep 9s linear infinite;
  pointer-events: none;
}

.vault-copy {
  position: relative;
  z-index: 3;
  max-width: 1152px;
  width: 100%;
  margin: 0 auto;
}
.vault-copy > * { max-width: 580px; }
.vault-copy > .title { max-width: none; white-space: nowrap; }

.disc {
  /* A pressed disc: iridescent data surface spinning under the ENCORE seal, which sits on it as the label. */
  position: relative;
  width: 132px;
  height: 132px;
  margin-bottom: 22px;
}
.disc-surface,
.disc-sheen {
  position: absolute;
  inset: 0;
  border-radius: 50%;
}
.disc-surface {
  background:
    radial-gradient(circle, transparent 0 21%, rgba(255, 255, 255, 0.5) 21.5% 22.5%, transparent 23%),
    repeating-radial-gradient(circle, rgba(255, 255, 255, 0.05) 0 1px, transparent 1px 3px),
    conic-gradient(from 0deg, #c9d2e0, #f2c374, #9ee6d9, #b9a7f0, #f39bb6, #c9d2e0, #e8a13a, #8fd0f5, #c9d2e0);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.25), 0 20px 50px -12px rgba(232, 161, 58, 0.45);
  animation: spin 9s linear infinite;
}
.disc-sheen {
  /* A fixed light reflection, so the rainbow moves under it. */
  background: conic-gradient(from 200deg, transparent 0 20%, rgba(255, 255, 255, 0.45) 26%, transparent 34% 70%, rgba(255, 255, 255, 0.25) 76%, transparent 82%);
  mix-blend-mode: overlay;
}
.disc .seal {
  position: absolute;
  inset: 25%;
  width: 50%;
  height: 50%;
}
.seal .label { fill: var(--enc-ink); }
.seal .ring {
  fill: none;
  stroke: var(--enc-amber);
  stroke-width: 1.6;
  stroke-dasharray: 180;
  stroke-dashoffset: 180;
  animation: draw 1.8s 0.2s cubic-bezier(0.6, 0, 0.2, 1) forwards;
}
.seal .ring.dotted { stroke-width: 0.8; animation-delay: 0.6s; }
.seal .e { fill: var(--enc-amber); }
.seal .e > * { opacity: 0; animation: line-in 0.4s ease-out forwards; }
.seal .e > *:nth-child(1) { animation-delay: 1s; }
.seal .e > *:nth-child(2) { animation-delay: 1.1s; }
.seal .e > *:nth-child(3) { animation-delay: 1.18s; }
.seal .e > *:nth-child(4) { animation-delay: 1.26s; }
.seal .e > *:nth-child(5) { animation-delay: 1.34s; }
.seal .e > *:nth-child(6) { animation-delay: 1.42s; }
.seal .e > *:nth-child(7) { animation-delay: 1.5s; }

.kicker { margin: 0 0 10px; color: var(--enc-amber); }
.title {
  margin: 0;
  font-family: var(--enc-font-display);
  font-weight: 600;
  font-size: clamp(52px, 9vw, 112px);
  line-height: 0.95;
  letter-spacing: 0.14em;
  background: linear-gradient(120deg, #f6dcaa 0%, #e8a13a 45%, #b8894a 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.expansion {
  margin: 14px 0 0;
  font-family: var(--enc-font-label);
  font-size: 13px;
  letter-spacing: 0.06em;
  color: #b6b0a4;
}
.expansion b { color: var(--enc-amber-soft); font-weight: 500; }
.tagline {
  margin: 22px 0 0;
  font-family: var(--vp-font-family-base);
  font-weight: 400;
  font-size: clamp(19px, 2.2vw, 24px);
  line-height: 1.35;
  color: #ece6da;
}

.actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 32px; }
.btn {
  display: inline-block;
  padding: 0 22px;
  line-height: 44px;
  border-radius: 999px;
  font-weight: 600;
  font-size: 15px;
  text-decoration: none;
  transition: background 0.2s, border-color 0.2s, color 0.2s;
}
.btn.brand { background: var(--enc-amber); color: var(--enc-ink); }
.btn.brand:hover { background: var(--enc-amber-soft); }
.btn.alt { border: 1px solid rgba(232, 161, 58, 0.5); color: var(--enc-amber-soft); }
.btn.alt:hover { border-color: var(--enc-amber); background: rgba(232, 161, 58, 0.08); }

.tally { display: flex; gap: 36px; margin: 44px 0 0; padding-top: 18px; border-top: 1px solid rgba(184, 137, 74, 0.3); }
.tally div { display: flex; flex-direction: column-reverse; }
.tally dt { font-family: var(--enc-font-label); font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #8b93a3; }
.tally dd { margin: 0; font-family: var(--enc-font-display); font-size: 34px; color: var(--enc-amber-soft); }

@keyframes drift { from { transform: scale(1.04) translate3d(0, 0, 0); } to { transform: scale(1.12) translate3d(-1.5%, -1%, 0); } }
@keyframes flicker { 0%, 100% { opacity: 0.85; } 45% { opacity: 1; } 50% { opacity: 0.7; } 55% { opacity: 1; } }
@keyframes mote {
  0% { opacity: 0; transform: translate3d(0, 0, 0); }
  15% { opacity: 0.9; }
  85% { opacity: 0.6; }
  100% { opacity: 0; transform: translate3d(var(--drift), -140px, 0); }
}
@keyframes sweep { from { background-position: 0 -220px; } to { background-position: 0 calc(100% + 220px); } }
@keyframes draw { to { stroke-dashoffset: 0; } }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes line-in { from { opacity: 0; transform: translateX(-4px); } to { opacity: 1; transform: none; } }

@media (max-width: 760px) {
  .vault { min-height: auto; padding-top: calc(var(--vp-nav-height) + 24px); }
  .vault-art img { object-position: 78% 50%; }
  .vault-art::after { background: linear-gradient(180deg, rgba(14, 20, 32, 0.6), rgba(14, 20, 32, 0.92) 55%, var(--vp-c-bg)); }
  .tally { gap: 22px; }
}

@media (prefers-reduced-motion: reduce) {
  .seal .ring { stroke-dashoffset: 0; }
  .seal .e > * { opacity: 1; }
  .dust, .scan { display: none; }
}
</style>
