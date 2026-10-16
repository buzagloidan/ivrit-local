// Production panel with capture APIs mocked. Does not capture tabs or grant permissions.
const assert = require('node:assert/strict');
const { environment, drain } = require('./microphone-flow.cjs');
async function setup({ error, audio = true, surface = 'browser', unsupported = false } = {}) {
  const env = environment(); await env.ready();
  const { elements, context, calls } = env;
  const order = [], stopped = [], handlers = {};
  const audioTrack = { readyState: 'live', stop() { stopped.push('audio'); this.readyState = 'ended'; }, addEventListener(type, fn) { handlers.audio = fn; } };
  const videoTrack = { enabled: true, readyState: 'live', getSettings: () => ({ displaySurface: surface }), stop() { stopped.push('video'); this.readyState = 'ended'; }, addEventListener(type, fn) { handlers.video = fn; } };
  const tracks = audio ? [audioTrack, videoTrack] : [videoTrack];
  const stream = { getTracks: () => tracks, getAudioTracks: () => audio ? [audioTrack] : [], getVideoTracks: () => [videoTrack] };
  if (!unsupported) context.navigator.mediaDevices.getDisplayMedia = async (options) => {
    order.push(options); if (error) throw error; return stream;
  };
  let capture;
  const Worklet = context.AudioWorkletNode;
  context.AudioWorkletNode = class extends Worklet { constructor(...args) { super(...args); capture = this; } };
  const messages = [];
  calls.workers[0].postMessage = (message) => messages.push(message);
  elements.get('audio-source').value = 'tab'; elements.get('audio-source').events.change();
  return { ...env, order, stopped, handlers, audioTrack, videoTrack, messages,
    samples(values) { capture.port.onmessage({ data: { type: 'audio', samples: values } }); },
  };
}
(async () => {
  const tab = await setup();
  assert.equal(tab.elements.get('record-label').textContent, 'Choose tab & transcribe');
  const click = tab.click('record');
  assert.equal(tab.order.length, 1, 'Picker called during Record click, without a preceding asynchronous permission query');
  await click;
  assert.equal(tab.order[0].video.displaySurface, 'browser');
  assert.equal(tab.order[0].audio.suppressLocalAudioPlayback, false);
  assert.equal(tab.order[0].audio.echoCancellation, false);
  assert.equal(tab.order[0].monitorTypeSurfaces, 'exclude');
  assert.equal(tab.calls.audio, 0, 'No microphone request'); assert.equal(tab.calls.windows.length, 0);
  assert.equal(tab.videoTrack.enabled, false, 'Unused video frames disabled');
  assert.equal(tab.elements.get('status-label').textContent, 'LISTENING TO TAB');
  assert.equal(tab.elements.get('audio-source').disabled, true);
  console.log('PASS: tab mode opens picker within the click, preserves playback, never requests microphone');

  for (let i = 0; i < 50; i++) tab.samples(new Float32Array(2048));
  assert.match(tab.elements.get('status').textContent, /No tab audio detected/);
  tab.samples(new Float32Array(2048).fill(0.1));
  assert(tab.elements.get('level').value > 0);
  assert.match(tab.elements.get('status').textContent, /Listening to your selected tab/);
  assert(tab.messages.some(message => message.type === 'audio'));
  await tab.click('record');
  assert.deepEqual(tab.stopped.sort(), ['audio', 'video']);
  assert.equal(tab.messages.at(-1).type, 'finish');
  console.log('PASS: actual samples drive meter/silence feedback; Stop flushes speech and releases all tracks');

  for (const track of ['audio', 'video']) {
    const ended = await setup(); await ended.click('record'); ended.handlers[track](); await drain();
    assert.deepEqual(ended.stopped.sort(), ['audio', 'video']); assert.equal(ended.messages.at(-1).type, 'finish');
  }
  console.log('PASS: Chrome Stop sharing / tab closure finishes the transcript and releases capture');

  const noAudio = await setup({ audio: false }); await noAudio.click('record');
  assert.deepEqual(noAudio.stopped, ['video']); assert.match(noAudio.elements.get('notice').textContent, /Share tab audio/);
  assert.equal(noAudio.elements.get('record').disabled, false);
  assert(!noAudio.messages.some(message => message.type === 'start'));
  const wrongSurface = await setup({ surface: 'window' }); await wrongSurface.click('record');
  assert.deepEqual(wrongSurface.stopped.sort(), ['audio', 'video']); assert.match(wrongSurface.elements.get('notice').textContent, /Chrome tab rather than/);
  console.log('PASS: missing audio and non-tab sources give actionable recovery and stop every track');

  for (const name of ['NotAllowedError', 'AbortError', 'InvalidStateError']) {
    const error = new Error('capture error'); error.name = name;
    const rejected = await setup({ error }); await rejected.click('record');
    assert.equal(rejected.calls.audio, 0); assert.equal(rejected.calls.windows.length, 0);
    assert.equal(rejected.elements.get('record').disabled, false); assert.equal(rejected.elements.get('grant-mic').hidden, true);
  }
  const unsupported = await setup({ unsupported: true }); await unsupported.click('record');
  assert.match(unsupported.elements.get('notice').textContent, /unavailable/);
  console.log('PASS: dismissed, blocked, unfocused, and unsupported picker paths recover without microphone setup');
  console.log('All tab-audio flow checks passed. No actual tab was captured.');
})().catch(error => { console.error(error); process.exitCode = 1; });
