import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

function tryReadTsconfigPaths(
  workspaceRoot: string
): Record<string, string[]> | null {
  const candidates = ["tsconfig.json", "jsconfig.json"];
  for (const c of candidates) {
    const p = path.join(workspaceRoot, c);
    if (!fs.existsSync(p)) {
      continue;
    }
    try {
      const raw = fs.readFileSync(p, "utf8");
      const j = JSON.parse(raw) as {
        compilerOptions?: { paths?: Record<string, string[]> };
      };
      const paths = j.compilerOptions?.paths;
      if (paths && typeof paths === "object") {
        return paths;
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

/** Path after the first `/assets/` segment (e.g. `pngs` or `pngs/sub`). */
function segmentAfterAssetsFolder(folderAbsPath: string): string | null {
  const withSlash = folderAbsPath.replace(/\\/g, "/");
  const lower = withSlash.toLowerCase();
  const needle = "/assets/";
  let idx = lower.indexOf(needle);
  if (idx < 0) {
    if (lower.endsWith("/assets")) {
      return "";
    }
    return null;
  }
  return withSlash.slice(idx + needle.length);
}

/**
 * Build import module path for a barrel folder (e.g. @/assets/pngs).
 */
export function computeImportModuleSpecifier(
  workspaceFolder: vscode.WorkspaceFolder,
  folderAbsPath: string
): string {
  const cfg = vscode.workspace.getConfiguration(
    "assetLens",
    workspaceFolder.uri
  );
  const manual = cfg.get<string | undefined>("importPrefix")?.trim();
  if (manual) {
    const base = manual.replace(/\/$/, "");
    const afterAssets = segmentAfterAssetsFolder(folderAbsPath);
    if (afterAssets !== null) {
      if (afterAssets === "") {
        return base;
      }
      return `${base}/${afterAssets}`;
    }
    const rel = path
      .relative(workspaceFolder.uri.fsPath, folderAbsPath)
      .split(path.sep)
      .join("/");
    return `${base}/${rel}`;
  }

  const wf = workspaceFolder.uri.fsPath;
  const rel = path.relative(wf, folderAbsPath).split(path.sep).join("/");
  const paths = tryReadTsconfigPaths(wf);

  if (paths) {
    for (const [alias, targets] of Object.entries(paths)) {
      const star = alias.endsWith("/*");
      if (!star || !targets?.length) {
        continue;
      }
      const prefix = alias.slice(0, -2).replace(/\/$/, "");
      let targetBase = targets[0].replace(/\*$/, "").replace(/\/$/, "");
      if (targetBase.startsWith("./")) {
        targetBase = targetBase.slice(2);
      }
      const normRel = rel.replace(/\\/g, "/");
      const normBase = targetBase.replace(/\\/g, "/");
      if (normRel === normBase || normRel.startsWith(normBase + "/")) {
        const rest = normRel.slice(normBase.length).replace(/^\//, "");
        return rest ? `${prefix}/${rest}` : prefix;
      }
    }
  }

  if (rel.startsWith("src/")) {
    return `@/${rel.slice(4)}`;
  }
  return rel.startsWith(".") ? rel : `./${rel}`;
}
