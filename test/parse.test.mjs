// Pure-function tests for js/parse.js. Loaded the same way the browser
// would (via window.BeliParse) rather than restructured into modules, so
// these test the actual shipped code, not a parallel copy of it.
import { test } from "node:test";
import assert from "node:assert/strict";

global.window = globalThis;
await import("../js/parse.js");
const { normalizeName, parseLine, parseBlock } = window.BeliParse;

test("normalizeName strips punctuation, lowercases, and collapses whitespace", () => {
  assert.equal(normalizeName("Joe's Pizza!"), "joes pizza");
  assert.equal(normalizeName("  Multiple   Spaces "), "multiple spaces");
});

test("normalizeName handles empty/missing input", () => {
  assert.equal(normalizeName(""), "");
  assert.equal(normalizeName(undefined), "");
});

test("parseLine extracts name, score, and cuisine from a comma line", () => {
  assert.deepEqual(parseLine("Lilia - 9.2, Italian"), { name: "Lilia", score: 9.2, cuisine: "Italian" });
});

test("parseLine strips leading rank numbers and bullet markers", () => {
  assert.equal(parseLine("12) Via Carota - 9.0, Italian").name, "Via Carota");
  assert.equal(parseLine("- Ramen House - 7").name, "Ramen House");
  assert.equal(parseLine("* Taco Spot - 8").name, "Taco Spot");
});

test("parseLine picks the last plausible 0-10 score on the line, ignoring a leading rank", () => {
  const r = parseLine("14 Lilia 9.2 Italian");
  assert.equal(r.score, 9.2);
});

test("parseLine returns null for lines with no plausible score or no name", () => {
  assert.equal(parseLine("just some text with no number"), null);
  assert.equal(parseLine(""), null);
  assert.equal(parseLine("9"), null);
});

test("parseBlock parses multiple lines and silently drops invalid ones", () => {
  const items = parseBlock("Lilia - 9.2, Italian\nnot a line\nJoe's Pizza - 8.5, Pizza");
  assert.equal(items.length, 2);
  assert.equal(items[0].name, "Lilia");
  assert.equal(items[1].name, "Joe's Pizza");
});
