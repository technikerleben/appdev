"use strict";

function decodeEntities(value) {
  if (value == null) return "";
  const entities = {
    amp: "&", quot: '"', apos: "'", lt: "<", gt: ">",
    nbsp: " ", ndash: "–", mdash: "—", hellip: "…"
  };
  return String(value)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => entities[name.toLowerCase()] || match)
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function hasRecipeType(value) {
  const types = Array.isArray(value) ? value : [value];
  return types.some((type) => String(type).toLowerCase() === "recipe");
}

function findRecipeNode(value, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return null;
  seen.add(value);
  if (hasRecipeType(value["@type"])) return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findRecipeNode(item, seen);
      if (found) return found;
    }
    return null;
  }
  const graph = value["@graph"];
  if (graph) {
    const found = findRecipeNode(graph, seen);
    if (found) return found;
  }
  for (const child of Object.values(value)) {
    const found = findRecipeNode(child, seen);
    if (found) return found;
  }
  return null;
}

function durationToGerman(value) {
  if (!value) return "";
  const raw = String(value).trim();
  const match = raw.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i);
  if (!match) return decodeEntities(raw);
  const parts = [];
  if (match[1]) parts.push(`${Number(match[1])} T.`);
  if (match[2]) parts.push(`${Number(match[2])} Std.`);
  if (match[3]) parts.push(`${Number(match[3])} Min.`);
  if (match[4] && !parts.length) parts.push(`${Number(match[4])} Sek.`);
  return parts.join(" ");
}

function instructionLines(value) {
  if (!value) return [];
  if (typeof value === "string") {
    return value.split(/\r?\n+/).map(decodeEntities).filter(Boolean);
  }
  if (Array.isArray(value)) return value.flatMap(instructionLines);
  if (typeof value === "object") {
    if (value.itemListElement) return instructionLines(value.itemListElement);
    const text = value.text || value.name;
    return text ? [decodeEntities(text)] : [];
  }
  return [];
}

function asText(value) {
  if (Array.isArray(value)) return value.map(decodeEntities).filter(Boolean).join(", ");
  return decodeEntities(value);
}

function normalizeRecipe(node, sourceUrl) {
  const ingredients = (Array.isArray(node.recipeIngredient)
    ? node.recipeIngredient
    : node.recipeIngredient ? [node.recipeIngredient] : [])
    .map(decodeEntities)
    .filter(Boolean);
  const instructions = instructionLines(node.recipeInstructions);
  const image = Array.isArray(node.image) ? node.image[0] : node.image;
  const imageUrl = typeof image === "object" && image ? image.url : image;

  return {
    title: decodeEntities(node.name) || "Unbenanntes Rezept",
    description: decodeEntities(node.description),
    yield: asText(node.recipeYield),
    prepTime: durationToGerman(node.prepTime),
    cookTime: durationToGerman(node.cookTime),
    totalTime: durationToGerman(node.totalTime),
    ingredients,
    instructions,
    image: imageUrl ? String(imageUrl) : "",
    sourceUrl,
    sourceName: decodeEntities(node.author?.name || node.publisher?.name),
  };
}

function extractJsonLd(html) {
  const blocks = [];
  const pattern = /<script\b[^>]*type\s*=\s*["']application\/ld\+json[^"']*["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = pattern.exec(html)) !== null) blocks.push(match[1]);
  return blocks;
}

function parseRecipeHtml(html, sourceUrl) {
  const errors = [];
  for (const block of extractJsonLd(html)) {
    const cleaned = block.trim().replace(/^<!--|-->$/g, "").replace(/^\/\/<!\[CDATA\[|\/\/\]\]>$/g, "").trim();
    try {
      const data = JSON.parse(cleaned);
      const recipe = findRecipeNode(data);
      if (recipe) return normalizeRecipe(recipe, sourceUrl);
    } catch (error) {
      errors.push(error.message);
    }
  }
  const detail = errors.length ? " Strukturierte Daten waren vorhanden, aber nicht lesbar." : "";
  const error = new Error(`Auf dieser Seite wurden keine maschinenlesbaren Rezeptdaten gefunden.${detail}`);
  error.code = "NO_RECIPE_DATA";
  throw error;
}

module.exports = { decodeEntities, durationToGerman, findRecipeNode, normalizeRecipe, parseRecipeHtml };
