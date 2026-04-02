# Changelog

## [0.1.2] - 2026-04-02

### Fixed

- CI publish: use Node.js 20 in GitHub Actions so `vsce` / `undici` no longer hit `ReferenceError: File is not defined` on Node 18.

### Changed

- Release workflow: fail fast if the git tag does not match `package.json` `version` (e.g. tag `v0.1.2` requires `"version": "0.1.2"`).

## [0.1.1] - 2026-04-02

### Changed

- New extension icon (marketplace and activity bar) and gallery banner color aligned with the Asset Lens logo.

## [0.1.0] - 2026-04-02

### Added

- Visual thumbnail grid for all assets in structured asset folders (pngs, svgs, gifs, fonts, base64images, animation)
- Automatic asset root detection — no configuration required
- index.ts barrel export sync status per asset (exported / unused / missing)
- Status dot indicators: green (exported + used), amber (exported but unused), red (not in index.ts)
- Detail view with export status, import path copy, usage list, and actions
- Lazy usage detection — scans codebase only when opening a specific asset's detail view
- One-click "Add to index.ts" — generates and appends the correct export line
- Filter by asset type: All / PNG / SVG / GIF / Font / Base64
- Filter by status: All / Exported / Unused / Missing
- Search by filename
- Summary bar with total, exported, unused, and missing counts
- Auto-refresh when asset files are added, deleted, or changed
- Command palette: "Asset Lens: Open Asset Browser" and "Asset Lens: Refresh Assets"
