import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockWorkspace, mockUri } = vi.hoisted(() => ({
  mockWorkspace: {
    getConfiguration: vi.fn(),
    workspaceFolders: [] as Array<{ uri: { fsPath: string } }>,
  },
  mockUri: {
    file: (fsPath: string) => ({ fsPath }),
  },
}));

vi.mock("vscode", () => ({
  workspace: mockWorkspace,
  Uri: mockUri,
}));

import { getDiscoveryScopeUris, scopeDescription } from "../src/assetScope";

describe("assetScope", () => {
  const tmpDirs: string[] = [];

  beforeEach(() => {
    mockWorkspace.getConfiguration.mockReset();
    mockWorkspace.workspaceFolders = [];
  });

  afterEach(() => {
    for (const d of tmpDirs) {
      fs.rmSync(d, { recursive: true, force: true });
    }
  });

  it("returns null when assetRoot is empty", () => {
    mockWorkspace.getConfiguration.mockReturnValue({
      get: vi.fn().mockReturnValue(""),
    });

    expect(getDiscoveryScopeUris()).toBeNull();
  });

  it("resolves relative assetRoot across workspace folders and de-duplicates", () => {
    const rootA = fs.mkdtempSync(path.join(os.tmpdir(), "asset-lens-scope-a-"));
    const rootB = fs.mkdtempSync(path.join(os.tmpdir(), "asset-lens-scope-b-"));
    tmpDirs.push(rootA, rootB);

    fs.mkdirSync(path.join(rootA, "src/assets"), { recursive: true });
    fs.mkdirSync(path.join(rootB, "src/assets"), { recursive: true });

    mockWorkspace.getConfiguration.mockReturnValue({
      get: vi.fn().mockReturnValue("src/assets"),
    });
    mockWorkspace.workspaceFolders = [
      { uri: { fsPath: rootA } },
      { uri: { fsPath: rootB } },
    ];

    const out = getDiscoveryScopeUris();
    expect(out?.map((u) => u.fsPath).sort()).toEqual(
      [path.join(rootA, "src/assets"), path.join(rootB, "src/assets")].sort(),
    );
  });

  it("supports absolute assetRoot and scopeDescription variants", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "asset-lens-scope-c-"));
    tmpDirs.push(root);

    mockWorkspace.getConfiguration.mockReturnValue({
      get: vi.fn().mockReturnValue(root),
    });
    mockWorkspace.workspaceFolders = [{ uri: { fsPath: root } }];

    const out = getDiscoveryScopeUris();
    expect(out?.length).toBe(1);
    expect(scopeDescription(null)).toBe("Workspace");
    expect(scopeDescription(out ?? null)).toBe(root);
    expect(
      scopeDescription([{ fsPath: "a" } as any, { fsPath: "b" } as any]),
    ).toBe("2 folders");
  });
});
