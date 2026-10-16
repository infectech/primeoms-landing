# PrimeOMS promo video

The finished video is **`PrimeOMS-Promo.mp4`** in this folder: 1920×1080, 60 fps, about 58 seconds, with its soundtrack.

## How it's made

| File | What it does |
|---|---|
| `compose.html`, `compose.css`, `compose.js` | The video as a web page. Each frame is drawn by `render(t)` for an exact time `t`, using the site's avatars and logo. Every sound effect is declared in `compose.js` with `ev(beat, type)`, right next to the motion it belongs to. |
| `capture.mjs` | Opens the composition in headless Chrome, exports the sound-event list to `build/timeline.json`, renders every frame, and pipes the frames into ffmpeg (`build/video.mp4`). |
| `soundtrack.py` | An original, Minecraft-inspired felt-piano piece (D major, 90 BPM) plus synthesized UI sounds: clicks, swishes, pops, key taps and chimes. Each sound is placed from `timeline.json`, so it lands on the exact frame of its visual. No samples and no downloads. |

All people, orders, phone numbers and figures in the video are illustrative.

## Re-render

The site must be served at `http://127.0.0.1:5173`, for example with `python -m http.server 5173` from the project root.

```sh
node capture.mjs --fps 60                               # frames -> build/video.mp4 (+ build/timeline.json)
python -I soundtrack.py build/timeline.json build/soundtrack.wav
ffmpeg -i build/video.mp4 -i build/soundtrack.wav -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart PrimeOMS-Promo.mp4
```

To preview stills: `node capture.mjs --sample 5,12.5,30`, which writes `build/sample-<t>.png`. To watch it live in a browser, open `compose.html?play`.

## Gen Z cut (vertical)

**`PrimeOMS-Promo-GenZ.mp4`**: 1080×1920, 60 fps, about 41 seconds. It is a chill-trap / lo-fi flex beat at 140 BPM in half-time, with lowercase brag captions, made for Reels, TikTok and Shorts. Its sources live in `genz/` and are separate from the original promo.

**One score drives both picture and sound.** `genz/compose.js` declares every kick, snare, hat, Rhodes chord, 808 note, vocal chop and UI sound with `ev(beat, …)`. `genz/beat.py` renders exactly those events, and the visuals bounce on the same kicks and snares:
- Avatars pop on kicks, each singing a note.
- The phone number is typed as the hi-hat roll.
- The 808 bass slides up as the truck drives.
- Checklist items stamp on 8th notes.
- Clicking "book a demo" tape-stops the beat.

```sh
node capture.mjs --page genz/compose.html --build genz/build --size 1080x1920 --fps 60
python -I genz/beat.py genz/build/timeline.json genz/build/beat.wav
ffmpeg -i genz/build/video.mp4 -i genz/build/beat.wav -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart PrimeOMS-Promo-GenZ.mp4
```
