import { defineConfig } from "vitepress";
import { games } from "./theme/games";

const host = "https://encore.emdzej.pl";

export default defineConfig({
  title: "ENCORE",
  description:
    "Engines of Nostalgia, Clean Open REimplementations: old PC games rebuilt from scratch, faithfully, on the gasm runtime.",
  lang: "en-GB",
  cleanUrls: true,
  lastUpdated: true,
  appearance: "dark",
  srcExclude: ["README.md"],
  sitemap: { hostname: host },

  head: [
    ["link", { rel: "icon", href: "/logo.svg", type: "image/svg+xml" }],
    ["link", { rel: "apple-touch-icon", href: "/apple-touch-icon.png" }],
    ["meta", { name: "theme-color", content: "#0e1420" }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:title", content: "ENCORE — Engines of Nostalgia, Clean Open REimplementations" }],
    ["meta", { property: "og:description", content: "Old PC games rebuilt from scratch, faithfully, for every platform yet to come. Bring your own copy." }],
    ["meta", { property: "og:url", content: `${host}/` }],
    ["meta", { property: "og:image", content: `${host}/art/og.jpg` }],
    ["meta", { name: "twitter:card", content: "summary_large_image" }],
  ],

  themeConfig: {
    logo: "/logo.svg",
    siteTitle: "ENCORE",

    nav: [
      { text: "Collection", link: "/games/", activeMatch: "/games/" },
      { text: "Manifesto", link: "/about/", activeMatch: "/about/" },
      { text: "Guides", link: "/guides/", activeMatch: "/guides/" },
      { text: "Agent skills", link: "/skills/", activeMatch: "/skills/" },
      { text: "gasm", link: "/gasm" },
    ],

    sidebar: {
      "/games/": [
        {
          text: "The collection",
          items: [{ text: "All exhibits", link: "/games/" }, ...games.map((g) => ({ text: g.title, link: `/games/${g.slug}` }))],
        },
      ],
      "/about/": [
        {
          text: "About",
          items: [
            { text: "Manifesto", link: "/about/" },
            { text: "Bring your own copy", link: "/about/your-copy" },
            { text: "On AI", link: "/about/ai" },
            { text: "Preservation, elsewhere", link: "/about/elsewhere" },
          ],
        },
      ],
      "/guides/": [
        {
          text: "Start here",
          items: [
            { text: "Overview", link: "/guides/" },
            { text: "Choosing an approach", link: "/guides/approach" },
            { text: "Anatomy of a project", link: "/guides/project-layout" },
          ],
        },
        {
          text: "Reading the original",
          items: [
            { text: "Reverse engineering workflow", link: "/guides/reverse-engineering" },
            { text: "Porting function by function", link: "/guides/porting" },
            { text: "File formats and game data", link: "/guides/formats" },
          ],
        },
        {
          text: "Getting it right",
          items: [
            { text: "Determinism and verification", link: "/guides/verification" },
            { text: "Floating point and the compiler", link: "/guides/fidelity" },
          ],
        },
        {
          text: "The platform",
          items: [
            { text: "Building for gasm", link: "/guides/gasm" },
            { text: "Graphics, audio, input", link: "/guides/platform-layers" },
            { text: "Networking", link: "/guides/networking" },
            { text: "Modern additions", link: "/guides/enhancements" },
          ],
        },
        {
          text: "Shipping",
          items: [
            { text: "Browser player, releases, docs", link: "/guides/shipping" },
            { text: "Working with agents", link: "/guides/agents" },
            { text: "Lessons learned", link: "/guides/lessons" },
            { text: "Theory of operation", link: "/guides/theory" },
          ],
        },
      ],
    },

    socialLinks: [{ icon: "github", link: "https://github.com/emdzej/encore" }],

    editLink: {
      pattern: "https://github.com/emdzej/encore/edit/main/docs/:path",
      text: "Edit this page on GitHub",
    },

    outline: { level: [2, 3] },
    search: { provider: "local" },

    footer: {
      message:
        "ENCORE ships no game code or data — bring your own copy. All games are trademarks of their respective owners; ENCORE is not affiliated with them. Each project is GPL-3.0 and runs on <a href=\"https://gasm.emdzej.pl\">gasm</a>.",
      copyright: "The ENCORE contributors",
    },
  },
});
