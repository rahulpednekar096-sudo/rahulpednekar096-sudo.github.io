
// Set footer year
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("year").textContent = new Date().getFullYear();
});

// Drawer open/close
function toggleMenu() {
  const drawer = document.getElementById("drawer");
  drawer.classList.toggle("open");
}

// Login popup toggle
function toggleLogin() {
  const box = document.getElementById("loginBox");
  box.style.display = box.style.display === "block" ? "none" : "block";
}

// Close menu & login popup when clicking outside
document.addEventListener("click", function(e) {
  const drawer = document.getElementById("drawer");
  const loginBox = document.getElementById("loginBox");

  const menuBtn = document.querySelector(".menu-btn");
  const loginBtn = document.querySelector(".login-btn");

  // 1) Close drawer if click is outside drawer + not menu button
  if (!drawer.contains(e.target) && !menuBtn.contains(e.target)) {
    drawer.classList.remove("open");
  }

  // 2) Close login box if click is outside loginBox + not login button
  if (!loginBox.contains(e.target) && !loginBtn.contains(e.target)) {
    loginBox.style.display = "none";
  }
});

function openPreview(src) {
  document.getElementById("imgPreviewOverlay").style.display = "flex";
  document.getElementById("imgPreviewBox").src = src;
}

function closePreview() {
  document.getElementById("imgPreviewOverlay").style.display = "none";
}

// ---- SITE SEARCH DATA (ONLY YOUR PAGES) ----
const sitePages = [
    // Main Navigation
    { title: "Home", url: "/index.html" },
    { title: "Apps", url: "/apps.html" },
    { title: "Favorites", url: "/favorites.html" },
    { title: "Profile", url: "/profile.html" },
    { title: "About", url: "/about.html" },
    { title: "Contact", url: "/contact.html" },
    { title: "Privacy Policy", url: "/privacy-policy.html" },
    { title: "Windows Tools", url: "/windows-tools.html" },

    // PDF Tools
    { title: "PDF Tools Home", url: "/index.html#pdf-tools" },
    { title: "Compress PDF", url: "/windows-tools/pdf/compress-pdf.html" },
    { title: "Edit Book", url: "/windows-tools/pdf/book-editor.html" },
    { title: "Excel to PDF", url: "/windows-tools/pdf/excel-to-pdf.html" },
    { title: "JPG to PDF", url: "/windows-tools/pdf/jpg-to-pdf.html" },
    { title: "Merge PDF", url: "/windows-tools/pdf/merge-pdf.html" },
    { title: "PDF to Excel", url: "/windows-tools/pdf/pdf-to-excel.html" },
    { title: "PDF to JPG", url: "/windows-tools/pdf/pdf-to-jpg.html" },
    { title: "PDF to PNG", url: "/windows-tools/pdf/pdf-to-png.html" },
    { title: "PDF to PPT", url: "/windows-tools/pdf/pdf-to-ppt.html" },
    { title: "PDF to text", url: "/windows-tools/pdf/pdf-to-text.html" },
    { title: "PDF to Word", url: "/windows-tools/pdf/pdf-to-word.html" },
    { title: "Png to PDF", url: "/windows-tools/pdf/png-to-pdf.html" },
    { title: "PPT to PDF", url: "/windows-tools/pdf/ppt-to-pdf.html" },
    { title: "Unlock PDF", url: "/windows-tools/pdf/protect-unlock-pdf.html" },
    { title: "Rotate PDF", url: "/windows-tools/pdf/rotate-pdf.html" },
    { title: "Split PDF", url: "/windows-tools/pdf/split-pdf.html" },
    { title: "Text-to-PDF", url: "/windows-tools/pdf/text-to-pdf.html" },
    { title: "Word to PDF", url: "/windows-tools/pdf/word-to-pdf.html" },

    // Image Tools
    { title: "Image Tools Home", url: "/index.html#image-tools" },
    { title: "Resize Image", url: "/windows-tools/image/resize-image.html" },
    { title: "Crop Image", url: "/windows-tools/image/crop-image.html" },
    { title: "Rotate Image", url: "/windows-tools/image/rotate-image.html" },
    { title: "Flip Image", url: "/windows-tools/image/flip-image.html" },
    { title: "Compress Image", url: "/windows-tools/image/compress-image.html" },
    { title: "Convert Image", url: "/windows-tools/image/convert-image.html" },
    { title: "PNG to WebP", url: "/windows-tools/image/png-to-webp.html" },
    { title: "JPG to WebP", url: "/windows-tools/image/jpg-to-webp.html" },
    { title: "Add Watermark", url: "/windows-tools/image/add-watermark.html" },
    { title: "Image Metadata", url: "/windows-tools/image/image-metadata-viewer.html" },
    { title: "Remove Metadata", url: "/windows-tools/image/image-metadata-remover.html" },
    { title: "Image to PDF", url: "/windows-tools/image/image-to-pdf.html" },

    // Audio Tools
    { title: "Audio Tools Home", url: "/index.html#audio-tools" },
    { title: "Trim Audio", url: "/windows-tools/audio/trim-audio.html" },
    { title: "Convert Audio", url: "/windows-tools/audio/convert-audio.html" },
    { title: "Extract MP3", url: "/windows-tools/audio/extract-mp3.html" },
    { title: "Volume Boost", url: "/windows-tools/audio/audio-volume-boost.html" },
    { title: "Merge Audio", url: "/windows-tools/audio/merge-audio.html" },
    { title: "Audio Speed", url: "/windows-tools/audio/change-audio-speed.html" },
    { title: "Audio Pitch", url: "/windows-tools/audio/change-audio-pitch.html" },
    { title: "Audio Metadata", url: "/windows-tools/audio/audio-metadata-editor.html" },

    // System Tools
    { title: "System Tools Home", url: "/index.html#system-tools" },
    { title: "File Renamer", url: "/windows-tools/system/file-renamer.html" },
    { title: "Duplicate Finder", url: "/windows-tools/system/duplicate-file-finder.html" },
    { title: "Folder Size", url: "/windows-tools/system/folder-size-analyzer.html" },
    { title: "Startup Manager", url: "/windows-tools/system/startup-program-manager.html" },
    { title: "Disk Usage", url: "/windows-tools/system/disk-usage-visualizer.html" },

    //utility Tools
    { title: "Utility Tools Home", url: "windows-tools/utility/index.html" },
    { title: "Notes Manager", url: "windows-tools/utility/notes-manager.html" },
    { title: "QR Generator", url: "windows-tools/utility/qr-generator.html" },
    { title: "Unit Converter", url: "windows-tools/utility/unit-converter.html" },
    { title: "Age Calculator", url: "windows-tools/utility/age-calculator.html" },

  //blog section
    { title: "Blog Home", url: "blog/index.html" },
    { title: "How to Compress PDF Files Without Losing Quality", url: "blog/articles/how-to-compress-pdf.html" },
    { title: "Understanding Image Formats: JPG, PNG, WebP", url: "blog/articles/image-formats-guide.html" },
    { title: "Top 5 Essential Android Tools for 2025", url: "blog/articles/top-android-tool.html" },
    { title: "Your Ultimate Guide to Speeding Up Your Computer", url: "blog/handbook/the-sloe-pc-fix-handbook.html" },
    { title: "The Software Deep Clean – The Ultimate Guide to Digital Decluttering", url: "blog/handbook/software-deep-clean.html" },
    { title: "Hardware & Advanced Tuning – The Ultimate Guide to Powering Up Your PC's Engine", url: "blog/handbook/hardware-advanced-tuning.html" },
    { title: "The Maintenance Routine – The Ultimate Guide to Sustaining Peak PC Performance", url: "blog/handbook/maintenance-routine.html" },
    { title: "Advanced Optimization – The Expert's Guide to Maximum Performance", url: "blog/handbook/advanced-optimization.html" },

]

// ---- LIVE SEARCH FUNCTIONALITY ----
function initializeSearch() {
  const searchInput = document.getElementById("siteSearch");
  const resultsBox = document.getElementById("searchResults");

  if (!searchInput || !resultsBox) return;

  // Clear previous event listeners
  searchInput.removeEventListener("input", handleSearchInput);
  searchInput.removeEventListener("keydown", handleSearchKeydown);
  document.removeEventListener("click", handleOutsideClick);

  // Add new event listeners
  searchInput.addEventListener("input", handleSearchInput);
  searchInput.addEventListener("keydown", handleSearchKeydown);
  document.addEventListener("click", handleOutsideClick);

  // Function to handle input
  function handleSearchInput() {
    const query = this.value.toLowerCase().trim();
    resultsBox.innerHTML = "";
    resultsBox.style.display = "none";

    if (!query) return;

    // Filter pages based on query
    const matches = sitePages.filter(p =>
      p.title.toLowerCase().includes(query)
    );

    if (matches.length === 0) {
      resultsBox.innerHTML = `<div class="search-result-item no-results">No results found for "${query}"</div>`;
      resultsBox.style.display = "block";
      return;
    }

    // Display matches
    matches.forEach(p => {
      const resultItem = document.createElement("a");
      resultItem.href = p.url;
      resultItem.className = "search-result-item";
      resultItem.innerHTML = `<span class="search-title">${highlightMatch(p.title, query)}</span>`;
      resultsBox.appendChild(resultItem);
    });

    resultsBox.style.display = "block";
  }

  // Function to highlight matching text
  function highlightMatch(text, query) {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
  }

  // Function to handle Enter key
  function handleSearchKeydown(e) {
    if (e.key === 'Enter') {
      const query = this.value.toLowerCase().trim();
      if (!query) return;

      const matches = sitePages.filter(p =>
        p.title.toLowerCase().includes(query)
      );

      if (matches.length > 0) {
        window.location.href = matches[0].url;
      }
    }
  }

  // Function to handle clicks outside search box
  function handleOutsideClick(e) {
    if (!searchInput.contains(e.target) && !resultsBox.contains(e.target)) {
      resultsBox.style.display = "none";
    }
  }

  // Initialize with empty results
  resultsBox.style.display = "none";
}

// Initialize search when DOM is loaded
document.addEventListener("DOMContentLoaded", initializeSearch);

// Also initialize search when favorite-tools-quick-links.html is loaded
// This ensures search works even if the component is loaded dynamically
setTimeout(initializeSearch, 500);
// --------------------

// Sidebar link smooth scrolling and active state
const sidebarLinks = document.querySelectorAll('.sidebar a');

sidebarLinks.forEach(link => {
  link.addEventListener('click', function (e) {

    const href = this.getAttribute('href');

    // ✅ ONLY handle same-page anchor links
    if (href.startsWith('#')) {
      e.preventDefault();

      sidebarLinks.forEach(l => l.classList.remove('active'));
      this.classList.add('active');

      const targetElement = document.querySelector(href);

      if (targetElement) {
        window.scrollTo({
          top: targetElement.offsetTop - 120,
          behavior: 'smooth'
        });
       }
     }
    // ✅ else: external or other page links → browser handles normally
   });
});

// Back to top functionality
document.getElementById('backToTop').addEventListener('click', function () {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// Show/hide back to top button based on scroll position
 const scrollContainer = document.querySelector('.editor-area') || window;

scrollContainer.addEventListener('scroll', function () {
    const scrollTop = scrollContainer === window
        ? window.scrollY
        : scrollContainer.scrollTop;

    const backToTopBtn = document.getElementById('backToTop');

    if (scrollTop > 300) {
        backToTopBtn.style.display = 'flex';
    } else {
        backToTopBtn.style.display = 'none';
    }
});

// Initially hide the back to top button
document.getElementById('backToTop').style.display = 'none';
