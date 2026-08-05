# EPUB Reader für Android

Ein einfacher, vollständig lokaler EPUB-Reader für Smartphones im Hochformat. Die App benötigt weder Konto noch Internetzugriff und läuft ab Android 8 (getestetes Ziel: Android 13).

## Funktionen

- EPUB-Dateien über den Android-Dateiauswahldialog öffnen
- Inhaltsverzeichnis und Kapitel-Navigation
- automatische Speicherung von Buch, Kapitel und Scrollposition
- Lesezeichen pro Buch
- Suche im aktuellen Kapitel
- Schriftgröße, Zeilenabstand und Seitenrand
- vier Schriftarten
- fünf Farbschemata einschließlich Sepia-, Dunkel- und Schwarzmodus
- regelbare Bildschirmhelligkeit innerhalb der App
- lokale Darstellung von Text, Bildern und eingebetteten Styles
- blockierte Internetzugriffe und deaktivierte EPUB-Skripte

## APK bauen

Jeder Push startet den Workflow **Android APK**. Die installierbare Debug-APK steht anschließend im Workflow-Lauf als Artefakt `epub-reader-android13` bereit.

Lokal mit Java 17, Android SDK 35 und Gradle 8.11.1:

```bash
gradle assembleDebug
```

Ausgabe: `app/build/outputs/apk/debug/app-debug.apk`
