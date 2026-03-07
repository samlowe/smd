const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

// Mock localStorage for Node.js environment
global.localStorage = (() => {
  const store = {};
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { for (const k in store) delete store[k]; },
  };
})();

const SmdThemes = require("../themes");

// ---- getBuiltIn ----

describe("getBuiltIn", () => {
  it("returns an array of themes", () => {
    const themes = SmdThemes.getBuiltIn();
    assert.ok(Array.isArray(themes));
    assert.ok(themes.length > 0);
  });

  it("includes github-light and github-dark", () => {
    const ids = SmdThemes.getBuiltIn().map((t) => t.id);
    assert.ok(ids.includes("github-light"));
    assert.ok(ids.includes("github-dark"));
  });

  it("all themes have required fields", () => {
    for (const theme of SmdThemes.getBuiltIn()) {
      assert.ok(theme.id, `Missing id on theme`);
      assert.ok(theme.name, `Missing name on ${theme.id}`);
      assert.ok(
        theme.type === "light" || theme.type === "dark",
        `Invalid type on ${theme.id}`,
      );
      assert.ok(theme.colors, `Missing colors on ${theme.id}`);
      assert.ok(theme.syntax, `Missing syntax on ${theme.id}`);
    }
  });

  it("all themes have required color variables", () => {
    const required = ["--bg", "--text", "--code-bg", "--code-text"];
    for (const theme of SmdThemes.getBuiltIn()) {
      for (const key of required) {
        assert.ok(theme.colors[key], `Missing ${key} in ${theme.id}`);
      }
    }
  });

  it("all themes have required syntax keys", () => {
    const required = [
      "base", "comment", "keyword", "string", "number", "title", "type",
    ];
    for (const theme of SmdThemes.getBuiltIn()) {
      for (const key of required) {
        assert.ok(theme.syntax[key], `Missing syntax.${key} in ${theme.id}`);
      }
    }
  });
});

// ---- find ----

describe("find", () => {
  it("finds a theme by ID", () => {
    const theme = SmdThemes.find("github-dark");
    assert.equal(theme.id, "github-dark");
    assert.equal(theme.name, "GitHub Dark");
  });

  it("returns first built-in theme for unknown ID", () => {
    const theme = SmdThemes.find("nonexistent-theme");
    const first = SmdThemes.getBuiltIn()[0];
    assert.equal(theme.id, first.id);
  });
});

// ---- getAll ----

describe("getAll", () => {
  it("includes at least all built-in themes", () => {
    const all = SmdThemes.getAll();
    const builtIn = SmdThemes.getBuiltIn();
    assert.ok(all.length >= builtIn.length);
  });
});

// ---- getFontPresets ----

describe("getFontPresets", () => {
  it("returns an object with presets", () => {
    const presets = SmdThemes.getFontPresets();
    assert.ok(typeof presets === "object");
    assert.ok(Object.keys(presets).length > 0);
  });

  it("includes system preset", () => {
    const presets = SmdThemes.getFontPresets();
    assert.ok(presets.system);
    assert.ok(presets.system.name);
    assert.ok(presets.system.ui);
    assert.ok(presets.system.code);
  });

  it("all presets have name, ui, and code fields", () => {
    const presets = SmdThemes.getFontPresets();
    for (const [id, preset] of Object.entries(presets)) {
      assert.ok(preset.name, `Missing name for preset ${id}`);
      assert.ok(preset.ui, `Missing ui for preset ${id}`);
      assert.ok(preset.code, `Missing code for preset ${id}`);
    }
  });
});

// ---- generateSyntaxCSS ----

describe("generateSyntaxCSS", () => {
  it("generates CSS from syntax object", () => {
    const theme = SmdThemes.find("github-dark");
    const css = SmdThemes.generateSyntaxCSS(theme.syntax);
    assert.ok(css.includes(".hljs"));
    assert.ok(css.includes(".hljs-comment"));
    assert.ok(css.includes(".hljs-keyword"));
    assert.ok(css.includes(".hljs-string"));
  });

  it("returns empty string for null syntax", () => {
    assert.equal(SmdThemes.generateSyntaxCSS(null), "");
  });

  it("uses correct colors from theme", () => {
    const theme = SmdThemes.find("github-dark");
    const css = SmdThemes.generateSyntaxCSS(theme.syntax);
    assert.ok(css.includes(theme.syntax.keyword));
    assert.ok(css.includes(theme.syntax.string));
  });
});

// ---- validate ----

describe("validate", () => {
  it("accepts a valid theme", () => {
    const theme = {
      id: "test",
      name: "Test",
      type: "dark",
      colors: {
        "--bg": "#000",
        "--text": "#fff",
        "--code-bg": "#111",
        "--code-text": "#eee",
      },
    };
    assert.ok(SmdThemes.validate(theme));
  });

  it("rejects null", () => {
    assert.ok(!SmdThemes.validate(null));
  });

  it("rejects non-object", () => {
    assert.ok(!SmdThemes.validate("string"));
  });

  it("rejects missing id", () => {
    assert.ok(
      !SmdThemes.validate({
        name: "T",
        type: "dark",
        colors: { "--bg": "#000", "--text": "#fff", "--code-bg": "#111", "--code-text": "#eee" },
      }),
    );
  });

  it("rejects missing name", () => {
    assert.ok(
      !SmdThemes.validate({
        id: "t",
        type: "dark",
        colors: { "--bg": "#000", "--text": "#fff", "--code-bg": "#111", "--code-text": "#eee" },
      }),
    );
  });

  it("rejects invalid type", () => {
    assert.ok(
      !SmdThemes.validate({
        id: "t",
        name: "T",
        type: "invalid",
        colors: { "--bg": "#000", "--text": "#fff", "--code-bg": "#111", "--code-text": "#eee" },
      }),
    );
  });

  it("rejects missing colors", () => {
    assert.ok(
      !SmdThemes.validate({ id: "t", name: "T", type: "dark" }),
    );
  });

  it("rejects missing required color keys", () => {
    assert.ok(
      !SmdThemes.validate({
        id: "t",
        name: "T",
        type: "dark",
        colors: { "--bg": "#000" }, // missing --text, --code-bg, --code-text
      }),
    );
  });

  it("accepts light type", () => {
    const theme = {
      id: "test-light",
      name: "Light",
      type: "light",
      colors: {
        "--bg": "#fff",
        "--text": "#000",
        "--code-bg": "#eee",
        "--code-text": "#111",
      },
    };
    assert.ok(SmdThemes.validate(theme));
  });
});

// ---- custom themes ----

describe("custom themes", () => {
  it("getCustomThemes returns empty array by default", () => {
    localStorage.clear();
    const customs = SmdThemes.getCustomThemes();
    assert.deepEqual(customs, []);
  });

  it("saveCustomThemes and getCustomThemes round-trip", () => {
    const customs = [{ id: "custom-1", name: "Custom" }];
    SmdThemes.saveCustomThemes(customs);
    const loaded = SmdThemes.getCustomThemes();
    assert.deepEqual(loaded, customs);
    localStorage.clear();
  });
});
