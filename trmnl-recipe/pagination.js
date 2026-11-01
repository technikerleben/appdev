(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.RecipePagination = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function normalizeText(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }

  function truncateText(text, maxChars) {
    const source = normalizeText(text);
    if (source.length <= maxChars) return source;
    const window = source.slice(0, maxChars + 1);
    const sentence = Math.max(window.lastIndexOf(". "), window.lastIndexOf("! "), window.lastIndexOf("? "), window.lastIndexOf("; "));
    const word = window.lastIndexOf(" ");
    const cut = sentence >= Math.floor(maxChars * 0.6) ? sentence + 1 : word >= Math.floor(maxChars * 0.6) ? word : maxChars;
    return `${source.slice(0, cut).trim().replace(/[.,;:!?]+$/, "")} …`;
  }

  function compactGroup(instructions, maxChars) {
    const separatorLength = Math.max(0, instructions.length - 1) * 2;
    const share = Math.max(24, Math.floor((maxChars - separatorLength) / instructions.length));
    return instructions.map((instruction) => truncateText(instruction, share)).join("; ");
  }

  function summarizeInstructions(instructions, maxEntries = 6, maxChars = 118) {
    const source = (instructions || []).map(normalizeText).filter(Boolean);
    if (!source.length) return { entries: [{ marker: "•", text: "Zubereitung auf der Rezeptseite nachlesen." }], shortened: false };
    const groupCount = Math.min(maxEntries, source.length);
    const entries = [];
    let shortened = source.length > groupCount;

    for (let groupIndex = 0; groupIndex < groupCount; groupIndex += 1) {
      const start = Math.floor(groupIndex * source.length / groupCount);
      const end = Math.floor((groupIndex + 1) * source.length / groupCount);
      const group = source.slice(start, end);
      const text = compactGroup(group, maxChars);
      if (text.length < group.join("; ").length) shortened = true;
      entries.push({ marker: end - start > 1 ? `${start + 1}–${end}.` : `${start + 1}.`, text });
    }
    return { entries, shortened };
  }

  function ingredientDensity(ingredients) {
    const visualLines = ingredients.reduce((sum, ingredient) => sum + Math.max(1, Math.ceil(ingredient.length / 34)), 0);
    const rows = Math.ceil(visualLines / 2);
    if (rows > 12) return "tight";
    if (rows > 9) return "compact";
    return "normal";
  }

  function buildRecipeOverview(recipe) {
    const ingredients = (recipe.ingredients || []).map(normalizeText).filter(Boolean);
    const preparation = summarizeInstructions(recipe.instructions || []);
    return {
      kind: "overview",
      ingredients: ingredients.map((text) => ({ marker: "•", text })),
      preparation: preparation.entries,
      preparationShortened: preparation.shortened,
      ingredientDensity: ingredientDensity(ingredients)
    };
  }

  return { buildRecipeOverview, compactGroup, ingredientDensity, normalizeText, summarizeInstructions, truncateText };
});
