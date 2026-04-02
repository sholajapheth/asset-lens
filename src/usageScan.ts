import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import type { AssetUsage, WebviewAsset, WebviewFolder } from "./types";

const CODE_GLOB = "**/*.{ts,tsx,js,jsx}";
const EXCLUDE =
  "{**/node_modules/**,**/.git/**,**/dist/**,**/build/**,**/out/**,**/.next/**,**/coverage/**}";

const MAX_FILES = 5000;

function makeWordRegex(name: string): RegExp {
  return new RegExp(`\\b${escapeRegExp(name)}\\b`);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Skip barrel index.ts files when scanning for import usages (not "real" consumers). */
export function buildBarrelIndexSkipSet(folders: WebviewFolder[]): Set<string> {
  const s = new Set<string>();
  for (const f of folders) {
    s.add(path.normalize(path.join(f.absolutePath, "index.ts")));
  }
  return s;
}

function shouldSkipUsageFile(
  fileAbs: string,
  barrelIndexPaths: Set<string>
): boolean {
  return barrelIndexPaths.has(path.normalize(fileAbs));
}

/**
 * Recompute per-asset usageCount from batch scan: iterate files once, for each file increment each asset if any name matches.
 */
export async function computeAssetUsageCounts(
  barrelIndexPaths: Set<string>,
  assets: WebviewAsset[]
): Promise<void> {
  const exported = assets.filter(
    (a) => a.isExported && (a.exportNames?.length ?? 0) > 0
  );
  if (!exported.length) {
    for (const a of assets) {
      if (!a.isExported) {
        a.usageCount = -1;
      } else {
        a.usageCount = 0;
      }
    }
    return;
  }

  const uris = await vscode.workspace.findFiles(CODE_GLOB, EXCLUDE, MAX_FILES);

  const counts = new Map<string, number>();
  for (const a of exported) {
    counts.set(a.relativePath, 0);
  }

  const nameToAssets = new Map<string, typeof exported>();
  for (const a of exported) {
    for (const n of a.exportNames ?? []) {
      const list = nameToAssets.get(n) ?? [];
      list.push(a);
      nameToAssets.set(n, list);
    }
  }

  const regexCache = new Map<string, RegExp>();

  for (const uri of uris) {
    const abs = uri.fsPath;
    if (shouldSkipUsageFile(abs, barrelIndexPaths)) {
      continue;
    }
    let content: string;
    try {
      content = fs.readFileSync(abs, "utf8");
    } catch {
      continue;
    }

    const bumped = new Set<string>();
    for (const [name, list] of nameToAssets) {
      if (!content.includes(name)) {
        continue;
      }
      let re = regexCache.get(name);
      if (!re) {
        re = makeWordRegex(name);
        regexCache.set(name, re);
      }
      if (!content.match(re)) {
        continue;
      }
      for (const asset of list) {
        bumped.add(asset.relativePath);
      }
    }

    for (const rp of bumped) {
      counts.set(rp, (counts.get(rp) ?? 0) + 1);
    }
  }

  for (const a of assets) {
    if (!a.isExported) {
      a.usageCount = -1;
      continue;
    }
    a.usageCount = counts.get(a.relativePath) ?? 0;
  }
}

export async function findUsagesForExportNames(
  barrelIndexPaths: Set<string>,
  exportNames: string[]
): Promise<AssetUsage[]> {
  const names = [...new Set(exportNames.filter(Boolean))];
  if (!names.length) {
    return [];
  }

  const regexes = names.map((n) => ({ name: n, re: makeWordRegex(n) }));

  const uris = await vscode.workspace.findFiles(CODE_GLOB, EXCLUDE, MAX_FILES);

  const out: AssetUsage[] = [];

  for (const uri of uris) {
    const abs = uri.fsPath;
    if (shouldSkipUsageFile(abs, barrelIndexPaths)) {
      continue;
    }
    let content: string;
    try {
      content = fs.readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    const rel =
      vscode.workspace.asRelativePath(uri, false) || abs.replace(/\\/g, "/");

    const lines = content.split(/\r\n|\n|\r/);
    let lineNo = 0;
    for (const line of lines) {
      lineNo += 1;
      if (!names.some((n) => line.includes(n))) {
        continue;
      }
      for (const { name, re } of regexes) {
        if (!line.includes(name)) {
          continue;
        }
        if (line.match(re)) {
          out.push({ relativePath: rel, line: lineNo });
          break;
        }
      }
    }
  }

  out.sort(
    (a, b) => a.relativePath.localeCompare(b.relativePath) || a.line - b.line
  );
  return dedupeUsages(out);
}

export function uniqueFileCount(usages: AssetUsage[]): number {
  return new Set(usages.map((u) => u.relativePath)).size;
}

function dedupeUsages(u: AssetUsage[]): AssetUsage[] {
  const seen = new Set<string>();
  const r: AssetUsage[] = [];
  for (const x of u) {
    const k = `${x.relativePath}:${x.line}`;
    if (seen.has(k)) {
      continue;
    }
    seen.add(k);
    r.push(x);
  }
  return r;
}
