# Ghidra scripts every project carries

All live in `tools/ghidra/` and run headless:
`ghidra script run tools/ghidra/<Script>.java --project <p> --program <prog> -- <args>`.
Copy them from the closest sibling repository rather than writing them again.

| Script | Purpose | Output | Copy from |
|---|---|---|---|
| `AnalyzeAll.java` / `Reanalyze.java` | Run auto-analysis explicitly (imports may skip it; DLLs may come in with 0 functions); disassemble exports first | function count | https://github.com/emdzej/opennfspu/blob/main/tools/ghidra/AnalyzeAll.java, https://github.com/emdzej/openballance/blob/main/tools/ghidra/Reanalyze.java |
| `FillGaps.java` | Create functions in unclaimed `.text` gaps: vtable methods, callbacks; idempotent | more functions | https://github.com/emdzej/opencmr2/blob/main/tools/ghidra/FillGaps.java |
| `CreateFunctions.java` + `entries.tsv` | Create functions at addresses listed by hand (reached only through data tables) | more functions | https://github.com/emdzej/openoni/blob/main/tools/ghidra/CreateFunctions.java |
| `ApplyNames.java` | Apply `names.tsv`: rename (creating the function if missing), plate comment `[module] description` | renamed program | https://github.com/emdzej/opencmr2/blob/main/tools/ghidra/ApplyNames.java |
| `DumpAllNamed.java` | Decompile every function into one file, `// ==== Name @ addr` separators, 60 s per function, `// FAILED` marker | `re/all.c` | https://github.com/emdzej/opencmr2/blob/main/tools/ghidra/DumpAllNamed.java |
| `DumpMeta.java` | Per function: addr, name, size, callers, callees, imports, strings | `re/meta.tsv` | https://github.com/emdzej/opencmr2/blob/main/tools/ghidra/DumpMeta.java |
| `ImportUsers.java` | Import -> calling functions | `re/imports.tsv` | https://github.com/emdzej/opennfspu/blob/main/tools/ghidra/ImportUsers.java |
| `rtti.py` | MSVC RTTI: classes, vtables, slot lists from complete object locators | `re/rtti.tsv`, `re/vtables.tsv` | https://github.com/emdzej/opennfspu/blob/main/tools/ghidra/rtti.py |
| `Dec.java` | Decompile one address, creating the function if needed | stdout | https://github.com/emdzej/opennfspu/blob/main/tools/ghidra/Dec.java |
| `match_mac.py` | Carry names from a symbol-bearing build by strings, call graph, layout, neighbourhood; `--validate=<share>` | `re/mac-matches.tsv` | https://github.com/emdzej/openoni/blob/main/tools/ghidra/match_mac.py |
| `x87trace.py` | Follow the x87 register stack along a path of instructions, decoding register forms from bytes; prints SSA assignments | stdout | https://github.com/emdzej/openi76/blob/main/tools/ghidra/x87trace.py |
| `inventory.py` | Per-module size table for the inventory doc | Markdown table | https://github.com/emdzej/openoni/blob/main/tools/ghidra/inventory.py |

Small helpers outside Ghidra:

| Tool | Purpose | Copy from |
|---|---|---|
| `tools/fn.sh <addr>` | Print one function from `re/all.c` | https://github.com/emdzej/opensheep/blob/main/tools/fn.sh |
| `tools/fnsummary.py` | One line per function: addr, name, lines, strings, callees -> `re/summary.txt` | https://github.com/emdzej/opensheep/blob/main/tools/fnsummary.py |
| `tools/dis.py <exe> <va> [n]` | capstone x86-32 disassembly over PE sections (run with `python3 -P` from the repo root: the name shadows the stdlib `dis`) | https://github.com/emdzej/opensheep/blob/main/tools/dis.py |
| `tools/exe.py <va> [count] [type]` | Print values at virtual addresses, research only | https://github.com/emdzej/opencmr2/blob/main/tools/exe.py |

## DumpAllNamed.java (from OpenCMR2)

```java
// Decompile every function of the current program into one C file for grepping.
// Usage: ghidra script run tools/ghidra/DumpAllNamed.java --project <p> --program <prog> -- /abs/path/re/all.c
import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.*;
import ghidra.program.model.listing.*;
import java.io.*;
public class DumpAllNamed extends GhidraScript {
  public void run() throws Exception {
    String[] args = getScriptArgs();
    if (args.length < 1) { printerr("usage: DumpAllNamed.java <output.c>"); return; }
    DecompInterface d = new DecompInterface();
    d.openProgram(currentProgram);
    PrintWriter w = new PrintWriter(new FileWriter(args[0]));
    for (Function f : currentProgram.getFunctionManager().getFunctions(true)) {
      DecompileResults r = d.decompileFunction(f, 60, monitor);
      w.println("// ==== " + f.getName() + " @ " + f.getEntryPoint());
      if (r.decompileCompleted()) w.println(r.getDecompiledFunction().getC());
      else w.println("// FAILED");
    }
    w.close();
  }
}
```

Paths passed to scripts must be absolute (`"$PWD/re/all.c"`).
