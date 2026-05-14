const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { isSafeText } = require("../utils");

// ---- isSafeText ----

describe("isSafeText", () => {
  it("accepts plain markdown text", () => {
    assert.ok(isSafeText("# Hello\n\nThis is **bold** text."));
  });

  it("accepts empty string", () => {
    assert.ok(!isSafeText(""));
  });

  it("rejects null", () => {
    assert.ok(!isSafeText(null));
  });

  it("rejects undefined", () => {
    assert.ok(!isSafeText(undefined));
  });

  it("rejects numbers", () => {
    assert.ok(!isSafeText(42));
  });

  it("rejects objects", () => {
    assert.ok(!isSafeText({ foo: "bar" }));
  });

  it("rejects text with null bytes", () => {
    assert.ok(!isSafeText("hello\x00world"));
  });

  it("rejects text that is exactly 5MB", () => {
    const huge = "a".repeat(5_000_000);
    assert.ok(!isSafeText(huge));
  });

  it("rejects text over 5MB", () => {
    const huge = "a".repeat(5_000_001);
    assert.ok(!isSafeText(huge));
  });

  it("accepts text just under 5MB", () => {
    const big = "a".repeat(4_999_999);
    assert.ok(isSafeText(big));
  });

  it("accepts text with tabs and newlines", () => {
    assert.ok(isSafeText("line1\n\tline2\n\t\tline3"));
  });

  it("accepts unicode text", () => {
    assert.ok(isSafeText("Hello 世界 🌍 émojis work too"));
  });

  it("rejects mostly binary content", () => {
    const binary = String.fromCharCode(0x01, 0x02, 0x03, 0x04, 0x05);
    assert.ok(!isSafeText(binary));
  });

  it("rejects mixed text with too many control chars", () => {
    const bad = "hello" + "\x01\x02\x03\x04\x05\x06\x07\x08\x0b\x0c\x0e\x0f";
    assert.ok(!isSafeText(bad));
  });

  it("accepts text with some control chars if mostly printable", () => {
    const mostlyGood = "Hello world\n\nThis is a test.\n";
    assert.ok(isSafeText(mostlyGood));
  });

  it("accepts code blocks with backticks", () => {
    assert.ok(isSafeText("```js\nconst x = 1;\n```"));
  });

  it("accepts HTML-like markdown", () => {
    assert.ok(isSafeText("<div>\n\n# Heading\n\n</div>"));
  });

  it("accepts frontmatter", () => {
    assert.ok(isSafeText("---\ntitle: Test\n---\n\n# Hello"));
  });

  it("accepts mermaid diagrams", () => {
    assert.ok(isSafeText("```mermaid\ngraph TD;\n  A-->B;\n```"));
  });

  it("accepts tables", () => {
    assert.ok(isSafeText("| a | b |\n|---|---|\n| 1 | 2 |"));
  });

  it("accepts very long printable text", () => {
    const long = "a".repeat(100_000);
    assert.ok(isSafeText(long));
  });

  it("rejects string with only control characters", () => {
    assert.ok(!isSafeText("\x01\x02\x03\x04\x05"));
  });

  it("accepts single printable character", () => {
    assert.ok(isSafeText("x"));
  });

  it("accepts carriage returns", () => {
    assert.ok(isSafeText("line1\r\nline2"));
  });

  it("accepts high unicode (emoji, CJK)", () => {
    assert.ok(isSafeText("日本語テキストと🎉絵文字"));
  });
});
