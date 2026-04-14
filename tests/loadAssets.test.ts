import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockWorkspace } = vi.hoisted(() => ({
  mockWorkspace: {
    findFiles: vi.fn(),
    asRelativePath: vi.fn(),
  },
}));

vi.mock("vscode", () => ({
  workspace: mockWorkspace,
  RelativePattern: class RelativePattern {
    constructor(
      public base: unknown,
      public pattern: string,
    ) {}
  },
  Uri: {
    file: (fsPath: string) => ({ fsPath }),
  },
}));

import { GLOB_ASSETS, buildAssetFolders } from "../src/loadAssets";

describe("loadAssets hardening", () => {
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

  it("glob includes common asset extensions and excludes source code extensions", () => {
    expect(GLOB_ASSETS).toContain("png");
    expect(GLOB_ASSETS).toContain("mp3");
    expect(GLOB_ASSETS).not.toContain(".dart");
    expect(GLOB_ASSETS).not.toContain(".ts");
  });

  it("filters out non-asset files defensively even if they are returned", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "asset-lens-load-"));
    tmpDirs.push(root);

    const assetsDir = path.join(root, "src", "assets");
    fs.mkdirSync(assetsDir, { recursive: true });

    const pngPath = path.join(assetsDir, "logo.png");
    const dartPath = path.join(assetsDir, "theme.dart");
    const tsPath = path.join(assetsDir, "inline.ts");
    const fakeDirPng = path.join(assetsDir, "folder.png");

    fs.writeFileSync(pngPath, "png-bytes", "utf8");
    fs.writeFileSync(dartPath, "class Theme {}", "utf8");
    fs.writeFileSync(tsPath, "export const x = 1;", "utf8");
    fs.mkdirSync(fakeDirPng);

    mockWorkspace.findFiles.mockResolvedValue([
      { fsPath: pngPath },
      { fsPath: dartPath },
      { fsPath: tsPath },
      { fsPath: fakeDirPng },
    ]);

    mockWorkspace.asRelativePath.mockImplementation((uri: { fsPath: string }) =>
      path.relative(root, uri.fsPath).split(path.sep).join("/"),
    );

    const webview = {
      asWebviewUri: (uri: { fsPath: string }) => ({
        toString: () => `webview:${uri.fsPath}`,
      }),
    } as any;

    const folders = await buildAssetFolders(webview, null);
    const allNames = folders.flatMap((f) => f.assets.map((a) => a.name));

    expect(allNames).toEqual(["logo.png"]);
  });
});
