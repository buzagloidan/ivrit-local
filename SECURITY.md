# Security policy

## Reporting

Please use GitHub's private vulnerability reporting for this repository:
https://github.com/buzagloidan/ivrit-local/security/advisories/new

Do not publish exploit details or private audio/transcripts in a public issue. Include the
extension version, browser/OS, reproduction steps using non-sensitive test data, and impact.
If private reporting is unavailable, use the contact options on the maintainer's GitHub profile
without initially sending sensitive details. Only the latest beta/release receives fixes.
No guaranteed response time or paid bounty is offered.

## Boundaries

- No backend, remote inference, automatic telemetry, remote scripts, eval, or inline JS.
- Packaged WebAssembly is permitted by the extension CSP; network connections are self-only.
- Local blob audio playback is allowed for explicitly chosen files, with streaming decoding.
- Insert requires a trusted user destination event and a visible editable field. Passwords,
  synthetic events, unsupported pages and oversized text are rejected. No forms are submitted.
- Sender identity, panel URL, tab identity and insertion session are validated across messages.
- Persistent site access is optional and explicit; temporary active-tab access is preferred.
- Audio is transient. Opt-in draft recovery is ordinary local profile storage, not a secure vault.
- Model/worker sessions are limited to 60 minutes; uploads to 64 MB and 60 minutes; text to
  200,000 characters. Endpoint segmentation periodically resets recognition state.
- Browser/OS compromise, a malicious destination website after insertion, other clipboard
  readers, and physical access to the Chrome profile are outside the extension's protections.

## Maintenance

Run the unit, adversarial browser, actual Chrome acceptance and endurance checks before releases.
Pinned dependency URLs/digests are in assets-lock.json and notices; verify new upstream releases
and advisories before changing them. Generated runtime files must remain reproducible from the
verified upstream archive. Never add tokens or recordings to the repository or CI logs.
Protect publisher/source accounts with 2FA/passkeys and limit write access. Store submission
and publisher-account security checks remain maintainer actions; the extension cannot enable 2FA.
