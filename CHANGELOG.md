# Changelog

## 0.1.0

### Fixed
- Errors were reported twice (`node.error()` + `done(err)`), so a *Catch* node fired twice and the log showed duplicates. Now reported once.
- Editor validators only worked while the edit dialog was open; imported or pasted flows with missing X/Y or non-increasing X looked valid. They now fall back to the saved node properties.
- Configuration errors are shown as a red status right after deploy, not only on the first message.
- `msg.payload` parsing is strict: `"12abc"` used to be read as `12`; now non-numeric input is rejected.
- In the editor, an empty X in a checked row no longer hides a later X-order error.
- README described a second `TRBL_AL` output and `msg.trbl_al`, which never existed; documentation now matches the node.
- `package.json` `repository` pointed to npm; now points to GitHub. Full MIT license text added.

### Changed
- Interpolation logic moved to `nodes/lib/interpolate.js`; runtime error messages are all in English.
- Removed redundant manual field saving in `oneditsave` (Node-RED saves the `node-input-*` fields itself).

### Added
- Mocha test suite (unit + Node-RED runtime tests via `node-red-node-test-helper`) and GitHub Actions CI.
