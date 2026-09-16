import { test } from "node:test";
import assert from "node:assert/strict";

global.window = globalThis;
await import("../js/importers.js");
const { parseCSV, parseGoogleTakeout } = window.BeliImporters;

test("parseCSV auto-detects columns and scales a 5-star rating to /10", () => {
  const csv = "Business Name,My Rating,Categories\nLilia,4.5,Italian\nVia Carota,5,Italian\n";
  const { items, warning, mapping } = parseCSV(csv);
  assert.equal(warning, null);
  assert.equal(items.length, 2);
  assert.equal(items[0].score, 9);
  assert.equal(items[1].score, 10);
  assert.equal(mapping.scaledFromStars, true);
  assert.equal(mapping.name, "Business Name");
  assert.equal(mapping.score, "My Rating");
});

test("parseCSV doesn't rescale when scores are already on a 0-10 scale", () => {
  const csv = "name,score\nLilia,9\nVia Carota,7\n";
  const { items, mapping } = parseCSV(csv);
  assert.equal(items[0].score, 9);
  assert.equal(mapping.scaledFromStars, false);
});

test("parseCSV warns when it can't find name/rating columns", () => {
  const { items, warning } = parseCSV("foo,bar\n1,2\n");
  assert.equal(items.length, 0);
  assert.ok(warning);
});

test("parseCSV handles quoted fields containing commas", () => {
  const csv = 'name,score,cuisine\n"Lilia, NYC",9,Italian\n';
  const { items } = parseCSV(csv);
  assert.equal(items[0].name, "Lilia, NYC");
});

test("parseCSV doesn't throw on a large file (regression: Math.max spread on scores)", () => {
  const rows = ["name,score"];
  for (let i = 0; i < 50000; i++) rows.push(`Restaurant ${i},${i % 10}`);
  assert.doesNotThrow(() => parseCSV(rows.join("\n")));
});

test("parseGoogleTakeout reads a Reviews.json GeoJSON export", () => {
  const json = JSON.stringify({
    features: [{ properties: { location: { name: "Lilia" }, five_star_rating_published: 4.5 } }],
  });
  const { items, warning } = parseGoogleTakeout(json);
  assert.equal(warning, null);
  assert.equal(items.length, 1);
  assert.equal(items[0].score, 9);
});

test("parseGoogleTakeout warns on non-GeoJSON input", () => {
  const { items, warning } = parseGoogleTakeout(JSON.stringify({ foo: "bar" }));
  assert.equal(items.length, 0);
  assert.ok(warning);
});

test("parseGoogleTakeout warns on invalid JSON instead of throwing", () => {
  const { items, warning } = parseGoogleTakeout("{not json");
  assert.equal(items.length, 0);
  assert.ok(warning);
});
