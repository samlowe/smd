/* ============================================================
   smd — Simple Markdown Viewer
   Main application logic
   ============================================================ */

// Pure utility functions are loaded from utils.js (parseFrontmatter,
// parseSimpleYaml, escapeHtml, basename, dirname, renderFrontmatter, stripQuotes).

const { invoke } = window.__TAURI__.core;

// ---- State ----

let currentZoom = 100;
const ZOOM_STEP = 10;
const ZOOM_MIN = 50;
const ZOOM_MAX = 200;

let currentFilePath = null;
let currentRawMarkdown = null;

// ---- Elements ----

const contentWrapper = document.getElementById("content-wrapper");
const content = document.getElementById("content");
const emptyState = document.getElementById("empty-state");
const filenameEl = document.getElementById("filename");
const zoomLevelEl = document.getElementById("zoom-level");
const btnOpen = document.getElementById("btn-open");
const btnZoomIn = document.getElementById("btn-zoom-in");
const btnZoomOut = document.getElementById("btn-zoom-out");
const btnTheme = document.getElementById("btn-theme");
const themePanel = document.getElementById("theme-panel");
const themeList = document.getElementById("theme-list");
const fontSelect = document.getElementById("font-select");
const btnImportTheme = document.getElementById("btn-import-theme");
const btnDrawer = document.getElementById("btn-drawer");
const fileDrawer = document.getElementById("file-drawer");
const fileList = document.getElementById("file-list");
const btnRecent = document.getElementById("btn-recent");
const recentPanel = document.getElementById("recent-panel");
const recentList = document.getElementById("recent-list");
const recentEmpty = document.getElementById("recent-empty");
const btnAbout = document.getElementById("btn-about");
const aboutOverlay = document.getElementById("about-overlay");
const aboutVersion = document.getElementById("about-version");
const aboutClose = document.getElementById("about-close");
const btnReload = document.getElementById("btn-reload");
const btnCopy = document.getElementById("btn-copy");
const copyPanel = document.getElementById("copy-panel");
const findBar = document.getElementById("find-bar");
const findInput = document.getElementById("find-input");
const findCount = document.getElementById("find-count");
const btnFindPrev = document.getElementById("find-prev");
const btnFindNext = document.getElementById("find-next");
const btnFindClose = document.getElementById("find-close");
const btnClipboard = document.getElementById("btn-clipboard");

function highlightCodeBlocks() {
  content.querySelectorAll("pre code").forEach((block) => {
    if (block.classList.contains("language-mermaid")) return;
    hljs.highlightElement(block);
  });
}

// ---- Theme Manager ----

const ThemeManager = (() => {
  let syntaxStyleEl = null;
  let currentThemeId = null;

  /** Create or get the <style> element for dynamic syntax CSS */
  function getSyntaxStyle() {
    if (!syntaxStyleEl) {
      syntaxStyleEl = document.createElement("style");
      syntaxStyleEl.id = "smd-syntax-theme";
      document.head.appendChild(syntaxStyleEl);
    }
    return syntaxStyleEl;
  }

  /** Apply a theme by ID */
  function apply(themeId) {
    const theme = SmdThemes.find(themeId);
    currentThemeId = theme.id;

    // Set data-theme for any remaining CSS selectors
    document.documentElement.setAttribute("data-theme", theme.type);

    // Apply color variables
    const root = document.documentElement;
    for (const [key, value] of Object.entries(theme.colors)) {
      root.style.setProperty(key, value);
    }

    // Apply syntax highlighting
    getSyntaxStyle().textContent = SmdThemes.generateSyntaxCSS(theme.syntax);

    // Persist
    localStorage.setItem("smd-theme-id", theme.id);

    // Cache vars for inline use on next load
    cacheVars();

    // Update picker UI
    updatePickerSelection();
  }

  /** Cache current CSS vars to localStorage for inline use on page load */
  function cacheVars() {
    try {
      const vars = {};
      const style = getComputedStyle(document.documentElement);
      for (const key of style) {
        if (key.startsWith("--")) {
          vars[key] = style.getPropertyValue(key).trim();
        }
      }
      localStorage.setItem("smd-cached-vars", JSON.stringify(vars));
    } catch {
      // Ignore errors (e.g., if called before DOM ready)
    }
  }

  /** Apply font preset */
  function applyFont(presetId) {
    const presets = SmdThemes.getFontPresets();
    const preset = presets[presetId] || presets["system"];
    const root = document.documentElement;
    root.style.setProperty("--font-ui", preset.ui);
    root.style.setProperty("--font-code", preset.code);
    localStorage.setItem("smd-font", presetId);
    cacheVars();
  }

  /** Get stored theme ID */
  function getStoredThemeId() {
    // Check new storage key first, then migrate from old key
    const id = localStorage.getItem("smd-theme-id");
    if (id) return id;
    const oldTheme = localStorage.getItem("smd-theme");
    if (oldTheme === "dark") return "github-dark";
    if (oldTheme === "light") return "github-light";
    return null;
  }

  /** Get stored font preset */
  function getStoredFont() {
    return localStorage.getItem("smd-font") || "system";
  }

  /** Resolve the default theme based on system preference */
  function getDefaultThemeId() {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "github-dark" : "github-light";
  }

  /** Get current theme ID */
  function getCurrentId() {
    return currentThemeId;
  }

  /** Cycle to next theme (for keyboard shortcut) */
  function cycleTheme() {
    const all = SmdThemes.getAll();
    const idx = all.findIndex((t) => t.id === currentThemeId);
    const next = all[(idx + 1) % all.length];
    apply(next.id);
  }

  /** Update picker button highlights */
  function updatePickerSelection() {
    themeList.querySelectorAll(".theme-item").forEach((el) => {
      el.classList.toggle("active", el.dataset.themeId === currentThemeId);
    });
  }

  /** Build the theme picker list */
  function buildPicker() {
    // Theme list
    themeList.innerHTML = "";
    const allThemes = SmdThemes.getAll();
    for (const theme of allThemes) {
      const btn = document.createElement("button");
      btn.className = "theme-item";
      btn.dataset.themeId = theme.id;

      const swatch = document.createElement("span");
      swatch.className = "theme-swatch";
      swatch.style.background = theme.colors["--bg"];

      const label = document.createElement("span");
      label.textContent = theme.name;

      btn.appendChild(swatch);
      btn.appendChild(label);
      btn.addEventListener("click", () => apply(theme.id));
      themeList.appendChild(btn);
    }

    // Font select
    fontSelect.innerHTML = "";
    const presets = SmdThemes.getFontPresets();
    for (const [id, preset] of Object.entries(presets)) {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = preset.name;
      fontSelect.appendChild(opt);
    }
    fontSelect.value = getStoredFont();
    fontSelect.addEventListener("change", () => applyFont(fontSelect.value));

    updatePickerSelection();
  }

  /** Import a custom theme from a JSON file */
  async function importCustomTheme() {
    try {
      const selected = await invoke("open_theme_file_dialog");
      if (!selected) return;
      const raw = await invoke("read_file", { path: selected });
      const theme = JSON.parse(raw);

      if (!SmdThemes.validate(theme)) {
        console.error("Invalid theme file — missing required fields");
        return;
      }

      // Ensure no ID collision with built-in themes
      const builtInIds = SmdThemes.getBuiltIn().map((t) => t.id);
      if (builtInIds.includes(theme.id)) {
        theme.id = "custom-" + theme.id;
      }

      // Add to custom themes
      const customs = SmdThemes.getCustomThemes();
      const existing = customs.findIndex((t) => t.id === theme.id);
      if (existing >= 0) {
        customs[existing] = theme;
      } else {
        customs.push(theme);
      }
      SmdThemes.saveCustomThemes(customs);

      // Rebuild picker and apply
      buildPicker();
      apply(theme.id);
    } catch (err) {
      console.error("Failed to import theme:", err);
    }
  }

  return {
    apply,
    applyFont,
    getStoredThemeId,
    getStoredFont,
    getDefaultThemeId,
    getCurrentId,
    cycleTheme,
    buildPicker,
    importCustomTheme,
  };
})();

// ---- Clipboard display ----

/** Display clipboard content in the viewer without associating a file. */
function displayClipboardContent(md, bodyHtml) {
  currentFilePath = null;
  currentRawMarkdown = md;
  const { meta } = parseFrontmatter(md);
  const fmHtml = meta ? renderFrontmatter(meta) : "";
  content.innerHTML = fmHtml + bodyHtml;

  filenameEl.textContent = "Clipboard";
  filenameEl.title = "Loaded from clipboard";
  document.title = "Clipboard — smd";

  contentWrapper.classList.add("active");
  emptyState.classList.add("hidden");

  // No file to reload; copy still works
  btnReload.style.display = "none";
  btnCopy.style.display = "";

  requestAnimationFrame(() => {
    // No relative images to resolve for clipboard content
    highlightCodeBlocks();
    renderMermaidDiagrams();
  });
}

async function loadFromClipboard() {
  try {
    const text = await invoke("read_clipboard_text");
    if (!isSafeText(text)) {
      console.warn("Clipboard content does not appear to be safe text/markdown");
      return;
    }
    closeFindBar();
    const { html } = await invoke("render_markdown", { text });
    displayClipboardContent(text, html);
  } catch (err) {
    console.error("Failed to load from clipboard:", err);
  }
}

// ---- Theme Panel Toggle ----

let themePanelOpen = false;
let themePickerBuilt = false;

function toggleThemePanel() {
  themePanelOpen = !themePanelOpen;
  themePanel.classList.toggle("open", themePanelOpen);
  if (themePanelOpen) {
    if (!themePickerBuilt) {
      ThemeManager.buildPicker();
      themePickerBuilt = true;
    }
    closeRecentPanel();
  }
}

function closeThemePanel() {
  themePanelOpen = false;
  themePanel.classList.remove("open");
}

// Close panel when clicking outside
document.addEventListener("mousedown", (e) => {
  if (themePanelOpen && !themePanel.contains(e.target) && e.target !== btnTheme && !btnTheme.contains(e.target)) {
    closeThemePanel();
  }
  if (recentPanelOpen && !recentPanel.contains(e.target) && e.target !== btnRecent && !btnRecent.contains(e.target)) {
    closeRecentPanel();
  }
  if (copyPanelOpen && !copyPanel.contains(e.target) && e.target !== btnCopy && !btnCopy.contains(e.target)) {
    closeCopyPanel();
  }
});

// ---- Initialize Theme ----

ThemeManager.apply(ThemeManager.getStoredThemeId() || ThemeManager.getDefaultThemeId());
ThemeManager.applyFont(ThemeManager.getStoredFont());

// Listen for system theme changes (only if no explicit choice stored)
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (e) => {
    if (!localStorage.getItem("smd-theme-id")) {
      ThemeManager.apply(e.matches ? "github-dark" : "github-light");
    }
  });

// ---- Zoom ----

function updateZoom() {
  content.style.transform = `scale(${currentZoom / 100})`;
  content.style.transformOrigin = "top center";
  zoomLevelEl.textContent = `${currentZoom}%`;
  debouncedSaveState();
}

function zoomIn() {
  if (currentZoom < ZOOM_MAX) {
    currentZoom = Math.min(currentZoom + ZOOM_STEP, ZOOM_MAX);
    updateZoom();
  }
}

function zoomOut() {
  if (currentZoom > ZOOM_MIN) {
    currentZoom = Math.max(currentZoom - ZOOM_STEP, ZOOM_MIN);
    updateZoom();
  }
}

function zoomReset() {
  currentZoom = 100;
  updateZoom();
}

// ---- Window state persistence ----

let saveStateTimer = null;

function debouncedSaveState() {
  clearTimeout(saveStateTimer);
  saveStateTimer = setTimeout(() => {
    invoke("save_window_state", { zoom: currentZoom }).catch(() => {});
  }, 500);
}

// Save state on window resize
window.addEventListener("resize", debouncedSaveState);

// ---- File rendering ----

async function resolveRelativeImages(basePath) {
  const { convertFileSrc } = window.__TAURI__.core;
  const images = content.querySelectorAll("img");
  const promises = Array.from(images).map(async (img) => {
    const src = img.getAttribute("src");
    if (!src) return;
    // Leave data URIs and URLs with a scheme (http, https, asset, …) alone
    if (/^[a-z][a-z0-9+\-.]*:/i.test(src)) return;
    try {
      const resolved = await invoke("resolve_relative_path", {
        baseFile: basePath,
        relative: src,
      });
      if (resolved) img.src = convertFileSrc(resolved);
    } catch (e) {
      console.warn("Could not resolve image:", src, e);
    }
  });
  await Promise.all(promises);
}

// ---- Mermaid diagrams (lazy-loaded) ----

let mermaidLoaded = false;

function loadMermaid() {
  if (mermaidLoaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "mermaid.min.js";
    script.onload = () => {
      mermaid.initialize({ startOnLoad: false, theme: "default", securityLevel: "loose" });
      mermaidLoaded = true;
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function renderMermaidDiagrams() {
  const blocks = content.querySelectorAll("pre > code.language-mermaid");
  if (blocks.length === 0) return;

  // Load mermaid on first use
  await loadMermaid();

  // Detect light/dark for mermaid theme
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  mermaid.initialize({ startOnLoad: false, theme: isDark ? "dark" : "default", securityLevel: "loose" });

  // Replace <pre><code> with <div class="mermaid">
  blocks.forEach((block) => {
    const pre = block.parentElement;
    const container = document.createElement("div");
    container.className = "mermaid";
    container.textContent = block.textContent;
    pre.replaceWith(container);
  });

  try {
    await mermaid.run({ querySelector: ".mermaid" });
  } catch (e) {
    console.warn("Mermaid rendering error:", e);
  }
}

// ---- Content display ----

function displayContent(md, bodyHtml, filename) {
  currentRawMarkdown = md;
  const { meta } = parseFrontmatter(md);
  const fmHtml = meta ? renderFrontmatter(meta) : "";
  content.innerHTML = fmHtml + bodyHtml;

  // Show just the filename in the toolbar
  const name = basename(filename);
  filenameEl.textContent = name;
  filenameEl.title = filename;
  document.title = `${name} — smd`;

  // Make content visible immediately so the user sees raw text fast
  contentWrapper.classList.add("active");
  emptyState.classList.add("hidden");

  // Show file-action buttons
  btnReload.style.display = "";
  btnCopy.style.display = "";

  // Resolve images, highlight code, and render diagrams after paint
  requestAnimationFrame(() => {
    resolveRelativeImages(filename);
    highlightCodeBlocks();
    renderMermaidDiagrams();
  });
}

async function openFile(path) {
  try {
    closeFindBar();
    // Single IPC call: read, render, set current file, and update recents
    const { text, html } = await invoke("open_and_render_file", { path });
    currentFilePath = path;
    displayContent(text, html, path);

    // Update drawer highlight if open
    if (drawerOpen) updateDrawerHighlight();
  } catch (err) {
    console.error("Failed to open file:", err);
  }
}

async function openFileDialog() {
  const selected = await invoke("open_file_dialog");
  if (selected) {
    await openFile(selected);
  }
}

// ---- File drawer ----

let drawerOpen = false;

function toggleDrawer() {
  drawerOpen = !drawerOpen;
  fileDrawer.classList.toggle("open", drawerOpen);
  btnDrawer.classList.toggle("active", drawerOpen);
  if (drawerOpen) refreshFileList();
}

function closeDrawer() {
  drawerOpen = false;
  fileDrawer.classList.remove("open");
  btnDrawer.classList.remove("active");
}

async function refreshFileList() {
  try {
    const files = await invoke("list_md_files");
    fileList.innerHTML = "";

    if (files.length === 0) {
      const msg = document.createElement("div");
      msg.className = "drawer-empty";
      msg.textContent = "No .md files in folder";
      fileList.appendChild(msg);
      return;
    }

    for (const filePath of files) {
      const btn = document.createElement("button");
      btn.className = "drawer-file";
      const name = basename(filePath);

      // Small file icon
      const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      icon.setAttribute("width", "14");
      icon.setAttribute("height", "14");
      icon.setAttribute("viewBox", "0 0 16 16");
      icon.setAttribute("fill", "none");
      icon.setAttribute("stroke", "currentColor");
      icon.setAttribute("stroke-width", "1.5");
      icon.classList.add("drawer-file-icon");
      const iconPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      iconPath.setAttribute("d", "M9 1.5H4a1 1 0 00-1 1v11a1 1 0 001 1h8a1 1 0 001-1V5.5L9 1.5zM9 1.5v4h4");
      icon.appendChild(iconPath);

      const label = document.createElement("span");
      label.textContent = name;
      label.style.overflow = "hidden";
      label.style.textOverflow = "ellipsis";

      btn.appendChild(icon);
      btn.appendChild(label);
      btn.title = filePath;

      if (filePath === currentFilePath) {
        btn.classList.add("active");
      }

      btn.addEventListener("click", () => openFile(filePath));
      fileList.appendChild(btn);
    }
  } catch (err) {
    console.error("Failed to list files:", err);
  }
}

function updateDrawerHighlight() {
  fileList.querySelectorAll(".drawer-file").forEach((btn) => {
    btn.classList.toggle("active", btn.title === currentFilePath);
  });
}

// ---- Recent files panel ----

let recentPanelOpen = false;

function toggleRecentPanel() {
  recentPanelOpen = !recentPanelOpen;
  recentPanel.classList.toggle("open", recentPanelOpen);
  if (recentPanelOpen) {
    closeThemePanel();
    refreshRecentList();
  }
}

function closeRecentPanel() {
  recentPanelOpen = false;
  recentPanel.classList.remove("open");
}

async function refreshRecentList() {
  try {
    const files = await invoke("get_recent_files");
    recentList.innerHTML = "";

    if (files.length === 0) {
      recentEmpty.style.display = "";
      return;
    }

    recentEmpty.style.display = "none";

    for (const filePath of files) {
      const btn = document.createElement("button");
      btn.className = "recent-item";

      const name = document.createElement("span");
      name.className = "recent-item-name";
      name.textContent = basename(filePath);

      // Show parent directory for context
      const dir = dirname(filePath);

      const pathEl = document.createElement("span");
      pathEl.className = "recent-item-path";
      pathEl.textContent = dir;

      btn.appendChild(name);
      btn.appendChild(pathEl);
      btn.title = filePath;

      btn.addEventListener("click", () => {
        closeRecentPanel();
        openFile(filePath);
      });

      recentList.appendChild(btn);
    }
  } catch (err) {
    console.error("Failed to load recent files:", err);
  }
}

// ---- Find in page ----

let findMatches = [];
let findIndex = -1;

function openFindBar() {
  findBar.classList.add("open");
  findInput.focus();
  findInput.select();
  if (findInput.value) runFind();
}

function closeFindBar() {
  findBar.classList.remove("open");
  clearFindHighlights();
  findMatches = [];
  findIndex = -1;
  findCount.textContent = "";
  findInput.classList.remove("no-results");
}

function clearFindHighlights() {
  content.querySelectorAll(".smd-find-highlight").forEach((mark) => {
    const parent = mark.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(mark.textContent), mark);
      parent.normalize();
    }
  });
}

function runFind() {
  clearFindHighlights();
  findMatches = [];
  findIndex = -1;
  findInput.classList.remove("no-results");

  const query = findInput.value;
  if (!query) { findCount.textContent = ""; return; }

  const queryLower = query.toLowerCase();

  // Collect all text nodes up-front to avoid live NodeList issues
  const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) textNodes.push(node);

  for (const textNode of textNodes) {
    const text = textNode.textContent;
    const textLower = text.toLowerCase();
    let offset = 0;
    const parts = [];
    let idx;
    while ((idx = textLower.indexOf(queryLower, offset)) !== -1) {
      if (idx > offset) parts.push(document.createTextNode(text.slice(offset, idx)));
      const mark = document.createElement("mark");
      mark.className = "smd-find-highlight";
      mark.textContent = text.slice(idx, idx + query.length);
      parts.push(mark);
      findMatches.push(mark);
      offset = idx + query.length;
    }
    if (parts.length > 0) {
      if (offset < text.length) parts.push(document.createTextNode(text.slice(offset)));
      const parent = textNode.parentNode;
      parts.forEach((p) => parent.insertBefore(p, textNode));
      parent.removeChild(textNode);
    }
  }

  if (findMatches.length === 0) {
    findCount.textContent = "No results";
    findInput.classList.add("no-results");
    return;
  }

  findIndex = 0;
  activateFindMatch(findIndex);
}

function activateFindMatch(idx) {
  findMatches.forEach((m, i) => m.classList.toggle("smd-find-active", i === idx));
  findMatches[idx].scrollIntoView({ block: "center", behavior: "smooth" });
  findCount.textContent = `${idx + 1} / ${findMatches.length}`;
}

function findNext() {
  if (!findMatches.length) return;
  findIndex = (findIndex + 1) % findMatches.length;
  activateFindMatch(findIndex);
}

function findPrev() {
  if (!findMatches.length) return;
  findIndex = (findIndex - 1 + findMatches.length) % findMatches.length;
  activateFindMatch(findIndex);
}

findInput.addEventListener("input", runFind);
findInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    e.shiftKey ? findPrev() : findNext();
  } else if (e.key === "Escape") {
    e.stopPropagation();
    closeFindBar();
  }
});
btnFindPrev.addEventListener("click", findPrev);
btnFindNext.addEventListener("click", findNext);
btnFindClose.addEventListener("click", closeFindBar);

// ---- Reload current file ----

async function reloadCurrentFile() {
  if (!currentFilePath) return;
  try {
    const { text, html } = await invoke("open_and_render_file", {
      path: currentFilePath,
    });
    displayContent(text, html, currentFilePath);
  } catch (err) {
    console.error("Failed to reload file:", err);
  }
}

// ---- Copy panel ----

let copyPanelOpen = false;

function toggleCopyPanel() {
  copyPanelOpen = !copyPanelOpen;
  copyPanel.classList.toggle("open", copyPanelOpen);
  if (copyPanelOpen) {
    // Position below the copy button
    const rect = btnCopy.getBoundingClientRect();
    copyPanel.style.left = `${rect.left}px`;
    closeThemePanel();
    closeRecentPanel();
  }
}

function closeCopyPanel() {
  copyPanelOpen = false;
  copyPanel.classList.remove("open");
}

async function copyAsFormat(format) {
  closeCopyPanel();
  if (!currentRawMarkdown) return;
  try {
    if (format === "markdown") {
      await navigator.clipboard.writeText(currentRawMarkdown);
    } else {
      const clone = content.cloneNode(true);
      clone.querySelectorAll(".mermaid svg").forEach((svg) => {
        const serialized = new XMLSerializer().serializeToString(svg);
        const dataUri =
          "data:image/svg+xml;base64," +
          btoa(unescape(encodeURIComponent(serialized)));
        const img = document.createElement("img");
        img.src = dataUri;
        svg.closest(".mermaid").replaceWith(img);
      });
      const html = clone.innerHTML;
      const blob = new Blob([html], { type: "text/html" });
      const textBlob = new Blob([html], { type: "text/plain" });
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": blob,
          "text/plain": textBlob,
        }),
      ]);
    }
  } catch (err) {
    console.error("Failed to copy:", err);
  }
}

copyPanel.querySelectorAll(".copy-option").forEach((btn) => {
  btn.addEventListener("click", () => copyAsFormat(btn.dataset.format));
});

// ---- About modal ----

let aboutOpen = false;

async function openAboutModal() {
  if (!aboutVersion.textContent) {
    const version = await invoke("get_app_version");
    aboutVersion.textContent = `v${version}`;
  }
  aboutOpen = true;
  aboutOverlay.classList.add("open");
}

function closeAboutModal() {
  aboutOpen = false;
  aboutOverlay.classList.remove("open");
}

aboutClose.addEventListener("click", closeAboutModal);
aboutOverlay.addEventListener("mousedown", (e) => {
  if (e.target === aboutOverlay) closeAboutModal();
});

// ---- Link click handling ----

content.addEventListener("click", async (e) => {
  const link = e.target.closest("a[href]");
  if (!link) return;

  const href = link.getAttribute("href");
  if (!href) return;

  // Anchor link — scroll within content-wrapper (default scroll targets <html> which is overflow:hidden)
  if (href.startsWith("#")) {
    e.preventDefault();
    const id = decodeURIComponent(href.slice(1));
    const target = id && content.querySelector(`[id="${CSS.escape(id)}"]`);
    if (target) target.scrollIntoView({ block: "start", behavior: "smooth" });
    return;
  }

  e.preventDefault();

  // External link — open in system browser
  if (/^[a-z][a-z0-9+\-.]*:/i.test(href)) {
    try {
      await invoke("plugin:shell|open", { path: href });
    } catch (err) {
      console.warn("Could not open external link:", href, err);
    }
    return;
  }

  // Relative markdown link — open in app
  const cleanHref = href.split("#")[0].split("?")[0];
  if (/\.(md|markdown|mdown|mkd|mkdn|mdwn)$/i.test(cleanHref) && currentFilePath) {
    try {
      const resolved = await invoke("resolve_relative_path", {
        baseFile: currentFilePath,
        relative: cleanHref,
      });
      if (resolved) await openFile(resolved);
    } catch (err) {
      console.warn("Could not open linked file:", cleanHref, err);
    }
  }
});

// ---- Drag and drop ----

document.addEventListener("dragover", (e) => {
  e.preventDefault();
  e.stopPropagation();
});

document.addEventListener("drop", async (e) => {
  e.preventDefault();
  e.stopPropagation();
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    const path = files[0].path || files[0].name;
    if (path) {
      await openFile(path);
    }
  }
});

// ---- Keyboard shortcuts ----

document.addEventListener("keydown", (e) => {
  const ctrl = e.ctrlKey || e.metaKey;

  if (ctrl && e.key === "o") {
    e.preventDefault();
    openFileDialog();
  } else if (ctrl && e.key === "f") {
    e.preventDefault();
    openFindBar();
  } else if (ctrl && (e.key === "=" || e.key === "+")) {
    e.preventDefault();
    zoomIn();
  } else if (ctrl && e.key === "-") {
    e.preventDefault();
    zoomOut();
  } else if (ctrl && e.key === "0") {
    e.preventDefault();
    zoomReset();
  } else if (ctrl && e.key === "t") {
    e.preventDefault();
    toggleThemePanel();
  } else if (ctrl && e.key === "b") {
    e.preventDefault();
    toggleDrawer();
  } else if (ctrl && e.key === "r") {
    e.preventDefault();
    reloadCurrentFile();
  } else if (ctrl && e.shiftKey && e.key.toLowerCase() === "v") {
    e.preventDefault();
    loadFromClipboard();
  } else if (e.key === "Escape") {
    if (aboutOpen) closeAboutModal();
    else if (findBar.classList.contains("open")) closeFindBar();
    else if (copyPanelOpen) closeCopyPanel();
    else if (themePanelOpen) closeThemePanel();
    else if (recentPanelOpen) closeRecentPanel();
    else if (drawerOpen) closeDrawer();
  }
});

// Ctrl+scroll for zoom
contentWrapper.addEventListener(
  "wheel",
  (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        zoomIn();
      } else {
        zoomOut();
      }
    }
  },
  { passive: false }
);

// ---- Button handlers ----

btnOpen.addEventListener("click", openFileDialog);
btnZoomIn.addEventListener("click", zoomIn);
btnZoomOut.addEventListener("click", zoomOut);
btnTheme.addEventListener("click", toggleThemePanel);
btnImportTheme.addEventListener("click", ThemeManager.importCustomTheme);
btnDrawer.addEventListener("click", toggleDrawer);
btnRecent.addEventListener("click", toggleRecentPanel);
btnReload.addEventListener("click", reloadCurrentFile);
btnCopy.addEventListener("click", toggleCopyPanel);
btnClipboard.addEventListener("click", loadFromClipboard);
btnAbout.addEventListener("click", openAboutModal);

// ---- Init: load file from CLI arg, restore zoom ----

async function init() {
  // Fetch all startup state in parallel (single IPC round-trip)
  const [savedZoom, initialFile, initialFolder] = await Promise.all([
    invoke("get_saved_zoom").catch(() => null),
    invoke("get_initial_file"),
    invoke("get_initial_folder"),
  ]);

  // Restore saved zoom
  if (savedZoom !== null && savedZoom >= ZOOM_MIN && savedZoom <= ZOOM_MAX) {
    currentZoom = savedZoom;
    content.style.transform = `scale(${currentZoom / 100})`;
    content.style.transformOrigin = "top center";
    zoomLevelEl.textContent = `${currentZoom}%`;
  }

  // Load initial file from CLI arg
  if (initialFile) {
    await openFile(initialFile);
  }

  // If launched with a folder argument, auto-open the file drawer
  if (initialFolder) {
    toggleDrawer();
  }
}

init();
