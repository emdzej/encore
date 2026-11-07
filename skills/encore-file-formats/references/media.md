# Media readers and codecs: specifics from the projects

## Disc images

- ISO 9660: primary volume descriptor at sector 16; read the tree once at mount. Prefer Joliet names when
  present (OpenNFSPU's primary tree is 8.3 only).
- Sector format by sync pattern + PVD: 2048 cooked; 2352 MODE1 (16-byte header); 2352 MODE2 form 1 (24-byte
  header). User data of a raw sector: bytes 16..16+2048 (MODE1). Reference: https://github.com/emdzej/openrf/blob/main/src/vfs.c
- `.cue` is text: sniff it and refuse with "pick the .bin" guidance (OpenRF, OpenSheep), unless the port needs
  the track layout (OpenI76 reads cue sheets).
- Mixed-mode discs (Interstate '76 disc 2: MODE1/2352 data track + 16 Red Book audio tracks): keep BIN+CUE;
  expose audio tracks as raw 44.1 kHz s16 stereo PCM ranges; fallback FLAC/Ogg/WAV; else silence logged once.
- Volume labels can be game logic (Interstate '76 finds discs by label): the VFS must answer them.
- Through gasm: the guest mounts the image itself over `gasm_asset_read_at64` (`--asset cd=<image>`); loop
  short reads.

## InstallShield cabinets

| Version | Layout notes | Reader |
|---|---|---|
| 5 (GTA 2002) | `data1.cab` + `data2.cab`, descriptor without MD5, no `data1.hdr`; a file may span volumes (flags 5 = split + compressed); per-file deflate | https://github.com/emdzej/opengta/blob/main/src/iscab.c |
| 6 (CMR2) | `data1.hdr`/`data1.cab`/`data2.cab`; `ISc(` headers; 0x57-byte file descriptors; data as chunks of u16 length + raw deflate; stale duplicate entries, first wins | https://github.com/emdzej/opencmr2/blob/main/src/vfs_cab.c, reference https://github.com/emdzej/opencmr2/blob/main/tools/iscab.py |
| 6 (Ballance) | `data1.hdr` version 0x0100600c; per-file deflate; MD5 checked | https://github.com/emdzej/openballance/blob/main/src/iscab.c |

Format knowledge from unshield's documentation; unshield 1.6.2 itself fails on GTA's split `Track8.wav`,
and the game keeps the previous track's length when a track is missing, so an unshield install differs
silently. Always byte-compare every cabinet file with an installed copy (`cab_test`). Overlay the cabinet at
installed paths so the exe and other installed files appear where the game expects them.

## Installer VISE (Oni)

- Segments: `"ESIV"`, archive id `0x3a07bc24`, segment number, u32. The setup exe ends with `"ESIV"` + offset
  of its PE overlay (segment 1).
- Item frames: scan for 32 x 0xff + 0x00 + length + printable name; bodies differ by type. File body: sizes,
  segment, offset, FILETIMEs, CRC-32 at +0x49 (unaligned).
- Compression: raw deflate stored in byte-swapped 16-bit words. Swap each pair (pad odd length), then inflate.
- Inflate each file on open in the VFS: the game plays straight from the ISO.
- Docs: https://github.com/emdzej/openoni/blob/main/docs/formats/vise.md; reader:
  https://github.com/emdzej/openoni/blob/main/src/vfs_vise.c; standalone: https://github.com/emdzej/visextract

## RAR self-extractors

Not read in place in any project. OpenNFSPU documents extracting repack `Setup/install.exe` RAR SFX archives
with `unar` (7-Zip and p7zip fail "Unsupported Method"):
https://github.com/emdzej/opennfspu/blob/main/docs/howto/extract-game.md

## Inflate

The projects that read cabinets or deflate data carry their own RFC 1951 inflate (`src/inflate.c` in OpenGTA,
OpenCMR2 and OpenBallance) rather than linking zlib.

## Codecs

| Codec | Notes | Reference |
|---|---|---|
| Smacker SMK2 | Huffman trees, value trees with 3 recent-value escapes, palette deltas, 4x4 blocks, Huffman DPCM audio. Check: every tree has exactly 3 fewer nodes than header allocation / 4 | https://github.com/emdzej/opengta/blob/main/docs/movie.md |
| Bink 1 `BIKi` | 9 bundles, 10 block kinds, 16 Huffman code sets, bit-plane DCT, 16 quant matrices, integer IDCT; audio RDFT with critical bands. Tables from the user's `binkw32.dll`. Check every frame against ffmpeg (CRC of yuv420p frames) | https://github.com/emdzej/opencmr2/blob/main/src/bink.c, https://github.com/emdzej/opencmr2/blob/main/tools/bink-ref.sh |
| Bink 1 (Oni) | AAN IDCT output stored as byte without clamping (wraps, kept); YUV->RGB via the DLL's `_YUV_init` table path; last frame of the outro never shown | https://github.com/emdzej/openoni/blob/main/docs/formats/bink.md |
| Cinepak | From the public bitstream description; true colour instead of the original's 8-bit dither | https://github.com/emdzej/openrf/blob/main/src/cinepak.c |
| MS-ADPCM | Predictor shift rounds towards minus infinity (ffmpeg's /256 rounds towards zero and drifts); decode the short last block when stored durations count it | https://github.com/emdzej/openoni/blob/main/docs/formats/sndd.md |
| MS Video 1 (CRAM) | Decoded per frame into a texture | https://github.com/emdzej/openballance/blob/main/src/movie.c |
| RNC ProPack m2 | 18-byte BE header, reflected CRC-16 0xA001; verify every packed file by CRC | https://github.com/emdzej/opensheep/blob/main/tools/rnc.py |
| RefPack 0x10FB | Four command forms; port the other dispatched EA codecs too | https://github.com/emdzej/opennfspu/blob/main/docs/formats.md |

Codec tables are the vendor's data: read them from the user's DLL at run time, validate them, and pin the
DLL by size and CRC-32 when its tables are read.
