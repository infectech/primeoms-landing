"""PrimeOMS — Gen Z cut soundtrack: chill-trap / lo-fi flex, 140 BPM half-time.

Everything (drums, Rhodes chords, 808 slides, vocal chops, UI sounds) is read
from the score that compose.js exported, so every hit lands on its frame.
Fully synthesized: no samples, no downloads. Original composition.

    python -I beat.py build/timeline.json build/beat.wav
"""
import json
import sys

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, sosfilt

SR = 44100
rng = np.random.default_rng(140)
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


def env_ar(n, a, r_start, r_len):
    e = np.ones(n)
    ia = max(1, int(a * SR))
    e[:ia] = np.linspace(0, 1, ia)
    i0 = int(r_start * SR)
    if i0 < n:
        rl = max(1, int(r_len * SR))
        tail = np.exp(-np.arange(n - i0) / rl)
        e[i0:] *= tail
    return e


class Bus:
    def __init__(self):
        self.L = np.zeros(N)
        self.R = np.zeros(N)

    def put(self, t, sig, gain=1.0, pan=0.0):
        i = int(round(t * SR))
        if i >= N or i < 0:
            return
        j = min(N, i + len(sig))
        a = (pan + 1) * np.pi / 4
        self.L[i:j] += sig[: j - i] * gain * np.cos(a)
        self.R[i:j] += sig[: j - i] * gain * np.sin(a)


# ---- Instruments -----------------------------------------------------------------

def rhodes(m, dur_s, vel=0.55):
    f = mtof(m)
    n = int((dur_s + 0.6) * SR)
    t = tt(n)
    index = (1.2 + 2.2 * vel) * np.exp(-t / 0.35) + 0.25
    mod = np.sin(2 * np.pi * f * t) * index
    body = np.sin(2 * np.pi * f * t + mod)
    tine = np.sin(2 * np.pi * f * 14.0 * t) * np.exp(-t / 0.025) * 0.12 * vel
    tau = float(np.interp(m, [40, 60, 84], [2.2, 1.5, 0.8]))
    amp = np.exp(-t / tau) * env_ar(n, 0.003, dur_s, 0.12)
    return (body + tine) * amp * vel * 0.18


def b808(m, dur_s, from_m=None):
    f = mtof(m)
    n = int((dur_s + 0.15) * SR)
    t = tt(n)
    freq = f * (1 + 0.6 * np.exp(-t / 0.018))
    if from_m is not None:
        f0 = mtof(from_m)
        g = np.clip(t / 0.09, 0, 1)
        freq = (f0 + (f - f0) * (1 - (1 - g) ** 2)) * (1 + 0.02 * np.exp(-t / 0.02))
    ph = 2 * np.pi * np.cumsum(freq) / SR
    y = np.sin(ph)
    y = np.tanh(y * 2.2) * 0.7 + y * 0.3
    amp = np.exp(-t / 1.6) * env_ar(n, 0.002, dur_s, 0.05)
    return y * amp * 0.55


def kick(vel=1.0):
    n = int(0.3 * SR)
    t = tt(n)
    f = 52 + 95 * np.exp(-t * 45)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11)
    y += hp(rng.standard_normal(n), 3000) * np.exp(-t * 500) * 0.25
    return np.tanh(y * 1.5) * 0.55 * vel


def snare():
    n = int(0.45 * SR)
    t = tt(n)
    noise = bp(rng.standard_normal(n), 1400, 9000) * np.exp(-t * 15)
    tone = np.sin(2 * np.pi * 185 * t) * np.exp(-t * 28) * 0.55
    clap = np.zeros(n)
    for off in (0.0, 0.012, 0.024):
        i = int(off * SR)
        clap[i:] += bp(rng.standard_normal(n - i), 900, 5000) * np.exp(-t[: n - i] * 70)
    return (noise * 0.6 + tone + clap * 0.45) * 0.42


def snap(vel=1.0):
    n = int(0.12 * SR)
    t = tt(n)
    y = bp(rng.standard_normal(n), 1800, 6500) * np.exp(-t * 160)
    y += np.sin(2 * np.pi * 1750 * t) * np.exp(-t * 120) * 0.35
    return y * 0.35 * vel


def hat(vel=0.6, open_=False):
    n = int((0.22 if open_ else 0.05) * SR)
    t = tt(n)
    y = hp(rng.standard_normal(n), 7800, 4) * np.exp(-t * (14 if open_ else 85))
    return y * vel * 0.32


def crash(vel=1.0):
    n = int(2.4 * SR)
    t = tt(n)
    y = hp(rng.standard_normal(n), 4200) * np.exp(-t * 2.2) + bp(rng.standard_normal(n), 3000, 9000) * np.exp(-t * 6) * 0.5
    return y * 0.22 * vel


def impact():
    n = int(2.2 * SR)
    t = tt(n)
    f = 34 + 70 * np.exp(-t * 7)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.8)
    hit = lp(rng.standard_normal(n), 800) * np.exp(-t * 10) * 0.5
    return np.tanh((boom + hit) * 1.4) * 0.6


def riser(dur_s):
    n = int(dur_s * SR)
    t = tt(n)
    p = t / t[-1]
    noise = rng.standard_normal(n)
    y = bp(noise, 400, 2500) * (1 - p) + bp(noise, 2500, 12000) * p
    y += np.sin(2 * np.pi * np.cumsum(300 * 2 ** (p * 3)) / SR) * 0.15
    return y * p ** 2 * 0.3


def chop(m, dur_s, vowel="ah"):
    """Formant 'vocal chop': a sung ooh/ah with a little scoop into the note."""
    f = mtof(m)
    n = int((dur_s + 0.35) * SR)
    t = tt(n)
    scoop = 2 ** (-1.2 / 12 * np.exp(-t / 0.035))
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.2 * t) * np.clip((t - 0.15) * 4, 0, 1)
    ph = np.cumsum(f * scoop * vib) / SR
    src = 2 * (ph % 1.0) - 1
    src += 0.3 * np.sin(2 * np.pi * ph)
    forms = {"ah": ((800, 1.0), (1150, 0.6), (2900, 0.25)), "oo": ((350, 1.0), (650, 0.45), (2500, 0.12))}[vowel]
    y = sum(g * bp(src, fc * 0.88, fc * 1.12) for fc, g in forms)
    y += 0.08 * bp(rng.standard_normal(n), 3500, 9000) * np.exp(-t * 40)
    amp = env_ar(n, 0.012, dur_s, 0.07)
    return y * amp * 0.5


def bell(m, decay=1.2):
    f = mtof(m)
    n = int(decay * 2.4 * SR)
    t = tt(n)
    y = np.zeros(n)
    for ratio, amp, d in ((1, 1, 1.0), (2.0, 0.4, 0.5), (3.01, 0.25, 0.3), (4.16, 0.12, 0.18)):
        if f * ratio < SR * 0.45:
            y += amp * np.sin(2 * np.pi * f * ratio * t) * np.exp(-t / (decay * d))
    return y * 0.28


def pop(m, gain=1.0):
    f = mtof(m)
    n = int(0.2 * SR)
    t = tt(n)
    freq = f * (0.55 + 0.45 * (1 - np.exp(-t / 0.012)))
    y = np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.exp(-t * 24)
    y += bp(rng.standard_normal(n), 2000, 6000) * np.exp(-t * 900) * 0.2
    return y * 0.3 * gain


def click(gain=1.0):
    n = int(0.09 * SR)
    t = tt(n)
    tick = bp(rng.standard_normal(n), 2500, 7500) * np.exp(-t * 1200)
    body = np.sin(2 * np.pi * 1750 * t) * np.exp(-t * 170) * 0.5 + np.sin(2 * np.pi * 880 * t) * np.exp(-t * 120) * 0.4
    y = tick + body
    o = int(0.019 * SR)
    y[o:] += tick[: n - o] * 0.45 + body[: n - o] * 0.25
    return y * 0.42 * gain


def keytap(seed, gain=1.0):
    r = np.random.default_rng(int(seed * 7) + 3)
    n = int(0.06 * SR)
    t = tt(n)
    y = bp(r.standard_normal(n), 1600 + r.random() * 1200, 7000) * np.exp(-t * 650)
    y += np.sin(2 * np.pi * (160 + r.random() * 70) * t) * np.exp(-t * 80) * 0.5
    return y * 0.3 * gain * (0.85 + 0.3 * r.random())


def swish(dur_s, gain=1.0):
    n = int(dur_s * SR)
    t = tt(n)
    p = t / t[-1]
    noise = rng.standard_normal(n)
    bands = [bp(noise, lo, hi) for lo, hi in ((300, 900), (900, 2200), (2200, 5000), (5000, 11000))]
    center = 0.15 + 2.6 * np.sin(np.pi * np.clip(p * 1.15, 0, 1)) ** 1.2
    y = sum(b * np.exp(-((center - k) ** 2) / 0.7) for k, b in enumerate(bands))
    return y * np.sin(np.pi * p ** 0.75) ** 2 * 0.17 * gain


def scan(dur_s):
    n = int(dur_s * SR)
    t = tt(n)
    p = t / t[-1]
    return (bp(rng.standard_normal(n), 1500, 6000) * 0.4 + np.sin(2 * np.pi * np.cumsum(600 + 900 * p) / SR) * 0.12) * np.sin(np.pi * p) * 0.3


def count(dur_s, gain=1.0):
    n = int((dur_s + 0.2) * SR)
    y = np.zeros(n)
    t = 0.0
    while t < dur_s:
        p = t / dur_s
        s = bell(86 + int(p * 9), 0.08)[: int(0.1 * SR)]
        i = int(t * SR)
        y[i: i + len(s)] += s[: n - i] * 0.6
        t += 0.11 - 0.07 * p
    return y * gain


def sparkle(notes, dur_s, gain=1.0):
    n = int((dur_s + 1.5) * SR)
    y = np.zeros(n)
    for k, m in enumerate(notes):
        b = bell(m + 12, 0.4)
        i = int(k / max(1, len(notes) - 1) * dur_s * SR)
        y[i: i + len(b)] += b[: n - i]
    return y * 0.5 * gain


def chime(m, gain=1.0):
    a, b = bell(m, 1.3), bell(m + 7, 1.1)
    o = int(0.07 * SR)
    y = np.zeros(len(a) + o)
    y[: len(a)] += a
    y[o: o + len(b)] += b * 0.75
    return y * 0.9 * gain


def stamp(m):
    n = int(0.25 * SR)
    t = tt(n)
    thock = np.sin(2 * np.pi * 140 * t) * np.exp(-t * 35) * 0.6
    s = snap(0.9)
    y = thock.copy()
    y[: len(s)] += s
    p = pop(m, 0.9)
    y[: len(p)] += p
    return y


def warble():
    n = int(0.6 * SR)
    t = tt(n)
    f = mtof(46) * (1 + 0.03 * np.sin(2 * np.pi * 7 * t))
    ph = np.cumsum(f) / SR
    y = (2 * (ph % 1) - 1) + (2 * ((ph * 1.06) % 1) - 1)
    return lp(y, 900) * np.exp(-t * 4) * 0.12


# ---- Render the score --------------------------------------------------------------

music = Bus()   # tonal + drums: gets the tape-stop
after = Bus()   # music after the tape-stop (final chord)
sfx = Bus()     # UI sounds, never tape-stopped
send = Bus()    # reverb send
dly = Bus()     # delay send (chops, plucks)
kick_times = []

stop = next((e for e in TL["events"] if e["type"] == "tapestop"), None)
stop_t = stop["t"] if stop else 1e9
stop_len = (stop["dur"] if stop else 1) * SPB

for e in TL["events"]:
    k = e["type"]
    t = e["t"]
    pan = e.get("pan", 0.0)
    g = e.get("gain", 1.0)
    bus = after if (t > stop_t + stop_len - 0.01 and k in ("ep", "b808", "sparkle")) else music
    if k == "ep":
        chord = np.zeros(int((e["dur"] * SPB + 0.6) * SR))
        for i, m in enumerate(e["notes"]):
            r = rhodes(m, e["dur"] * SPB, e.get("vel", 0.55))
            o = int(i * 0.012 * SR)
            chord[o: o + len(r)] += r[: len(chord) - o]
        chord = lp(chord, e.get("cut", 2600))
        bus.put(t, chord, 1.0, -0.15)
        send.put(t, chord, 0.35, -0.15)
    elif k == "b808":
        bus.put(t, b808(e["note"], e["dur"] * SPB, e.get("from")), 1.0, 0.0)
    elif k == "kick":
        music.put(t, kick(e.get("vel", 1.0)), 1.0, 0.0)
        kick_times.append(t)
    elif k == "snare":
        s = snare()
        music.put(t, s, 1.0, 0.0)
        send.put(t, s, 0.3, 0.0)
    elif k == "snap":
        s = snap(e.get("vel", 1.0))
        music.put(t, s, 1.0, pan)
        send.put(t, s, 0.35, pan)
    elif k == "hat":
        music.put(t, hat(e.get("vel", 0.6)), 1.0, pan)
    elif k == "ohat":
        music.put(t, hat(e.get("vel", 0.5), True), 1.0, 0.3)
    elif k == "crash":
        c = crash(e.get("vel", 1.0))
        music.put(t, c, 1.0, 0.0)
        send.put(t, c, 0.15)
    elif k == "impact":
        music.put(t, impact(), 1.0, 0.0)
    elif k == "riser":
        music.put(t, riser(e["dur"] * SPB), 1.0, 0.0)
    elif k == "revcrash":
        c = crash(0.9)[: int(e["dur"] * SPB * SR)][::-1]
        music.put(t, c, 1.0, 0.0)
    elif k == "chop":
        c = chop(e["note"], e["dur"] * SPB, e.get("vowel", "ah"))
        music.put(t, c, 0.9, 0.15)
        send.put(t, c, 0.35, 0.15)
        dly.put(t, c, 0.3, 0.15)
    elif k == "pluck":
        p = rhodes(e["note"], 0.25, 0.8)
        sfx.put(t, p, 1.2, pan)
        dly.put(t, p, 0.4, pan)
    elif k == "sparkle":
        s = sparkle(e["notes"], e["dur"] * SPB, g)
        bus.put(t, s, 0.9, 0.2)
        send.put(t, s, 0.3)
    elif k == "chime":
        c = chime(e["note"], g)
        sfx.put(t, c, 1.0, 0.1)
        send.put(t, c, 0.25)
    elif k == "plink":
        b = bell(e["note"], 0.8)
        sfx.put(t, b, 0.9, pan)
        dly.put(t, b, 0.35, pan)
    elif k == "pop":
        sfx.put(t, pop(e["note"], g), 1.0, pan)
    elif k == "tick":
        sfx.put(t, bell(e["note"], 0.12)[: int(0.15 * SR)] * g, 1.0, 0.0)
    elif k == "type":
        sfx.put(t, keytap(e.get("seed", 0), g), 1.0, -0.1)
    elif k == "click":
        sfx.put(t, click(g), 1.0, 0.0)
    elif k == "swish":
        sfx.put(t, swish(e.get("dur", 0.6) * SPB * 1.3, g), 1.0, pan)
    elif k == "scan":
        sfx.put(t, scan(e["dur"] * SPB), 1.0, 0.0)
    elif k == "count":
        sfx.put(t, count(e["dur"] * SPB, g), 0.8, 0.2)
    elif k == "stamp":
        sfx.put(t, stamp(e["note"]), 1.0, pan)
    elif k == "warble":
        sfx.put(t, warble(), 1.0, 0.0)

# Groove: duck the keys a touch on every kick
duck = np.ones(N)
curve = 1 - 0.32 * np.exp(-np.arange(int(0.25 * SR)) / (0.07 * SR))
for kt in kick_times:
    i = int(kt * SR)
    j = min(N, i + len(curve))
    duck[i:j] = np.minimum(duck[i:j], curve[: j - i])
music.L *= duck
music.R *= duck

# Tape stop: the beat slows to a halt when "book a demo" is clicked
if stop:
    i0 = int(stop_t * SR)
    n_stop = int(stop_len * SR)
    tau = np.arange(n_stop) / n_stop
    pos = i0 + np.cumsum((1 - tau) ** 1.6)
    for ch in (music.L, music.R):
        src = ch.copy()
        ch[i0:i0 + n_stop] = np.interp(pos, np.arange(N), src) * (1 - tau ** 3)
        ch[i0 + n_stop:] = 0
    for ch in (send.L, send.R, dly.L, dly.R):
        ch[i0 + n_stop:] *= 0.3

# Dotted-eighth ping-pong delay
d = int(0.75 * SPB * SR)
for kk in range(1, 5):
    g = 0.42 ** kk
    srcL, srcR = (dly.L, dly.R)
    tgt = music.L if kk % 2 else music.R
    tgt[d * kk:] += lp((srcL + srcR)[: N - d * kk] * 0.5, 5000) * g

# Short plate reverb
ir_n = int(1.9 * SR)
ir_t = tt(ir_n)
irs = []
for _ in range(2):
    ir = lp(rng.standard_normal(ir_n), 6000) * np.exp(-ir_t / 0.45)
    irs.append(ir / np.sqrt(np.sum(ir ** 2)) * 0.5)
revL = fftconvolve(hp(send.L, 200), irs[0])[:N]
revR = fftconvolve(hp(send.R, 200), irs[1])[:N]

# Vinyl crackle + hiss under everything
crackle = np.zeros(N)
pops = rng.random(N) < (7 / SR)
crackle[pops] = rng.standard_normal(pops.sum()) * 0.25
crackle = hp(crackle, 1200) + lp(rng.standard_normal(N), 5000) * 0.004
vin = np.minimum(1, tt(N) / 0.5) * 0.12

L = music.L + after.L + sfx.L + revL + crackle * vin
R = music.R + after.R + sfx.R + revR + crackle * vin
L, R = hp(L, 25), hp(R, 25)
peak = max(np.abs(L).max(), np.abs(R).max())
L, R = L / peak * 1.35, R / peak * 1.35
L, R = np.tanh(L) / np.tanh(1.35), np.tanh(R) / np.tanh(1.35)
fade = np.ones(N)
fn = int(2.0 * SR)
fade[-fn:] = np.linspace(1, 0, fn) ** 1.5
out = np.stack([L * fade, R * fade], axis=1) * 0.89
wavfile.write(sys.argv[2], SR, (out * 32767).astype(np.int16))
rms = 20 * np.log10(np.sqrt(np.mean(out ** 2)))
print(f"beat {N / SR:.2f}s | {len(TL['events'])} score events | {len(kick_times)} kicks | peak {np.abs(out).max():.2f} | rms {rms:.1f} dBFS")
