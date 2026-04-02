import * as fs from "fs";
import * as path from "path";

/** normalized basename without extension, lowercase */
export type NormalizedBase = string;

export interface BarrelExport {
  exportNames: string[];
  /** normalized base from source path (e.g. mtn-logo from ./mtn-logo.png) */
  normalizedBase: NormalizedBase;
}

/**
 * Parse index.ts / barrel file: map normalized file base -> export names.
 */
export function parseBarrelFile(
  barrelDirAbs: string,
  content: string,
  visited: Set<string> = new Set()
): Map<NormalizedBase, string[]> {
  const result = new Map<NormalizedBase, string[]>();
  const barrelPath = path.join(barrelDirAbs, "index.ts");
  const normBarrel = path.normalize(barrelPath);
  if (visited.has(normBarrel)) {
    return result;
  }
  visited.add(normBarrel);

  const merge = (base: NormalizedBase, names: string[]) => {
    const cur = result.get(base) ?? [];
    const set = new Set(cur);
    for (const n of names) {
      set.add(n);
    }
    result.set(base, [...set]);
  };

  const normBaseFromRef = (ref: string): NormalizedBase => {
    const clean = ref.replace(/^\.\//, "").replace(/^\.\.\//g, "");
    const base = path.basename(clean, path.extname(clean));
    return base.toLowerCase();
  };

  const resolveRefToPath = (ref: string): string | null => {
    const clean = ref.replace(/^\.\//, "");
    const noExt = path.join(barrelDirAbs, clean);
    const candidates = [
      noExt,
      `${noExt}.ts`,
      `${noExt}.tsx`,
      path.join(barrelDirAbs, clean, "index.ts"),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) {
        return path.normalize(c);
      }
    }
    return null;
  };

  // export { default as Name } from './path'
  const reDefaultAs =
    /export\s*\{\s*default\s+as\s+(\w+)\s*\}\s*from\s*['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = reDefaultAs.exec(content)) !== null) {
    merge(normBaseFromRef(m[2]), [m[1]]);
  }

  // export { A, B as C } from './path' — simplified: split names, ignore "as" rename for base map (use last name)
  const reNamedExports =
    /export\s*\{\s*([^}]+)\s*\}\s*from\s*['"]([^'"]+)['"]/g;
  while ((m = reNamedExports.exec(content)) !== null) {
    const fromPath = m[2];
    if (/default\s+as/.test(m[1])) {
      continue;
    }
    if (/\bdefault\b/.test(m[1])) {
      continue;
    }
    const parts = m[1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const names: string[] = [];
    for (const p of parts) {
      const asMatch = /^(\w+)\s+as\s+(\w+)$/.exec(p);
      if (asMatch) {
        names.push(asMatch[2]);
      } else if (/^\w+$/.test(p)) {
        names.push(p);
      }
    }
    if (names.length) {
      merge(normBaseFromRef(fromPath), names);
    }
  }

  // export const X = require('./path')
  const reRequire =
    /export\s+const\s+(\w+)\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((m = reRequire.exec(content)) !== null) {
    merge(normBaseFromRef(m[2]), [m[1]]);
  }

  // import X from './path'; export { X } — same line or nearby
  const reImportExport =
    /import\s+(\w+)\s+from\s*['"]([^'"]+)['"]\s*;?\s*export\s*\{\s*\1\s*\}/g;
  while ((m = reImportExport.exec(content)) !== null) {
    merge(normBaseFromRef(m[2]), [m[1]]);
  }

  // Multiline: import X from '...'\n ... export { X }
  const flat = content.replace(/\r\n/g, "\n");
  const importLines = flat.matchAll(
    /import\s+(\w+)\s+from\s*['"]([^'"]+)['"]/g
  );
  for (const im of importLines) {
    const name = im[1];
    const ref = im[2];
    const after = flat.slice((im.index ?? 0) + im[0].length);
    if (new RegExp(`export\\s*\\{\\s*${name}\\s*\\}`).test(after.slice(0, 400))) {
      merge(normBaseFromRef(ref), [name]);
    }
  }

  // export * from './mod'
  const reStar = /export\s*\*\s*from\s*['"]([^'"]+)['"]/g;
  while ((m = reStar.exec(content)) !== null) {
    const resolved = resolveRefToPath(m[1]);
    if (!resolved) {
      continue;
    }
    const subDir = path.dirname(resolved);
    let subContent: string;
    try {
      subContent = fs.readFileSync(resolved, "utf8");
    } catch {
      continue;
    }
    const subMap = parseBarrelFile(subDir, subContent, visited);
    for (const [k, v] of subMap) {
      merge(k, v);
    }
  }

  return result;
}

export function loadBarrelMapForFolder(folderAbs: string): Map<
  NormalizedBase,
  string[]
> {
  const indexPath = path.join(folderAbs, "index.ts");
  if (!fs.existsSync(indexPath)) {
    return new Map();
  }
  try {
    const content = fs.readFileSync(indexPath, "utf8");
    return parseBarrelFile(folderAbs, content);
  } catch {
    return new Map();
  }
}
