# Release acceptance checks

Use non-sensitive test audio, a clean Chrome profile, and the final packaged build.
Record browser/OS/version, result and tester for each run. Unit tests and previews do not
substitute for native extension permission, service-worker and side-panel checks.

- [ ] macOS desktop Chrome: fresh install, open side panel, load bundled assets fully offline.
- [ ] Windows desktop Chrome: same fresh-install/offline run on an actual Windows machine.
- [ ] Microphone: allow, deny, dismiss, revoke, missing/busy device, stop and close panel.
- [ ] Browser tab: select a public test tab, enable audio, retain local playback/headphones,
      stop sharing, close/navigate source tab, refuse shares without audio or non-tab sources.
- [ ] No capture tracks remain after Stop, errors, panel close, or session limit.
- [ ] Insert: initial temporary grant, new site without permission, per-site grant/denial,
      explicit all-sites opt-in, revoke, wrong window/tab, restricted browser pages.
- [ ] Scripted clicks/Enter cannot paste; real clicks and keyboard placement work; password,
      readonly, hidden and removed destinations stay unchanged. Enter never submits a form.
- [ ] Undo: input/textarea/basic contenteditable, safe refusal after subsequent edits/navigation.
- [ ] TXT downloads open correctly; Hebrew/English/numbers display sensibly.
- [ ] Draft disabled by default, opt-in recovery, expiry, deletion, disabling, private profile handling.
- [ ] File: size/duration limits, invalid format/metadata, playback error, cancel, close mid-import.
- [ ] Engine failure/backpressure preserve text; restarting engine does not leak prior speech.
- [ ] UI: Hebrew RTL, keyboard and screen reader, narrow panels and browser zoom.
- [ ] Low-memory device, 30–60 minute speech, noisy audio, Hebrew/English/numbers quality checks.
- [ ] Network inspection: no remote requests during recognition; only deliberate external links.
- [ ] Published privacy URL works; dashboard declarations, screenshots and permission reasons match.
- [ ] Maintainer verifies Chrome Web Store publisher 2FA and repository access protections.

Automated evidence is in TEST_RESULTS.md. Unchecked items remain release gates, not claims
that the extension passed or is approved for the Chrome Web Store.

## 0.2.3 shortcut update

- [ ] Fresh install and Store-version upgrade: open panel shortcut still works; microphone command
      is registered or the UI correctly reports a missing/conflicting binding.
- [ ] Cmd+Shift+Space on macOS / Ctrl+Shift+Space on Windows opens a closed panel, waits for
      the model, follows microphone permission setup if needed, starts once and stops on second press.
- [ ] Repeat while model is loading and while permission/media access is pending: cancellation
      does not result in delayed recording. Closing/hiding a panel prevents a queued start.
- [ ] Two Chrome windows: only the requested window handles the command; another extension
      or page cannot start capture. A shortcut never opens the tab-sharing picker.
- [ ] Remap/clear the shortcut at chrome://extensions/shortcuts, reopen the panel and verify
      displayed binding. Check Hebrew/English keyboard layouts and common OS conflicts.
- [ ] Chrome loses focus: default command does not start capture from other applications.
