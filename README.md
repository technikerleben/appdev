# EPUB Reader für Android

Ein einfacher, vollständig lokaler EPUB-Reader für Smartphones im Hochformat. Die App benötigt weder Konto noch Internetzugriff und läuft ab Android 8 (getestetes Ziel: Android 13).

Aktuelle Version: **1.3.1**

## Funktionen

- EPUB-Dateien über den Android-Dateiauswahldialog öffnen
- Inhaltsverzeichnis und Kapitel-Navigation
- seitenweises Blättern durch horizontales Wischen, ohne vertikales Scrollen
- direkter Zugriff auf die jeweils aktuelle Ausgabe von „Mein Morgenblatt“ über den OPDS-Feed
- automatische Aktualisierung beim Start, wenn zuletzt das Morgenblatt gelesen wurde
- Offline-Rückfall auf die zuletzt heruntergeladene Ausgabe
- Bibliothek mit bis zu zwölf zuletzt gelesenen Büchern und Öffnungszeitpunkt
- erneutes Öffnen sowie Entfernen eines Eintrags, ohne die EPUB-Datei zu löschen
- automatische Speicherung von Buch, Kapitel und Scrollposition
- Lesezeichen pro Buch
- Suche im aktuellen Kapitel
- Schriftgröße, Zeilenabstand und Seitenrand
- vier Schriftarten
- fünf Farbschemata einschließlich Sepia-, Dunkel- und Schwarzmodus
- Übernahme der Android-Systemhelligkeit einschließlich automatischer Helligkeit
- lokale Darstellung von Text, Bildern und eingebetteten Styles
- blockierte Internetzugriffe und deaktivierte EPUB-Skripte

## APK bauen

Jeder Push startet den Workflow **Android APK**. Die installierbare Debug-APK steht anschließend im Workflow-Lauf als Artefakt `epub-reader-android13` bereit.

Lokal mit Java 17, Android SDK 35 und Gradle 8.11.1:

```bash
gradle assembleDebug
```

Ausgabe: `app/build/outputs/apk/debug/app-debug.apk`

## Küchenblatt für TRMNL

Im Unterordner [`trmnl-recipe`](trmnl-recipe/) liegt zusätzlich eine mobile Webapp, die strukturierte Online-Rezepte importiert und seitenweise an ein privates TRMNL-Plugin überträgt. Der Android-Reader und seine Build-Pipeline bleiben davon unabhängig.

Die Webapp umfasst:

- Rezeptimport über Link oder Android-Teilen-Funktion
- bearbeitbare Zutaten und Zubereitungsschritte
- E-Ink-Vorschau mit Seitensteuerung
- lokale Liste der fünf zuletzt verwendeten Rezepte
- geschützte Serverfunktionen für Webseitenabruf und TRMNL-Webhook
- installierbare PWA mit offline verfügbarem Bedienfeld

Deployment und TRMNL-Einrichtung sind in [`trmnl-recipe/README.md`](trmnl-recipe/README.md) beschrieben.
