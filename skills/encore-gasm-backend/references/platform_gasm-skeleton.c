/* platform_gasm.c skeleton for an ENCORE port: the only file that includes gasm.h.
 *
 * Distilled from the backends of OpenCMR2, OpenGTA, OpenSheep and OpenRF (src/platform_gasm.c in each).
 * The calls and constants are gasm's C API (spec/gasm.h, ABI version 0). Replace every OPENX/openx and
 * fill the TODOs; the core sees only platform.h. Shape: state machines driven by gasm_frame. For an own
 * main loop, build with gasm_add_game(... LOOP ...), define gasm_main() instead of the three frame
 * exports, and call gasm_wait_frame() once per frame (see gasm_loop.h). */
#include <gasm.h>
#include "platform.h"
#include "vfs.h"
#include "app.h"
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include <wasi/api.h>

GASM_TITLE("Example Game");

#define APP_FRAME_HZ 62.5      /* TODO: the original's tick rate (16 ms ticks: 62.5) */
#define APP_AUDIO_RATE 44100   /* TODO: the original mixer's rate */

static bool running;
static uint32_t pads[4];
static uint8_t keys[GASM_KEY_STATE_BYTES];
static uint32_t frames;

/* ---- time: virtual, advanced per frame (never the wall clock) ---- */
uint32_t plat_ticks_ms(void) { return (uint32_t)(frames * 1000.0 / APP_FRAME_HZ); }

/* ---- log ---- */
void plat_log(const char *msg) { gasm_log(msg, (uint32_t)strlen(msg)); }

/* ---- launch parameters (--param k=v, or the URL query in the browser) ---- */
bool plat_param(const char *name, char *dst, uint32_t cap)
{
    int32_t n = gasm_param(name, (uint32_t)strlen(name), dst, cap ? cap - 1 : 0);
    if (n < 0 || (uint32_t)n >= cap) return false;
    dst[n] = 0;
    return true;
}

/* ---- assets: positioned reads, 64-bit offsets, short reads looped ---- */
static int64_t asset_read_at(void *ctx, uint64_t off, void *dst, uint32_t len)
{
    const char *name = ctx;
    uint32_t done = 0;
    while (done < len) {
        int32_t n = gasm_asset_read_at64(name, (uint32_t)strlen(name), off + done, (uint8_t *)dst + done, len - done);
        if (n < 0) return -1;
        if (n == 0) break;
        done += (uint32_t)n;
    }
    return done;
}

static bool mount_game(void)
{
    /* A disc image passed as --asset cd=GAME.ISO (or rom=): mount ISO 9660 over positioned reads. */
    static const char *images[] = {"cd", "rom"};
    for (unsigned i = 0; i < 2; i++)
        if (gasm_asset_size64(images[i], (uint32_t)strlen(images[i])) > 0)
            return vfs_mount_image(asset_read_at, (void *)images[i]);   /* TODO: your VFS; refuse .cue text */
    /* Else the disc's files as assets (--asset-dir): the runner folds ASCII case. */
    return vfs_mount_assets();                                            /* TODO: check a key file exists */
}

/* ---- saves: gasm:storage, namespace = the module's file name ---- */
bool plat_save_user_file(const char *key, const void *data, uint32_t len)
{
    int32_t r = gasm_storage_set(key, (uint32_t)strlen(key), data, len);
    if (r == 0) return true;
    char m[160];
    snprintf(m, sizeof m, "save %s failed: %s", key,
             r == GASM_STORAGE_ERR_KEY ? "bad key" : r == GASM_STORAGE_ERR_SIZE ? "too large"
             : r == GASM_STORAGE_ERR_QUOTA ? "quota" : "I/O");
    plat_log(m);
    return false;
}

int32_t plat_load_user_file(const char *key, void *dst, uint32_t cap)
{
    return gasm_storage_get(key, (uint32_t)strlen(key), dst, cap);   /* length, -1 if missing */
}

/* ---- input: raw keys (TODO: map GASM_KEY_* to the original's DIK scan codes), pads ---- */
bool plat_key_held(unsigned gasm_key) { return (keys[gasm_key >> 3] >> (gasm_key & 7)) & 1; }
uint32_t plat_pad(unsigned player) { return player < 4 ? pads[player] : 0; }

static void poll_input(void)
{
    for (uint32_t p = 0; p < 4; p++) pads[p] = gasm_input_pad(p);
    if (gasm_key_state(keys, sizeof keys) < 0) memset(keys, 0, sizeof keys);
    /* TODO: gasm_key_events() for ordered presses shorter than a frame; latch them until the game's
       next input poll. gasm_pointer() for the mouse: hand the game relative deltas if the original
       read DirectInput's relative mouse. */
}

/* ---- video: the core's framebuffer converted to RGBA8 here ---- */
void plat_present(const uint32_t *rgba, uint32_t w, uint32_t h)
{
    gasm_video_present(rgba, w, h, w * 4);
}

/* ---- exports ---- */
GASM_EXPORT("gasm_abi_version") int32_t openx_gasm_abi_version(void) { return GASM_ABI_VERSION; }

GASM_EXPORT("gasm_init") int32_t openx_gasm_init(void)
{
    setvbuf(stdout, NULL, _IOLBF, 0);
    gasm_set_frame_rate(APP_FRAME_HZ);
    gasm_audio_config(APP_AUDIO_RATE, 2);
    gasm_input_mode(GASM_INPUT_KEYS_RAW);   /* | GASM_INPUT_POINTER_HIDDEN if the game draws its cursor */
    if (!mount_game()) {
        plat_log("OpenX: game data not found. Pass the CD image (gasm-run openx.wasm --asset cd=GAME.ISO) "
                 "or the CD's files (--asset-dir <folder>)");
        return 1;
    }
    if (!app_init()) return 1;
    running = true;
    return 0;
}

GASM_EXPORT("gasm_frame") void openx_gasm_frame(void)
{
    static float audio_buf[2048 * 2];
    static double audio_acc, last_ms = -1;
    if (!running) return;
    poll_input();
    if (!app_frame()) {            /* one step of the current state; presents at most once */
        running = false;
        app_exit();
        __wasi_proc_exit(0);
    }
    frames++;
    /* Audio for the runner time since the last frame (headless: exactly the frame's share). */
    double now = gasm_time_ms();
    audio_acc += 0 <= last_ms ? (now - last_ms) * APP_AUDIO_RATE / 1000.0 : APP_AUDIO_RATE / APP_FRAME_HZ;
    last_ms = now;
    if (audio_acc > 2048) audio_acc = 2048;
    unsigned n = (unsigned)audio_acc;
    audio_acc -= n;
    app_audio(audio_buf, n);       /* interleaved stereo float */
    gasm_audio_push(audio_buf, n);
}

GASM_EXPORT("gasm_exit") void openx_gasm_exit(void)
{
    if (!running) return;
    running = false;
    app_exit();                    /* flush saves */
}
