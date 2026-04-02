export function toPascalCase(nameWithoutExt: string): string {
  const s = nameWithoutExt.replace(/[^a-zA-Z0-9]+/g, " ").trim();
  if (!s) {
    return "Asset";
  }
  return s
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");
}
