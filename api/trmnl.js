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

function compactPage(page) {
  const entries = Array.isArray(page.entries) ? page.entries.slice(0, 12).map((entry) => ({
    marker: cleanString(entry?.marker, 5),
    text: cleanString(entry?.text, 240)
  })) : [];
  return {
    title: cleanString(page.title, 90),
    meta: cleanString(page.meta, 100),
    section: cleanString(page.section, 36),
    page: Number(page.page) || 1,
    pages: Number(page.pages) || 1,
    kind: page.kind === "steps" ? "steps" : "ingredients",
    entries,
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
    if (Buffer.byteLength(payload) > 2000) throw new Error("Diese Seite überschreitet das TRMNL-Limit von 2 KB.");
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
