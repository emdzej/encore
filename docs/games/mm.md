---
title: Micro Machines
game: mm
---

# Micro Machines

<GameExhibit />

Micro Machines is Codemasters' top-down racing game with toy vehicles. The program's own lists name eight
classes, from Sportscars, Powerboats and Formula One to Four by Four, Warriors, Choppers and Rufftrux,
and tracks such as Desktop Dropoff, The Breakfast Bends, Bermuda Bathtub and Sahara Sandpit. The DOS
version on a single 720 KB floppy, its program dated September 1994, is a period piece of PC programming:
a real-mode program in hand-written assembly that owns the machine, setting the VGA card to 320 × 200 in
256 colours, programming the timer chip and taking the keyboard's scan codes from its own interrupt
handler. Its music and effects go through a separate sound driver by Sound Images, loaded from one of
three files on the disk: no sound, an AdLib FM card, or the PC speaker
([inventory.md](https://github.com/emdzej/openmm/blob/main/docs/re/inventory.md)).

OpenMM is a function-by-function port of that program, `MICRO.EXE`, to C11, running on
[gasm](https://gasm.emdzej.pl). It is the first DOS game in the collection and the first written in
assembly rather than compiled from C or C++, so every function the port contains has to be read from the
disassembly instruction by instruction. The machine underneath is not emulated: the VGA card, the timer,
the keyboard, the joystick port and the sound hardware are modelled only as far as the game depends on
them, and the program's own code is rewritten
([architecture.md](https://github.com/emdzej/openmm/blob/main/docs/re/architecture.md)).

The project is at its very beginning. As of 10 November 2026 the file layer reads the floppy as a FAT12
image, its extracted files or an installed copy, and gives the same 162 files from each, checked against
an independent reader. The program is checked by size and CRC-32 and unpacked, and the gasm module starts,
finds the data and shows a blank screen. Nothing of the game runs yet. The
[port plan](https://github.com/emdzej/openmm/blob/main/docs/re/port-plan.md) sets out the order of work,
from reading the whole program in Ghidra through the machine model, the formats, the front end and the
race to the sound driver, each step ending in a check, and its last step is a theory of operation.

The rules, the CMake layout and the gasm backend were taken from OpenCMR2 and OpenI76, with the CD-image
reader replaced by a FAT one and the 3D presentation by OpenI76's 8-bit frame.

## Notable stories

### Unpacking the program the way it unpacks itself

`MICRO.EXE` is 28,955 bytes of PKLITE-compressed program; the game's code and its tables exist only after
the little loader at its entry has run. ENCORE's rule is that nothing from the game goes into the
repository, tables included, so the port cannot keep an unpacked copy. Instead it runs the loader's own
steps on the user's file ([pklite.c](https://github.com/emdzej/openmm/blob/main/src/pklite.c)). The first
stage undoes a chained XOR over the second, seeded with a value that doubles as the length of the
compressed data. The second inflates an LZ77 stream whose literal bytes are XOR-ed with the number of bits
left in the current bit word. Even the length and distance tables are read from the decrypted loader,
located through the operands of the instructions that index them
([pklite.md](https://github.com/emdzej/openmm/blob/main/docs/formats/pklite.md)).

The result, 82,493 bytes with CRC-32 `943cfcf8`, is checked three ways: against the deark tool, and against
the original loader run in the Unicorn emulator under a minimal DOS
([pklite_run.py](https://github.com/emdzej/openmm/blob/main/tools/emu/pklite_run.py)), both of which give
the same bytes, and against the size and CRC the port records
([exe_test.c](https://github.com/emdzej/openmm/blob/main/tests/exe_test.c)).

### One numbering for every tool

Real-mode addresses are segment and offset, and where a program lands depends on the loader. Ghidra's DOS
loader puts the image at segment 1000h, so the port numbers every address from 1000h as well, and the
emulator harness loads it there too. A citation such as `1000:0006`, the program's entry, means the same
instruction in the source, in Ghidra and in the emulator
([exe.h](https://github.com/emdzej/openmm/blob/main/src/exe.h)).

### A volume label that looks like a file

The floppy's volume label is `MICROMASTER`. Some archive tools list the label's directory entry as an empty
file called `MICROMAS.TER`, so a folder made with them has one file more than the disk. The project
extracts with its own reader and tests that the folder and the image give identical files
([vfs_test.c](https://github.com/emdzej/openmm/blob/main/tests/vfs_test.c),
[fat.py](https://github.com/emdzej/openmm/blob/main/tools/fat.py)).

## Gallery

<Gallery />

## Standing on shoulders

No earlier decompilation or reimplementation of the DOS program was found. A GPL remake of the same name,
[OpenMM on SourceForge](https://sourceforge.net/projects/openmm/), is a new game in Qt and OpenGL and shares
no code. [deark](https://entropymine.com/deark/) is the independent check for the unpacker.

Tools throughout: [Ghidra](https://ghidra-sre.org), [ghidra-cli](https://github.com/akiselev/ghidra-cli),
the [Unicorn](https://www.unicorn-engine.org) emulator, [Capstone](https://www.capstone-engine.org) and
[wasi-sdk](https://github.com/WebAssembly/wasi-sdk). Gaps in these credits are bugs —
[tell us](https://github.com/emdzej/encore/issues).

## Getting a copy

OpenMM contains no code or data from the game. You will need your own copy of Micro Machines for DOS: the
720 KB floppy whose `MICRO.EXE` is 28,955 bytes (CRC-32 `8e84eb22`), as a disk image, as its files, or
installed from it to a hard disk. Other versions of the program are refused with a message.

There is no player or release yet. The project's [game data](https://openmm.emdzej.pl/guide/game-data)
page lists the accepted forms, and the [disk
inventory](https://github.com/emdzej/openmm/blob/main/docs/re/inventory.md) describes what is on the
floppy.

## Further reading

The working documentation is in the repository: the [port
plan](https://github.com/emdzej/openmm/blob/main/docs/re/port-plan.md), the
[architecture](https://github.com/emdzej/openmm/blob/main/docs/re/architecture.md), the
[inventory](https://github.com/emdzej/openmm/blob/main/docs/re/inventory.md) and the [file
formats](https://github.com/emdzej/openmm/blob/main/docs/formats/index.md).

Across ENCORE, the most relevant guides are [Choosing an approach](/guides/approach), [Reverse engineering
workflow](/guides/reverse-engineering), [File formats and game data](/guides/formats) and [Porting
function by function](/guides/porting).
