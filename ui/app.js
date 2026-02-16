/* ============================================================
   smd — Simple Markdown Viewer
   Main application logic
   ============================================================ */

const { invoke } = window.__TAURI__.core;

// ---- State ----

let currentZoom = 100;
const ZOOM_STEP = 10;
const ZOOM_MIN = 50;
const ZOOM_MAX = 200;

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

// ---- Markdown setup ----

marked.use({
  gfm: true,
  breaks: false,
});

function highlightCodeBlocks() {
  content.querySelectorAll("pre code").forEach((block) => {
    hljs.highlightElement(block);
  });
}

// ---- YAML Frontmatter ----

/**
 * Extract YAML frontmatter from markdown text.
 * Returns { meta: object|null, body: string }.
 */
function parseFrontmatter(text) {
  const match = text.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  if (!match) return { meta: null, body: text };

  const yamlBlock = match[1];
  const body = text.slice(match[0].length);
  const meta = parseSimpleYaml(yamlBlock);
  return { meta, body };
}

/**
 * Lightweight YAML parser for frontmatter.
 * Handles scalars, quoted strings, simple lists (both inline [...] and
 * indented "- item" style), and multi-line folded/literal strings.
 */
function parseSimpleYaml(yaml) {
  const result = {};
  const lines = yaml.split(/\r?\n/);
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip blank lines and comments
    if (/^\s*$/.test(line) || /^\s*#/.test(line)) { i++; continue; }

    // Match top-level key: value
    const kvMatch = line.match(/^([A-Za-z_][\w.-]*)\s*:\s*(.*)/);
    if (!kvMatch) { i++; continue; }

    const key = kvMatch[1];
    let rawVal = kvMatch[2].trim();

    // Inline list: [a, b, c]
    if (rawVal.startsWith("[") && rawVal.endsWith("]")) {
      result[key] = rawVal.slice(1, -1).split(",").map((s) => stripQuotes(s.trim())).filter(Boolean);
      i++; continue;
    }

    // Multi-line block scalar: | or >
    if (rawVal === "|" || rawVal === ">") {
      const fold = rawVal === ">";
      let block = "";
      i++;
      while (i < lines.length && /^[ \t]/.test(lines[i])) {
        block += (block && fold ? " " : (block ? "\n" : "")) + lines[i].replace(/^[ \t]+/, "");
        i++;
      }
      result[key] = block;
      continue;
    }

    // Indented list items on following lines
    if (rawVal === "") {
      // Check if next lines are list items
      const items = [];
      let j = i + 1;
      while (j < lines.length && /^[ \t]+- /.test(lines[j])) {
        items.push(stripQuotes(lines[j].replace(/^[ \t]+- /, "").trim()));
        j++;
      }
      if (items.length > 0) {
        result[key] = items;
        i = j; continue;
      }
      // Otherwise it's an empty value
      result[key] = "";
      i++; continue;
    }

    // Plain scalar or quoted string
    result[key] = stripQuotes(rawVal);
    i++;
  }

  return result;
}

function stripQuotes(s) {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  // Handle YAML booleans
  if (s === "true") return true;
  if (s === "false") return false;
  return s;
}

/**
 * Render frontmatter metadata as a styled HTML card.
 */
function renderFrontmatter(meta) {
  const rows = Object.entries(meta).map(([key, val]) => {
    const displayVal = Array.isArray(val)
      ? val.map((v) => `<span class="fm-tag">${escapeHtml(String(v))}</span>`).join(" ")
      : escapeHtml(String(val));
    return `<tr><td class="fm-key">${escapeHtml(key)}</td><td class="fm-val">${displayVal}</td></tr>`;
  });
  return `<div class="frontmatter"><table>${rows.join("")}</table></div>`;
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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

    // Update picker UI
    updatePickerSelection();
  }

  /** Apply font preset */
  function applyFont(presetId) {
    const presets = SmdThemes.getFontPresets();
    const preset = presets[presetId] || presets["system"];
    const root = document.documentElement;
    root.style.setProperty("--font-ui", preset.ui);
    root.style.setProperty("--font-code", preset.code);
    localStorage.setItem("smd-font", presetId);
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

// ---- Theme Panel Toggle ----

let themePanelOpen = false;

function toggleThemePanel() {
  themePanelOpen = !themePanelOpen;
  themePanel.classList.toggle("open", themePanelOpen);
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
});

// ---- Initialize Theme ----

ThemeManager.buildPicker();
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

// ---- File rendering ----

function showContent(md, filename) {
  const { meta, body } = parseFrontmatter(md);
  const fmHtml = meta ? renderFrontmatter(meta) : "";
  const html = fmHtml + marked.parse(body);
  content.innerHTML = html;
  highlightCodeBlocks();
  contentWrapper.classList.add("active");
  emptyState.classList.add("hidden");

  // Show just the filename in the toolbar
  const name = filename.split("/").pop().split("\\").pop();
  filenameEl.textContent = name;
  filenameEl.title = filename;

  // Update window title
  document.title = `${name} — smd`;
}

async function openFile(path) {
  try {
    const text = await invoke("read_file", { path });
    await invoke("set_current_file", { path });
    showContent(text, path);
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
  } else if (e.key === "Escape") {
    closeThemePanel();
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

// ---- Init: load file from CLI arg ----

async function init() {
  const initialFile = await invoke("get_initial_file");
  if (initialFile) {
    await openFile(initialFile);
  }
}

init();
