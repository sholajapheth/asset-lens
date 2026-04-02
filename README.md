# Asset Lens

**Visual asset browser for VS Code** — browse thumbnails, track `index.ts` barrel export status, and spot unused assets without leaving the editor. Works great for design systems, React Native / Expo asset folders, and any project that uses barrel files.

![VS Code](https://img.shields.io/badge/VS%20Code-1.85+-blue?logo=visualstudiocode)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Thumbnail grid** — Preview images, GIFs, SVGs, videos, and other assets discovered in your workspace (common formats; see [Supported formats](#supported-formats)).
- **Automatic discovery** — Finds assets under workspace folders, grouped by parent directory. Heavy folders like `node_modules`, `dist`, `build`, and `.git` are skipped.
- **Barrel export status** — For each folder that has an `index.ts`, Asset Lens shows whether an asset is exported, exported but unused, or missing from the barrel.
- **Status at a glance** — Color-coded indicators for exported, unused, and missing-from-index assets.
- **Detail view** — Open an asset to see export status, copy the suggested import path, list usages, open the file, or **add a line to `index.ts`** when something is missing.
- **Lazy usage scanning** — Full codebase usage is resolved when you open an asset’s detail view, so the sidebar stays responsive.
- **Filters & search** — Filter by type (e.g. images, vectors & PDF, videos), by export status (all / exported / unused / missing), and search by filename.
- **Summary bar** — Counts for total assets, exported, unused, and missing in the current filtered set.
- **Live updates** — Refreshes when files are created, deleted, renamed, or when `index.ts` is saved.

## Installation

### Visual Studio Code

Install **Asset Lens** from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/vscode) (search for “Asset Lens” or by publisher `sholajapheth`).

### Cursor, VSCodium, and other compatible editors

Install from the [Open VSX Registry](https://open-vsx.org/) using the same extension id: `sholajapheth.asset-lens`.

## Getting started

1. Open a folder or workspace that contains your assets.
2. Click the **Asset Lens** icon in the **Activity Bar** (left sidebar).
3. Open the **Gallery** view to browse folders and assets.

Use the **search** field and **Type** / **status** controls in the Gallery toolbar to narrow the list. Click a thumbnail to open the detail panel.

## Commands

| Command | Description |
|--------|-------------|
| **Refresh Asset Lens** | Reloads the asset index and gallery (`assetLens.refresh`). Available from the Command Palette and from the refresh button on the Gallery view title bar. |

## Settings

| Setting | Default | Description |
|--------|---------|-------------|
| `assetLens.assetRoot` | *(empty)* | Optional. Limit discovery to this folder (path relative to each workspace root, or absolute). If empty, assets are discovered across the workspace (still excluding ignored build/vendor paths). |
| `assetLens.importPrefix` | *(empty)* | Optional import prefix for barrel imports (e.g. `@/assets`). If empty, Asset Lens uses `tsconfig` path mappings and common `src/` → `@/` heuristics. |

Open **Settings** and search for `Asset Lens`, or add keys under your `settings.json`:

```json
{
  "assetLens.assetRoot": "",
  "assetLens.importPrefix": ""
}
```

## Supported formats

Asset Lens indexes many common extensions, including:

- **Raster & icons:** PNG, JPG, WebP, GIF, ICO, BMP, AVIF, HEIC, …
- **Vector & docs:** SVG, PDF, AI, EPS
- **Video:** MP4, WebM, MOV, MKV, AVI, …
- **Fonts:** WOFF, WOFF2, TTF, OTF, EOT
- **Barrel-related `.ts` files** in asset trees (for base64 / TS-based asset patterns)

Up to **2000** assets are indexed per workspace (see `loadAssets` limits).

## Requirements

- **VS Code** (or compatible editor) **1.85** or newer.

## Contributing

Issues and pull requests are welcome: [github.com/sholajapheth/asset-lens](https://github.com/sholajapheth/asset-lens).

## License

[MIT](LICENSE)

## Changelog

See [CHANGELOG.md](CHANGELOG.md).
