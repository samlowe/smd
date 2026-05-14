/* ============================================================
   smd — Shared Utility Functions
   Pure logic with no DOM or Tauri dependencies.
   ============================================================ */

/**
 * Simple safety check: ensure text is non-empty, has no null bytes,
 * and is mostly printable characters (won't crash the viewer).
 */
function isSafeText(text) {
  if (typeof text !== "string") return false;
  if (text.length === 0 || text.length >= 5_000_000) return false;
  if (text.includes("\x00")) return false;
  // Allow common text: printable ASCII, tabs, newlines, and high Unicode
  let printable = 0;
  for (let i = 0; i < Math.min(text.length, 1000); i++) {
    const code = text.charCodeAt(i);
    if (code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 126) || code >= 160) {
      printable++;
    }
  }
  const sampleLen = Math.min(text.length, 1000);
  return printable / sampleLen > 0.8;
}

/**
 * Extract the filename from a full path (cross-platform).
 * Works with both forward slashes and backslashes.
 */
function basename(filePath) {
  return filePath.split("/").pop().split("\\").pop();
}

/**
 * Extract the directory portion of a file path (cross-platform).
 */
function dirname(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  const parts = normalized.split("/");
  return parts.length > 1 ? parts.slice(0, -1).join("/") : "";
}

/**
 * Escape special HTML characters to prevent injection.
 */
function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Strip surrounding quotes from a YAML value and coerce booleans.
 */
function stripQuotes(s) {
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    return s.slice(1, -1);
  }
  if (s === "true") return true;
  if (s === "false") return false;
  return s;
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
    if (/^\s*$/.test(line) || /^\s*#/.test(line)) {
      i++;
      continue;
    }

    // Match top-level key: value
    const kvMatch = line.match(/^([A-Za-z_][\w.-]*)\s*:\s*(.*)/);
    if (!kvMatch) {
      i++;
      continue;
    }

    const key = kvMatch[1];
    let rawVal = kvMatch[2].trim();

    // Inline list: [a, b, c]
    if (rawVal.startsWith("[") && rawVal.endsWith("]")) {
      result[key] = rawVal
        .slice(1, -1)
        .split(",")
        .map((s) => stripQuotes(s.trim()))
        .filter(Boolean);
      i++;
      continue;
    }

    // Multi-line block scalar: | or >
    if (rawVal === "|" || rawVal === ">") {
      const fold = rawVal === ">";
      let block = "";
      i++;
      while (i < lines.length && /^[ \t]/.test(lines[i])) {
        block +=
          (block && fold ? " " : block ? "\n" : "") +
          lines[i].replace(/^[ \t]+/, "");
        i++;
      }
      result[key] = block;
      continue;
    }

    // Indented list items on following lines
    if (rawVal === "") {
      const items = [];
      let j = i + 1;
      while (j < lines.length && /^[ \t]+- /.test(lines[j])) {
        items.push(stripQuotes(lines[j].replace(/^[ \t]+- /, "").trim()));
        j++;
      }
      if (items.length > 0) {
        result[key] = items;
        i = j;
        continue;
      }
      result[key] = "";
      i++;
      continue;
    }

    // Plain scalar or quoted string
    result[key] = stripQuotes(rawVal);
    i++;
  }

  return result;
}

/**
 * Extract YAML frontmatter from markdown text.
 * Returns { meta: object|null, body: string }.
 */
function parseFrontmatter(text) {
  const match = text.match(
    /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/,
  );
  if (!match) return { meta: null, body: text };

  const yamlBlock = match[1];
  const body = text.slice(match[0].length);
  const meta = parseSimpleYaml(yamlBlock);
  return { meta, body };
}

/**
 * Render frontmatter metadata as a styled HTML card.
 */
function renderFrontmatter(meta) {
  const rows = Object.entries(meta).map(([key, val]) => {
    const displayVal = Array.isArray(val)
      ? val
          .map((v) => `<span class="fm-tag">${escapeHtml(String(v))}</span>`)
          .join(" ")
      : escapeHtml(String(val));
    return `<tr><td class="fm-key">${escapeHtml(key)}</td><td class="fm-val">${displayVal}</td></tr>`;
  });
  return `<div class="frontmatter"><table>${rows.join("")}</table></div>`;
}

// Export for Node.js testing; no-op in browser
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    basename,
    dirname,
    escapeHtml,
    stripQuotes,
    parseSimpleYaml,
    parseFrontmatter,
    renderFrontmatter,
    isSafeText,
  };
}
