# Contributing

See README.md for setup. Use non-sensitive, redistributable audio fixtures. Keep the
extension offline: do not introduce analytics, remote code, or cloud recognition.

Run `npm test`, `npm run test:wasm`, and the browser fixtures before proposing changes.
`npm run test:endurance` performs a 30-minute simulated-audio check. New capture or permission
changes also need the actual-Chrome acceptance checklist in docs/ACCEPTANCE.md.

Our code is MIT. Contributions must have compatible provenance and must retain third-party
notices. Model weights, runtime binaries and demo audio have separate licenses. Do not commit
private recordings, API keys, generated ZIPs, or model binaries; use the pinned asset fetcher.
