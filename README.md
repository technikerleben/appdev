# EPUB Reader für Android

Ein schlanker EPUB-Reader für Android 8 bis Android 15 mit Schwerpunkt auf seitenweisem, ablenkungsfreiem Lesen. Bücher, Lesepositionen und Einstellungen bleiben lokal. Nur die optionale Morgenblatt-Funktion greift auf den fest erlaubten Feed zu.

Aktuelle Version: **1.4.0**

## Funktionen

- EPUB-Dateien öffnen oder aus anderen Apps teilen
- horizontales Blättern per Wischgeste, Tippzonen oder optionalen Lautstärketasten
- Text markieren und kopieren, Pinch-Geste für die Schriftgröße
- Inhaltsverzeichnis mit Unterebenen, interne Links und Rücksprung
- buchweite Suche mit Trefferliste
- Bibliothek mit Cover, Autor, Lesefortschritt und zwölf zuletzt gelesenen Büchern
- Lesezeichen und automatische Wiederherstellung der Leseposition
- Schriftgröße, Systemschrift-Skalierung, Zeilenabstand, Seitenrand und vier Schriftarten
- fünf Farbschemata sowie optionales Verlagslayout
- Zweispaltenansicht ab 600 dp, beispielsweise im Querformat oder auf Tablets
- Systemhelligkeit und optionales Wachhalten des Bildschirms
- Deutsch und Englisch
- „Mein Morgenblatt“ über einen abgesicherten OPDS-Feed mit Offline-Rückfall

JavaScript bleibt im WebView deaktiviert. Externe Ressourcen aus Büchern werden blockiert; externe Links werden nur nach Rückfrage im Systembrowser geöffnet.

## Debug-Build

Benötigt werden Java 17, Android SDK 35 und der enthaltene Gradle-Wrapper:

```bash
./gradlew assembleDebug
```

Ausgabe: `app/build/outputs/apk/debug/app-debug.apk`

## Release-Build

Keystore einmalig erzeugen und anschließend sicher sichern:

```bash
keytool -genkeypair -v -keystore epub-reader-release.jks -alias epub-reader \
  -keyalg RSA -keysize 3072 -validity 10000
```

Diese Werte lokal in `local.properties` eintragen; Datei und Keystore werden durch `.gitignore` ausgeschlossen:

```properties
release.storeFile=epub-reader-release.jks
release.storePassword=DEIN_STORE_PASSWORT
release.keyAlias=epub-reader
release.keyPassword=DEIN_KEY_PASSWORT
```

Alternativ akzeptiert der Build die Umgebungsvariablen `EPUB_RELEASE_STORE_FILE`, `EPUB_RELEASE_STORE_PASSWORD`, `EPUB_RELEASE_KEY_ALIAS` und `EPUB_RELEASE_KEY_PASSWORD`.

```bash
./gradlew assembleRelease
apksigner verify -v app/build/outputs/apk/release/app-release.apk
aapt dump badging app/build/outputs/apk/release/app-release.apk
```

Die Release-Konfiguration aktiviert R8, Ressourcenverkleinerung sowie APK-Signaturen v2 und v3. Der Keystore darf nie verloren gehen: Neue Versionen lassen sich sonst nicht über eine bereits installierte App aktualisieren.

## Automatischer Build

GitHub Actions erzeugt eine installierbare Debug-APK und zusätzlich eine verkleinerte, noch unsignierte Release-APK. Die unsignierte Datei ist ausschließlich für eine anschließende Signierung mit dem privaten Release-Key vorgesehen.

## Datenschutz und Backup

Android darf Lesepositionen, Bibliothek und Darstellungseinstellungen sichern. Entpackte Buch-Caches und heruntergeladene Morgenblatt-Ausgaben werden nicht in das Cloud-Backup aufgenommen.
