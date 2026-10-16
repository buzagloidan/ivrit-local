# Store readiness — 0.2.0 beta

The initial 0.1.4 review led to the changes below. Source changes are implemented; remaining
manual acceptance gates must be completed before store submission. See TEST_RESULTS.md.

| Concern | Resolution/status |
|---|---|
| Scripted insertion could disclose text | Trusted destination events required; hidden/protected fields rejected; adversarial and real-input browser checks passed. |
| Blanket host access | Temporary activeTab is preferred. Per-site grants and all-sites opt-in are explicit. Revoke control and upgrade migration remove old blanket grants. |
| Privacy disclosures | Public PRIVACY.md, generated packaged privacy.html, retention details, contact/security reporting and store worksheet. |
| Apple demo redistribution | Replaced with CC0 YaronSh/Lingua Libre greeting; provenance and original checksum bundled. |
| Resource exhaustion | Incremental media playback replaces whole-file decode. 64 MB/60-minute imports, 60-minute sessions, 200k text cap, backpressure and endpoint segmentation. |
| Lost work | TXT export, opt-in seven-day local draft, delete/disable controls, visible retention warning. |
| Undo, captions, Hebrew UI | Implemented conservative Undo, recognizer-timed SRT/VTT and Hebrew RTL interface. Edited transcripts invalidate caption exports. |
| Long-session reliability | 30-minute synthetic-audio endurance passed with bounded observed memory and no new-session leakage. |
| Supply chain / open source | MIT code; separate model/runtime/demo licenses; pinned verified asset bootstrap; release allowlist; CI and dependency inventory. |
| Native Chrome / device matrix | Production pipeline tested in desktop Chrome preview, but installed-extension permission/side-panel integration and actual Windows/low-memory hardware still require manual checks. |
| Publisher-account protection | Repository security reporting/alerts configured where supported. Store publisher 2FA requires maintainer verification; not automatically enabled or claimed. |
| Store materials / review | docs/STORE_SUBMISSION.md and acceptance worksheet prepared; screenshots must match accepted final build. No submission/approval claim. |

The local-only data boundary includes exceptions the user controls: exports, clipboard and insertion
into websites. Local draft storage is not an encrypted vault. See PRIVACY.md and SECURITY.md.

Follow-up capabilities such as vocabulary hints, punctuation improvements, diarization, translation
or summarization are outside this ASR release. No cloud fallback or new speech model was silently added.
