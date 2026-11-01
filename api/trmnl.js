"use strict";

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function validateWebhook(raw) {
  let url;
  try { url = new URL(raw); } catch { throw new Error("Die TRMNL-Webhook-Adresse ist ungültig."); }
  const hosts = new Set(["usetrmnl.com", "www.usetrmnl.com", "trmnl.com", "www.trmnl.com"]);
  if (url.protocol !== "https:" || !hosts.has(url.hostname.toLowerCase())) throw new Error("Es sind nur offizielle HTTPS-Webhooks von TRMNL erlaubt.");
  if (!/^\/api\/custom_plugins\/[A-Za-z0-9_-]+\/?$/.test(url.pathname)) throw new Error("Die Adresse ist kein gültiger TRMNL-Plugin-Webhook.");
  return url;
}

function cleanString(value, max) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function cleanEntries(entries, maxText) {
  return Array.isArray(entries) ? entries.map((entry) => ({
    marker: cleanString(entry?.marker, 7),
    text: cleanString(entry?.text, maxText)
  })).filter((entry) => entry.text) : [];
}

function compactPage(page) {
  return {
    title: cleanString(page.title, 90),
    meta: cleanString(page.meta, 100),
    kind: "overview",
    ingredients: cleanEntries(page.ingredients, 160),
    preparation: cleanEntries(page.preparation, 130).slice(0, 6),
    preparation_shortened: Boolean(page.preparationShortened),
    ingredient_density: ["normal", "compact", "tight"].includes(page.ingredientDensity) ? page.ingredientDensity : "normal",
    source: cleanString(page.source, 55),
    revision: Date.now()
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Nur POST wird unterstützt." });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const webhook = validateWebhook(body?.webhook);
    const mergeVariables = compactPage(body?.page || {});
    const payload = JSON.stringify({ merge_variables: mergeVariables });
    if (Buffer.byteLength(payload) > 4800) throw new Error("Die Zutatenliste ist für eine einzelne TRMNL-Seite ungewöhnlich lang. Kürze bitte nur ergänzende Hinweise in den Zutatenangaben.");
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: payload,
      redirect: "error"
    });
    if (!response.ok) throw new Error(`TRMNL hat die Übertragung mit Status ${response.status} abgelehnt.`);
    return send(res, 200, { ok: true });
  } catch (error) {
    return send(res, 400, { error: error.message });
  }
};

module.exports.validateWebhook = validateWebhook;
module.exports.compactPage = compactPage;
