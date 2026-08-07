"use strict";

const $ = (selector) => document.querySelector(selector);
const STORAGE = { webhook: "kuechenblatt.webhook", recent: "kuechenblatt.recent" };
const state = { recipe: null, pages: [], pageIndex: 0 };

const elements = {
  importForm: $("#importForm"), recipeUrl: $("#recipeUrl"), importButton: $("#importButton"), message: $("#message"),
  workspace: $("#workspace"), workspaceTitle: $("#workspaceTitle"), editor: $("#editor"), editToggle: $("#editToggleButton"),
  title: $("#titleInput"), yield: $("#yieldInput"), time: $("#timeInput"), ingredients: $("#ingredientsInput"), instructions: $("#instructionsInput"),
  display: $("#deviceScreen"), previous: $("#previousButton"), next: $("#nextButton"), pageLabel: $("#pageLabel"), send: $("#sendButton"),
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

function chunks(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

function hostname(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}

function metaFor(recipe) {
  return [recipe.yield, recipe.totalTime].filter(Boolean).join("  ·  ") || "Rezeptansicht";
}

function buildPages(recipe) {
  const drafts = [];
  chunks(recipe.ingredients || [], 10).forEach((part, index, all) => drafts.push({
    section: all.length > 1 ? `Zutaten ${index + 1}/${all.length}` : "Zutaten", kind: "ingredients", start: index * 10 + 1, lines: part
  }));
  chunks(recipe.instructions || [], 4).forEach((part, index, all) => drafts.push({
    section: all.length > 1 ? `Zubereitung ${index + 1}/${all.length}` : "Zubereitung", kind: "steps", start: index * 4 + 1, lines: part
  }));
  if (!drafts.length) drafts.push({ section: "Rezept", kind: "steps", start: 1, lines: [recipe.description || "Noch keine Zutaten oder Schritte eingetragen."] });
  return drafts.map((draft, index) => ({
    ...draft, title: recipe.title, meta: metaFor(recipe), page: index + 1, pages: drafts.length,
    source: recipe.sourceName || hostname(recipe.sourceUrl)
  }));
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

function renderScreen() {
  const page = state.pages[state.pageIndex];
  if (!page) return;
  elements.display.replaceChildren();
  const top = document.createElement("div");
  top.className = "screen-top";
  top.append(textElement("div", "screen-title", page.title), textElement("div", "screen-page", `${page.page}/${page.pages}`));
  elements.display.append(top, textElement("div", "screen-meta", page.meta), textElement("div", "screen-section", page.section));
  const list = document.createElement("ol");
  list.className = `screen-list ${page.kind === "steps" ? "steps" : ""}`;
  page.lines.forEach((line, index) => {
    const item = document.createElement("li");
    item.append(textElement("b", "", page.kind === "steps" ? `${page.start + index}.` : "•"), textElement("span", "", line));
    list.append(item);
  });
  elements.display.append(list);
  if (page.source) elements.display.append(textElement("div", "screen-source", page.source));
  elements.pageLabel.textContent = `${page.page} / ${page.pages}`;
  elements.previous.disabled = state.pageIndex === 0;
  elements.next.disabled = state.pageIndex === state.pages.length - 1;
}

function setRecipe(recipe, save = true) {
  state.recipe = recipe;
  state.pages = buildPages(recipe);
  state.pageIndex = 0;
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
    showMessage(`${data.recipe.ingredients.length} Zutaten und ${data.recipe.instructions.length} Schritte wurden übernommen.`, "success");
  } catch (error) {
    showMessage(`${error.message} Du kannst eine andere Rezeptseite versuchen.`, "error");
  } finally {
    elements.importButton.disabled = false;
    elements.importButton.querySelector("span").textContent = "Rezept laden";
  }
}

async function sendCurrentPage() {
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
    const page = state.pages[state.pageIndex];
    const response = await fetch("/api/trmnl", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ webhook, page })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Die Übertragung ist fehlgeschlagen.");
    showMessage(`Seite ${page.page} wurde an TRMNL übertragen.`, "success");
  } catch (error) { showMessage(error.message, "error"); }
  finally { elements.send.disabled = false; elements.send.querySelector("span").textContent = original; }
}

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
elements.previous.addEventListener("click", () => { if (state.pageIndex > 0) { state.pageIndex--; renderScreen(); } });
elements.next.addEventListener("click", () => { if (state.pageIndex < state.pages.length - 1) { state.pageIndex++; renderScreen(); } });
elements.send.addEventListener("click", sendCurrentPage);
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
