"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { compactPage, validateWebhook } = require("../api/trmnl");

test("accepts official TRMNL custom plugin webhooks", () => {
  assert.equal(validateWebhook("https://usetrmnl.com/api/custom_plugins/abc_123").hostname, "usetrmnl.com");
});

test("rejects arbitrary webhook targets", () => {
  assert.throws(() => validateWebhook("https://example.org/api/custom_plugins/abc"), /offizielle/);
  assert.throws(() => validateWebhook("http://usetrmnl.com/api/custom_plugins/abc"), /offizielle/);
});

test("compacts page input", () => {
  const page = compactPage({ title: "A".repeat(120), lines: ["Zutat"], page: 2, pages: 4, start: 5 });
  assert.equal(page.title.length, 90);
  assert.deepEqual(page.lines, ["Zutat"]);
  assert.equal(page.page, 2);
  assert.equal(page.start, 5);
});
