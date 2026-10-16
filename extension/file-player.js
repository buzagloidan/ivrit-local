/* The browser decodes files incrementally. Never decode an entire upload into PCM. */
(function(root) {
  async function open(file, signal) {
    if (!file || file.size > IvritTranscript.MAX_FILE_BYTES) throw new Error('Choose an audio file smaller than 64 MB.');
    if (!file.size) throw new Error('This audio file is empty.');
    const url = URL.createObjectURL(file), element = new Audio();
    let closed = false;
    const close = () => { if (closed) return; closed = true; element.pause(); element.removeAttribute('src'); element.load(); URL.revokeObjectURL(url); };
    element.preload = 'metadata';
    try {
      await new Promise((resolve,reject) => {
        const cleanup = () => { clearTimeout(timer); signal?.removeEventListener('abort',abort); element.onloadedmetadata = element.onerror = null; };
        const abort = () => { cleanup(); reject(new DOMException('Cancelled','AbortError')); };
        const timer = setTimeout(() => { cleanup(); reject(new Error('The audio file did not load. Try another file.')); },10000);
        element.onloadedmetadata = () => { cleanup(); resolve(); };
        element.onerror = () => { cleanup(); reject(new Error('Chrome could not decode this audio file. Try WAV, MP3, or M4A.')); };
        signal?.addEventListener('abort',abort,{once:true});
        if (signal?.aborted) return abort();
        element.src = url;
      });
      if (closed || signal?.aborted) throw new DOMException('Cancelled','AbortError');
      if (!Number.isFinite(element.duration) || element.duration <= 0 || element.duration > IvritTranscript.MAX_SECONDS) throw new Error('Choose a finite audio file no longer than 60 minutes.');
      return {element,close};
    } catch(error) { close(); throw error; }
  }
  root.IvritFilePlayer = {open};
})(globalThis);
