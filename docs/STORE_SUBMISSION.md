# Chrome Web Store submission worksheet

Single purpose: On-device Hebrew speech transcription from a microphone, explicitly shared
browser tab, or user-selected audio file, with user-directed export/recovery/insertion.

Privacy policy URL: https://github.com/buzagloidan/ivrit-local/blob/main/PRIVACY.md
Support/source: https://github.com/buzagloidan/ivrit-local

## Permission justifications

- sidePanel: hosts the recorder and transcript while the user browses.
- activeTab: temporary access when the user invokes the toolbar action; preferred for Insert.
- scripting: inject the placement guide only when the user chooses Insert. No automatic page scan.
- clipboardWrite: Copy text only on a user click.
- optional HTTP/HTTPS hosts: per-site persistent insertion access, or an explicit all-sites opt-in.
  Optional declarations are broad enough to support user-chosen domains, but requests default
  to one named site. The panel includes revocation and Copy works without granting site access.

## Data declaration preparation

Read current dashboard definitions when submitting. The extension handles user-provided audio,
transcripts/caption timing and selected form-field contents locally. The developer receives none
of these. Local handling must still be described. Explain opt-in local retention, clipboard,
exports, insertion into third-party websites, and the unused video track supplied by Chrome.
No advertising, sales, analytics, backend, cloud processing, or unrelated browsing collection.
The manifest permits only self-origin connections and local blob media, with bundled JS/WASM.

## Reviewer instructions

1. Open the side panel from the toolbar. Wait for the packaged model to load.
2. Choose Try a sample: a CC0 recording of “שלום” is processed locally.
3. Download TXT/SRT/VTT. No login, API key, model download or server is required.
4. Select Browser tab audio; share a public Hebrew audio/video tab with audio enabled.
5. On a normal test webpage, choose Insert and click a visible text field. Exercise Undo.
6. Check Privacy & recovery and the public policy. Recovery is off by default.
7. Repeat sample recognition with the network disabled after installation.

Do not submit until docs/ACCEPTANCE.md is completed for the release candidate. Supply accurate
store images from the final installed extension, language/quality limits, developer contact,
and verified publisher account information. The current package is a beta, not store-approved.
