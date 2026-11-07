---
title: Babo Violent 2
game: bv
---

# Babo Violent 2

<GameExhibit />

Babo Violent 2 is a top-down multiplayer shooter in which every player is a ball — a babo — rolling round small arena
maps with guns, grenades and, in capture the flag, flags to carry home. It was RndLabs' freeware game, and version 2.11
was the last release they shipped. It was built for playing against other people, through dedicated servers and a
master list of games, and the original master server no longer answers; without one, the Game Browser has nothing to show.

It is also the odd one out in this collection. Its C++ source, © 2012 bitHeads inc., was released under the GPL-3.0 by David
St-Louis (Daivuk), so openbv involves no reverse engineering of the client. The game and engine code are compiled as they
were written, and only the Windows platform beneath them — window, loop, input, OpenGL, FMOD, sockets, files, the embedded
database — is replaced. The genuinely new work is a multiplayer server in Go, written from a specification of the original
C++ server and checked against it bit for bit.

openbv is playable: menus, hosting a game in-process, local play, sound and the browser player all work, and the Go server
has reached its fifth milestone, covering every game type, votes, bans, in-game admins, an admin web page and a master list.
What is still missing is recorded honestly in the project's status page: gamepad buttons, Game Browser pings, LAN search, the
remote admin tool, the account server, most of the Prozac mod's changes, and other players joining a game hosted from a
client.

## How it was rebuilt

The reference is the Windows ProRelease build of 2.11 (the `_PRO_` configuration); where the source has Windows and Linux
branches, Windows behaviour wins. The upstream source was imported at commit `7171c84`, normalised to UTF-8 and LF line
endings, in a [commit of its own](https://github.com/emdzej/openbv/commit/eb9a62d), so that the [port
commit](https://github.com/emdzej/openbv/commit/a7a4ffc) that follows shows exactly what changed and nothing else. Every
in-source change is marked `OPENBV_GASM`, and there are twelve such markers across roughly 99,500 lines of vendored game and
engine code.

The original was Win32 with fixed-function OpenGL 1.x, DirectInput, FMOD 3.75, Daivuk's own baboNet networking DLL, SQLite
and libcurl, with the "DukZeven" engine split across several DLLs. All of that now lives in `src/port/`, about 9,600 lines
(of which some 3,100 are a generated file of embedded assets): a GL 1.x implementation on gasm's GLES 3, an FMOD 3 shim over
a software mixer, baboNet over WebSockets, file calls wrapped at link time, and a reader for the SQLite file format standing
in for SQLite itself. The original `WinMain` is cut in three — initialisation, one frame, shutdown — so that gasm's runner
owns the loop, while the game keeps its own 30 Hz tick inside a 60 Hz frame.

The server, in `server/`, is about 13,900 lines of Go, including some 2,700 lines of tests. It was written from
[design/server.md](https://github.com/emdzej/openbv/blob/main/design/server.md), a 2,305-line specification of the C++ server
with file-and-line citations: the authority split between client and server, the 21-step frame order, every message, the
handshake, map download, the RNG, eighteen quirks to keep and a table of bugs not to keep. The public history is short —
sixteen commits over 9 and 10 October 2026 — and the commits are written as small design documents, with their verification
quantified.

## Notable stories

### Two copies of the same classes

On Windows the engine DLLs and the game each carried their own `CString`, vector and matrix classes, and they were not the
same: the engine's `EPSILON` was 0.01 and the game's 0.0001, and one parsed integers with `sscanf("%i")` where the other used
`atoi`. Link both into a single WebAssembly module and the one-definition rule quietly merges them, so one side gets the
other's maths. The fix keeps both: the engine is compiled with a forced include of
[engine_names.h](https://github.com/emdzej/openbv/blob/main/src/port/include/engine_names.h), which renames its copies
(`CString` becomes `dkString`, and so on), and the functions that used to cross the DLL boundary get a fixed link name on
both sides through [openbv_link.h](https://github.com/emdzej/openbv/blob/main/src/port/include/openbv_link.h). The layouts
are identical, so nothing else had to change.

### OpenGL 1.x, done on the CPU as the spec says

The game draws in immediate mode, with display lists, attribute stacks and a `gluSphere` for every babo. Rather than
translate those calls into something modern, [src/port/gl1](https://github.com/emdzej/openbv/tree/main/src/port/gl1) provides
real GL 1.x entry points and performs transform and lighting on the CPU per the specification — eight lights, Blinn specular,
spot lights, attenuation, colour material, three fog modes — handing the GPU clip-space vertices and a single shader. Because
the maths runs in WebAssembly, it is identical on every runner. Smaller faithfulness details matter too: the game blends with
destination alpha and copies the screen into textures, so it draws into an offscreen framebuffer with an alpha channel;
mipmaps follow SGI GLU's rounding; an incomplete texture turns texturing off as GL 1.x does, rather than drawing WebGL's
black.

### A WebSocket transport that is faithful by accident

gasm guests have only WebSockets: reliable, ordered, binary, and unable to listen. That looks like a poor fit for a game
whose networking layer offered TCP, UDP and a peer-to-peer UDP channel. Reading the source showed that `Server::host` creates
its baboNet server with UDP disabled, so every "UDP" message in a real game already travelled on the reliable TCP stream. A
WebSocket transport is therefore faithful to what players actually ran.
[babonet_gasm.cpp](https://github.com/emdzej/openbv/blob/main/src/port/babonet_gasm.cpp) keeps the semantics the game depends
on as well as the bytes: one event per `bb_serverUpdate` call, connections admitted only at half-second checks, the first
client's packets drained before the next. Hosting a game builds an in-process loopback server that the game's own client
reaches through `127.0.0.1`.

### A server checked bit for bit, in another language

The second milestone, [deathmatch combat](https://github.com/emdzej/openbv/commit/11ae1ce), is where the Go server had to
agree with the C++ one to the last bit. Clients recompute scores from the hits the server reports, so the server must produce
exactly the same hits. The original functions are extracted from the C++ source and compiled natively in
[server/internal/reftest](https://github.com/emdzej/openbv/tree/main/server/internal/reftest), producing golden data the Go
code is tested against. Matching them required two things: rounding each product to float32 explicitly, because Go fuses
multiply-add on arm64, and porting musl's `sinf` and `cosf` to Go, because a correctly rounded cosine differs in the last bit
and `(short)(x*100)` amplifies that into a different coordinate. A recorded session from the C++ listen server was replayed
against the Go code: 38 of 41 shots matched byte for byte, and the other three were skipped because the muzzle sat inside a
wall, which the log cannot reveal. A later commit made the golden tests [compare NaNs as
NaNs](https://github.com/emdzej/openbv/commit/b790e1c), after data recorded on arm64 failed on x86-64 over NaN sign and
payload bits.

### Misleading indentation, and a hostname that does not fit

Two smaller lessons came from the original's own text. The specification first got the frame order wrong, because CTF and
auto-balance sit inside the `GAME_PLAYING` block and the original's indentation makes that easy to miss; it was corrected
with [milestone 4](https://github.com/emdzej/openbv/commit/ffc4535). And the master list's `ip` field is sixteen bytes,
exactly one too few for `openbv.emdzej.pl`. [Milestone 5](https://github.com/emdzej/openbv/commit/7172f85) patched the client
so that an empty address means the master's own host and grew the buffer from 16 to 256 bytes. The same milestone dropped
some of the original's behaviour on purpose: passwords sent in clear to every browsing client now go out as `*`, map names
are confined to the map folder, and each deviation is listed in the specification's §8.4.

### Fidelity for gameplay, a dated carve-out for presentation

openbv's [AGENTS.md](https://github.com/emdzej/openbv/blob/main/AGENTS.md) states that fidelity is the product for gameplay,
with an explicit exception for presentation recorded with the date of the user's decision. The UI canvas widened from 800×600
to 1066×600 units for 16:9, and the menus were [redesigned](https://github.com/emdzej/openbv/commit/cfde746) with flat
translucent panels and the Rubik typeface baked into the engine's own TGA font format. The HUD was restyled to match in [one
commit](https://github.com/emdzej/openbv/commit/9b2b316) and [mostly
reverted](https://github.com/emdzej/openbv/commit/33742e1) in the next, keeping only the new health gauge and scoreboard. The
same file pins a golden hash for frame 600, the main menu, and requires that any change altering it be explained by the
change.

## Gallery

<Gallery />

## Getting a copy

You need to bring nothing. The game's content — `bv2.db` and the `main/` folder, 328 files and about 18 MB of maps, models,
textures, sounds and music — is RndLabs' work and is not covered by openbv's licence, but it is published in the same GPL
source repository as the code. openbv never commits it to git:
[tools/fetch-content.sh](https://github.com/emdzej/openbv/blob/main/tools/fetch-content.sh) pulls it from the pinned upstream
commit and verifies the file count and a SHA-256 of the tree, and the release bundles and the browser player ship it ready to
use. Data from the Prozac mod is optional.

The quickest way in is the [browser player](https://openbv.emdzej.pl/play/); [Playing in the
browser](https://openbv.emdzej.pl/guide/browser) explains how it caches the data and keeps your settings. [Getting
started](https://openbv.emdzej.pl/guide/) covers the native bundles for macOS, Linux and Windows and building from source,
and [Controls](https://openbv.emdzej.pl/guide/controls) lists the keys. To host games,
[Hosting](https://openbv.emdzej.pl/guide/hosting) describes the in-process server and [Running a
server](https://openbv.emdzej.pl/guide/server) the Go server, its admin page and its container image.
[Building](https://openbv.emdzej.pl/guide/build) has the details for compiling it yourself.

## Further reading

On the project's own site, [Internals](https://openbv.emdzej.pl/internals/) describes the architecture and
[Networking](https://openbv.emdzej.pl/internals/networking) the transport and protocol;
[Status](https://openbv.emdzej.pl/status) tracks what works and what does not, and
[Credits](https://openbv.emdzej.pl/credits) records the licences. The server specification,
[design/server.md](https://github.com/emdzej/openbv/blob/main/design/server.md), is the most complete account of how Babo
Violent 2 plays over the wire.

Among the ENCORE guides, [Choosing an approach](/guides/approach) explains when a source port is the right answer, and
[Networking](/guides/networking) draws heavily on openbv's server. [Graphics, audio, input](/guides/platform-layers) covers
the platform shims, [Building for gasm](/guides/gasm) the runtime, [Determinism and verification](/guides/verification) and
[Floating point and the compiler](/guides/fidelity) the bit-exact testing, and [Modern additions](/guides/enhancements) the
16:9 and menu work. [Browser player, releases, docs](/guides/shipping), [Working with agents](/guides/agents) and [Lessons
learned](/guides/lessons) round it off.
