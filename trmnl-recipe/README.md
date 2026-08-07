# Küchenblatt für TRMNL

Mobile PWA zum Importieren strukturierter Online-Rezepte und Übertragen einzelner Rezeptseiten an ein TRMNL E-Ink-Display.

## Einrichtung in TRMNL

1. Unter **Plugins → Private Plugin** ein neues Plugin anlegen.
2. Als Strategie **Webhook** auswählen und speichern.
3. Im Markup Editor die Datei `trmnl-template.liquid` in die Ansicht **Full** kopieren.
4. Das Plugin der aktiven Playlist hinzufügen.
5. Die erzeugte Webhook-URL kopieren und in der Webapp unter dem Zahnrad eintragen.

Die Webhook-Adresse wird nur im lokalen Browserspeicher abgelegt. Beim Senden leitet die Serverfunktion die jeweils ausgewählte, auf höchstens 2 KB begrenzte Seite an TRMNL weiter.

## Import

Der Import nutzt strukturierte Daten vom Typ `Recipe` (`application/ld+json`). Viele große Rezeptseiten liefern dieses Format direkt mit. Seiten ohne maschinenlesbare Rezeptdaten oder mit aktivem Zugriffsschutz können nicht automatisch importiert werden.

## Lokale Entwicklung

Voraussetzung: Node.js 20 oder neuer und Vercel CLI.

```bash
npm install
npm run dev
```

Die Webapp liegt anschließend unter `/trmnl-recipe/`. Die Startseite `/` wird bei einem Vercel-Deployment dorthin umgeleitet.
