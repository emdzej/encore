---
title: Browser player, releases, docs
---

# Browser player, releases, docs

An ENCORE project ships three things from one `.wasm` module: a static browser player that reads the user's own disc, native bundles for macOS, Linux and Windows that pair the module with a released `gasm-run`, and a VitePress site that explains the game, the port and its status. None of them contains a byte of game data. The pieces are nearly identical across projects — OpenCMR2's play page was copied from OpenNFSPU, OpenI76's will be copied from OpenCMR2 — so this page describes the shared pattern, with the variations that matter.

## The browser player

The player is a static app in `docs/public/play/`, not a VitePress page. Typical files, taken from [OpenSheep](https://github.com/emdzej/opensheep/tree/main/docs/public/play) and [OpenCMR2](https://github.com/emdzej/opencmr2/tree/main/docs/public/play):

| File | Role |
|---|---|
| `index.html` | Page shell, an importmap for `@emdzej/csfs-*`, the "Built for gasm" badge in the footer |
| `play.js` | Starts the worker, runs the frame loop, input, audio, test hooks |
| `data.js` or `cd.js` | Picks a folder or disc image, validates it, imports it into OPFS |
| `saves.js` | Exports and imports saves as a zip |
| `play.css` | Styling |
| `<game>.wasm` | Git-ignored; copied in by `docs/scripts/copy-wasm.sh` |
| `vendor/` | Git-ignored; filled by `docs/scripts/vendor-web.sh` |

In `docs/.vitepress/config.ts`, the nav entry for the player uses `target: "_self"` so that `/play/` is a full page load rather than a client-side route, and `ignoreDeadLinks: [/^\/play\//]` stops the link checker from failing on a page VitePress does not know ([OpenSheep config](https://github.com/emdzej/opensheep/blob/main/docs/.vitepress/config.ts)).

### Worker mode and the canvas

The game runs in gasm's Worker mode (`GasmWorker.start`), so long synchronous calls inside the guest never freeze the page. Two variants exist:

- **`gasm:gl` games** (OpenCMR2, OpenNFSPU, OpenOni) hand the worker a canvas with `canvas.transferControlToOffscreen()` and WebGL 2 runs inside the worker. A canvas transfers only once, so the page makes a fresh canvas for every start ([`play.js`](https://github.com/emdzej/opencmr2/blob/main/docs/public/play/play.js)). This needs gasm 0.14.0 or later.
- **2D games** (OpenSheep, OpenRF, OpenGTA) present frames on the page with gasm's `GlPresenter` (WebGL 2, with the `sharp`, `nearest`, `xbr`, `fsr` and `crt` filters and integer scaling) and fall back to Canvas 2D.

`gasm:gfx` games need WebGPU in workers; OpenBallance runs in a worker when it is available and otherwise falls back to the main thread with the data preloaded into memory. OpenBV, whose content is redistributable, runs on the main thread with `GasmHost` and no csfs.

Worker mode uses transferables only, not `SharedArrayBuffer`, so no COOP/COEP headers are needed — which matters because GitHub Pages cannot set them ([OpenRF notes](https://github.com/emdzej/openrf/blob/main/AGENTS.md)). The `WebAssembly.Module` is compiled once and shared with each worker.

### The frame loop

The page drives frames from `requestAnimationFrame` with a fixed-timestep accumulator ([OpenCMR2 `play.js`](https://github.com/emdzej/opencmr2/blob/main/docs/public/play/play.js)):

```js
const period = 1000 / worker.frameRate;      // the game's own gasm_set_frame_rate
acc += Math.min(now - last, 100);            // clamp after tab switches
const due = Math.min(4, Math.floor(acc / period));
if (!inflight && due > 0) {                  // one batch in flight: the worker sets the pace
  inflight = true; acc -= due * period;
  worker.frames(steps, true, { size, copy }).then(() => { inflight = false; });
}
if (acc > period * 4) acc = 0;               // fell far behind: resync
```

At most four frames run per batch and only the last is shown; the guest can skip drawing catch-up frames (`gl.frame_shown()` returns 0, `gfx.begin_frame` returns 0). Holding Escape for one second stops the game, a tap goes to the game — the same split `gasm-run` uses, and necessary because the browser also uses Escape to leave fullscreen and pointer lock. `pagehide` calls `worker.exit()` so saves are flushed.

### Audio

Audio arrives through `onAudio(samples, rate, channels)` and plays through an inline AudioWorklet ring queue. OpenSheep primes it at 60 ms, caps it at 200 ms and drops the oldest audio beyond that, resamples with gasm's `Resampler` to the context rate, starts the context inside the click that starts the game (autoplay rules), and remembers mute in `localStorage` ([OpenSheep `play.js`](https://github.com/emdzej/opensheep/blob/main/docs/public/play/play.js)).

### Picking and checking the data

The data module offers "Choose the CD's folder" (`showDirectoryPicker`, falling back to `<input webkitdirectory>` in Firefox and Safari) and "Choose a disc image". Before anything runs it validates:

- the folder is the disc root, or one level above it ([OpenSheep `cd.js`](https://github.com/emdzej/opensheep/blob/main/docs/public/play/cd.js));
- required files exist, and the executable has the pinned size — 431,616 bytes for `RFIRE.BIN`, 774,144 for GTA's exe, 2,129,965 for `Porsche.exe`;
- an image is ISO 9660, by reading the primary volume descriptor at sector 16 in both 2048-byte and raw 2352-byte layouts; a `.cue` is detected and refused with a hint to pick the `.bin`.

It then keeps only what the game reads (OpenBallance skips `BIN`, `BUILDINGBLOCKS`, `MANAGERS` and the other program folders; OpenCMR2 drops the installer, manual, Acrobat and DirectX). The game itself still performs the authoritative size and CRC-32 check.

### OPFS import

Two paths are offered:

- **Import and play** copies the files into the Origin Private File System with `@emdzej/csfs-opfs`, streaming each file through a `TransformStream` for progress so no whole file sits in memory. A hidden marker such as `.opensheep-import.json` is written **last**; an import without it is incomplete and is redone. Later visits start immediately. The worker reads through `FileSystemSyncAccessHandle` on demand, with no preloading.
- **Play without importing** passes the picked `File` objects to the worker, which reads them with `FileReaderSync`.

Error handling that proved necessary in OpenSheep: `navigator.storage.persist()` with a timeout (Firefox may never answer), quota errors mapped to a sentence with the size needed (about 490 MB there, about 610 MB for OpenCMR2), and a sync-access-handle lock error mapped to "the imported data is in use by another tab".

### Saves

Saves live in gasm storage — IndexedDB database `gasm`, store `kv`, keys `<namespace>/<key>`. `saves.js` exports them as a zip with one file per key, which is exactly the layout of the desktop store (`<data dir>/gasm/<namespace>/` or `--storage-dir`), so saves move in both directions ([OpenSheep `4bd4efb`](https://github.com/emdzej/opensheep/commit/4bd4efb)). Import is allowed only while no game runs.

::: warning The namespace is the module's file name
gasm derives the storage namespace from the `.wasm` file name. Always ship the module as `<game>.wasm` — in the bundle, on the play page and in `storage: '<game>'` — or desktop and browser saves end up in different stores ([OpenGTA AGENTS.md](https://github.com/emdzej/opengta/blob/main/AGENTS.md)).
:::

### Test hooks

Every player accepts `?hashframes=N`: it runs N frames on virtual time, as fast as possible, with in-memory storage, and prints the same `frames=… video_fnv32=… audio_fnv32=…` line as `gasm-run --headless N`, also exposed as `globalThis.__<game>Result`. `input=` takes the `gasm-run --input` syntax, `size=WxH` fixes the drawable (1280x720 matches headless `gasm:gl` runs) and `autoplay` skips the start button. Unused URL parameters become game parameters.

`tools/web-play-test.mjs` drives the real page in headless Chrome over the DevTools protocol, hands the user's data to the page's own file input with `DOM.setFileInputFiles`, and runs the cases import, later visit (OPFS), play without importing, and disc image; each must print the native runner's hash ([OpenRF](https://github.com/emdzej/openrf/blob/main/tools/web-play-test.mjs), [OpenSheep](https://github.com/emdzej/opensheep/blob/main/tools/web-play-test.mjs)). Three details from those tests:

- The static server must raise its listen backlog (`request_queue_size = 128`): Python's default of 5 reset Chrome's parallel module fetches and failed runs intermittently ([OpenRF `9492abc`](https://github.com/emdzej/openrf/commit/9492abc)).
- `gasm-run` calls `gasm_exit` before printing its hash; a game that presents a frame on exit makes the page and the runner disagree. Compare the page with a Node `GasmHost` before exit, and that host with exit against `gasm-run` ([OpenGTA `102f8be`](https://github.com/emdzej/opengta/commit/102f8be)).
- A game that draws only frames gasm reports as shown needs `batch=1` in hash runs ([OpenOni `702c573`](https://github.com/emdzej/openoni/commit/702c573)).

## Vendoring the runtime

The gasm host and csfs are pinned npm packages in `docs/package.json` (`@emdzej/gasm-host`, `@emdzej/csfs-core`, `-fsa`, `-opfs`). `docs/scripts/vendor-web.sh` copies `gasm-host.js`, `gasm-worker.js`, `webgpu-gfx.js`, `gasm-present.js`, `lib/` and the licence into `public/play/vendor/` and writes a `VERSION` file ([OpenSheep `vendor-web.sh`](https://github.com/emdzej/opensheep/blob/main/docs/scripts/vendor-web.sh)). Some projects also copy `input-script.mjs` renamed to `.js` so every static server serves it as JavaScript. The output is git-ignored. Rule: bump the pin, never edit the copies.

Keep `@emdzej/gasm-host` equal to `GASM_VERSION` in `tools/fetch-gasm-sdk.sh`. When the pin moves, read gasm's CHANGELOG and rerun the browser test: gasm-host 0.4.0 made `gasm-worker.js` import `webgpu-gfx.js`, and without vendoring it the page never started ([OpenRF `4f57aec`](https://github.com/emdzej/openrf/commit/4f57aec)); 0.6.0 changed `GasmWorker.frames` to take `FrameStep`s and the raw keyboard silently stopped reaching the game ([OpenRF `9492abc`](https://github.com/emdzej/openrf/commit/9492abc)).

`docs/scripts/copy-wasm.sh` copies the built module into the play page after checking the `\0asm` magic (`0061736d`), so a failed build cannot publish an HTML error page as a module ([OpenSheep `copy-wasm.sh`](https://github.com/emdzej/opensheep/blob/main/docs/scripts/copy-wasm.sh)).

## Releases

### The release workflow

`.github/workflows/release.yml` triggers on plain semver tags with no `v` prefix (`tags: ['[0-9]+.[0-9]+.[0-9]+']`) — OpenBallance's first tag attempt with a prefix never ran the workflow ([OpenBallance `8a15bad`](https://github.com/emdzej/openballance/commit/8a15bad)). The jobs, as in [OpenCMR2's release.yml](https://github.com/emdzej/opencmr2/blob/main/.github/workflows/release.yml):

1. **wasm** — refuses a tag that differs from `project(<Game> VERSION ...)` in `CMakeLists.txt`, fetches the SDK, builds, writes `<game>-<ver>.wasm` and its `.sha256`.
2. **gasm-macos** on `macos-latest` (for `iconutil` and `codesign`) — packages `<Game> (gasm).app`, signed ad hoc, as `<game>-gasm-<ver>-macos-universal.zip`.
3. **gasm-package** — Linux x86_64 and arm64 `.tar.gz`, Windows x86_64 `.zip`.
4. **smoke tests on each bundle's own OS** — Linux x86_64 on `ubuntu-latest`, arm64 on `ubuntu-24.04-arm`, Windows on `windows-latest`.
5. **release** — attaches everything with `.github/release-notes.md` via `gh release create`.

`workflow_dispatch` builds the same files as artifacts only, versioned `0.0.0-snapshot.<sha>`.

### Bundles

`tools/package-gasm.sh <ver> <platform> <runner dir> <out>` combines the module, the released `gasm-run` fetched by `tools/fetch-gasm-runner.sh <platform>` (same `GASM_VERSION` pin), a launcher from `tools/gasm-bundle/`, licences and a generated README. No game data, and no AOT `.cwasm`: `gasm-run --compile` only targets the host it runs on ([OpenBV notes](https://github.com/emdzej/openbv/blob/main/tools/package-gasm.sh)).

Launchers (`launch-macos.sh`, `<game>.sh` with `--install-desktop`, `<Game>.cmd` plus `.ps1`):

- ask once for the data (AppleScript dialog, zenity or kdialog), validate it, refuse with a reason (the zip itself, half an installer, the wrong exe), and remember it — `~/Library/Application Support/<Game>/data-location` (OpenSheep: `cd-location`);
- map a folder to `--asset-dir` and an image to `--asset cd=`;
- offer `--change-data`, `--forget-data`, `--help`, `--dry-run`, and on macOS Option-at-launch to re-pick;
- log to `~/Library/Logs/<Game>/gasm.log`, `~/.local/state/<game>/gasm.log` or `%LOCALAPPDATA%\<Game>\gasm.log`;
- take an environment override (`OPENCMR2_GAME`, `OPENRF_CD`) that turns a missing location into exit code 2 instead of a dialog, so tests and agents never block. `launch-macos.sh` stays bash 3.2-safe.

ANGLE is needed for `gasm:gl` games. On Linux and Windows it sits next to `gasm-run`. On macOS it goes into `Contents/Resources/angle/` and the launcher passes `--gl-lib`, because `codesign --strict` accepts code only in `Frameworks/` and gasm-run reads SwiftShader's ICD from the ANGLE folder ([OpenNFSPU notes](https://github.com/emdzej/opennfspu/tree/main/tools/gasm-bundle)). The `.app` is signed ad hoc, not notarised; release notes say so and give the first-run steps (right-click, Open, or `xattr -dr com.apple.quarantine`; SmartScreen's "Run anyway"; ALSA's `libasound2t64` on Linux).

App icons come from the project's own mark, drawn by a script (`tools/icon.py`, stdlib-only so CI needs no Pillow in OpenBallance), never from the game's art or a manufacturer's crest.

### Smoke tests

`tools/smoke-gasm-bundle.sh <archive>` runs without game data, so it works in CI:

- expected files, ANGLE libraries, code signature, bundle id, universal runner;
- `gasm-run <game>.wasm --headless 5` exits 1 with "game data not found" — a clean error, not a crash;
- launcher `--help` and `--dry-run` against fake layouts that must be accepted (CD folder with a space in the path, installed folder with an exe of the right size, `.iso` mapped to `cd=`) and refused (empty folder, wrong-size exe, `.cue`), with a scratch `HOME`/`APPDATA`, and a check that no dry run saved a location.

With data (`OPEN<GAME>_SMOKE_DATA=...`), it plays a few hundred headless frames through the launcher and requires the same hash as a direct `gasm-run`. Linux bundles can be tested on a Mac in Apple's `container` (`debian:trixie-slim`, `--arch amd64 --rosetta`). Shellcheck every script in CI; older shellcheck flags `A && B || C` (SC2015) ([OpenRF `d7c4cd6`](https://github.com/emdzej/openrf/commit/d7c4cd6)).

::: warning Don't release early
OpenI76 copied the whole bundle and release tooling from OpenCMR2 on day one, and its AGENTS.md forbids running it, adding it to CI or tagging until the game is ported and the user asks ([OpenI76 AGENTS.md](https://github.com/emdzej/openi76/blob/main/AGENTS.md)). Every project's AGENTS.md says "ask before tagging or pushing".
:::

## The documentation site

### Shape

VitePress in `docs/` (pnpm 10, Node 22), `cleanUrls`, `lastUpdated`, local search, sitemap, edit links, `docs/public/CNAME` for the custom domain. `.github/workflows/pages.yml` builds the module, runs `copy-wasm.sh`, `pnpm install`, `vendor-web.sh` and `pnpm build`, asserts that `dist/play/<game>.wasm`, `dist/play/vendor/gasm/gasm-worker.js` and `dist/CNAME` exist, and deploys to GitHub Pages. Checkout uses `fetch-depth: 0` so `lastUpdated` has history ([OpenGTA pages.yml](https://github.com/emdzej/opengta/blob/main/.github/workflows/pages.yml)).

Sections that recur:

| Section | Contents |
|---|---|
| `guide/` | What it is, status (the honest record), game data, installing, playing, controls, parameters, browser, troubleshooting |
| `howto/` | Build from source, tests, headless runs, extracting a disc, release, reverse engineering |
| `internals/` | Architecture, porting rules, a theory-of-operation essay ([OpenOni `guide/theory.md`](https://github.com/emdzej/openoni/blob/main/docs/guide/theory.md)) |
| `formats/`, `re/` | Byte layouts and address notes |
| `gallery.md` | Port screenshots in a CSS grid |

Projects differ on publishing RE notes. OpenGTA publishes its inventories; OpenSheep moved its notes to `notes/` off the site ([`e9b3ff1`](https://github.com/emdzej/opensheep/commit/e9b3ff1)); OpenCMR2, OpenNFSPU and OpenOni keep `re/`, `formats/` or `internals/` in the repository but exclude them with `srcExclude` ([OpenNFSPU `ba48ea8`](https://github.com/emdzej/opennfspu/commit/ba48ea8)). The common rule: the site is for players; the notes are for agents. Always exclude `README.md` and `AGENTS.md`. Dead links fail the build.

### Screenshots and the hero

Screenshots are frames of the port, made by a script (`tools/screenshots.sh`) from headless `gasm-run --screenshot` with scripted input, converted to JPEG or WebP — never desktop captures (wall-clock frames are not reproducible, [OpenRF `9492abc`](https://github.com/emdzej/openrf/commit/9492abc)) and never the game's own files. OpenOni publishes none at all: its rules count a screenshot as derived data, and its visual identity comes from colours sampled from the game's menus, redrawn. Decide the policy in AGENTS.md before the first one is committed.

The home-page hero is drawn by the project, not taken from the game:

- [OpenSheep's `Flock.vue`](https://github.com/emdzej/opensheep/blob/main/docs/.vitepress/theme/Flock.vue): canvas boids that flee the pointer, a fixed-seed LCG so the flock is the same on every visit, colours from CSS custom properties re-read on theme change, a still frame under `prefers-reduced-motion`, paused when offscreen;
- OpenBV's `BabosBackground.vue`: a 30 KB procedural gasm guest rendering transparent frames into a 2D canvas, the same pattern as gasm's own site;
- OpenCMR2's `hero.svg`, a SMIL animation generated by `tools/hero-svg.py` imitating the menu's ribbon of letters.

A facts pill row (OpenSheep: "4 shepherds, 4 breeds · 23 levels hash-checked · 0 bytes of game data") states the posture in one line.

### The badge

The "Built for gasm" badge is gasm's official artwork, hotlinked unmodified and linked to `https://gasm.emdzej.pl` — never recoloured, stretched or cropped ([gasm badge rules](https://gasm.emdzej.pl/dev/badge)). Light and dark variants on the site, flat in the README:

```md
[![Built for gasm](https://gasm.emdzej.pl/badge/built-for-gasm-flat.svg)](https://gasm.emdzej.pl)
```

```html
<a href="https://gasm.emdzej.pl">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://gasm.emdzej.pl/badge/built-for-gasm-dark.svg">
    <img src="https://gasm.emdzej.pl/badge/built-for-gasm-light.svg" alt="Built for gasm" width="120" height="44">
  </picture>
</a>
```

### Wording

- **Bring your own copy.** Every page that mentions data says the user supplies their own disc or installed game, and that nothing is hosted, bundled or downloaded. Never host or link copies.
- **Never call a game free or freeware without an official source.** OpenGTA's docs had to be corrected to "Rockstar's 2002 re-release (`GTAINSTALLER.zip`)" because there was no source for the freeware claim ([OpenGTA `5206c47`](https://github.com/emdzej/opengta/commit/5206c47)).
- **Don't overstate the state.** One status page is authoritative; other pages link to it rather than restating it. Docs drift is real: OpenGTA's troubleshooting page still denied what its status page claimed, and OpenBV's home page said online play was not there after the server landed.
- **No emojis**, imperative commit subjects, "cross-platform via gasm".
- **Trademark footer.** Name the owner, state that the project contains no original code or assets and is not affiliated, and that it runs from the user's copy — as in [OpenCMR2's config](https://github.com/emdzej/opencmr2/blob/main/docs/.vitepress/config.ts): "OpenCMR2 is released under the GPL-3.0. Colin McRae Rally 2.0 is © 2000 The Codemasters Software Company Limited. OpenCMR2 contains no original code or assets and is not affiliated with Codemasters: it runs the game from your own copy."

## Checklist

- [ ] Play page in `docs/public/play/`; nav entry `target: "_self"`, `ignoreDeadLinks: [/^\/play\//]`.
- [ ] Worker mode; fresh transferred canvas per start for `gasm:gl`, `GlPresenter` for 2D; module compiled once.
- [ ] rAF accumulator, 100 ms clamp, at most 4 frames per batch, one batch in flight, resync when far behind.
- [ ] AudioWorklet queue with prime and cap, started in the click gesture; mute persisted.
- [ ] Folder picker with `webkitdirectory` fallback, image sniffing for 2048 and 2352-byte sectors, `.cue` refused, exe size checked.
- [ ] OPFS import streamed, marker written last, `persist()` with timeout, quota and lock errors in plain words; play-without-import path.
- [ ] Saves zip in the desktop storage layout; module always named `<game>.wasm`.
- [ ] `?hashframes=N`, `input=`, `size=`; `web-play-test.mjs` passes every case against `gasm-run`; test server backlog 128.
- [ ] `@emdzej/gasm-host` pin equals `GASM_VERSION`; vendored copies never edited; CHANGELOG read on every bump.
- [ ] `release.yml` on plain semver tags, tag equals the CMake version, snapshot builds on dispatch.
- [ ] Bundles for macOS universal, Linux x86_64 and arm64, Windows x86_64, each with `.sha256`, smoke-tested on its own OS without data.
- [ ] Launchers remember the data path, validate it, have `--help`/`--dry-run` and an env override that exits 2.
- [ ] ANGLE bundled for `gasm:gl` games (macOS: `Resources/angle` + `--gl-lib`); `.app` signed ad hoc; first-run steps in release notes.
- [ ] Site: CNAME, `pages.yml` asserting the built files, `srcExclude` for README, AGENTS and internal notes.
- [ ] Screenshots only from the port, by script, if the project allows them at all; hero drawn by the project.
- [ ] Official badge, unmodified; "bring your own copy"; no freeware claims; one status page; trademark footer.
- [ ] Ask before tagging or pushing.
