# OpenMM: research notes

Source repo: `/Users/mjaskols/Projects/my/openmm` (read-only). Mined 2026-11-10, the project's first day,
before its first commit (groundwork only: step 0 of its port plan).

## 1. Facts

| Item | Value |
|---|---|
| Game | **Micro Machines** (Codemasters), top-down racing with toy vehicles. The program's strings list eight classes (Sportscars, Powerboats, Formula One, Turbo Wheels, Four by Four, Warriors, Choppers, Rufftrux), themed tracks (Desktop Dropoff, The Breakfast Bends, Bermuda Bathtub, Sahara Sandpit, ...), one and two players, qualifying, championship, bonus race, beat the clock, time trials (`docs/re/inventory.md`) |
| Original studio / publisher | Codemasters ("COPYRIGHT CODEMASTERS 1994" in the program, "(c) Codemasters 1994." in `SM.EXE`). Sound drivers "(c) 1992-94 Tony Williams/Sound Images" |
| Year | 1994 (`MICRO.EXE` dated 1994-09-14; installer script "VERSION : 9/9/94") |
| Original tech | **DOS, real mode, hand-written assembly** (no compiler prologues or runtime). VGA mode 13h, DAC, CRTC, retrace; PIT reprogrammed, own IRQ 0 and IRQ 1 handlers (six vectors set); game-port joysticks (201h); mouse (int 33h); DOS int 21h file I/O. Sound through a separate driver binary (`DRIVER0.BIN` none, `DRIVER1.BIN` AdLib 388h + speaker, `DRIVER2.BIN` "Internal Beeper") loaded at `2424:0000` and far-called with the function in AH (109 calls). `MICRO.COM` runs `SM.EXE` then `MICRO.EXE` |
| Targeted original | The 720 KB floppy (FAT12, label `MICROMASTER`, 162 files): `MICRO.EXE` 28,955 bytes CRC-32 `8e84eb22`, **PKLITE-compressed** (version word 0x310f, xor-protected second stage). Unpacked: 82,493 bytes CRC-32 `943cfcf8`, 279 relocations, entry `1000:0006`, code segment `1000` (37,824 bytes, 168 functions found by Ghidra, 26 KB), data segment `193c` (44,669 bytes), 27 far buffers up to the stack at `8d78` |
| Approach | **Function-by-function port** of `MICRO.EXE` (and `SM.EXE`, the sound driver). The machine (memory, VGA, PIT, keyboard, game port, DOS, OPL2) modelled in the core only as far as the game depends on it; one real-mode memory with the image at 1000:0000 (`docs/re/architecture.md`) |
| Address convention | seg:off with the image at segment **1000h**: Ghidra's MZ loader's choice, adopted by the port (`EXE_LOAD_SEG`, `src/exe.h`) and `tools/emu`, so citations agree across all three |
| Language | C11 core, Python 3 tools (capstone/unicorn in the shared `.deps/emu-venv`) |
| LOC | ~1,500 lines of C in `src/` (headers included), ~230 in tests and `tools/unpack.c` (scaffold) |
| Status | **Groundwork** (step 0 of 10 done): FAT12 image + folder VFS, exe check, PKLITE stub ported, gasm skeleton showing a blank 320x200 frame. Nothing of the game runs |
| Site | https://openmm.emdzej.pl (VitePress in `docs/`, CNAME, Pages workflow; not deployed before the first push). Theme: colours sampled from `INTRO.PAL` (VGA red, yellow, blue, cyan), drawn SVG mark and hero (toy track on a tablecloth) |
| GitHub | https://github.com/emdzej/openmm (planned; not pushed at mining time) |
| Browser play | none (port-plan step 8) |
| Releases | none; no bundle tooling yet |
| Runtime | gasm **0.16.1**; `video_present` RGBA from the palette with `video_set_aspect(4, 3)`; raw keyboard delivered as set-1 make/break events with an E0 flag (`plat_key_events`); `GASM_TITLE("Micro Machines")`; 70 Hz frame rate as a placeholder until the PIT rate is read |
| User must supply | The floppy as an image (`--asset disk=disk1.img`), its files (`--asset-dir`), or the installed game (`C:\MICROM`, same layout) |

## 2. Screenshots

None. The port draws only a blank frame; the exhibit uses the project's mark (`docs/public/favicon.svg`
copied as `/shots/mm-emblem.svg`).

## 3. Workflow and tooling

- AGENTS.md from the ENCORE template, nine hard rules (rule 9: credit as you go), the 1000h address
  convention, traps already met (PKLITE literal xor timing, 7-Zip's volume label file, ghidra-cli project
  creation).
- `tools/fat.py`: independent FAT12/16 reader (list, `--summary`, extract). `tools/dis16.py`: capstone
  16-bit disassembly of any range. `tools/unpack.c` (`build/mm_unpack`): writes the port-unpacked program
  as a plain MZ into git-ignored `re/` for Ghidra. `tools/emu/mzload.py` (a minimal DOS loader for
  Unicorn: PSP, relocations, int 21h 30h/4Ah/4Ch) and `pklite_run.py` (runs the stub to the program's
  entry).
- `tools/ghidra/`: `names.tsv` with seg:off addresses; ApplyNames/CreateFunctions patched to parse
  seg:off; FillGaps dropped (it looks for MSVC padding).
- CI: native on macOS clang, Ubuntu gcc and clang with `-Werror`; wasm with `-Werror` and the no-data
  check (exit 1, "game data not found"); shellcheck.

## 4. Verification

| Check | Value |
|---|---|
| Floppy summary (`tools/fat.py --summary`, `vfs_test` over image and folder) | `5b7128d6`, 162 files |
| Unpacked image (port, deark, emulated stub agree byte for byte) | 82,493 bytes, CRC-32 `943cfcf8` |
| Headless, 60 frames, image or folder | `video_fnv32=465a5dc5 audio_fnv32=1689af25 audio_frames=37799` |
| No data | exit 1, "game data not found" |

## 5. Lessons new to ENCORE

1. **Packed executables.** When the program is compressed (PKLITE here), the port runs the loader's steps
   on the user's file and reads the loader's own tables from it (located through instruction operands),
   then checks the unpacked image by size and CRC against two independent unpackers (an external tool and
   the original stub run in Unicorn). No unpacked copy is ever stored. (`src/pklite.c`,
   `docs/formats/pklite.md`)
2. **Floppy images.** A FAT12 reader joins ISO 9660 as an image format; some archive tools list the
   volume label as an empty file (`MICROMAS.TER`), so a folder made with them differs from the disk.
3. **Segmented addresses.** Pick the load segment the disassembler uses (Ghidra's MZ loader: 1000h) and
   use it in the port and the emulator, so a citation is one string everywhere.
4. **DOS games own the hardware.** The platform seam sits at the devices (VGA memory and DAC, PIT, IRQ 1
   scan codes, game port, int 21h files), not at an OS API; the sound driver is a separate binary that is
   itself code to port.
