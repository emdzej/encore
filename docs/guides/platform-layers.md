---
title: Graphics, audio, input
---

# Graphics, audio, input

The ported game code never calls DirectDraw, Direct3D, OpenGL 1.x, DirectSound, Miles, FMOD or DirectInput again; it calls emulations of them that sit on gasm's 2D present, `gasm:gl` (OpenGL ES 3.0 with WebGL 2's rules) or `gasm:gfx` (a WebGPU subset), one pushed audio stream, and raw keyboard, pointer and pad state. The aim is that the layer above — the game, and often the vendor's own driver or middleware ported with it — sees the API it was written for, with the defaults, structure layouts, capabilities and quirks of one plausible machine of the time. This page covers the techniques the ENCORE projects used, and what each cost. For the frame model and backend file, see [Building for gasm](/guides/gasm).

## The shape of a platform layer

Two rules recur:

1. **Split the API-recording layer from the back end.** [cmr2](/games/cmr2)'s [`src/render/d3d7.c`](https://github.com/emdzej/opencmr2/blob/main/src/render/d3d7.c) records device state with D3D7 defaults and D3D7 structure layouts, GPU-free, so native tests can check it (`tests/d3d7_test.c`: 27 texture records, 30 batches, 672 triangles for one scene). [`src/render/gl_dev.c`](https://github.com/emdzej/opencmr2/blob/main/src/render/gl_dev.c) is the GL back end. [nfspu](/games/nfspu) has a fake recording THRASH driver for EAGL tests.
2. **Port the original's own layer above the emulation, quirks included.** [cmr2](/games/cmr2) ports the game's render-state cache (`rstate.c`), including the quirk that the first `Render_AlphaBlend(0)` does nothing because the cache starts at 0 while the device state is on. [nfspu](/games/nfspu) ports EA's THRASH driver DLL itself. [gta](/games/gta) reimplements the Miles calls the game makes and ports the game's sound modules on top.

## 2D games: DirectDraw to a framebuffer

Software-rendered games keep a framebuffer in the original's pixel format and convert only at present, through `gasm_video_present(rgba, w, h, stride)`. The runner scales and letterboxes.

| Project | Original surface | Port |
|---|---|---|
| [rf](/games/rf) | DirectDraw 8-bit paletted, 3DO cel engine in software | 640×480 8-bit framebuffer through the palette to RGBA; movie frames presented at 320×240 RGB — mixed-size presents are fine on gasm |
| [sheep](/games/sheep) | DirectDraw 640×480 16-bit (rgb565/555) | rgb565 framebuffer; `plat_present` widens 5/6-bit channels by bit replication |
| [gta](/games/gta) | SciTech MGL over DirectDraw, DMA's `Poly_*` rasteriser | 640×480 32 bpp (`0x00RRGGBB` after converting palettes with the surface's shifts) |
| [i76](/games/i76) | v1.0 pure software renderer into an 8-bit DirectDraw surface | 8-bit frame + palette expanded to RGBA in the guest |

Palette details are behaviour. [rf](/games/rf)'s sprite pixels index the DirectDraw `LOGPALETTE`, with game colours at **+10** because slots 0–9 and 246–255 are Windows system colours; its fade is subtractive (`c - ((0x10000-b)>>8)`), not multiplicative. [i76](/games/i76)'s gamma rows are `pow(i/255, 1/g)*255` truncated, so even gamma 1.0 is not identity. `gasm_video_set_aspect(4, 3)` tells the runner the display aspect for non-square pixel modes.

Scaling is the runner's job: `gasm-run --filter sharp|nearest|xbr|fsr|crt` and `--integer-scale`, and the same filters in the browser through `gasm-present`. [rf](/games/rf), [sheep](/games/sheep) and [gta](/games/gta) offer them with no change to the game.

## Direct3D 7 on GLES 3

### The device emulation ([cmr2](/games/cmr2))

[cmr2](/games/cmr2)'s back end (adapted from [nfspu](/games/nfspu)'s THRASH device) implements the flip chain; a two-stage texture combiner with every `D3DTOP` up to `DOTPRODUCT3` plus bump ops 22/23 and every `D3DTA` with modifiers; alpha test; linear/exp/exp2 vertex fog from eye depth or range; the pre-transformed `XYZRHW` path; and D3D7 T&L in the vertex shader — row vectors, normals by inverse-transpose of world-view, point/spot/directional lights with range, attenuation and cone, four material sources, local/infinite viewer specular, generated texture coordinates with texture matrices. Render and texture-stage state form a shader key.

- Pre-transformed vertices are mapped by D3D's viewport rule to the same screen coordinates as transformed ones, in a form linear in clip space so GL clipping stays exact.
- All textures are decoded on the CPU to RGBA8, one mip level. DXT1/DXT5 are decoded with bit-replicated endpoints and truncated 1/3, 2/3 mixes.
- Display modes are emulated by replaying DirectDraw's mode-enumeration callback rules over a fake 64 MB card's mode list ([`src/render/display.c`](https://github.com/emdzej/opencmr2/blob/main/src/render/display.c)).
- Not reproduced, and documented: 16-bit surface formats and their banding, mip chains.

### Capability bits

Emulate one plausible card and verify each caps bit's struct offset in the disassembly. [cmr2](/games/cmr2) misread `0x6e0c34` as `DRAWPRIMITIVES2EX`; it is `ZBUFFERLESSHSR` in `dpcTriCaps.dwRasterCaps` (dword +0x44 of `D3DDEVICEDESC7`). Reporting it made the game skip its depth clears and broke the service-area car ([`90b9f07`](https://github.com/emdzej/opencmr2/commit/90b9f07)). Also from gasm's DirectX 7 guide: `D3DRECT` is x1, y1, x2, y2.

### Porting the vendor's driver ([nfspu](/games/nfspu))

[nfspu](/games/nfspu) renders only through THRASH, EA's driver ABI, loaded from `dx7z.dll`. The port ports the driver: [`src/render/thrash.c`](https://github.com/emdzej/opennfspu/blob/main/src/render/thrash.c) is the DLL's batching, software cull, state recording and fog tables; [`src/render/thrash_dev.c`](https://github.com/emdzej/opennfspu/blob/main/src/render/thrash_dev.c) is a small Direct3D 7 device on GLES 3 beneath it ([docs/re/thrash.md](https://github.com/emdzej/opennfspu/blob/main/docs/re/thrash.md)).

- **Pre-transformed TL vertices** (FVF 0x1c4, 32 bytes): `x, y + 0.5` (D3D7 pixel centres on integer coordinates), `w = 1/rhw` for perspective-correct interpolation, z remapped to −1..1, and the **viewport as a scissor** because pre-transformed vertices are not moved by the viewport.
- **One uber fixed-function shader**: two texture stages with `D3DTOP_*`/`D3DTA_*` ops, specular add, fog (table modes from pixel z, else specular alpha), alpha test. Flat shading is the first vertex's colour, done by spelling triangles out.
- **Batcher quirks kept**: a 253-vertex buffer flushed on primitive change, overflow or state change; depth bias added per vertex and reset each EndScene; points adjusted in place so a redrawn point gains bias again; `clearwindow` does not flush, so queued triangles land on top of the clear.
- **A fixed card profile**: GeForce 256-class (subtype 0x12), 2 stages, stencil, table and vertex fog, specular, anisotropic and trilinear filtering, no W-buffer, no AA, 32 MB. Pick the card the game's readme targets, so card-dependent branches go the expected way.
- **16-bit modes use RGB565 surfaces**, keeping the original's banding; 32-bit modes RGB8. Rows top-first so locks and `glReadPixels` agree.
- **Readbacks are expensive.** Movies lock the back buffer every frame; `glReadPixels` each time dropped below 60 fps and starved audio. The fix tracks surfaces cleared whole or written whole by unlock and serves the lock from a CPU copy ([`74e6dfa`](https://github.com/emdzej/opennfspu/commit/74e6dfa)).
- **Know the runner's readback behaviour.** The lens flare reads 4×4 pixels at the sun every 200 ms; gasm-run 0.16 returns pixels from `read_pixels` only with `--screenshot`, otherwise zeros, so the flare shows full strength.
- **Mirrored matrices flip winding.** Car model matrices have determinant −1, so the original swaps cull modes around cars.

### Direct3D 7/8 on `gasm:gfx` ([ballance](/games/ballance))

[ballance](/games/ballance) targets the WebGPU-style module: one WGSL shader with per-frame and per-draw uniforms through dynamic offsets into a ring, a pipeline cache keyed by blend, Z, cull, alpha test, fog and stage count, and D3D7 per-vertex lighting. Two traps: row-vector matrices uploaded as-is read as their transpose in WGSL, so `M * v` computes `v * M`; and DX8 blends in gamma space, so do not use `-srgb` formats. Free GPU objects for destroyed and replaced resources or memory grows per level ([`353bc4a`](https://github.com/emdzej/openballance/commit/353bc4a)).

## OpenGL 1.x fixed function on GLES 3

[bv](/games/bv) is a source port whose engine draws with immediate mode, display lists, `glPushAttrib` and `gluSphere`. [`src/port/gl1/gl1.cpp`](https://github.com/emdzej/openbv/blob/main/src/port/gl1/gl1.cpp) provides real GL 1.x entry points so the vendored code calls `glBegin` unchanged ([README](https://github.com/emdzej/openbv/blob/main/src/port/gl1/README.md)):

- **T&L on the CPU per the specification**: modelview, 8 lights with Blinn specular, local/infinite viewer, spot, attenuation, colour material, `RESCALE_NORMAL`/`NORMALIZE`; per-vertex fog; projection; texture matrix. The GPU gets clip-space vertices and one shader. The maths is wasm float, so it is identical on every runner.
- Batches break only on rasteriser-state changes, never on matrix, light or material changes.
- Display lists record and replay, including nested `glCallList` and `glCallLists` with `glListBase` resolved at execution.
- An **offscreen RGBA8 + D24S8 framebuffer**, because the game blends with `GL_DST_ALPHA` and the default framebuffer has no alpha; `gl1_end_frame` blits and forces opaque.
- Level 0 of each texture kept on the CPU for `glGetTexImage`; `gluBuild2DMipmaps` and `gluSphere` tessellation as SGI GLU; an incomplete texture turns texturing off (GL 1.x), not WebGL's black.
- Approximations are listed: `GL_CLAMP` as `CLAMP_TO_EDGE`, no borders, points, stipple, texgen or clip planes, `GL_EXTENSIONS` empty.
- Do not link gasm's `gasm_gl.c` alongside: its GLES names clash with the GL 1.x ones; call the `gasm_gl_*` imports directly.

[oni](/games/oni) loads OpenGL 1.1 at run time and hands GL already-projected points from its own software geometry engine. The port reproduces that pipeline on one GLES 3 shader in [`src/render/gl_dev.c`](https://github.com/emdzej/openoni/blob/main/src/render/gl_dev.c): textured vertex-coloured triangles, alpha test by discard, blending, depth, and linear fog on `gl_FragCoord.z*2-1`.

## GL performance

Original D3D-era code sets the whole state per draw. Natively that was fine; under WebGL it dominated. [cmr2](/games/cmr2)'s sequence, released as 0.1.1 "the race's stutter fixed":

| Commit | Change | Effect |
|---|---|---|
| [`0a0a3fc`](https://github.com/emdzej/opencmr2/commit/0a0a3fc) | GL state shadow sending only deltas | ~60 calls per draw, 13,400 per frame → ~900; 2× native speed; browser frame skipping fixed |
| [`eff6984`](https://github.com/emdzej/opencmr2/commit/eff6984) | dirty-range vertex buffer uploads via `glBufferSubData` | re-uploads only changed vertices |
| [`654615d`](https://github.com/emdzej/opencmr2/commit/654615d) | triangle queue and car shading upload only written vertices; per-frame textures (mud, movies) via `glTexSubImage2D` | |
| [`4cd5427`](https://github.com/emdzej/opencmr2/commit/4cd5427) | indices kept on the device; VAOs | |

Build the state cache into the GL back end from day one. gasm 0.16.0's own cache in [`gasm_gl.c`](https://github.com/emdzej/gasm/blob/main/sdk/c/src/gasm_gl.c) records the rules ([`905e086`](https://github.com/emdzej/gasm/commit/905e086)): fixed tables (a growing table walked on each delete made Godot 15× slower), forget deleted names by generation counter, never cache uniforms looked up with `[`, never skip an upload, and verify with pixel-identical screenshots, not only hashes. Upload textures as RGBA8 — RGB8, L8 and LA8 stall ANGLE by 10–60 ms.

## Audio

### One mixer, original semantics

Every project replaces the sound API with one guest-side mixer producing interleaved float frames for `gasm_audio_push`, and ports the game's sound layer on top with its exact volume and priority arithmetic.

- **DirectSound** emulations: [cmr2](/games/cmr2)'s [`src/audio/dsound.c`](https://github.com/emdzej/opencmr2/blob/main/src/audio/dsound.c) (create, duplicate, lock, play looped/once, stop, volume in 1/100 dB, pan, frequency) under the original's 200-sound, 32-voice layer; [sheep](/games/sheep)'s 256 voices with `DuplicateSoundBuffer` sharing PCM and volume `ftol(-(7000 − 7000·base·vol·group))`; [oni](/games/oni) keeps `ds_*` functions in DirectSound units so volume and pan curves match.
- **Middleware replicas**: [gta](/games/gta) reproduces the Miles 3.6B software mixer (pan table `T[p] = min(2p, 128)`, no resampling within 1% of unity, point sampling, output high byte for the 8-bit device format); [nfspu](/games/nfspu) ports EA SND 4.1g with its node chains and Catmull-Rom resampler; [bv](/games/bv) implements only the `FSOUND_*` calls it uses ([`src/port/fmod/`](https://github.com/emdzej/openbv/tree/main/src/port/fmod)) and lists the behaviours taken from documentation rather than verified.
- **Quirks stay**: [sheep](/games/sheep)'s duplicates start at base volume 0, so every duplicate plays at −70 dB; [rf](/games/rf)'s sample-rate field is never written, so frequency ratios evaluate to 0; [bv](/games/bv)'s `FSOUND_2D` is sticky; [gta](/games/gta)'s `Music_PlayTrack` makes offsets only even, so a 16-bit stereo track at offset 2 mod 4 plays with channels swapped.
- **Determinism deviations are named**: [gta](/games/gta) carries the resampling phase across mix buffers (Miles restarted it) so output does not depend on render chunking.

### Pull audio for the time that passed

The original's DirectSound thread filled ahead of the play cursor. On gasm the mixer is pulled once per frame. Push the samples for the **runner time elapsed since the last frame**, not `rate / fps`, or a window's vsync drift drains or floods the queue for seconds ([cmr2](/games/cmr2) [`0cf854a`](https://github.com/emdzej/opencmr2/commit/0cf854a), following [nfspu](/games/nfspu)):

```c
double now = gasm_time_ms();
static double last_ms = -1;
audio_acc += 0 <= last_ms ? (now - last_ms) * APP_AUDIO_RATE / 1000.0 : APP_AUDIO_RATE / frame_hz;
last_ms = now;
if (audio_acc > 2048) audio_acc = 2048;   /* a longer gap is lost */
unsigned n = (unsigned)audio_acc;
audio_acc -= n;
app_audio(audio_buf, n);
gasm_audio_push(audio_buf, n);
```

Headless, `gasm_time_ms` is frame-derived, so hashes are unchanged. Projects with a fixed frame budget carry the remainder instead: [bv](/games/bv) computes `n = (rate + rem) / 60; rem = (rate + rem) % 60` so 22,050 Hz averages exactly 367.5 frames; [rf](/games/rf) alternates 705 and 706 frames at 62.5 Hz.

[gta](/games/gta) goes further: **one clock for pacing — the audio rendered** ([`5ebdbb6`](https://github.com/emdzej/opengta/commit/5ebdbb6)). Its 70 Hz Miles timer counts rendered audio (one tick = 315 frames at 22,050 Hz), so simulation and sound stay locked and the game core's own timer copy disappears. [rf](/games/rf) and [sheep](/games/sheep) slave movie video to audio frames rendered so far, which makes movie playback reproducible in headless hashes.

### Underruns and runner bugs

The runner resamples, keeps about 60 ms of latency, drops the oldest audio when the guest runs ahead and plays silence on underrun. gasm-run 0.16.0 discarded the samples it was waiting for while rebuffering after an underrun, so audio stayed silent after a long load frame. [cmr2](/games/cmr2) and [nfspu](/games/nfspu) pushed silence after a gap as a labelled workaround ([`f50c634`](https://github.com/emdzej/opencmr2/commit/f50c634)) and removed it when 0.16.1 fixed the runner ([`3fbc27d`](https://github.com/emdzej/gasm/commit/3fbc27d)). `--param audiolog=1` in [cmr2](/games/cmr2) logs peak, mean and RMS every 5 s to check sound headless; `GASM_AUDIO_LOG=1` logs the runner's queue.

### Music streams and CD audio

- Stream large tracks through positional VFS reads: [rf](/games/rf)'s single 223 MB `SCORE.WAV` with an 18-entry track table of byte ranges relative to the `data` chunk; [gta](/games/gta)'s tracks up to 58 MB in 64 KB `vfs_read_at` reads; [cmr2](/games/cmr2)'s MS-ADPCM `.adp` with its own decoder replacing ACM.
- Decode compressed music as a stream from memory: [bv](/games/bv)'s 4.9 MB `Music.ogg` through stb_vorbis would be about 54 MB decoded.
- **CD audio** ([i76](/games/i76), planned): disc 2 is mixed mode, track 1 data and tracks 2–17 Red Book audio. Converting the BIN to ISO throws the music away; keep the BIN/CUE. The plan is a `vfs_cue.c` exposing tracks as raw 44.1 kHz s16 stereo ranges, falling back to FLAC/Ogg/WAV, then to silence logged once, with the MCI play/loop/aux-volume calls ported on top.
- `gasm:media` (0.16.0) lets the runner fetch, decode and play an https audio stream mixed after the game's audio and never hashed.

## Input

### Raw keyboard as DirectInput scan codes

`gasm_input_mode(GASM_INPUT_KEYS_RAW)` turns off gasm's keymap and gives the game a 32-byte key bitset keyed by W3C `KeyboardEvent.code`, plus ordered down/up events. A table maps those to **DirectInput DIK scan codes** so the original's bindings, rebinding screens and config files work unchanged — physical keys, layout-independent. [ballance](/games/ballance)'s `DIK_OF` table in [`src/platform_gasm.c`](https://github.com/emdzej/openballance/blob/main/src/platform_gasm.c) was reused verbatim by [i76](/games/i76) and inherited by [gta](/games/gta). Extended keys follow the game's convention ([oni](/games/oni): 0x80 set for extended, Up 0xc8; [gta](/games/gta): +0x80 again on release).

### Do not lose short presses

- Latch presses between game ticks: [bv](/games/bv) reports `keysDI | latchedDI` until the 30 Hz engine reads them, and the same for mouse buttons; [sheep](/games/sheep) uses `key_events` for ordered presses and reports them to the first poll of a frame.
- Count "pressed since last frame" for mouse clicks: [nfspu](/games/nfspu) lost clicks within one frame when it read only held state ([`c0e6cf0`](https://github.com/emdzej/opennfspu/commit/c0e6cf0)).
- Backends must tolerate several polls per frame when state changes consume edges ([rf](/games/rf)).

### Pointer and text

- DirectInput mice are relative: hand the game `cursor - last` so its accumulated position tracks the absolute pointer exactly; map the pointer through the letterbox into game pixels. Wheel: DirectInput is 120 per notch up-positive, gasm +1 per notch down, so `-w*120` ([bv](/games/bv)).
- `GASM_INPUT_POINTER_HIDDEN` when the game draws its own cursor; `POINTER_LOCKED` for mouselook ([oni](/games/oni), [sheep](/games/sheep)).
- Text input gives printable characters plus `\b` and `\n`: synthesise Esc and Tab from key events, map `\n` to `\r`, keep only the game's charset ([bv](/games/bv) keeps Latin-1 0xA0–0xFF for Windows-1252).

### Gamepads and two players

- Present pads as the original's devices: [nfspu](/games/nfspu) shows gasm's pads as DirectInput joysticks (keyboard 0, mouse 1, pads from 2) with bindings in `fe.txt` ([`495e36a`](https://github.com/emdzej/opennfspu/commit/495e36a)); [ballance](/games/ballance) maps pad buttons onto DIK codes (A/Start Enter, B Esc, X Space); [bv](/games/bv) maps the standard layout onto the DirectInput joystick convention; [sheep](/games/sheep) uses the first connected `gasm_gamepad` slot.
- `_Static_assert` that the core's `PAD_*` bits equal `GASM_BTN_*` ([gta](/games/gta), [sheep](/games/sheep)).
- Two players on one keyboard keep the original's split: [rf](/games/rf) P1 WASD+HJK+QE, P2 numpad; [cmr2](/games/cmr2) arrows and keypad. [rf](/games/rf) also maps pads 0/1 to P1/P2.
- Digital directions may need analogue magnitudes: [rf](/games/rf)'s input word needs `0xff` magnitude bytes or vehicles move at 1/256 speed.
- Force feedback and rumble are not in gasm; [cmr2](/games/cmr2) and [nfspu](/games/nfspu) document them as left out.

### Mode switches and Escape

[cmr2](/games/cmr2)'s input has a menu mode and a race mode; omitting the tiny switch call in the loading state made Esc arrive as the menu's 0x20 rather than the pause's 0x400, so Esc did not pause ([`4f532dc`](https://github.com/emdzej/opencmr2/commit/4f532dc)). Port every state's side effects in order. Across the collection, a short Esc goes to the game and holding Esc for one second quits the runner, which also sidesteps browsers eating Esc in fullscreen.

## Window title

`GASM_TITLE("Return Fire")` in the backend file writes the `gasm.title` custom section, which runners use as the default window title ([gasm `spec/gasm.h`](https://github.com/emdzej/gasm/blob/main/spec/gasm.h)). `gasm_set_title` changes it at run time; the capabilities manifest can also carry a name.

## Checklist

1. Split each graphics API into a GPU-free recording layer with the API's defaults and layouts, and a back end; test the recording layer natively.
2. Port the original's own state cache, driver or middleware layer above the emulation, with its quirks.
3. 2D games: keep the original pixel format in the framebuffer, convert at present, leave scaling to gasm's filters.
4. D3D-era 3D: implement fixed-function T&L, the two-stage combiner, fog and alpha test in one shader keyed by state; map pre-transformed vertices with the D3D pixel-centre rule; viewport as scissor.
5. Emulate one card's caps; verify every caps bit's offset in the disassembly.
6. Add a GL state shadow, partial buffer and texture uploads, device-side indices and VAOs from the start; upload RGBA8; verify with screenshots.
7. Serve locks and readbacks from CPU copies; know what the runner returns for reads headless.
8. Put all sound on one mixer pulled per frame for elapsed runner time, capped; carry fractional remainders.
9. Stream music through positional reads; keep BIN/CUE for mixed-mode CDs.
10. Map raw keys to DIK scan codes; latch presses between ticks; count clicks pressed since last frame.
11. Convert absolute pointer to relative deltas and map through the letterbox; handle wheel sign and scale.
12. Present pads as the original's devices; static-assert pad bit equality; keep the original's two-player keyboard split.
13. Set the window title with `GASM_TITLE`.
