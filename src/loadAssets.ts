import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { loadBarrelMapForFolder } from "./parseBarrel";
import type { WebviewAsset, WebviewFolder } from "./types";

export const GLOB_ASSETS =
  "**/*.{png,jpg,jpeg,gif,webp,bmp,ico,avif,heic,svg,ai,eps,pdf,mp4,webm,mov,mkv,avi,m4v,ogv,woff,woff2,ttf,otf,eot,ts}";

const EXCLUDE =
  "{**/node_modules/**,**/.git/**,**/dist/**,**/build/**,**/out/**,**/.next/**,**/coverage/**}";

const MAX_ASSETS = 2000;

const IMAGE_EXT = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "bmp",
  "ico",
  "avif",
  "heic",
]);
const VECTOR_EXT = new Set(["svg", "ai", "eps", "pdf"]);
const VIDEO_EXT = new Set([
  "mp4",
  "webm",
  "mov",
  "mkv",
  "avi",
  "m4v",
  "ogv",
]);
const FONT_EXT = new Set(["woff", "woff2", "ttf", "otf", "eot"]);

/** Used by webview filters: image tab = image|gif, vector tab = vector, video tab = video */
function classifyType(ext: string): string {
  const e = ext.toLowerCase();
  if (e === "ts") {
    return "base64";
  }
  if (e === "gif") {
    return "gif";
  }
  if (
    e === "png" ||
    e === "jpg" ||
    e === "jpeg" ||
    e === "webp" ||
    e === "bmp" ||
    e === "ico" ||
    e === "avif" ||
    e === "heic"
  ) {
    return "image";
  }
  if (e === "svg" || VECTOR_EXT.has(e)) {
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
  scopeUris: vscode.Uri[] | null
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
      MAX_ASSETS
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
  scopeUris: vscode.Uri[] | null
): Promise<WebviewFolder[]> {
  const uris = await collectAssetUris(scopeUris);
  const files = uris
    .map((u) => u.fsPath)
    .filter((p) => path.basename(p) !== "index.ts");
  files.sort((a, b) => a.localeCompare(b));

  const barrelCache = new Map<string, ReturnType<typeof loadBarrelMapForFolder>>();

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
      vscode.workspace.asRelativePath(folderUri, false) ||
      path.basename(abs);
    folders.push({
      name: label,
      absolutePath: abs,
      assets,
    });
  }
  folders.sort((a, b) => a.name.localeCompare(b.name));
  return folders;
}
