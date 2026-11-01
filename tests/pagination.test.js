"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildRecipeOverview, ingredientDensity, summarizeInstructions, truncateText } = require("../trmnl-recipe/pagination");

test("shortens text at a readable boundary", () => {
  const source = "Eine sehr lange Erklärung mit mehreren wichtigen Angaben und einem sinnvollen Ende.";
  const shortened = truncateText(source, 45);
  assert.ok(shortened.endsWith(" …"));
  assert.ok(shortened.length <= 47);
});

test("creates exactly one overview and keeps every ingredient", () => {
  const ingredients = Array.from({ length: 18 }, (_, index) => `${index + 1} Portionen Zutat`);
  const overview = buildRecipeOverview({ ingredients, instructions: ["Alles vermischen.", "Fertig garen."] });
  assert.equal(overview.kind, "overview");
  assert.equal(overview.ingredients.length, ingredients.length);
  assert.deepEqual(overview.ingredients.map((entry) => entry.text), ingredients);
});

test("long preparation covers the complete sequence in at most six groups", () => {
  const instructions = Array.from({ length: 12 }, (_, index) => `Arbeitsschritt ${index + 1} mit einer ausführlichen Erklärung.`);
  const summary = summarizeInstructions(instructions);
  assert.equal(summary.entries.length, 6);
  assert.equal(summary.entries[0].marker, "1–2.");
  assert.equal(summary.entries.at(-1).marker, "11–12.");
  assert.equal(summary.shortened, true);
});

test("selects a tighter ingredient layout only when necessary", () => {
  assert.equal(ingredientDensity(["1 Ei", "Salz"]), "normal");
  assert.equal(ingredientDensity(Array.from({ length: 26 }, () => "Eine längere Zutatenangabe")), "tight");
});
