// Runs the production worker's real WASM + Hebrew weights. All reads are local.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { fileURLToPath, pathToFileURL } = require('node:url');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../extension');
let readyResolve, readyReject;
const ready = new Promise((resolve, reject) => { readyResolve = resolve; readyReject = reject; });
const results = [];
let context;
const globals = {
  console, performance, setTimeout, clearTimeout, TextDecoder, TextEncoder, URL,
  Response, Headers, process, require, module: { exports: {} },
  __dirname: path.join(root, 'vendor'),
  fetch: async (url) => {
    const parsed = new URL(url);
    if (parsed.protocol !== 'file:') throw new Error('Network access attempted: ' + parsed);
    return new Response(fs.readFileSync(fileURLToPath(parsed)), { status: 200 });
  },
  location: { href: pathToFileURL(path.join(root, 'engine-worker.js')).href },
  postMessage: (message) => {
    results.push(message);
    if (message.type === 'status') console.log(message.message);
    if (message.type === 'ready') readyResolve(message);
    if (message.type === 'error') readyReject(new Error(message.message));
  },
  importScripts: (...names) => {
    for (const name of names) vm.runInContext(fs.readFileSync(path.join(root, name), 'utf8'), context, { filename: name });
  },
};
globals.self = globals;
context = vm.createContext(globals);
vm.runInContext(fs.readFileSync(path.join(root, 'engine-worker.js'), 'utf8'), context, { filename: 'engine-worker.js' });

(async () => {
  const timeout = setTimeout(() => readyReject(new Error('Runtime startup timed out')), 60000);
  const loaded = await ready;
  clearTimeout(timeout);
  console.log('Runtime heap:', (loaded.heapBytes / 1024 ** 2).toFixed(1), 'MiB');
  const audio = process.argv[2] || path.resolve(__dirname, '../extension/demo/sample-hebrew.wav');
  const pcm = execFileSync(process.env.FFMPEG || 'ffmpeg', ['-v', 'error', '-i', audio, '-ac', '1', '-ar', '16000', '-f', 'f32le', 'pipe:1'], { maxBuffer: 64 * 1024 ** 2 });
  const samples = new Float32Array(pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + pcm.byteLength));
  const start = performance.now();
  await context.onmessage({ data: { type: 'start', id: 1 } });
  for (let i = 0; i < samples.length; i += 5120) {
    const chunk = samples.slice(i, i + 5120);
    await context.onmessage({ data: { type: 'audio', id: 1, samples: chunk.buffer } });
  }
  await context.onmessage({ data: { type: 'finish', id: 1 } });
  const error = results.find((r) => r.type === 'error');
  if (error) throw new Error(error.message);
  const final = results.find((r) => r.type === 'finished');
  if (!final?.text || !/[\u0590-\u05ff]/.test(final.text)) throw new Error('No Hebrew transcription returned');
  if (!process.argv[2] && !final.text.includes('שלום')) throw new Error('Unexpected sample transcript: ' + final.text);
  console.log(final.text.length > 200 ? final.text.slice(0, 200) + '…' : final.text);
  console.log(JSON.stringify({ audioSeconds: final.audioSeconds, recognitionSeconds: (performance.now() - start) / 1000, messages: results.length }, null, 2));
  if (process.env.RESULT_PATH) fs.writeFileSync(process.env.RESULT_PATH, JSON.stringify(final, null, 2));
  if (!final.cues?.length || final.cues.some(cue=>cue.end<=cue.start)) throw new Error('Missing or invalid caption timestamps');
  console.log('Timed captions:', JSON.stringify(final.cues.slice(0,2)));
  // A fresh job must not inherit any words from the previous recording.
  await context.onmessage({ data: { type: 'start', id: 2 } });
  await context.onmessage({ data: { type: 'finish', id: 2 } });
  const empty = results.find((r) => r.type === 'finished' && r.id === 2);
  if (empty?.text !== '') throw new Error('A fresh silent recording leaked previous text');
  console.log('Fresh silent recording: passed');
})().catch((error) => { console.error(error); process.exitCode = 1; });
