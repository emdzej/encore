---
name: encore-data-hygiene
description: Legal and data rules for ENCORE game reimplementations - never commit the game's assets, code or anything derived from them; read tables, strings and constants from the user's own executable at run time behind a size and CRC-32 check; keep decompiler output out of the repository; decide the screenshot policy; accept every form of the user's data (disc image, raw BIN, folder, installed copy, installer archives); and use correct wording ("bring your own copy", no freeware claims). Use when setting up .gitignore, adding an exe table reader, reviewing a commit for leaked data, writing user-facing docs about game data, or adding a new data source.
---

# Data hygiene

The repository contains only original work. Everything that came from the game is read from the user's
copy at run time. This is the legal posture of every ENCORE project ("0 bytes of game data") and also what
makes the port exact.

## Hard rules

1. **Never commit original data or anything derived from it**: disc images, exe/DLL copies, archives,
   extracted or converted textures, models, sounds, music, movies, fonts, level files, cover scans, and
   decompiler dumps. Exception only if AGENTS.md says so: screenshots that are renders of the port.
2. **No tables from the executable in source**: no arrays, strings, geometry, float constants or lookup
   tables pasted or generated into `src/`. Read them by virtual address at run time. Instruction operands
   and small algorithmic constants (a shift, a mask, `214013`) are fine.
3. **No decompiler output** in source or docs. Describe layouts, formulas and addresses in your own words.
4. **No code from leaks or other projects.** Community format notes may inform; the exe is the authority.
   Where a clean-room constraint exists (OpenBallance: "do not consult the leaked Ipion source"), state it
   in AGENTS.md.
5. **Never host, bundle, download or link copies of the game.** Not on the site, not in releases, not in CI.

## Step 1 - .gitignore before the first file arrives

Anchor patterns to the root (an unanchored `game/` also hides `src/game/`):

```
/cd/
/cd2/
/game/
/installer/
/re/
/out/
/<game>.exe
*.iso
*.bin
*.cue
*.mdf
*.nrg
*.exe
*.dll
*.cab
*.hdr
*.<game-specific archive ext>
```

Check: `git check-ignore -v cd/anything re/all.c out/x.png` prints a rule for each. Review staged files
before every commit: `git diff --cached --stat` must show no binary you did not author.

## Step 2 - Read the executable at run time

`src/exe.c` (copy from a sibling, then update the identity):

1. Load the user's exe through the VFS (never `fopen`).
2. Check size and CRC-32 against `EXE_SIZE`/`EXE_CRC32` in `src/exe.h`. On mismatch, fail with a message
   naming the expected version, size and CRC, and the found size and CRC. Grep afterwards: a copied
   sibling message still naming another game is a known slip.
3. Map PE sections at their RVAs in a `SizeOfImage` buffer (BSS reads 0).
4. Run registered loaders that fill C structs; expose `exe_u8/u16/u32/s16/s32/f32/f64(va)`, `exe_str(va)`,
   `exe_ptr`, and `exe_mut` only for the few tables the original modifies in place.
5. Float constants: `#define K(va) exe_f32(va)` (or `exe_f64`) - never decimal literals. A decimal literal
   can differ in the last bit, and a double read as a float is a different number.
6. Values that exist only as instruction immediates (pointers stored by start-up code, switch-coded
   parameters) may be read from the instruction bytes at run time.
7. Same for middleware DLLs whose tables you need (`binkw32.dll` codec tables): pin size + CRC, read at run
   time, validate structure (e.g. a scan table must be a permutation).

Generators may emit **descriptors** (address, count, type, loader) but never contents. The exe is needed to
regenerate them, never to build.

Tests assert strings by length + CRC rather than by content, so the text stays out of the tree.

## Step 3 - Accept every form of the user's data

Users have the data in many shapes; support all of them in the VFS, and prove they give identical results.

| Form | How |
|---|---|
| Disc image `.iso` (2048-byte sectors) | ISO 9660 reader over `gasm_asset_read_at64` (`--asset cd=<image>`) |
| Raw `.bin` (2352-byte MODE1, MODE2 form 1) | Detect by sync pattern + PVD; skip 16 or 24-byte headers |
| `.cue` | Refuse with "choose the .bin" (or parse it, if the disc has audio tracks) |
| Mixed-mode disc (data + Red Book audio) | Keep BIN/CUE; never convert to ISO, the music lives only in audio tracks |
| Folder copy of the disc / installed game | `--asset-dir`; case-insensitive lookup, `\` and `/`, collapse `//`, resolve `..` from the original's working dir |
| InstallShield cabinets (`data1.hdr`/`.cab`) | Own reader + inflate, read in place; byte-compare every file against an installed copy in a test |
| Other installer archives (MindVision VISE, RAR SFX) | Own reader as a file layer when feasible; otherwise document the extraction tool that works (`unar` for RAR SFX) |
| Joliet names | Prefer the Joliet tree when the primary tree is 8.3 only |

Verification: the same headless run gives identical `video_fnv32`/`audio_fnv32` from every accepted source.
Without data, the module exits 1 with "game data not found" (not a crash).

Pitfalls: third-party extractors can be wrong (unshield 1.6.2 fails on a file split across cabinets, and the
game then silently behaves differently); patches can change archive formats (refuse them by CRC).

## Step 4 - Redistributable content (source ports only)

If the content is genuinely licensed for redistribution (OpenBV: GPL upstream), still keep it out of git:
fetch it from the pinned upstream commit with a file-count and tree SHA-256 check
(`tools/fetch-content.sh`), and ship it in bundles and the web player only.

## Step 5 - Screenshots and site art

Decide the policy in AGENTS.md before the first image:

- Allowed (most projects): frames of the running port, produced by `tools/screenshots.sh` from headless
  `gasm-run --screenshot` with scripted input. Never desktop captures, never the game's own image files,
  never extracted sprites.
- None yet (OpenOni, early OpenI76): a project may simply not have published any. That is not a ban; the
  rule against derived data covers data files and assets, not renders of the port. Local captures stay in
  git-ignored `out/` until the project publishes them.
- Site identity: colours sampled from the game, shapes redrawn; heroes drawn procedurally; app icons from
  the project's own mark, not the publisher's or a manufacturer's logo.
- Tools that can extract reference art (skin templates) label their output "do not distribute" and write it
  to git-ignored folders.

## Step 6 - Wording

- "Bring your own copy": every page about data says what the user must own and that nothing is bundled.
- Name the exact supported release ("Rockstar's 2002 re-release (`GTAINSTALLER.zip`)", "the Windows US v1.0
  CD"). Never call a game free, freeware or abandonware without an official source.
- No links to copies, ROM sites or torrents, including in issues and release notes.
- Footer: project licence; "<Game> is (c) <year> <owner>"; "contains no original code or assets"; "not
  affiliated with <owner>"; "runs from your own copy".
- Status claims: one authoritative status page; don't overstate.

## Review checklist (run before each commit touching data paths, tools or docs)

- [ ] `git diff --cached --stat`: no binaries or dumps you did not author.
- [ ] No new array literal in `src/` whose values came from the exe; constants via `K(va)`.
- [ ] No decompiler-shaped code (`FUN_`, `DAT_`, `local_`, `param_`, `uVar1`) in `src/` or `docs/`.
- [ ] New data source covered by a test that hashes identically to the folder.
- [ ] User-facing text: own-copy wording, exact release named, no freeware claim, no links to copies.
- [ ] Screenshots, if any, came from `tools/screenshots.sh`.

## Further reading

- https://encore.emdzej.pl/guides/formats
- https://encore.emdzej.pl/guides/shipping
- https://encore.emdzej.pl/guides/lessons
- https://encore.emdzej.pl/about/your-copy
