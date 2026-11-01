"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { compactPage, validateWebhook } = require("../api/trmnl");

test("accepts official TRMNL custom plugin webhooks", () => {
  assert.equal(validateWebhook("https://usetrmnl.com/api/custom_plugins/abc_123").hostname, "usetrmnl.com");
  assert.equal(validateWebhook("https://trmnl.com/api/custom_plugins/abc-123").hostname, "trmnl.com");
});

test("rejects arbitrary webhook targets", () => {
  assert.throws(() => validateWebhook("https://example.org/api/custom_plugins/abc"), /offizielle/);
  assert.throws(() => validateWebhook("http://usetrmnl.com/api/custom_plugins/abc"), /offizielle/);
});

test("keeps all ingredients and compacts preparation", () => {
  const ingredients = Array.from({ length: 22 }, (_, index) => ({ marker: "•", text: `Zutat ${index + 1}` }));
  const preparation = Array.from({ length: 9 }, (_, index) => ({ marker: `${index + 1}.`, text: "Schritt" }));
  const page = compactPage({ title: "A".repeat(120), ingredients, preparation, ingredientDensity: "tight" });
  assert.equal(page.title.length, 90);
  assert.equal(page.ingredients.length, 22);
  assert.equal(page.preparation.length, 6);
  assert.equal(page.ingredient_density, "tight");
});
