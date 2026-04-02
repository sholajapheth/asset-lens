export interface AssetUsage {
  relativePath: string;
  line: number;
}

export interface WebviewAsset {
  name: string;
  nameWithoutExt: string;
  ext: string;
  absolutePath: string;
  folderAbsPath: string;
  relativePath: string;
  folderName: string;
  type: string;
  sizeBytes: number;
  webviewUri: string;
  isExported: boolean;
  exportName?: string;
  exportNames?: string[];
  /** -1 = not yet checked (detail or batch), 0+ = known count */
  usageCount: number;
  usages: AssetUsage[];
  /** Precomputed when exported: import { X } from '...'; */
  importLine?: string;
}

export interface WebviewFolder {
  name: string;
  absolutePath: string;
  assets: WebviewAsset[];
}

export type WebviewToExt =
  | { command: "ready" }
  | { command: "refresh" }
  | {
      command: "getUsages";
      exportNames: string[];
      relativePath: string;
    }
  | {
      command: "addToIndex";
      folderAbsPath: string;
      nameWithoutExt: string;
      ext: string;
    }
  | { command: "openFile"; path: string }
  | { command: "copyImport"; text: string }
  | { command: "openUsage"; path: string; line: number };

export type ExtToWebview =
  | { command: "loading" }
  | { command: "assetsLoaded"; folders: WebviewFolder[]; assetRoot: string }
  | {
      command: "usagesLoaded";
      relativePath: string;
      usages: AssetUsage[];
      usageCount: number;
    }
  | { command: "error"; message: string };
