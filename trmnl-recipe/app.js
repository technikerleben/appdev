"use strict";

const $ = (selector) => document.querySelector(selector);
const STORAGE = { webhook: "kuechenblatt.webhook", recent: "kuechenblatt.recent" };
const state = { recipe: null, overview: null };

const elements = {
  importForm: $("#importForm"), recipeUrl: $("#recipeUrl"), importButton: $("#importButton"), manualRecipeButton: $("#manualRecipeButton"), message: $("#message"),
  workspace: $("#workspace"), workspaceTitle: $("#workspaceTitle"), editor: $("#editor"), editToggle: $("#editToggleButton"),
  title: $("#titleInput"), yield: $("#yieldInput"), time: $("#timeInput"), ingredients: $("#ingredientsInput"), instructions: $("#instructionsInput"),
  display: $("#deviceScreen"), send: $("#sendButton"),
  settingsButton: $("#settingsButton"), settingsDialog: $("#settingsDialog"), webhook: $("#webhookInput"), saveSettings: $("#saveSettingsButton"),
  recentSection: $("#recentSection"), recentList: $("#recentList"), recentTemplate: $("#recentTemplate"), clearRecent: $("#clearRecentButton")
};

function showMessage(text, type = "") {
  elements.message.textContent = text;
  elements.message.className = `message ${type}`.trim();
  elements.message.hidden = !text;
}

function lines(value) {
  return String(value || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function hostname(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}

function metaFor(recipe) {
  return [recipe.yield, recipe.totalTime].filter(Boolean).join("  ·  ") || "Rezeptübersicht";
}

function buildOverview(recipe) {
  return {
    ...window.RecipePagination.buildRecipeOverview(recipe),
    title: recipe.title,
    meta: metaFor(recipe),
    source: recipe.sourceName || hostname(recipe.sourceUrl)
  };
}

function populateEditor(recipe) {
  elements.title.value = recipe.title || "";
  elements.yield.value = recipe.yield || "";
  elements.time.value = recipe.totalTime || "";
  elements.ingredients.value = (recipe.ingredients || []).join("\n");
  elements.instructions.value = (recipe.instructions || []).join("\n");
}

function recipeFromEditor() {
  return {
    ...state.recipe,
    title: elements.title.value.trim() || "Unbenanntes Rezept",
    yield: elements.yield.value.trim(), totalTime: elements.time.value.trim(),
    ingredients: lines(elements.ingredients.value), instructions: lines(elements.instructions.value)
  };
}

function textElement(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = text;
  return node;
}

function entryList(className, entries) {
  const list = document.createElement("ol");
  list.className = className;
  entries.forEach((entry) => {
    const item = document.createElement("li");
    item.append(textElement("b", "", entry.marker), textElement("span", "", entry.text));
    list.append(item);
  });
  return list;
}

function renderScreen() {
  const page = state.overview;
  if (!page) return;
  elements.display.replaceChildren();
  const top = document.createElement("div");
  top.className = "screen-top";
  top.append(textElement("div", "screen-title", page.title));
  elements.display.append(top, textElement("div", "screen-meta", page.meta));

  const overview = document.createElement("div");
  overview.className = "screen-overview";
  const ingredients = document.createElement("section");
  ingredients.className = `screen-column screen-ingredients density-${page.ingredientDensity}`;
  ingredients.append(textElement("div", "screen-section", "Zutaten"), entryList("screen-list", page.ingredients));
  const preparation = document.createElement("section");
  preparation.className = "screen-column screen-preparation";
  preparation.append(
    textElement("div", "screen-section", page.preparationShortened ? "Zubereitung · kurz" : "Zubereitung"),
    entryList("screen-list steps", page.preparation)
  );
  overview.append(ingredients, preparation);
  elements.display.append(overview);
  if (page.source) elements.display.append(textElement("div", "screen-source", page.source));
}

function setRecipe(recipe, save = true) {
  state.recipe = recipe;
  state.overview = buildOverview(recipe);
  elements.workspaceTitle.textContent = recipe.title;
  elements.workspace.hidden = false;
  elements.editor.hidden = true;
  elements.editToggle.textContent = "Bearbeiten";
  populateEditor(recipe);
  renderScreen();
  if (save) addRecent(recipe);
  elements.workspace.scrollIntoView({ behavior: "smooth", block: "start" });
}

function getRecent() {
  try { return JSON.parse(localStorage.getItem(STORAGE.recent) || "[]"); } catch { return []; }
}

function addRecent(recipe) {
  const recent = getRecent().filter((item) => item.sourceUrl !== recipe.sourceUrl);
  recent.unshift({ ...recipe, savedAt: Date.now() });
  localStorage.setItem(STORAGE.recent, JSON.stringify(recent.slice(0, 5)));
  renderRecent();
}

function renderRecent() {
  const recent = getRecent();
  elements.recentList.replaceChildren();
  elements.recentSection.hidden = !recent.length;
  recent.forEach((recipe) => {
    const card = elements.recentTemplate.content.firstElementChild.cloneNode(true);
    card.querySelector("strong").textContent = recipe.title;
    card.querySelector("small").textContent = hostname(recipe.sourceUrl) || "Gespeichertes Rezept";
    card.addEventListener("click", () => setRecipe(recipe, false));
    elements.recentList.append(card);
  });
}

async function importRecipe(url) {
  elements.importButton.disabled = true;
  elements.importButton.querySelector("span").textContent = "Wird geladen …";
  showMessage("Rezeptseite wird gelesen …");
  try {
    const response = await fetch("/api/import-recipe", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Das Rezept konnte nicht importiert werden.");
    setRecipe(data.recipe);
    showMessage(`${data.recipe.ingredients.length} Zutaten wurden vollständig übernommen. Die Zubereitung wurde für eine Seite aufbereitet.`, "success");
  } catch (error) {
    showMessage(`${error.message} Du kannst eine andere Rezeptseite versuchen.`, "error");
  } finally {
    elements.importButton.disabled = false;
    elements.importButton.querySelector("span").textContent = "Rezept laden";
  }
}

async function sendOverview() {
  const webhook = localStorage.getItem(STORAGE.webhook) || "";
  if (!webhook) {
    showMessage("Hinterlege zuerst die Webhook-Adresse deines privaten TRMNL-Plugins.", "error");
    elements.webhook.value = "";
    elements.settingsDialog.showModal();
    return;
  }
  const original = elements.send.querySelector("span").textContent;
  elements.send.disabled = true;
  elements.send.querySelector("span").textContent = "Wird übertragen …";
  try {
    const response = await fetch("/api/trmnl", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ webhook, page: state.overview })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Die Übertragung ist fehlgeschlagen.");
    showMessage("Die einseitige Rezeptübersicht wurde an TRMNL übertragen.", "success");
  } catch (error) { showMessage(error.message, "error"); }
  finally { elements.send.disabled = false; elements.send.querySelector("span").textContent = original; }
}

function startManualRecipe() {
  const recipe = {
    title: "Eigenes Rezept",
    yield: "",
    totalTime: "",
    ingredients: [],
    instructions: [],
    sourceName: "Eigenes Rezept",
    sourceUrl: `manual:${Date.now()}`
  };
  setRecipe(recipe, false);
  elements.editor.hidden = false;
  elements.editToggle.textContent = "Bearbeitung schließen";
  elements.title.focus();
  elements.title.select();
  showMessage("Gib Titel, Zutaten und Zubereitung ein. Speichere anschließend deine Eingaben.", "success");
}

elements.manualRecipeButton.addEventListener("click", startManualRecipe);
elements.importForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const url = elements.recipeUrl.value.trim();
  if (url) importRecipe(url);
});
elements.editToggle.addEventListener("click", () => {
  elements.editor.hidden = !elements.editor.hidden;
  elements.editToggle.textContent = elements.editor.hidden ? "Bearbeiten" : "Bearbeitung schließen";
});
elements.editor.addEventListener("submit", (event) => {
  event.preventDefault();
  setRecipe(recipeFromEditor());
  showMessage("Deine Änderungen wurden übernommen.", "success");
});
elements.send.addEventListener("click", sendOverview);
elements.settingsButton.addEventListener("click", () => {
  elements.webhook.value = localStorage.getItem(STORAGE.webhook) || "";
  elements.settingsDialog.showModal();
});
elements.saveSettings.addEventListener("click", (event) => {
  event.preventDefault();
  const value = elements.webhook.value.trim();
  if (value) localStorage.setItem(STORAGE.webhook, value); else localStorage.removeItem(STORAGE.webhook);
  elements.settingsDialog.close();
  showMessage(value ? "TRMNL-Verbindung wurde gespeichert." : "TRMNL-Verbindung wurde entfernt.", "success");
});
elements.clearRecent.addEventListener("click", () => { localStorage.removeItem(STORAGE.recent); renderRecent(); });

function sharedUrl() {
  const params = new URLSearchParams(location.search);
  const direct = params.get("url");
  if (direct) return direct;
  const match = String(params.get("text") || "").match(/https?:\/\/\S+/);
  return match ? match[0] : "";
}

renderRecent();
const incomingUrl = sharedUrl();
if (incomingUrl) { elements.recipeUrl.value = incomingUrl; history.replaceState({}, "", location.pathname); importRecipe(incomingUrl); }
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
