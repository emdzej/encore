# names.tsv: format, confidence, hygiene

`tools/ghidra/names.tsv` is the single record of what every address is called. The Ghidra project and the
dumps are regenerated from it; the port's names must match it.

## Format

Tab-separated, one row per address, `#` comments allowed:

```text
# addr	name	module	confidence	description
# confidence: high = read and understood, med = from calls/strings, low = guess
004a9720	WinMain	main	high	Single-instance check (FindWindow), init, PeekMessage loop calling Input_Poll + Game_Frame when idle
004a98b0	WndProc	main	med	Window procedure (QueryCancelAutoPlay, activation)
00401050	Event_Schedule	event	high	Queue event (type,arg) to fire `delay` frames from now; insert sorted by due time
```

- `addr`: 8 hex digits, no `0x` (ApplyNames accepts either).
- `name`: the original's naming convention where one is known (Bungie's `XXr`/`XXi` prefixes), else
  `Module_Verb[Object]`, C++ methods `Class_Method`, constructors `Class_ctor`, destructors `Class_dtor`.
- `module`: the source module from the inventory (`main`, `crt`, `sim`, `render`, ...).
- `description`: one line, in your own words: what it does, key globals and constants by address.

A simpler variant (OpenSheep `names.txt`) is `<hex addr> <name>` with `#` section comments and an optional
third column `fn`, meaning "create a function here" for addresses reached only through tables. Prefer the
TSV for new projects.

## Confidence levels in use

| Level | Meaning | Used by |
|---|---|---|
| `high` | Read and understood | all |
| `confirmed` | Checked against behaviour or a differential test | OpenCMR2 (382 of 1,969 rows) |
| `med` | Inferred from calls and strings | all |
| `low` | Guess | all |
| `struct` | A vtable slot `Class_vN`, purpose unknown | OpenNFSPU |
| `range` | CRT or unidentified placeholder | OpenNFSPU |

For names carried from another build, add the method to the description (for example `mac:strings:3` or
`mac:neighbourhood`), so the evidence stays with the name.

## apply-names.sh template

Adapted from OpenCMR2 (`tools/ghidra/apply-names.sh`). Replace the project and program names.

```sh
#!/usr/bin/env bash
# Applies tools/ghidra/names.tsv to the Ghidra project and regenerates the grep dumps in re/ (git-ignored).
set -euo pipefail
cd "$(dirname "$0")/../.."
NAMES=$(cd "$(dirname "${1:-tools/ghidra/names.tsv}")" && pwd)/$(basename "${1:-tools/ghidra/names.tsv}")
P=(--project game --program game.exe)
ghidra script run tools/ghidra/FillGaps.java "${P[@]}"
ghidra script run tools/ghidra/ApplyNames.java "${P[@]}" -- "$NAMES"
mkdir -p re
ghidra script run tools/ghidra/DumpAllNamed.java "${P[@]}" -- "$PWD/re/all.c"
ghidra script run tools/ghidra/DumpMeta.java "${P[@]}" -- "$PWD/re/meta.tsv"
grep -o '^// ==== [^ ]* @ [0-9a-f]*' re/all.c | awk '{print $5, $3}' | sort > re/funcs.txt
echo "re/all.c: $(wc -l < re/all.c) lines, $(wc -l < re/funcs.txt) functions"
```

## Hygiene checks

```sh
# duplicate addresses
grep -v '^#' tools/ghidra/names.tsv | cut -f1 | sort | uniq -d
# duplicate names
grep -v '^#' tools/ghidra/names.tsv | cut -f2 | sort | uniq -d
# unnamed functions still referenced by the port
grep -rhoE '0x4[0-9a-f]{5}' src | sort -u | sed 's/^0x/00/' > /tmp/cited.txt
grep -E ' FUN_' re/funcs.txt | awk '{print $1}' | sort > /tmp/unnamed.txt
comm -12 /tmp/cited.txt /tmp/unnamed.txt
```

A wrong name with high confidence spreads into code and docs; when one is found, fix the row, re-apply, and
grep `src/` and `docs/` for the old name in the same change.
