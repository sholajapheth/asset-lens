export function getShellHtml(cspSource: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource} https: data:; media-src ${cspSource} https: data: blob:; style-src ${cspSource} 'unsafe-inline'; script-src ${cspSource} 'unsafe-inline';" />
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 8px; font-family: var(--vscode-font-family); font-size: 12px; color: var(--vscode-foreground); background: var(--vscode-sideBar-background); }
    .hidden { display: none !important; }
    .toolbar { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; align-items: center; }
    .toolbar label { opacity: 0.9; }
    input[type="search"] {
      flex: 1; min-width: 120px;
      background: var(--vscode-input-background); color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border); border-radius: 4px; padding: 4px 8px;
    }
    select {
      background: var(--vscode-dropdown-background); color: var(--vscode-dropdown-foreground);
      border: 1px solid var(--vscode-dropdown-border); padding: 4px 8px; border-radius: 4px; max-width: 100%;
    }
    .status-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; align-items: center; }
    .pill {
      display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 999px;
      border: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.35)); cursor: pointer;
      background: var(--vscode-button-secondaryBackground, rgba(128,128,128,0.15)); user-select: none;
    }
    .pill.active { outline: 1px solid var(--vscode-focusBorder); background: var(--vscode-list-activeSelectionBackground, rgba(80,120,200,0.25)); }
    .summary { font-size: 11px; opacity: 0.9; margin-bottom: 10px; line-height: 1.4; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 8px; }
    .card {
      position: relative; border: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.35)); border-radius: 6px; overflow: hidden;
      cursor: pointer; background: var(--vscode-editor-background); transition: outline 0.12s ease;
    }
    .card:hover { outline: 1px solid var(--vscode-focusBorder); }
    .dot { position: absolute; top: 6px; right: 6px; width: 10px; height: 10px; border-radius: 50%; border: 1px solid rgba(0,0,0,0.35); z-index: 2; }
    .dot.green { background: #3fb950; }
    .dot.amber { background: #d4a72c; }
    .dot.red { background: #f85149; }
    .thumb { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; background: var(--vscode-input-background, rgba(0,0,0,0.2)); overflow: hidden; }
    .thumb img, .thumb video { max-width: 100%; max-height: 100%; object-fit: contain; }
    .thumb .placeholder { font-size: 28px; opacity: 0.65; user-select: none; }
    .meta { padding: 6px 8px; line-height: 1.25; word-break: break-word; }
    .name { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .badge { font-size: 10px; opacity: 0.75; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 4px; }
    .empty { padding: 16px; opacity: 0.85; line-height: 1.5; }
    .detail-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
    .detail-header button { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: 1px solid var(--vscode-widget-border); padding: 4px 10px; border-radius: 4px; cursor: pointer; }
    .detail-preview { max-height: 220px; display: flex; align-items: center; justify-content: center; background: var(--vscode-editor-background); border-radius: 8px; margin-bottom: 12px; overflow: hidden; }
    .detail-preview img, .detail-preview video { max-width: 100%; max-height: 220px; object-fit: contain; }
    .section { margin-bottom: 14px; }
    .section h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.8; margin: 0 0 6px 0; }
    .row { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px; font-size: 12px; line-height: 1.4; }
    .row .dot-inline { width: 10px; height: 10px; border-radius: 50%; margin-top: 3px; flex-shrink: 0; }
    .copy-box {
      font-family: var(--vscode-editor-font-family); font-size: 11px; padding: 8px; border-radius: 6px;
      background: var(--vscode-textCodeBlock-background); border: 1px solid var(--vscode-widget-border); cursor: pointer; word-break: break-all;
    }
    .usage-list { max-height: 160px; overflow: auto; border: 1px solid var(--vscode-widget-border); border-radius: 6px; }
    .usage-item { padding: 6px 8px; border-bottom: 1px solid var(--vscode-widget-border); cursor: pointer; font-size: 11px; }
    .usage-item:last-child { border-bottom: none; }
    .usage-item:hover { background: var(--vscode-list-hoverBackground); }
    .spinner { width: 14px; height: 14px; border: 2px solid var(--vscode-progressBar-background); border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; display: inline-block; vertical-align: middle; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .btn-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
    .btn { padding: 6px 12px; border-radius: 4px; border: 1px solid var(--vscode-button-border); cursor: pointer; font-size: 12px; }
    .btn.primary { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
    .btn.secondary { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
  </style>
</head>
<body>
  <div id="loading" class="empty hidden">Loading assets…</div>
  <div id="error" class="empty hidden"></div>
  <div id="main" class="hidden">
    <div class="toolbar">
      <label for="search">Search</label>
      <input type="search" id="search" placeholder="Filter by filename…" />
    </div>
    <div class="toolbar">
      <label for="filterType">Type</label>
      <select id="filterType" aria-label="Filter by type">
        <option value="all">All</option>
        <option value="image">Images</option>
        <option value="vector">Vectors &amp; PDF</option>
        <option value="video">Videos</option>
      </select>
    </div>
    <div class="status-row" id="statusRow">
      <span class="pill" data-status="all">All</span>
      <span class="pill" data-status="exported">✓ Exported</span>
      <span class="pill" data-status="unused">⚠ Unused</span>
      <span class="pill" data-status="missing">✗ Missing</span>
    </div>
    <div class="summary" id="summary"></div>
    <div id="view-grid">
      <div id="root"></div>
    </div>
    <div id="view-detail" class="hidden">
      <div class="detail-header">
        <button type="button" id="btnBack">← Back</button>
      </div>
      <div class="detail-preview" id="detailPreview"></div>
      <div class="section">
        <div id="detailTitle" style="font-weight:600;font-size:13px;margin-bottom:4px;"></div>
        <div id="detailSub" style="opacity:0.85;font-size:11px;"></div>
      </div>
      <div class="section">
        <h3>Status</h3>
        <div class="row" id="rowExport"></div>
        <div class="row" id="rowUsage"></div>
      </div>
      <div class="section hidden" id="secImport">
        <h3>Import</h3>
        <div class="copy-box" id="copyImport"></div>
      </div>
      <div class="section" id="secUsages">
        <h3>Usages</h3>
        <div id="usageSpinner" class="hidden"><span class="spinner"></span> Scanning…</div>
        <div id="usageList" class="usage-list hidden"></div>
        <div id="usageNone" class="hidden" style="opacity:0.85;font-size:11px;">Not found in codebase.</div>
      </div>
      <div class="section">
        <h3>Actions</h3>
        <div class="btn-row">
          <button type="button" class="btn primary hidden" id="btnAddIndex">+ Add to index.ts</button>
          <button type="button" class="btn secondary" id="btnOpenFile">Open File</button>
        </div>
      </div>
    </div>
  </div>
  <script>
(function () {
  const vscode = acquireVsCodeApi();
  /** @type {any[]} */
  let allAssets = [];
  let filterType = 'all';
  let filterStatus = 'all';
  let searchQuery = '';
  /** @type {any | null} */
  let detailAsset = null;
  let usagesPending = false;
  let pillsBound = false;

  const el = (id) => document.getElementById(id);

  function assetMatchesType(a, ft) {
    if (ft === 'all') return true;
    if (ft === 'image') return a.type === 'image' || a.type === 'gif';
    if (ft === 'vector') return a.type === 'vector';
    if (ft === 'video') return a.type === 'video';
    return true;
  }

  function assetMatchesStatus(a, fs) {
    if (fs === 'all') return true;
    const exported = !!a.isExported;
    const uc = a.usageCount;
    if (fs === 'exported') return exported;
    if (fs === 'missing') return !exported;
    if (fs === 'unused') return exported && uc === 0;
    return true;
  }

  function assetMatchesSearch(a) {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (a.name || '').toLowerCase().includes(q);
  }

  function filteredAssets() {
    return allAssets.filter((a) =>
      assetMatchesType(a, filterType) &&
      assetMatchesStatus(a, filterStatus) &&
      assetMatchesSearch(a)
    );
  }

  function dotClass(a) {
    if (!a.isExported) return 'red';
    if (a.usageCount > 0) return 'green';
    return 'amber';
  }

  function updateSummary() {
    const pool = filteredAssets();
    const total = pool.length;
    const exported = pool.filter((x) => x.isExported).length;
    const missing = pool.filter((x) => !x.isExported).length;
    const unused = pool.filter((x) => x.isExported && x.usageCount === 0).length;
    el('summary').textContent = total + ' assets · ' + exported + ' exported · ' + unused + ' unused · ' + missing + ' missing';
  }

  function renderGrid() {
    const root = el('root');
    const list = filteredAssets();
    if (!list.length) {
      root.innerHTML = '<div class="empty">No matching assets.</div>';
      return;
    }
    const grid = document.createElement('div');
    grid.className = 'grid';
    for (const e of list) {
      const card = document.createElement('div');
      card.className = 'card';
      card.dataset.path = e.relativePath;
      const dot = document.createElement('span');
      dot.className = 'dot ' + dotClass(e);
      card.appendChild(dot);

      const thumb = document.createElement('div');
      thumb.className = 'thumb';
      const kind = e.type;
      if (kind === 'image' || kind === 'gif' || kind === 'vector') {
        const img = document.createElement('img');
        img.src = e.webviewUri;
        img.alt = '';
        img.loading = 'lazy';
        img.onerror = () => { thumb.innerHTML = '<span class="placeholder">◇</span>'; };
        thumb.appendChild(img);
      } else if (kind === 'video') {
        const v = document.createElement('video');
        v.src = e.webviewUri;
        v.muted = true;
        v.playsInline = true;
        v.preload = 'metadata';
        thumb.appendChild(v);
      } else if (kind === 'font' || kind === 'base64') {
        thumb.innerHTML = '<span class="placeholder">A</span>';
      } else {
        thumb.innerHTML = '<span class="placeholder">◆</span>';
      }

      const meta = document.createElement('div');
      meta.className = 'meta';
      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = e.name;
      const badge = document.createElement('div');
      badge.className = 'badge';
      badge.textContent = e.type;
      meta.appendChild(name);
      meta.appendChild(badge);

      card.appendChild(thumb);
      card.appendChild(meta);
      card.addEventListener('click', () => openDetail(e));
      grid.appendChild(card);
    }
    root.innerHTML = '';
    root.appendChild(grid);
  }

  function openDetail(a) {
    detailAsset = a;
    el('view-grid').classList.add('hidden');
    el('view-detail').classList.remove('hidden');
    usagesPending = false;

    const prev = el('detailPreview');
    prev.innerHTML = '';
    const kind = a.type;
    if (kind === 'image' || kind === 'gif' || kind === 'vector') {
      const img = document.createElement('img');
      img.src = a.webviewUri;
      img.alt = '';
      prev.appendChild(img);
    } else if (kind === 'video') {
      const v = document.createElement('video');
      v.src = a.webviewUri;
      v.controls = true;
      v.preload = 'metadata';
      prev.appendChild(v);
    } else {
      prev.innerHTML = '<div class="placeholder" style="padding:24px;">◇</div>';
    }

    el('detailTitle').textContent = a.name;
    const kb = a.sizeBytes >= 1024 ? (a.sizeBytes / 1024).toFixed(1) + ' KB' : a.sizeBytes + ' B';
    el('detailSub').textContent = a.folderName + ' · ' + kb;

    const dE = document.createElement('span');
    dE.className = 'dot-inline ' + dotClass(a);
    el('rowExport').innerHTML = '';
    el('rowExport').appendChild(dE);
    const txtE = document.createElement('span');
    if (a.isExported && a.exportName) {
      txtE.textContent = 'Exported as "' + a.exportName + '"';
    } else {
      txtE.textContent = 'Not in index.ts';
    }
    el('rowExport').appendChild(txtE);

    el('rowUsage').innerHTML = '';
    const dU = document.createElement('span');
    dU.className = 'dot-inline ' + (a.isExported ? (a.usageCount > 0 ? 'green' : 'amber') : 'red');
    el('rowUsage').appendChild(dU);
    const txtU = document.createElement('span');
    if (!a.isExported) {
      txtU.textContent = 'Usage not scanned (not exported)';
    } else if (a.usageCount < 0) {
      txtU.textContent = 'Usage not yet loaded';
    } else if (a.usageCount === 0) {
      txtU.textContent = 'Not found in codebase';
    } else {
      txtU.textContent = 'Used in ' + a.usageCount + ' file(s)';
    }
    el('rowUsage').appendChild(txtU);

    const secImport = el('secImport');
    const copyBox = el('copyImport');
    if (a.isExported && a.importLine) {
      secImport.classList.remove('hidden');
      copyBox.textContent = a.importLine;
      copyBox.onclick = () => vscode.postMessage({ command: 'copyImport', text: a.importLine });
    } else {
      secImport.classList.add('hidden');
    }

    el('btnAddIndex').classList.toggle('hidden', !!a.isExported);
    el('usageList').classList.add('hidden');
    el('usageNone').classList.add('hidden');
    el('usageSpinner').classList.add('hidden');

    if (a.isExported && (a.exportNames && a.exportNames.length)) {
      el('usageSpinner').classList.remove('hidden');
      usagesPending = true;
      vscode.postMessage({
        command: 'getUsages',
        exportNames: a.exportNames,
        relativePath: a.relativePath
      });
    } else {
      el('usageNone').classList.remove('hidden');
      el('usageNone').textContent = 'Not exported — usage scan skipped.';
    }
  }

  function closeDetail() {
    el('view-detail').classList.add('hidden');
    el('view-grid').classList.remove('hidden');
    detailAsset = null;
    renderGrid();
  }

  function bindPills() {
    if (pillsBound) return;
    pillsBound = true;
    el('statusRow').addEventListener('click', (ev) => {
      const p = ev.target && ev.target.closest && ev.target.closest('.pill');
      if (!p) return;
      filterStatus = p.getAttribute('data-status') || 'all';
      document.querySelectorAll('.pill').forEach((x) => x.classList.toggle('active', x === p));
      updateSummary();
      renderGrid();
    });
    document.querySelector('.pill[data-status="all"]').classList.add('active');
  }

  el('filterType').addEventListener('change', () => {
    filterType = el('filterType').value;
    renderGrid();
    updateSummary();
  });
  el('search').addEventListener('input', () => {
    searchQuery = el('search').value || '';
    updateSummary();
    renderGrid();
  });
  el('btnBack').addEventListener('click', closeDetail);
  el('btnOpenFile').addEventListener('click', () => {
    if (detailAsset) vscode.postMessage({ command: 'openFile', path: detailAsset.absolutePath });
  });
  el('btnAddIndex').addEventListener('click', () => {
    if (!detailAsset) return;
    vscode.postMessage({
      command: 'addToIndex',
      folderAbsPath: detailAsset.folderAbsPath,
      nameWithoutExt: detailAsset.nameWithoutExt,
      ext: detailAsset.ext
    });
  });

  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (!msg || !msg.command) return;
    if (msg.command === 'loading') {
      el('loading').classList.remove('hidden');
      el('main').classList.add('hidden');
      el('error').classList.add('hidden');
      return;
    }
    if (msg.command === 'error') {
      el('loading').classList.add('hidden');
      el('main').classList.add('hidden');
      el('error').classList.remove('hidden');
      el('error').textContent = msg.message || 'Error';
      return;
    }
    if (msg.command === 'assetsLoaded') {
      el('loading').classList.add('hidden');
      el('error').classList.add('hidden');
      el('main').classList.remove('hidden');
      allAssets = [];
      for (const f of msg.folders || []) {
        for (const a of f.assets || []) allAssets.push(a);
      }
      updateSummary();
      bindPills();
      renderGrid();
      return;
    }
    if (msg.command === 'usagesLoaded') {
      const target = allAssets.find((x) => x.relativePath === msg.relativePath);
      if (target) {
        target.usages = msg.usages || [];
        if (typeof msg.usageCount === 'number') {
          target.usageCount = msg.usageCount;
        }
      }
      if (detailAsset && detailAsset.relativePath === msg.relativePath) {
        usagesPending = false;
        el('usageSpinner').classList.add('hidden');
        const list = msg.usages || [];
        if (!list.length) {
          el('usageNone').classList.remove('hidden');
          el('usageList').classList.add('hidden');
        } else {
          el('usageNone').classList.add('hidden');
          const ul = el('usageList');
          ul.innerHTML = '';
          list.forEach((u) => {
            const row = document.createElement('div');
            row.className = 'usage-item';
            row.textContent = u.relativePath + ':' + u.line;
            row.addEventListener('click', () => {
              vscode.postMessage({ command: 'openUsage', path: u.relativePath, line: u.line });
            });
            ul.appendChild(row);
          });
          ul.classList.remove('hidden');
        }
        const dU = el('rowUsage').querySelector('.dot-inline');
        if (dU && target) {
          dU.className = 'dot-inline ' + (target.usageCount > 0 ? 'green' : 'amber');
        }
        const txt = el('rowUsage').querySelector('span:last-child');
        if (txt && target) {
          txt.textContent = target.usageCount > 0
            ? ('Used in ' + target.usageCount + ' file(s)')
            : 'Not found in codebase';
        }
      }
      renderGrid();
      updateSummary();
      return;
    }
  });

  vscode.postMessage({ command: 'ready' });
})();
  </script>
</body>
</html>`;
}
