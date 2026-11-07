---
name: encore-file-formats
description: Decodes an old game's data files and installation media for an ENCORE-style faithful reimplementation - documents each format from the executable's own reader, writes a decoder and native test that print a --summary hash over every file on the disc (asserted via an environment variable) and cross-checks it against an independent reader, reads the shipped media in place (ISO 9660, raw MODE1/2352 BIN, InstallShield cabinets including split files, Installer VISE) through a case-insensitive VFS, and writes codecs (Smacker, Bink 1 with tables from the user's binkw32.dll, Cinepak, MS-ADPCM) from public descriptions. Use when adding support for a new file type, codec, archive, installer or disc layout, or when a decoder disagrees with the original or between folder and image.
---

# Decode file formats and game data

The executable's reader is the specification. A decoder is finished when it prints one summary hash over
every file of the disc and an independent reader agrees with it. The user's media is read
as shipped; nothing is extracted into the repository.

## When to use

- A new file type, archive, compression scheme or codec is needed by the port.
- Supporting a new form of the user's data: disc image, CD folder, installed folder, installer archive.
- A decoder's output differs between folder and image, between Python and C, or from the original.

## Inputs required

- The user's data at `OPEN<GAME>_DATA=<dir|image>` (and the CD/image if the installer must be read).
- The address of the executable's loader for the format (find it via strings, file names, callers of the
  file layer; see the `encore-reverse-engineering` skill).
- `python3` (stdlib only for reference tools), the native CMake build.

## Hard rules

1. Never commit data files, extracted assets, decoder output, or anything derived from them. Output goes to
   git-ignored `out/`.
2. Reference tools use the Python standard library only (own PNG/WAV writers if needed).
3. Codec and format tables come from the user's executable or DLL at run time, never from source.
4. The executable is the authority. Community docs, ffmpeg, unshield, afconvert explain differences; they
   do not settle them.
5. All file access in the core goes through `vfs.h`; names are case-insensitive with `\` or `/`.
6. Folder and image must give identical hashes.

## Procedure

### 1. Survey

```sh
find "$OPEN_GAME_DATA" -type f | sed 's/.*\.//' | tr A-Z a-z | sort | uniq -c | sort -rn   # extensions census
```

List every file the game opens and which function reads it, in one formats page (`docs/formats/index.md`
or `notes/formats.md`). Mark files the game never opens (developer leftovers) as ignored.

### 2. Read the loader

Read the reader in the executable (decompile and disassembly). Note header layout, field widths and
endianness, how counts and offsets are used, what is validated, what is sanitised on read, and which
fields are never read. Write `docs/formats/<fmt>.md` from `references/format-doc-template.md`.

### 3. Independent reader (optional, but have one check)

You need one independent confirmation of your decoder. Pick what is cheapest for the format: the original's
own reader run in Unicorn on the same file (strongest, see encore-verification), or a second implementation.
A quick script is often handy while you are still working the format out — `references/decoder-templates.md`
has a stdlib-only Python one — but there is no reason to write Python first if you go straight to C. A
second reader must:

- walk every file of the type, in a fixed order (archive order or sorted names);
- check every invariant the format implies (sizes tile the file, counts match headers, CRCs match);
- print one `--summary` line: FNV-1a 32 over name, sizes and decoded content, plus counts;
- export samples to `out/<fmt>/` (PNG/WAV/OBJ) for inspection.

Run it over the folder and over the mounted image; the lines must match.

### 4. C decoder and test

Write `src/<fmt>.c` with explicit byte reads (no struct casts), offsets kept as offsets (no host pointers
written into data), and the original's quirks. Write `tests/<fmt>_test.c` from the C template: it skips
with exit 0 without data, prints the same summary, and asserts it when `OPEN<GAME>_<FMT>_SUMMARY` is set.
Record the expected hash in AGENTS.md next to the command.

```sh
python3 tools/<fmt>.py --summary "$OPEN_GAME_DATA"   # only if you wrote a second reader
OPEN<GAME>_<FMT>_SUMMARY=<hash> ctest --test-dir build -R <fmt>_test --output-on-failure
```

### 5. Media readers (when the data is inside an installer or image)

Follow `references/media.md`: ISO 9660 with sector auto-detection, raw 2352, Joliet, `.cue` handling,
mixed-mode discs, InstallShield 5/6 cabinets (split files across volumes), Installer VISE (byte-swapped
deflate). Write the reader, then a test that byte-compares every file read through
it with an installed copy (`cab_test`). Mount it in the VFS so the game runs from the shipped media.

### 6. Codecs

Write from public descriptions; read tables from the user's DLL (pin it by size + CRC); validate the tables
(for example, a scan table must be a permutation). Compare every frame with an independent decoder where one
exists (ffmpeg CRCs or `-f framemd5`), and explain each difference. Details per codec in
`references/media.md`.

### 7. Wire into the VFS

- Names normalised as the original opens them: resolve `.`/`..` against the original's working directory,
  `\` to `/`, collapse repeated separators, strip leading `./`.
- Positional reads (`vfs_read_at`) with 64-bit offsets; stream large files in chunks.
- Decide mount order (folder assets before image, first match wins) and document it.
- Writes (saves, settings, registry values) go to `gasm:storage`, never to the data.

## Pitfalls

- Memory-image formats with offsets relocated to pointers at load: keep offsets and accessors so the 64-bit
  native build works.
- Four-character codes compared as little-endian integers appear reversed in files.
- MSVC debug-heap fill (`0xCD`) and editor memory written into files; garbage glyph records.
- WAV files with extra chunks (`fact`) or loaders that read a canonical 44-byte header at fixed offsets.
- Non-standard codec behaviour: rounding direction, shift-only widening, last partial blocks, unclamped
  IDCT output, DXT1 3-colour mode opaque black.
- Installers: split files across volumes, stale duplicate entries (first wins), extraction tools that fail
  silently on some files (unshield 1.6.2 on a split file).
- `.cue` is text: sniff and refuse it with guidance unless tracks are needed; never convert a mixed-mode BIN
  to ISO (the audio tracks are lost).
- Caches the game generates (blend tables) can be regenerated rather than required.

## Verification

- Python and C summaries equal over every file; equal from folder and image.
- Installer reader: every file byte-equal to an installed copy; CRCs/MD5s in the archive checked.
- Codec: every frame of every movie compared (bit-exact or differences explained in the doc).
- Tests skip cleanly without data (CI) and assert the hash with data.
- `git status --ignored` shows `out/` content ignored; nothing from the data is tracked.

## Further reading

- https://encore.emdzej.pl/guides/formats
- https://encore.emdzej.pl/guides/reverse-engineering
- https://encore.emdzej.pl/guides/project-layout
- https://encore.emdzej.pl/guides/verification
- https://encore.emdzej.pl/guides/shipping
