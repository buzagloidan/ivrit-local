const $ = (id) => document.getElementById(id);
const ui = Object.fromEntries(['record','record-label','upload','sample','file','clear','copy','insert','transcript','status','status-label','timer','notice','word-count','metrics','level','progress','grant-mic','cancel-setup','transcript-hint','cancel-insert','audio-source','source-hint','record-mic-icon','download-txt','download-srt','download-vtt','undo-insert','insertion-access','insertion-site','insertion-all-sites','enable-insertion','save-draft','delete-draft','revoke-sites','retention-note'].map((id) => [id, $(id)]));
const inExtension = Boolean(globalThis.chrome?.runtime?.id);
let worker, ready = false, fatal = false, phase = 'loading', activeJob = 0, sequence = 0;
let prefix = '', media, context, source, capture, silent, timerInterval, flushed;
let startedAt = 0, sentSamples = 0, processedSamples = 0;
let ackWaiter = null, endedWaiter = null;
let microphoneState = 'unknown', pendingSetup = null;
let draftTimer;
let insertion = null, lastInsertion = null, cues = [], prefixCues = [], cueOffset = 0;
let filePlayer = null, fileAbort = null, filePaused = false;
const limits = IvritTranscript;
const t = (text) => globalThis.IvritI18n?.t(text) || text;
let recordingSource = 'microphone', lastAudioAt = 0, captureEpoch = 0;
function audioSource() { return ui['audio-source'].value === 'tab' ? 'tab' : 'microphone'; }
function listeningMessage() { return recordingSource === 'tab' ? 'Listening to your selected tab in Hebrew. Keep the video playing.' : 'Listening to your microphone in Hebrew. Press Stop when you’re done.'; }

function notice(message, error = false) {
  ui.notice.textContent = t(message); ui.notice.hidden = !message;
  ui.notice.classList.toggle('error', error);
  IvritI18n.apply();
}
function setPhase(next, message) {
  if (!['idle', 'error'].includes(next)) cancelInsertion();
  phase = next;
  document.body.className = next === 'recording' ? 'recording' : next === 'loading' ? 'loading' : next === 'error' ? 'error-state' : '';
  ui.status.textContent = t(message);
  ui['status-label'].textContent = next === 'recording' ? (recordingSource === 'tab' ? 'LISTENING TO TAB' : 'LISTENING TO MICROPHONE') : ({ loading: 'GETTING READY', idle: 'READY WHEN YOU ARE', permission: 'MICROPHONE SETUP', starting: audioSource() === 'tab' ? 'CHOOSING A TAB' : 'OPENING MICROPHONE', recording: 'LISTENING', finishing: 'FINISHING UP', file: 'TRANSCRIBING AUDIO', error: 'NEEDS ATTENTION' })[next];
  ui['record-label'].textContent = ({ loading: 'Loading model…', idle: audioSource() === 'tab' ? 'Choose tab & transcribe' : inExtension && microphoneState !== 'granted' ? 'Enable microphone' : 'Start recording', permission: 'Waiting for permission…', starting: audioSource() === 'tab' ? 'Opening tab audio…' : 'Opening microphone…', recording: 'Stop recording', finishing: 'Finishing…', file: 'Stop transcription', error: 'Reload speech engine' })[next];
  ui.record.disabled = !((ready && ['idle', 'recording', 'file'].includes(next)) || (fatal && next === 'error'));
  const idle = ready && next === 'idle';
  ui.upload.disabled = ui.sample.disabled = !idle;
  ui['audio-source'].disabled = !idle;
  ui['record-mic-icon'].hidden = audioSource() === 'tab' || next === 'file';
  ui.transcript.readOnly = !['idle', 'error'].includes(next);
  ui.level.hidden = next !== 'recording';
  ui.progress.hidden = next !== 'file';
  ui['cancel-setup'].hidden = next !== 'permission';
  ui['record-label'].textContent = t(ui['record-label'].textContent);
  ui['status-label'].textContent = t(ui['status-label'].textContent);
  updateOutput();
}
function updateOutput() {
  const text = ui.transcript.value.trim();
  const count = text ? text.split(/\s+/u).length : 0;
  ui['word-count'].textContent = `${count} ${count===1?'מילה':'מילים'}`;
  const editable = ['idle', 'error'].includes(phase);
  ui.copy.disabled = !text || !editable;
  ui.insert.disabled = !text || !editable || !inExtension || Boolean(insertion);
  ui.clear.disabled = !text || !editable;
  ui['download-txt'].disabled = !text;
  ui['download-srt'].disabled = ui['download-vtt'].disabled = !cues.length || !editable;
  scheduleDraft();
  IvritI18n.apply();
}
function resultText(text, nextCues = []) {
  cues = [...prefixCues, ...limits.validCues(nextCues).map(cue=>({...cue,start:cue.start+cueOffset,end:cue.end+cueOffset}))];
  const combined = [prefix, text].filter(Boolean).join('\n');
  if (combined.length > limits.MAX_TEXT) { worker.postMessage({type:'cancel',id:activeJob}); fail('Transcript limit reached. Download your text and clear it before continuing.'); return; }
  ui.transcript.value = combined;
  ui.transcript.scrollTop = ui.transcript.scrollHeight;
  updateOutput();
}
function elapsed(seconds) {
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
}
function setupWorker() {
  if (worker) worker.terminate();
  ready = false; fatal = false;
  setPhase('loading', 'Starting the local speech engine…');
  worker = new Worker('engine-worker.js');
  worker.onerror = (event) => fail(event.message || 'The speech engine stopped unexpectedly.', true);
  worker.onmessage = ({ data }) => {
    if (data.type === 'status') ui.status.textContent = t(data.message);
    if (data.type === 'ready') {
      ready = true;
      setPhase('idle', 'Speak Hebrew. Your audio stays right here.');
    }
    if (data.id && data.id !== activeJob) return;
    if (data.type === 'result') resultText(data.text, data.cues);
    if (data.type === 'ack') {
      processedSamples = data.samples;
      if (filePaused && filePlayer && phase === 'file' && sentSamples - processedSamples < 16000) { filePaused = false; filePlayer.element.play().catch(error=>fail(error.message)); }
      if (ackWaiter?.sequence === data.sequence) { ackWaiter.resolve(); ackWaiter = null; }
    }
    if (data.type === 'finished') {
      resultText(data.text, data.cues);
      ui.timer.textContent = elapsed(data.audioSeconds);
      if (phase === 'file') ui.metrics.textContent = `${data.audioSeconds.toFixed(1)} שניות שמע · ${data.elapsedSeconds.toFixed(1)} שניות עיבוד`;
      else ui.metrics.textContent = `${data.audioSeconds.toFixed(1)} שניות הוקלטו`;
      setPhase('idle', data.text ? 'All done. Edit, copy, or insert your text.' : 'No speech recognized. Try speaking closer to the microphone.');
      endedWaiter?.resolve(); endedWaiter = null;
    }
    if (data.type === 'error') fail(data.message, data.fatal);
  };
}
function fail(message, isFatal = false) {
  releaseAudio();
  if (isFatal) { fatal = true; ready = false; worker?.terminate(); }
  setPhase(isFatal ? 'error' : 'idle', isFatal ? 'The local speech engine needs to restart.' : 'Ready to try again.');
  notice(message, true);
  ackWaiter?.reject(new Error(message)); ackWaiter = null;
  endedWaiter?.reject(new Error(message)); endedWaiter = null;
}
function beginJob() {
  activeJob++; sequence = 0; sentSamples = 0; processedSamples = 0;
  prefix = ui.transcript.value.trim();
  prefixCues = [...cues]; cueOffset = cues.at(-1)?.end || 0;
  ui.metrics.textContent = ''; ui.timer.textContent = '00:00'; notice('');
  worker.postMessage({ type: 'start', id: activeJob });
}
function sendAudio(samples, wait = false) {
  const seq = ++sequence;
  const acknowledgment = wait ? new Promise((resolve, reject) => { ackWaiter = { sequence: seq, resolve, reject }; }) : null;
  sentSamples += samples.length;
  worker.postMessage({ type: 'audio', id: activeJob, sequence: seq, samples: samples.buffer }, [samples.buffer]);
  return acknowledgment;
}
async function requestRecording() {
  if (phase !== 'idle') return;
  if (audioSource() === 'tab') return startRecording(false, 'tab');
  setPhase('starting', 'Checking microphone access…');
  microphoneState = await IvritMicrophoneAccess.state();
  if (inExtension && microphoneState !== 'granted') return openMicrophoneSetup();
  return startRecording();
}
async function openMicrophoneSetup() {
  if (!inExtension) return startRecording();
  if (pendingSetup) {
    if (pendingSetup.windowId) chrome.windows.update(pendingSetup.windowId, { focused: true }).catch(() => {});
    return;
  }
  const request = { token: crypto.randomUUID(), windowId: null };
  pendingSetup = request;
  ui['grant-mic'].hidden = true;
  setPhase('permission', 'Choose Allow in the setup window. Recording will start here afterwards.');
  notice('');
  try {
    const originalWindow = await chrome.windows.getCurrent();
    if (pendingSetup !== request) return;
    const url = new URL(chrome.runtime.getURL('microphone.html'));
    url.searchParams.set('request', '1');
    url.searchParams.set('session', request.token);
    url.searchParams.set('returnWindow', originalWindow.id);
    const setup = await chrome.windows.create({ url: url.href, type: 'popup', width: 490, height: 680, focused: true });
    if (pendingSetup === request) request.windowId = setup.id;
    else if (setup.id && phase !== 'starting' && phase !== 'recording') chrome.windows.remove(setup.id).catch(() => {});
  } catch {
    if (pendingSetup !== request) return;
    pendingSetup = null;
    setPhase('idle', 'Ready to try again.');
    notice('Chrome could not open microphone setup. Select Set up microphone access to try again.', true);
    ui['grant-mic'].hidden = false;
  }
}
function cancelMicrophoneSetup(closeWindow = true) {
  const previous = pendingSetup; pendingSetup = null;
  if (closeWindow && previous?.windowId) chrome.windows.remove(previous.windowId).catch(() => {});
  if (phase === 'permission') {
    setPhase('idle', 'Microphone setup was closed. You can try again or choose an audio file.');
    notice('');
  }
}
if (inExtension) {
  chrome.runtime.onMessage.addListener((message, sender, reply) => {
    if (sender.id !== chrome.runtime.id || message.type !== 'ivrit-microphone-ready' ||
        !sender.url?.startsWith(chrome.runtime.getURL('microphone.html'))) return;
    if (!pendingSetup || message.session !== pendingSetup.token) { reply({ accepted: false }); return; }
    pendingSetup = null; microphoneState = 'granted';
    reply({ accepted: true });
    if (ready && phase === 'permission') startRecording(true);
  });
  chrome.windows.onRemoved.addListener((id) => {
    if (pendingSetup?.windowId === id) cancelMicrophoneSetup(false);
  });
}
IvritMicrophoneAccess.state().then((state) => {
  microphoneState = state;
  if (phase === 'idle') setPhase('idle', ui.status.textContent);
});
async function startRecording(fromSetup = false, selectedSource = 'microphone') {
  const epoch = ++captureEpoch;
  recordingSource = selectedSource;
  lastAudioAt = 0;
  ui['grant-mic'].hidden = true;
  setPhase('starting', selectedSource === 'tab' ? 'Choose the Chrome tab playing your video and turn on Share tab audio.' : 'Allow microphone access when Chrome asks.'); notice('');
  try {
    if (selectedSource === 'tab') {
      if (!navigator.mediaDevices?.getDisplayMedia) throw new Error('Tab audio capture is unavailable in this browser. Open the extension in desktop Google Chrome.');
      // Called directly from Record's click gesture, before any permission-query await.
      const acquired = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'browser' },
        audio: { suppressLocalAudioPlayback: false, echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        monitorTypeSurfaces: 'exclude', systemAudio: 'exclude',
        selfBrowserSurface: 'include', surfaceSwitching: 'exclude',
      });
      if (epoch !== captureEpoch || document.hidden) { acquired.getTracks().forEach(track=>track.stop()); return; }
      media = acquired;
      if (media.getVideoTracks()[0]?.getSettings().displaySurface !== 'browser') {
        throw new Error('Choose a Chrome tab rather than a window or screen, and enable Share tab audio.');
      }
      if (!media.getAudioTracks().length) {
        throw new Error('No tab audio was shared. Try again, choose the YouTube tab, and turn on Share tab audio before clicking Share.');
      }
      // Chrome's picker supplies a video track too. No video frames are read,
      // recorded, displayed, or sent to the recognizer. Keep it alive but disabled
      // until Stop so Chrome's shared-tab lifecycle remains intact.
      media.getVideoTracks().forEach((track) => { track.enabled = false; });
    } else {
      const acquired = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (epoch !== captureEpoch || document.hidden) { acquired.getTracks().forEach(track=>track.stop()); return; }
      media = acquired;
    }
    if (media.getAudioTracks()[0]?.readyState === 'ended') throw new Error('Audio sharing ended before transcription started. Please try again.');
    const openingContext = context = new AudioContext({ sampleRate: 16000 });
    await openingContext.audioWorklet.addModule('audio-worklet.js');
    if (epoch !== captureEpoch) return;
    await openingContext.resume();
    if (epoch !== captureEpoch) return;
    if (context.sampleRate !== 16000) throw new Error('This browser did not provide 16 kHz audio. Try uploading an audio file.');
    source = context.createMediaStreamSource(media);
    capture = new AudioWorkletNode(context, 'ivrit-capture', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] });
    silent = context.createGain(); silent.gain.value = 0;
    beginJob();
    capture.port.onmessage = ({ data }) => {
      if (data.type === 'flushed') { flushed?.(); flushed = null; return; }
      if (data.type !== 'audio' || !['recording','finishing','file'].includes(phase)) return;
      let square = 0; for (const value of data.samples) square += value * value;
      const rms = Math.sqrt(square / data.samples.length);
      ui.level.value = Math.min(1, rms * 6);
      document.body.classList.toggle('has-audio', rms > 0.003);
      if (rms > 0.003 && phase === 'recording') {
        lastAudioAt = sentSamples;
        ui.status.textContent = t(listeningMessage());
      } else if (sentSamples - lastAudioAt > 16000 * 6 && phase === 'recording') {
        ui.status.textContent = t(recordingSource === 'tab' ? 'No tab audio detected. Play the video and check its volume.' : 'No microphone audio detected. To transcribe YouTube, choose Browser tab as the audio source.');
      }
      if (sentSamples + data.samples.length > limits.MAX_SECONDS * 16000) { stopRecording(); notice('Session reached 60 minutes. Export your transcript before starting another.'); return; }
      sendAudio(data.samples);
      if (filePlayer && sentSamples - processedSamples > 32000) { filePlayer.element.pause(); filePaused = true; }
      if (sentSamples - processedSamples > 16000 * 10) {
        worker.postMessage({ type: 'cancel', id: activeJob });
        fail('This computer could not keep up with live recognition. Try an audio file instead.');
      }
    };
    source.connect(capture).connect(silent).connect(context.destination);
    setPhase('recording', listeningMessage());
    startedAt = performance.now();
    timerInterval = setInterval(() => { ui.timer.textContent = elapsed((performance.now() - startedAt) / 1000); }, 250);
    media.getTracks().forEach((track) => track.addEventListener('ended', () => { if (phase === 'recording') stopRecording(); }));
  } catch (error) {
    if (epoch !== captureEpoch) return;
    releaseAudio();
    if (selectedSource === 'tab') {
      if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
        setPhase('idle', 'Tab sharing was cancelled or blocked. Choose a tab to try again.');
        notice('Choose the Chrome tab playing your video and enable Share tab audio. Microphone access is not needed.');
      } else {
        fail(error.name === 'InvalidStateError' ? 'Click Choose tab & transcribe again to open Chrome’s sharing picker.' : error.message);
      }
      return;
    }
    microphoneState = await IvritMicrophoneAccess.state();
    if (inExtension && error.name === 'NotAllowedError' && !fromSetup) return openMicrophoneSetup();
    const recovery = IvritMicrophoneAccess.issue(error, microphoneState);
    fail(recovery.message);
    ui['grant-mic'].hidden = !inExtension;
  }
}
function releaseAudio() {
  captureEpoch++;
  clearInterval(timerInterval); timerInterval = null;
  fileAbort?.abort(); fileAbort = null;
  filePlayer?.close(); filePlayer = null; filePaused = false;
  media?.getTracks().forEach((track) => track.stop()); media = null;
  source?.disconnect(); capture?.disconnect(); silent?.disconnect();
  source = capture = silent = null;
  context?.close().catch(() => {}); context = null;
  ui.level.value = 0;
  document.body.classList.remove('has-audio');
}
async function stopRecording() {
  if (!['recording','file'].includes(phase)) return;
  if (!capture) { releaseAudio(); setPhase('idle','Transcription cancelled. Your text is still here.'); return; }
  filePlayer?.element.pause();
  setPhase('finishing', 'Finishing the last words…');
  try {
    await new Promise((resolve, reject) => {
      const deadline = setTimeout(() => reject(new Error('The audio capture did not stop cleanly. Please try again.')), 2500);
      flushed = () => { clearTimeout(deadline); resolve(); };
      capture.port.postMessage('flush');
    });
    releaseAudio();
    worker.postMessage({ type: 'finish', id: activeJob });
  } catch (error) {
    worker.postMessage({ type: 'cancel', id: activeJob });
    fail(error.message);
  }
}
async function transcribeFile(file) {
  setPhase('file', 'Opening your audio file locally…'); notice('');
  const request = fileAbort = new AbortController();
  let opened;
  try {
    opened = await IvritFilePlayer.open(file, request.signal);
    if (request !== fileAbort || request.signal.aborted) { opened.close(); return; }
    filePlayer = opened;
    const openingContext = context = new AudioContext({sampleRate:16000});
    await openingContext.audioWorklet.addModule('audio-worklet.js');
    if (request.signal.aborted) return;
    await openingContext.resume();
    if (request.signal.aborted) return releaseAudio();
    if (context.sampleRate !== 16000) throw new Error('This browser did not provide 16 kHz audio.');
    source = context.createMediaElementSource(opened.element);
    capture = new AudioWorkletNode(context,'ivrit-capture',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1]});
    silent = context.createGain(); silent.gain.value=0;
    beginJob(); ui.progress.value=0;
    capture.port.onmessage=({data})=>{
      if (data.type==='flushed') {flushed?.();flushed=null;return;}
      if (data.type!=='audio' || !['file','finishing'].includes(phase)) return;
      if (sentSamples+data.samples.length>limits.MAX_SECONDS*16000) {stopRecording();return;}
      sendAudio(data.samples);
      if (sentSamples-processedSamples>32000 && phase==='file') {opened.element.pause();filePaused=true;}
      if (sentSamples-processedSamples>160000) {worker.postMessage({type:'cancel',id:activeJob});fail('Recognition could not keep up. Your completed text is still available.');}
    };
    opened.element.ontimeupdate=()=>{
      ui.progress.value=Math.min(1,opened.element.currentTime/opened.element.duration);
      ui.timer.textContent=elapsed(opened.element.currentTime);
      if (opened.element.currentTime>limits.MAX_SECONDS || opened.element.duration>limits.MAX_SECONDS) stopRecording();
    };
    opened.element.onended=()=>setTimeout(()=>{if(phase==='file')stopRecording();},200);
    opened.element.onerror=()=>fail('The file could not be played. Your completed text is still available.');
    source.connect(capture).connect(silent).connect(context.destination);
    setPhase('file','Transcribing your file locally at playback speed to keep memory bounded.');
    await opened.element.play();
  } catch(error) {
    if (request.signal.aborted) {opened?.close();return;}
    releaseAudio(); if(!fatal)fail(error.message);
  }
}

ui.record.addEventListener('click', () => {
  if (phase === 'error' && fatal) { notice(''); setupWorker(); }
  else if (['recording','file'].includes(phase)) stopRecording();
  else if (phase === 'idle') requestRecording();
});
ui['audio-source'].addEventListener('change', () => {
  if (phase !== 'idle') return;
  ui['grant-mic'].hidden = true;
  ui['source-hint'].textContent = audioSource() === 'tab'
    ? 'Select the YouTube tab, enable Share tab audio, then click Share.'
    : 'Your voice. For YouTube, choose Browser tab audio.';
  setPhase('idle', audioSource() === 'tab' ? 'Transcribe Hebrew from YouTube, podcasts, or another browser tab.' : 'Speak Hebrew into your microphone.');
  notice('');
});
ui.upload.addEventListener('click', () => ui.file.click());
ui['grant-mic'].addEventListener('click', () => openMicrophoneSetup());
ui['cancel-setup'].addEventListener('click', () => cancelMicrophoneSetup());
ui.file.addEventListener('change', () => { const file = ui.file.files[0]; ui.file.value = ''; if (file) transcribeFile(file); });
ui.sample.addEventListener('click', async () => {
  if (phase !== 'idle') return;
  setPhase('file', 'Opening the bundled Hebrew sample…');
  try {
    const response = await fetch('demo/sample-hebrew.wav');
    if (!response.ok) throw new Error('The sample file is missing.');
    await transcribeFile(new File([await response.blob()], 'Hebrew sample.wav', { type: 'audio/wav' }));
  } catch (error) { fail(error.message); }
});
ui.transcript.addEventListener('input', () => { cues = []; ui.transcript.value = ui.transcript.value.slice(0, limits.MAX_TEXT); cancelInsertion('Transcript changed. Click Insert when you are ready.'); updateOutput(); });
ui.clear.addEventListener('click', () => { cancelInsertion(); ui.transcript.value = ''; cues = []; ui.metrics.textContent = ''; ui.timer.textContent = '00:00'; notice(''); updateOutput(); });
ui.copy.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(ui.transcript.value); notice('Copied. Paste it wherever you need it.'); }
  catch { ui.transcript.focus(); ui.transcript.select(); notice('Copy was blocked. Your text is selected—press Command/Ctrl+C.', true); }
});
function finishInsertion(message, error = false) {
  clearTimeout(insertion?.timeout);
  insertion = null;
  ui.insert.textContent = 'Insert into page ↗';
  ui['cancel-insert'].hidden = true;
  ui['insertion-access'].hidden = true;
  updateOutput();
  if (message) notice(message, error);
}
function cancelInsertion(message = '') {
  if (!insertion) return;
  const previous = insertion;
  finishInsertion(message);
  if (previous.tabId) chrome.runtime.sendMessage({ type: 'cancel-insertion', session: previous.session, tabId: previous.tabId }).catch(() => {});
}
ui['cancel-insert'].addEventListener('click', () => cancelInsertion('Insertion cancelled. Your transcript is still here.'));
async function placeTranscript(job) {
  const currentWindow = await chrome.windows.getCurrent();
  const response = await chrome.runtime.sendMessage({type:'start-insertion',session:job.session,text:ui.transcript.value,tabId:job.tabId,windowId:currentWindow.id});
  if(insertion!==job) { if(response?.tabId)chrome.runtime.sendMessage({type:'cancel-insertion',session:job.session,tabId:response.tabId}).catch(()=>{});return; }
  job.tabId=response?.tabId;
  if(response?.needsAccess) {
    ui['insertion-access'].hidden=false; ui['insertion-site'].value=response.origin||'';
    ui.insert.textContent=t('Website access needed');
    notice('Allow one website below, or explicitly enable all websites. Copy works without website access.'); return;
  }
  if(!response?.ok)return finishInsertion(response?.error||'Could not reach this page. Try Copy text.',true);
  ui['insertion-access'].hidden=true;
  ui.insert.textContent=t('Choose a text field…');
  notice('Click a visible text field on the webpage. Escape cancels. Enter inserts into a focused field without submitting.');
  job.timeout=setTimeout(()=>cancelInsertion('Insertion timed out. Try again.'),120000);
}
ui.insert.addEventListener('click',async()=>{
  if(insertion||!ui.transcript.value.trim())return;
  const job=insertion={session:crypto.randomUUID(),tabId:null};
  ui.insert.textContent=t('Choosing a destination…');ui['cancel-insert'].hidden=false;updateOutput();
  try {await placeTranscript(job);}catch{if(insertion===job)finishInsertion('Could not reach the page. Try Copy text.',true);}
});
ui['enable-insertion'].addEventListener('click',async()=>{
  const job=insertion;if(!job)return;
  try {
    let origins;
    if(ui['insertion-all-sites'].checked)origins=['https://*/*','http://*/*'];
    else {
      const url=new URL(ui['insertion-site'].value);
      if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw new Error('Enter a website address beginning with https:// or http://.');
      origins=[`${url.protocol}//${url.hostname}/*`];
    }
    const granted=await chrome.permissions.request({origins});
    if(insertion!==job)return;
    if(!granted)return notice('Website access was declined. You can still copy your text.');
    await placeTranscript(job);
  }catch(error){notice(error.message||'Website access could not be enabled.',true);}
});
ui['undo-insert'].addEventListener('click',async()=>{
  if(!lastInsertion)return;
  try {
    const response=await chrome.runtime.sendMessage({type:'undo-insertion',...lastInsertion});
    notice(response?.ok?'Insertion undone.':response?.error||'This insertion can no longer be undone.',!response?.ok);
  }catch{notice('The page changed. This insertion can no longer be undone.',true);}
  lastInsertion=null;ui['undo-insert'].hidden=true;
});
ui['revoke-sites'].addEventListener('click',async()=>{
  cancelInsertion();
  try {
    const granted=await chrome.permissions.getAll();
    const origins=(granted.origins||[]).filter(origin=>/^https?:/.test(origin));
    if(origins.length)await chrome.permissions.remove({origins});
    notice('Saved website access revoked. Temporary access ends when the tab navigates or closes.');
  }catch{notice('Open Chrome’s extension settings to revoke website access.',true);}
});
if (inExtension) {
  chrome.runtime.onMessage.addListener((message, sender) => {
    if (sender.id !== chrome.runtime.id || !sender.tab || message.type !== 'ivrit-insertion-result' || message.session !== insertion?.session) return;
    if (insertion.tabId && sender.tab.id !== insertion.tabId) return;
    if(message.ok && message.undo){lastInsertion={tabId:sender.tab.id,session:message.session};ui['undo-insert'].hidden=false;}
    finishInsertion(message.ok ? 'Text inserted. You can keep dictating or copy it elsewhere.' : message.error || 'Insertion cancelled. Your transcript is still here.', Boolean(message.error));
  });
}
window.addEventListener('pagehide', () => { persistDraft(); cancelInsertion(); releaseAudio(); worker?.terminate(); });
if (!inExtension) {
  ui['transcript-hint'].textContent = 'Browser preview: recording, files, and recognition run locally. Page insertion is available when installed as an extension.';
}
setupWorker();

function download(content,type,extension) {
  const url=URL.createObjectURL(new Blob([content],{type}));
  const link=document.createElement('a');link.href=url;link.download=`ivrit-${new Date().toISOString().slice(0,10)}.${extension}`;link.hidden=true;document.body.append(link);link.click();link.remove();
  notice('Download requested. Check your browser’s downloads.');
  setTimeout(()=>URL.revokeObjectURL(url),60000);
}
ui['download-txt'].addEventListener('click',()=>download(ui.transcript.value,'text/plain;charset=utf-8','txt'));
for(const format of ['srt','vtt'])ui[`download-${format}`].addEventListener('click',()=>download(limits.captions(cues,format),format==='vtt'?'text/vtt;charset=utf-8':'text/plain;charset=utf-8',format));
function persistDraft(){clearTimeout(draftTimer);try{limits.saveDraft(localStorage,ui.transcript.value,cues);}catch{notice('Local recovery could not be saved. Download your transcript.',true);}}
function scheduleDraft(){clearTimeout(draftTimer);draftTimer=setTimeout(persistDraft,500);}
ui['save-draft'].addEventListener('change',()=>{
  try{localStorage.setItem('save-draft',String(ui['save-draft'].checked));persistDraft();}catch{ui['save-draft'].checked=false;notice('Local recovery is unavailable. Use Download TXT.',true);}
  retentionNote();
});
function retentionNote(){ui['retention-note'].textContent=t(ui['save-draft'].checked?'Recovery is on. One local draft expires after 7 days. No audio is saved.':'Download your text before closing this panel. Recovery is off.');}
ui['delete-draft'].addEventListener('click',()=>{try{localStorage.removeItem('draft');localStorage.setItem('save-draft','false');}catch{}ui['save-draft'].checked=false;retentionNote();notice('Saved draft deleted. The current transcript is still here.');});
try{ui['save-draft'].checked=localStorage.getItem('save-draft')==='true';const restored=limits.readDraft(localStorage);if(restored){ui.transcript.value=restored.text;cues=restored.cues;notice('Recovered your local draft.');}}catch{}
retentionNote();
IvritI18n.apply();

// Upgrade migration: remove the previous build's blanket grant once. Future all-site
// access is granted only via the explicit checkbox, not silently restored.
if(inExtension && chrome.permissions?.getAll){
  try{if(localStorage.getItem('access-scope-v2')!=='true'){
    chrome.permissions.getAll().then(async granted=>{
      const origins=(granted.origins||[]).filter(origin=>['http://*/*','https://*/*','<all_urls>'].includes(origin));
      if(origins.length)await chrome.permissions.remove({origins});
      localStorage.setItem('access-scope-v2','true');
    }).catch(()=>{});
  }}catch{}
}

if(document.addEventListener)document.addEventListener('visibilitychange',()=>{
  if(!document.hidden)return;
  persistDraft();cancelInsertion();
  if(['recording','file'].includes(phase))stopRecording();
  else if(['starting','permission'].includes(phase)){cancelMicrophoneSetup();releaseAudio();setPhase('idle','Capture stopped because the panel was hidden.');}
});
