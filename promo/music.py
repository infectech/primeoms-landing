"""PrimeOMS promo track: 128 BPM, A minor (Am-F-C-G), fully synthesized.

No samples, no downloads: every sound below is generated from sine waves,
band-limited saws and filtered noise. The arrangement is written in beats so
it lines up exactly with the visuals in compose.html (same BPM).

    python -I music.py out.wav
"""
import sys

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, sosfilt

SR = 44100
BPM = 128
SPB = 60 / BPM
LENGTH = 42.5
N = int(SR * LENGTH)
rng = np.random.default_rng(7)


def s(b):
    """Beats -> sample index."""
    return int(round(b * SPB * SR))


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def tt(n):
    return np.arange(n) / SR


def lp(x, f, order=2):
    return sosfilt(butter(order, min(f, SR * 0.49), 'low', fs=SR, output='sos'), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, 'high', fs=SR, output='sos'), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], 'band', fs=SR, output='sos'), x)


def place(buf, b, sig, g=1.0):
    i = s(b)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i] * g


def saw(freq, n, phase=0.0):
    """PolyBLEP band-limited sawtooth."""
    dt = freq / SR
    ph = (phase + dt * np.arange(n)) % 1.0
    y = 2 * ph - 1
    m = ph < dt
    t = ph[m] / dt
    y[m] -= t + t - t * t - 1
    m = ph > 1 - dt
    t = (ph[m] - 1) / dt
    y[m] -= t * t + t + t + 1
    return y


def fade_edges(x, a=0.004, r=0.03):
    n = len(x)
    ia, ir = min(n, int(a * SR)), min(n, int(r * SR))
    x[:ia] *= np.linspace(0, 1, ia)
    x[n - ir:] *= np.linspace(1, 0, ir)
    return x


# ---- Drums -----------------------------------------------------------------

def kick():
    n = int(0.5 * SR)
    t = tt(n)
    f = 46 + 125 * np.exp(-t * 30)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 5.5)
    click = hp(rng.standard_normal(n), 2500) * np.exp(-t * 420) * 0.4
    return np.tanh((body + click) * 1.7) * 0.95


def clap():
    n = int(0.4 * SR)
    t = tt(n)
    env = np.zeros(n)
    for off in (0.0, 0.011, 0.023):
        i = int(off * SR)
        env[i:] += np.exp(-t[: n - i] * 95) * 0.8
    env += np.exp(-t * 13) * 0.45 * np.clip((t - 0.03) * 200, 0, 1)
    return bp(rng.standard_normal(n), 900, 5000) * env * 0.7


def snare(decay=18):
    n = int(0.3 * SR)
    t = tt(n)
    noise = bp(rng.standard_normal(n), 1500, 9000) * np.exp(-t * decay)
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * 0.5
    return (noise * 0.75 + tone) * 0.6


def hat(open_=False):
    n = int((0.26 if open_ else 0.06) * SR)
    t = tt(n)
    x = hp(rng.standard_normal(n), 7500, 4) * np.exp(-t * (13 if open_ else 75))
    return x * (0.36 if open_ else 0.26)


def crash(length=2.4):
    n = int(length * SR)
    t = tt(n)
    x = hp(rng.standard_normal(n), 4200, 2) * np.exp(-t * 2.1)
    x += bp(rng.standard_normal(n), 3000, 9500) * np.exp(-t * 6) * 0.5
    return x * 0.3


def impact():
    n = int(2.6 * SR)
    t = tt(n)
    f = 31 + 75 * np.exp(-t * 6)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.5)
    hit = lp(rng.standard_normal(n), 900) * np.exp(-t * 9) * 0.6
    return np.tanh((boom + hit) * 1.5) * 0.85


def riser(beats):
    n = s(beats)
    t = tt(n)
    p = t / t[-1]
    noise = rng.standard_normal(n)
    x = bp(noise, 300, 2200) * (1 - p) + bp(noise, 2200, 13000) * p
    tone = np.sin(2 * np.pi * np.cumsum(220 * 2 ** (p * 4)) / SR) * 0.22
    return (x * 0.45 + tone) * p ** 1.8


# ---- Tonal -------------------------------------------------------------------

def supersaw(notes, beats, voices=7, cents=18):
    n = s(beats)
    L = np.zeros(n)
    R = np.zeros(n)
    for m in notes:
        f0 = mtof(m)
        for v in range(voices):
            sp = (v - (voices - 1) / 2) / ((voices - 1) / 2)
            y = saw(f0 * 2 ** (sp * cents / 1200), n, rng.random())
            pan = 0.5 + sp * 0.45
            L += y * (1 - pan)
            R += y * pan
    norm = 1 / (len(notes) * voices ** 0.5)
    return fade_edges(L * norm, 0.006, 0.04), fade_edges(R * norm, 0.006, 0.04)


def bass_note(root, beats):
    n = s(beats)
    t = tt(n)
    f = mtof(root)
    x = lp(saw(f, n) * 0.6 + saw(f * 1.006, n, 0.3) * 0.4, 950)
    sub = np.sin(2 * np.pi * (f / 2) * t)
    env = np.minimum(1, t / 0.004) * np.exp(-t * 2.6)
    return fade_edges((x * 0.6 + sub * 0.75) * env, 0.002, 0.02)


def pluck(m, beats=0.5, bright=6500, decay=5.5):
    n = s(beats + 1.0)
    t = tt(n)
    f = mtof(m)
    x = saw(f, n) * 0.55 + saw(f * 1.005, n, 0.5) * 0.45
    fe = np.exp(-t * 14)
    y = lp(x, bright) * fe + lp(x, 1300) * (1 - fe)
    env = np.minimum(1, t / 0.003) * np.exp(-t * decay)
    return fade_edges(y * env, 0.002, 0.05)


# ---- Arrangement --------------------------------------------------------------

kick_bus = np.zeros(N)
drum_bus = np.zeros(N)
bass_bus = np.zeros(N)
padL, padR = np.zeros(N), np.zeros(N)
leadL, leadR = np.zeros(N), np.zeros(N)
fxL, fxR = np.zeros(N), np.zeros(N)
sendL, sendR = np.zeros(N), np.zeros(N)

PROG = [[57, 60, 64, 69], [53, 57, 60, 65], [55, 60, 64, 67], [55, 59, 62, 67]]  # Am F C G
ROOTS = [45, 41, 48, 43]
HOOK = [  # (beat in bar, midi) per chord
    [(0, 76), (0.75, 81), (1.5, 79), (2, 76), (2.75, 74), (3.5, 76)],
    [(0, 72), (0.75, 77), (1.5, 76), (2, 72), (2.75, 69), (3.5, 72)],
    [(0, 67), (0.75, 72), (1.5, 74), (2, 76), (2.75, 79), (3.5, 76)],
    [(0, 74), (0.75, 79), (1.5, 71), (2, 74), (2.75, 76), (3.5, 74)],
]
KICK, CLAP, OHAT, CHAT = kick(), clap(), hat(True), hat()


def stereo(bufL, bufR, b, sig, g=1.0, pan=0.5):
    place(bufL, b, sig, g * (1 - pan) * 2 ** 0.5)
    place(bufR, b, sig, g * pan * 2 ** 0.5)


def chord_at(bar):
    return (bar - 2) % 4 if bar >= 2 else [0, 1][bar]


def roll(start, end, steps, g0=0.15, g1=0.6):
    b = start
    while b < end - 1e-6:
        p = (b - start) / (end - start)
        dur = steps[0] if p < 0.5 else steps[1] if p < 0.85 else steps[2]
        sn = snare(22)
        place(drum_bus, b, sn, g0 + (g1 - g0) * p)
        place(sendL, b, sn, 0.12)
        place(sendR, b, sn, 0.12)
        b += dur


# Intro (beats 0-8): pad opening up, hats, roll, riser
for bar, chord in ((0, PROG[0]), (1, PROG[1])):
    L, R = supersaw(chord, 4)
    p = np.linspace(bar / 2, (bar + 1) / 2, len(L)) ** 1.5
    L = lp(L, 350) * (1 - p) + lp(L, 5000) * p
    R = lp(R, 350) * (1 - p) + lp(R, 5000) * p
    cut = s(3.75) if bar == 1 else len(L)
    place(padL, bar * 4, L[:cut], 0.55)
    place(padR, bar * 4, R[:cut], 0.55)
for i in range(16):
    place(drum_bus, 4 + i * 0.25, CHAT, 0.25 + 0.03 * (i % 2))
roll(4, 7.75, (0.5, 0.25, 0.125))
stereo(fxL, fxR, 2, riser(6), 0.5)
stereo(fxL, fxR, 6, crash()[::-1][-s(2):], 0.5)

# Main groove + burst + outro (beats 8-80)
for b in range(8, 80):
    bar = b // 4
    pos = b % 4
    if b != 71:
        place(kick_bus, b, KICK, 1.0)
    if 64 <= b < 72 and b >= 68:
        place(drum_bus, b, CLAP, 0.5)
        place(sendL, b, CLAP, 0.2)
        place(sendR, b, CLAP, 0.2)
    elif pos in (1, 3):
        place(drum_bus, b, CLAP, 0.55)
        place(sendL, b, CLAP, 0.22)
        place(sendR, b, CLAP, 0.22)
    place(drum_bus, b + 0.5, OHAT, 0.8)
    for k in range(4):
        place(drum_bus, b + k * 0.25, CHAT, 0.55 if k == 2 else 0.4)

    if pos == 0:
        ci = chord_at(bar)
        root = ROOTS[ci]
        for off, note, dur in ((0.5, root, 0.4), (1.5, root, 0.4), (2.5, root, 0.4), (3.5, root, 0.2), (3.75, root + 12, 0.2)):
            place(bass_bus, b + off, bass_note(note, dur), 0.9)
        if 64 <= b < 72:  # burst: chord stabs on every 8th
            for k in range(8):
                L, R = supersaw(PROG[ci], 0.35)
                place(padL, b + k * 0.5, lp(L, 7000), 0.7)
                place(padR, b + k * 0.5, lp(R, 7000), 0.7)
        else:
            L, R = supersaw(PROG[ci], 4)
            place(padL, b, lp(L, 5200), 0.62)
            place(padR, b, lp(R, 5200), 0.62)
            place(sendL, b, L, 0.06)
            place(sendR, b, R, 0.06)

        if 8 <= b < 24 or 40 <= b < 56 or 72 <= b < 80:
            for off, note in HOOK[ci]:
                pl = pluck(note)
                stereo(leadL, leadR, b + off, pl, 0.42, 0.5)
        elif 24 <= b < 40 or 56 <= b < 64:
            tones = PROG[ci][1:] + [PROG[ci][1] + 12]
            for k in range(16):
                pl = pluck(tones[[0, 1, 2, 3, 2, 1][k % 6]] + 12, 0.2, 5000, 9)
                stereo(leadL, leadR, b + k * 0.25, pl, 0.24, 0.3 + 0.4 * (k % 2))

# Burst chops: one rising pluck per beat
for i, note in enumerate([69, 72, 74, 76, 79, 81, 84, 86]):
    pl = pluck(note, 0.4, 8000, 4.5) + pluck(note + 12, 0.4, 8000, 4.5) * 0.5
    stereo(leadL, leadR, 64 + i, pl, 0.45, 0.35 + 0.3 * (i % 2))
    place(sendL, 64 + i, pl, 0.15)
    place(sendR, 64 + i, pl, 0.15)

# Fills, crashes, impacts, risers
for b in (23.5, 39.5, 55.5):
    place(drum_bus, b, snare(), 0.45)
    place(drum_bus, b + 0.25, snare(), 0.55)
roll(62, 64, (0.25, 0.125, 0.125), 0.2, 0.65)
roll(70, 71.75, (0.25, 0.125, 0.0625), 0.2, 0.7)
for b in (8, 24, 40, 56, 64, 72, 80):
    c = crash()
    stereo(fxL, fxR, b, c, 0.9)
    place(sendL, b, c, 0.2)
    place(sendR, b, c, 0.2)
for b in (8, 72, 80):
    place(kick_bus, b, impact(), 0.75)
stereo(fxL, fxR, 60, riser(4), 0.45)
stereo(fxL, fxR, 68, riser(4), 0.5)
stereo(fxL, fxR, 76, riser(4), 0.45)
for b in (64, 72, 80):
    stereo(fxL, fxR, b - 2, crash()[::-1][-s(2):], 0.4)

# Finale: big Am that closes down
place(kick_bus, 80, KICK, 1.0)
L, R = supersaw([45, 57, 60, 64, 69, 76], 10)
p = np.linspace(0, 1, len(L))
L = lp(L, 6000) * (1 - p) + lp(L, 500) * p
R = lp(R, 6000) * (1 - p) + lp(R, 500) * p
env = np.exp(-np.linspace(0, 3.2, len(L)))
place(padL, 80, L * env, 0.75)
place(padR, 80, R * env, 0.75)
place(sendL, 80, L * env, 0.3)
place(sendR, 80, R * env, 0.3)
place(bass_bus, 80, bass_note(33, 4), 1.0)
for i, note in enumerate([81, 76, 72, 69]):
    stereo(leadL, leadR, 80 + i * 0.75, pluck(note, 0.5, 7000, 3.5), 0.35, 0.3 + 0.4 * (i % 2))

# ---- Sidechain, delay, reverb, master ----------------------------------------

duck = np.ones(N)
t_rel = tt(int(0.35 * SR))
curve = 1 - 0.78 * np.exp(-t_rel / 0.085)
for b in range(8, 81):
    if b == 71:
        continue
    i = s(b)
    j = min(N, i + len(curve))
    duck[i:j] = np.minimum(duck[i:j], curve[: j - i])

padL *= duck
padR *= duck
bass_bus *= duck
leadL *= 0.35 + 0.65 * duck
leadR *= 0.35 + 0.65 * duck

# Ping-pong dotted-eighth delay on the lead
d = s(0.75)
dl, dr = np.zeros(N), np.zeros(N)
for k in range(1, 5):
    g = 0.38 ** k
    src = (leadL + leadR) * 0.5
    tgt = dl if k % 2 else dr
    tgt[d * k:] += src[: N - d * k] * g
leadL += lp(dl, 4500)
leadR += lp(dr, 4500)
sendL += leadL * 0.18
sendR += leadR * 0.18

# Plate-ish reverb: decaying stereo noise impulse
ir_n = int(2.0 * SR)
ir_t = tt(ir_n)
irL = lp(rng.standard_normal(ir_n), 6500) * np.exp(-ir_t / 0.42)
irR = lp(rng.standard_normal(ir_n), 6500) * np.exp(-ir_t / 0.42)
irL /= np.abs(irL).sum() ** 0.5 * 9
irR /= np.abs(irR).sum() ** 0.5 * 9
revL = fftconvolve(hp(sendL, 250), irL)[:N]
revR = fftconvolve(hp(sendR, 250), irR)[:N]

mono = kick_bus * 0.95 + drum_bus * 0.7 + bass_bus * 0.62
L = mono + padL * 0.5 + leadL * 0.62 + fxL * 0.55 + revL
R = mono + padR * 0.5 + leadR * 0.62 + fxR * 0.55 + revR
L, R = hp(L, 28), hp(R, 28)

peak = max(np.abs(L).max(), np.abs(R).max())
L, R = L / peak * 1.25, R / peak * 1.25
L, R = np.tanh(L) / np.tanh(1.25), np.tanh(R) / np.tanh(1.25)
fade = np.ones(N)
fn = int(1.4 * SR)
fade[-fn:] = np.linspace(1, 0, fn) ** 2
L, R = L * fade * 0.93, R * fade * 0.93

out = np.stack([L, R], axis=1)
wavfile.write(sys.argv[1] if len(sys.argv) > 1 else 'music.wav', SR, (out * 32767).astype(np.int16))
rms = np.sqrt(np.mean(out ** 2))
print(f'wrote {LENGTH}s @ {BPM} BPM | peak {np.abs(out).max():.3f} | rms {20 * np.log10(rms):.1f} dBFS')
