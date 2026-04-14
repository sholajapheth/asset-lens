import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { parseBarrelFile } from "../src/parseBarrel";

function mapToObj(m: Map<string, string[]>): Record<string, string[]> {
  return Object.fromEntries(
    [...m.entries()].map(([k, v]) => [k, [...v].sort()]),
  );
}

describe("parseBarrelFile", () => {
  const tmpDirs: string[] = [];

  afterEach(() => {
    for (const d of tmpDirs) {
      fs.rmSync(d, { recursive: true, force: true });
    }
  });

  it("extracts default-as, named exports, require and import-export patterns", () => {
    const content = `
      export { default as MtnLogo } from './mtn-logo.png';
      export { MtnLogoLarge as MtnLogoLargeAlias, MtnLogoMini } from './mtn-logo.png';
      export const StripeLogo = require('./stripe-logo.svg');
      import AppleLogo from './apple-logo.pdf';
      export { AppleLogo };
    `;

    const out = parseBarrelFile("/tmp/assets", content);
    const obj = mapToObj(out);

    expect(obj["mtn-logo"]).toEqual([
      "MtnLogo",
      "MtnLogoLargeAlias",
      "MtnLogoMini",
    ]);
    expect(obj["stripe-logo"]).toEqual(["StripeLogo"]);
    expect(obj["apple-logo"]).toEqual(["AppleLogo"]);
  });

  it("resolves export-star recursion and avoids infinite loops", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "asset-lens-barrel-"));
    tmpDirs.push(root);

    const iconsDir = path.join(root, "icons");
    const sharedDir = path.join(root, "shared");
    fs.mkdirSync(iconsDir, { recursive: true });
    fs.mkdirSync(sharedDir, { recursive: true });

    fs.writeFileSync(
      path.join(iconsDir, "index.ts"),
      "export { default as HomeIcon } from './home.svg';\nexport * from '../shared';\n",
      "utf8",
    );
    fs.writeFileSync(
      path.join(sharedDir, "index.ts"),
      "export { default as CommonIcon } from './common.svg';\nexport * from '../icons';\n",
      "utf8",
    );

    const rootContent = "export * from './icons';";
    const out = parseBarrelFile(root, rootContent);
    const obj = mapToObj(out);

    expect(obj["home"]).toEqual(["HomeIcon"]);
    expect(obj["common"]).toEqual(["CommonIcon"]);
  });
});
