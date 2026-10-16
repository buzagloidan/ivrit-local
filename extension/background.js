chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId }).catch(console.warn);
});

chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (sender.id !== chrome.runtime.id || sender.url !== chrome.runtime.getURL('panel.html')) return;
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
