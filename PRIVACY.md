# Ivrit Local privacy policy

Effective date: 16 October 2026. Publisher: Idan Buzaglo (`buzagloidan`).

Ivrit Local converts Hebrew speech into text on your computer. It has no account,
backend, analytics, advertising, telemetry, or cloud speech service. Its speech model
and executable runtime are bundled in the installed extension. Recognition works offline.

## What the extension handles

- **Microphone mode:** audio from the microphone you permit Chrome to use.
- **Browser-tab mode:** audio from a tab you select in Chrome's sharing picker.
  Chrome also supplies a video track. The extension disables it and never reads,
  displays, records, analyzes, or uploads its frames. Sharing is requested for each session.
- **Imported files:** the audio file you explicitly select. The browser decodes it
  incrementally on your device. Imports are limited to 64 MB and 60 minutes; sessions
  and transcripts have resource limits documented in the README.
- **Transcripts and captions:** recognized text and approximate recognizer timestamps.
  You may edit, copy, export, or insert this text. Names, numbers and timing may be incorrect.
- **Preferences:** interface language and whether you enable local draft recovery.

We do not receive, sell, or use your audio or transcripts to train models. The extension
performs no background collection of browsing history, page contents, or unrelated form data.
A deliberate insertion temporarily accesses the selected field to place text and support Undo.

## Retention and deletion

Audio is processed in memory and is not saved by the extension. Stop, Chrome's Stop sharing,
or closing the panel releases capture. The browser/operating system independently manages
its media buffers; the extension does not claim secure erasure of physical memory.

Transcript recovery is **off by default**. Without recovery, transcripts and timestamps are
held in the open panel and disappear when it closes. Use Download TXT/SRT/VTT to keep a file.
Files you export and your clipboard are managed by your computer, not by this extension.

If you enable recovery, one transcript and its caption timing are stored locally in this
Chrome profile, using extension-origin local storage, never Chrome Sync. The draft has a
7-day expiry since its last save and is removed when next opened after expiry. Reopening
and editing a recovered draft can refresh that expiry. The stored draft has a size limit.
Disabling recovery or selecting Delete saved draft removes it. Clear replaces it with an
empty draft if recovery remains enabled. Uninstalling the extension removes extension storage.
Incognito operation is disabled to avoid mixing recovery state with private browsing.
No raw audio is included in a recovery draft. This is ordinary browser-profile storage,
not an encrypted vault; someone with access to the profile may access it.

Undo retains information about the last insertion in that webpage's isolated extension
context for at most five minutes. A later insertion replaces it. Navigation or closing the
tab discards that context. Undo refuses to replace newer field edits.

## Clipboard, downloads and websites

Copy writes to your system clipboard. Other applications, clipboard managers, or operating
system synchronization features may then handle it. Downloads create files you control.

Insert places text into a website only after a genuine user destination action. The site
can read or transmit the text once inserted; its privacy policy then applies. The extension
does not press Send or submit forms. Password and noneditable fields are excluded.

Insertion first uses Chrome's temporary active-tab grant. If access is unavailable, you
may grant a specific website or explicitly opt into all HTTP/HTTPS websites. All-site
access is not requested automatically. Revoke saved access in Privacy & recovery or
Chrome's extension settings. Temporary grants end according to Chrome's tab-access rules.

## Network and third parties

Extension recognition requests only packaged assets. Its security policy blocks external
connections and remote executable code. The model and runtime have their own open-source
licenses; their authors do not receive your recognition data through this extension.

Links you choose to open, including this project's GitHub pages and support pages, connect
to their respective hosting providers and are governed by those providers' privacy policies.
Do not post private recordings, transcripts, credentials, or personal information in public
GitHub issues or discussions. The extension does not automatically send support reports.

## Chrome Web Store Limited Use

Ivrit Local uses data solely to provide its disclosed on-device speech transcription,
export, optional recovery, and user-directed insertion features. Its use of information
received through Chrome APIs adheres to the Chrome Web Store User Data Policy, including
the Limited Use requirements. We do not use it for advertising, profiling, sale, or human
review. Any future change to data handling will be documented before release and will
require consent where applicable.

## Contact and updates

For general privacy questions, use the contact links on
[github.com/buzagloidan](https://github.com/buzagloidan). For a security vulnerability, use
[GitHub private vulnerability reporting](https://github.com/buzagloidan/ivrit-local/security/advisories/new).
Never include sensitive recordings in a public issue. See SECURITY.md for reporting guidance.

This policy will be updated when behavior changes. The effective date above identifies
this version. The English policy is authoritative; the extension supports a Hebrew interface.
