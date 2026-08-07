"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { durationToGerman, parseRecipeHtml } = require("../lib/recipe-parser");

test("converts ISO durations", () => {
  assert.equal(durationToGerman("PT1H25M"), "1 Std. 25 Min.");
  assert.equal(durationToGerman("PT35M"), "35 Min.");
});

test("extracts a recipe from JSON-LD graph", () => {
  const html = `<!doctype html><script type="application/ld+json">{
    "@context":"https://schema.org","@graph":[
      {"@type":"WebPage","name":"Test"},
      {"@type":["Recipe","Thing"],"name":"Ofengemüse &amp; Feta","recipeYield":"4 Portionen",
       "totalTime":"PT45M","recipeIngredient":["2 Paprika","200 g Feta"],
       "recipeInstructions":[{"@type":"HowToStep","text":"Gemüse schneiden."},{"@type":"HowToSection","itemListElement":[{"@type":"HowToStep","text":"Alles backen."}]}]}
    ]}</script>`;
  const recipe = parseRecipeHtml(html, "https://example.org/rezept");
  assert.equal(recipe.title, "Ofengemüse & Feta");
  assert.equal(recipe.totalTime, "45 Min.");
  assert.deepEqual(recipe.ingredients, ["2 Paprika", "200 g Feta"]);
  assert.deepEqual(recipe.instructions, ["Gemüse schneiden.", "Alles backen."]);
});

test("reports pages without recipe data", () => {
  assert.throws(() => parseRecipeHtml("<html><p>Kein Rezept</p></html>", "https://example.org"), /keine maschinenlesbaren Rezeptdaten/);
});
