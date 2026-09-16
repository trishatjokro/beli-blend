import { test } from "node:test";
import assert from "node:assert/strict";

global.window = globalThis;
await import("../js/parse.js");
await import("../js/algorithm.js");
const { cosineSimilarity, compute, computeGroup, tierLabel } = window.BeliAlgorithm;

test("cosineSimilarity of identical vectors is 1", () => {
  assert.ok(Math.abs(cosineSimilarity([1, 2, 3], [1, 2, 3]) - 1) < 1e-9);
});

test("cosineSimilarity returns null for a zero vector", () => {
  assert.equal(cosineSimilarity([0, 0], [1, 2]), null);
});

test("tierLabel boundaries", () => {
  assert.equal(tierLabel(100), "Same Stomach, Same Soul");
  assert.equal(tierLabel(81), "Same Stomach, Same Soul");
  assert.equal(tierLabel(80), "Great Eats Duo");
  assert.equal(tierLabel(61), "Great Eats Duo");
  assert.equal(tierLabel(60), "Solid Match");
  assert.equal(tierLabel(41), "Solid Match");
  assert.equal(tierLabel(40), "Curious Explorers");
  assert.equal(tierLabel(21), "Curious Explorers");
  assert.equal(tierLabel(20), "Different Palates");
  assert.equal(tierLabel(0), "Different Palates");
});

test("compute: identical rankings on different score baselines still hit 100%", () => {
  // Regression test for the mean-centering fix — plain cosine similarity
  // would previously under-score this because it only normalizes
  // magnitude, not offset.
  const a = { name: "A", restaurants: [{ name: "X", score: 9, cuisine: "" }, { name: "Y", score: 7, cuisine: "" }] };
  const b = { name: "B", restaurants: [{ name: "X", score: 6, cuisine: "" }, { name: "Y", score: 4, cuisine: "" }] };
  assert.equal(compute(a, b).pct, 100);
});

test("compute: perfectly inverted rankings score 0%, not a false positive", () => {
  const a = { name: "A", restaurants: [{ name: "X", score: 9, cuisine: "" }, { name: "Y", score: 3, cuisine: "" }] };
  const b = { name: "B", restaurants: [{ name: "X", score: 3, cuisine: "" }, { name: "Y", score: 9, cuisine: "" }] };
  assert.equal(compute(a, b).pct, 0);
});

test("compute: fuzzy-matches near-duplicate restaurant names", () => {
  const a = { name: "A", restaurants: [{ name: "Joe's Pizza", score: 9, cuisine: "Italian" }] };
  const b = { name: "B", restaurants: [{ name: "Joes Pizza NYC", score: 3, cuisine: "Italian" }] };
  const r = compute(a, b);
  assert.equal(r.shared.length, 1);
  assert.equal(r.shared[0].name, "Joe's Pizza");
  assert.equal(r.shared[0].scoreA, 9);
  assert.equal(r.shared[0].scoreB, 3);
});

test("compute: a fuzzy-matched restaurant isn't double-counted as a recommendation", () => {
  const a = { name: "A", restaurants: [{ name: "Joe's Pizza", score: 9, cuisine: "Italian" }] };
  const b = { name: "B", restaurants: [{ name: "Joes Pizza NYC", score: 3, cuisine: "Italian" }] };
  const r = compute(a, b);
  assert.equal(r.recsForA.length, 0);
  assert.equal(r.recsForB.length, 0);
});

test("compute: recommends restaurants the other person loves that you haven't ranked", () => {
  const a = { name: "A", restaurants: [] };
  const b = { name: "B", restaurants: [{ name: "Sushi Palace", score: 9.5, cuisine: "Japanese" }] };
  const r = compute(a, b);
  assert.equal(r.recsForA.length, 1);
  assert.equal(r.recsForA[0].name, "Sushi Palace");
});

test("computeGroup: headline pct is the average of every pairwise score", () => {
  const people = [
    { name: "A", restaurants: [{ name: "X", score: 9, cuisine: "" }, { name: "Y", score: 7, cuisine: "" }] },
    { name: "B", restaurants: [{ name: "X", score: 9, cuisine: "" }, { name: "Y", score: 7, cuisine: "" }] },
    { name: "C", restaurants: [{ name: "X", score: 2, cuisine: "" }, { name: "Y", score: 9, cuisine: "" }] },
  ];
  const r = computeGroup(people);
  const expected = Math.round(r.pairwise.reduce((s, p) => s + p.result.pct, 0) / r.pairwise.length);
  assert.equal(r.pct, expected);
});

test("computeGroup: bestPair/worstPair pick the highest/lowest scoring pairs", () => {
  const people = [
    { name: "A", restaurants: [{ name: "X", score: 9, cuisine: "" }, { name: "Y", score: 7, cuisine: "" }] },
    { name: "B", restaurants: [{ name: "X", score: 9, cuisine: "" }, { name: "Y", score: 7, cuisine: "" }] },
    { name: "C", restaurants: [{ name: "X", score: 2, cuisine: "" }, { name: "Y", score: 9, cuisine: "" }] },
  ];
  const r = computeGroup(people);
  assert.deepEqual([r.bestPair.i, r.bestPair.j], [0, 1]);
  assert.equal(r.bestPair.result.pct, 100);
  assert.ok(r.worstPair.result.pct < r.bestPair.result.pct);
});

test("computeGroup: shared-by-all requires every person to have ranked it", () => {
  const people = [
    { name: "A", restaurants: [{ name: "X", score: 9, cuisine: "" }] },
    { name: "B", restaurants: [{ name: "X", score: 8, cuisine: "" }] },
    { name: "C", restaurants: [{ name: "Y", score: 7, cuisine: "" }] },
  ];
  assert.equal(computeGroup(people).shared.length, 0);
});

test("computeGroup: mostAgreed is the shared restaurant with the lowest score variance", () => {
  const people = [
    { name: "A", restaurants: [{ name: "X", score: 9, cuisine: "" }, { name: "Y", score: 9, cuisine: "" }] },
    { name: "B", restaurants: [{ name: "X", score: 8, cuisine: "" }, { name: "Y", score: 1, cuisine: "" }] },
    { name: "C", restaurants: [{ name: "X", score: 9, cuisine: "" }, { name: "Y", score: 9, cuisine: "" }] },
  ];
  const r = computeGroup(people);
  assert.equal(r.mostAgreed.name, "X");
  assert.equal(r.topDisagreements[0].name, "Y");
});
