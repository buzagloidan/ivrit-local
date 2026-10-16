/* Local-only recognition worker. No audio or model requests leave this package. */
importScripts('transcript-tools.js');
let engine;
let stream;
let job = null;
let lastText = '';
let runtimeError = '';

function notify(type, detail = {}) { self.postMessage({ type, ...detail }); }

const initialized = (async () => {
  notify('status', { message: 'Starting the local speech engine…' });
  await new Promise((resolve, reject) => {
    self.Module = {
      locateFile: (name) => new URL(`vendor/${name}`, self.location.href).href,
      onRuntimeInitialized: resolve,
      onAbort: (error) => reject(new Error(String(error))),
      print: () => {},
      printErr: (line) => { runtimeError = String(line); console.warn(line); },
    };
    importScripts('vendor/sherpa-onnx-wasm-main-asr.js');
  });
  importScripts('vendor/sherpa-onnx-asr.js');
  const files = [
    ['encoder.int8.onnx', 'encoder.onnx'],
    ['decoder.int8.onnx', 'decoder.onnx'],
    ['joiner.int8.onnx', 'joiner.onnx'],
    ['tokens.txt', 'tokens.txt'],
  ];
  for (const [source, target] of files) {
    notify('status', { message: 'Loading the bundled Hebrew model…' });
    const response = await fetch(new URL(`model/${source}`, self.location.href));
    if (!response.ok) throw new Error(`Missing bundled file: ${source}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    Module.FS_createDataFile('/', target, bytes, true, false, true);
  }
  notify('status', { message: 'Preparing Hebrew recognition…' });
  engine = createOnlineRecognizer(Module, {
    featConfig: { sampleRate: 16000, featureDim: 80 },
    modelConfig: {
      transducer: { encoder: './encoder.onnx', decoder: './decoder.onnx', joiner: './joiner.onnx' },
      paraformer: { encoder: '', decoder: '' },
      zipformer2Ctc: { model: '' },
      nemoCtc: { model: '' },
      toneCtc: { model: '' },
      tokens: './tokens.txt', numThreads: 1, provider: 'cpu', debug: 0,
      modelType: 'zipformer2', modelingUnit: 'cjkchar', bpeVocab: '',
    },
    decodingMethod: 'greedy_search', maxActivePaths: 4, enableEndpoint: 1,
    rule1MinTrailingSilence: 2.4, rule2MinTrailingSilence: 1.2,
    rule3MinUtteranceLength: 20, hotwordsFile: '', hotwordsScore: 1.5,
    ctcFstDecoderConfig: { graph: '', maxActive: 3000 }, ruleFsts: '', ruleFars: '',
  });
  if (!engine.handle) throw new Error(runtimeError || 'The bundled model could not be initialized.');
  // ONNX Runtime now owns its weights. Release the in-memory filesystem copies.
  for (const [, target] of files) FS.unlink(`/${target}`);
  notify('ready', { heapBytes: Module.HEAPU8.length });
})().catch((error) => {
  notify('error', { message: `Could not load the speech model. ${error.message || error}`, fatal: true });
  throw error;
});
// The error is reported to the panel above; avoid a second unhandled rejection.
initialized.catch(() => {});

function currentResult() {
  while (engine.isReady(stream)) engine.decode(stream);
  return engine.getResult(stream);
}
function commit(result) {
  const text = result.text.trim();
  if (!text) return;
  const times = result.timestamps || [];
  const origin = Number.isFinite(result.start_time) ? result.start_time : job.segmentStart;
  const last = job.cues.at(-1)?.end || 0;
  const start = Math.max(last, origin + (times[0] || 0));
  const duration = job.samples / 16000;
  const end = Math.max(start + 0.001, Math.min(duration, origin + (times.at(-1) ?? Math.max(0,duration-origin-0.3)) + 0.3));
  job.parts.push(text);
  job.cues.push({start,end,text});
}
function decode(final = false) {
  const result = currentResult();
  const text = result.text.trim();
  const endpoint = !final && engine.isEndpoint(stream);
  if (final || endpoint) {
    commit(result);
    if (endpoint) { engine.reset(stream); job.segmentStart = job.samples / 16000; }
  }
  const combined = [...job.parts, ...(!final && !endpoint && text ? [text] : [])].join('\n');
  if (combined.length > IvritTranscript.MAX_TEXT) throw new Error('Transcript reached the 200,000 character limit. Export it and start another session.');
  if (combined !== lastText || final) {
    lastText = combined;
    notify('result', {id:job.id,text:combined,cues:job.cues});
  }
}

self.onmessage = async ({ data }) => {
  try {
    await initialized;
    if (data.type === 'start') {
      if (stream) stream.free();
      stream = engine.createStream();
      if (!stream.handle) throw new Error('Could not start recognition.');
      job = { id: data.id, samples: 0, started: performance.now(), parts:[], cues:[], segmentStart:0 };
      lastText = '';
      notify('started', { id: job.id });
    } else if (job && data.id === job.id && data.type === 'audio') {
      const samples = new Float32Array(data.samples);
      if (samples.length > 16000 || job.samples + samples.length > IvritTranscript.MAX_SECONDS*16000) throw new Error('Audio exceeds the 60-minute session limit.');
      stream.acceptWaveform(16000, samples);
      job.samples += samples.length;
      decode();
      notify('ack', { id: job.id, sequence: data.sequence, samples: job.samples });
    } else if (job && data.id === job.id && data.type === 'finish') {
      stream.acceptWaveform(16000, new Float32Array(24000));
      stream.inputFinished();
      decode(true);
      notify('finished', {
        id: job.id, text: lastText, cues:job.cues, audioSeconds: job.samples / 16000,
        elapsedSeconds: (performance.now() - job.started) / 1000,
      });
      stream.free(); stream = null; job = null;
    } else if (job && data.id === job.id && data.type === 'cancel') {
      stream.free(); stream = null; job = null;
    }
  } catch (error) {
    const id = data.id;
    if (stream) { try { stream.free(); } catch {} }
    stream = null; job = null;
    notify('error', { id, message: `Recognition failed. ${error.message || error}`, fatal: true });
  }
};
