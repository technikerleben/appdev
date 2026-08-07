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
  const page = compactPage({ title: "A".repeat(120), entries: [{ marker: "•", text: "Zutat" }], page: 2, pages: 4 });
  assert.equal(page.title.length, 90);
  assert.deepEqual(page.entries, [{ marker: "•", text: "Zutat" }]);
  assert.equal(page.page, 2);
});
