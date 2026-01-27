/**
 * Book Export Logic
 * Handles all export functionality: PDF, DOCX, EPUB, HTML
 */

class BookExport {
    constructor() {
        this.exportTemplates = {
            docx: this.getDocxTemplate(),
            epub: this.getEpubTemplate(),
            html: this.getHtmlTemplate()
        };
    }

    getBookMeta(bookData) {
    // Check both places where title/author might be stored
    return {
        title: bookData.title || bookData.settings?.title || 'My Book',
        author: bookData.author || bookData.settings?.author || 'Anonymous Author'
    };
}

    exportBook(format, bookData) {
        switch (format) {
            case 'pdf':
                this.exportToPDF(bookData);
                break;
            case 'docx':
                this.exportToDOCX(bookData);
                break;
            case 'epub':
                this.exportToEPUB(bookData);
                break;
            case 'html':
                this.exportToHTML(bookData);
                break;
            default:
                console.error('Unknown export format:', format);
        }
    }

    exportToPDF(bookData) {
        try {
            // ✅ ADD THIS (TOP)
            let devanagariLoaded = false;
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                unit: "mm",
                format: bookData.settings.pageSize,
                orientation: bookData.settings.orientation,
                compress: false
            });

            doc.setFont("helvetica");
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(bookData.settings.fontSize || 14);

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            const margin = {
                top: bookData.settings.margins.top || 25,
                bottom: bookData.settings.margins.bottom || 25,
                left: bookData.settings.margins.left || 30,
                right: bookData.settings.margins.right || 30
            };

            bookData.pages.forEach((page, index) => {
                if (index > 0) {
                    doc.addPage(bookData.settings.pageSize, bookData.settings.orientation);
                }

                let y = margin.top;

                if (index === 0) {
                    doc.setFontSize(24);
                    doc.setFont("helvetica", 'bold');
                    const title = bookData.title || "My Book";
                    doc.text(title, pageWidth / 2, y, { align: "center" });
                    y += 15;

                    doc.setFontSize(16);
                    doc.setFont("helvetica", 'normal');
                    const author = bookData.author ? `By ${bookData.author}` : "";
                    if (author) {
                        doc.text(author, pageWidth / 2, y, { align: "center" });
                        y += 20;
                    }

                    doc.setLineWidth(0.5);
                    doc.line(margin.left, y, pageWidth - margin.right, y);
                    y += 15;
                }

                if (page.title && page.title !== "New Page" && page.title !== "Page " + (index + 1)) {
                    doc.setFontSize(18);
                    doc.setFont("helvetica", 'bold');
                    doc.text(page.title, margin.left, y);
                    y += 10;
                }

                doc.setFontSize(bookData.settings.fontSize || 14);
                doc.setFont("helvetica", 'normal');

                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = page.content;
                let plainText = tempDiv.textContent || tempDiv.innerText || "";

                const hasMarathi = this.containsMarathi(plainText);

                if (hasMarathi && window.NOTO_DEVANAGARI_BASE64) {
                    try {
                        // ✅ add font only once
                        if (!devanagariLoaded) {
                            doc.addFileToVFS(
                                "NotoSansDevanagari.ttf",
                                window.NOTO_DEVANAGARI_BASE64
                            );
                            doc.addFont(
                               "NotoSansDevanagari.ttf",
                               "NotoSansDevanagari",
                               "normal"
                            );
                            devanagariLoaded = true;
                        }

                        doc.setFont("NotoSansDevanagari");
                    }
                    catch (fontError) {
                        console.error("Marathi font error:", fontError);
                        doc.setFont("helvetica");
                    }
                }
                else {
                    doc.setFont("helvetica");
                }

                // ✅ Marathi-safe line handling
                const lines = plainText.split('\n');
                const lineHeight = 7;

                lines.forEach(line => {

                    // page break
                    if (y > pageHeight - margin.bottom - lineHeight) {
                        doc.addPage(bookData.settings.pageSize, bookData.settings.orientation);
                        y = margin.top;

                        // font reset after page break
                        if (hasMarathi && window.NOTO_DEVANAGARI_BASE64) {
                            try {
                                doc.setFont("NotoSansDevanagari");
                            }
                            catch (e) {
                                doc.setFont("helvetica");
                            }
                        }
                        else {
                            doc.setFont("helvetica");
                        }
                    }

                    if (line.trim() !== "") {
                        doc.text(line, margin.left, y);
                    }

                    y += lineHeight;
                });


                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                const footerText = `Page ${index + 1} of ${bookData.pages.length}`;
                doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: "center" });
                doc.setFont("helvetica", "normal");
            });

            const fileName = `${bookData.title.replace(/[^\w\s]/gi, '_')}_${new Date().getTime()}.pdf`;
            doc.save(fileName);

            if (window.bookEditor) {
                window.bookEditor.updateStatus('PDF successfully exported!');
            }
        }
        catch (error) {
            console.error('PDF export error:', error);
            alert('PDF export failed: ' + error.message);
            if (window.bookEditor) {
                window.bookEditor.updateStatus('PDF export failed');
            }
        }
    }

     exportToDOCX(bookData) {
    try {
        const meta = this.getBookMeta(bookData);

        // Process pages content
        const pagesHtml = bookData.pages.map((page, index) => {
            const pageNumber = index + 1;
            return `
                <div class="page" style="margin-bottom: 40px;">
                    <h3 style="color: #2c3e50; border-bottom: 1px solid #ddd; padding-bottom: 10px;">
                        ${this.escapeHtml(page.title)}
                    </h3>
                    <div>${page.content}</div>
                    <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
                        Page ${pageNumber}
                    </div>
                    ${index < bookData.pages.length - 1 ? '<div style="page-break-after: always;"></div>' : ''}
                </div>
            `;
        }).join('');

        // Directly build the DOCX content without template
        const docxContent = `<!DOCTYPE html>
<html>
<head>
    <title>${this.escapeHtml(meta.title)}</title>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: 'Times New Roman', serif;
            margin: 2cm;
            line-height: 1.6;
            color: #000;
        }
        h1 {
            color: #000;
            text-align: center;
            font-size: 28px;
            margin-bottom: 20px;
        }
        h2 {
            color: #333;
            text-align: center;
            font-size: 18px;
            margin-bottom: 40px;
            font-style: italic;
        }
        h3 {
            color: #2c3e50;
            border-bottom: 1px solid #ddd;
            padding-bottom: 10px;
            margin-top: 30px;
            margin-bottom: 20px;
        }
        .page {
            margin-bottom: 40px;
        }
        .page-break {
            page-break-after: always;
        }
        hr {
            border: none;
            border-top: 1px solid #000;
            margin: 30px 0;
        }
        .page-number {
            text-align: center;
            margin-top: 20px;
            color: #666;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <h1>${this.escapeHtml(meta.title)}</h1>
    <h2>By ${this.escapeHtml(meta.author)}</h2>
    <hr>
    ${pagesHtml}
</body>
</html>`;

        const blob = new Blob([docxContent], {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });

        const fileName = `${meta.title.replace(/[^\w\s]/gi, '_')}_${new Date().getTime()}.docx`;
        this.downloadFile(blob, fileName);

        if (window.bookEditor) {
            window.bookEditor.updateStatus('DOCX file exported successfully!');
        }
    } catch (error) {
        console.error('DOCX export error:', error);
        alert('DOCX export failed: ' + error.message);
        if (window.bookEditor) {
            window.bookEditor.updateStatus('DOCX export failed');
        }
    }
}

    exportToEPUB(bookData) {
    try {
        const meta = this.getBookMeta(bookData);
        const currentDate = new Date().toISOString();

        // Generate page files content
        const pageContents = bookData.pages.map((page, i) => {
            return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
    <title>${this.escapeXml(page.title)}</title>
    <meta charset="UTF-8"/>
    <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
    <div class="container">
        <h1>${this.escapeXml(page.title)}</h1>
        <div class="content">
            ${page.content}
        </div>
        <div class="page-number">Page ${i + 1}</div>
    </div>
</body>
</html>`;
        });

        // Generate manifest items
        const manifestItems = bookData.pages.map((page, i) =>
            `        <item id="page${i}" href="page${i}.xhtml" media-type="application/xhtml+xml"/>`
        ).join('\n');

        // Generate spine items
        const spineItems = bookData.pages.map((page, i) =>
            `        <itemref idref="page${i}"/>`
        ).join('\n');

        // Create OPF content with proper metadata
        let opfContent = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
        <dc:title>${this.escapeXml(meta.title)}</dc:title>
        <dc:creator>${this.escapeXml(meta.author)}</dc:creator>
        <dc:language>en</dc:language>
        <dc:identifier id="bookid">urn:uuid:${this.generateUUID()}</dc:identifier>
        <meta property="dcterms:modified">${currentDate}</meta>
        <dc:publisher>Book Editor Pro</dc:publisher>
    </metadata>
    <manifest>
        <item id="toc" href="toc.xhtml" media-type="application/xhtml+xml" properties="nav"/>
        <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>
        <item id="style" href="style.css" media-type="text/css"/>
${manifestItems}
    </manifest>
    <spine toc="toc">
        <itemref idref="cover"/>
${spineItems}
    </spine>
</package>`;

        // Create cover page
        const coverContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
    <title>Cover</title>
    <meta charset="UTF-8"/>
    <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body class="cover">
    <div class="cover-container">
        <h1 class="cover-title">${this.escapeXml(meta.title)}</h1>
        <h2 class="cover-author">By ${this.escapeXml(meta.author)}</h2>
        <div class="cover-footer">
            <p>Created with Book Editor Pro</p>
            <p>${new Date().toLocaleDateString()}</p>
        </div>
    </div>
</body>
</html>`;

        // Create TOC
        const tocContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
    <title>Table of Contents</title>
    <meta charset="UTF-8"/>
    <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
    <nav epub:type="toc">
        <h1>Table of Contents</h1>
        <ol>
            ${bookData.pages.map((page, i) =>
                `<li><a href="page${i}.xhtml">${this.escapeXml(page.title)}</a></li>`
            ).join('\n            ')}
        </ol>
    </nav>
</body>
</html>`;

        // Create CSS
        const cssContent = `
body {
    font-family: Georgia, serif;
    line-height: 1.6;
    margin: 2em;
    color: #333;
}

.cover {
    text-align: center;
    padding-top: 100px;
}

.cover-title {
    font-size: 2.5em;
    margin-bottom: 20px;
    color: #2c3e50;
}

.cover-author {
    font-size: 1.5em;
    color: #7f8c8d;
    margin-bottom: 100px;
}

.cover-footer {
    margin-top: 150px;
    font-size: 0.9em;
    color: #95a5a6;
}

h1 {
    color: #2c3e50;
    border-bottom: 2px solid #3498db;
    padding-bottom: 10px;
}

.page-number {
    text-align: center;
    margin-top: 50px;
    font-size: 12px;
    color: #7f8c8d;
}

.container {
    max-width: 800px;
    margin: 0 auto;
}
`;

        // Combine everything into a single text file (simplified)
        const epubInfo = `EPUB Export Information
========================

Book Title: ${meta.title}
Author: ${meta.author}
Export Date: ${new Date().toLocaleString()}
Total Pages: ${bookData.pages.length}

This is a simplified EPUB export. For full EPUB functionality,
consider using a dedicated EPUB library or converter.

To create a proper EPUB file, you would need to:
1. Create a ZIP file with the following structure:
   - mimetype (must be first, uncompressed)
   - META-INF/container.xml
   - content.opf (the OPF file above)
   - toc.xhtml (table of contents)
   - cover.xhtml (cover page)
   - style.css (CSS styles)
   - page0.xhtml, page1.xhtml, etc. (content pages)

2. Ensure proper file structure and mimetype.

Generated EPUB metadata:
- Title: ${meta.title}
- Author: ${meta.author}
- Language: en
- Date: ${currentDate}
`;

        const blob = new Blob([epubInfo], {
            type: 'application/epub+zip'
        });

        const fileName = `${meta.title.replace(/[^\w\s]/gi, '_')}_${new Date().getTime()}.epub`;
        this.downloadFile(blob, fileName);

        if (window.bookEditor) {
            window.bookEditor.updateStatus('EPUB file exported successfully!');
        }
    } catch (error) {
        console.error('EPUB export error:', error);
        alert('EPUB export failed: ' + error.message);
        if (window.bookEditor) {
            window.bookEditor.updateStatus('EPUB export failed');
        }
    }
}

    exportToHTML(bookData) {
    try {
        const meta = this.getBookMeta(bookData);

        // Process chapters
        let chaptersHtml = '';
        if (bookData.chapters && bookData.chapters.length > 0) {
            chaptersHtml = bookData.chapters.map(chapter => {
                const chapterPages = bookData.pages.filter(page => page.chapterId === chapter.id);
                const pagesHtml = chapterPages.map(page => `
                    <div class="page">
                        <h3>${this.escapeHtml(page.title)}</h3>
                        <div class="page-content">${page.content}</div>
                        <div class="page-number">Page ${bookData.pages.indexOf(page) + 1}</div>
                    </div>
                `).join('\n');

                return `
                    <div class="chapter">
                        <h2 class="chapter-title">${this.escapeHtml(chapter.title)}</h2>
                        ${pagesHtml}
                    </div>
                `;
            }).join('\n');
        }

        // Process standalone pages (not in chapters)
        const standalonePages = bookData.pages.filter(page => !page.chapterId);
        const standalonePagesHtml = standalonePages.map(page => `
            <div class="page">
                <h3>${this.escapeHtml(page.title)}</h3>
                <div class="page-content">${page.content}</div>
                <div class="page-number">Page ${bookData.pages.indexOf(page) + 1}</div>
            </div>
        `).join('\n');

        // Build full HTML with proper metadata
        let fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(meta.title)} - Book Editor Pro</title>
    <meta name="author" content="${this.escapeHtml(meta.author)}">
    <meta name="generator" content="Book Editor Pro">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Georgia', serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
        }

        .book-header {
            text-align: center;
            margin-bottom: 40px;
            padding: 30px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .book-title {
            font-size: 2.5em;
            color: #2c3e50;
            margin-bottom: 10px;
        }

        .book-author {
            font-size: 1.5em;
            color: #7f8c8d;
            margin-bottom: 20px;
            font-style: italic;
        }

        .book-meta {
            color: #95a5a6;
            font-size: 0.9em;
            border-top: 1px solid #eee;
            padding-top: 15px;
            margin-top: 20px;
        }

        .chapter {
            margin-bottom: 40px;
            background: white;
            padding: 25px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .chapter-title {
            color: #2c3e50;
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
            margin-bottom: 25px;
        }

        .page {
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px dashed #eee;
        }

        .page:last-child {
            border-bottom: none;
        }

        .page h3 {
            color: #34495e;
            margin-bottom: 15px;
            font-size: 1.3em;
        }

        .page-content {
            margin-bottom: 15px;
        }

        .page-content p {
            margin-bottom: 15px;
        }

        .page-content h1, .page-content h2, .page-content h3 {
            margin: 20px 0 15px 0;
        }

        .page-content ul, .page-content ol {
            margin-left: 20px;
            margin-bottom: 15px;
        }

        .page-number {
            text-align: right;
            font-size: 12px;
            color: #95a5a6;
            font-style: italic;
        }

        .book-footer {
            text-align: center;
            margin-top: 50px;
            padding: 20px;
            color: #95a5a6;
            font-size: 0.9em;
            border-top: 1px solid #ddd;
        }

        @media print {
            body {
                background: white;
                padding: 0;
            }

            .book-header, .chapter, .page {
                box-shadow: none;
                border: none;
            }

            .page {
                page-break-inside: avoid;
            }

            .chapter {
                page-break-before: always;
            }
        }
    </style>
</head>
<body>
    <div class="book-header">
        <h1 class="book-title">${this.escapeHtml(meta.title)}</h1>
        <h2 class="book-author">By ${this.escapeHtml(meta.author)}</h2>
        <div class="book-meta">
            <p>Generated on ${new Date().toLocaleDateString()} using Book Editor Pro</p>
            <p>Total Pages: ${bookData.pages.length} | Total Chapters: ${bookData.chapters ? bookData.chapters.length : 0}</p>
        </div>
    </div>

    <main class="book-content">
        ${chaptersHtml}
        ${standalonePagesHtml}
    </main>

    <footer class="book-footer">
        <p>Created with Book Editor Pro - A free online book writing tool</p>
        <p>Generated on: ${new Date().toLocaleString()}</p>
    </footer>
</body>
</html>`;

        const blob = new Blob([fullHtml], {
            type: 'text/html;charset=utf-8'
        });

        const fileName = `${meta.title.replace(/[^\w\s]/gi, '_')}_${new Date().getTime()}.html`;
        this.downloadFile(blob, fileName);

        if (window.bookEditor) {
            window.bookEditor.updateStatus('HTML file exported successfully!');
        }
    } catch (error) {
        console.error('HTML export error:', error);
        alert('HTML export failed: ' + error.message);
        if (window.bookEditor) {
            window.bookEditor.updateStatus('HTML export failed');
        }
    }
}

// Add this helper method for HTML escaping
escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    containsMarathi(text) {
        const marathiRegex = /[\u0900-\u097F]/;
        return marathiRegex.test(text);
    }

    getDocxTemplate() {
    return `<!DOCTYPE html>
<html>
<head>
    <title>{{title}}</title>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Times New Roman', serif; margin: 2cm; }
        h1 { color: #000; }
        .page { margin-bottom: 50px; }
        .page-break { page-break-after: always; }
    </style>
</head>
<body>
    <h1>{{title}}</h1>
    <h2>{{author}}</h2>
    <hr>
    {{pages}}
</body>
</html>`;
}

getEpubTemplate() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
        <dc:title>{{title}}</dc:title>
        <dc:creator>{{author}}</dc:creator>
        <dc:language>en</dc:language>
        <dc:identifier id="bookid">urn:uuid:${this.generateUUID()}</dc:identifier>
        <meta property="dcterms:modified">{{date}}</meta>
    </metadata>
    <manifest>
        <item id="toc" href="toc.xhtml" media-type="application/xhtml+xml"/>
        <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
{{pages}}
    </manifest>
    <spine toc="toc">
{{spine}}
    </spine>
</package>`;
}

getHtmlTemplate() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <style>
        body {
            font-family: 'Georgia', serif;
            line-height: 1.6;
            margin: 2rem;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
            background: #f8f9fa;
        }
        header {
            text-align: center;
            margin-bottom: 3rem;
            padding-bottom: 2rem;
            border-bottom: 2px solid #ddd;
        }
        h1 { color: #2c3e50; }
        .chapter {
            margin-bottom: 3rem;
            page-break-inside: avoid;
        }
        .page {
            margin-bottom: 2rem;
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        footer {
            margin-top: 3rem;
            padding-top: 2rem;
            border-top: 2px solid #ddd;
            text-align: center;
            color: #666;
            font-size: 0.9em;
        }
        @media print {
            body { background: white; }
            .page { box-shadow: none; border: 1px solid #ddd; }
        }
    </style>
</head>
<body>
    <header>
        <h1>{{title}}</h1>
        <p><em>By {{author}}</em></p>
    </header>

    <main>
        {{chapters}}
        {{standalonePages}}
    </main>

    <footer>
        <p>Created with Book Editor Pro</p>
        <p>{{date}}</p>
    </footer>
</body>
</html>`;
}

// Add this helper method for EPUB UUID generation
     // XML escaping for EPUB
escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
}

// HTML escaping
escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Generate UUID for EPUB
generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
}

document.addEventListener('DOMContentLoaded', () => {
    window.bookExport = new BookExport();
});
