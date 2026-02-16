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
  const html = marked.parse(md);
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
