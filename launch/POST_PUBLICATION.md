# After publication — 18 October 2026

The maintainer reports the extension is published at:
https://chromewebstore.google.com/detail/ivrit-local-%E2%80%94-%D7%AA%D7%9E%D7%9C%D7%95%D7%9C-%D7%91%D7%A2%D7%91%D7%A8%D7%99/epkbbbkfomdengkbpchngajaeaelaefp

The 0.2.3 keyboard update is a separate release candidate and has not been submitted by this agent.
`linkedin-he.md` describes the published capabilities and intentionally does not advertise the new shortcut.
It is a draft only; no social-media post was published.

Priorities for the first users:

1. Test an actual Store install in a fresh Chrome profile and an update from the published package.
   Confirm offline microphone/file recognition, permission cancellation, Stop/close cleanup,
   TXT export, and local draft behavior on macOS and Windows. A Store approval is not a device test.
2. Keep support at the public GitHub Issues URL and ask for Chrome version, OS, reproduction steps,
   and expected behavior. Do not request private recordings/transcripts in public issues.
3. Test names, numbers, background noise and slower devices. Keep quality/speed limits clear in
   the listing; process feedback without adding telemetry or uploading recognition data silently.
4. Test the shortcut candidate using the manual scenarios in `docs/ACCEPTANCE.md` before Store upload.
   A shortcut conflict should be fixed through Chrome’s keyboard settings; the UI displays the
   registered binding or explains when none is assigned. The current command is a toggle,
   scoped to Chrome, not hold-to-talk or a system-wide Fn hotkey.

Optional launch material: a short screen recording of a non-sensitive Hebrew dictation,
followed by editing/copying, alongside the existing store artwork. The screenshots in the store kit
are local previews of version 0.2.2; update them if visible UI changes affect the listing.

Primary technical references checked 18 October 2026:
https://developer.chrome.com/docs/extensions/reference/api/commands
https://developer.chrome.com/docs/extensions/reference/api/sidePanel
