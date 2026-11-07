# When to read the disassembly

Read the disassembly, not only the decompile, when any trigger below applies. Each row is a real case from
an ENCORE project.

## Triggers

- The function does x87 arithmetic (`fld`, `fmul`, `fdiv`, `fstp`, `fild`, `fistp`, `fldcw`).
- It compares floats (`fcom`, `fcomp`, `fucom`, then `fnstsw` and `test ah, 1|0x41|0x45`).
- It stores single bytes or words into larger fields.
- It reads stack-relative operands (`[esp+0x7c]`, `[ebp-0x..]`) that might be distinct variables.
- It contains a switch or a jump table.
- It calls a small maths helper whose arguments seem to be missing (likely `__fastcall`).
- The decompile failed or timed out (`// FAILED` in `re/all.c`).
- It is on the simulation's hot path (physics, AI, collision) or the renderer's span code.
- The port of it behaves differently from the original in any test.

## Cases

| Symptom in the decompile | Reality | Where |
|---|---|---|
| Plausible integration step | Position and angle steps (`v dt - dv dt/2`) and a 0.2 scale dropped | OpenCMR2 `Car_Integrate` 0x435470, https://github.com/emdzej/opencmr2/commit/ef54dfb |
| A type byte appears from nowhere | Comes from a byte store the decompiler drops | OpenCMR2 https://github.com/emdzej/opencmr2/blob/main/docs/re/network.md |
| Products merged | Separate roundings in the original | OpenCMR2 network code |
| `throttle = f(gap)` | `fstp` pops the gap, `fdiv` divides the target speed left on the stack | OpenNFSPU `AI_Steer`, https://github.com/emdzej/opennfspu/commit/3680542 |
| `if (a < b)` | `test ah,1` treats unordered (NaN) as below; C's `<` is false | OpenSheep https://github.com/emdzej/opensheep/commit/38756d4, https://github.com/emdzej/opensheep/commit/6251cb9 |
| `fmul ST2` | Could be `d8 ca` or `dc ca` (opposite direction); trace bytes with `x87trace.py` | OpenI76 https://github.com/emdzej/openi76/commit/a878938 |
| Helper with no arguments | `FixMul` 0x438300 is `__fastcall` (ECX, EDX); set the signature | OpenRF https://github.com/emdzej/openrf/blob/main/AGENTS.md |
| One local variable | Two variables merged into one stack slot | OpenBallance https://github.com/emdzej/openballance/blob/main/docs/howto/reverse-engineering.md |
| No output | `Emergency_UpdateAll` 0x419880 cannot be decompiled | OpenGTA |
| Test from the feet | The dot product at 0x4ec39d reads the sweep sphere at ESP+0x7c, 10 units higher | OpenOni https://github.com/emdzej/openoni/commit/9e3bb32 |
| Four switches missing | Lost in the other build's decompile; port from this build's disassembly | OpenOni https://github.com/emdzej/openoni/commit/d38d7a5 |
| Float constant -473.77 | A double (1/1500) at 0x5b4a00 read as a float | OpenNFSPU https://github.com/emdzej/opennfspu/commit/a7c5785 |
| `0.15915494f` | The original's bits are `0x3e22f981`, not the literal's `0x3e22f983` | OpenNFSPU https://github.com/emdzej/opennfspu/commit/c9523ba |
| Caps flag `DRAWPRIMITIVES2EX` | The bit at that offset is `ZBUFFERLESSHSR`; read the struct offset | OpenCMR2 https://github.com/emdzej/opencmr2/commit/90b9f07 |
| Rounding mode not visible | `Terrain_Height` 0x491f00 sets RC = down and never restores it | OpenI76 https://github.com/emdzej/openi76/commit/2d39318 |

## Commands

```sh
python3 -P tools/dis.py game/Game.exe 0x41b9f0 80         # capstone, from the repo root
objdump -d --x86-asm-syntax=intel --start-address=0x41b9f0 --stop-address=0x41ba80 game/Game.exe
ghidra disasm 0x41b9f0 --project game --program game.exe
```

Scan all `fldcw` sites early (`grep -n fldcw` over a full disassembly) and record which functions change
the x87 control word and whether they restore it.
