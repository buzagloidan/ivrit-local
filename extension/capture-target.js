(() => {
  if (globalThis.__ivritLocalTarget) return;
  globalThis.__ivritLocalTarget = true;
  let picker = null, undo = null, undoTimer;
  function clearUndo() { clearTimeout(undoTimer); undo = null; }
  function visible(element) {
    if (!valid(element) || !element.isConnected) return false;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility === "visible" && Number(style.opacity) > 0 && element.getClientRects().length > 0;
  }

  const valid = (element) => element instanceof HTMLElement && !element.closest('[inert]') && (
    ((element instanceof HTMLInputElement && ['text', 'search', 'email', 'url', 'tel'].includes(element.type)) ||
      element instanceof HTMLTextAreaElement) ? !element.disabled && !element.readOnly : element.isContentEditable
  );
  function targetFor(event) {
    for (const node of event.composedPath()) {
      if (!(node instanceof HTMLElement)) continue;
      if (node.getAttribute('contenteditable') === 'false' || node.hasAttribute('inert')) return null;
      // Do not traverse past protected controls into an editable ancestor.
      if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) return valid(node) ? node : null;
      if (node.isContentEditable) {
        let root = node;
        while (root.parentElement?.isContentEditable) root = root.parentElement;
        return valid(root) ? root : null;
      }
    }
    return null;
  }
  function insert(element, text, session) {
    if (!visible(element)) throw new Error('This field is no longer visible or editable. Choose another field.');
    clearUndo();
    if ('value' in element) {
      const start = element.selectionStart ?? element.value.length;
      const end = element.selectionEnd ?? start;
      const before = element.value;
      const after = before.slice(0, start) + text + before.slice(end);
      if (element.maxLength >= 0 && after.length > element.maxLength) throw new Error('The transcript is too long for this field.');
      const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
      element.focus(); setter.call(element, after);
      try { element.setSelectionRange(start + text.length, start + text.length); } catch {}
      element.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText', data: text }));
      undo = { session, element, before, after, setter, start, end };
    } else {
      element.focus();
      const selection = element.getRootNode().getSelection?.() || window.getSelection();
      if (!selection?.rangeCount || !element.contains(selection.anchorNode) || !element.contains(selection.focusNode)) {
        const range = document.createRange(); range.selectNodeContents(element); range.collapse(false);
        selection.removeAllRanges(); selection.addRange(range);
      }
      const range = selection.getRangeAt(0);
      const original = range.extractContents();
      const node = document.createTextNode(text); range.insertNode(node);
      range.setStartAfter(node); range.collapse(true); selection.removeAllRanges(); selection.addRange(range);
      element.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText', data: text }));
      undo = { session, element, node, original, text };
    }
    undoTimer = setTimeout(clearUndo, 300000);
  }
  function undoInsert(session) {
    if (!undo || session !== undo.session || !visible(undo.element)) throw new Error('This insertion can no longer be undone.');
    const previous = undo, element = previous.element;
    if ('before' in previous) {
      if (element.value !== previous.after) throw new Error('The field has changed. Undo was skipped to protect newer edits.');
      previous.setter.call(element, previous.before);
      element.focus();
      try { element.setSelectionRange(previous.start, previous.end); } catch {}
    } else {
      if (!element.contains(previous.node) || previous.node.data !== previous.text) throw new Error('The field has changed. Undo was skipped to protect newer edits.');
      previous.node.replaceWith(previous.original);
    }
    clearUndo();
    element.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'historyUndo', data: null }));
  }
  function stop(result) {
    if (!picker) return;
    const previous = picker;
    picker = null;
    clearTimeout(previous.timeout);
    previous.host.remove();
    document.removeEventListener('pointermove', hover, true);
    document.removeEventListener('click', choose, true);
    document.removeEventListener('keydown', keydown, true);
    window.removeEventListener('pagehide', navigating);
    window.removeEventListener('blur', leaving);
    if (result) chrome.runtime.sendMessage({ type: 'ivrit-insertion-result', session: previous.session, ...result }).catch(() => {});
  }
  function keydown(event) {
    if (!event.isTrusted) return;
    if (event.key === 'Enter' && targetFor(event)) { event.preventDefault(); event.stopPropagation(); choose(event); return; }
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); stop({ ok: false }); }
  }
  function navigating() { stop({ ok: false }); clearUndo(); }
  // Changing tabs or returning to the panel disarms the destination, rather than
  // leaving text waiting for an unrelated click later.
  function leaving() { stop({ ok: false }); }
  function hover(event) {
    if (!picker) return;
    const element = targetFor(event);
    picker.ring.hidden = !element;
    if (!element) return;
    const bounds = element.getBoundingClientRect();
    for (const [name, value] of Object.entries({ left: bounds.left - 3, top: bounds.top - 3, width: bounds.width + 6, height: bounds.height + 6 })) {
      picker.ring.style[name] = `${value}px`;
    }
  }
  function choose(event) {
    if (!event.isTrusted || !picker || event.composedPath().includes(picker.host)) return;
    const element = targetFor(event);
    if (!element || !visible(element)) return;
    const current = picker;
    // Let the page establish its caret and selection before inserting.
    setTimeout(() => {
      if (picker !== current) return;
      try { insert(element, current.text, current.session); stop({ ok: true, undo: true }); }
      catch (error) { stop({ ok: false, error: error.message }); }
    }, 0);
  }
  function start(message) {
    stop();
    const host = document.createElement('div');
    host.dataset.ivritPicker = '';
    const root = host.attachShadow({ mode: 'closed' });
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(`
      :host { all: initial !important; position: fixed !important; inset: 0 !important; z-index: 2147483647 !important; pointer-events: none !important; }
      .banner { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); max-width: calc(100vw - 48px); box-sizing: border-box; display: flex; align-items: center; gap: 18px; padding: 14px 18px; border-radius: 14px; background: #163c32; color: #fff; box-shadow: 0 8px 32px #0003; font: 14px/1.5 system-ui, sans-serif; direction: ltr; pointer-events: auto; }
      strong { display: block; font-weight: 650; } small { color: #d2e5db; font-size: 12px; }
      button { color: #fff; background: #ffffff18; border: 1px solid #ffffff60; border-radius: 8px; padding: 7px 10px; cursor: pointer; font: inherit; }
      button:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }
      .ring { position: fixed; box-sizing: border-box; border: 2px solid #2b9270; border-radius: 6px; background: #2b92700c; pointer-events: none; }
      [hidden] { display: none !important; }
    `);
    root.adoptedStyleSheets = [sheet];
    const banner = document.createElement('div'); banner.className = 'banner'; banner.setAttribute('role', 'status');
    const copy = document.createElement('div');
    const title = document.createElement('strong'); title.textContent = 'Click where to insert your text';
    const hint = document.createElement('small'); hint.textContent = 'Ivrit Local · Choose a text field on this page';
    copy.append(title, hint);
    const cancel = document.createElement('button'); cancel.textContent = 'Cancel'; cancel.type = 'button';
    cancel.addEventListener('click', () => stop({ ok: false }));
    banner.append(copy, cancel);
    const ring = document.createElement('div'); ring.className = 'ring'; ring.hidden = true;
    root.append(banner, ring);
    picker = { host, ring, session: message.session, text: message.text };
    document.documentElement.append(host);
    document.addEventListener('pointermove', hover, true);
    document.addEventListener('click', choose, true);
    document.addEventListener('keydown', keydown, true);
    window.addEventListener('pagehide', navigating);
    window.addEventListener('blur', leaving);
    picker.timeout = setTimeout(() => stop({ ok: false, error: 'Insertion timed out. Click Insert to choose a field again.' }), 120000);
  }
  chrome.runtime.onMessage.addListener((message, sender, reply) => {
    if (sender.id !== chrome.runtime.id) return;
    if (message.type === 'ivrit-undo-insertion') {
      try { undoInsert(message.session); reply({ ok: true }); }
      catch (error) { reply({ ok: false, error: error.message }); }
      return;
    }
    if (message.type === 'ivrit-cancel-insertion') {
      if (message.session === picker?.session) stop();
      reply({ ok: true });
    }
    if (message.type === 'ivrit-pick-target') {
      if (typeof message.text !== 'string' || !message.text.trim() || message.text.length > 200000 || typeof message.session !== 'string') {
        reply({ ok: false, error: 'There is no text to insert.' }); return;
      }
      try { start(message); reply({ ok: true }); }
      catch { stop(); reply({ ok: false, error: 'This page does not support insertion. Try Copy text.' }); }
    }
  });
})();
