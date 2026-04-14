import { describe, expect, it } from "vitest";
import { toPascalCase } from "../src/pascal";

describe("toPascalCase", () => {
  it("converts kebab and snake to pascal", () => {
    expect(toPascalCase("mtn-logo_icon")).toBe("MtnLogoIcon");
  });

  it("normalizes mixed case and symbols", () => {
    expect(toPascalCase("  USER@avatar--2x ")).toBe("UserAvatar2x");
  });

  it("falls back to Asset for empty-like values", () => {
    expect(toPascalCase("---___***")).toBe("Asset");
  });
});
