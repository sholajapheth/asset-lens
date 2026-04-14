import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { loadBarrelMapForFolder } from "./parseBarrel";
import type { WebviewAsset, WebviewFolder } from "./types";

const IMAGE_EXT = new Set([
  "png",
  "jpg",
  "jpeg",
  "jpe",
  "jfif",
  "pjpeg",
  "pjp",
  "gif",
  "webp",
  "apng",
  "bmp",
  "dib",
  "ico",
  "cur",
  "icns",
  "avif",
  "heic",
  "heif",
  "tif",
  "tiff",
  "jxl",
]);
const VECTOR_EXT = new Set(["svg", "svgz", "ai", "eps", "pdf"]);
const VIDEO_EXT = new Set([
  "mp4",
  "webm",
  "mov",
  "mkv",
  "avi",
  "m4v",
  "ogv",
  "3gp",
  "3g2",
  "mpg",
  "mpeg",
  "mts",
  "m2ts",
  "wmv",
]);
const FONT_EXT = new Set([
  "woff",
  "woff2",
  "ttf",
  "otf",
  "eot",
  "ttc",
  "otc",
  "pfb",
  "pfm",
]);
const AUDIO_EXT = new Set([
  "mp3",
  "wav",
  "ogg",
  "oga",
  "m4a",
  "aac",
  "flac",
  "aif",
  "aiff",
  "opus",
  "weba",
]);

const ASSET_EXTENSIONS = [
  ...IMAGE_EXT,
  ...VECTOR_EXT,
  ...VIDEO_EXT,
  ...FONT_EXT,
  ...AUDIO_EXT,
];
const ASSET_EXT_SET = new Set(ASSET_EXTENSIONS);

export const GLOB_ASSETS = `**/*.{${ASSET_EXTENSIONS.join(",")}}`;

const EXCLUDE =
  "{**/node_modules/**,**/.git/**,**/dist/**,**/build/**,**/out/**,**/.next/**,**/coverage/**}";

const MAX_ASSETS = 2000;

function extLowerFromPath(absPath: string): string {
  return path.extname(absPath).slice(1).toLowerCase();
}

function isAllowedAssetPath(absPath: string): boolean {
  const ext = extLowerFromPath(absPath);
  return !!ext && ASSET_EXT_SET.has(ext);
}

/** Used by webview filters: image tab = image|gif, vector tab = vector, video tab = video */
function classifyType(ext: string): string {
  const e = ext.toLowerCase();
  if (e === "gif") {
    return "gif";
  }
  if (IMAGE_EXT.has(e)) {
    return "image";
  }
  if (VECTOR_EXT.has(e)) {
    return "vector";
  }
  if (VIDEO_EXT.has(e)) {
    return "video";
  }
  if (FONT_EXT.has(e)) {
    return "font";
  }
  return "other";
}

async function collectAssetUris(
  scopeUris: vscode.Uri[] | null,
): Promise<vscode.Uri[]> {
  if (!scopeUris?.length) {
    return vscode.workspace.findFiles(GLOB_ASSETS, EXCLUDE, MAX_ASSETS);
  }
  const merged: vscode.Uri[] = [];
  const seen = new Set<string>();
  for (const root of scopeUris) {
    const batch = await vscode.workspace.findFiles(
      new vscode.RelativePattern(root, GLOB_ASSETS),
      EXCLUDE,
      MAX_ASSETS,
    );
    for (const u of batch) {
      const k = u.fsPath;
      if (!seen.has(k)) {
        seen.add(k);
        merged.push(u);
      }
    }
  }
  return merged;
}

export async function buildAssetFolders(
  webview: vscode.Webview,
  scopeUris: vscode.Uri[] | null,
): Promise<WebviewFolder[]> {
  const uris = await collectAssetUris(scopeUris);
  const files = uris
    .map((u) => u.fsPath)
    .filter((p) => isAllowedAssetPath(p))
    .filter((p) => {
      try {
        return fs.statSync(p).isFile();
      } catch {
        return false;
      }
    });
  files.sort((a, b) => a.localeCompare(b));

  const barrelCache = new Map<
    string,
    ReturnType<typeof loadBarrelMapForFolder>
  >();

  const byFolder = new Map<string, WebviewAsset[]>();

  for (const abs of files) {
    const folderAbsPath = path.dirname(abs);
    const base = path.basename(abs);
    const ext = path.extname(base).slice(1) || "";
    const nameWithoutExt = path.basename(base, path.extname(base));
    const normKey = nameWithoutExt.toLowerCase();

    let barrel = barrelCache.get(folderAbsPath);
    if (!barrel) {
      barrel = loadBarrelMapForFolder(folderAbsPath);
      barrelCache.set(folderAbsPath, barrel);
    }

    const exportNames = barrel.get(normKey);
    const isExported = !!exportNames?.length;

    let stSize = 0;
    try {
      stSize = fs.statSync(abs).size;
    } catch {
      stSize = 0;
    }

    const uri = vscode.Uri.file(abs);
    const relativePath =
      vscode.workspace.asRelativePath(uri, false) || abs.replace(/\\/g, "/");

    const asset: WebviewAsset = {
      name: base,
      nameWithoutExt,
      ext,
      absolutePath: abs,
      folderAbsPath,
      relativePath,
      folderName: path.basename(folderAbsPath),
      type: classifyType(ext),
      sizeBytes: stSize,
      webviewUri: webview.asWebviewUri(uri).toString(),
      isExported,
      exportName: exportNames?.[0],
      exportNames: exportNames ?? [],
      usageCount: -1,
      usages: [],
    };

    const list = byFolder.get(folderAbsPath) ?? [];
    list.push(asset);
    byFolder.set(folderAbsPath, list);
  }

  const folders: WebviewFolder[] = [];
  for (const [abs, assets] of byFolder) {
    assets.sort((a, b) => a.name.localeCompare(b.name));
    const folderUri = vscode.Uri.file(abs);
    const label =
      vscode.workspace.asRelativePath(folderUri, false) || path.basename(abs);
    folders.push({
      name: label,
      absolutePath: abs,
      assets,
    });
  }
  folders.sort((a, b) => a.name.localeCompare(b.name));
  return folders;
}
