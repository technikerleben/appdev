# Stoerrebrandt-Kampagne

Spielleiter-Cockpits für eine mehrteilige DSA-Kampagne. Jede Seite ist eine einzelne, in sich geschlossene HTML-Datei und läuft auch offline, wenn man sie herunterlädt.

## Inhalt

| Pfad | Teil | Stand |
|---|---|---|
| `havena/index.html` | Teil 2 – Havena | gespielt und abgeschlossen |
| `thorwal/index.html` | Teil 3 – Thorwal | elf Knoten mit Vorlesetexten, neun Handouts fertig |
| `karte/index.html` | Teil 3 – Thorwal | interaktive 3D-Stadtkarte mit Heldenposition und Reiseweg |
| `material/` | Zusammenfassungen, Spielertexte, Bildprompts, Planung | laufend |
| `material/pdf/` | Handouts als druckfertige A4-PDF, einzeln und gesammelt | T1–T8, T7, T7b fertig |
| `o1-…webp` bis `o8-…webp` | Teil 3 – Thorwal | Ortsbilder nach `material/Thorwal_Bildprompt_Orte.md` |
| `material/bilder/` | Teil 3 – Thorwal | Figurenbögen P1 und P2 im Original, Einzelporträts ohne Namensplakette | sechs von acht Figuren; Tjalfe und Ylva fehlen noch |

Die sechs Porträts sind zusätzlich als Daten-URI in `thorwal/index.html` eingebettet, damit das Cockpit als Einzeldatei portabel bleibt. Sie erscheinen auf den Figurenkarten und in der Knoten-Seitenspalte unter „Gesichter in diesem Knoten“; ein Klick zeigt das Bild bildschirmfüllend zum Herzeigen, ohne Namen. Der Bogen P1 wurde noch mit den alten Platzhaltern „Der alte Seemann“ und „Der Kontorschreiber“ erzeugt; diese beiden Bilder sind nicht eingebunden.

Das Thorwal-Cockpit verlinkt die Handout-PDF direkt: auf jeder Handout-Karte unter „Druckfassung“, in der Seitenspalte jedes Knotens und gesammelt oben im Handout-Register. Die Links sind relativ (`../material/pdf/…`) und funktionieren nur, solange das Cockpit neben dem Materialordner liegt. Lädt man `thorwal/index.html` allein herunter, bleibt die Seite vollständig benutzbar, nur die PDF-Links laufen dann ins Leere.

## 3D-Karte Thorwal

`karte/` enthält die Karte und ihre Bibliotheken unter `karte/vendor/` (three.js r128 mit OrbitControls, MIT-Lizenz, sowie die Schriften Grenze Gotisch und Alegreya Sans, SIL OFL). Alles liegt lokal, weil die CSP dieses Pfads keine fremden Skripte und Schriften erlaubt.

Die Ortsbilder werden aus `stoerrebrandt/` geladen. Fest verknüpft sind:

| Datei | Ort |
|---|---|
| `o1-stoerrebrandt-kontor.webp` | Stoerrebrandt-Kontor (WS02) |
| `o2-hafenmeisterei-am-bodirufer.webp` | Hafenmeisterei am Bodirufer (BU02) |
| `o3-kartothek.webp` | Kartothek (WS08) |
| `o4-schule-der-hellsicht.webp` | Schule der Hellsicht (WS05) |
| `o5-swafnir-halla.webp` | Swafnir-Halla (T05) |
| `o6-folkehalla.webp` | Folkehalla (OS04) |
| `o7-gluecklicher-zechpreller.webp` | Glücklicher Zechpreller (G04) |
| `o8-werft-aril-arnesson.webp` | Werft Aril Arnesson (BU03) |

Fehlt eine Datei, zeigt die Karte den Ort ohne Bild. Weitere Bilder lassen sich in der Karte über „Bearbeiten“ → „Bilddatei“ jedem Ort zuweisen. Die Lage der Orte ist teils geschätzt (in der Karte vermerkt) und lässt sich verschieben. Der Spielstand liegt im `localStorage` unter `thorwal-karte-v1`.

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

Die Karte enthält bewusst nur Ortsnamen und Bilder, keine Abenteuerinhalte. Beschreibungen, Knoten und Kürzel stehen ausschließlich im Cockpit und im Material.
