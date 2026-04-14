import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockWorkspace } = vi.hoisted(() => ({
  mockWorkspace: {
    getConfiguration: vi.fn(),
  },
}));

vi.mock("vscode", () => ({
  workspace: mockWorkspace,
}));

import { computeImportModuleSpecifier } from "../src/importPath";

describe("computeImportModuleSpecifier", () => {
  const tmpDirs: string[] = [];

  beforeEach(() => {
    mockWorkspace.getConfiguration.mockReset();
  });

  afterEach(() => {
    for (const d of tmpDirs) {
      fs.rmSync(d, { recursive: true, force: true });
    }
  });

  it("uses manual importPrefix and assets segment when available", () => {
    mockWorkspace.getConfiguration.mockReturnValue({
      get: vi.fn().mockReturnValue("@/assets"),
    });

    const workspaceFolder = { uri: { fsPath: "/repo" } } as any;
    const out = computeImportModuleSpecifier(
      workspaceFolder,
      "/repo/src/assets/icons",
    );

    expect(out).toBe("@/assets/icons");
  });

  it("reads paths from JSONC tsconfig (comments + trailing commas)", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "asset-lens-import-"));
    tmpDirs.push(root);

    fs.writeFileSync(
      path.join(root, "tsconfig.json"),
      `{
        // test comment
        "compilerOptions": {
          "paths": {
            "@assets/*": ["src/assets/*",],
          },
        },
      }`,
      "utf8",
    );

    mockWorkspace.getConfiguration.mockReturnValue({
      get: vi.fn().mockReturnValue(""),
    });

    const workspaceFolder = { uri: { fsPath: root } } as any;
    const out = computeImportModuleSpecifier(
      workspaceFolder,
      path.join(root, "src/assets/icons"),
    );

    expect(out).toBe("@assets/icons");
  });

  it("falls back to src -> @/ heuristic when no paths are present", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "asset-lens-import-"));
    tmpDirs.push(root);

    fs.writeFileSync(path.join(root, "tsconfig.json"), "{}", "utf8");

    mockWorkspace.getConfiguration.mockReturnValue({
      get: vi.fn().mockReturnValue(""),
    });

    const workspaceFolder = { uri: { fsPath: root } } as any;
    const out = computeImportModuleSpecifier(
      workspaceFolder,
      path.join(root, "src/assets/icons"),
    );

    expect(out).toBe("@/assets/icons");
  });
});
