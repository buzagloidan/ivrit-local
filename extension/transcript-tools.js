/* Pure transcript/export utilities. No network or browser permissions. */
(function(root) {
  const MAX_TEXT = 200000, MAX_SECONDS = 3600, MAX_FILE_BYTES = 64 * 1024 * 1024;
  function stamp(seconds, separator) {
    const ms = Math.max(0, Math.round(seconds * 1000));
    return `${String(Math.floor(ms / 3600000)).padStart(2,'0')}:${String(Math.floor(ms / 60000) % 60).padStart(2,'0')}:${String(Math.floor(ms / 1000) % 60).padStart(2,'0')}${separator}${String(ms % 1000).padStart(3,'0')}`;
  }
  function validCues(cues) {
    let previous = 0;
    return (Array.isArray(cues) ? cues : []).slice(0,10000).filter(cue => {
      if (!cue || typeof cue.text !== 'string' || !cue.text.trim() || !Number.isFinite(cue.start) || !Number.isFinite(cue.end) || cue.start < previous || cue.end <= cue.start || cue.end > 86400) return false;
      previous = cue.end; return true;
    }).map(cue => ({start:cue.start,end:cue.end,text:cue.text.slice(0,MAX_TEXT).replace(/[\r\n]+/g,' ')}));
  }
  function captions(cues, format) {
    const rows = validCues(cues);
    return (format === 'vtt' ? 'WEBVTT\n\n' : '') + rows.map((cue,index) => `${format === 'srt' ? `${index+1}\n` : ''}${stamp(cue.start,format === 'srt' ? ',' : '.')} --> ${stamp(cue.end,format === 'srt' ? ',' : '.')}\n${cue.text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}\n`).join('\n');
  }
  function readDraft(storage, now = Date.now()) {
    try {
      if (storage.getItem('save-draft') !== 'true') { storage.removeItem('draft'); return null; }
      const draft = JSON.parse(storage.getItem('draft') || 'null');
      if (!draft || !Number.isFinite(draft.updated) || draft.updated > now || now - draft.updated > 7*86400000 || typeof draft.text !== 'string' || draft.text.length > MAX_TEXT) { storage.removeItem('draft'); return null; }
      return {text:draft.text,cues:validCues(draft.cues)};
    } catch { return null; }
  }
  function saveDraft(storage, text, cues, now = Date.now()) {
    if (storage.getItem('save-draft') !== 'true') { storage.removeItem('draft'); return; }
    const record = JSON.stringify({text:text.slice(0,MAX_TEXT),cues:validCues(cues),updated:now});
    if (record.length > 1000000) throw new Error('Draft exceeds the local recovery limit. Download your transcript.');
    storage.setItem('draft',record);
  }
  const api = {MAX_TEXT,MAX_SECONDS,MAX_FILE_BYTES,stamp,validCues,captions,readDraft,saveDraft};
  root.IvritTranscript = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
