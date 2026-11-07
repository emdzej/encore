---
title: gasm — the runtime
---

# gasm — the runtime under every exhibit

[![Built for gasm](https://gasm.emdzej.pl/badge/built-for-gasm-flat.svg)](https://gasm.emdzej.pl)

[gasm](https://gasm.emdzej.pl) ("game assembly") is a portable game runtime. A game is compiled once to a single
WebAssembly module — the guest — and thin per-platform runners give it a small, stable binary interface for video,
audio, input, assets, graphics, networking, saves and the clipboard. The same `.wasm` runs natively on macOS,
Linux and Windows (wasmtime with wgpu or ANGLE), in browsers (WebAssembly with WebGPU or WebGL 2), and headless in
Node, with bit-identical game state on all of them.

It is MIT-licensed, still versioned as an experimental proof of concept (ABI version 0, release 0.16.1 at the time
of writing), and developed alongside the ENCORE ports: several of its features exist because a port needed them.

<div class="enc-shots">

![DOOM on gasm with the sharp filter](/shots/gasm/doom.webp)
![Godot 4.7 3D on gasm:gl](/shots/gasm/godot3d.webp)
![ScummVM playing Beneath a Steel Sky, upscaled with xBR](/shots/gasm/sky.webp)
![The browser player running ScummVM](/shots/gasm/player.webp)

</div>

## The gasm wing

gasm carries two classics of its own: DOOM (doomgeneric, with OPL music) and ScummVM, the reimplementation of the
engines behind LucasArts' SCUMM adventures and many others. Both run in the browser from the
[gasm demos](https://gasm.emdzej.pl/demos/).

<GasmWing />

## Why ENCORE targets it

**One build, every platform.** A port is one `.wasm` plus a runner. Desktop bundles for macOS (universal), Linux
(x86_64 and arm64) and Windows, and the browser player on every project site, all run the same module.

**Determinism as a property of the platform.** The runner drives frames: the guest exports `gasm_frame`, called
once per fixed timestep, with input sampled between calls. That makes every frame a pure step — which is exactly
what a faithful port needs to be tested. gasm's own test suite asserts identical FNV-1a hashes of the video, audio
and GPU-upload streams across wasmtime JIT and AOT, V8, and four operating system targets; the ports do the same
with their own frames. See [Determinism and verification](/guides/verification).

**A sandbox that fits "bring your own copy".** There is no filesystem. Game data is mounted read-only by the
runner — natively with `--asset-dir <your CD folder>` or `--asset cd=<image.iso>`, in the browser by picking a
folder or disc image that is read locally or imported once into the browser's private storage. Network access and
saved files go through the player's consent.

**Graphics APIs the originals can be mapped onto.** `gasm:gl` is OpenGL ES 3.0 with WebGL 2's rules, which is
what Direct3D 7 and OpenGL 1.x games are translated to; `gasm:gfx` is a WebGPU subset; software-rendered games
just present a framebuffer. See [Graphics, audio, input](/guides/platform-layers).

## Not a lock-in

Every ENCORE port keeps all calls into gasm in a single backend file; the rest of the code is portable C. A
native build of the same code already exists in each project for tools, sanitizers and debuggers, and a fully
native platform backend — SDL, a console SDK — is a contained piece of work where WebAssembly performance is not
enough (wasm runs roughly 1.5–1.6× slower than native in gasm's measurements).

## Using it

```sh
gasm-run opengta.wasm --asset-dir /path/to/your/game     # a folder
gasm-run openrf.wasm --asset cd=ReturnFire.iso           # a disc image
```

- Documentation, demos and the browser player: [gasm.emdzej.pl](https://gasm.emdzej.pl)
- Source and releases: [github.com/emdzej/gasm](https://github.com/emdzej/gasm)
- Writing a guest for ENCORE: [Building for gasm](/guides/gasm)

The badge, for projects built on it:

```md
[![Built for gasm](https://gasm.emdzej.pl/badge/built-for-gasm-flat.svg)](https://gasm.emdzej.pl)
```
