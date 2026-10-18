// Production panel/setup scripts with browser APIs mocked: no physical mic or permissions change.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../extension');
const tick = () => new Promise((resolve) => setImmediate(resolve));
async function drain() { for (let i = 0; i < 8; i++) await tick(); }
function environment({ page = 'panel', permission = 'prompt', micError, session = '', accepted = true, permissionQueryFails = false, storedLanguage = 'en', windowId = 10, shortcuts = [{name:'toggle-microphone',shortcut:'Ctrl+Shift+Space'}] } = {}) {
  const elements = new Map();
  const html = fs.readFileSync(path.join(root, `${page}.html`), 'utf8');
  for (const match of html.matchAll(/\bid="([^"]+)"/g)) {
    elements.set(match[1], { id: match[1], textContent: '', value: '', dataset: {}, hidden: false, disabled: false, events: {},
      classList: { toggle() {}, remove() {} }, addEventListener(name, handler) { this.events[name] = handler; },
      focus() {}, select() {}, scrollHeight: 0, scrollTop: 0 });
  }
  for (const id of ['settings','return','system-help','resume-hint','grant-mic','cancel-setup']) if (elements.has(id)) elements.get(id).hidden = true;
  const calls = { windows: [], removed: [], focus: [], tabs: [], messages: [], audio: 0, tracksStopped: 0, workers: [] };
  const listeners = { messages: [], removed: [], document: {}, page: {} };
  const track = { stop() { calls.tracksStopped++; calls.messages.push({ type: 'track-stopped' }); }, addEventListener() {} };
  const audioNode = () => ({ connect(next) { return next; }, disconnect() {}, gain: { value: 1 } });
  class Context {
    constructor() { this.sampleRate = 16000; this.audioWorklet = { addModule: async () => {} }; this.destination = audioNode(); }
    async resume() {} async close() {} createMediaStreamSource() { return audioNode(); } createGain() { return audioNode(); }
  }
  class Worklet {
    constructor() { this.port = { onmessage: null, postMessage: () => queueMicrotask(() => this.port.onmessage?.({ data: { type: 'flushed' } })) }; }
    connect(next) { return next; } disconnect() {}
  }
  const chrome = {
    runtime: { id: 'ivrit-test', getURL: (file) => `chrome-extension://ivrit-test/${file}`,
      onMessage: { addListener: (fn) => listeners.messages.push(fn) },
      sendMessage: async (message) => { calls.messages.push(message); return { accepted }; } },
    windows: { getCurrent: async () => ({ id: page === 'panel' ? windowId : 50 }),
      create: async (options) => { calls.windows.push(options); return { id: 50 }; },
      update: async (id, options) => { calls.focus.push({ id, ...options }); },
      remove: async (id) => { calls.removed.push(id); listeners.removed.forEach((fn) => fn(id)); },
      onRemoved: { addListener: (fn) => listeners.removed.push(fn) } },
    tabs: { getCurrent: async () => ({ id: 20, windowId: 50 }),
      remove: async (id) => calls.removed.push(`tab:${id}`),
      create: async (options) => { calls.tabs.push(options); return { id: 99, windowId: options.windowId || 10 }; } },
    sidePanel: { open: async () => {} },
    commands: { getAll: async () => shortcuts },
  };
  const cache = new Map([['ui-language', storedLanguage]]);
  const globals = {
    AbortController, Blob,
    localStorage:{getItem:key=>cache.get(key)||null,setItem:(key,value)=>cache.set(key,value),removeItem:key=>cache.delete(key)},
    console, URL, URLSearchParams, crypto: { randomUUID: () => 'test-session' }, performance,
    setTimeout, clearTimeout, queueMicrotask, setInterval: () => 1, clearInterval() {},
    document: { documentElement: {}, addEventListener: (name, fn) => { listeners.document[name] = fn; }, body: { className: '', classList: { toggle() {}, remove() {} } }, getElementById: (id) => {
      assert(elements.has(id), `Script refers to missing HTML element ${id}`); return elements.get(id);
    } },
    navigator: { platform: 'MacIntel', permissions: { query: async () => {
      if (permissionQueryFails) throw new Error('Unsupported'); return { state: permission };
    } }, mediaDevices: { getUserMedia: async () => {
      calls.audio++;
      if (micError) throw micError;
      return { getTracks: () => [track], getAudioTracks: () => [track] };
    } } },
    chrome, AudioContext: Context, AudioWorkletNode: Worklet,
    location: { search: session },
    Worker: class { constructor() { this.onmessage = null; calls.workers.push(this); } terminate() {} postMessage() {} },
    addEventListener(name, fn) { listeners.page[name] = fn; },
  };
  globals.window = globals;
  const context = vm.createContext(globals);
  for (const file of ['transcript-tools.js','file-player.js','i18n.js','microphone-access.js', `${page}.js`]) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  return { elements, calls, listeners, context,
    async click(id) { await elements.get(id).events.click(); await drain(); },
    async ready() { calls.workers[0].onmessage({ data: { type: 'ready' } }); await drain(); },
    message(message, sender = { id: 'ivrit-test', url: 'chrome-extension://ivrit-test/microphone.html?request=1' }) {
      let response; for (const fn of listeners.messages) fn(message, sender, (value) => { response = value; }); return response;
    },
  };
}
function denied(message = 'Permission denied') { const error = new Error(message); error.name = 'NotAllowedError'; return error; }

module.exports = { environment, drain };

if (require.main === module) (async () => {
  const first = environment(); await first.ready();
  assert.equal(first.context.document.documentElement.lang, 'he');
  assert.equal(first.context.document.documentElement.dir, 'rtl');
  assert(!first.elements.has('ui-language'), 'No language selector is present');
  const savedHebrew = environment({storedLanguage:'he'}); await savedHebrew.ready();
  assert.equal(first.elements.get('status').textContent, savedHebrew.elements.get('status').textContent, 'Legacy language preferences never change the Hebrew interface');
  assert.equal(first.context.IvritI18n.setLanguage, undefined);
  assert.equal(first.context.IvritI18n.t('Recognition failed. Could not start recognition.'), 'זיהוי הדיבור נכשל. לא ניתן להתחיל את זיהוי הדיבור.');
  first.elements.get('transcript').value='שלום עולם'; first.elements.get('transcript').events.input();
  assert.equal(first.elements.get('word-count').textContent, '2 מילים');
  console.log('PASS: Hebrew-only interface ignores saved English preferences, has no language switch, and uses RTL and Hebrew counts');
  assert.equal(first.elements.get('record-label').textContent, 'הפעלת מיקרופון');
  await first.click('record');
  assert.equal(first.calls.windows.length, 1);
  assert.equal(first.calls.windows[0].type, 'popup');
  assert.equal(new URL(first.calls.windows[0].url).searchParams.get('returnWindow'), '10');
  assert.equal(first.calls.audio, 0, 'First use opens permission setup instead of failing inside the panel');
  await first.click('record'); assert.equal(first.calls.windows.length, 1, 'No duplicate setup window');
  assert.equal(first.message({ type: 'ivrit-microphone-ready', session: 'wrong-session' }).accepted, false);
  assert.equal(first.calls.audio, 0, 'Unmatched setup message cannot begin recording');
  first.message({ type: 'ivrit-microphone-ready', session: 'test-session' }, { id: 'ivrit-test', url: 'https://example.com' });
  assert.equal(first.calls.audio, 0, 'Untrusted page cannot trigger recording');
  assert.equal(first.message({ type: 'ivrit-microphone-ready', session: 'test-session' }).accepted, true);
  await drain();
  assert.equal(first.calls.audio, 1); assert.equal(first.elements.get('record-label').textContent, 'עצירת הקלטה');
  await first.click('record'); assert.equal(first.calls.tracksStopped, 1, 'Stopping releases microphone');
  console.log('PASS: first-use popup, duplicate suppression, trusted approval, automatic recording, Stop');

  const already = environment({ permission: 'granted' }); await already.ready(); await already.click('record');
  assert.equal(already.calls.windows.length, 0); assert.equal(already.calls.audio, 1);
  await already.click('record');
  console.log('PASS: already-granted access records directly without setup');

  for (const permissionQueryFails of [false, true]) {
    const cancelled = environment({ permissionQueryFails }); await cancelled.ready(); await cancelled.click('record'); await cancelled.click('cancel-setup');
    assert.deepEqual(cancelled.calls.removed, [50]); assert.equal(cancelled.calls.audio, 0);
    assert.equal(cancelled.elements.get('cancel-setup').hidden, true);
    assert.equal(cancelled.message({ type: 'ivrit-microphone-ready', session: 'test-session' }).accepted, false);
  }
  const closed = environment(); await closed.ready(); await closed.click('record'); closed.listeners.removed[0](50); await drain();
  assert.equal(closed.elements.get('cancel-setup').hidden, true); assert.equal(closed.elements.get('record').disabled, false);
  console.log('PASS: cancellation, closed window, unsupported Permissions API, and stale approval');

  const stillBlocked = environment({ micError: denied() }); await stillBlocked.ready(); await stillBlocked.click('record');
  stillBlocked.message({ type: 'ivrit-microphone-ready', session: 'test-session' }); await drain();
  assert.equal(stillBlocked.calls.windows.length, 1, 'No automatic permission-window loop after failed handoff');
  assert.equal(stillBlocked.elements.get('grant-mic').hidden, false);
  console.log('PASS: failed recording after approval offers recovery without a popup loop');

  const helper = environment({ page: 'microphone', session: '?request=1&session=test-session&returnWindow=10' }); await drain();
  assert.equal(helper.elements.get('permission-title').textContent, 'המיקרופון מוכן');
  assert.equal(helper.calls.audio, 1); assert.equal(helper.calls.tracksStopped, 1);
  assert.equal(helper.calls.messages[0].type, 'track-stopped');
  assert.equal(helper.calls.messages[1].type, 'ivrit-microphone-ready');
  assert.equal(helper.calls.focus[0].id, 10); assert.deepEqual(helper.calls.removed, ['tab:20']);
  console.log('PASS: setup requests permission automatically, releases its track, returns to recorder, closes only itself');

  const orphan = environment({ page: 'microphone', session: '?request=1&session=stale', accepted: false }); await drain();
  assert.equal(orphan.elements.get('return').hidden, false); assert.equal(orphan.calls.removed.length, 0);
  const manual = environment({ page: 'microphone' }); await drain(); assert.equal(manual.calls.audio, 0); await manual.click('enable'); assert.equal(manual.calls.audio, 1);
  console.log('PASS: closed recorder leaves a usable success screen; manual setup never requests access on page load');

  const blocked = environment({ page: 'microphone', permission: 'denied', micError: denied(), session: '?request=1&session=x&returnWindow=10' }); await drain();
  assert.equal(blocked.elements.get('permission-card').dataset.state, 'blocked'); assert.equal(blocked.elements.get('permission-title').textContent, 'הגישה למיקרופון חסומה'); assert.equal(blocked.elements.get('enable').textContent, 'ניסיון נוסף'); assert.equal(blocked.elements.get('settings').hidden, false);
  await blocked.click('settings'); assert.equal(blocked.calls.tabs[0].url, 'chrome://settings/content/microphone');
  assert.equal(blocked.calls.tabs[0].windowId, 10); assert.equal(blocked.calls.removed.length, 0);
  const system = environment({ page: 'microphone', micError: denied('Permission denied by system'), session: '?request=1&session=x' }); await drain();
  assert.equal(system.elements.get('permission-card').dataset.state, 'system'); assert.equal(system.elements.get('system-help').open, true);
  const dismissed = environment({ page: 'microphone', permission: 'prompt', micError: denied(), session: '?request=1&session=x' }); await drain();
  assert.equal(dismissed.elements.get('permission-card').dataset.state, 'dismissed'); assert.equal(dismissed.elements.get('enable').disabled, false);
  const noDevice = new Error('No device'); noDevice.name = 'NotFoundError';
  const missing = environment({ page: 'microphone', micError: noDevice, session: '?request=1&session=x' }); await drain();
  assert.equal(missing.elements.get('permission-card').dataset.state, 'missing'); assert.equal(missing.elements.get('settings').hidden, true);
  console.log('PASS: Chrome block, OS block, dismissed prompt, and missing microphone have distinct recovery paths');
  console.log('All microphone-flow checks passed. No physical microphone was accessed.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
