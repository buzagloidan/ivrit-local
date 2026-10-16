const worker = new Worker('../extension/engine-worker.js');
const button = document.getElementById('run');
const status = document.getElementById('status');
let audioContext, sourceContext, sharedStream, captured = 0;
worker.onmessage = ({ data }) => {
  if (data.type === 'ready') { button.disabled = false; button.textContent = 'Run audio pipeline check'; status.textContent = 'Ready.'; }
  if (data.type === 'result') document.getElementById('output').value = data.text;
  if (data.type === 'error') status.textContent = 'FAIL: ' + data.message;
  if (data.type === 'finished') {
    document.getElementById('output').value = data.text;
    status.textContent = data.text.includes('שלום') && captured > 30000 ? `PASS: AudioWorklet captured ${captured} samples at 16 kHz; final Hebrew transcript is correct.` : 'FAIL: Unexpected capture or transcript.';
    audioContext?.close(); if (sourceContext !== audioContext) sourceContext?.close(); sharedStream?.getTracks().forEach(track => track.stop()); worker.terminate();
  }
};
button.addEventListener('click', async () => {
  button.disabled = true;
  try {
    audioContext = new AudioContext({ sampleRate: 16000 });
    await audioContext.audioWorklet.addModule('../extension/audio-worklet.js');
    const response = await fetch('../extension/demo/sample-hebrew.wav');
    const streamMode = document.getElementById('input-mode').value === 'stream';
    sourceContext = streamMode ? new AudioContext({ sampleRate: 48000 }) : audioContext;
    const audio = await sourceContext.decodeAudioData(await response.arrayBuffer());
    const source = sourceContext.createBufferSource();
    let input = source;
    if (streamMode) {
      const stereo = sourceContext.createBuffer(2, audio.length, sourceContext.sampleRate);
      for (let channel = 0; channel < 2; channel++) stereo.copyToChannel(audio.getChannelData(0), channel);
      source.buffer = stereo;
      const destination = sourceContext.createMediaStreamDestination();
      source.connect(destination); sharedStream = destination.stream;
      input = audioContext.createMediaStreamSource(sharedStream);
    } else source.buffer = audio;
    const capture = new AudioWorkletNode(audioContext, 'ivrit-capture');
    const mute = audioContext.createGain(); mute.gain.value = 0;
    capture.port.onmessage = ({ data }) => {
      if (data.type === 'audio') {
        captured += data.samples.length;
        worker.postMessage({ type: 'audio', id: 1, samples: data.samples.buffer }, [data.samples.buffer]);
      }
      if (data.type === 'flushed') { source.disconnect(); input.disconnect(); capture.disconnect(); mute.disconnect(); worker.postMessage({ type: 'finish', id: 1 }); }
    };
    source.onended = () => { status.textContent = 'Finishing captured speech…'; setTimeout(() => capture.port.postMessage('flush'), streamMode ? 200 : 0); };
    input.connect(capture).connect(mute).connect(audioContext.destination);
    worker.postMessage({ type: 'start', id: 1 });
    await audioContext.resume(); if (sourceContext !== audioContext) await sourceContext.resume();
    source.start(); status.textContent = streamMode ? 'Capturing a 48 kHz stereo MediaStream through the 16 kHz worklet…' : 'Capturing the sample through the audio worklet…';
  } catch (error) { status.textContent = 'FAIL: ' + error.message; audioContext?.close(); }
});
