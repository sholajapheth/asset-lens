import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { getDiscoveryScopeUris, scopeDescription } from "./assetScope";
import { computeImportModuleSpecifier } from "./importPath";
import { buildAssetFolders } from "./loadAssets";
import { toPascalCase } from "./pascal";
import type { WebviewAsset, WebviewFolder, WebviewToExt } from "./types";
import {
  buildBarrelIndexSkipSet,
  computeAssetUsageCounts,
  findUsagesForExportNames,
  uniqueFileCount,
} from "./usageScan";
import { getShellHtml } from "./webviewHtml";

export function activate(context: vscode.ExtensionContext) {
  const provider = new AssetLensViewProvider(context.extensionUri);

  const debounced = debounce(() => provider.refresh(), 400);
  context.subscriptions.push(
    vscode.workspace.onDidCreateFiles(debounced),
    vscode.workspace.onDidDeleteFiles(debounced),
    vscode.workspace.onDidRenameFiles(debounced)
  );
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((doc) => {
      if (path.basename(doc.fileName) === "index.ts") {
        debounced();
      }
    })
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      AssetLensViewProvider.viewType,
      provider,
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("assetLens.refresh", () => provider.refresh())
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("assetLens")) {
        provider.refresh();
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => provider.refresh())
  );
}

class AssetLensViewProvider implements vscode.WebviewViewProvider {
  static readonly viewType = "assetLens.gallery";

  private _view?: vscode.WebviewView;
  private readonly _extensionUri: vscode.Uri;
  private _barrelSkip = new Set<string>();

  constructor(extensionUri: vscode.Uri) {
    this._extensionUri = extensionUri;
  }

  refresh(): void {
    void this._loadAndPush();
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, "media"),
        ...(vscode.workspace.workspaceFolders?.map((f) => f.uri) ?? []),
      ],
    };

    webviewView.webview.html = getShellHtml(webviewView.webview.cspSource);

    webviewView.webview.onDidReceiveMessage((msg: WebviewToExt) =>
      this._onMessage(webviewView.webview, msg)
    );
  }

  private async _onMessage(
    webview: vscode.Webview,
    msg: WebviewToExt
  ): Promise<void> {
    switch (msg.command) {
      case "ready":
      case "refresh":
        await this._loadAndPush();
        return;
      case "getUsages": {
        const usages = await findUsagesForExportNames(
          this._barrelSkip,
          msg.exportNames
        );
        const usageCount = uniqueFileCount(usages);
        webview.postMessage({
          command: "usagesLoaded",
          relativePath: msg.relativePath,
          usages,
          usageCount,
        });
        return;
      }
      case "addToIndex": {
        try {
          await addToIndexLine(
            msg.folderAbsPath,
            msg.nameWithoutExt,
            msg.ext
          );
          vscode.window.showInformationMessage("Added export to index.ts.");
        } catch (e) {
          vscode.window.showErrorMessage(
            `Could not update index.ts: ${String(e)}`
          );
        }
        await this._loadAndPush();
        return;
      }
      case "openFile": {
        const uri = vscode.Uri.file(msg.path);
        await vscode.commands.executeCommand("vscode.open", uri);
        return;
      }
      case "copyImport": {
        await vscode.env.clipboard.writeText(msg.text);
        vscode.window.setStatusBarMessage("Copied import to clipboard.", 2000);
        return;
      }
      case "openUsage": {
        const rel = msg.path.replace(/\\/g, "/");
        let target: vscode.Uri | undefined;
        for (const folder of vscode.workspace.workspaceFolders ?? []) {
          const candidate = vscode.Uri.joinPath(folder.uri, rel);
          if (fs.existsSync(candidate.fsPath)) {
            target = candidate;
            break;
          }
        }
        if (!target) {
          vscode.window.showWarningMessage(`Could not open: ${msg.path}`);
          return;
        }
        const doc = await vscode.workspace.openTextDocument(target);
        const pos = new vscode.Position(Math.max(0, msg.line - 1), 0);
        await vscode.window.showTextDocument(doc, {
          selection: new vscode.Range(pos, pos),
        });
        return;
      }
      default:
        return;
    }
  }

  private async _loadAndPush(): Promise<void> {
    const view = this._view;
    if (!view) {
      return;
    }
    const webview = view.webview;

    webview.postMessage({ command: "loading" });

    const folders = vscode.workspace.workspaceFolders;
    if (!folders?.length) {
      webview.postMessage({
        command: "error",
        message: "Open a folder or workspace to use Asset Lens.",
      });
      return;
    }

    const scopeUris = getDiscoveryScopeUris();
    const flatFolders = await buildAssetFolders(webview, scopeUris);

    if (!flatFolders.length) {
      const hint =
        scopeUris?.length
          ? "No asset files found under the configured assetLens.assetRoot path."
          : "No asset files found in the workspace (images, SVGs, videos, fonts, etc.).";
      webview.postMessage({
        command: "error",
        message: `${hint} Add files or adjust assetLens.assetRoot in settings.`,
      });
      return;
    }

    this._barrelSkip = buildBarrelIndexSkipSet(flatFolders);
    this._attachImportLines(flatFolders);

    const flat: WebviewAsset[] = [];
    for (const f of flatFolders) {
      for (const a of f.assets) {
        flat.push(a);
      }
    }
    await computeAssetUsageCounts(this._barrelSkip, flat);

    webview.postMessage({
      command: "assetsLoaded",
      folders: flatFolders,
      assetRoot: scopeDescription(scopeUris),
    });
  }

  private _attachImportLines(folders: WebviewFolder[]): void {
    const specCache = new Map<string, string>();
    for (const f of folders) {
      const folderUri = vscode.Uri.file(f.absolutePath);
      const wf = vscode.workspace.getWorkspaceFolder(folderUri);
      if (!wf) {
        continue;
      }
      let spec = specCache.get(f.absolutePath);
      if (!spec) {
        spec = computeImportModuleSpecifier(wf, f.absolutePath);
        specCache.set(f.absolutePath, spec);
      }
      for (const a of f.assets) {
        if (a.isExported && a.exportName) {
          a.importLine = `import { ${a.exportName} } from '${spec}';`;
        }
      }
    }
  }
}

async function addToIndexLine(
  folderAbsPath: string,
  nameWithoutExt: string,
  ext: string
): Promise<void> {
  const indexPath = path.join(folderAbsPath, "index.ts");
  const extLower = ext.toLowerCase();
  const fileName = `${nameWithoutExt}.${ext}`;
  const line =
    extLower === "ts"
      ? `export * from './${nameWithoutExt}';`
      : `export { default as ${toPascalCase(
          nameWithoutExt
        )} } from './${fileName}';`;

  let prev = "";
  if (fs.existsSync(indexPath)) {
    prev = fs.readFileSync(indexPath, "utf8");
    if (prev.length && !prev.endsWith("\n")) {
      prev += "\n";
    }
  }
  fs.writeFileSync(indexPath, prev + line + "\n", "utf8");
}

function debounce(fn: () => void, ms: number): () => void {
  let t: ReturnType<typeof setTimeout> | undefined;
  return () => {
    if (t) {
      clearTimeout(t);
    }
    t = setTimeout(() => {
      t = undefined;
      fn();
    }, ms);
  };
}

export function deactivate(): void {}
