(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.RecipePagination = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function splitText(text, maxChars) {
    const source = String(text || "").replace(/\s+/g, " ").trim();
    if (!source) return [];
    const parts = [];
    let rest = source;
    while (rest.length > maxChars) {
      const window = rest.slice(0, maxChars + 1);
      const sentence = Math.max(window.lastIndexOf(". "), window.lastIndexOf("! "), window.lastIndexOf("? "), window.lastIndexOf("; "));
      const word = window.lastIndexOf(" ");
      const cut = sentence >= Math.floor(maxChars * 0.55) ? sentence + 1 : word >= Math.floor(maxChars * 0.55) ? word : maxChars;
      parts.push(rest.slice(0, cut).trim());
      rest = rest.slice(cut).trim();
    }
    if (rest) parts.push(rest);
    return parts;
  }

  function visualLines(entry, charsPerLine) {
    return Math.max(1, Math.ceil((String(entry.text || "").length + String(entry.marker || "").length + 1) / charsPerLine));
  }

  function paginateSingleColumn(entries, lineBudget, charsPerLine) {
    const pages = [];
    let page = [];
    let used = 0;
    for (const entry of entries) {
      const cost = visualLines(entry, charsPerLine) + 0.35;
      if (page.length && used + cost > lineBudget) {
        pages.push(page);
        page = [];
        used = 0;
      }
      page.push(entry);
      used += cost;
    }
    if (page.length) pages.push(page);
    return pages;
  }

  function paginateTwoColumns(entries, lineBudget, charsPerLine) {
    const pages = [];
    let page = [];
    let used = 0;
    for (let index = 0; index < entries.length; index += 2) {
      const pair = entries.slice(index, index + 2);
      const cost = Math.max(...pair.map((entry) => visualLines(entry, charsPerLine))) + 0.4;
      if (page.length && used + cost > lineBudget) {
        pages.push(page);
        page = [];
        used = 0;
      }
      page.push(...pair);
      used += cost;
    }
    if (page.length) pages.push(page);
    return pages;
  }

  function paginateRecipeContent(recipe) {
    const drafts = [];
    const ingredientEntries = (recipe.ingredients || []).flatMap((ingredient) =>
      splitText(ingredient, 90).map((text, index) => ({ marker: index ? "↳" : "•", text }))
    );
    const ingredientPages = paginateTwoColumns(ingredientEntries, 8.5, 38);
    ingredientPages.forEach((entries, index) => drafts.push({
      section: ingredientPages.length > 1 ? `Zutaten ${index + 1}/${ingredientPages.length}` : "Zutaten",
      kind: "ingredients",
      entries
    }));

    const stepEntries = (recipe.instructions || []).flatMap((instruction, stepIndex) =>
      splitText(instruction, 230).map((text, partIndex) => ({ marker: partIndex ? "↳" : `${stepIndex + 1}.`, text }))
    );
    const stepPages = paginateSingleColumn(stepEntries, 9.5, 66);
    stepPages.forEach((entries, index) => drafts.push({
      section: stepPages.length > 1 ? `Zubereitung ${index + 1}/${stepPages.length}` : "Zubereitung",
      kind: "steps",
      entries
    }));

    if (!drafts.length) drafts.push({
      section: "Rezept",
      kind: "steps",
      entries: [{ marker: "•", text: recipe.description || "Noch keine Zutaten oder Schritte eingetragen." }]
    });
    return drafts;
  }

  return { paginateRecipeContent, paginateSingleColumn, paginateTwoColumns, splitText, visualLines };
});
