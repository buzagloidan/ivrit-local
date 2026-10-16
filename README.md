# Ivrit Local · עברית מקומית

Offline Hebrew speech recognition for desktop Chrome. Microphone, browser-tab audio,
and audio-file transcription run on your device using a bundled 66M-parameter Zipformer
model and sherpa-onnx WebAssembly. No account, API key, backend, analytics or model download
after installation.

**0.2.1 beta:** security-hardened development release. Not submitted to or approved by the
Chrome Web Store. Actual macOS/Windows Chrome acceptance gates are tracked in
[docs/ACCEPTANCE.md](docs/ACCEPTANCE.md); previews and unit tests do not replace them.

## Install

Download the self-contained extension ZIP from [Releases](https://github.com/buzagloidan/ivrit-local/releases),
extract it, open `chrome://extensions`, enable Developer mode and choose **Load unpacked**.
Select the extracted directory containing `manifest.json`. Existing installations can reload
from that page after replacing their extracted files.

Alternatively build from source below. The installed extension never needs Python or Node.

## Use

- Open Ivrit Local from Chrome's toolbar. Wait for its packaged model to load.
- **Microphone:** enable microphone access and speak Hebrew. Initial setup opens a permission
  window. Denial/cancellation leaves the recorder usable; permissions are never bypassed.
- **Browser tab audio:** choose the tab playing YouTube or another Hebrew video/audio source.
  Enable **Share tab audio** in Chrome's picker, then Share. No microphone is mixed in; local
  playback remains enabled. Chrome supplies an unused video track, whose frames are disabled
  and never read, recorded, or uploaded. Stop sharing or Stop recording finishes the text.
- **Audio file:** choose a supported WAV/MP3/M4A/etc. file up to **64 MB and 60 minutes**.
  Files are streamed at playback speed, silently, to avoid full-file PCM allocations. You can
  stop at any time. This prioritizes bounded memory over the old full-buffer fast import path.
- **Try a sample:** a short CC0 Hebrew greeting is included and works offline.
- Edit or Copy the transcript, download TXT, or export recognizer-timed SRT/VTT. Editing text
  invalidates caption timing. Review timing, names and numbers before publishing.
- **Insert:** uses Chrome's temporary active-tab access first. If unavailable, explicitly allow
  a named site or opt into all websites. Then click a visible editable field, or focus one and
  press Enter. It never submits forms, inserts executable HTML, or accepts scripted clicks.
  Basic inputs, textareas and contenteditable are supported; special editors/frames may need Copy.
- **Undo insertion:** restores the most recent insertion when it is safe. It expires after five
  minutes and refuses to overwrite newer changes. Escape/Cancel disarms pending placement.
- The interface is Hebrew only, with right-to-left layout. Chrome’s own dialogs follow your browser language; technical diagnostics may retain their original wording.
- Recovery is **off by default**. Privacy & recovery can keep one local draft for up to seven
  days, never Chrome Sync. Delete/disable it there. Download your work before closing otherwise.
- Revoke saved site grants in Privacy & recovery or Chrome's extension settings. Upgrading from
  the old blanket-access build removes that old grant once; new all-site access is explicit.

Chrome-owned pages, local files, protected content and complex editors may limit capture or
insertion. The current shortcut is Cmd+Shift+Y / Ctrl+Shift+Y; configure conflicts at
`chrome://extensions/shortcuts`. Capturing other people's audio requires appropriate permission.

## Privacy and security

[Privacy policy](PRIVACY.md) · [Security and private reporting](SECURITY.md)

Recognition stays local. Copy/export/insertion are user-directed transfers: the clipboard,
files and destination website then have their own handling. The extension CSP blocks external
connections and remote code; local blob media is permitted for selected files. No secret keys
or cloud service are needed. Opt-in local storage is ordinary profile storage, not an encrypted
vault. Incognito operation is disabled to avoid mixing recovery state with private browsing.
The recognizer reserves a **512 MiB WASM heap**; the ~86 MB download footprint is not its
RAM requirement. Each recognition session is capped at 60 minutes and text at 200,000 characters.
Performance/accuracy vary by device and speech; English recognition is limited. Word output
uses 1.28-second model chunks and is not instantaneous. Endpoints periodically reset ASR state.

## Build from source

Requirements: Python 3.11+ and Node 22+ for development/tests. FFmpeg is needed only for the
WASM/audio endurance tests, not for the extension. No npm dependencies are required.

```sh
git clone https://github.com/buzagloidan/ivrit-local.git
cd ivrit-local
python3 scripts/fetch_assets.py
npm test
npm run test:wasm
python3 scripts/package.py
```

Use `extension/` with Load unpacked, or extract `dist/ivrit-local-0.2.1.zip`. Large model/WASM
assets are excluded from Git and fetched from pinned official sources; SHA-256 verification
is mandatory. `assets-lock.json` records exact URLs/digests. The final ZIP includes everything,
so users do not fetch a model on first use. `extension/BUNDLED_ASSETS.json` inventories each build.

For a local preview:

```sh
python3 scripts/preview.py
```

Open `http://127.0.0.1:8766/extension/panel.html`. Preview insertion needs the installed extension;
other functionality uses the same production modules and CSP. Browser fixtures:

- `/tests/insertion.html`: synthetic-event attacks plus real-input insertion/Undo checks.
- `/tests/audio-pipeline.html`: real 48 kHz stereo MediaStream → 16 kHz AudioWorklet → model.

```sh
npm test
npm run test:wasm
npm run test:endurance              # 30 minutes of simulated audio, faster than real time
ENDURANCE_SECONDS=3600 npm run test:endurance  # optional 60-minute run
```

Use `FFMPEG=/path/to/ffmpeg` if FFmpeg is not on PATH. CI checks Linux/Windows unit flows and
Linux WASM recognition. Native Chrome permissions/capture still require the acceptance matrix.
See [TEST_RESULTS.md](TEST_RESULTS.md) for measured evidence and remaining limits.

The generated runtime loader removes the upstream English example preloader. To reproduce it,
download the official pinned archive in the notices and run
`python3 scripts/vendor_runtime.py /path/to/archive.tar.bz2`; the archive digest is verified.

## License and contributing

Our code: [MIT](LICENSE). Model: **CC BY 4.0**; runtime: Apache-2.0/MIT/BSD and associated notices;
demo: **CC0**. These assets keep their own licenses. See
[third-party notices](extension/THIRD_PARTY_NOTICES.md) and [demo provenance](extension/demo/SOURCE.json).

[Contributing](CONTRIBUTING.md) · [Store preparation](docs/STORE_SUBMISSION.md)

Vocabulary hints, improved punctuation, richer transcript management and broader editor
support are possible follow-ups. Speaker identification, translation and cloud summarization
are separate capabilities and are not claimed by this release.
