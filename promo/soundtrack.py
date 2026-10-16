"""PrimeOMS promo soundtrack: a calm, Minecraft-inspired felt-piano piece
(original composition, D major, 90 BPM) plus UI sound effects placed at the
exact times the video composition exported in timeline.json.

    python -I soundtrack.py build/timeline.json build/soundtrack.wav
"""
import json
import sys

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, sosfilt

SR = 44100
rng = np.random.default_rng(418)
TL = json.load(open(sys.argv[1], encoding="utf-8"))
SPB = TL["spb"]
N = int(TL["duration"] * SR)


def tt(n):
    return np.arange(n) / SR


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def lp(x, f, o=2):
    return sosfilt(butter(o, min(f, SR * 0.45), "low", fs=SR, output="sos"), x)


def hp(x, f, o=2):
    return sosfilt(butter(o, f, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, o=2):
    return sosfilt(butter(o, [lo, hi], "band", fs=SR, output="sos"), x)


def put(L, R, t, sig, gain=1.0, pan=0.0):
    """Mix a mono signal at time t (s) with constant-power pan (-1..1)."""
    i = int(round(t * SR))
    if i >= N or i < 0:
        return
    j = min(N, i + len(sig))
    a = (pan + 1) * np.pi / 4
    L[i:j] += sig[: j - i] * gain * np.cos(a)
    R[i:j] += sig[: j - i] * gain * np.sin(a)


# ---- Instruments ---------------------------------------------------------------

_piano_cache = {}


def piano(m, dur, vel=0.65):
    """Soft felt piano: inharmonic partials, per-partial decay, hammer thump."""
    key = (m, round(dur, 2), round(vel, 2))
    if key in _piano_cache:
        return _piano_cache[key]
    f = mtof(m)
    n = int((dur + 0.45) * SR)
    t = tt(n)
    tau = float(np.interp(m, [36, 60, 84, 100], [3.4, 2.3, 1.15, 0.55]))
    B = 0.00008 * (f / 261.6)
    y = np.zeros(n)
    for k in range(1, 12):
        fk = k * f * np.sqrt(1 + B * k * k)
        if fk > SR * 0.42:
            break
        amp = k ** -1.25 * np.exp(-(k - 1) * (0.34 - 0.14 * vel))
        decay = np.exp(-t / (tau / (1 + 0.5 * (k - 1))))
        y += amp * decay * (0.62 * np.sin(2 * np.pi * fk * t) + 0.38 * np.sin(2 * np.pi * fk * 1.0007 * t + 0.9))
    y += lp(rng.standard_normal(n), 1800) * np.exp(-t * 220) * 0.05
    a = int(0.005 * SR)
    y[:a] *= np.linspace(0, 1, a)
    damp = np.ones(n)
    r0 = int(dur * SR)
    damp[r0:] = np.exp(-(t[r0:] - dur) / 0.09)
    out = lp(y * damp, 2200 + 3800 * vel) * vel * 0.22
    _piano_cache[key] = out
    return out


def bell(m, decay=1.4, bright=1.0):
    f = mtof(m)
    n = int((decay * 2.2) * SR)
    t = tt(n)
    y = np.zeros(n)
    for ratio, amp, d in ((1, 1, 1.0), (2.0, 0.42, 0.55), (3.01, 0.28 * bright, 0.32), (4.16, 0.14 * bright, 0.2), (5.43, 0.08 * bright, 0.13)):
        if f * ratio < SR * 0.45:
            y += amp * np.sin(2 * np.pi * f * ratio * t) * np.exp(-t / (decay * d))
    a = int(0.002 * SR)
    y[:a] *= np.linspace(0, 1, a)
    return y * 0.3


def pad(notes, dur):
    n = int((dur + 2.0) * SR)
    t = tt(n)
    L = np.zeros(n)
    R = np.zeros(n)
    for m in notes:
        f = mtof(m)
        vib = 1 + 0.0018 * np.sin(2 * np.pi * 4.6 * t + m)
        for det, side in ((0.9965, 0), (1.0035, 1)):
            ph = 2 * np.pi * np.cumsum(f * det * vib) / SR
            y = np.sin(ph) + 0.22 * np.sin(2 * ph) + 0.08 * np.sin(3 * ph)
            (L if side == 0 else R)[:] += y
    env = np.minimum(1, t / 1.4) * np.where(t < dur, 1.0, np.exp(-(t - dur) / 0.7))
    k = 0.05 / len(notes)
    return lp(L * env, 1600) * k, lp(R * env, 1600) * k


# ---- Sound effects (all synthesized) -------------------------------------------

def sfx_click(gain=1.0):
    n = int(0.09 * SR)
    t = tt(n)
    tick = bp(rng.standard_normal(n), 2500, 7500) * np.exp(-t * 1200)
    body = np.sin(2 * np.pi * 1750 * t) * np.exp(-t * 170) * 0.5 + np.sin(2 * np.pi * 880 * t) * np.exp(-t * 120) * 0.4
    y = tick + body
    off = int(0.019 * SR)  # the "release" half of the click
    y[off:] += (tick[: n - off] * 0.45 + body[: n - off] * 0.25)
    return y * 0.5 * gain


def sfx_swish(dur=0.5, gain=1.0):
    n = int(dur * SR)
    t = tt(n)
    p = t / t[-1]
    noise = rng.standard_normal(n)
    bands = [bp(noise, lo, hi) for lo, hi in ((300, 900), (900, 2200), (2200, 5000), (5000, 11000))]
    center = 0.15 + 2.6 * np.sin(np.pi * np.clip(p * 1.15, 0, 1)) ** 1.2
    y = sum(b * np.exp(-((center - k) ** 2) / 0.7) for k, b in enumerate(bands))
    env = np.sin(np.pi * p ** 0.75) ** 2
    return y * env * 0.2 * gain


def sfx_whoosh(dur=0.9):
    y = sfx_swish(dur, 1.3)
    t = tt(len(y))
    y += lp(rng.standard_normal(len(y)), 280) * (t / t[-1]) ** 2 * 0.5
    return y


def sfx_pop(m, gain=1.0):
    f = mtof(m)
    n = int(0.22 * SR)
    t = tt(n)
    freq = f * (0.55 + 0.45 * (1 - np.exp(-t / 0.012)))
    y = np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.exp(-t * 22)
    y += 0.25 * np.sin(4 * np.pi * np.cumsum(freq) / SR) * np.exp(-t * 40)
    y += bp(rng.standard_normal(n), 2000, 6000) * np.exp(-t * 900) * 0.25
    return y * 0.36 * gain


def sfx_tick(m, gain=1.0):
    n = int(0.12 * SR)
    t = tt(n)
    y = np.sin(2 * np.pi * mtof(m) * t) * np.exp(-t * 45) + bp(rng.standard_normal(n), 3000, 8000) * np.exp(-t * 1500) * 0.3
    return y * 0.22 * gain


def sfx_type(seed):
    r = np.random.default_rng(seed + 7)
    n = int(0.06 * SR)
    t = tt(n)
    y = bp(r.standard_normal(n), 1400 + r.random() * 900, 5200) * np.exp(-t * 700)
    y += np.sin(2 * np.pi * (150 + r.random() * 60) * t) * np.exp(-t * 90) * 0.6
    return y * 0.28 * (0.8 + 0.3 * r.random())


def sfx_scan(dur=1.0):
    n = int(dur * SR)
    t = tt(n)
    p = t / t[-1]
    y = bp(rng.standard_normal(n), 1500, 6000) * np.sin(np.pi * p) * 0.4
    y += np.sin(2 * np.pi * np.cumsum(600 + 900 * p) / SR) * np.sin(np.pi * p) * 0.12
    return y * 0.35


def sfx_count(dur=2.5):
    n = int((dur + 0.2) * SR)
    y = np.zeros(n)
    t = 0.0
    k = 0
    while t < dur:
        p = t / dur
        tick = sfx_tick(84 + int(p * 9), 0.5)
        i = int(t * SR)
        j = min(n, i + len(tick))
        y[i:j] += tick[: j - i]
        t += 0.11 - 0.07 * p
        k += 1
    return y * 0.8


def sfx_sparkle(dur, notes, gain=1.0):
    n = int((dur + 1.6) * SR)
    y = np.zeros(n)
    for k, m in enumerate(notes):
        b = bell(m + 12, 0.45)
        i = int(k / max(1, len(notes) - 1) * dur * SR)
        j = min(n, i + len(b))
        y[i:j] += b[: j - i] * (0.6 + 0.4 * k / len(notes))
    return y * 0.55 * gain


def sfx_rise(dur=0.8):
    n = int(dur * SR)
    t = tt(n)
    p = t / t[-1]
    y = np.sin(2 * np.pi * np.cumsum(500 * 2 ** (p * 1.6)) / SR) * np.sin(np.pi * p) * 0.25
    return y + sfx_swish(dur, 0.6)[:n] * 0.6


def sfx_chime(m, gain=1.0):
    y = bell(m, 1.5)
    second = bell(m + 7, 1.3)
    off = int(0.075 * SR)
    out = np.zeros(len(y) + off)
    out[: len(y)] += y
    out[off: off + len(second)] += second * 0.75
    return out * 1.1 * gain


def sfx_bloom(m):
    n = int(3.0 * SR)
    y = np.zeros(n)
    for k, d in enumerate((0, 7, 12, 16, 19)):
        b = bell(m + d, 1.8)
        i = int(k * 0.035 * SR)
        y[i: i + len(b)] += b[: n - i] * (1 - k * 0.1)
    t = tt(n)
    y += np.sin(2 * np.pi * 55 * t) * np.exp(-t * 3.2) * 0.35
    return y * 0.8


# ---- Composition ----------------------------------------------------------------

mL, mR = np.zeros(N), np.zeros(N)   # music (dry)
sL, sR = np.zeros(N), np.zeros(N)   # reverb send
fL, fR = np.zeros(N), np.zeros(N)   # sfx (dry)


def beat_t(b):
    return b * SPB


CHORDS = {
    "Gmaj7": dict(lh=[43, 50, 54, 59, 62], pad=[59, 62, 66]),
    "D/F#": dict(lh=[42, 50, 54, 57, 62], pad=[57, 62, 66]),
    "Em7": dict(lh=[40, 47, 50, 55, 59], pad=[55, 59, 62, 64]),
    "A": dict(lh=[45, 52, 57, 61, 64], pad=[57, 61, 64]),
    "Dmaj9": dict(lh=[38, 45, 52, 54, 61], pad=[62, 66, 69, 73, 76]),
}
LOOP = ["Gmaj7", "D/F#", "Em7", "A"]
BARS = [LOOP[b % 4] for b in range(19)] + ["Gmaj7", "Dmaj9"]

A_PHRASE = [(0, 0, 71, 1.5), (0, 1.5, 74, 0.5), (0, 2, 78, 1), (0, 3, 76, 1),
            (1, 0, 74, 2), (1, 2, 69, 1), (1, 3, 71, 1),
            (2, 0, 67, 1), (2, 1, 71, 1), (2, 2, 74, 1.5), (2, 3.5, 76, 0.5),
            (3, 0, 76, 2), (3, 2, 73, 2)]
B_PHRASE = [(0, 0, 78, 1), (0, 1, 81, 1), (0, 2, 83, 1), (0, 3, 81, 1),
            (1, 0, 78, 1.5), (1, 1.5, 76, 0.5), (1, 2, 74, 2),
            (2, 0, 76, 1), (2, 1, 79, 1), (2, 2, 78, 1), (2, 3, 74, 1),
            (3, 0, 76, 3), (3, 3, 69, 1)]


def melody(phrase, start_bar, bars=4, octave=0, double=False, vel=0.62):
    for bo, beat, m, dur in phrase:
        if bo >= bars:
            continue
        b = (start_bar + bo) * 4 + beat
        note = piano(m + octave, dur * SPB + 0.35, vel)
        put(mL, mR, beat_t(b), note, 1.0, 0.25)
        put(sL, sR, beat_t(b), note, 0.42, 0.25)
        if double:
            hi = piano(m + octave + 12, dur * SPB + 0.3, vel * 0.55)
            put(mL, mR, beat_t(b), hi, 0.6, 0.45)
            put(sL, sR, beat_t(b), hi, 0.4, 0.45)


melody(A_PHRASE, 2)
melody(B_PHRASE, 6)
melody(A_PHRASE, 10, double=True, vel=0.6)
melody(B_PHRASE, 14, bars=2)
melody(A_PHRASE, 17, bars=2, double=True, vel=0.66)
for b, m, dur, v in ((76, 78, 2, 0.6), (78, 76, 2, 0.55), (80, 74, 6, 0.6)):
    note = piano(m, dur * SPB, v)
    put(mL, mR, beat_t(b), note, 1.0, 0.25)
    put(sL, sR, beat_t(b), note, 0.5, 0.25)

for bar, name in enumerate(BARS):
    c = CHORDS[name]
    lh = c["lh"]
    b0 = bar * 4
    if bar < 2:  # intro: sparse
        hits = [(0, 0, 4.4, 0.42), (0, 1, 4.2, 0.36), (2, 3, 2.3, 0.3)]
    elif bar in (2, 3, 19):  # quarter-note arps
        hits = [(k, (0, 1, 2, 3)[k], 4.4 - k, 0.4) for k in range(4)]
    elif bar == 20:  # final rolled chord
        hits = [(k * 0.06, k, 8.0, 0.45) for k in range(5)]
    else:  # rolling eighths
        hits = [(k * 0.5, (0, 1, 2, 3, 4, 3, 2, 1)[k], 4.6 - k * 0.5, 0.36 + 0.06 * (k % 2 == 0)) for k in range(8)]
    for beat, idx, dur, vel in hits:
        note = piano(lh[idx], dur * SPB, vel)
        pan = -0.35 + idx * 0.12
        put(mL, mR, beat_t(b0 + beat), note, 0.95, pan)
        put(sL, sR, beat_t(b0 + beat), note, 0.38, pan)
    if bar >= 1:
        pl, pr_ = pad(c["pad"], (8.5 if bar == 20 else 4.2) * SPB)
        g = 0.55 if bar == 1 else 1.0
        i = int(beat_t(b0) * SR)
        j = min(N, i + len(pl))
        mL[i:j] += pl[: j - i] * g
        mR[i:j] += pr_[: j - i] * g
        sL[i:j] += pl[: j - i] * g * 0.9
        sR[i:j] += pr_[: j - i] * g * 0.9

for k in range(16):  # parade bar: music-box sparkle
    m = [74, 78, 81, 86, 88, 86, 81, 78][k % 8] + 12
    bl = bell(m, 0.5)
    put(mL, mR, beat_t(64 + k * 0.25), bl, 0.32, -0.5 + (k % 4) * 0.33)
    put(sL, sR, beat_t(64 + k * 0.25), bl, 0.25)

# ---- Sound effects from the video timeline ---------------------------------------

counts = {}
for e in TL["events"]:
    kind = e["type"]
    counts[kind] = counts.get(kind, 0) + 1
    g = e.get("gain", 1.0)
    pan = e.get("pan", 0.0)
    t = e["t"]
    if kind == "click":
        sig = sfx_click(g)
    elif kind == "swish":
        sig = sfx_swish(e.get("dur", 0.5) * SPB * 1.3, g)
    elif kind == "whoosh":
        sig = sfx_whoosh(e.get("dur", 0.9) * SPB * 1.3)
    elif kind == "pop":
        sig = sfx_pop(e["note"], g)
    elif kind == "tick":
        sig = sfx_tick(e["note"], g)
    elif kind == "type":
        sig = sfx_type(e.get("seed", 0))
    elif kind == "scan":
        sig = sfx_scan(e.get("dur", 1) * SPB)
    elif kind == "count":
        sig = sfx_count(e.get("dur", 2.5) * SPB)
    elif kind == "sparkle":
        sig = sfx_sparkle(e.get("dur", 1) * SPB, e.get("notes", [74, 78, 81, 86]), g)
    elif kind == "rise":
        sig = sfx_rise(e.get("dur", 0.8) * SPB)
    elif kind in ("plink", "bell"):
        sig = bell(e["note"], 1.0 if kind == "plink" else 1.6) * g * (0.9 if kind == "plink" else 0.8)
    elif kind == "chime":
        sig = sfx_chime(e["note"], g)
    elif kind == "bloom":
        sig = sfx_bloom(e["note"])
    else:
        continue
    put(fL, fR, t, sig, 1.0, pan)
    put(sL, sR, t, sig, 0.14, pan)

# ---- Reverb + master -------------------------------------------------------------

ir_n = int(3.6 * SR)
ir_t = tt(ir_n)
pre = int(0.022 * SR)
irs = []
for _ in range(2):
    ir = np.zeros(ir_n)
    ir[pre:] = lp(rng.standard_normal(ir_n - pre), 5200) * np.exp(-ir_t[: ir_n - pre] / 0.95)
    irs.append(ir / np.sqrt(np.sum(ir ** 2)) * 0.55)
rL = fftconvolve(hp(sL, 180), irs[0])[:N]
rR = fftconvolve(hp(sR, 180), irs[1])[:N]

L = mL + fL + rL
R = mR + fR + rR
L, R = hp(L, 30), hp(R, 30)
peak = max(np.abs(L).max(), np.abs(R).max())
L, R = L / peak * 1.08, R / peak * 1.08
L, R = np.tanh(L) / np.tanh(1.08), np.tanh(R) / np.tanh(1.08)
fade = np.ones(N)
fn = int(2.2 * SR)
fade[-fn:] = np.linspace(1, 0, fn) ** 1.5
fi = int(0.01 * SR)
fade[:fi] = np.linspace(0, 1, fi)
out = np.stack([L * fade, R * fade], axis=1) * 0.89
wavfile.write(sys.argv[2], SR, (out * 32767).astype(np.int16))
rms = 20 * np.log10(np.sqrt(np.mean(out ** 2)))
print(f"soundtrack {N / SR:.2f}s | {sum(counts.values())} sfx {counts} | peak {np.abs(out).max():.2f} | rms {rms:.1f} dBFS")
