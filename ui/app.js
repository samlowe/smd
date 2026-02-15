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
const iconSun = document.getElementById("icon-sun");
const iconMoon = document.getElementById("icon-moon");

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

// ---- Theme ----

function getStoredTheme() {
  return localStorage.getItem("smd-theme");
}

function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("smd-theme", theme);
  if (theme === "dark") {
    iconSun.style.display = "none";
    iconMoon.style.display = "inline";
  } else {
    iconSun.style.display = "inline";
    iconMoon.style.display = "none";
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  applyTheme(current === "dark" ? "light" : "dark");
}

// Initialize theme
applyTheme(getStoredTheme() || getSystemTheme());

// Listen for system theme changes
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (e) => {
    if (!getStoredTheme()) {
      applyTheme(e.matches ? "dark" : "light");
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
    toggleTheme();
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
btnTheme.addEventListener("click", toggleTheme);

// ---- Init: load file from CLI arg ----

async function init() {
  const initialFile = await invoke("get_initial_file");
  if (initialFile) {
    await openFile(initialFile);
  }
}

init();
