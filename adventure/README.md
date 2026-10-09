# Das Rätsel von Nebelhafen

Ein eigenständiges, kleines Point-and-Click-Adventure mit Retro-Pixeloptik und dem Spielgefühl klassischer Adventures. Alle Figuren, Schauplätze, Texte und Grafiken sind neu erstellt – keine kopierten Marken, Sprites oder Spielressourcen.

## Spielen

- Webadresse: https://appdev-pi.vercel.app/adventure/
- Repository: https://github.com/technikerleben/appdev/tree/main/adventure
- Für den Start genügen ein aktueller Browser und Maus, Touchscreen oder Touchpad.

## Steuerung

1. Unter dem Bild eine Aktion wählen: **Gehe zu**, **Sieh an**, **Nimm**, **Benutze** oder **Rede mit**.
2. Einen Gegenstand im Bild anklicken.
3. Im Inventar einen Gegenstand wählen und anschließend im Bild anwenden. Um zwei Inventargegenstände zu kombinieren, nacheinander beide anklicken.
4. Die Aktionstasten können auch mit **1–5** gewählt werden, **H** liefert einen Hinweis und **Esc** hebt die Auswahl auf.

Der Spielstand wird nur im jeweiligen Browser (localStorage) gespeichert.

## Kapitel 1: Das Licht

Ziel: Den Leuchtturm wieder zum Laufen bringen. Erforderliche Rätsel: Münze finden, Angel bauen, Schlüssel aus dem Wasser holen, Lampenöl besorgen, Linse finden und die Mechanik im Turm reparieren.

## Dateien

- \`index.html\`: Oberfläche, Inventar, Dialoge und Bedienung.
- \`style.css\`: responsives Retro-Layout.
- \`game.js\`: Spiellogik, Zustände, Animationen und selbst gezeichnete Canvas-Pixelwelten.

Die Anwendung benötigt **keine externen Bibliotheken**, Schriftdateien oder Netzwerkanfragen. Alle Canvas-Grafiken werden im Browser generiert. Das Projekt nutzt die bestehende Vercel-Integration des Repositories; \`vercel.json\` bleibt unverändert.

## Nächste Ideen

- Mehr Dialogverzweigungen, Gegenstände und Szenen.
- Laufanimationen der Spielfigur zwischen anklickbaren Objekten.
- Musik und Soundeffekte mit Ein-/Aus-Schalter.
- Zusätzliche Kapitel und überspringbare Zwischensequenzen.
