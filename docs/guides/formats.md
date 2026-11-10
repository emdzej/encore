---
title: File formats and game data
---

# File formats and game data

Every project reads the user's own copy of the game exactly as it was shipped: a disc image, a CD folder, an installed folder, or the installer itself, with InstallShield cabinets, VISE archives and ISO 9660 images opened in place. Each data format is decoded and then proved over every file on the disc: the decoder prints one summary hash over the whole disc, a test asserts it, and the same hash must come from a folder and from a disc image. Most projects also checked the decoder against something independent — the original's own reader, a second implementation, or an external tool. Codecs (Smacker, Bink 1, Cinepak, MS-ADPCM and others) are written from public format descriptions, and their tables are read from the user's DLLs. This page sets out that method, the media readers, the case-insensitive file layer, the codecs, and a catalogue of the formats decoded so far.

## Decode, then prove it over the whole disc

The order the projects followed:

1. **Find the reader in the executable.** The loader or chunk handler is the specification. Note its address for the doc.
2. **Write `docs/formats/<x>.md`** (or `docs/<fmt>.md`, `notes/formats.md`): offsets, sizes, flags, histograms of field values across the disc, reader addresses, and each field marked confirmed or inferred.
3. **Write the decoder** so that it walks every file of that type and prints one summary line (FNV-1a over names, sizes and decoded content, plus counts), with PNG/WAV/OBJ export into git-ignored `out/` for inspection. A test prints the same line, and an environment variable makes it assert the recorded hash.
4. **Check it against something independent.** The strongest check is the original's own reader, run in Unicorn on the same file (see [Determinism and verification](/guides/verification)). A second implementation also works. Most projects here wrote theirs as a quick stdlib-only Python script while exploring the format — OpenGTA's [gtafmt.py](https://github.com/emdzej/opengta/blob/main/tools/gtafmt.py) even carries its own PNG writer — but the language is incidental; what counts is two readers agreeing on every file. External tools such as ffmpeg explain differences but are not the authority.
5. **Cross-check totals** that the format implies: counts against headers, sizes against offsets, CRCs against contents.

Summary hashes recorded in the projects (several were first produced by a Python script, then matched by the C decoder):

| Project | Command | Coverage | Hash |
|---|---|---|---|
| OpenCMR2 | `tools/cmr2fmt.py --summary cd` → `OPENCMR2_FMT_IMAGES/_MODELS/_SOUNDS` | 7,804 DDS, 4,003 TGA, 1,211 models, 604 WAVs, 10 music, 72 fonts | images `58c9384f`, models `f6bd27a1`, sounds `76f48a11` |
| OpenOni | `tools/vise.py --summary <cd>` = `openoni-extract --summary <cd>` | 95 files, 641,025,194 bytes | `9b4bdbfa` |
| OpenOni | `tools/onidat.py game --load` = `build/dat_test` | 155,232 instances, 358,404 links | `66db30fb` |
| OpenOni | per type | textures 8,918; geometries 37,862; animations 8,604; sounds 7,386 | `69e02682`, `8d974ee1`, `a992f7fd`, `97eb43b7` |
| OpenI76 | `tools/zfs.py --summary` → `OPENI76_ZFS_SUMMARY` | 3,847 ZFS members | `914be107` |
| OpenNFSPU | `tests/tex_conv_test.c` vs `tests/tex_ref.py` / `nfsfmt.py` | 10,428 FSH images, 4,424 uploads | — |

Every one must also give the same hash from a folder and from a disc image ([OpenCMR2 AGENTS.md](https://github.com/emdzej/opencmr2/blob/main/AGENTS.md), [OpenOni AGENTS.md](https://github.com/emdzej/openoni/blob/main/AGENTS.md)).

The pay-off is speed with confidence. OpenOni settled decoder correctness for about 155k instances and 60k assets in roughly two days, before any rendering existed. OpenRF decoded its STM movies with three cross-checks on all 7 files before trusting the decoder: audio byte totals equal to the header, contiguous frame numbers, and padding of 0 to 3 bytes ([stm.md](https://github.com/emdzej/openrf/blob/main/docs/stm.md)).

::: tip Independent decoders explain differences; they do not settle them
Compare against ffmpeg, macOS `afconvert` or community tools to understand where you differ, never as the authority. OpenOni's MS-ADPCM matches `afconvert` on full blocks but rounds the predictor shift towards minus infinity; ffmpeg's `/256` rounds towards zero and drifts by tens. OpenOni also decodes the short last block, which `afconvert` drops, because the stored durations count it ([sndd.md](https://github.com/emdzej/openoni/blob/main/docs/formats/sndd.md)).
:::

## Reading the media in place

Users point the game at whatever they have. Supporting the shipped media directly removes an install step, and with it a source of silently different data.

### InstallShield cabinets

- OpenGTA reads InstallShield 5 cabinets (`data1.cab`, `data2.cab`, descriptor without MD5, no `data1.hdr`) with a 964-line reader written from unshield's format documentation plus its own inflate ([iscab.c](https://github.com/emdzej/opengta/blob/main/src/iscab.c), [inflate.c](https://github.com/emdzej/opengta/blob/main/src/inflate.c)). One file spans volumes: `Music/Track8.wav` (index 17, flags 5 = split and compressed) crosses from `data1.cab` into `data2.cab`. unshield 1.6.2 fails on it, and the game silently keeps the previous track's length when a track is missing, so an install made with unshield differs from a real one without any error.
- OpenCMR2 reads InstallShield 6 cabinets (`data1.hdr`/`data1.cab`/`data2.cab`): `ISc(` headers, 0x57-byte file descriptors, files that may span volumes, compressed data as chunks of a u16 length plus raw deflate, and stale duplicate entries where the first wins ([vfs_cab.c](https://github.com/emdzej/opencmr2/blob/main/src/vfs_cab.c), reference [iscab.py](https://github.com/emdzej/opencmr2/blob/main/tools/iscab.py)). The overlay makes `CMR2.exe` and the demo runs appear at their installed paths, so the game runs from the CD image with no install.
- OpenBallance reads the version 0x0100600c (major 6) `data1.hdr` with per-file deflate and an MD5 check ([iscab.c](https://github.com/emdzej/openballance/blob/main/src/iscab.c)).

Each has a `cab_test` that byte-compares every file read from the cabinets with an installed copy.

### Installer VISE

Oni's game files exist only inside the CD's MindVision Installer VISE archive (`ONISETUP.EXE` + `ONISETUP.002`) ([vise.md](https://github.com/emdzej/openoni/blob/main/docs/formats/vise.md)):

- Segments start with `"ESIV"`, the archive id `0x3a07bc24`, a segment number and a u32. The setup executable ends with `"ESIV"` and the offset of its PE overlay (segment 1).
- Item frames are found by scanning for 32 × 0xff, then 0x00, a length and a printable name.
- A file body carries sizes, segment, offset, FILETIMEs and a CRC-32 at +0x49 (unaligned).
- Compression is plain raw deflate stored in byte-swapped 16-bit words: swap each byte pair (padding an odd length), then inflate. The evidence was a bit reader that swaps word bytes, a distance table ending at 24577, and zlib debug strings in the compressor.

[vfs_vise.c](https://github.com/emdzej/openoni/blob/main/src/vfs_vise.c) layers the archive over the mounted ISO and inflates each file on open, so the game plays straight from the disc image ([`e834115`](https://github.com/emdzej/openoni/commit/e834115)). The port plan had called that a later nice-to-have; it became the default. The same reader exists as a standalone Go tool, [visextract](https://github.com/emdzej/visextract).

### RAR self-extractors

Some repacked Porsche Unleashed ISOs have a RAR SFX as `Setup/install.exe`. OpenNFSPU does not read it in place: it documents extracting it with `unar`, because 7-Zip and p7zip fail with "Unsupported Method" ([extract-game.md](https://github.com/emdzej/opennfspu/blob/main/docs/howto/extract-game.md)). OpenNFSPU needs the installed and patched folder, or an ISO of that folder, rather than the setup disc.

### Disc images

- ISO 9660 is read by the guest itself over gasm's positional asset reads. The tree is read once at mount ([OpenRF vfs.c](https://github.com/emdzej/openrf/blob/main/src/vfs.c)).
- Raw sectors are detected from the sync pattern and the primary volume descriptor: 2048-byte cooked, 2352-byte MODE1 (16-byte header) or 2352-byte MODE2 form 1 (24-byte header). By hand, the user data of each 2352-byte sector is `s[16:16+2048]` ([extract-cd.md](https://github.com/emdzej/openrf/blob/main/docs/howto/extract-cd.md)).
- Joliet names are preferred where they exist; OpenNFSPU's primary tree is 8.3 only.
- `.cue` files are text. OpenRF and OpenSheep sniff for them and refuse them with a message pointing at the `.bin`; OpenI76 reads cue sheets, because it needs the track layout.
- Mixed-mode discs. Interstate '76's disc 2 has a MODE1/2352 data track and 16 Red Book audio tracks with the soundtrack (32.9 minutes). Converting the BIN to ISO throws the music away. The plan is a `vfs_cue.c` exposing audio tracks as raw 44.1 kHz s16 stereo PCM ranges, with FLAC/Ogg/WAV fallbacks and silence logged once ([port-plan.md](https://github.com/emdzej/openi76/blob/main/docs/re/port-plan.md)).
- Volume labels. Interstate '76 finds its CD by volume label (`Cd_FindByLabel` 0x484c20) and disc 2 by label `I76_CD2` plus `int12f01.smk`. The file layer must answer those queries.

### Floppy images and packed programs

- Micro Machines came on one 720 KB floppy. OpenMM reads FAT12 and FAT16 images over the same positional asset reads as ISO 9660, the tree once at mount, each file's cluster chain at open ([vfs.c](https://github.com/emdzej/openmm/blob/main/src/vfs.c)). Some archive tools list the volume label's directory entry as an empty file (`MICROMAS.TER` for the label `MICROMASTER`), so a folder made with them has one file more than the disk; the project extracts with its own reader and tests that folder and image agree ([vfs_test.c](https://github.com/emdzej/openmm/blob/main/tests/vfs_test.c), [fat.py](https://github.com/emdzej/openmm/blob/main/tools/fat.py)).
- A compressed executable is still the user's data. `MICRO.EXE` is PKLITE-packed, so OpenMM runs the loader's own steps on the user's file, reads the loader's tables from its decrypted code, and checks the unpacked image by size and CRC-32 against two independent unpackers: deark and the original stub run in Unicorn ([pklite.c](https://github.com/emdzej/openmm/blob/main/src/pklite.c), [pklite.md](https://github.com/emdzej/openmm/blob/main/docs/formats/pklite.md)). No unpacked copy is stored anywhere.

## The file layer

Every project has one `vfs.h`, and nothing else in the core opens files. Its properties:

- Case-insensitive names with either separator. Discs are upper case and game code is mixed (CMR2's disc has both `Fra02Hi.bfl` and `fra01hi.bfl`). Directory backends look names up component by component. Under gasm's `--asset-dir` the runner folds case, and early OpenRF tried each name as spelled and then upper-cased.
- Paths normalised as the original opens them. GTA runs from `WINO\` and opens `..\gtadata\...`. Ballance runs from `Bin\`, so `..\x` names the game folder. Resolve `.` and `..` relative to the original's working directory, collapse repeated separators (Sheep's sprite tables add a leading backslash after the loader's own, [`cc0b7db`](https://github.com/emdzej/opensheep/commit/cc0b7db)), and strip leading `./`.
- Positional, stateless reads. `vfs_read_at` takes an offset with no shared `FILE*`, so threaded hosts and streaming work. Big files are streamed: GTA's music tracks of up to 58 MB in 64 KB reads.
- 64-bit offsets. `gasm_asset_read_at64` is one reason OpenGTA requires gasm 0.6.0. OpenBallance reads in chunks of up to 1 GiB, because `gasm_asset_read_at` takes u32 offsets.
- No directory enumeration over assets, in older gasm. OpenRF's `vfs_list` probes `RFMAPnnn.RFM` names instead. Interstate '76 never searches directories at all: it looks names up in its ZIX index.
- Mount order is a decision. OpenBallance mounts folder assets (an installed folder, or a CD folder with cabinets) and then the `rom` asset (ISO, then cabinets); the first match wins.
- Writes go to storage, not the data. Saves, settings and registry values become `gasm:storage` keys. In OpenBV, a stored file shadows the asset of the same name (an edited `bv2.cfg`, edited maps).

On gasm 0.6.0, `--asset-dir` kept every file open, and OpenBallance documents `ulimit -n 4096` or using the image instead. See [Graphics, audio, input](/guides/platform-layers) for storage and [Browser player, releases, docs](/guides/shipping) for OPFS imports.

## Codecs

All codecs are written for the port from public descriptions. Where a reference implementation is followed, its licence is respected.

| Codec | Project | Notes |
|---|---|---|
| Smacker (SMK2) | OpenGTA | Clean-room from MultimediaWiki. `MOVIE.SMK` 320x200, 415 frames, 25 fps, 44.1 kHz 16-bit mono Huffman DPCM. The full container, Huffman trees, value trees with three recent-value escapes, palette deltas and 4x4 blocks are written up in [movie.md](https://github.com/emdzej/opengta/blob/main/docs/movie.md). Validation trick: every tree has exactly 3 fewer nodes than the header's allocation / 4 (the escape slots). OpenI76 plans its own Smacker 2 decoder checked with `ffmpeg -f framemd5`. |
| Bink 1 (`BIKi`) | OpenCMR2 | [bink.c](https://github.com/emdzej/opencmr2/blob/main/src/bink.c), 917 lines, from public descriptions: 9 bundles, 10 block kinds, 16 Huffman code sets, bit-plane DCT coefficients, 16 quantisation matrices, integer IDCT; audio by RDFT with critical-band quantisers. Codec tables are read from the user's `binkw32.dll` at run time. Every frame of every movie bit-exact against ffmpeg (`tools/bink-ref.sh` CRCs ffmpeg's yuv420p frames); audio to float precision. |
| Bink 1 | OpenSheep | Structured after FFmpeg's `bink.c`/`binkaudio.c`/`binkdsp.c` (LGPL 2.1+ as reference); binkb and the 'k' path omitted as unused; tables from `binkw32.dll`, validated. `tools/bik.c` decodes every frame and measures audio seams. |
| Bink 1 | OpenOni | Ported from `binkw32.dll`. The AAN IDCT stores output bytes without clamping, so values wrap (kept). YUV→RGB through the DLL's `_YUV_init` table path. The outro never shows its last frame, because the loop tests for it before `BinkWait`. |
| Cinepak | OpenRF | Own decoder from the public bitstream description ([cinepak.c](https://github.com/emdzej/openrf/blob/main/src/cinepak.c)), decoding to true colour where the original dithered to an 8-bit palette. |
| MS-ADPCM | OpenOni, OpenCMR2 | OpenOni: rounding towards minus infinity, short last block decoded. OpenCMR2: `.adp` music (RIFF MS-ADPCM stereo 44.1 kHz, block align 2,048) streamed through the VFS, replacing ACM. |
| MS Video 1 (CRAM) | OpenBallance | `atari.avi` decoded per frame into a 256x256 texture ([movie.c](https://github.com/emdzej/openballance/blob/main/src/movie.c)). |
| EA MAD + EA-XA | OpenNFSPU | MAD "Madcow" video (`MADk` key, `MADm` delta, `MADe` predicted), 16x16 macroblocks of 7-bit YUV 4:2:2; EA-XA R1 ADPCM, 15 bytes per 28 samples per channel. |
| JPEG, TIFF, BMP, TGA, PCX | OpenNFSPU | Player pictures, replacing `gimme.dll`. The JPEG decoder reproduces libjpeg's fancy upsampling and fixed-point colour conversion for pixel-exactness. |
| Ogg Vorbis | OpenBV | stb_vorbis streamed from memory: `Music.ogg` is 4.9 MB, about 54 MB decoded. |
| RNC ProPack m2 | OpenSheep | 18-byte big-endian header, reflected CRC-16 0xA001; verified on all 2,465 packed files by CRC ([rnc.py](https://github.com/emdzej/opensheep/blob/main/tools/rnc.py)). |
| RefPack 0x10FB | OpenNFSPU | LZ77 with four command forms. The other EA codecs dispatched by the loader (0x18, 0x30/32/34, 0x46) were ported too, though the data uses only 0x10 ([`8af51da`](https://github.com/emdzej/opennfspu/commit/8af51da)). |

::: warning Codec tables are data
Huffman tables, scan orders, quantisers and critical-band tables belong to the DLL's vendor. OpenCMR2, OpenSheep and OpenOni read them from the user's `binkw32.dll` at run time and pin that DLL by size and CRC where needed, the same way they treat the game's executable. See [Reverse engineering workflow](/guides/reverse-engineering#reading-tables-from-the-executable-at-run-time).
:::

## Catalogue

| Game | Format | What it is | Write-up |
|---|---|---|---|
| Micro Machines | FAT12, PKLITE | The 720 KB floppy; `MICRO.EXE`'s compression, with an xor-protected second stage and literals xor-ed with the bit count | [pklite.md](https://github.com/emdzej/openmm/blob/main/docs/formats/pklite.md) |
| Return Fire | `ART.CAR` | `CCBA` relocatable memory image of 2,165 3DO CCBs; `PRE0` reused as PC draw mode; game colours at +10 in the Win32 `LOGPALETTE` | [car.md](https://github.com/emdzej/openrf/blob/main/docs/car.md) |
| Return Fire | `.RFM` | `WRL\0`, 128x128 tiles, tagged chunks `NAME VHCL LEVL EDTN`; 204 maps | [rfm.md](https://github.com/emdzej/openrf/blob/main/docs/rfm.md) |
| Return Fire | `.STM` | AVIFile dump header, 64 KB super-blocks of Cinepak video records and PCM audio | [stm.md](https://github.com/emdzej/openrf/blob/main/docs/stm.md) |
| Return Fire | `TRANS.TBL`, `SCORE.WAV`, `RFire_HS` | Blend cache regenerable from the palette; one 223 MB music file with a track table in the executable; high scores in original format | [architecture.md](https://github.com/emdzej/openrf/blob/main/docs/architecture.md) |
| GTA | `CMP` v331, `G24` v336 | City map (256x256 columns of blocks, layers numbered from the top); style with 64x64 tiles in 64 KB pages, CLUTs | [formats.md](https://github.com/emdzej/opengta/blob/main/docs/formats.md) |
| GTA | `FXT`, `FON`, `RAW/RAT`, `SDT` | Byte-wise encrypted text; bitmap fonts; headerless pictures; sample tables into headerless PCM | [formats.md](https://github.com/emdzej/opengta/blob/main/docs/formats.md), [audio.md](https://github.com/emdzej/opengta/blob/main/docs/audio.md) |
| GTA | `MISSION.INI` | 72 object types, 150 opcodes, 32-process script VM | [missions.md](https://github.com/emdzej/opengta/blob/main/docs/missions.md) |
| Interstate '76 | `I76.ZFS`, `.ZIX` | Archive of 3,847 members in linked directory blocks; CRLF file index that replaces directory search | [resources.md](https://github.com/emdzej/openi76/blob/main/docs/re/resources.md) |
| Interstate '76 | BWD2, `.MSN`, `.TER`, `.geo`, `.vqm/.cbk` | Tagged chunks tiling 854 files; missions; 5 m terrain cells; meshes; VQ images | [world.md](https://github.com/emdzej/openi76/blob/main/docs/re/world.md), [terrain.md](https://github.com/emdzej/openi76/blob/main/docs/re/terrain.md), [vehicles.md](https://github.com/emdzej/openi76/blob/main/docs/re/vehicles.md) |
| Colin McRae Rally 2.0 | BFL | Optional gzip, `CMPR` + size, trailing directory without an entry count | [bfl.md](https://github.com/emdzej/opencmr2/blob/main/docs/formats/bfl.md) |
| Colin McRae Rally 2.0 | PP_F (`.c3d .sky .gro .obj .sht`) | Memory images relocated by `C3d_Fixup` 0x4b93c0; FVF 0x2d2 | [c3d.md](https://github.com/emdzej/opencmr2/blob/main/docs/formats/c3d.md) |
| Colin McRae Rally 2.0 | Stage archive | 25 member types: collision quadtree, walls, camera splines, AI nets, pace notes, replays | [stage.md](https://github.com/emdzej/opencmr2/blob/main/docs/formats/stage.md) |
| Colin McRae Rally 2.0 | Bink, `.adp`, TGA/DDS | Movies, music, textures (DXT mandatory) | [media.md](https://github.com/emdzej/opencmr2/blob/main/docs/formats/media.md) |
| Porsche Unleashed | RefPack, VIV, FSH/SHPI, CRP, MAD, ASF, BNK, `.rpl`, FERT, `.scn` | EA's codecs, containers, chunk trees, video, audio patches, replays, front-end layouts, scenes | [formats.md](https://github.com/emdzej/opennfspu/blob/main/docs/formats.md) |
| Sheep | `.xp`, RNC, SPR, BLO, `HiScore.tab` | Footer-indexed archive, ProPack, RLE sprites with per-pixel alpha, levels, obfuscated scores | [formats.md](https://github.com/emdzej/opensheep/blob/main/notes/formats.md) |
| Oni | VISE, `.dat/.raw` | Installer archive; instance files with layouts as bytecode in the executable | [vise.md](https://github.com/emdzej/openoni/blob/main/docs/formats/vise.md), [dat.md](https://github.com/emdzej/openoni/blob/main/docs/formats/dat.md) |
| Oni | TXMP, M3GM, AKEV, TRAM, ONCC, SNDD, OSBD, TSFF, OBJC, ONWC | Textures, geometry, environments, animations, characters, sounds, sound objects, fonts, objects, weapons | [docs/formats](https://github.com/emdzej/openoni/tree/main/docs/formats) |
| Ballance | `.cmo/.nmo` | Virtools file version 8: zlib'd object table and `CKStateChunk`s with identifier-linked fields | [ck-runtime.md](https://github.com/emdzej/openballance/blob/main/docs/ck-runtime.md) |
| Babo Violent 2 | `.bvm` | Map versions 10010/10011/20201/20202 | [server.md](https://github.com/emdzej/openbv/blob/main/design/server.md) |

## Traps in old formats

- Memory images with offsets. ART.CAR's pointers are file offsets rebased by load address; PP_F offsets are relocated into pointers at load. Keep offsets and accessors so the 64-bit native build reads the same data.
- Four-character codes compared as integers. OpenNFSPU's ids are compared as little-endian u32 (`'Arti'` as 0x41727469), so files show them reversed (`itrA`).
- Uninitialised memory written to disk. Sheep's SPR names are padded with `0xCD`, MSVC's debug-heap fill. One CMR2 font glyph record is all 0xcd bytes; the port gives it no kerning rather than read past the file.
- Editor leftovers. Return Fire's `NAME` chunk contains leftover editor memory. OpenNFSPU ignores `vssver.scc`, `FEData/Backup/V3.2.zip`, `*.xls` and `*.h` on the disc.
- Not quite standard containers. `DRUMS.WAV` has a `fact` chunk, so always locate `data`. CMR2 reads a canonical 44-byte WAV header at fixed offsets and aliases empty `cut.wav` members to another member's offset. Oni's DXT1 uses shift-only endpoints, rounds red and blue thirds but not green, and makes the fourth colour of 3-colour mode opaque black.
- Caches the game generates. Return Fire's `TRANS.TBL` is regenerable bit-exact from the palette, so the port can rebuild it rather than require it.
- Loaders that fix data. If the original sanitises fields on read, so must the port (Oni's spawned bit 0x20, [`cd069f1`](https://github.com/emdzej/openoni/commit/cd069f1)). If it reads past an array or trusts a count, document what it effectively does.
- Saves. OpenRF and OpenOni keep the original save layouts. OpenCMR2 maps saves onto storage keys with the same names and states that compatibility with the original's save format is not a goal. Decide and document which.

## Checklist

1. List every file the game opens, and which function reads it, in one formats page.
2. Accept every shipped form of the data: disc image (ISO, raw 2352 MODE1/MODE2), CD folder, installed folder, and the installer itself where the game lives inside it.
3. Write the installer reader (InstallShield 5/6, VISE) and byte-compare every file it extracts with an installed copy.
4. Make `vfs.h` case-insensitive with either separator, resolve paths relative to the original's working directory, collapse repeated separators, and use positional 64-bit reads.
5. Refuse `.cue` with a helpful message unless you need tracks; never convert a mixed-mode BIN to ISO.
6. For each format: doc page with reader addresses, decoder with a whole-disc `--summary`, a test asserting the hash through an environment variable, and one independent check (the original's reader under emulation, or a second reader).
7. Run every summary from both a folder and an image; the hashes must match.
8. Write codecs from public descriptions; read their tables from the user's DLL; compare with ffmpeg or `afconvert` to understand differences.
9. Record quirks of each format (padding, rounding, wraps, leftovers) under "Quirks kept" in its doc.
10. Decide whether saves keep the original format, and say so in the docs. Continue with [Determinism and verification](/guides/verification).
