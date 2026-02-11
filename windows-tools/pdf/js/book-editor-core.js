/**
 * Book Editor Core Logic
 * Handles book data management, UI rendering, and basic editor functionality
 */

class BookEditorCore {
    constructor() {
        this.bookData = {
            title: "My Book",
            author: "Author Name",
            pages: [],
            chapters: [],
            settings: {
                pageSize: "A4",
                orientation: "portrait",
                margins: {
                    top: 20,
                    bottom: 20,
                    left: 25,
                    right: 25
                },
                fontSize: 16,
                fontFamily: "Georgia"
            }
        };

        this.currentPageIndex = -1;
        this.currentChapterIndex = -1;
        this.autoSaveTimer = null;
        this.draggedItem = null;
        this.undoStack = [];
        this.redoStack = [];


        this.initializeElements();
    }

    initializeElements() {
        // Core UI Elements
        this.newBookBtn = document.getElementById('newBookBtn');
        this.addPageBtn = document.getElementById('addPageBtn');
        this.addChapterBtn = document.getElementById('addChapterBtn');
        this.saveBookBtn = document.getElementById('saveBookBtn');
        this.loadBookBtn = document.getElementById('loadBookBtn');
        this.exportPdfBtn = document.getElementById('exportPdfBtn');

        // Status Elements
        this.statusEl = document.getElementById('status');
        this.bookStatsEl = document.getElementById('bookStats');

        // Editor Elements
        this.editorContent = document.getElementById('editorContent');
        this.pagesList = document.getElementById('pagesList');
        this.chaptersList = document.getElementById('chaptersList');
        this.emptyPagesState = document.getElementById('emptyPagesState');
        this.emptyChaptersState = document.getElementById('emptyChaptersState');
        this.wordCounter = document.getElementById('wordCounter');

        // Stats Elements
        this.pageCountEl = document.getElementById('pageCount');
        this.chapterCountEl = document.getElementById('chapterCount');
        this.wordCountEl = document.getElementById('wordCount');
        this.charCountEl = document.getElementById('charCount');

        // Settings Elements
        this.bookTitleInput = document.getElementById('bookTitle');
        this.bookAuthorInput = document.getElementById('bookAuthor');
        this.pageSizeOptions = document.querySelectorAll('.size-option');
        this.portraitBtn = document.getElementById('portraitBtn');
        this.landscapeBtn = document.getElementById('landscapeBtn');
        this.marginTopInput = document.getElementById('marginTop');
        this.marginBottomInput = document.getElementById('marginBottom');
        this.marginLeftInput = document.getElementById('marginLeft');
        this.marginRightInput = document.getElementById('marginRight');

        // Preview Elements
        this.previewTitle = document.getElementById('previewTitle');
        this.previewAuthor = document.getElementById('previewAuthor');
        this.previewContent = document.getElementById('previewContent');

        // Format Elements
        this.formatBtns = document.querySelectorAll('.format-btn');
        this.fontFamilySelect = document.getElementById('fontFamily');
        this.fontSizeSelect = document.getElementById('fontSize');

        // Export Option Elements
        this.exportPdfOption = document.getElementById('exportPdfOption');
        this.exportDocxOption = document.getElementById('exportDocxOption');
        this.exportEpubOption = document.getElementById('exportEpubOption');
        this.exportHtmlOption = document.getElementById('exportHtmlOption');
    }

    init() {
        this.setupEventListeners();

        // 1️⃣ Try auto-saved draft first
        const restored = this.restoreAutoSavedDraft();
        if (restored) return;

        // 2️⃣ Else try normal saved book
        const loaded = this.loadFromLocalStorage();
        if (loaded) return;

        // 3️⃣ Nothing found → create new book
        this.initializeBook();

        this.bookTitleInput.value = this.bookData.title;
        this.bookAuthorInput.value = this.bookData.author;
        this.updatePreview();
        this.startAutoSave();
        // Set default orientation active state
        if (this.bookData.settings.orientation === 'portrait') {
            this.portraitBtn.classList.add('active');
            this.landscapeBtn.classList.remove('active');
        }
        else {
            this.landscapeBtn.classList.add('active');
            this.portraitBtn.classList.remove('active');
        }

    }

    getDefaultEditorContent() {
        return `
        <h1>Welcome to Book Editor Pro</h1>
                    <p>Start writing your book here. You can:</p>
                    <ul>
                        <li>Add multiple chapters and pages</li>
                        <li>Format text using the toolbar above</li>
                        <li>Rearrange pages using drag & drop</li>
                        <li>Choose different page sizes</li>
                        <li>Export to professional PDF</li>
                    </ul>
                    <p>First click <strong>Add Chapter</strong>, rename it, and then use <strong>Add Page</strong> to start writing your book.</p>
        `;
    }

    initializeBook() {
        this.bookData = {
            title: "My Book",
            author: "Author Name",
            pages: [],
            chapters: [],
            settings: {
                pageSize: "A4",
                orientation: "portrait",
                margins: {
                    top: 20,
                    bottom: 20,
                    left: 25,
                    right: 25
                },
                fontSize: 16,
                fontFamily: "Georgia"
            }
        };

        const defaultContent = this.getDefaultEditorContent();

        const firstPage = this.createPage("Introduction", defaultContent);
        this.bookData.pages.push(firstPage);

        this.currentPageIndex = 0;
        this.currentChapterIndex = -1;

        // 🔥 UI sync
        this.editorContent.innerHTML = defaultContent;

        this.renderPagesList();
        this.renderChaptersList();
        this.updateWordCount();
        this.updatePreview();
        this.updateStatus('New book created');
    }

    createPage(title = "New Page", content = "", chapterId = null) {
        return {
            id: 'page-' + Date.now(),
            title: title,
            content: content,
            chapterId: chapterId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            pageNumber: this.bookData.pages.length + 1
        };
    }

    createChapter(title = "New Chapter") {
        return {
            id: 'chapter-' + Date.now(),
            title: title,
            createdAt: new Date().toISOString(),
            pageIds: []
        };
    }

    renderPagesList() {
    this.pagesList.innerHTML = '';

    // ✅ STEP 1: decide which pages to show
    let pagesToShow = this.bookData.pages;

    if (this.currentChapterIndex >= 0) {
        const chapterId = this.bookData.chapters[this.currentChapterIndex].id;
        pagesToShow = this.bookData.pages.filter(
            page => page.chapterId === chapterId
        );
    }

    // ✅ STEP 2: empty state handling
    if (pagesToShow.length === 0) {
        this.emptyPagesState.style.display = 'flex';
        this.emptyPagesState.innerText = this.currentChapterIndex >= 0
            ? 'No pages in this chapter'
            : 'Add pages to your book';
        return;
    }

    this.emptyPagesState.style.display = 'none';

    // ✅ STEP 3: render ONLY filtered pages
    pagesToShow.forEach((page) => {
        const index = this.bookData.pages.indexOf(page); // 🔑 real index

        const pageItem = document.createElement('div');
        pageItem.className = `page-item ${index === this.currentPageIndex ? 'active' : ''}`;
        pageItem.draggable = true;
        pageItem.dataset.index = index;
        pageItem.dataset.id = page.id;

        const chapter = this.bookData.chapters.find(c => c.id === page.chapterId);
        const chapterInfo = chapter
            ? `<div style="font-size: 12px; color: var(--brand2);">${chapter.title}</div>`
            : '';

        pageItem.innerHTML = `
            <div style="flex: 1;">
                <div style="font-size: 14px; color: var(--text);">${page.title}</div>
                ${chapterInfo}
                <div style="font-size: 11px; color: var(--muted); margin-top: 2px;">
                    ${new Date(page.updatedAt).toLocaleDateString()}
                </div>
            </div>
            <div class="page-number">${index + 1}</div>
            <div class="page-actions">
                <button class="page-action-btn" onclick="bookEditor.editPage(${index})" title="Edit">✏️</button>
                <button class="page-action-btn" onclick="bookEditor.deletePage(${index})" title="Delete">🗑️</button>
            </div>
        `;

        pageItem.addEventListener('click', (e) => {
            if (!e.target.classList.contains('page-action-btn')) {
                this.selectPage(index);
            }
        });

        // Drag & drop (unchanged)
        pageItem.addEventListener('dragstart', (e) => this.handleDragStart(e, pageItem));
        pageItem.addEventListener('dragover', (e) => this.handleDragOver(e));
        pageItem.addEventListener('drop', (e) => this.handleDrop(e, pageItem));
        pageItem.addEventListener('dragend', (e) => this.handleDragEnd(e, pageItem));

        this.pagesList.appendChild(pageItem);
        });

        this.pageCountEl.textContent = this.bookData.pages.length;
    }


    renderChaptersList() {
        this.chaptersList.innerHTML = '';

        if (this.bookData.chapters.length === 0) {
            this.emptyChaptersState.style.display = 'flex';
            return;
        }

        this.emptyChaptersState.style.display = 'none';

        this.bookData.chapters.forEach((chapter, index) => {
            const chapterItem = document.createElement('div');
            chapterItem.className = `chapter-item ${index === this.currentChapterIndex ? 'active' : ''}`;
            chapterItem.dataset.index = index;
            chapterItem.dataset.id = chapter.id;

            const pageCount = this.bookData.pages.filter(p => p.chapterId === chapter.id).length;

            chapterItem.innerHTML = `
                <div style="font-size: 14px; color: var(--text);">${chapter.title}</div>
                <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                    <div style="font-size: 11px; color: var(--muted);">
                        ${pageCount} page${pageCount !== 1 ? 's' : ''}
                    </div>
                    <div style="display: flex; gap: 5px;">
                        <button class="page-action-btn" onclick="bookEditor.editChapter(${index})" title="Edit">✏️</button>
                        <button class="page-action-btn" onclick="bookEditor.deleteChapter(${index})" title="Delete">🗑️</button>
                    </div>
                </div>
            `;

            chapterItem.addEventListener('click', (e) => {
                if (!e.target.classList.contains('page-action-btn')) {
                    this.selectChapter(index);
                }
            });

            this.chaptersList.appendChild(chapterItem);
        });

        this.chapterCountEl.textContent = this.bookData.chapters.length;
    }

    selectPage(index) {
        if (index < 0 || index >= this.bookData.pages.length) return;

        this.currentPageIndex = index;
        const page = this.bookData.pages[index];

        this.editorContent.innerHTML = page.content;
        this.updateWordCount();
        this.renderPagesList();

        this.fontFamilySelect.value = this.bookData.settings.fontFamily;
        this.fontSizeSelect.value = this.bookData.settings.fontSize;

        this.updateStatus(`Editing page: ${page.title}`);
    }

    selectChapter(index) {
        this.currentChapterIndex = index;
        this.currentPageIndex = -1; // UX clarity
        this.renderChaptersList();
        this.renderPagesList();     // 🔥 VERY IMPORTANT
        // 👇 CHAPTER HEADER खाली status text
        this.updateStatus(
            `Viewing pages from chapter: ${this.bookData.chapters[index].title}`
        );
    }

    clearChapterFilter() {
        this.currentChapterIndex = -1;
        this.currentPageIndex = -1;

        this.renderChaptersList();
        this.renderPagesList();

        this.updateStatus('Viewing all pages');
    }


    editPage(index) {
        const newTitle = prompt('Enter new page title:', this.bookData.pages[index].title);
        if (newTitle && newTitle.trim()) {
            this.bookData.pages[index].title = newTitle.trim();
            this.bookData.pages[index].updatedAt = new Date().toISOString();
            this.renderPagesList();
            this.updateStatus('Page title updated');
        }
    }

    deletePage(index) {
        if (confirm('Are you sure you want to delete this page?')) {
            this.saveUndoState();
            const pageId = this.bookData.pages[index].id;

            this.bookData.chapters.forEach(chapter => {
                const pageIndex = chapter.pageIds.indexOf(pageId);
                if (pageIndex > -1) {
                    chapter.pageIds.splice(pageIndex, 1);
                }
            });

            this.bookData.pages.splice(index, 1);

            this.bookData.pages.forEach((page, idx) => {
                page.pageNumber = idx + 1;
            });

            if (this.currentPageIndex >= index) {
                this.currentPageIndex = Math.max(-1, this.currentPageIndex - 1);
            }

            this.renderPagesList();
            this.updateStatus('Page deleted');
        }
    }

    editChapter(index) {
        const newTitle = prompt('Enter new chapter title:', this.bookData.chapters[index].title);
        if (newTitle && newTitle.trim()) {
            this.saveUndoState();
            this.bookData.chapters[index].title = newTitle.trim();
            this.renderChaptersList();
            this.updateStatus('Chapter title updated');
        }
    }

    deleteChapter(index) {
        if (confirm('Are you sure you want to delete this chapter? Pages will not be deleted.')) {
            this.saveUndoState();
            const chapterId = this.bookData.chapters[index].id;

            this.bookData.pages.forEach(page => {
                if (page.chapterId === chapterId) {
                    page.chapterId = null;
                }
            });

            this.bookData.chapters.splice(index, 1);

            if (this.currentChapterIndex >= index) {
                this.currentChapterIndex = Math.max(-1, this.currentChapterIndex - 1);
            }

            this.renderChaptersList();
            this.renderPagesList();
            this.updateStatus('Chapter deleted');
        }
    }

    handleDragStart(e, item) {
        this.draggedItem = item;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', item.innerHTML);
        item.style.opacity = '0.4';
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        return false;
    }

    handleDrop(e, targetItem) {
        e.stopPropagation();
        e.preventDefault();

        if (this.draggedItem !== targetItem) {
            const fromIndex = parseInt(this.draggedItem.dataset.index);
            const toIndex = parseInt(targetItem.dataset.index);

            const [movedPage] = this.bookData.pages.splice(fromIndex, 1);
            this.bookData.pages.splice(toIndex, 0, movedPage);

            this.bookData.pages.forEach((page, idx) => {
                page.pageNumber = idx + 1;
            });

            if (this.currentPageIndex === fromIndex) {
                this.currentPageIndex = toIndex;
            } else if (this.currentPageIndex === toIndex) {
                this.currentPageIndex = fromIndex;
            }

            this.renderPagesList();
            this.updateStatus('Page order updated');
        }

        return false;
    }

    handleDragEnd(e, item) {
        item.style.opacity = '1';
    }
    //  undo/redo
    saveUndoState() {
        this.undoStack.push({
            content: this.editorContent.innerHTML,
            bookData: JSON.parse(JSON.stringify(this.bookData)),
            currentPageIndex: this.currentPageIndex,
            currentChapterIndex: this.currentChapterIndex
        });

        // limit stack size (memory safe)
        if (this.undoStack.length > 100) {
            this.undoStack.shift();
        }

        // new action → redo clear
        this.redoStack = [];
    }

    //  Undo / Redo functions
    undo() {
        if (this.undoStack.length === 0) return;

        const state = this.undoStack.pop();

        // save current for redo
        this.redoStack.push({
            content: this.editorContent.innerHTML,
            bookData: JSON.parse(JSON.stringify(this.bookData)),
            currentPageIndex: this.currentPageIndex,
            currentChapterIndex: this.currentChapterIndex
        });

        this.restoreState(state);
    }

    redo() {
        if (this.redoStack.length === 0) return;

        const state = this.redoStack.pop();

        this.undoStack.push({
            content: this.editorContent.innerHTML,
            bookData: JSON.parse(JSON.stringify(this.bookData)),
            currentPageIndex: this.currentPageIndex,
            currentChapterIndex: this.currentChapterIndex
        });

        this.restoreState(state);
    }

    restoreState(state) {
        this.editorContent.innerHTML = state.content;
        this.bookData = state.bookData;
        this.currentPageIndex = state.currentPageIndex;
        this.currentChapterIndex = state.currentChapterIndex;

        this.renderPagesList();
        this.renderChaptersList();
        this.updateWordCount();
        this.updatePreview();
        this.updateToolbarState();
    }


    // 🟢 Utility function
    applyStyleToSelection(styleCallback) {
        const sel = window.getSelection();
        if (!sel.rangeCount) return;

        const range = sel.getRangeAt(0);

        // 🟢 cursor only
        if (range.collapsed) {
            const span = document.createElement('span');
            styleCallback(span);
            span.appendChild(document.createTextNode('\u200B'));
            range.insertNode(span);
            range.setStart(span.firstChild, 1);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
            return;
        }

        // 🟢 extract selection safely
        const content = range.extractContents();

        const span = document.createElement('span');
        styleCallback(span);

        span.appendChild(content);
        range.insertNode(span);

        // 🟢 normalize selection
        sel.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNodeContents(span);
        sel.addRange(newRange);

        // 🟢 force visual stability
        span.style.lineHeight = '1.6';
    }
    // Current page
    saveCurrentPage() {
        if (this.currentPageIndex < 0) return;

        this.bookData.pages[this.currentPageIndex].content =
            this.editorContent.innerHTML;

        this.bookData.pages[this.currentPageIndex].updatedAt =
            new Date().toISOString();
    }

    applyBlockFormat(tagName) {
        const sel = window.getSelection();
        if (!sel.rangeCount) return;

        const range = sel.getRangeAt(0);
        let node = range.startContainer;

        if (node.nodeType === 3) node = node.parentNode;

        const block = node.closest('p, h1, h2, li');
        if (!block) return;

        if (block.tagName.toLowerCase() === tagName) return;

        // ✅ VERY IMPORTANT
        this.saveUndoState();

        const newBlock = document.createElement(tagName);
        newBlock.innerHTML = block.innerHTML;

        block.replaceWith(newBlock);

        const newRange = document.createRange();
        newRange.selectNodeContents(newBlock);
        newRange.collapse(false);

        sel.removeAllRanges();
        sel.addRange(newRange);

        this.saveCurrentPage();
        this.updateWordCount();
    }

    updateToolbarState() {
        const sel = window.getSelection();
        if (!sel.rangeCount) return;

        let node = sel.anchorNode;
        if (!node) return;

        if (node.nodeType === 3) node = node.parentNode;

        // reset all
        this.formatBtns.forEach(btn => btn.classList.remove('active'));

        // 🔹 INLINE states
        if (document.queryCommandState('bold')) {
            this.setActiveBtn('bold');
        }
        if (document.queryCommandState('italic')) {
            this.setActiveBtn('italic');
        }
        if (document.queryCommandState('underline')) {
            this.setActiveBtn('underline');
        }

        // 🔹 ALIGN states
        if (document.queryCommandState('justifyCenter')) {
            this.setActiveBtn('justifyCenter');
        } else if (document.queryCommandState('justifyRight')) {
            this.setActiveBtn('justifyRight');
        } else if (document.queryCommandState('justifyFull')) {
            this.setActiveBtn('justifyFull');
        } else {
            this.setActiveBtn('justifyLeft');
        }

        // 🔹 BLOCK states
        const block = node.closest('h1, h2, p');
        if (block) {
            this.setActiveBlock(block.tagName.toLowerCase());
        }
    }

    setActiveBtn(command) {
        this.formatBtns.forEach(btn => {
            if (btn.dataset.command === command) {
                btn.classList.add('active');
            }
        });
    }

    setActiveBlock(tag) {
        this.formatBtns.forEach(btn => {
            if (btn.dataset.block === tag) {
                btn.classList.add('active');
            }
        });
    }

    addNewPage() {
        this.saveUndoState();
        const pageCount = this.bookData.pages.length;
        const newPage = this.createPage(
            `Page ${pageCount + 1}`,
            '<p>New page content...</p>',
            this.currentChapterIndex >= 0 ? this.bookData.chapters[this.currentChapterIndex].id : null
        );

        this.bookData.pages.push(newPage);
        this.currentPageIndex = this.bookData.pages.length - 1;

        if (this.currentChapterIndex >= 0) {
            const chapter = this.bookData.chapters[this.currentChapterIndex];
            chapter.pageIds.push(newPage.id);
        }

        this.editorContent.innerHTML = newPage.content;
        this.renderPagesList();
        this.updateWordCount();
        this.updateStatus('New page added');
    }

    addNewChapter() {
        this.saveUndoState();
        const chapterCount = this.bookData.chapters.length;
        const newChapter = this.createChapter(`Chapter ${chapterCount + 1}`);

        this.bookData.chapters.push(newChapter);
        this.currentChapterIndex = this.bookData.chapters.length - 1;

        this.renderChaptersList();
        this.updateStatus('New chapter added');
    }

    startAutoSave() {
        // every 10 seconds
        this.autoSaveTimer = setInterval(() => {
            this.autoSaveDraft();
        }, 5000);
    }

    autoSaveDraft() {
        // current page content save कर
        this.saveCurrentPage();

        const draft = {
            bookData: this.bookData,
            currentPageIndex: this.currentPageIndex,
            currentChapterIndex: this.currentChapterIndex,
            savedAt: Date.now()
        };

        localStorage.setItem(
            'bookEditor_autosave_draft',
            JSON.stringify(draft)
        );

        // optional (debug)
        console.log("🟢 Auto-saved draft");
    }

    restoreAutoSavedDraft() {
        const saved = localStorage.getItem('bookEditor_autosave_draft');
        if (!saved) return false;

        try {
            const draft = JSON.parse(saved);

            this.bookData = draft.bookData;
            this.currentPageIndex = draft.currentPageIndex;
            this.currentChapterIndex = draft.currentChapterIndex;

            if (this.currentPageIndex >= 0) {
                this.editorContent.innerHTML =
                    this.bookData.pages[this.currentPageIndex].content;
            }

            this.renderPagesList();
            this.renderChaptersList();
            this.updateWordCount();
            this.updatePreview();

            this.startAutoSave();
            this.updateStatus('🛟 Auto-saved draft restored');

            return true; // ✅ VERY IMPORTANT
        }
        catch (e) {
            console.error('Auto-save restore failed', e);
            return false;
        }
    }

    saveBook() {
        this.saveCurrentPage();

        const bookToSave = {
            ...this.bookData,
            savedAt: new Date().toISOString()
        };

        localStorage.setItem('bookEditor_projects', JSON.stringify({
            currentBook: bookToSave,
            timestamp: Date.now()
        }));

        const dataStr = JSON.stringify(bookToSave, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = `${this.bookData.title.replace(/\s+/g, '_')}.book`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();

        this.updateStatus('Book saved to local storage and downloaded');
        localStorage.removeItem('bookEditor_autosave_draft');
    }

    loadBook() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.book,application/json';

        input.onchange = e => {
            const file = e.target.files[0];
            const reader = new FileReader();

            reader.onload = (event) => {
                try {
                    const loadedData = JSON.parse(event.target.result);

                    if (loadedData.pages && Array.isArray(loadedData.pages)) {
                        this.bookData = loadedData;

                        this.bookData.pages.forEach((page, index) => {
                            page.pageNumber = index + 1;
                            if (!page.id) page.id = 'page-' + Date.now() + '-' + index;
                        });

                        this.currentPageIndex = this.bookData.pages.length > 0 ? 0 : -1;
                        this.currentChapterIndex = this.bookData.chapters.length > 0 ? 0 : -1;

                        this.bookTitleInput.value = this.bookData.title || "My Book";
                        this.bookAuthorInput.value = this.bookData.author || "Author Name";

                        if (this.bookData.settings) {
                            document.querySelectorAll('.size-option').forEach(option => {
                                option.classList.remove('active');
                                if (option.dataset.size === this.bookData.settings.pageSize) {
                                    option.classList.add('active');
                                }
                            });

                            if (this.bookData.settings.orientation === 'portrait') {
                                this.portraitBtn.classList.add('active');
                                this.landscapeBtn.classList.remove('active');
                            } else {
                                this.landscapeBtn.classList.add('active');
                                this.portraitBtn.classList.remove('active');
                            }

                            if (this.bookData.settings.margins) {
                                this.marginTopInput.value = this.bookData.settings.margins.top || 20;
                                this.marginBottomInput.value = this.bookData.settings.margins.bottom || 20;
                                this.marginLeftInput.value = this.bookData.settings.margins.left || 25;
                                this.marginRightInput.value = this.bookData.settings.margins.right || 25;
                            }

                            this.fontFamilySelect.value = this.bookData.settings.fontFamily || "Georgia";
                            this.fontSizeSelect.value = this.bookData.settings.fontSize || 16;
                        }

                        if (this.bookData.pages.length > 0) {
                            this.editorContent.innerHTML = this.bookData.pages[0].content;
                        }

                        this.renderPagesList();
                        this.renderChaptersList();
                        this.updateWordCount();
                        this.updatePreview();

                        this.updateStatus(`Book loaded: ${this.bookData.title}`);
                    } else {
                        alert('Invalid book file format');
                    }
                } catch (error) {
                    alert('Error loading book file: ' + error.message);
                }
            };

            reader.readAsText(file);
        };

        input.click();
    }

    updateWordCount() {
        const content = this.editorContent.textContent || "";
        const words = content.trim().split(/\s+/).filter(word => word.length > 0);
        const characters = content.length;

        this.wordCountEl.textContent = words.length;
        this.charCountEl.textContent = characters;
        this.wordCounter.textContent = `Words: ${words.length} | Chars: ${characters}`;
        this.bookStatsEl.textContent = `${this.bookData.pages.length} pages, ${words.length} words`;

        this.updatePreview();

        return { words: words.length, characters };
    }

    updatePreview() {
        this.previewTitle.textContent = this.bookTitleInput.value;
        this.previewAuthor.textContent = `By ${this.bookAuthorInput.value}`;
        this.previewContent.innerHTML = this.editorContent.innerHTML;
    }

    updateStatus(msg) {
        this.statusEl.textContent = msg;
    }

    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('bookEditor_projects');
            if (!saved) return false;

            const data = JSON.parse(saved);

            if (!data.currentBook) return false;

            const shouldLoad = confirm('Load last saved book?');
            if (!shouldLoad) return false;

            this.bookData = data.currentBook;
            this.currentPageIndex = this.bookData.pages.length > 0 ? 0 : -1;
            this.currentChapterIndex = this.bookData.chapters.length > 0 ? 0 : -1;

            this.bookTitleInput.value = this.bookData.title;
            this.bookAuthorInput.value = this.bookData.author;

            if (this.currentPageIndex >= 0) {
                this.editorContent.innerHTML =
                this.bookData.pages[this.currentPageIndex].content;
            }

            this.renderPagesList();
            this.renderChaptersList();
            this.updateWordCount();
            this.updatePreview();
            this.updateStatus('Last saved book loaded');

            return true; // ✅ VERY IMPORTANT
        }
        catch (error) {
            console.log('Error loading saved book:', error);
            return false;
        }
    }


    setupEventListeners() {
        // Button events
        this.newBookBtn.addEventListener('click', () => {
            if (confirm('Create new book? Current unsaved changes will be lost.')) {
                this.initializeBook();
            }
        });

        this.addPageBtn.addEventListener('click', () => this.addNewPage());
        this.addChapterBtn.addEventListener('click', () => this.addNewChapter());
        this.saveBookBtn.addEventListener('click', () => this.saveBook());
        this.loadBookBtn.addEventListener('click', () => this.loadBook());
        this.exportPdfBtn.addEventListener('click', () => {
            this.saveCurrentPage();   // ✅ ADD THIS
            window.bookExport.exportBook('pdf', this.bookData);
        });

        // Export option events
        this.exportPdfOption.addEventListener('click', () => {
            this.saveCurrentPage();   // ✅ ADD THIS
            window.bookExport.exportBook('pdf', this.bookData);
        });

        this.exportDocxOption.addEventListener('click', () => {
            this.saveCurrentPage();   // ✅ ADD THIS
            window.bookExport.exportBook('docx', this.bookData);
        });

        this.exportEpubOption.addEventListener('click', () => {
            this.saveCurrentPage();   // ✅ ADD THIS
            window.bookExport.exportBook('epub', this.bookData);
        });

        this.exportHtmlOption.addEventListener('click', () => {
            this.saveCurrentPage();   // ✅ ADD THIS
            window.bookExport.exportBook('html', this.bookData);
        });

        // 🔹 INLINE FORMATTING (Bold, Italic, Align etc.)
        this.formatBtns.forEach(btn => {
            btn.addEventListener('click', () => {

                // 👉 BLOCK buttons (H1 / H2 / ¶)
                if (btn.dataset.block) {
                    this.saveUndoState();
                    this.applyBlockFormat(btn.dataset.block);

                    this.formatBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    return;
                }

                // 👉 INLINE buttons (bold, italic, underline, justify...)
                const command = btn.dataset.command;
                if (!command) return;
                this.saveUndoState();
                document.execCommand(command, false, null);
                this.saveCurrentPage();
                this.updateWordCount();
            });
        });

        // Orientation buttons
        this.portraitBtn.addEventListener('click', () => {
            this.bookData.settings.orientation = 'portrait';

            this.portraitBtn.classList.add('active');
            this.landscapeBtn.classList.remove('active');
        });

        this.landscapeBtn.addEventListener('click', () => {
            this.bookData.settings.orientation = 'landscape';

            this.landscapeBtn.classList.add('active');
            this.portraitBtn.classList.remove('active');
        });


        // Font family change
        this.fontFamilySelect.addEventListener('change', () => {
            this.saveUndoState();
            const font = this.fontFamilySelect.value;

            this.applyStyleToSelection((el) => {
                el.style.fontFamily = font;
            });

            this.saveCurrentPage();
        });


        // Font size change
        this.fontSizeSelect.addEventListener('change', () => {
            this.saveUndoState();
            const size = this.fontSizeSelect.value + 'px';

            this.applyStyleToSelection((el) => {
                el.style.fontSize = size;
            });

            this.saveCurrentPage();
        });

        this.editorContent.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.execCommand('insertParagraph');
            }
        });


        // Editor content change
        let undoTimer;
        this.editorContent.addEventListener('input', () => {
            clearTimeout(undoTimer);
            undoTimer = setTimeout(() => {
                this.saveUndoState();              // ✅
            }, 400);

            this.updateWordCount();
        });

        this.editorContent.addEventListener('blur', () => this.saveCurrentPage());

        // Settings changes
        this.bookTitleInput.addEventListener('input', () => this.updatePreview());
        this.bookAuthorInput.addEventListener('input', () => this.updatePreview());

        // Page size options
        this.pageSizeOptions.forEach(option => {
            option.addEventListener('click', () => {
                this.pageSizeOptions.forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
                this.bookData.settings.pageSize = option.dataset.size;
                this.updateStatus(`Page size set to ${option.dataset.size}`);
            });
        });

        // Orientation buttons
        this.portraitBtn.addEventListener('click', () => {
            this.portraitBtn.classList.add('active');
            this.landscapeBtn.classList.remove('active');
            this.bookData.settings.orientation = 'portrait';
            this.updateStatus('Orientation set to portrait');
        });

        this.landscapeBtn.addEventListener('click', () => {
            this.landscapeBtn.classList.add('active');
            this.portraitBtn.classList.remove('active');
            this.bookData.settings.orientation = 'landscape';
            this.updateStatus('Orientation set to landscape');
        });

        // Margin inputs
        [this.marginTopInput, this.marginBottomInput, this.marginLeftInput, this.marginRightInput].forEach(input => {
            input.addEventListener('change', () => {
                const margin = input.id.replace('margin', '').toLowerCase();
                this.bookData.settings.margins[margin] = parseInt(input.value) || 20;
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveBook();
            }

            if (e.ctrlKey) {
                switch (e.key) {
                    case 'b':
                        e.preventDefault();
                        document.execCommand('bold');
                        break;
                    case 'i':
                        e.preventDefault();
                        document.execCommand('italic');
                        break;
                    case 'u':
                        e.preventDefault();
                        document.execCommand('underline');
                        break;
                }
            }
        });
        document.addEventListener('selectionchange', () => {
            this.updateToolbarState();
        });
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                this.undo();
            }

            if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
                e.preventDefault();
                this.redo();
            }
        });

    }
}

// Initialize and expose to window
window.bookEditor = new BookEditorCore();
