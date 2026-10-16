// Render compose.html frame-by-frame in headless Chrome (CDP) and pipe the
// frames into ffmpeg. Also exports the sound-event timeline for the soundtrack.
//
//   node capture.mjs --timeline                 -> build/timeline.json only
//   node capture.mjs --sample 3,9.5,20          -> build/sample-<t>.png stills
//   node capture.mjs [--fps 60]                 -> build/video.mp4 (no audio)
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9333;
const argv = process.argv.slice(2);
const arg = (k) => { const i = argv.indexOf(`--${k}`); return i < 0 ? undefined : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true); };
// Optional: --page genz/compose.html --build genz/build --size 1080x1920 (defaults = the original 16:9 promo)
const PAGE = `http://127.0.0.1:5173/promo/${arg('page') || 'compose.html'}?capture`;
const BUILD = path.join(HERE, arg('build') || 'build');
const [W, H] = String(arg('size') || '1920x1080').split('x').map(Number);
const FPS = Number(arg('fps') || 60);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await mkdir(BUILD, { recursive: true });
const profile = await mkdtemp(path.join(tmpdir(), 'promo-chrome-'));
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--mute-audio',
  '--force-device-scale-factor=1', `--window-size=${W},${H}`, 'about:blank',
], { stdio: 'ignore' });

let target;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(250);
  try { target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json(); } catch {}
}
if (!target) throw new Error('Chrome did not start');

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let seq = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? rej(new Error(m.error.message)) : res(m.result);
  }
};
const send = (method, params = {}) => new Promise((res, rej) => {
  const id = ++seq;
  pending.set(id, { res, rej });
  ws.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result.value;

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: PAGE });
for (let i = 0; i < 120; i++) {
  await sleep(250);
  if (await evaluate('window.__ready === true').catch(() => false)) break;
}

const timeline = await evaluate('window.__timeline');
await writeFile(path.join(BUILD, 'timeline.json'), JSON.stringify(timeline, null, 1));
console.log(`timeline: ${timeline.events.length} sound events, ${timeline.duration.toFixed(2)}s @ ${timeline.bpm} BPM`);

const shot = async (t, format = 'jpeg') => {
  await evaluate(`window.__render(${t})`);
  const { data } = await send('Page.captureScreenshot', { format, quality: 94, optimizeForSpeed: format === 'jpeg' });
  return Buffer.from(data, 'base64');
};

try {
  if (arg('timeline')) {
    // timeline only
  } else if (arg('sample')) {
    for (const t of String(arg('sample')).split(',').map(Number)) {
      await writeFile(path.join(BUILD, `sample-${t}.png`), await shot(t, 'png'));
      console.log(`sample ${t}s`);
    }
  } else {
    const frames = Math.round(timeline.duration * FPS);
    const out = path.join(BUILD, 'video.mp4');
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(FPS), out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const t0 = Date.now();
    for (let f = 0; f < frames; f++) {
      const buf = await shot(f / FPS);
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
      if (f % 300 === 0) console.log(`frame ${f}/${frames} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    }
    ff.stdin.end();
    await new Promise((r) => ff.on('close', r));
    console.log(`video: ${out} (${frames} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
} finally {
  ws.close();
  chrome.kill();
  await sleep(500);
  await rm(profile, { recursive: true, force: true }).catch(() => {});
}
