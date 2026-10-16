const controls = Object.fromEntries(['permission-card','permission-step','permission-title','message','resume-hint','enable','settings','return','system-help','system-instructions','cancel'].map((id) => [id, document.getElementById(id)]));
const query = new URLSearchParams(location.search);
const isExtension = Boolean(globalThis.chrome?.runtime?.id);
const session = query.get('session');
const returnWindow = /^\d+$/.test(query.get('returnWindow') || '') ? Number(query.get('returnWindow')) : null;
let pending = false, enabled = false;

function show(kind, title, message, button) {
  controls['permission-card'].dataset.state = kind;
  controls['permission-title'].textContent = title;
  controls.message.textContent = message;
  controls['permission-step'].textContent = kind === 'ready' ? 'ALL SET' : kind === 'pending' ? 'CHECK THE CHROME PROMPT' : 'MICROPHONE ACCESS';
  controls.enable.textContent = button;
  controls.enable.disabled = kind === 'pending';
}
async function closeSetup() {
  if (isExtension) {
    const tab = await chrome.tabs.getCurrent();
    if (tab?.id) await chrome.tabs.remove(tab.id);
  } else window.close();
}
async function focusRecorder() {
  if (isExtension && returnWindow !== null) {
    try { await chrome.windows.update(returnWindow, { focused: true }); } catch {}
  }
}
async function complete() {
  enabled = true;
  controls.enable.hidden = true; controls.settings.hidden = true;
  controls['system-help'].hidden = true; controls['resume-hint'].hidden = true;
  controls.return.hidden = false;
  controls.return.textContent = returnWindow === null ? 'Close setup' : 'Return to recorder';
  show('ready', 'Your microphone is ready', 'Access is enabled. Your audio will be processed on this device.', 'Microphone enabled');
  if (isExtension && session) {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'ivrit-microphone-ready', session });
      if (response?.accepted) {
        await focusRecorder();
        await closeSetup();
      } else controls.message.textContent = 'Access is enabled. Return to Ivrit Local and choose Start recording.';
    } catch { controls.message.textContent = 'Access is enabled. Return to Ivrit Local and choose Start recording.'; }
  }
}
async function requestMicrophone() {
  if (pending || enabled) return;
  pending = true;
  controls.settings.hidden = true; controls['system-help'].hidden = true;
  show('pending', 'Choose Allow in Chrome', 'Chrome may show its microphone permission prompt near the address bar. Choose Allow to continue.', 'Waiting for Chrome…');
  try {
    const media = await navigator.mediaDevices.getUserMedia({ audio: true });
    // This window grants permission only. It does not listen to or store samples.
    media.getTracks().forEach((track) => track.stop());
    await complete();
  } catch (error) {
    const recovery = IvritMicrophoneAccess.issue(error, await IvritMicrophoneAccess.state());
    show(recovery.kind, recovery.title, recovery.message, recovery.button);
    controls.settings.hidden = !isExtension || !recovery.settings;
    controls['system-help'].hidden = !recovery.settings;
    controls['system-help'].open = recovery.kind === 'system';
    controls['resume-hint'].hidden = true;
  } finally { pending = false; }
}
controls.enable.addEventListener('click', requestMicrophone);
controls.cancel.addEventListener('click', closeSetup);
controls.settings.addEventListener('click', async () => {
  const options = { url: 'chrome://settings/content/microphone', active: true };
  if (returnWindow !== null) options.windowId = returnWindow;
  try {
    const tab = await chrome.tabs.create(options);
    if (tab.windowId) await chrome.windows.update(tab.windowId, { focused: true });
  } catch {
    controls.message.textContent = 'Open chrome://settings/content/microphone in Chrome, allow Ivrit Local, then return here and choose Try again.';
  }
});
controls.return.addEventListener('click', async () => {
  if (!isExtension) return;
  if (returnWindow === null) return closeSetup();
  const opened = chrome.sidePanel.open({ windowId: returnWindow });
  try { await opened; await focusRecorder(); await closeSetup(); }
  catch { controls.message.textContent = 'Close this window and open Ivrit Local from its toolbar icon. Microphone access is enabled.'; }
});
const platform = navigator.userAgentData?.platform || navigator.platform || '';
controls['system-instructions'].textContent = /mac/i.test(platform)
  ? 'macOS: System Settings → Privacy & Security → Microphone → enable Google Chrome. Then return here and choose Try again.'
  : /win/i.test(platform)
    ? 'Windows: Settings → Privacy & security → Microphone. Enable microphone access and allow desktop apps, including Google Chrome.'
    : 'Open your computer’s microphone privacy settings and allow Google Chrome to use your microphone.';
if (isExtension && query.get('request') === '1' && session) {
  controls['resume-hint'].hidden = false;
  requestMicrophone();
}
