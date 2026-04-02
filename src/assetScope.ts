import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

/**
 * Optional folder(s) to limit asset discovery. When empty, search the whole workspace.
 */
export function getDiscoveryScopeUris(): vscode.Uri[] | null {
  const raw = vscode.workspace
    .getConfiguration("assetLens")
    .get<string | undefined>("assetRoot")
    ?.trim();
  if (!raw) {
    return null;
  }

  const out: vscode.Uri[] = [];
  const folders = vscode.workspace.workspaceFolders ?? [];
  for (const wf of folders) {
    const abs = path.isAbsolute(raw) ? raw : path.join(wf.uri.fsPath, raw);
    const norm = path.normalize(abs);
    if (fs.existsSync(norm) && fs.statSync(norm).isDirectory()) {
      const uri = vscode.Uri.file(norm);
      if (!out.some((u) => u.fsPath === uri.fsPath)) {
        out.push(uri);
      }
    }
  }
  return out.length ? out : null;
}

export function scopeDescription(scopes: vscode.Uri[] | null): string {
  if (!scopes?.length) {
    return "Workspace";
  }
  if (scopes.length === 1) {
    return scopes[0].fsPath;
  }
  return `${scopes.length} folders`;
}
