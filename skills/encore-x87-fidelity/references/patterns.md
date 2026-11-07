# x87 and CRT patterns from the ENCORE ports

Code here is quoted or closely paraphrased from the named files; check the source before copying.

## Single precision with the x87's wide exponent (opennfspu `src/game/sim_math.c`)

```c
/* A value rounded as the x87 at single precision rounds it: to 24 significant bits,
   with the x87's wide exponent (a float's below its normal range would lose bits;
   the original's stay until stored). */
double Math_X87(double x)
{
    int e;
    double m = frexp(x, &e);
    return ldexp((double)(float)m, e);
}
```

Use on paths that decay through float denormals (filters, velocities near rest, small torques). Ordinary paths use `float` arithmetic in the original's order.

## Exact rounding-mode emulation (openi76 `src/render/fpu.h`)

The x87's RC is kept in a global; each operation is computed in nearest and moved one ULP when the exact result lies on the far side for the mode.

```c
enum { FPU_NEAREST = 0, FPU_DOWN = 1, FPU_UP = 2, FPU_CHOP = 3 };
extern int g_fpu_round;

static inline double fpu_fix(double r, double err)
{
    switch (g_fpu_round) {
    case FPU_UP: return err > 0 ? nextafter(r, INFINITY) : r;
    case FPU_DOWN: return err < 0 ? nextafter(r, -INFINITY) : r;
    case FPU_CHOP: return (r > 0 && err < 0) ? nextafter(r, 0) : (r < 0 && err > 0) ? nextafter(r, 0) : r;
    default: return r;
    }
}

static inline double fpu_add(double a, double b)
{
    double s = a + b;
    if (g_fpu_round == FPU_NEAREST) return s;
    if (s == 0) {   /* exact zero: -0 when rounding down unless both +0; +0 otherwise unless both -0 */
        if (g_fpu_round == FPU_DOWN) return (a == 0 && b == 0 && !signbit(a) && !signbit(b)) ? 0.0 : -0.0;
        return (signbit(a) && signbit(b)) ? -0.0 : 0.0;
    }
    if (isinf(s) || isnan(s)) return s;
    double bb = s - a, err = (a - (s - bb)) + (b - bb);   /* TwoSum */
    return fpu_fix(s, err);
}

static inline double fpu_mul(double a, double b)
{
    double p = a * b;
    if (g_fpu_round == FPU_NEAREST || p == 0 || isinf(p) || isnan(p)) return p;
    return fpu_fix(p, fma(a, b, -p));
}

static inline double fpu_div(double a, double b)
{
    double q = a / b;
    if (g_fpu_round == FPU_NEAREST || q == 0 || isinf(q) || isnan(q)) return q;
    double r = fma(-q, b, a);          /* a - q*b exactly */
    if (r == 0) return q;
    return fpu_fix(q, (r > 0) == (b > 0) ? 1.0 : -1.0);
}
```

Requires `-ffp-contract=off` on the core so the compiler adds no other fusion; the explicit `fma` calls are the error terms. Transcendentals: libm plus a final-store correction only. Model where the original sets and restores RC (around fillers, quadtree walks) and where it sets it and never restores it.

## `__ftol` (opensheep `src/game.h`)

```c
/* __ftol (0x43ca04) truncates through a 64-bit fistp and keeps the low 32 bits. */
static inline int32_t ftol(double v)
{
    if (!(v > -9223372036854775808.0 && v < 9223372036854775808.0)) return 0;   /* 0x8000000000000000 */
    return (int32_t)(uint32_t)(uint64_t)(int64_t)v;
}
```

## `FILD; FMUL m64; FISTP` (opencmr2 `src/fixmath.h`)

`int64_t X87_MulRound(double a, double b)`: the product rounded to a 64-bit mantissa, then to nearest integer. Used for degree-to-index conversion and network quantisation. The 64-bit model matches Unicorn; whether hardware under D3D7 ran at 24-bit there is unconfirmed.

## Out-of-bounds read with the original's neighbour (opensheep `src/game.h`)

```c
/* g_sin[t / 2] for a jump's height. On the landing tick t is below zero and the original
   reads before the table: the end of the draw list, 0 as a float to within 1e-38. */
static inline float arc_sin(int t) { return t / 2 < 0 ? 0.0f : g_sin[t / 2]; }
```

## MSVC `rand`

```c
static uint32_t holdrand = 1;
void crt_srand(uint32_t seed) { holdrand = seed; }
int crt_rand(void)
{
    holdrand = holdrand * 214013u + 2531011u;
    return (int)((holdrand >> 16) & 0x7fff);
}
```

Range helpers are game-specific: OpenRF `RandRange` is `(2r*n)>>16`; OpenBV's `rand(int a, int b)` excludes the upper bound and its float version makes no call when `from == to`. Sheep fills a 1024-entry table from `srand(0)` from index 1023 down.

## Evidence index

| Topic | Commit |
|---|---|
| float order, sine as float, angles in turns: 0 differing words | opennfspu `e47cee6`, `33977ab` |
| denormals, −0 vs +0 | opennfspu `781a0d1`, `4ae0894`, `364e0ea` |
| x87 stack pop changes AI throttle | opennfspu `3680542` |
| constants by bits; double read as float | opennfspu `c9523ba`, `a7c5785` |
| RC left at down by `Terrain_Height` | openi76 `2d39318` |
| exact rounding layer | openi76 `f1d04c8` |
| register-resident unrounded x | openi76 `8fc7730` |
| x87 tracer for `fmul ST2` ambiguity | openi76 `a878938` |
| NaN compares | opensheep `38756d4`, `6251cb9` |
| OOB read differs in wasm (ASan/UBSan) | opensheep `874afab` |
| shared `rand` consumed by text | opencmr2 `2cb6f32` |
| uninitialised normal kept in place | opencmr2 `5eb382d` |
| Go: FMA, musl trig, NaN in golden data | openbv `11ae1ce`, `b790e1c` |
