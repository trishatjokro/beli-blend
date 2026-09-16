import { test } from "node:test";
import assert from "node:assert/strict";

global.window = globalThis;
global.window.location = { href: "http://localhost:8123/", hash: "" };
await import("../js/state.js");
const { encode, decode, buildLink, readHash } = window.BeliState;

test("encode/decode round-trips arbitrary JSON", async () => {
  const data = { people: [{ name: "Trisha", restaurants: [{ name: "Lilia", score: 9, cuisine: "Italian" }] }] };
  const decoded = await decode(await encode(data));
  assert.deepEqual(decoded, data);
});

test("encode/decode round-trips names with special characters", async () => {
  const data = { name: "Joe's Pizza & Café <script>", restaurants: [] };
  const decoded = await decode(await encode(data));
  assert.deepEqual(decoded, data);
});

test("buildLink produces a URL with the given hash key", async () => {
  const link = await buildLink("gr", { people: [] });
  assert.ok(link.startsWith("http://localhost:8123/#gr="));
});

test("readHash splits key and value at the first =", () => {
  window.location.hash = "#gr=abc123";
  assert.deepEqual(readHash(), { key: "gr", value: "abc123" });
});

test("readHash returns null when there's no hash", () => {
  window.location.hash = "";
  assert.equal(readHash(), null);
});

test("readHash returns null when there's no = in the hash", () => {
  window.location.hash = "#justsomejunk";
  assert.equal(readHash(), null);
});
