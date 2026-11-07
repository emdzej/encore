---
title: Networking
---

# Networking

The games in the collection spoke DirectPlay, WinSock UDP, IPX, TCP and their authors' own libraries. gasm offers one network primitive: outbound WebSocket connections, reliable, ordered and binary — because browsers can open nothing else — plus `gasm-relay`, a server that puts WebSocket clients into rooms. The ENCORE projects took four routes from there: stub the network as the original behaves without one ([gta](/games/gta)), emulate DirectPlay over a relay room ([cmr2](/games/cmr2)), emulate WinSock beneath the original's whole network stack with the room as a LAN ([nfspu](/games/nfspu)), and replace the transport while rewriting the server in Go from a specification, verified against compiled original functions ([bv](/games/bv)). This page describes each, how they were tested, and how they are deployed.

## What gasm gives you

- **`gasm:net`**: `open(ws/wss url)`, `state`, `send`, `recv`, `close`. Non-blocking: poll each frame. Up to 16 connections and a 4,096-message send queue. No listening sockets, no datagrams, no broadcast.
- **Consent.** The runner asks before the first connection; `--allow-net` or `--allow-net=<host>` answers in advance. The browser player passes an allow-list ([bv](/games/bv): `allowNet: ['127.0.0.1','localhost','api.openbv.emdzej.pl']`, `ask: () => false`).
- **`gasm-relay`**: WebSocket rooms. A peer receives `WELCOME` with its index and the peers present, then `JOIN`, `LEAVE`, `FULL` and `DATA` from others; a sent `DATA` goes to every other peer in the room. It ships in gasm's release archives and as `ghcr.io/emdzej/gasm-relay`.
- **The determinism rule** from gasm's ABI: only message contents may affect the simulation, never arrival timing.

Browsers on an HTTPS page can reach only `wss://` endpoints off the local machine, so any public relay or server needs TLS.

## Choosing a route

| | Original stack | Route | What is ported unchanged | What is new |
|---|---|---|---|---|
| [gta](/games/gta) | DirectPlay | stub as no service provider | the single-player path | nothing |
| [cmr2](/games/cmr2) | DirectPlay 4 + DirectPlayLobby 3 | DirectPlay subset over a relay room | the game's netcode (state per step, dead reckoning) | `dplay.c`, a small op protocol |
| [nfspu](/games/nfspu) | WinSock UDP, IPX/SAP, TCP; EA lobby | WinSock emulation; room as a LAN segment | providers, packet layer, session manager, game layer, FE screens, the lobby server code | `wsock.c`, threads, in-process pipes |
| [bv](/games/bv) | baboNet (TCP, UDP disabled, P2P UDP) | WebSocket transport; Go server rewrite | the C++ client | `babonet_gasm.cpp`, the Go server, master |
| [rf](/games/rf) | none (split screen only) | roadmap: deterministic lockstep exchanging input words, with periodic state hashes | the 2P simulation, already driven by input words | — |
| [i76](/games/i76) | Activenet `ANETDLL.DLL` | planned: melee over `gasm:net` and `gasm-relay` | — | — |

The lower the layer you emulate, the more of the original runs unchanged and the more of its behaviour (time-outs, fallbacks, lobby screens) comes for free. The cost is emulating threads, events and sockets on a single-threaded, non-blocking guest. A game whose simulation is already driven by per-player input words, like [rf](/games/rf)'s two-player mode or [nfspu](/games/nfspu)'s input exchange, is the natural candidate for lockstep, because determinism is already the property the port is built on.

## Route 0: behave as a machine without a network

[gta](/games/gta)'s DirectPlay is stubbed as "a machine without a service provider": `Net_ResetSync` returns start, the front end finds no connection and `Front_GetMultiTarget` returns −1. That also switches off network script rules and lets police send patrol cars — the original's own single-player behaviour, not a to-do stub. When network play is out of scope, find the original's "no network" path and land on it exactly.

## Route 1: DirectPlay on a relay room ([cmr2](/games/cmr2))

[`src/net/dplay.c`](https://github.com/emdzej/opencmr2/blob/main/src/net/dplay.c) emulates the DirectPlay 4 subset the game uses over one relay room: asynchronous session enumeration, host and join with password, players with data, directed and broadcast messages, system messages, and host migration. Its own small protocol rides in the relay's `DATA` payloads:

| Op | Payload | Meaning |
|---|---|---|
| 1 `HERE` | | a peer came in; a host answers with `SESSION` |
| 2 `SESSION` | `[to][session]` | the host's session (`to` 0xff: everyone) |
| 3 `JOIN` / 4 `ACCEPT` / 5 `REFUSE` | password / session / result | joining, with `DPERR_INVALIDPASSWORD` or a full session |
| 6 `PLAYER` / 7 `ROSTER` / 8 `GONE` / 9 `PDATA` | | players created, found on join, destroyed, data set |
| 10 `MSG` | `[from][to][data]` | a message (`to` 0: every other player) |
| 11 `LEAVE` | | the sender left the session |

A session is the room's; the host is the member with the lowest relay index once the first host has gone. The native build has an in-memory relay so `tests/dplay_test.c` runs without a network.

Above the emulation the original's model is kept unchanged: each car's 30-byte quantised state sent every step (not guaranteed), a dead-reckoning predictor with halfway blending and snaps. Status is stated plainly: a full rally between two instances runs, but the network game was not race-tested end to end.

## Route 2: WinSock beneath the original stack ([nfspu](/games/nfspu))

[nfspu](/games/nfspu) ported the **whole original network stack above WinSock** — UDP, IPX and TCP providers, connections, a sliding-window packet layer with Jacobson timeouts, the session manager, the game layer and the front-end screens — and emulated WinSock itself in [`src/real/wsock.c`](https://github.com/emdzej/opennfspu/blob/main/src/real/wsock.c), with threads and events and in-process named pipes ([docs/re/network.md](https://github.com/emdzej/opennfspu/blob/main/docs/re/network.md)).

- **The room is a LAN segment.** Relay index *i* is address `10.0.0.(i+1)`; `DATA` to the room is broadcast; unicast is an address-prefixed broadcast filtered by receivers. IP, LAN (IPX + SAP) and the TCP fallback all work through it.
- **Threads keep their structure** as gasm cooperative threads: the module is built `LOOP THREADS` (Asyncify) for the network library ([`e942f36`](https://github.com/emdzej/opennfspu/commit/e942f36)). Timers advance with frames; main-thread sleeps inside a frame advance the timer so time-outs still fire.
- **Both race modes are the original's.** *Positional*: each game drives its car and sends where it is, tolerant of slow links. *Input exchange*: every game sends its controls and runs the whole race from everyone's controls in step; all players need the same `.wasm`. The game's 64 Hz simulation with 32 Hz input packets in a 128-entry ring is lockstep-shaped, which is why replays and input exchange are deterministic.
- **The dead lobby replaced by the game's own server code.** EA's `porsche-entry.earacing.com` is gone; the game contains server-side code with no way to start it. `--param netserver=1` runs a game as the room's lobby server, headless on the relay's machine ([multiplayer guide](https://github.com/emdzej/opennfspu/blob/main/docs/guide/multiplayer.md)).
- **Self-tests** behind `--param thrash_test=3..10` (WinSock, UDP, gathering, IPX, packets, memory link, TCP); `--param netdrop=1` forces the TCP fallback.

Out of scope and documented: modem and serial games, EA account registration, voice chat.

## Route 3: new transport, rewritten server ([bv](/games/bv))

[bv](/games/bv) is a source port; its novel part is a Go multiplayer server written from a 2,305-line specification of the C++ server, [`design/server.md`](https://github.com/emdzej/openbv/blob/main/design/server.md), with `file:line` citations throughout.

### Why a WebSocket transport is faithful

baboNet, the game's own library, is TCP plus optional UDP plus a P2P UDP channel. But `Server::host` calls `bb_serverCreate(false, MAX_PLAYER, sv_port)`: **UDP disabled**. Every "UDP" message already travelled on the reliable TCP stream. A WebSocket, reliable and ordered, reproduces the effective behaviour. Check what the original actually enables before deciding a transport cannot be emulated.

[`src/port/babonet_gasm.cpp`](https://github.com/emdzej/openbv/blob/main/src/port/babonet_gasm.cpp) frames each packet as one binary message: `u16 typeID LE | u8 proto (0 TCP, 1 UDP, informational) | u8 0 | payload`. Hosting creates an **in-process loopback server** that the game's own client reaches through `127.0.0.1`; others cannot join a client-hosted game because guests cannot listen. P2P UDP sends are dropped; `bb_getMyMAC` returns a random MAC persisted in storage, because servers ban by MAC.

### Reproduce the transport's semantics, not just its bytes

The server code depends on how baboNet delivers events:

- `bb_serverUpdate` returns **one event per call**: a new client's id (> 0), a lost client's negated id, or 0. `Server::update` calls it twice per frame, and a connection accepted in the second call gets `NEWPLAYER` after this frame's broadcasts.
- Pending connections are admitted only at **half-second checks** (`ConnCheck >= 0.5`).
- `bb_serverReceive` returns packets oldest first, draining the first client completely before the second.
- A received buffer stays valid until the next receive on that side.

### Spec first, then golden data from the original

1. **The specification**: authority split (clients integrate their own movement; the server owns projectiles, damage, spawns, flags; clients recompute scores from `NET_SVCL_PLAYER_HIT`, so the server must send exactly the same hits), the 21-step frame order, every message, the handshake order, map download, interpolation formulas, cvar dump order, RNG, 18 quirks to keep, bugs not to keep.
2. **Struct layouts generated by compiling the original headers** for wasm32 with `-D_PRO_` — identical to MSVC x86 since there are no 8-byte members or `#pragma pack`. `sizeof` goes on the wire including padding, which was stack garbage; the Go server writes zeros.
3. **Level 1 golden data**: `server/internal/reftest/cpp/build.sh` and `extract.py` extract original functions verbatim (`unifdef -DCONSOLE -D_PRO_`) into a native driver with MSVC's `rand()` and musl's `cosf`/`sinf`, and write `testdata/golden.json.gz`; Go tests match every case bit for bit — 3,000 rotations, 3,000 segment tests, 4,000 rays on 20 maps, 2,000 spreads, 1,000 bounces, 3,000 damage computations.
4. **Level 2 packet logs**: `--param netlog=1` records a hosted game's C++ listen server; the Go shot code reproduces each reply byte for byte. The listen server's `rand()` is shared with client effects, so the test searches the 30,000 values `rand(0,360)` can take: 38 of 41 shots matched, 3 skipped because the muzzle was in a wall ([`11ae1ce`](https://github.com/emdzej/openbv/commit/11ae1ce)).
5. **Milestones by gameplay slice** (handshake and movement, hitscan, projectiles, team modes, admin), each done when two unchanged clients agree on every screen, each with a deviation table.

The float rules that made level 1 pass are in [Floating point and the compiler](/guides/fidelity): float32 everywhere, an explicit rounding of each product because Go fuses multiply-add on arm64, musl's trig ported to Go, NaN compared as NaN ([`b790e1c`](https://github.com/emdzej/openbv/commit/b790e1c)). Reading the original's indentation is not enough: CTF and auto-balance live inside the `GAME_PLAYING` block, and the spec's frame order was wrong until corrected ([`ffc4535`](https://github.com/emdzej/openbv/commit/ffc4535)).

### Order matters on the wire

The handshake, from the specification: `NEWPLAYER` to all (the client takes the first one it receives as itself), then `GAMEVERSION` 21100 (checked client-side), then the client's `PLAYER_INFO` (name, account user, MD5 password, MAC), then `GAMEVERSION_ACCEPTED` with the server password, then the state dump — `SERVER_INFO`, `GAME_STATE`, about 75 `set sv_x v` text cvars, `ENUM_STATE` per player, live projectiles, `FLAG_ENUM`. The client drops most messages until `SERVER_INFO`, so the order is behaviour. Further details a rewrite has to match:

- Cvars go to clients as console text with the engine's formatting (`%f` with six decimals, booleans as true/false, quoted strings); cvar lookup is a **prefix match** where the first registration wins (`sv_maxPlayer` vs `sv_maxPlayerInGame`).
- Coord frames carry position × 100 and velocity × 10 as shorts; the send interval is `max(avgPing, sv_minSendInterval + nbPlayers/8)`. The server interpolates remote players with a cubic spline and extrapolates up to 15 frames for hit tests.
- Map download goes in 250-byte chunks at `sv_maxUploadRate*1024/30` per frame; a zero-size chunk ends it.
- RNG: MSVC's LCG per session with a fixable seed; `rand(int a, int b)` excludes the upper bound.

### Security bugs are not quirks

For a public server, the original's path traversal in map download, `fclose(NULL)` crash, passwords echoed in clear to browsing clients, client-trusted player ids, unchecked indices and a stack overflow in `sendSVChange` are fixed: valid-input behaviour stays identical, invalid input is rejected, and each deviation is documented per milestone.

### The master server

The client sends `BV2_LIST(999){"2.11"}`; the master replies `MASTER_INFO(1002){n}` then *n* 134-byte `BV2_ROW(997)`; game servers send a row every 20 s and `KILL_SERV(1001)` on shutdown. The row's `ip` field is 16 bytes and `openbv.emdzej.pl` is 16 characters, so the client was patched: an empty `ip` means the master's host, with the buffer grown from 16 to 256 bytes ([`7172f85`](https://github.com/emdzej/openbv/commit/7172f85)). Pings to each row go over P2P UDP, which has no transport, so each times out after 1 s and shows `???`.

## Testing networked code

- **Real time.** Headless virtual time runs far ahead of real sockets; network tests run `--realtime` or the instances never meet ([cmr2](/games/cmr2), [bv](/games/bv)).
- **Two instances, separate storage.** `--storage-dir /tmp/p1` and `/tmp/p2` give each its own player ([nfspu](/games/nfspu)); [bv](/games/bv)'s `./play --profile=<name>` does the same.
- **Your own relay.** Unattended runs start a local `gasm-relay` and "kill only your own relay's PID" ([cmr2](/games/cmr2) AGENTS.md).
- **Hashes unaffected.** Packet logging is off by default so golden hashes do not move; `?hashframes` in the browser cannot test net or fetch.
- **In-memory relays** in the native build let protocol tests run in CI.

## Deployment

### The relay

```sh
gasm-relay 0.0.0.0:9000 --max-peers 8
docker run -p 9000:9000 ghcr.io/emdzej/gasm-relay 0.0.0.0:9000 --max-peers 8
gasm-relay 0.0.0.0:9443 --max-peers 8 --tls-cert fullchain.pem --tls-key privkey.pem
```

`--max-peers` matters: the relay lets only 2 players into a room unless told otherwise ([cmr2 network guide](https://github.com/emdzej/opencmr2/blob/main/docs/guide/network.md)). Players pass `--allow-net --param relay=ws://host:9000 --param room=<name>`; the browser player takes `?relay=wss://…&room=…`. Desktop and browser players share rooms.

### A rewritten game server ([bv](/games/bv))

- **Process model**: multiple sessions per process, each a 30 Hz goroutine that owns all its state; admin commands arrive on a channel processed at frame start, so game code has no locks.
- **Endpoints**: each session on its own port, or behind one HTTPS port at `/bv2/<id>` or `/bv2/port/<port>`; the client accepts a `wss://` URL as host. The master on port 10207 or `/master`; the client's default master is `wss://api.openbv.emdzej.pl/master` ([`83feffd`](https://github.com/emdzej/openbv/commit/83feffd)).
- **Operations**: configuration by environment (`OPENBV_LISTEN`, `OPENBV_ADMIN_TOKEN`, `OPENBV_CONN_PER_MINUTE` default 30, `OPENBV_MAX_SESSIONS` default 16, `OPENBV_TRUST_PROXY`, `OPENBV_ORIGINS`); `X-Forwarded-For` honoured only with `TRUST_PROXY=1`; per-IP connection rate limit; an Origin allow-list for the web player; OIDC for the admin page; bans and an audit log persisted; sessions restored at boot; `/healthz`, `/readyz`, `/version` probes.
- **Artefacts**: cross-built binaries with `CGO_ENABLED=0`, a distroless non-root image `ghcr.io/emdzej/openbv-server` with only the maps, and a `:sha-<short>` tag on every main push for infrastructure pinning. CI builds the image, runs it, curls `/healthz` and creates a session through the API.

## Checklist

1. Read what the original enables (UDP on or off, providers, lobby hosts) before choosing a route.
2. If network play is out of scope, land on the original's own "no service provider" path.
3. Emulate at the lowest layer you can (DirectPlay or WinSock) and port everything above it unchanged.
4. Map relay rooms to the original's notion of a session or LAN segment; give peers stable addresses by join order.
5. Reproduce the transport's event semantics: events per poll, admission delays, drain order, buffer lifetimes.
6. Keep the original's netcode model (state rate, prediction, lockstep) and both its modes.
7. For a rewritten server: write the spec with `file:line` citations; generate struct layouts by compiling the original headers; zero padding.
8. Extract original functions verbatim into native drivers, commit golden data, and match it bit for bit; then replay recorded packet logs.
9. Port the original RNG per session with matching call counts; float32, no FMA, the client's libm.
10. Fix security bugs in public-facing code, keep valid-input behaviour identical, and document each deviation.
11. Test with `--realtime`, separate storage per instance, and your own relay; keep packet logs off by default.
12. Deploy relays with `--max-peers` and TLS for browser players; give servers health probes, rate limits, a trusted-proxy flag and an Origin allow-list.
