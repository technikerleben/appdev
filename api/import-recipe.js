"use strict";

const dns = require("node:dns").promises;
const net = require("node:net");
const { parseRecipeHtml } = require("../lib/recipe-parser");

const MAX_HTML_BYTES = 3 * 1024 * 1024;

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function isPrivateAddress(address) {
  if (net.isIPv4(address)) {
    const octets = address.split(".").map(Number);
    return octets[0] === 10 || octets[0] === 127 || octets[0] === 0 ||
      (octets[0] === 169 && octets[1] === 254) ||
      (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
      (octets[0] === 192 && octets[1] === 168);
  }
  if (net.isIPv6(address)) {
    const normalized = address.toLowerCase();
    return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:");
  }
  return true;
}

async function assertPublicUrl(raw) {
  let url;
  try { url = new URL(raw); } catch { throw new Error("Bitte gib einen vollständigen Rezeptlink ein."); }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Nur HTTP- und HTTPS-Links sind erlaubt.");
  if (url.username || url.password) throw new Error("Links mit Zugangsdaten werden nicht unterstützt.");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) throw new Error("Lokale Adressen sind nicht erlaubt.");
  const addresses = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) throw new Error("Diese Adresse kann nicht abgerufen werden.");
  return url;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Nur POST wird unterstützt." });
  try {
    const rawUrl = req.body?.url || (typeof req.body === "string" ? JSON.parse(req.body).url : "");
    const url = await assertPublicUrl(rawUrl);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    let response;
    try {
      let currentUrl = url;
      for (let redirects = 0; redirects <= 5; redirects++) {
        response = await fetch(currentUrl, {
          redirect: "manual",
          signal: controller.signal,
          headers: {
            "User-Agent": "TRMNL-Rezeptanzeige/1.0 (+https://github.com/technikerleben/appdev)",
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "de-DE,de;q=0.9,en;q=0.6"
          }
        });
        if (![301, 302, 303, 307, 308].includes(response.status)) break;
        const location = response.headers.get("location");
        if (!location) throw new Error("Die Rezeptseite liefert eine ungültige Weiterleitung.");
        if (redirects === 5) throw new Error("Die Rezeptseite leitet zu häufig weiter.");
        currentUrl = await assertPublicUrl(new URL(location, currentUrl).toString());
      }
    } finally { clearTimeout(timer); }
    if (!response.ok) throw new Error(`Die Rezeptseite antwortet mit Status ${response.status}.`);
    const type = response.headers.get("content-type") || "";
    if (!type.includes("text/html") && !type.includes("application/xhtml+xml")) throw new Error("Der Link führt nicht zu einer HTML-Seite.");
    const length = Number(response.headers.get("content-length") || 0);
    if (length > MAX_HTML_BYTES) throw new Error("Die Rezeptseite ist zu groß für den Import.");
    const html = await response.text();
    if (Buffer.byteLength(html) > MAX_HTML_BYTES) throw new Error("Die Rezeptseite ist zu groß für den Import.");
    const recipe = parseRecipeHtml(html, response.url || url.toString());
    return send(res, 200, { recipe });
  } catch (error) {
    const status = error.code === "NO_RECIPE_DATA" ? 422 : 400;
    return send(res, status, { error: error.name === "AbortError" ? "Der Abruf hat zu lange gedauert." : error.message });
  }
};

module.exports.assertPublicUrl = assertPublicUrl;
