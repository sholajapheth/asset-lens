import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WebviewAsset } from "../src/types";

const { mockWorkspace } = vi.hoisted(() => ({
  mockWorkspace: {
    findFiles: vi.fn(),
    asRelativePath: vi.fn(),
  },
}));

vi.mock("vscode", () => ({
  workspace: mockWorkspace,
}));

import {
  buildBarrelIndexSkipSet,
  computeAssetUsageCounts,
  findUsagesForExportNames,
  uniqueFileCount,
} from "../src/usageScan";

describe("usageScan", () => {
  const tmpDirs: string[] = [];

  beforeEach(() => {
    mockWorkspace.findFiles.mockReset();
    mockWorkspace.asRelativePath.mockReset();
  });

  afterEach(() => {
    for (const d of tmpDirs) {
      fs.rmSync(d, { recursive: true, force: true });
    }
  });

  it("builds skip set for folder index barrels", () => {
    const set = buildBarrelIndexSkipSet([
      { name: "a", absolutePath: "/repo/src/assets", assets: [] },
      { name: "b", absolutePath: "/repo/icons", assets: [] },
    ]);

    expect(set.has(path.normalize("/repo/src/assets/index.ts"))).toBe(true);
    expect(set.has(path.normalize("/repo/icons/index.ts"))).toBe(true);
  });

  it("computes usage counts while skipping barrel index files", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "asset-lens-usage-"));
    tmpDirs.push(root);

    const consumer = path.join(root, "src", "screen.tsx");
    const barrel = path.join(root, "src", "assets", "index.ts");
    fs.mkdirSync(path.dirname(consumer), { recursive: true });
    fs.mkdirSync(path.dirname(barrel), { recursive: true });

    fs.writeFileSync(
      consumer,
      "import { HomeIcon } from './assets';\n",
      "utf8",
    );
    fs.writeFileSync(
      barrel,
      "export { HomeIcon } from './home.svg';\n",
      "utf8",
    );

    mockWorkspace.findFiles.mockResolvedValue([
      { fsPath: consumer },
      { fsPath: barrel },
    ]);

    const assets: WebviewAsset[] = [
      {
        name: "home.svg",
        nameWithoutExt: "home",
        ext: "svg",
        absolutePath: path.join(root, "src", "assets", "home.svg"),
        folderAbsPath: path.join(root, "src", "assets"),
        relativePath: "src/assets/home.svg",
        folderName: "assets",
        type: "vector",
        sizeBytes: 10,
        webviewUri: "webview:home",
        isExported: true,
        exportName: "HomeIcon",
        exportNames: ["HomeIcon"],
        usageCount: -1,
        usages: [],
      },
    ];

    const skip = new Set([path.normalize(barrel)]);
    await computeAssetUsageCounts(skip, assets);

    expect(assets[0].usageCount).toBe(1);
  });

  it("finds line usages and returns unique file count", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "asset-lens-usage-"));
    tmpDirs.push(root);

    const fileA = path.join(root, "a.ts");
    const fileB = path.join(root, "b.tsx");

    fs.writeFileSync(fileA, "const x = HomeIcon;\nconst y = HomeIcon;", "utf8");
    fs.writeFileSync(fileB, "function f(){ return HomeIcon }", "utf8");

    mockWorkspace.findFiles.mockResolvedValue([
      { fsPath: fileA },
      { fsPath: fileB },
    ]);
    mockWorkspace.asRelativePath.mockImplementation((uri: { fsPath: string }) =>
      path.basename(uri.fsPath),
    );

    const usages = await findUsagesForExportNames(new Set(), ["HomeIcon"]);
    expect(usages).toEqual([
      { relativePath: "a.ts", line: 1 },
      { relativePath: "a.ts", line: 2 },
      { relativePath: "b.tsx", line: 1 },
    ]);
    expect(uniqueFileCount(usages)).toBe(2);
  });
});
