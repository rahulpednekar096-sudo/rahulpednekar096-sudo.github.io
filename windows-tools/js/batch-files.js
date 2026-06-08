/**
 * BatchFileQueue & BatchProcessor
 * Shared multi-file selection and batch processing for RDroid Windows Tools.
 */
(function (global) {
  'use strict';

  /** Default batch limits — override per tool via BatchFileQueue options if needed */
  const BATCH_LIMITS = {
    maxFiles: 50,
    warnAt: 25,
    thumbnailMax: 20
  };

  function uid() {
    return Math.random().toString(36).slice(2, 11);
  }

  function formatSize(bytes) {
    if (!bytes && bytes !== 0) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function matchesAccept(file, accept) {
    if (!accept) return true;
    if (typeof accept === 'function') return accept(file);
    const parts = accept.split(',').map(s => s.trim()).filter(Boolean);
    if (!parts.length) return true;
    const name = (file.name || '').toLowerCase();
    const type = (file.type || '').toLowerCase();
    return parts.some(part => {
      if (part.startsWith('.')) return name.endsWith(part.toLowerCase());
      if (part.endsWith('/*')) {
        const prefix = part.slice(0, -1);
        return type.startsWith(prefix);
      }
      return type === part.toLowerCase();
    });
  }

  class BatchFileQueue {
    /**
     * @param {Object} options
     * @param {HTMLInputElement} options.fileInput
     * @param {HTMLElement} [options.dropArea]
     * @param {HTMLElement} [options.pickBtn]
     * @param {HTMLElement} [options.listContainer] - auto-created if omitted
     * @param {string|function} [options.accept]
     * @param {boolean} [options.append=true]
     * @param {boolean} [options.interactive=false] - click row to set active file
     * @param {boolean} [options.showThumbnails=false]
     * @param {boolean} [options.allowReorder=false]
     * @param {number} [options.maxFiles=50]
     * @param {number} [options.warnAt=25]
     * @param {number} [options.thumbnailMax=20]
     * @param {function} [options.onChange]
     * @param {function} [options.onActiveChange]
     * @param {function} [options.onSkip] - (file, reason) => void
     */
    constructor(options = {}) {
      this.fileInput = options.fileInput || null;
      this.dropArea = options.dropArea || null;
      this.pickBtn = options.pickBtn || null;
      this.listContainer = options.listContainer || null;
      this.accept = options.accept || null;
      this.append = options.append !== false;
      this.interactive = !!options.interactive;
      this._wantThumbnails = !!options.showThumbnails;
      this.maxFiles = options.maxFiles ?? BATCH_LIMITS.maxFiles;
      this.warnAt = options.warnAt ?? BATCH_LIMITS.warnAt;
      this.thumbnailMax = options.thumbnailMax ?? BATCH_LIMITS.thumbnailMax;
      this.allowReorder = !!options.allowReorder;
      this.onChange = options.onChange || (() => {});
      this.onActiveChange = options.onActiveChange || (() => {});
      this.onSkip = options.onSkip || (() => {});

      /** @type {{ id: string, file: File, status: string, statusMsg: string, thumbUrl: string|null }[]} */
      this._queue = [];
      this._activeId = null;
      this._thumbUrls = new Map();
      this._bound = false;

      this._ensureListContainer();
      this._bindEvents();
    }

    get files() {
      return this._queue.map(e => e.file);
    }

    get entries() {
      return this._queue.slice();
    }

    get count() {
      return this._queue.length;
    }

    get activeEntry() {
      if (!this._queue.length) return null;
      return this._queue.find(e => e.id === this._activeId) || this._queue[0];
    }

    get activeFile() {
      return this.activeEntry ? this.activeEntry.file : null;
    }

    get activeIndex() {
      const entry = this.activeEntry;
      if (!entry) return -1;
      return this._queue.findIndex(e => e.id === entry.id);
    }

    _ensureListContainer() {
      if (this.listContainer) return;
      const anchor = this.dropArea || this.fileInput;
      if (!anchor || !anchor.parentNode) return;
      const div = document.createElement('div');
      div.className = 'files-list batch-files-list';
      div.id = 'batchFilesList';
      div.setAttribute('aria-live', 'polite');
      anchor.parentNode.insertBefore(div, anchor.nextSibling);
      this.listContainer = div;
    }

    _bindEvents() {
      if (this._bound) return;
      this._bound = true;

      if (this.fileInput) {
        this.fileInput.setAttribute('multiple', '');
        this.fileInput.addEventListener('change', () => {
          if (this.fileInput.files && this.fileInput.files.length) {
            this.addFiles(this.fileInput.files);
            this.fileInput.value = '';
          }
        });
      }

      if (this.pickBtn && this.fileInput) {
        this.pickBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.fileInput.click();
        });
      }

      if (this.dropArea) {
        this.dropArea.addEventListener('dragover', (e) => {
          e.preventDefault();
          this.dropArea.classList.add('dragover');
        });
        this.dropArea.addEventListener('dragleave', () => {
          this.dropArea.classList.remove('dragover');
        });
        this.dropArea.addEventListener('drop', (e) => {
          e.preventDefault();
          this.dropArea.classList.remove('dragover');
          if (e.dataTransfer.files && e.dataTransfer.files.length) {
            this.addFiles(e.dataTransfer.files);
          }
        });
        if (!this.pickBtn) {
          this.dropArea.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            if (this.fileInput) this.fileInput.click();
          });
        }
      }
    }

    /**
     * @param {FileList|File[]} fileList
     * @returns {number} count of files added
     */
    addFiles(fileList) {
      if (!fileList || !fileList.length) return 0;
      if (!this.append) this.clear(false);

      if (this._queue.length >= this.maxFiles) {
        this._alertMaxLimit();
        return 0;
      }

      let added = 0;
      let skippedLimit = 0;
      const arr = Array.from(fileList);

      for (const file of arr) {
        if (this._queue.length >= this.maxFiles) {
          skippedLimit++;
          continue;
        }
        if (!matchesAccept(file, this.accept)) {
          this.onSkip(file, 'type');
          continue;
        }
        const id = uid();
        const entry = {
          id,
          file,
          status: 'pending',
          statusMsg: '',
          thumbUrl: null
        };
        this._queue.push(entry);
        added++;
        this._maybeAttachThumb(entry);
      }

      if (skippedLimit > 0) {
        alert(
          skippedLimit + ' file(s) were not added.\n\n' +
          'Maximum ' + this.maxFiles + ' files allowed per batch to prevent browser hang or crash.\n' +
          'Please process files in smaller groups.'
        );
      }

      this._syncThumbnails();

      if (added && !this._activeId && this._queue.length) {
        this._activeId = this._queue[0].id;
        this.onActiveChange(this.activeEntry);
      }

      this.render();
      this.onChange(this.files);
      return added;
    }

    _alertMaxLimit() {
      alert(
        'Maximum ' + this.maxFiles + ' files allowed per batch.\n\n' +
        'Adding more files can cause the browser to hang or crash.\n' +
        'Remove some files or process in smaller groups.'
      );
    }

    _thumbnailsEnabled() {
      return this._wantThumbnails && this._queue.length <= this.thumbnailMax;
    }

    _maybeAttachThumb(entry) {
      if (!this._thumbnailsEnabled()) return;
      const file = entry.file;
      if (!file.type.startsWith('image/')) return;
      const url = URL.createObjectURL(file);
      entry.thumbUrl = url;
      this._thumbUrls.set(entry.id, url);
    }

    _syncThumbnails() {
      if (this._thumbnailsEnabled()) {
        for (const entry of this._queue) {
          if (!entry.thumbUrl && entry.file.type.startsWith('image/')) {
            this._maybeAttachThumb(entry);
          }
        }
        return;
      }
      for (const entry of this._queue) {
        if (entry.thumbUrl) {
          this._revokeThumb(entry.id);
          entry.thumbUrl = null;
        }
      }
    }

    remove(id) {
      const idx = this._queue.findIndex(e => e.id === id);
      if (idx === -1) return;
      const entry = this._queue[idx];
      this._revokeThumb(entry.id);
      this._queue.splice(idx, 1);

      if (this._activeId === id) {
        this._activeId = this._queue[idx] ? this._queue[idx].id : (this._queue[idx - 1] ? this._queue[idx - 1].id : null);
        this.onActiveChange(this.activeEntry);
      }

      this._syncThumbnails();
      this.render();
      this.onChange(this.files);
    }

    setActive(id) {
      if (!this._queue.some(e => e.id === id)) return;
      this._activeId = id;
      this.render();
      this.onActiveChange(this.activeEntry);
    }

    setStatus(id, status, msg = '') {
      const entry = this._queue.find(e => e.id === id);
      if (!entry) return;
      entry.status = status;
      entry.statusMsg = msg;
      this.render();
    }

    clear(notify = true) {
      for (const entry of this._queue) this._revokeThumb(entry.id);
      this._queue = [];
      this._activeId = null;
      this.render();
      document.querySelectorAll('#batchDownloadArea, .batch-download-area').forEach(el => {
        BatchDownloadUI.clear(el);
      });
      const sharedArea = document.getElementById('downloadArea');
      if (sharedArea && sharedArea.querySelector('.batch-download-panel')) {
        BatchDownloadUI.clear(sharedArea);
      }
      if (notify) {
        this.onChange(this.files);
        this.onActiveChange(null);
      }
    }

    _revokeThumb(id) {
      const url = this._thumbUrls.get(id);
      if (url) {
        URL.revokeObjectURL(url);
        this._thumbUrls.delete(id);
      }
    }

    render() {
      if (!this.listContainer) return;
      this.listContainer.innerHTML = '';

      if (!this._queue.length) {
        this.listContainer.style.display = 'none';
        return;
      }

      this.listContainer.style.display = 'flex';

      const summary = document.createElement('div');
      summary.className = 'batch-summary';
      if (this._queue.length === 1) {
        summary.textContent = '1 file selected';
      } else if (this._queue.length >= this.maxFiles) {
        summary.textContent = this._queue.length + ' files selected (maximum reached)';
      } else {
        summary.textContent = this._queue.length + ' files selected';
      }
      this.listContainer.appendChild(summary);

      if (this._queue.length >= this.warnAt && this._queue.length < this.maxFiles) {
        const warn = document.createElement('div');
        warn.className = 'batch-limit-warning';
        warn.setAttribute('role', 'status');
        warn.textContent = 'Many files selected — processing may be slow. For best results, use fewer than ' + this.warnAt + ' files per batch.';
        this.listContainer.appendChild(warn);
      }

      if (this._queue.length >= this.maxFiles) {
        const cap = document.createElement('div');
        cap.className = 'batch-limit-cap';
        cap.setAttribute('role', 'status');
        cap.textContent = 'File limit reached (' + this.maxFiles + ' max). Remove files to add more, or process this batch first.';
        this.listContainer.appendChild(cap);
      }

      if (this._wantThumbnails && this._queue.length > this.thumbnailMax) {
        const thumbNote = document.createElement('div');
        thumbNote.className = 'batch-limit-note';
        thumbNote.textContent = 'Thumbnails hidden (' + this.thumbnailMax + '+ files) to keep the page responsive.';
        this.listContainer.appendChild(thumbNote);
      }

      for (let i = 0; i < this._queue.length; i++) {
        const entry = this._queue[i];
        const row = document.createElement('div');
        row.className = 'file-item batch-file-item';
        row.dataset.id = entry.id;
        if (this.interactive) {
          row.classList.toggle('active', entry.id === this._activeId);
          row.style.cursor = 'pointer';
          row.addEventListener('click', (e) => {
            if (e.target.closest('.batch-remove-btn')) return;
            this.setActive(entry.id);
          });
        }
        if (this.allowReorder) {
          row.draggable = true;
          row.addEventListener('dragstart', (ev) => {
            ev.dataTransfer.setData('text/plain', entry.id);
            row.style.opacity = '0.6';
          });
          row.addEventListener('dragend', () => { row.style.opacity = '1'; });
          row.addEventListener('dragover', (ev) => ev.preventDefault());
          row.addEventListener('drop', (ev) => {
            ev.preventDefault();
            const fromId = ev.dataTransfer.getData('text/plain');
            this._reorder(fromId, entry.id);
          });
        }

        if (entry.thumbUrl) {
          const thumb = document.createElement('img');
          thumb.className = 'thumb batch-thumb';
          thumb.src = entry.thumbUrl;
          thumb.alt = '';
          row.appendChild(thumb);
        }

        const meta = document.createElement('div');
        meta.className = 'file-meta';
        const title = document.createElement('div');
        title.innerHTML = '<strong>' + escapeHtml(entry.file.name) + '</strong>';
        const sub = document.createElement('div');
        sub.className = 'muted small';
        sub.textContent = formatSize(entry.file.size);
        meta.appendChild(title);
        meta.appendChild(sub);

        if (entry.status && entry.status !== 'pending') {
          const badge = document.createElement('span');
          badge.className = 'batch-status batch-status-' + entry.status;
          badge.textContent = entry.statusMsg || entry.status;
          meta.appendChild(badge);
        }

        row.appendChild(meta);

        const actions = document.createElement('div');
        actions.className = 'file-actions';
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'btn btn-ghost batch-remove-btn';
        removeBtn.textContent = '✕';
        removeBtn.title = 'Remove';
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.remove(entry.id);
        });
        actions.appendChild(removeBtn);
        row.appendChild(actions);

        this.listContainer.appendChild(row);
      }
    }

    _reorder(fromId, toId) {
      if (fromId === toId) return;
      const fromIdx = this._queue.findIndex(e => e.id === fromId);
      const toIdx = this._queue.findIndex(e => e.id === toId);
      if (fromIdx < 0 || toIdx < 0) return;
      const [item] = this._queue.splice(fromIdx, 1);
      this._queue.splice(toIdx, 0, item);
      this.render();
      this.onChange(this.files);
    }

    destroy() {
      this.clear(false);
      this._bound = false;
    }
  }

  class BatchProcessor {
    /**
     * @param {File[]} files
     * @param {function} processor - async (file, index, total) => { blob, filename } | null
     * @param {Object} [options]
     * @param {function} [options.onProgress] - (current, total, file) => void
     * @param {BatchFileQueue} [options.queue] - update row status
     * @param {AbortSignal} [options.signal]
     */
    static async run(files, processor, options = {}) {
      const { onProgress, queue, signal } = options;
      const results = [];
      const errors = [];

      for (let i = 0; i < files.length; i++) {
        if (signal && signal.aborted) break;
        const file = files[i];
        const entry = queue ? queue.entries.find(e => e.file === file) : null;
        if (entry) queue.setStatus(entry.id, 'processing', (i + 1) + '/' + files.length);

        onProgress && onProgress(i + 1, files.length, file);

        try {
          const result = await processor(file, i, files.length);
          if (result && result.blob) {
            results.push({
              blob: result.blob,
              filename: result.filename || file.name,
              sourceFile: file
            });
            if (entry) queue.setStatus(entry.id, 'done', 'Done');
          } else if (entry) {
            queue.setStatus(entry.id, 'skipped', 'Skipped');
          }
        } catch (err) {
          errors.push({ file, error: err });
          if (entry) queue.setStatus(entry.id, 'error', err.message || 'Failed');
        }
      }

      return { results, errors };
    }

    static downloadBlob(blob, filename) {
      const safeName = BatchDownloadUI.safeFilename(filename);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = safeName;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    /**
     * Show per-file download links and optional sequential "All files Download".
     * @param {Array} results - { blob, filename }[]
     * @param {Object} [options]
     * @param {HTMLElement} [options.container]
     * @param {boolean} [options.autoDownloadSingle=true]
     * @returns {'single'|'multi'|null}
     */
    static deliver(results, options = {}) {
      return BatchDownloadUI.show(results, options);
    }
  }

  class BatchDownloadUI {
    static safeFilename(name) {
      const n = String(name || 'file');
      const base = n.split('/').pop().split('\\').pop();
      return base || 'file';
    }

    static _getOrCreateContainer(options = {}) {
      if (options.container) return options.container;
      let el = document.getElementById('batchDownloadArea');
      if (el) return el;
      el = document.createElement('div');
      el.id = 'batchDownloadArea';
      el.className = 'batch-download-area';

      const insertBefore = document.getElementById('log')
        || document.getElementById('status')
        || document.querySelector('pre[id]');
      if (insertBefore && insertBefore.parentNode) {
        insertBefore.parentNode.insertBefore(el, insertBefore);
        return el;
      }

      const anchor = options.anchor
        || document.querySelector('[data-batch-download-anchor]')
        || document.querySelector('.card');
      if (anchor) {
        const seo = anchor.querySelector('.seo-content');
        if (seo) anchor.insertBefore(el, seo);
        else anchor.appendChild(el);
      } else {
        document.body.appendChild(el);
      }
      return el;
    }

    static clear(container) {
      if (!container) return;
      if (container._batchUrls) {
        container._batchUrls.forEach(u => URL.revokeObjectURL(u));
        container._batchUrls = null;
      }
      container.innerHTML = '';
      container.style.display = 'none';
    }

    /**
     * @returns {'single'|'multi'|null}
     */
    static show(results, options = {}) {
      const container = BatchDownloadUI._getOrCreateContainer(options);
      BatchDownloadUI.clear(container);

      if (!results || !results.length) return null;

      container.style.display = 'block';
      const urls = [];

      const wrap = document.createElement('div');
      wrap.className = 'batch-download-panel';

      const title = document.createElement('div');
      title.className = 'batch-download-title';
      title.textContent = results.length === 1
        ? 'Download ready'
        : results.length + ' files ready — download individually or all at once';
      wrap.appendChild(title);

      if (results.length > 1) {
        const allBtn = document.createElement('button');
        allBtn.type = 'button';
        allBtn.className = 'btn btn-primary batch-download-all';
        allBtn.textContent = 'All files Download';
        allBtn.addEventListener('click', async () => {
          allBtn.disabled = true;
          allBtn.textContent = 'Downloading…';
          await BatchDownloadUI.downloadSequential(results, options);
          allBtn.disabled = false;
          allBtn.textContent = 'All files Download';
        });
        wrap.appendChild(allBtn);
      }

      const list = document.createElement('div');
      list.className = 'batch-download-list';

      results.forEach((r, idx) => {
        const safeName = BatchDownloadUI.safeFilename(r.filename);
        const url = URL.createObjectURL(r.blob);
        urls.push(url);

        const row = document.createElement('div');
        row.className = 'batch-download-item file-item';

        const meta = document.createElement('div');
        meta.className = 'file-meta';
        const nameEl = document.createElement('div');
        nameEl.innerHTML = '<strong>' + escapeHtml(r.filename || safeName) + '</strong>';
        const sizeEl = document.createElement('div');
        sizeEl.className = 'muted small';
        sizeEl.textContent = formatSize(r.blob.size);
        meta.appendChild(nameEl);
        meta.appendChild(sizeEl);

        const link = document.createElement('a');
        link.className = 'btn';
        link.href = url;
        link.download = safeName;
        link.textContent = 'Download';

        row.appendChild(meta);
        row.appendChild(link);
        list.appendChild(row);
      });

      wrap.appendChild(list);
      container.appendChild(wrap);
      container._batchUrls = urls;

      const autoSingle = options.autoDownloadSingle !== false;
      if (results.length === 1 && autoSingle) {
        BatchProcessor.downloadBlob(results[0].blob, results[0].filename);
        return 'single';
      }
      return results.length > 1 ? 'multi' : 'single';
    }

    static async downloadSequential(results, options = {}) {
      const delay = options.delayMs || 600;
      for (let i = 0; i < results.length; i++) {
        BatchProcessor.downloadBlob(results[i].blob, results[i].filename);
        if (options.onStep) options.onStep(i + 1, results.length, results[i]);
        if (i < results.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  global.BATCH_LIMITS = BATCH_LIMITS;
  global.BatchFileQueue = BatchFileQueue;
  global.BatchProcessor = BatchProcessor;
  global.BatchDownloadUI = BatchDownloadUI;
})(typeof window !== 'undefined' ? window : global);
