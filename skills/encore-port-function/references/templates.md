# Code templates for ported functions

Patterns from the ENCORE projects. Replace names, addresses and offsets with the ones in `names.tsv`.

## Citation

```c
/* Map_Load 0x438200 */                      /* name + address */
/* _THRASH_setstate@8 0x60003ac0 */          /* a DLL export at the DLL's base */
static int track_count;   /* 0x6b2a40 */     /* a global */
```

## Struct at its original layout

```c
typedef struct Texture {
    const TextureVtbl *vt;       /* +0x00 */
    struct TexManager *manager;  /* +0x04 */
    int32_t width, height;       /* +0x0c, +0x10 */
    char name[20];               /* +0x24..+0x37 */
} Texture;

#if UINTPTR_MAX == 0xffffffffu   /* wasm32 like the original; the native test build is 64-bit */
_Static_assert(sizeof(Texture) == 0x54, "the original's layout");
#endif
```

File formats: parse with explicit byte reads (`rd_u32le(p + 0x10)`), never by casting to a struct.

## C++ class with a vtable

```c
struct Shape;
typedef struct {
    void (*destroy)(struct Shape *self, int free_it);   /* 0x5xxxxx */
    void (*draw)(struct Shape *self, void *ctx);        /* 0x5xxxxx */
} ShapeVtbl;                                            /* vtable 0x5bxxxx */

typedef struct Shape { const ShapeVtbl *vt; /* +0x00 */ int32_t kind; /* +0x04 */ } Shape;

static void Shape_dtor(Shape *self, int free_it) { /* ... */ }          /* 0x5xxxxx */
static void Shape_draw(Shape *self, void *ctx) { /* ... */ }            /* 0x5xxxxx */
static const ShapeVtbl shape_vtbl = { Shape_dtor, Shape_draw };         /* slots in the original's order */

/* call sites dispatch as the original does */
s->vt->draw(s, ctx);
```

## Globals by original address (data-section image)

When the project maps the original data section (OpenCMR2 `src/game/mem.c`), access globals through
one-line accessors:

```c
static inline uint32_t Gs_Players(void) { return gm32(0x52afb4) >> 0xd & 0xf; }   /* 0x405d70 */
```

## Tables and constants from the executable

From OpenRF `src/hud.c` (loader registered with `EXE_LOADER`, run by `exe_load()` after the size + CRC
check) and OpenNFSPU `src/game/ai.c` (`K`):

```c
#include "exe.h"

static int32_t seg_x[18], seg_y[18];               /* 0x44ab28 / 0x44ab70: weapon-count segment positions */
static void hud_tables_load(void)
{
    for (int i = 0; i < 18; i++) { seg_x[i] = exe_s32(0x44ab28 + 4 * (uint32_t)i); seg_y[i] = exe_s32(0x44ab70 + 4 * (uint32_t)i); }
}
EXE_LOADER(hud_tables_load)

#define K(va) exe_f32(va)                          /* float constants by address, never as decimals */
float drag = v * K(0x5xxxxx);
```

## Not yet ported

```c
/* src/pending.h */
#define PENDING_NOTE(addr, name) do { \
        static int noted_; \
        if (!noted_) { noted_ = 1; plat_log("pending: " name " " #addr); } \
    } while (0)

/* src/game/pending.c: one per unported callee, original name, neutral return */
int Particle_Emit(Particle *p, int kind)
{
    PENDING_NOTE(0x4xxxxx, "Particle_Emit");
    return 0;
}
```

For dispatch by exe address (level hooks, move routines), log once per unknown address:

```c
fprintf(stderr, "level %s hook 0x%x not ported\n", what, va);   /* OpenSheep src/levels.c */
```

## Static initialisers

```c
void PORT_StaticInit(void)                      /* called before the original's WinMain equivalent */
{
    TEXTURE_initstates();   /* 0x5cb754 -> 0x535710: the texture stage-state cache's ids and values */
    /* add entries in table order as their modules are ported */
}
```

## Blocking loop as a step function (state-machine projects)

```c
typedef enum { STEP_FRAME, STEP_AGAIN, STEP_DONE } Step;

/* Title_Loop 0x4xxxxx: one iteration of the original's loop per call */
static Step title_step(Title *t)
{
    plat_poll();                       /* where the original polled */
    if (key_pressed(KEY_ENTER)) return STEP_DONE;
    title_draw(t);
    plat_present();                    /* the original's Flip */
    return STEP_FRAME;
}
```

The owner calls the step until it returns `STEP_FRAME` (presented), polling again on `STEP_AGAIN`.

## Blocking loop kept (`gasm_wait_frame` projects)

```c
/* Menu_Run 0x4xxxxx */
while (!done) {
    menu_update(m);
    menu_draw(m);
    plat_wait_frame();                 /* gasm_wait_frame(): returns to the runner, resumes next frame */
}
```

## Undefined behaviour, bounded and documented

```c
/* The original indexes g_sin with t/2 for negative t on the landing tick and reads the draw list's
   tail (about 0.0 as a float); in wasm the neighbour differs. Return what the original got. */
static float arc_sin(int t) { return t < 0 ? 0.0f : g_sin[t / 2]; }
```

## Truncating float-to-int (`__ftol`)

```c
static inline int32_t ftol(double x)
{
    if (!(x > -9223372036854775808.0 && x < 9223372036854775808.0)) return 0;   /* NaN/out of range: low half of 0x8000000000000000 */
    return (int32_t)(uint32_t)(uint64_t)(int64_t)x;                              /* OpenSheep src/game.h, __ftol 0x43ca04 */
}
```
