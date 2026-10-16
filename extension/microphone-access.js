/* Shared permission state and recovery copy. This never requests access itself. */
(() => {
  async function state(navigatorApi = globalThis.navigator) {
    try { return (await navigatorApi.permissions.query({ name: 'microphone' })).state; }
    catch { return 'unknown'; }
  }
  function issue(error, permission = 'unknown') {
    if (error.name === 'NotFoundError') return {
      kind: 'missing', title: 'No microphone found', button: 'Check again',
      message: 'Connect a microphone or headset, then try again. You can also transcribe an audio file from the side panel.',
      settings: false,
    };
    if (error.name === 'NotReadableError' || error.name === 'AbortError') return {
      kind: 'busy', title: 'Your microphone could not open', button: 'Try again',
      message: 'Close other apps that might be using your microphone, check its connection, then try again.',
      settings: false,
    };
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
      if (/system|operating|OS denied/i.test(error.message || '')) return {
        kind: 'system', title: 'Allow Chrome to use your microphone', button: 'Try again',
        message: 'Your computer is blocking microphone access for Google Chrome. Enable Chrome in your system’s microphone privacy settings, then try again.',
        settings: true,
      };
      if (permission === 'denied') return {
        kind: 'blocked', title: 'Microphone access is blocked', button: 'Try again',
        message: 'Open Chrome’s microphone settings and allow Ivrit Local. If Chrome is blocked by your computer, enable it in your system’s microphone privacy settings too.',
        settings: true,
      };
      return {
        kind: 'dismissed', title: 'Let’s enable your microphone', button: 'Show permission prompt',
        message: 'The permission request was not approved. Try again and choose Allow in Chrome’s microphone prompt.',
        settings: true,
      };
    }
    return {
      kind: 'error', title: 'Let’s try that again', button: 'Try again',
      message: error.message || 'Chrome could not open the microphone. Try again, or choose an audio file in the side panel.',
      settings: false,
    };
  }
  const api = { state, issue };
  globalThis.IvritMicrophoneAccess = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
