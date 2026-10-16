# Chrome Web Store submission worksheet — 0.2.2

Copy-ready Hebrew listing: [STORE_LISTING_HE.md](STORE_LISTING_HE.md).

Status: not submitted. Browser automation cannot script the Chrome extensions gallery,
including the current developer dashboard. Upload and final submission require the maintainer.

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
2. Choose an audio file, or enable microphone access and speak a short Hebrew sentence.
3. Download TXT. No login, API key, model download or server is required.
4. Select Browser tab audio; share a public Hebrew audio/video tab with audio enabled.
5. On a normal test webpage, choose Insert and click a visible text field. Exercise Undo.
6. Check Privacy & recovery and the public policy. Recovery is off by default.
7. Repeat microphone or file recognition with the network disabled after installation.

Do not submit until docs/ACCEPTANCE.md is completed for the release candidate. Supply accurate
store images from the final installed extension, language/quality limits, developer contact,
and verified publisher account information. The current package is a beta, not store-approved.

## Graphic assets and dashboard handoff

The store requires a 128×128 icon, a screenshot, and a 440×280 small promotional image.
Prepare a 1280×800 screenshot of the current UI. A promotional video and marquee image
are optional. Any preview capture must be identified as such in the preparation notes;
it does not establish installed-extension acceptance. Do not use screenshots of the older
interface with subtitle export, the sample button, or the language selector.

For the remote-code question, select No: model files, JS, and WASM are bundled. Describe
local audio/text processing and optional recovery even though nothing is sent to us.
The dashboard’s actual data-category labels and certifications must be reviewed there;
this worksheet does not certify unspecified checkboxes or agree to legal terms for you.

Official references checked on 16 October 2026:
- https://developer.chrome.com/docs/webstore/publish
- https://developer.chrome.com/docs/webstore/images
- https://developer.chrome.com/docs/webstore/cws-dashboard-privacy

## Prepared store kit

`store-kit/` contains Hebrew listing fields, English reviewer/privacy/permission copy,
two 1280×800 screenshots of the actual local preview in a marketing frame, a 440×280
promotional tile, an optional 1400×560 banner, and a padded 128×128 PNG store icon.
The screenshots do not certify installed-extension behavior; provenance and outstanding
acceptance checks are documented in `store-kit/README.md`.

Build the full handoff archive with `python3 scripts/package_store_kit.py` after
`python3 scripts/package.py`. The output includes the existing extension ZIP under `package/`.
Upload that nested package as the extension, not the whole store-kit archive.
