chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId }).catch(console.warn);
});

// A short-lived intent is claimed once by the ready, visible panel in this window.
// No transcript/audio is sent to the service worker or persisted for this handoff.
const microphoneShortcuts = new Map();
let shortcutSequence = 0;
chrome.commands?.onCommand.addListener((command, tab) => {
  if (command !== 'toggle-microphone' || !Number.isInteger(tab?.windowId)) return;
  const windowId = tab.windowId;
  const previous = microphoneShortcuts.get(windowId);
  if (previous && previous.expiresAt > Date.now()) {
    microphoneShortcuts.delete(windowId);
    chrome.runtime.sendMessage({ type: 'ivrit-shortcut-cancelled', windowId }).catch(() => {});
    return;
  }
  const request = { id: `${Date.now()}-${++shortcutSequence}`, expiresAt: Date.now() + 30000, opened: false };
  microphoneShortcuts.set(windowId, request);
  // Must run in the command event's user gesture, before any await.
  chrome.sidePanel.open({ windowId }).then(() => {
    if (microphoneShortcuts.get(windowId) !== request) return;
    request.opened = true;
    return chrome.runtime.sendMessage({ type: 'ivrit-shortcut-available', windowId }).catch(() => {});
  }).catch((error) => {
    if (microphoneShortcuts.get(windowId) === request) microphoneShortcuts.delete(windowId);
    console.warn('Could not open the recorder for a keyboard shortcut.', error);
  });
});
chrome.windows?.onRemoved.addListener((windowId) => microphoneShortcuts.delete(windowId));

chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (sender.id !== chrome.runtime.id || sender.url !== chrome.runtime.getURL('panel.html')) return;
  if (['claim-microphone-shortcut', 'cancel-microphone-shortcut'].includes(message.type)) {
    if (!Number.isInteger(message.windowId)) return;
    const request = microphoneShortcuts.get(message.windowId);
    if (message.type === 'cancel-microphone-shortcut') {
      microphoneShortcuts.delete(message.windowId); reply({}); return;
    }
    if (!request) { reply({}); return; }
    if (request.expiresAt <= Date.now()) {
      microphoneShortcuts.delete(message.windowId); reply({}); return;
    }
    if (!request.opened) { reply({}); return; }
    microphoneShortcuts.delete(message.windowId);
    reply({ requestId: request.id, expiresAt: request.expiresAt });
    return;
  }
  if (!['start-insertion', 'cancel-insertion', 'undo-insertion'].includes(message.type)) return;
  (async () => {
    if (message.type !== 'start-insertion') {
      if (!Number.isInteger(message.tabId) || typeof message.session !== 'string') throw new Error('Invalid insertion request.');
      const type = message.type === 'undo-insertion' ? 'ivrit-undo-insertion' : 'ivrit-cancel-insertion';
      reply(await chrome.tabs.sendMessage(message.tabId, { type, session: message.session })); return;
    }
    if (typeof message.text !== 'string' || !message.text.trim() || message.text.length > 200000 || typeof message.session !== 'string') {
      throw new Error('The transcript is empty or exceeds 200,000 characters.');
    }
    const query = { active: true, currentWindow: true };
    if (Number.isInteger(message.windowId)) { delete query.currentWindow; query.windowId = message.windowId; }
    const [tab] = await chrome.tabs.query(query);
    if (!tab?.id || (message.tabId && tab.id !== message.tabId)) throw new Error('The active page changed. Click Insert again.');
    if (tab.url && !/^https?:\/\//.test(tab.url)) throw new Error('Open a regular website to insert text.');
    if (tab.url) {
      const url = new URL(tab.url);
      if (url.hostname === 'chromewebstore.google.com' || (url.hostname === 'chrome.google.com' && url.pathname.startsWith('/webstore'))) throw new Error('Chrome protects the Web Store from insertion. Use Copy text on another page.');
    }
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['capture-target.js'] });
    } catch {
      reply({ ok: false, needsAccess: true, tabId: tab.id, origin: tab.url ? new URL(tab.url).origin : '' }); return;
    }
    reply({ ...await chrome.tabs.sendMessage(tab.id, { type: 'ivrit-pick-target', session: message.session, text: message.text }), tabId: tab.id });
  })().catch(error => reply({ ok: false, error: error.message }));
  return true;
});
