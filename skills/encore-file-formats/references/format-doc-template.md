# Format page template

`docs/formats/<fmt>.md` (or `docs/<fmt>.md`, `notes/formats.md`). Own words only; no decompiler output.

```markdown
# <FMT>: <what it holds>

Files: `<dir>/*.<ext>` (<n> files, <bytes> bytes on the disc). Read by `<Name>` 0x4xxxxx
(called from `<Caller>` 0x4xxxxx). Port: `src/<fmt>.c`. Test: `tests/<fmt>_test.c`
(`OPEN<GAME>_<FMT>_SUMMARY`). Reference decoder: `tools/<fmt>.py`.

## Layout

All little-endian unless noted.

| Offset | Size | Field | Notes | Status |
|---|---|---|---|---|
| 0x00 | 4 | magic `XXXX` | checked by 0x4xxxxx | confirmed |
| 0x04 | 4 | count | records that follow | confirmed |
| 0x08 | 4 | flags | bit 0 compressed; other bits never read (reader 0x4xxxxx) | inferred |

## Records

...

## Values on the disc

Histograms of the fields that vary (from `tools/<fmt>.py census`), so a later reader knows which branches the
shipped data exercises.

## How the game uses it

Load order, caching, what the loader sanitises or patches after reading, lookup rules (case, first match).

## Quirks kept

- ...

## Port deviations

- ... (each with its reason)

## Open questions

- ...
```

Status column: `confirmed` (seen in the reader's disassembly or checked on every file), `inferred` (from data
only). A field the game never reads is documented as "never read" with the reader's address, not guessed.
