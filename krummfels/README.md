# Schloss Krummfels – Kapitel 1: Die Sache mit der Krone

Eine kleine, direkt im Browser spielbare Point-and-Click-Demo zu Fenna, einer jungen Schlossbotin mit einem Geheimnis. Ihr Bruder Jorin verschwand vor drei Jahren als Knappe auf Schloss Krummfels. Während Fenna unter falschen Angaben nach ihm sucht, erklärt die königliche Krone ihre Kündigung.

**Spielen:** https://appdev-pi.vercel.app/krummfels/

## In dieser Demo enthalten

- 3 frei erkundbare Pixelräume: Burghof, Schlossküche, großer Saal
- 5 Figuren: Fenna, Korbinian, Mutter Malve, Sir Balduin, Magister Baldrian, dazu Hofmeister Eberhard (insgesamt sechs)
- Dialogauswahl und charakterbezogene Hinweise
- Gegenstände aufsammeln und anwenden, ohne Inventarbegrenzung
- Kleine Rätselkette: Raben ablenken → Glocke → Krönungssuppe → Saal betreten → Rednerpult reparieren → Hinweis zu Jorin finden
- Freiwillige Sammelgegenstände für Erkundung und spätere Kapitel
- Speichern im lokalen Browserspeicher (ohne Anmeldung)
- Hilfestufen („Tipp“) und Neustart
- Klickbare Szenen und zusätzliche Raum-/Objektschaltflächen für Touch- und Tastaturbedienung

## Bedienung

- Zum Raumwechsel Türen **direkt anklicken** oder den Schlossplan unter der Grafik benutzen.
- **Ansehen, Nehmen, Benutzen, Reden** auswählen und den gewünschten Ort/Gegenstand anklicken.
- Inventar: einen Gegenstand anklicken, anschließend das Ziel anklicken. Gegenstände können auch miteinander ausprobiert werden.
- **1–4** wählen die Aktionen. **Esc** löst eine Gegenstandsauswahl. „Tipp“ gibt abgestufte Hinweise.
- „Geschichte“ zeigt den Prolog erneut. „Neustart“ setzt die Demo nach Bestätigung zurück.

## Technische Struktur

- \`index.html\`: Layout und Dialogfenster
- \`style.css\`: responsives Interface im VGA-inspirierten Stil
- \`game.js\`: Figuren, Geschichte, Zustandsmaschine, Items, Dialoge, selbst gezeichnete Pixelgrafik, Speichern

Keine externen CDNs, Bibliotheken, Bilddateien, Webfonts oder Tracker. Canvas zeichnet alle Szenen lokal in 480 × 270 Pixeln; die Browseransicht vergrößert sie ohne Kantenglättung. Veröffentlicht über das bereits angebundene Vercel-Projekt \`appdev\`. Andere Ordner im Repository bleiben unverändert.

## Was diese Demo bewusst noch nicht hat

Kein fertiges Kapitel 2, keine begehbaren Bereiche hinter Archiv und Westflügel, keine Filmsequenzen oder Geräusche, noch keine Pfadfindung beim Anklicken einzelner Positionen. Die Bewegungen der Figuren sind vorerst Idle-Animationen. Die Pixelgrafik ist ein Prototyp für den spielerischen Ablauf und keine endgültige Illustration der Spielwelt.

## Entwicklungshinweise

**Szenen:** \`sceneDefs\` in \`game.js\` enthält jeweils anklickbare Objekte und deren Rechtecke. \`drawYard\`, \`drawKitchen\`, \`drawHall\` zeichnen die Räume. Die Storylogik steht in \`take\`, \`useItem\`, \`talkWith\` und \`interact\`.

**Test:** Ein simulierter kompletter Durchlauf (Tür zum Saal zunächst gesperrt, Brot nehmen, Glocke erhalten, Suppe liefern, Holzkeil einsetzen, Notiz finden, Jorin-Hinweis aufdecken) sowie die Rendering-Funktionen aller drei Räume wurde erfolgreich ausgeführt. Ein vollständiger visueller Browser-/Touch-Test steht noch aus.

**Nächste Kapitel:** Altes Archiv, verfallener Westflügel, mehr Beziehungen zwischen den Bewohnern, Jorins Drachensuche und Fennas verborgene Identität.
