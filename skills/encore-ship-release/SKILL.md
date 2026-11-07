---
name: encore-ship-release
description: Ship an ENCORE game reimplementation built on gasm - the static browser player in docs/public/play (Worker mode, transferred canvas, AudioWorklet, fixed-timestep catch-up cap, folder/disc-image picking with validation, OPFS import with a completion marker, saves zip export), vendoring the pinned gasm-host and csfs npm packages, copy-wasm.sh, the release workflow on plain semver tags producing the wasm plus macOS/Linux/Windows gasm bundles with .sha256 files and per-OS smoke tests, launchers that remember the data path, ANGLE and ad-hoc signing, and the VitePress docs site on GitHub Pages with badge and wording rules. Use when adding or fixing the play page, packaging bundles, cutting a release, or setting up the project site.
---

# Ship: browser player, release, docs site

Everything shipped is built from one `<game>.wasm`. Nothing shipped contains game data. Ask the user before
tagging, pushing or publishing.

## Hard rules

1. Never put game data in `docs/public/`, a bundle or a release. The player reads the user's own copy.
2. Name the module `<game>.wasm` everywhere (bundle, play page, `storage: '<game>'`): gasm derives the
   storage namespace from the file name, and desktop and browser saves must share it.
3. `@emdzej/gasm-host` in `docs/package.json` equals `GASM_VERSION` in `tools/fetch-gasm-sdk.sh`.
4. Vendored runtime files are generated: bump the pin, never edit the copies.
5. Tags are plain semver (`0.1.0`, no `v`) and equal `project(<Game> VERSION ...)`.
6. Don't run release tooling or tag until the game is ported and the user asks.

## Part A - Browser player

Copy `docs/public/play/` from the nearest sibling (`gasm:gl` games: opencmr2/opennfspu; 2D games:
opensheep/openrf/opengta) and rename. Files: `index.html`, `play.js`, `data.js` (or `cd.js`), `saves.js`,
`play.css`; git-ignored `<game>.wasm` and `vendor/`.

VitePress config:

```ts
nav: [{ text: "Play", link: "/play/", target: "_self" }],   // full page load, not a route
ignoreDeadLinks: [/^\/play\//],
srcExclude: ["README.md", "AGENTS.md", "re/**", "formats/**"],
```

`play.js` essentials:

- `GasmWorker.start({ wasm, assets, params, storage: '<game>', onLog, onAudio, keyboard: true, ... })`.
  `gasm:gl` games: `glCanvas: freshCanvas().transferControlToOffscreen()` - a canvas transfers once, make a
  new one per start. 2D games: present with `GlPresenter` (filters, integer scale), Canvas 2D fallback.
  Compile the `WebAssembly.Module` once.
- Frame loop: `period = 1000 / worker.frameRate`; `acc += Math.min(now - last, 100)`;
  `due = Math.min(4, floor(acc / period))`; one `worker.frames(...)` batch in flight; `if (acc > 4*period) acc = 0`.
- Escape: tap goes to the game, hold 1 s stops. `pagehide` calls `worker.exit()`.
- Audio: AudioWorklet ring (prime about 60 ms, cap about 200 ms, drop oldest), resample to the context rate,
  start the context inside the click that starts the game, persist mute.
- Keys: `preventDefault` on everything but browser shortcuts; also cancel Alt keyup (browsers move focus to
  the menu bar); request pointer lock on a gesture and say so when refused.

`data.js` essentials:

1. Pick: `showDirectoryPicker({ id: '<game>-data', mode: 'read' })`, fallback `<input webkitdirectory>`; or a
   disc image via file input.
2. Validate before running: accept the disc root or one level above; required files present; exe size equals
   the pinned size; image = ISO 9660 PVD at sector 16 for 2048 and raw 2352 (16-byte header) layouts;
   `.cue` refused with "pick the .bin".
3. Keep only what the game reads (drop installers, DirectX, manuals, program DLL folders).
4. Import and play: stream each file into OPFS with `@emdzej/csfs-opfs` (`TransformStream` for progress),
   write the hidden marker `.<game>-import.json` last; missing marker = incomplete import, redo it.
   `navigator.storage.persist()` with a timeout. Map quota errors to "needs about N MB" and sync-access-handle
   lock errors to "in use by another tab".
5. Play without importing: pass the picked `File`s (worker reads with `FileReaderSync`).

`saves.js`: export IndexedDB `gasm`/`kv` keys `<game>/*` as a zip, one file per key = the desktop
`<data dir>/gasm/<game>/` layout; import only while no game runs.

Test hooks (required): `?hashframes=N` (virtual time, in-memory storage, prints the `gasm-run --headless N`
hash line, sets `globalThis.__<game>Result`), `input=<gasm-run --input script>`, `size=WxH` (1280x720 for
`gasm:gl` parity), `batch=1` if the game skips unshown frames, `autoplay`. Other params pass to the game.

Vendoring and copying:

```sh
cd docs && pnpm install && scripts/vendor-web.sh && cd ..   # gasm-host.js, gasm-worker.js, webgpu-gfx.js,
                                                           # gasm-present.js, lib/, csfs; writes VERSION
docs/scripts/copy-wasm.sh                                  # checks the 0061736d magic, copies the module
```

Verify:

```sh
node tools/web-play-test.mjs cd <image>   # headless Chrome via CDP, DOM.setFileInputFiles;
                                          # cases: import, later visit (OPFS), no import, disc image
```

Every case must print the same hash as `gasm-run --headless N` for the same input. The test's static server
needs `request_queue_size = 128` (backlog 5 breaks parallel module loads). If the game presents a frame
during `gasm_exit`, compare the page against Node `GasmHost` before exit and that host against `gasm-run`.

On every gasm pin bump: read gasm's CHANGELOG for host API changes, re-vendor, rerun this test.

## Part B - Bundles

```sh
tools/package-gasm.sh <ver> <platform> "$(tools/fetch-gasm-runner.sh <platform>)" out/
# platforms: macos-universal linux-x86_64 linux-arm64 windows-x86_64
```

Contents: `<game>.wasm`, released `gasm-run`, launcher(s), licences (project GPL-3.0, gasm MIT), generated
README. No game data. No `.cwasm` (`gasm-run --compile` targets only its host).

- macOS: `<Game> (gasm).app`, `codesign --sign -` (ad hoc), icon via `iconutil`. ANGLE in
  `Contents/Resources/angle/` and the launcher passes `--gl-lib` (`codesign --strict` allows code only in
  `Frameworks/`). Launcher bash 3.2-safe.
- Linux: `<game>.sh` (+ `--install-desktop`, `.desktop` file), ANGLE next to `gasm-run`; needs ALSA
  (`libasound2t64`).
- Windows: `<Game>.cmd` + `<game>.ps1`, ANGLE next to `gasm-run.exe`.

Launchers: ask once for the data (dialog / zenity / kdialog), validate, refuse with a reason, save to
`~/Library/Application Support/<Game>/data-location` (or XDG / `%APPDATA%` equivalents); folder ->
`--asset-dir`, image -> `--asset cd=`; `--change-data`, `--forget-data`, `--help`, `--dry-run`; log to
`~/Library/Logs/<Game>/gasm.log`, `~/.local/state/<game>/gasm.log`, `%LOCALAPPDATA%\<Game>\gasm.log`; an env
override `OPEN<GAME>_DATA` that exits 2 instead of opening a dialog.

Smoke test without data (CI-safe):

```sh
tools/smoke-gasm-bundle.sh out/<game>-gasm-<ver>-<platform>.<zip|tar.gz>
```

It must check: files present, signature and bundle id (macOS), ANGLE libraries, `gasm-run <game>.wasm
--headless 5` exits 1 with "game data not found", launcher `--help`, `--dry-run` accepting fake valid layouts
(path with a space, exe of the pinned size, `.iso` -> `cd=`) and refusing invalid ones (empty, wrong-size
exe, `.cue`) with exit 2, scratch `HOME`/`APPDATA`, and that no dry run saved a location. With
`OPEN<GAME>_SMOKE_DATA` set, a headless run through the launcher must hash like a direct `gasm-run`.

Linux bundles on a Mac: Apple `container` with `debian:trixie-slim`, `--arch amd64 --rosetta`.

## Part C - Release workflow

`.github/workflows/release.yml` (copy from opencmr2 and rename):

```yaml
on:
  push:
    tags: ['[0-9]+.[0-9]+.[0-9]+']
  workflow_dispatch:          # snapshot artifacts 0.0.0-snapshot.<sha>, no release
permissions:
  contents: write
```

Jobs: `wasm` (check tag == CMake version, build, `<game>-<ver>.wasm` + `sha256sum`), `gasm-macos` on
`macos-latest`, `gasm-package` (Linux x86_64/arm64, Windows), `gasm-smoke-linux` matrix (`ubuntu-latest`,
`ubuntu-24.04-arm`), `gasm-smoke-windows` (`windows-latest`, pwsh), `release` (`gh release create "$tag"
artifacts/* --notes-file .github/release-notes.md`). Every artifact has a `.sha256`.

`.github/release-notes.md`: what the user must own ("your own copy", accepted forms), per-OS start
instructions, first-run warnings (macOS ad hoc signed, not notarised: right-click, Open, or `xattr -dr
com.apple.quarantine`; Windows SmartScreen "Run anyway"; Linux ALSA), the `gasm-run` one-liner with the
minimum gasm version, the play URL, the status page.

Procedure (only when the user asks):

```sh
# 1. bump project(<Game> VERSION x.y.z) in CMakeLists.txt, commit
git tag x.y.z && git push origin x.y.z
```

## Part D - Docs site

VitePress in `docs/` (pnpm 10, Node >= 22): `cleanUrls`, `lastUpdated`, local search, sitemap, edit link,
`docs/public/CNAME`. Sections: `guide/` (status, game data, install, playing, controls, parameters, browser,
troubleshooting), `howto/` (build, tests, headless, release), gallery; internal notes excluded with
`srcExclude`. New pages go in the sidebar; dead links fail the build.

`.github/workflows/pages.yml`: checkout with `fetch-depth: 0`; `tools/fetch-gasm-sdk.sh`; build the module;
`docs/scripts/copy-wasm.sh`; pnpm install; `docs/scripts/vendor-web.sh`; `pnpm build`; then assert:

```sh
test -f docs/.vitepress/dist/play/<game>.wasm
test -f docs/.vitepress/dist/play/vendor/gasm/gasm-worker.js
test -f docs/.vitepress/dist/CNAME
```

then `actions/upload-pages-artifact` + `actions/deploy-pages`.

Site content rules:

- Screenshots: frames of the port from `tools/screenshots.sh` (headless `gasm-run --screenshot` with scripted
  input), JPEG/WebP - or none, if AGENTS.md counts them as derived data. Never desktop captures or game files.
- Hero: drawn by the project (canvas component, procedural gasm guest, generated SVG), no game assets.
- Badge, hotlinked unmodified, linked to gasm:
  `[![Built for gasm](https://gasm.emdzej.pl/badge/built-for-gasm-flat.svg)](https://gasm.emdzej.pl)`
  (light/dark variants `built-for-gasm-light.svg` / `-dark.svg` on the site).
- Wording: "bring your own copy"; never "free"/"freeware" without an official source; no links to copies;
  one authoritative status page, don't overstate; no emojis.
- Footer: licence, trademark owner, "contains no original code or assets", "not affiliated", "runs on gasm".

## Pitfalls

- Tag with a `v` prefix: the workflow never runs.
- Module renamed in a bundle: saves land in a different namespace.
- gasm-host bump without re-vendoring or reading the CHANGELOG: the page silently stops receiving input or
  never starts.
- `python -m http.server` in tests: intermittent module load failures.
- Launcher opening a dialog in CI or an agent run: always provide the env override and `--dry-run`.
- `A && B || C` in scripts: shellcheck SC2015 fails CI.
- Docs drift: status page says one thing, troubleshooting another. Sweep at each release.

## Checklist before asking to tag

- [ ] Version bumped in `CMakeLists.txt`; `release-notes.md` updated.
- [ ] `web-play-test.mjs` passes all cases.
- [ ] Bundles built and smoke-tested locally for at least the host platform.
- [ ] Status page current; no stale "not yet" claims.
- [ ] User asked to tag.

## Further reading

- https://encore.emdzej.pl/guides/shipping
- https://encore.emdzej.pl/guides/gasm
- https://encore.emdzej.pl/guides/agents
