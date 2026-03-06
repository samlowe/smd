/* ============================================================
   smd — Theme Definitions
   Built-in themes + custom theme support
   ============================================================ */

const SmdThemes = (() => {
  // ---- Built-in Themes ----

  const builtIn = [
    {
      id: "github-light",
      name: "GitHub Light",
      type: "light",
      colors: {
        "--bg": "#ffffff",
        "--bg-secondary": "#f6f8fa",
        "--bg-tertiary": "#eef1f5",
        "--text": "#1f2328",
        "--text-secondary": "#636c76",
        "--text-muted": "#8b949e",
        "--border": "#d1d9e0",
        "--border-light": "#e8ebef",
        "--accent": "#0969da",
        "--accent-bg": "#ddf4ff",
        "--code-bg": "#f0f3f6",
        "--code-text": "#1f2328",
        "--blockquote-border": "#d1d9e0",
        "--blockquote-text": "#636c76",
        "--link": "#0969da",
        "--toolbar-bg": "#f6f8fa",
        "--toolbar-border": "#d1d9e0",
        "--btn-hover": "#e8ebef",
        "--shadow": "rgba(0, 0, 0, 0.06)",
        "--table-row-alt": "#f6f8fa",
        "--hr": "#d1d9e0",
        "--kbd-bg": "#f0f3f6",
        "--kbd-border": "#c5cdd5",
      },
      syntax: {
        "base": "#1f2328",
        "comment": "#6e7781",
        "keyword": "#cf222e",
        "tag": "#116329",
        "string": "#0a3069",
        "number": "#0550ae",
        "title": "#8250df",
        "type": "#953800",
        "symbol": "#0550ae",
        "built_in": "#0550ae",
        "meta": "#6e7781",
        "deletion-bg": "#ffebe9",
        "deletion": "#82071e",
        "addition-bg": "#dafbe1",
        "addition": "#116329",
      },
    },
    {
      id: "github-dark",
      name: "GitHub Dark",
      type: "dark",
      colors: {
        "--bg": "#0d1117",
        "--bg-secondary": "#161b22",
        "--bg-tertiary": "#1c2129",
        "--text": "#e6edf3",
        "--text-secondary": "#9da5ae",
        "--text-muted": "#6e7681",
        "--border": "#30363d",
        "--border-light": "#21262d",
        "--accent": "#58a6ff",
        "--accent-bg": "#122d4f",
        "--code-bg": "#161b22",
        "--code-text": "#e6edf3",
        "--blockquote-border": "#30363d",
        "--blockquote-text": "#9da5ae",
        "--link": "#58a6ff",
        "--toolbar-bg": "#161b22",
        "--toolbar-border": "#30363d",
        "--btn-hover": "#21262d",
        "--shadow": "rgba(0, 0, 0, 0.3)",
        "--table-row-alt": "#161b22",
        "--hr": "#30363d",
        "--kbd-bg": "#161b22",
        "--kbd-border": "#30363d",
      },
      syntax: {
        "base": "#e6edf3",
        "comment": "#8b949e",
        "keyword": "#ff7b72",
        "tag": "#7ee787",
        "string": "#a5d6ff",
        "number": "#79c0ff",
        "title": "#d2a8ff",
        "type": "#ffa657",
        "symbol": "#79c0ff",
        "built_in": "#79c0ff",
        "meta": "#8b949e",
        "deletion-bg": "#490202",
        "deletion": "#ffa198",
        "addition-bg": "#04260f",
        "addition": "#7ee787",
      },
    },
    {
      id: "monokai",
      name: "Monokai",
      type: "dark",
      colors: {
        "--bg": "#272822",
        "--bg-secondary": "#1e1f1a",
        "--bg-tertiary": "#33342c",
        "--text": "#f8f8f2",
        "--text-secondary": "#b8b8a8",
        "--text-muted": "#75715e",
        "--border": "#3e3d32",
        "--border-light": "#3e3d32",
        "--accent": "#66d9ef",
        "--accent-bg": "#1a3a42",
        "--code-bg": "#1e1f1a",
        "--code-text": "#f8f8f2",
        "--blockquote-border": "#75715e",
        "--blockquote-text": "#b8b8a8",
        "--link": "#66d9ef",
        "--toolbar-bg": "#1e1f1a",
        "--toolbar-border": "#3e3d32",
        "--btn-hover": "#3e3d32",
        "--shadow": "rgba(0, 0, 0, 0.3)",
        "--table-row-alt": "#1e1f1a",
        "--hr": "#3e3d32",
        "--kbd-bg": "#1e1f1a",
        "--kbd-border": "#3e3d32",
      },
      syntax: {
        "base": "#f8f8f2",
        "comment": "#75715e",
        "keyword": "#f92672",
        "tag": "#f92672",
        "string": "#e6db74",
        "number": "#ae81ff",
        "title": "#a6e22e",
        "type": "#66d9ef",
        "symbol": "#ae81ff",
        "built_in": "#66d9ef",
        "meta": "#75715e",
        "deletion-bg": "#4d1a1a",
        "deletion": "#f92672",
        "addition-bg": "#1a3d1a",
        "addition": "#a6e22e",
      },
    },
    {
      id: "seti",
      name: "Seti Black",
      type: "dark",
      colors: {
        "--bg": "#000000",
        "--bg-secondary": "#101010",
        "--bg-tertiary": "#333333",
        "--text": "#d7d7d7",
        "--text-secondary": "#aaaaaa",
        "--text-muted": "#677a83",
        "--border": "#2b2b2b",
        "--border-light": "#222222",
        "--accent": "#66d9ef",
        "--accent-bg": "#0d2a30",
        "--code-bg": "#101010",
        "--code-text": "#d7d7d7",
        "--blockquote-border": "#2b2b2b",
        "--blockquote-text": "#aaaaaa",
        "--link": "#66d9ef",
        "--toolbar-bg": "#000000",
        "--toolbar-border": "#2b2b2b",
        "--btn-hover": "#333333",
        "--shadow": "rgba(0, 0, 0, 0.5)",
        "--table-row-alt": "#101010",
        "--hr": "#2b2b2b",
        "--kbd-bg": "#101010",
        "--kbd-border": "#2b2b2b",
      },
      syntax: {
        "base": "#d7d7d7",
        "comment": "#677a83",
        "keyword": "#f92672",
        "tag": "#f92672",
        "string": "#e6db74",
        "number": "#ae81ff",
        "title": "#a6e22e",
        "type": "#66d9ef",
        "symbol": "#ae81ff",
        "built_in": "#66d9ef",
        "meta": "#677a83",
        "deletion-bg": "#3d0d16",
        "deletion": "#f92672",
        "addition-bg": "#1a3320",
        "addition": "#a6e22e",
      },
    },
    {
      id: "dracula",
      name: "Dracula",
      type: "dark",
      colors: {
        "--bg": "#282a36",
        "--bg-secondary": "#21222c",
        "--bg-tertiary": "#343746",
        "--text": "#f8f8f2",
        "--text-secondary": "#bfbfbf",
        "--text-muted": "#6272a4",
        "--border": "#44475a",
        "--border-light": "#383a4a",
        "--accent": "#bd93f9",
        "--accent-bg": "#2d2540",
        "--code-bg": "#21222c",
        "--code-text": "#f8f8f2",
        "--blockquote-border": "#6272a4",
        "--blockquote-text": "#bfbfbf",
        "--link": "#8be9fd",
        "--toolbar-bg": "#21222c",
        "--toolbar-border": "#44475a",
        "--btn-hover": "#44475a",
        "--shadow": "rgba(0, 0, 0, 0.3)",
        "--table-row-alt": "#21222c",
        "--hr": "#44475a",
        "--kbd-bg": "#21222c",
        "--kbd-border": "#44475a",
      },
      syntax: {
        "base": "#f8f8f2",
        "comment": "#6272a4",
        "keyword": "#ff79c6",
        "tag": "#ff79c6",
        "string": "#f1fa8c",
        "number": "#bd93f9",
        "title": "#50fa7b",
        "type": "#8be9fd",
        "symbol": "#bd93f9",
        "built_in": "#8be9fd",
        "meta": "#6272a4",
        "deletion-bg": "#4d1a2a",
        "deletion": "#ff5555",
        "addition-bg": "#1a3d1a",
        "addition": "#50fa7b",
      },
    },
    {
      id: "nord",
      name: "Nord",
      type: "dark",
      colors: {
        "--bg": "#2e3440",
        "--bg-secondary": "#272c36",
        "--bg-tertiary": "#3b4252",
        "--text": "#eceff4",
        "--text-secondary": "#d8dee9",
        "--text-muted": "#7b88a1",
        "--border": "#3b4252",
        "--border-light": "#434c5e",
        "--accent": "#88c0d0",
        "--accent-bg": "#1e2a30",
        "--code-bg": "#272c36",
        "--code-text": "#eceff4",
        "--blockquote-border": "#434c5e",
        "--blockquote-text": "#d8dee9",
        "--link": "#88c0d0",
        "--toolbar-bg": "#272c36",
        "--toolbar-border": "#3b4252",
        "--btn-hover": "#3b4252",
        "--shadow": "rgba(0, 0, 0, 0.25)",
        "--table-row-alt": "#272c36",
        "--hr": "#3b4252",
        "--kbd-bg": "#272c36",
        "--kbd-border": "#434c5e",
      },
      syntax: {
        "base": "#eceff4",
        "comment": "#616e88",
        "keyword": "#81a1c1",
        "tag": "#81a1c1",
        "string": "#a3be8c",
        "number": "#b48ead",
        "title": "#88c0d0",
        "type": "#8fbcbb",
        "symbol": "#b48ead",
        "built_in": "#88c0d0",
        "meta": "#616e88",
        "deletion-bg": "#3d2024",
        "deletion": "#bf616a",
        "addition-bg": "#243028",
        "addition": "#a3be8c",
      },
    },
    {
      id: "solarized-light",
      name: "Solarized Light",
      type: "light",
      colors: {
        "--bg": "#fdf6e3",
        "--bg-secondary": "#eee8d5",
        "--bg-tertiary": "#e8e1cb",
        "--text": "#657b83",
        "--text-secondary": "#839496",
        "--text-muted": "#93a1a1",
        "--border": "#ddd6c1",
        "--border-light": "#e8e1cb",
        "--accent": "#268bd2",
        "--accent-bg": "#e3effa",
        "--code-bg": "#eee8d5",
        "--code-text": "#657b83",
        "--blockquote-border": "#ddd6c1",
        "--blockquote-text": "#839496",
        "--link": "#268bd2",
        "--toolbar-bg": "#eee8d5",
        "--toolbar-border": "#ddd6c1",
        "--btn-hover": "#e8e1cb",
        "--shadow": "rgba(0, 0, 0, 0.06)",
        "--table-row-alt": "#eee8d5",
        "--hr": "#ddd6c1",
        "--kbd-bg": "#eee8d5",
        "--kbd-border": "#ddd6c1",
      },
      syntax: {
        "base": "#657b83",
        "comment": "#93a1a1",
        "keyword": "#859900",
        "tag": "#268bd2",
        "string": "#2aa198",
        "number": "#d33682",
        "title": "#268bd2",
        "type": "#b58900",
        "symbol": "#cb4b16",
        "built_in": "#268bd2",
        "meta": "#93a1a1",
        "deletion-bg": "#fce4e4",
        "deletion": "#dc322f",
        "addition-bg": "#dff0d8",
        "addition": "#859900",
      },
    },
    {
      id: "solarized-dark",
      name: "Solarized Dark",
      type: "dark",
      colors: {
        "--bg": "#002b36",
        "--bg-secondary": "#073642",
        "--bg-tertiary": "#094050",
        "--text": "#839496",
        "--text-secondary": "#93a1a1",
        "--text-muted": "#586e75",
        "--border": "#094050",
        "--border-light": "#073642",
        "--accent": "#268bd2",
        "--accent-bg": "#073642",
        "--code-bg": "#073642",
        "--code-text": "#839496",
        "--blockquote-border": "#094050",
        "--blockquote-text": "#93a1a1",
        "--link": "#268bd2",
        "--toolbar-bg": "#073642",
        "--toolbar-border": "#094050",
        "--btn-hover": "#094050",
        "--shadow": "rgba(0, 0, 0, 0.3)",
        "--table-row-alt": "#073642",
        "--hr": "#094050",
        "--kbd-bg": "#073642",
        "--kbd-border": "#094050",
      },
      syntax: {
        "base": "#839496",
        "comment": "#586e75",
        "keyword": "#859900",
        "tag": "#268bd2",
        "string": "#2aa198",
        "number": "#d33682",
        "title": "#268bd2",
        "type": "#b58900",
        "symbol": "#cb4b16",
        "built_in": "#268bd2",
        "meta": "#586e75",
        "deletion-bg": "#3d1417",
        "deletion": "#dc322f",
        "addition-bg": "#1a3320",
        "addition": "#859900",
      },
    },
    {
      id: "one-dark",
      name: "One Dark",
      type: "dark",
      colors: {
        "--bg": "#282c34",
        "--bg-secondary": "#21252b",
        "--bg-tertiary": "#2c313c",
        "--text": "#abb2bf",
        "--text-secondary": "#9da5b4",
        "--text-muted": "#636d83",
        "--border": "#3e4451",
        "--border-light": "#353b45",
        "--accent": "#61afef",
        "--accent-bg": "#1a2a3f",
        "--code-bg": "#21252b",
        "--code-text": "#abb2bf",
        "--blockquote-border": "#3e4451",
        "--blockquote-text": "#9da5b4",
        "--link": "#61afef",
        "--toolbar-bg": "#21252b",
        "--toolbar-border": "#3e4451",
        "--btn-hover": "#2c313c",
        "--shadow": "rgba(0, 0, 0, 0.3)",
        "--table-row-alt": "#21252b",
        "--hr": "#3e4451",
        "--kbd-bg": "#21252b",
        "--kbd-border": "#3e4451",
      },
      syntax: {
        "base": "#abb2bf",
        "comment": "#5c6370",
        "keyword": "#c678dd",
        "tag": "#e06c75",
        "string": "#98c379",
        "number": "#d19a66",
        "title": "#61afef",
        "type": "#e5c07b",
        "symbol": "#d19a66",
        "built_in": "#e06c75",
        "meta": "#5c6370",
        "deletion-bg": "#3d1a1e",
        "deletion": "#e06c75",
        "addition-bg": "#1e3a1e",
        "addition": "#98c379",
      },
    },
    {
      id: "tokyo-night",
      name: "Tokyo Night",
      type: "dark",
      colors: {
        "--bg": "#1a1b26",
        "--bg-secondary": "#16161e",
        "--bg-tertiary": "#1e202e",
        "--text": "#a9b1d6",
        "--text-secondary": "#9aa5ce",
        "--text-muted": "#51597d",
        "--border": "#101014",
        "--border-light": "#1e202e",
        "--accent": "#7aa2f7",
        "--accent-bg": "#1a2040",
        "--code-bg": "#16161e",
        "--code-text": "#a9b1d6",
        "--blockquote-border": "#101014",
        "--blockquote-text": "#9aa5ce",
        "--link": "#7aa2f7",
        "--toolbar-bg": "#16161e",
        "--toolbar-border": "#101014",
        "--btn-hover": "#1e202e",
        "--shadow": "rgba(0, 0, 0, 0.35)",
        "--table-row-alt": "#16161e",
        "--hr": "#101014",
        "--kbd-bg": "#16161e",
        "--kbd-border": "#101014",
      },
      syntax: {
        "base": "#a9b1d6",
        "comment": "#51597d",
        "keyword": "#bb9af7",
        "tag": "#f7768e",
        "string": "#9ece6a",
        "number": "#ff9e64",
        "title": "#7aa2f7",
        "type": "#0db9d7",
        "symbol": "#e0af68",
        "built_in": "#2ac3de",
        "meta": "#51597d",
        "deletion-bg": "#3d1a24",
        "deletion": "#f7768e",
        "addition-bg": "#1e3a24",
        "addition": "#9ece6a",
      },
    },
    {
      id: "gruvbox-dark",
      name: "Gruvbox Dark",
      type: "dark",
      colors: {
        "--bg": "#282828",
        "--bg-secondary": "#1d2021",
        "--bg-tertiary": "#3c3836",
        "--text": "#ebdbb2",
        "--text-secondary": "#d5c4a1",
        "--text-muted": "#928374",
        "--border": "#3c3836",
        "--border-light": "#504945",
        "--accent": "#83a598",
        "--accent-bg": "#1d2a28",
        "--code-bg": "#1d2021",
        "--code-text": "#ebdbb2",
        "--blockquote-border": "#504945",
        "--blockquote-text": "#d5c4a1",
        "--link": "#83a598",
        "--toolbar-bg": "#1d2021",
        "--toolbar-border": "#3c3836",
        "--btn-hover": "#3c3836",
        "--shadow": "rgba(0, 0, 0, 0.3)",
        "--table-row-alt": "#1d2021",
        "--hr": "#3c3836",
        "--kbd-bg": "#1d2021",
        "--kbd-border": "#504945",
      },
      syntax: {
        "base": "#ebdbb2",
        "comment": "#928374",
        "keyword": "#fb4934",
        "tag": "#8ec07c",
        "string": "#b8bb26",
        "number": "#d3869b",
        "title": "#83a598",
        "type": "#fabd2f",
        "symbol": "#d3869b",
        "built_in": "#fe8019",
        "meta": "#928374",
        "deletion-bg": "#4d1a1a",
        "deletion": "#fb4934",
        "addition-bg": "#1d3d1a",
        "addition": "#b8bb26",
      },
    },
    {
      id: "gruvbox-light",
      name: "Gruvbox Light",
      type: "light",
      colors: {
        "--bg": "#fbf1c7",
        "--bg-secondary": "#f2e5bc",
        "--bg-tertiary": "#ebdbb2",
        "--text": "#3c3836",
        "--text-secondary": "#504945",
        "--text-muted": "#928374",
        "--border": "#d5c4a1",
        "--border-light": "#ebdbb2",
        "--accent": "#076678",
        "--accent-bg": "#dce5e1",
        "--code-bg": "#f2e5bc",
        "--code-text": "#3c3836",
        "--blockquote-border": "#d5c4a1",
        "--blockquote-text": "#504945",
        "--link": "#076678",
        "--toolbar-bg": "#f2e5bc",
        "--toolbar-border": "#d5c4a1",
        "--btn-hover": "#ebdbb2",
        "--shadow": "rgba(0, 0, 0, 0.06)",
        "--table-row-alt": "#f2e5bc",
        "--hr": "#d5c4a1",
        "--kbd-bg": "#f2e5bc",
        "--kbd-border": "#d5c4a1",
      },
      syntax: {
        "base": "#3c3836",
        "comment": "#928374",
        "keyword": "#9d0006",
        "tag": "#427b58",
        "string": "#79740e",
        "number": "#8f3f71",
        "title": "#076678",
        "type": "#b57614",
        "symbol": "#af3a03",
        "built_in": "#076678",
        "meta": "#928374",
        "deletion-bg": "#fce4e4",
        "deletion": "#9d0006",
        "addition-bg": "#dff0d8",
        "addition": "#79740e",
      },
    },
  ];

  // ---- Font presets ----

  const fontPresets = {
    "system": {
      name: "System Default",
      ui: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif',
      code: '"SF Mono", "Fira Code", "Fira Mono", "Roboto Mono", Menlo, Consolas, monospace',
    },
    "inter": {
      name: "Inter",
      ui: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      code: '"JetBrains Mono", "Fira Code", "SF Mono", Menlo, monospace',
    },
    "jetbrains": {
      name: "JetBrains Mono",
      ui: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      code: '"JetBrains Mono", "Fira Code", "SF Mono", Menlo, monospace',
    },
    "fira": {
      name: "Fira Code",
      ui: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      code: '"Fira Code", "Fira Mono", "SF Mono", Menlo, monospace',
    },
    "iosevka": {
      name: "Iosevka",
      ui: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      code: 'Iosevka, "Iosevka Term", "Fira Code", "SF Mono", Menlo, monospace',
    },
    "source": {
      name: "Source Code Pro",
      ui: '"Source Sans 3", "Source Sans Pro", -apple-system, sans-serif',
      code: '"Source Code Pro", "SF Mono", Menlo, monospace',
    },
  };

  // ---- Helpers ----

  /** Get all built-in themes */
  function getBuiltIn() {
    return builtIn;
  }

  /** Get font presets */
  function getFontPresets() {
    return fontPresets;
  }

  /** Load custom themes from localStorage */
  function getCustomThemes() {
    try {
      const raw = localStorage.getItem("smd-custom-themes");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /** Save custom themes to localStorage */
  function saveCustomThemes(themes) {
    localStorage.setItem("smd-custom-themes", JSON.stringify(themes));
  }

  /** Get all themes (built-in + custom) */
  function getAll() {
    return [...builtIn, ...getCustomThemes()];
  }

  /** Find a theme by ID */
  function find(id) {
    return getAll().find((t) => t.id === id) || builtIn[0];
  }

  /**
   * Generate CSS for syntax highlighting from a theme's syntax object.
   * Returns a string of CSS rules.
   */
  function generateSyntaxCSS(syntax) {
    if (!syntax) return "";
    return `
.hljs { color: ${syntax.base}; }
.hljs-comment, .hljs-quote { color: ${syntax.comment}; font-style: italic; }
.hljs-keyword, .hljs-selector-tag, .hljs-meta .hljs-keyword { color: ${syntax.keyword}; }
.hljs-tag, .hljs-name, .hljs-attribute { color: ${syntax.tag}; }
.hljs-string, .hljs-doctag, .hljs-regexp { color: ${syntax.string}; }
.hljs-number, .hljs-literal, .hljs-variable, .hljs-template-variable { color: ${syntax.number}; }
.hljs-title, .hljs-section, .hljs-selector-id { color: ${syntax.title}; font-weight: 600; }
.hljs-type, .hljs-class .hljs-title { color: ${syntax.type}; }
.hljs-symbol, .hljs-bullet { color: ${syntax.symbol}; }
.hljs-built_in, .hljs-builtin-name { color: ${syntax.built_in}; }
.hljs-meta { color: ${syntax.meta}; }
.hljs-deletion { background-color: ${syntax["deletion-bg"]}; color: ${syntax.deletion}; }
.hljs-addition { background-color: ${syntax["addition-bg"]}; color: ${syntax.addition}; }
.hljs-emphasis { font-style: italic; }
.hljs-strong { font-weight: bold; }`;
  }

  /**
   * Validate a custom theme object. Returns true if valid.
   */
  function validate(theme) {
    if (!theme || typeof theme !== "object") return false;
    if (!theme.id || !theme.name || !theme.type) return false;
    if (theme.type !== "light" && theme.type !== "dark") return false;
    if (!theme.colors || typeof theme.colors !== "object") return false;
    // Check required color keys exist
    const required = ["--bg", "--text", "--code-bg", "--code-text"];
    return required.every((k) => theme.colors[k]);
  }

  return {
    getBuiltIn,
    getAll,
    find,
    getCustomThemes,
    saveCustomThemes,
    getFontPresets,
    generateSyntaxCSS,
    validate,
  };
})();

// Export for Node.js testing; no-op in browser
if (typeof module !== "undefined" && module.exports) {
  module.exports = SmdThemes;
}
