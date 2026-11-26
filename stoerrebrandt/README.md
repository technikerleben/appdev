# Stoerrebrandt-Kampagne

Spielleiter-Cockpits für eine mehrteilige DSA-Kampagne. Jede Seite ist eine einzelne, in sich geschlossene HTML-Datei und läuft auch offline, wenn man sie herunterlädt.

## Inhalt

| Pfad | Teil | Stand |
|---|---|---|
| `havena/index.html` | Teil 2 – Havena | gespielt und abgeschlossen |
| `thorwal/index.html` | Teil 3 – Thorwal | elf Knoten fertig, ohne Vorlesetexte und Handouts |
| `material/` | Zusammenfassungen, Spielertexte, Bildprompts, Planung | laufend |

Teil 1 (Grangor) liegt nicht als Cockpit vor. Teil 4 ist noch nicht geplant.

## Aufrufen

- Übersicht: `/stoerrebrandt/`
- Havena: `/stoerrebrandt/havena/`
- Thorwal: `/stoerrebrandt/thorwal/`

Das Projekt ist SSO-geschützt. Die Seiten enthalten Spielleiterwissen und sind zusätzlich per `X-Robots-Tag` von der Indexierung ausgenommen.

## Technischer Hinweis

Die Cockpits führen ihr gesamtes JavaScript inline in der HTML-Datei, damit sie als Einzeldatei weitergegeben und offline benutzt werden können. Die globale CSP des Projekts erlaubt kein Inline-Skript, deshalb enthält `vercel.json` eine auf `/stoerrebrandt/(.*)` begrenzte Ausnahme mit `script-src 'self' 'unsafe-inline'`. Alle anderen Pfade bleiben unverändert.

Wenn diese Ausnahme irgendwann stören sollte, lässt sich das Skript pro Cockpit in eine eigene `app.js` auslagern. Dann ist die Datei allerdings nicht mehr als Einzeldatei portabel.

## Daten

Notizen, Marker, Knotenfortschritt und die Heldengruppe liegen im `localStorage` des jeweiligen Browsers, getrennt pro Cockpit (`havena-cockpit-v2`, `thorwal-cockpit-v1`). Sie wandern nicht zwischen Geräten. Jedes Cockpit hat oben rechts „Sichern“ und „Laden“ für den Export als JSON.
