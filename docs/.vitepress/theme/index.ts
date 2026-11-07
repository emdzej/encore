import { h } from "vue";
import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import HeroVault from "./components/HeroVault.vue";
import ExhibitGrid from "./components/ExhibitGrid.vue";
import GameExhibit from "./components/GameExhibit.vue";
import Gallery from "./components/Gallery.vue";
import HomeBody from "./components/HomeBody.vue";
import GasmWing from "./components/GasmWing.vue";
import "./vault.css";

export default {
  extends: DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      "home-hero-before": () => h(HeroVault),
    }),
  enhanceApp({ app }) {
    app.component("ExhibitGrid", ExhibitGrid);
    app.component("GameExhibit", GameExhibit);
    app.component("Gallery", Gallery);
    app.component("HomeBody", HomeBody);
    app.component("GasmWing", GasmWing);
  },
} satisfies Theme;
