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

As of 10 November 2026 every routine of the program that runs has been rewritten, with the launcher
`MICRO.COM`'s order, the Codemasters splash screen `SM.EXE`, the code-card check and both sound drivers.
The port plays from the splash through the menus into one- and two-player races, with the AdLib music and
effects through a model of its sound chip written for the port, and runs in the browser from the player's
own floppy. It is checked against the original program running in an emulator in two ways: 151 routines
one call at a time, the same memory and registers after each, and whole runs picture by picture, where a
two-player game, a qualifying race and a one-player series give the original's pictures in the original's
order ([status](https://openmm.emdzej.pl/guide/status),
[porting.md](https://github.com/emdzej/openmm/blob/main/docs/re/porting.md)). How the game works is
written up as a [theory of operation](https://openmm.emdzej.pl/guide/theory).

The rules, the CMake layout and the gasm backend were taken from OpenCMR2 and OpenI76, with the CD-image
reader replaced by a FAT one and the 3D presentation by OpenI76's 8-bit frame.

## Notable stories

### Checking hand-written assembly one routine at a time

Hand-written assembly passes values in registers and flags as it likes, so the port keeps them: every
routine is a C function over a model of the CPU's registers and the 1 MB of real-mode memory, and leaves
both as the original leaves them. That makes each routine checkable alone. A recorder runs the original in
the emulator until the routine is entered, saves memory and registers, and logs every port access,
interrupt and sound-driver call until it returns; the checker replays that into the port's routine and
compares
([capture.py](https://github.com/emdzej/openmm/blob/main/tools/emu/capture.py),
[fncheck.c](https://github.com/emdzej/openmm/blob/main/tools/fncheck.c)). Tracks the recorded runs never
reach are recorded by writing the theme and the track into the original's memory as a race starts.

The routines that wait for the timer cannot be recorded this way, so whole runs are compared instead: the
same keys into both, then the sequence of distinct pictures. The differences left all trace to the
emulator's clock rather than the port. Its timer drifts against its frames by one tick every 169 frames,
which is enough to put a blinking prompt or the cars' blink before the start in the other phase
([porting.md](https://github.com/emdzej/openmm/blob/main/docs/re/porting.md)).

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

The [play page](https://openmm.emdzej.pl/play/) runs the port in the browser from your own floppy image or
its files; there is no release yet. The project's [game data](https://openmm.emdzej.pl/guide/game-data)
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
