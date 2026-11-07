# ENCORE: external resources and credits per project

This file lists outside resources each ENCORE repo shows it relied on or acknowledges. It was collected from
README.md, AGENTS.md, docs/, design/, notes/, re/*.md, tools/ and src/ headers, plus the git logs and
`research/*.md`. The repos themselves were not changed.

Scope:
- The project's own stack is left out of the tables: gasm, `@emdzej/gasm-host`, csfs, visextract, gasm-relay,
  and code shared between the ENCORE ports. Where one port reused another's code, a note under that
  section says so.
- Minor OS and CI utilities (CMake, ShellCheck, iconutil, codesign, zenity) are left out.
- A link is given only where it is known to be the canonical one. Evidence paths are relative to the repo
  root.

"How it was used" values: **format** (format understanding), **names**, **reference** (compared against),
**vendored** (code included), **tool**, **font**, **credit** (acknowledged).

## openrf

| Resource | What it is | How it was used | Link | Evidence |
|---|---|---|---|---|
| Ghidra | NSA reverse-engineering suite | tool: project `returnfire` (program `rfire_game.exe` = `RFIRE.BIN`), decompile and rename; Java dump scripts | https://ghidra-sre.org | docs/CONTEXT.md:7; docs/howto/reverse-engineering.md:10; tools/ghidra/DumpAllNamed.java |
| ghidra-cli (akiselev) | Command-line front end for Ghidra | tool: decompile, x-ref, disasm, strings, rename, script run | https://github.com/akiselev/ghidra-cli | AGENTS.md:218; docs/howto/reverse-engineering.md:11 |
| Capstone | Disassembler library | tool: listed as available to RE work (no current tool imports it) | https://www.capstone-engine.org | docs/CONTEXT.md:20 |
| Cinepak public bitstream description (source not named) | Public write-up of the cvid codec | format: basis for the project's own decoder | | src/cinepak.c:1-2; docs/stm.md:90 |
| ECMA-119 / ISO 9660 | CD-ROM file system standard | format: the project's own disc-image reader | https://ecma-international.org/publications-and-standards/standards/ecma-119/ | src/vfs.c:176; src/vfs.h:10 |
| 3DO cel engine API (CCB, PLUT, PRE0/PRE1, ScreenGroup) | The original 3DO platform's graphics API | names: field and structure names in the cel renderer | | docs/car.md:8-58; docs/architecture.md:804-877 |
| Return Fire 3DO version (1995) | The original platform release | reference: identified as the source of the PC engine's structure; not supported | | AGENTS.md:20; docs/guide/game-data.md:33 |
| FFmpeg | Media framework | tool: `stm.py` converts decoded STM movies to .mp4 for inspection (not a codec reference) | https://ffmpeg.org | tools/stm.py:15,24 |
| Pillow; Python `zlib` | Python imaging library; stdlib CRC-32/deflate | tool: reference renderer and decoders write PNGs; exe CRC-32 check | https://python-pillow.org | tools/view.py:25; tools/rfexe.py:14; tools/icon.py:11 |
| SDL3 | Cross-platform media library | tool: runtime of the first native macOS app; removed in 0.4.0 | https://libsdl.org | commits a134e4b, 9492abc |
| wasi-sdk | Clang + wasi-libc for wasm32 | tool: build toolchain | https://github.com/WebAssembly/wasi-sdk | docs/guide/gasm.md:170; README.md:47 |
| VitePress | Static site generator | tool: docs site | https://vitepress.dev | docs/package.json; docs/.vitepress/config.ts |

No community wikis, fonts or people are credited. All format knowledge is credited to disassembly of `RFIRE.BIN`.

## opengta

| Resource | What it is | How it was used | Link | Evidence |
|---|---|---|---|---|
| DMA Design "CityScape Data Structure" (cds.doc v12.10) | DMA's own map/style format document | format: CMP map and G24 style layouts; one field order "assumed from cds.doc order" | | tools/gtafmt.py:5-6; AGENTS.md:35; docs/howto/reverse-engineering.md:17; docs/re/inventory-1.md:115 |
| Carnage3D (MIT) | Open-source GTA 1 engine reimplementation | format: prior art, no code copied; contrasted for keeping tables in JSON | https://github.com/codename-hash/carnage3d | AGENTS.md:28,35; docs/howto/reverse-engineering.md:17 |
| MultimediaWiki: Smacker | Public description of the Smacker video format | format: basis for the clean-room intro-movie decoder | https://wiki.multimedia.cx/index.php/Smacker | docs/movie.md:5-6; src/movie/smacker.c:1; commit 1c8f40b |
| Rockstar 2002 freeware re-release (`WINO/Grand Theft Auto.exe`, CRC `a5ca070e`) | The target build | reference: the authority ported; tables read from it at run time | | README.md:24; AGENTS.md:28-29 |
| GTA Director's Cut DOS bundle (London 1969/1961 exes) | Other game builds | reference: kept locally (git-ignored) for planned variant switches; not used yet | | AGENTS.md:25,181-182; .gitignore:37 |
| GTA 1 DOS version | Other game build | reference: explains DOS leftovers and dead code in the Windows exe | | docs/text-fonts.md:42; docs/re/inventory-5.md:289 |
| Miles Sound System 3.6B, SciTech MGL, RAD Smacker DLL | Middleware the original links | names/behaviour: the parts GTA uses are reimplemented from the exe's behaviour (not vendored) | | src/audio/mss.h:1; src/game/input.h:3; src/game/gfx.h:3; docs/movie.md:3-4 |
| Scale2x / AdvMAME2x (Andrea Mazzoleni), EPX | Pixel-art upscaling algorithm | format: own implementation from the public description | https://www.scale2x.it | src/render/hires/hires_upscale.c:4-6; docs/hires.md:240 |
| xBR level 2 (Hyllian) | Pixel-art upscaling algorithm | format: own implementation from the public description | | src/render/hires/hires_upscale.c:7-12; docs/hires.md:237-240 |
| RFC 1950 / 1951 (zlib / DEFLATE) | Compression specs | format: own inflate for InstallShield cabinets and skin PNGs | https://www.rfc-editor.org/rfc/rfc1951 | src/inflate.h:1-2; src/render/hires/hires_png.c:3 |
| GTA 1 box cover art (DMA Design / BMG, 1997) | Packaging artwork | credit: colour palette for the docs site theme | | docs/.vitepress/theme/gta.css:1-6; commit 838ee5d |
| Ghidra | NSA reverse-engineering suite | tool: decompile/disassemble; Java dump and rename scripts | https://ghidra-sre.org | AGENTS.md:97; tools/ghidra/DumpAllNamed.java |
| ghidra-cli | Command-line front end for Ghidra | tool: decompile, x-ref, disasm, rename | https://github.com/akiselev/ghidra-cli | docs/howto/reverse-engineering.md:23-31; AGENTS.md:97-98 |
| wasi-sdk | Clang + wasi-libc for wasm32 | tool: build toolchain | https://github.com/WebAssembly/wasi-sdk | tools/fetch-gasm-sdk.sh:2,29 |
| VitePress | Static site generator | tool: docs site | https://vitepress.dev | docs/package.json |

Reused code from other ENCORE ports: `inflate.c` and the InstallShield cabinet reader (`iscab`) come from
openballance, and `vfs.c` from openrf (src/inflate.h:1-2; src/iscab.h:1; AGENTS.md:42).

## openi76

| Resource | What it is | How it was used | Link | Evidence |
|---|---|---|---|---|
| Open76 (r1sc) | Unity/C# reimplementation of Interstate '76 | format: hints only; FSM action names are a planned starting point; no code copied (its licence is still to be checked) | https://github.com/r1sc/Open76 | docs/re/inventory.md:105-110; docs/re/port-plan.md:59,142,244; AGENTS.md:69 |
| Open76 fork (rob518183) | Fork of Open76 | format: hints only | https://github.com/rob518183/Open76 | docs/re/inventory.md:106 |
| "That Tony" hackingonspace posts (via the Web Archive) | Blog posts on the I76 formats, the source Open76 credits | format: hints; the exe stays the authority | | docs/re/inventory.md:108-109; docs/re/port-plan.md:59 |
| Old community modding notes (unnamed) | Community format notes | format: allowed as hints | | AGENTS.md:69 |
| Internet Archive item `interstate-76-activision-1997` | US v1.0 disc | reference: the targeted original (disc inventory, exe/DLL CRCs) | https://archive.org/details/interstate-76-activision-1997 | docs/re/inventory.md:3 |
| I76 1.1 / 3Dfx patches, Nitro Pack | Later game versions | reference: noted as unsupported (they compress ZFS and change MSN) | | docs/re/inventory.md:112-113; docs/formats/zfs.md:36 |
| FFmpeg | Media framework | reference: PCX decode hashes now; `framemd5` and its decoder as the behaviour reference for the planned Smacker decoder | https://ffmpeg.org | tools/pcx-ref.py:2,17; tests/pcx_test.c:2; docs/re/port-plan.md:177-179; commit 3a2ba11 |
| Ghidra | NSA reverse-engineering suite | tool: project `i76`, scripts in tools/ghidra/, names in names.tsv | https://ghidra-sre.org | AGENTS.md:57,65-66,86 |
| ghidra-cli | Command-line front end for Ghidra | tool: decompile, x-ref, disasm, memory | https://github.com/akiselev/ghidra-cli | AGENTS.md:87 |
| Unicorn Engine | CPU emulator (Python) | tool/reference: runs I76.EXE's own functions for byte-exact differential tests | https://www.unicorn-engine.org | tools/emu/x86.py:1-12; docs/re/render.md:13 |
| Capstone | Disassembler (Python) | tool: code Ghidra has not analysed | https://www.capstone-engine.org | tools/emu/disx86.py:1-7,31 |
| wasi-sdk | Clang + wasi-libc for wasm32 | tool: build toolchain | https://github.com/WebAssembly/wasi-sdk | tools/fetch-gasm-sdk.sh:2,29 |

Reused code from other ENCORE ports: the file layer and gasm backend come from opencmr2, openrf and
opengta, and the DIK key table and path normalisation from openballance (src/vfs.h:1;
src/platform_gasm.c:3,102,435; AGENTS.md:12-13).

## opencmr2

| Resource | What it is | How it was used | Link | Evidence |
|---|---|---|---|---|
| FFmpeg | Media framework with a Bink decoder | reference: per-frame CRC oracle; every movie checked bit-exact | https://ffmpeg.org | tools/bink-ref.sh:2-5; docs/formats/media.md:91-94; commit 0054715 |
| Bink 1 published format descriptions (not named) | Public descriptions of Bink | format: decoder "written from the format" | | src/bink.h:5-6 |
| RAD `binkw32.dll` (user's own disc) | Original Bink runtime | format: codec tables read from it at run time (size/CRC checked) | | src/bink.h:1-10; src/bink.c:12-25 |
| zlib 1.1.3 | Compression library linked statically in CMR2.exe | reference: identified and skipped, replaced by the project's own inflate | https://zlib.net | docs/re/inventory.md:32; docs/re/architecture.md:12 |
| Python `zlib` module | stdlib zlib binding | reference: checks the project's inflate over the whole disc | | src/inflate.h:3; tests/bfl_test.c:2; tools/iscab.py |
| RFC 1951 / RFC 1952 | DEFLATE and gzip specs | format: own inflate/gzip | https://www.rfc-editor.org/rfc/rfc1951 | src/inflate.h:1; src/inflate.c:41; docs/formats/bfl.md:11 |
| CMR2 community modding tools and notes (unnamed) | Community knowledge | format: allowed as hints; the exe is the authority | | AGENTS.md:51; docs/re/README.md:60; docs/formats/index.md:6 |
| Ghidra | NSA reverse-engineering suite | tool: project `cmr2`; FillGaps, ApplyNames, DumpAllNamed, DumpMeta, AnalyzeAll scripts | https://ghidra-sre.org | docs/re/README.md:21; tools/ghidra/*.java |
| ghidra-cli (akiselev) | Command-line front end for Ghidra | tool: decompile, x-ref, disasm, script run | https://github.com/akiselev/ghidra-cli | docs/re/README.md:21; AGENTS.md:67 |
| Unicorn Engine | CPU emulator | tool/reference: differential harness runs the exe's code on the port's state (sim bit-exactness) | https://www.unicorn-engine.org | tools/emu/sim_diff.c:1-12; commit 92859ab |
| ANGLE + SwiftShader | GLES layer and software fallback, shipped with gasm-run | vendored (binary): bundled with ANGLE-NOTICES.txt | https://chromium.googlesource.com/angle/angle | tools/fetch-gasm-runner.sh:5-6,31-32 |
| wasi-sdk | Clang + wasi-libc for wasm32 | tool: build toolchain | https://github.com/WebAssembly/wasi-sdk | docs/howto/build.md:23 |
| VitePress | Static site generator | tool: docs site | https://vitepress.dev | docs/.vitepress/config.ts |

Reused code from other ENCORE ports: `vfs.c`, the GL backend (adapted from the opennfspu THRASH device),
the play page and the release tooling (src/render/gl_dev.c:1; docs/re/port-plan.md:52,112; AGENTS.md:88).

## opennfspu

| Resource | What it is | How it was used | Link | Evidence |
|---|---|---|---|---|
| Community notes on EA/NFS formats (unnamed) | NFS modding tools and write-ups | format: "first guesses", then checked against data and exe; no code copied | | docs/formats.md:5; AGENTS.md:53 |
| FFmpeg (EA demuxer, `ffprobe`) | Media framework | format: identified MAD video, EA-XA R1 ADPCM and SCHl/SCCl/SCDl/SCEl chunks | https://ffmpeg.org | docs/formats.md:184 |
| IJG libjpeg (`jidctint.c`, `jdcolor.c`, `jdmaster.c`, `djpeg`) | JPEG reference library, linked by the game's `gimme.dll` | reference: own decoder follows its integer IDCT, range-limit and YCbCr tables and fancy upsampling; checked against `djpeg` | https://ijg.org | src/front/fejpeg.c:1,245,253,315,542; commits ac5dd6b, 722e648, e0376e9 |
| libtiff | TIFF library, linked by `gimme.dll` | reference: own TIFF reader mirrors what it accepts | http://www.libtiff.org | src/front/fetiff.c:1; commit e0376e9 |
| Porsche Unleashed v3.5 patch (EA) | Last official exe (CRC `fd2f5573`) | reference: the single target binary | | docs/guide/game-data.md:10 |
| Ghidra | NSA reverse-engineering suite | tool: project `nfspu` (Porsche.exe, dx7z.dll), scripts in tools/ghidra/ | https://ghidra-sre.org | docs/re/README.md:25-26; docs/internals/porting.md:13-14 |
| ghidra-cli | Command-line front end for Ghidra | tool: decompile, x-ref, disasm, rename | https://github.com/akiselev/ghidra-cli | docs/re/README.md:25-26; docs/internals/porting.md:14 |
| Unicorn Engine (Python 2.x) | CPU emulator | tool/reference: runs the exe's functions on the port's state and diffs word by word | https://www.unicorn-engine.org | tools/emu/README.md:3,24; tools/emu/emu_drive.py:5; commit 7b3408c |
| The Unarchiver (`unar`) | Archive extractor | tool (user-facing): extracts the RAR-SFX installer of repack ISOs (7-Zip noted as failing) | https://theunarchiver.com/command-line | docs/howto/extract-game.md:12-25; README.md:24 |
| Wine | Windows compatibility layer | tool (user-facing): install the retail disc outside Windows | https://www.winehq.org | docs/howto/extract-game.md:29 |
| ANGLE + SwiftShader | GLES layer and software renderer, shipped with gasm-run | vendored (binary): in bundles; needed for headless screenshots | https://chromium.googlesource.com/angle/angle | tools/fetch-gasm-runner.sh:5-6; docs/re/thrash.md:235 |
| wasi-sdk; Binaryen (`wasm-opt`) | wasm32 toolchain; wasm optimiser (Asyncify) | tool: build | https://github.com/WebAssembly/wasi-sdk ; https://github.com/WebAssembly/binaryen | tools/fetch-gasm-sdk.sh:2,6-7,14 |
| VitePress | Static site generator | tool: docs site | https://vitepress.dev | docs/.vitepress/config.ts |

No people or fonts are credited.

## opensheep

| Resource | What it is | How it was used | Link | Evidence |
|---|---|---|---|---|
| FFmpeg libavcodec (`bink.c`, `binkaudio.c`, `binkdsp.c`, `bink_demux.c`) | Open-source codec library (LGPL 2.1+) | reference: Bink 1 'h'/'i' video and RDFT audio decoder follows its structure and names; rewritten, not vendored; tables read from the user's `binkw32.dll` | https://ffmpeg.org | src/bink.h:2; src/bink.c:1-3; README.md:103; notes/formats.md:103; commit 2884552 |
| RNC ProPack method 2 (Rob Northen Compression) | Published compression algorithm | format: `rnc.c` ports "the published algorithm", replacing the linked ProPack unpacker | | src/rnc.c:1-2; tools/rnc.py:1; notes/formats.md:47-49; commit f4371d5 |
| Retail Sheep.exe (CRC `b7bcd581`) + `binkw32.dll` | The target build | reference: tables read at run time; GOG build unsupported | | src/exe.h; docs/guide/game-data.md:10-11 |
| Ghidra | NSA reverse-engineering suite | tool: project `sheep`, ApplyNames/DumpAllNamed scripts, `re/all.c` dump | https://ghidra-sre.org | tools/ghidra/; PLAN.md:14; notes/architecture.md:3-4; commit 87a4af3 |
| Capstone (Python) | Disassembler | tool: `dis.py` checks x87 FP compare flags | https://www.capstone-engine.org | tools/dis.py:2-4,16 |
| AddressSanitizer / UBSan | Compiler runtime checkers | tool: found out-of-bounds reads that differ between native and wasm | | commit 874afab |
| Pillow | Python imaging library | tool: icon generation | https://python-pillow.org | tools/icon/make-icons.py:2 |
| wasi-sdk | Clang + wasi-libc for wasm32 | tool: build toolchain | https://github.com/WebAssembly/wasi-sdk | tools/fetch-gasm-sdk.sh:2,26 |
| VitePress | Static site generator | tool: docs site | https://vitepress.dev | docs/package.json |
| System font stack (ui-rounded, SF Pro Rounded, Nunito) | CSS font-family list | font: named only, no files bundled | | docs/.vitepress/theme/pasture.css:10 |

Reused from openrf: the packaging scripts, launchers, smoke test and `release.yml` (README.md:10; commit a5d7cc2).

## openoni

| Resource | What it is | How it was used | Link | Evidence |
|---|---|---|---|---|
| OniGalore wiki | Community Oni wiki with format notes | format: background only ("exe is the authority, no code copied"); its ONWC offset table cited | https://wiki.oni2.net | AGENTS.md:130; docs/re/port-plan.md:22; docs/formats/onwc.md:7 |
| OniSplit | Community Oni data converter | format: named as allowed background (policy only, no specific use cited) | | AGENTS.md:130; docs/re/port-plan.md:22 |
| Daodan DLL | Community Oni patch DLL | format: its findings named as allowed background (policy only) | | docs/re/port-plan.md:22 |
| Feral's Intel Mac build of Oni 1.2.1 (2015) | i386 Mach-O with about 6,244 of Bungie's function names (`oni-mac` Ghidra program) | names: matched across to the Windows exe, giving 1,055 accepted names; not the authority | | docs/re/port-plan.md:41-48; AGENTS.md:156-159; tools/ghidra/match_mac.py:8 |
| RAD `binkw32.dll` (user's own copy) | Bink video DLL shipped with Oni | format: decoder ported from its disassembly; tables loaded at run time | | docs/formats/bink.md:3-7; AGENTS.md:109-111 |
| Ooura FFT package (`rdft`) | Real-DFT routine | format: definition the project's own inverse transform for Bink audio follows | | docs/formats/bink.md:134; src/bink.c:959 |
| MindVision Installer VISE (`vise32ex.dll`) | The CD's installer engine | format: reverse-engineered (Ghidra project `onisetup`) to extract the game | | docs/formats/vise.md:4; AGENTS.md:167 |
| FFmpeg (MS ADPCM decoder) | Media framework | reference: compared; its /256 rounding differs from the exe, so not followed | https://ffmpeg.org | docs/formats/sndd.md:101 |
| macOS `afconvert` | Apple audio converter | reference: ADPCM output matches it on every full block | | docs/formats/sndd.md:102-105 |
| zlib crc32 | CRC-32 definition | format: C CRC-32 "as zlib's"; Python tools use stdlib `zlib` | https://zlib.net | src/crc32.h:1; tools/vise.py:14 |
| Ghidra (headless, Version Tracking) | NSA reverse-engineering suite | tool: decompile; name matching across builds | https://ghidra-sre.org | AGENTS.md:152-167; docs/re/port-plan.md:47 |
| ghidra-cli | Command-line front end for Ghidra | tool: decompile, x-ref, disasm, memory | https://github.com/akiselev/ghidra-cli | AGENTS.md:152-165 |
| wasi-sdk; Binaryen (`wasm-opt`) | wasm32 toolchain; wasm optimiser | tool: build | https://github.com/WebAssembly/wasi-sdk ; https://github.com/WebAssembly/binaryen | tools/fetch-gasm-sdk.sh |
| VitePress | Static site generator | tool: docs site | https://vitepress.dev | docs/package.json |
| Chakra Petch, Inter (Google Fonts) | Typefaces | font: site and play-page headings (Chakra Petch) and body (Inter) | https://fonts.google.com/specimen/Chakra+Petch ; https://fonts.google.com/specimen/Inter | docs/.vitepress/config.ts:24; docs/public/play/index.html:11 |

No people are credited. The "Daodan" hits in src/ are the in-game Daodan, not the DLL.

## openballance

| Resource | What it is | How it was used | Link | Evidence |
|---|---|---|---|---|
| Virtools SDK 2.1 headers (doyaGu/Virtools-SDK-2.1) | Community-published Virtools SDK headers | names: vtable slot order and method names | https://github.com/doyaGu/Virtools-SDK-2.1 | docs/sky.md:327-330; src/bb/bb_visuals.c:222 |
| Virtools SDK `CKPGUID_*` constants | SDK parameter-type GUIDs | names: parameter-type GUID values | | src/ck/ck_types.h:1; tools/cktypes.py:1 |
| Public Ipion (IVP) sources | Public Ipion/Havok IVP physics source | names: class, field and "IVP name" labels, marked as inferred | | docs/ivp_contact.md:17-18; docs/ivp_collision.md:1605-1606 |
| Leaked Ipion source | Leaked engine source | explicitly not consulted: "Do not consult the leaked Ipion source" | | design/analysis.md:60 |
| qhull | Convex-hull library linked statically in `physics_RT.dll` | reference: its behaviour documented and replaced by a small hull builder; not vendored | | docs/ivp_collision.md:611-636; src/phys/phys_convex.c:3-9 |
| unshield (MIT) | InstallShield cabinet extractor | format: layouts from its docs/sources, "no code was taken from it"; also used as a tool to extract the payload | https://github.com/twogood/unshield | src/iscab.h:5-8; src/iscab.c:4; design/analysis.md:4,74 |
| RFC 1950 / 1951 (zlib / DEFLATE) | Compression specs | format: own DEFLATE decoder | https://www.rfc-editor.org/rfc/rfc1951 | src/inflate.h:1-2; src/inflate.c:1 |
| RFC 1321 (MD5) | MD5 spec | format: own MD5 to check cabinet data | https://www.rfc-editor.org/rfc/rfc1321 | src/iscab.c:362 |
| Retail Ballance CD (Cyparade / Atari, 2004) | The target build | reference + credit: only version targeted; maker and publisher named in the package | | tools/package-gasm.sh:124 |
| Ghidra + ghidra-cli | Decompiler, run headless through the CLI | tool: project `ballance`, one program per DLL, scripts in tools/ghidra/ | https://ghidra-sre.org ; https://github.com/akiselev/ghidra-cli | design/analysis.md:168-176; docs/howto/reverse-engineering.md:11-13 |
| Capstone (5.0.9); objdump | Disassemblers | tool: where Ghidra mishandles x87; objdump found about 180 functions Ghidra missed | https://www.capstone-engine.org | docs/howto/reverse-engineering.md:12-13; research/openballance.md:85,98 |
| numpy, Pillow | Python libraries | tool: `tools/view.py` reference renderer | | tools/view.py:12-13 |
| Arimo / Liberation Sans | Arial-metric free fonts | font: proposed substitutes for Arial (design note only, nothing vendored) | | design/analysis.md:69-70 |
| wasi-sdk | Clang + wasi-libc for wasm32 | tool: build toolchain | https://github.com/WebAssembly/wasi-sdk | tools/fetch-gasm-sdk.sh:29 |
| VitePress | Static site generator | tool: docs site | https://vitepress.dev | docs/.vitepress/config.ts |

libnmo, BallanceModLoader, Rubik and community wikis do not appear anywhere in the repo or its git log.

## openbv

| Resource | What it is | How it was used | Link | Evidence |
|---|---|---|---|---|
| Daivuk/BaboViolent2 (commit 7171c84) | GPL-3.0 source release of Babo Violent 2 (game, engine, MasterServer) | vendored: it is `src/game` and `src/engine`; reference for the Go server spec | https://github.com/Daivuk/BaboViolent2 | docs/credits.md:6-8; commit eb9a62d; ref/BaboViolent2/ |
| RndLabs; bitHeads inc.; David St-Louis (Daivuk) | Studio; copyright holder (c) 2012; person who released the source | credit | | docs/credits.md:6-11 |
| Babo Violent 2 game data (bv2.db, `main/`) | RndLabs' maps, models, textures, sounds, music | runtime content fetched from the pinned upstream commit; not committed | | tools/fetch-content.sh; docs/credits.md:10-11; AGENTS.md:90 |
| Babo Violent 2 Prozac 2.1.3 mod (`bv2p.exe`) | Community mod | reference: analysed in Ghidra; its data runs optionally | | AGENTS.md:27,90-92; README.md:11; docs/status.md:35 |
| baboviolent2-jsclient | Third-party WebGL BV2 client with a Rust server | present in `ref/` only; no doc or commit refers to it | | ref/baboviolent2-jsclient/ |
| stb_vorbis v1.22 (Sean Barrett) | Ogg Vorbis decoder (public domain / MIT) | vendored: music in the FMOD shim | https://github.com/nothings/stb | src/port/fmod/third_party/stb_vorbis.c; src/port/fmod/README.md; docs/credits.md:15 |
| FMOD 3.75 (FSOUND API) | The original's sound library | names: API reimplemented in a shim; header written from its documentation | | src/port/fmod/README.md; src/port/fmod/include/fmod.h |
| TinyXML (Lee Thomason) | XML parser | vendored (part of the upstream source) | https://sourceforge.net/projects/tinyxml/ | src/game/tinyxml.h:3; docs/credits.md:17 |
| RSA Data Security MD5 (RFC 1321) | MD5 reference implementation | vendored (part of the upstream source) | | src/game/md5.cpp:20; src/engine/babonet/md5c.c:6 |
| MD5 by Christophe Devine | Second MD5 implementation | vendored (part of the upstream source) | | src/game/md5_2.c:4 |
| FastDelegate.h (Don Clugston, Jody Hagins) | C++ delegate library | vendored (part of the upstream source) | | src/game/FastDelegate.h:1-6 |
| SQLite file format | The database behind bv2.db | format: `sqlite_shim.cpp` reads the table b-trees directly | | docs/internals/index.md:53-55; AGENTS.md:36,41 |
| libcurl, OpenSSL, SDL headers | Libraries the upstream source includes | stand-in headers and shims only (curl requests always fail) | | AGENTS.md:41; src/port/include/ |
| musl libc `cosf`/`sinf` (from FreeBSD msun) | libc maths functions | vendored in the server reftest driver; re-implemented in Go to match the wasm client bit for bit | https://musl.libc.org | server/internal/reftest/cpp/musl/; ref/musl/; design/server.md:1244,1416; server/README.md:73 |
| MSVC `rand()` | Windows C runtime RNG | reference: the server's RNG sequence | | server/README.md:73; design/server.md:134 |
| Rubik font (The Rubik Project Authors, OFL) | UI typeface | font: baked into `assets/fonts/babo.tga` | https://github.com/googlefonts/rubik | assets/fonts/Rubik-OFL.txt:1; AGENTS.md:16,40 |
| Ghidra | NSA reverse-engineering suite | tool: analysing Prozac's `bv2p.exe` | https://ghidra-sre.org | AGENTS.md:91-92 |
| Pillow | Python imaging library | tool: `bake_font.py`, `embed_assets.py` | https://python-pillow.org | tools/fonts/bake_font.py:20 |
| ANGLE, SwiftShader, Vulkan loader | Graphics libraries shipped with gasm-run | vendored (binary) in release bundles | https://chromium.googlesource.com/angle/angle | tools/fetch-gasm-runner.sh:6-7,34-37 |
| coder/websocket; coreos/go-oidc | Go server libraries | library dependencies of the Go server | https://github.com/coder/websocket ; https://github.com/coreos/go-oidc | server/go.mod:6-11 |
| wasi-sdk; VitePress | Toolchain; docs site generator | tool | https://github.com/WebAssembly/wasi-sdk ; https://vitepress.dev | tools/fetch-gasm-sdk.sh; docs/package.json |

## Open questions

- **Carnage3D:** the link `github.com/codename-hash/carnage3d` is not given anywhere in the repo. Check it
  before publishing.
- **Unnamed sources:** the repos don't name the source behind the openrf Cinepak decoder, the opencmr2 Bink
  "published format descriptions", the opensheep RNC "published algorithm", or the openrf 3DO CCB names
  (likely the 3DO SDK docs).
- **No URL found:** OniSplit, Daodan DLL, the "That Tony" hackingonspace posts and cds.doc have no
  canonical URL here.
- **Policy only:** OniSplit and Daodan appear only in the openoni policy line, with no specific use cited.
- **Present but unused:** openbv `ref/baboviolent2-jsclient/` is in the repo, but nothing shows it was used.
- **musl origin:** openbv `ref/musl/` names only FreeBSD msun as its origin. The musl attribution comes
  from the directory name and design/server.md.
