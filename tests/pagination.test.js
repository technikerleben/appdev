"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { paginateRecipeContent, splitText, visualLines } = require("../trmnl-recipe/pagination");

test("splits unusually long text without losing words", () => {
  const source = "Ein sehr langer Arbeitsschritt. ".repeat(20).trim();
  const parts = splitText(source, 120);
  assert.ok(parts.length > 1);
  assert.equal(parts.join(" "), source);
  assert.ok(parts.every((part) => part.length <= 120));
});

test("paginates long recipes by visual line budget", () => {
  const recipe = {
    ingredients: Array.from({ length: 18 }, (_, index) => `${index + 1} Portionen einer längeren Zutat mit zusätzlicher Beschreibung`),
    instructions: Array.from({ length: 8 }, (_, index) => `Arbeitsschritt ${index + 1}: ${"Ausführliche Erklärung mit mehreren Einzelheiten. ".repeat(5)}`)
  };
  const pages = paginateRecipeContent(recipe);
  assert.ok(pages.filter((page) => page.kind === "ingredients").length >= 2);
  assert.ok(pages.filter((page) => page.kind === "steps").length >= 3);
  for (const page of pages.filter((item) => item.kind === "steps")) {
    const cost = page.entries.reduce((sum, entry) => sum + visualLines(entry, 66) + 0.35, 0);
    assert.ok(cost <= 9.5, `step page exceeds budget: ${cost}`);
  }
});

test("continuations keep the original step sequence visible", () => {
  const pages = paginateRecipeContent({ ingredients: [], instructions: ["Langer Schritt. ".repeat(40), "Kurzer Schritt."] });
  const markers = pages.flatMap((page) => page.entries.map((entry) => entry.marker));
  assert.equal(markers[0], "1.");
  assert.ok(markers.includes("↳"));
  assert.ok(markers.includes("2."));
});
