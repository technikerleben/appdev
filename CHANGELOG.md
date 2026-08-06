# Änderungsverlauf

## 1.4.0

### Behoben

- EPUB-Dateien lassen sich zuverlässiger aus Dateien-, Mail- und Drittanbieter-Apps öffnen oder teilen.
- Kapitel mit UTF-16 oder älteren Zeichensätzen werden korrekt dargestellt.
- Interne Kapitel-, Fußnoten- und Ankerlinks behalten Darstellung, Fortschritt und Rücksprungposition.
- Textauswahl, Kopieren und Systemaktionen funktionieren wieder neben den Wischgesten.
- Alte Buch-Caches werden automatisch auf zwei Bücher und ungefähr 200 MB begrenzt.
- Hintergrundaufgaben greifen nach dem Schließen oder Drehen nicht mehr auf zerstörte Fenster zu.

### Neu

- Buchweite Suche mit Trefferliste und Abbruchmöglichkeit.
- Bibliothek mit Cover, Autor und Lesefortschritt.
- Zweispaltenansicht ab 600 dp und Zustandswiederherstellung nach Rotation.
- Tippzonen, ausblendbare Bedienelemente und optionale Lautstärketasten.
- Pinch-Geste für die Schriftgröße und Berücksichtigung der Android-Systemschriftgröße.
- Optionales Wachhalten des Bildschirms und optionales Beibehalten des Verlagslayouts.
- Verschachtelte Darstellung des Inhaltsverzeichnisses.
- Englische Benutzeroberfläche und Android-Sprachauswahl.

### Geändert

- Die App übernimmt weiterhin vollständig die Systemhelligkeit.
- „Mein Morgenblatt“ verwendet einen sicheren XML-Parser und spart Downloads über ETag beziehungsweise Änderungsdatum.
- Veraltete Fortschrittsdialoge wurden durch ein eigenes Ladeoverlay ersetzt.
- Predictive Back wird unter Android 13 und neuer unterstützt.
- JavaScript bleibt deaktiviert; fragile Regex-Eingriffe in EPUB-Inhalte wurden entfernt.
- Release-Builds nutzen R8, Ressourcenverkleinerung und Signaturschema v2/v3.
