# Decoder templates

## Python reference decoder (stdlib only)

`tools/<fmt>.py`. Pattern from OpenI76 `tools/zfs.py` (`--summary` = FNV-1a 32 over name, size, content).

```python
#!/usr/bin/env python3
"""<FMT> files of <Game>: list, check, export, summary hash.

  tools/<fmt>.py list <file>
  tools/<fmt>.py png <file> [out/<fmt>]          export for inspection (git-ignored)
  tools/<fmt>.py --summary <data root>           the line tests/<fmt>_test.c must print (OPEN<GAME>_<FMT>_SUMMARY)
"""
import os, struct, sys

def fnv(h, b):
    for x in b:
        h = ((h ^ x) * 16777619) & 0xFFFFFFFF
    return h

def find(root, ext):
    """Every file with this extension under root, case-insensitively, sorted by upper-cased relative path."""
    out = []
    for d, _, fs in os.walk(root):
        for f in fs:
            if f.lower().endswith(ext):
                p = os.path.join(d, f)
                out.append((os.path.relpath(p, root).replace(os.sep, "/").upper(), p))
    return sorted(out)

def decode(data):
    """Parse as the exe's reader (0x4xxxxx) does. Return (header dict, decoded bytes). Assert invariants."""
    magic, count, size = struct.unpack_from("<4sII", data, 0)
    assert magic == b"XXXX", magic
    assert size == len(data), (size, len(data))       # sizes tile the file
    # ... walk records with explicit offsets; check counts against the header
    return {"count": count}, data[12:]

def summary(root):
    h, files, nbytes = 2166136261, 0, 0
    for name, path in find(root, ".xxx"):
        data = open(path, "rb").read()
        hdr, pixels = decode(data)
        h = fnv(h, name.encode("latin-1") + b"\0")
        h = fnv(h, struct.pack("<I", hdr["count"]))
        h = fnv(h, pixels)
        files += 1; nbytes += len(data)
    print(f"files={files} bytes={nbytes} hash={h:08x}")

def write_png(path, w, h, rgba):
    """Minimal PNG writer (zlib + struct only), RGBA8 rows."""
    import zlib
    raw = b"".join(b"\0" + rgba[y * w * 4:(y + 1) * w * 4] for y in range(h))
    def chunk(t, d): return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
                + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))

if __name__ == "__main__":
    if len(sys.argv) < 3: raise SystemExit(__doc__)
    cmd, arg = sys.argv[1], sys.argv[2]
    if cmd == "--summary": summary(arg)
    elif cmd == "list": print(decode(open(arg, "rb").read())[0])
    else: raise SystemExit(__doc__)
```

Run helpers from the repository root with `python3 -P` so a tool named like a stdlib module (`dis.py`)
cannot shadow it. Run the summary over a folder and over the mounted image; both lines must match.

## C test that prints and asserts the same line

`tests/<fmt>_test.c`. Pattern from OpenI76 `tests/fmt_test.c`.

```c
/* <FMT> decoder against the user's data: the summary must equal tools/<fmt>.py --summary's when
   OPEN<GAME>_<FMT>_SUMMARY is set. Skips (exit 0) without data. */
#include "fmt.h"
#include "vfs.h"
#include "vfs_host.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static int fails;
#define CHECK(c) do { if (!(c)) { printf("FAIL %s:%d: %s\n", __FILE__, __LINE__, #c); fails++; } } while (0)

static uint32_t fnv(uint32_t h, const void *p, size_t n)
{
    for (const uint8_t *b = p; n--; b++) h = (h ^ *b) * 16777619u;
    return h;
}

static void want(const char *var, const char *line, uint32_t h)
{
    const char *w = getenv(var);
    printf("%s %s=%08x%s\n", line, var, h, w && *w ? (strtoul(w, NULL, 16) == h ? " (matches)" : " (MISMATCH)") : "");
    if (w && *w) CHECK(strtoul(w, NULL, 16) == h);
}

int main(void)
{
    const char *root = getenv("OPEN<GAME>_DATA");
    if (!root) root = "cd";
    if (!vfs_mount(root)) { printf("<fmt>_test: no game data, skipped\n"); return 0; }   /* the project's own mount call */

    uint32_t h = 2166136261u;
    /* for each file in the same order as the Python tool: decode, CHECK invariants, hash
       name + NUL, the u32 count (little-endian), the decoded bytes */
    char line[64];
    snprintf(line, sizeof line, "files=%d bytes=%llu", 0, 0ull);
    want("OPEN<GAME>_<FMT>_SUMMARY", line, h);
    return fails ? 1 : 0;
}
```

Hash integers as little-endian bytes on both sides (`struct.pack("<I")` in Python, a `uint32_t` on the
little-endian targets in C) so the lines agree.

Register in CMake as its own ctest entry with the repository root as working directory.
