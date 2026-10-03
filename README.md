# Rhythmen

Eine kleine Web-App (PWA), um sich in den Rhythmus von Tag, Woche, Monat und Jahr einzustimmen, mit Übungen und Sprüchen von Rudolf Steiner.

## Was sie zeigt

- **Heute:** Wochentag mit Planet, Metall, Getreide, Vokal und der Übung des Tages, dein aktueller Übungszeitraum, der Seelenkalender-Spruch der Woche, die Tugend des Monats, Rückschau am Abend, Aktuelles.
- **Jahr:** das Rad der zwölf Monatstugenden (mit Markierung für heute) und die 52 Wochensprüche mit Datum und Kalenderwoche für jedes Seelenjahr, inklusive Gegen- und Spiegelsprüchen.
- **Üben:** Tagesübungen (eine Übung für ein oder zwei Wochen festlegen), die sechs Nebenübungen als Übungsweg mit Startdatum, Rückschau mit Wochenübersicht.
- **Lesen:** Bibliothek mit den Volltexten, anstehende Jahrestage und Feste, Quellen.
- **Einstellungen:** Erinnerungen (Benachrichtigung bei geöffneter App und als Kalenderdatei), Farbschema, Sichern und Wiederherstellen.

## Ausprobieren

```sh
python3 -m http.server 8000 --directory web
# dann http://localhost:8000 öffnen
```

Es gibt keinen Build-Schritt. Zum Installieren auf dem Handy die Seite über HTTPS ausliefern (z. B. GitHub Pages aus dem Ordner `web/`) und im Browser „Zum Startbildschirm hinzufügen“ wählen.

## Aufbau

- `web/data/*.json`: alle Inhalte, getrennt von der Oberfläche. Texte lassen sich dort ändern, ohne zu programmieren. Die Datenstruktur lässt sich unverändert in einer späteren Android-/iOS-App (z. B. mit Capacitor) verwenden.
- `web/js/calc.js`: Ostern, Seelenwochen, Monatstugenden, Anlässe.
- `web/js/app.js`: Oberfläche. `wheel.js` zeichnet das Tugendrad, `ics.js` erzeugt Kalenderdateien, `store.js` speichert den persönlichen Stand lokal.
- `pdf/`: die gedruckten Vorlagen (Rückschau, Tage der Woche, Monatstugenden, Nebenübungen, Wegweiser).
- `tools/`: Skripte, die die Daten erzeugen und prüfen.

## Seelenwochen

Das Seelenjahr beginnt mit dem Ostersonntag (Spruch 1). Die Sprüche 12, 26, 38 und 52 hängen an den Wochen von Johanni, Michaeli, Weihnachten und der Karwoche. Dazwischen teilen sich zwei Sprüche eine Woche oder ein Spruch gilt zwei Wochen; der Ausgleich liegt jeweils am Ende des Abschnitts. `node tools/test_calc.mjs` prüft die Berechnung gegen die Tabellen in `pdf/Seelenkalender_Jahreskarten_2026-2030.pdf` (alle 208 Daten stimmen).

## Quellen und Herkunft der Inhalte

- Seelenkalender: Handschrift-Fassung 1912/13 nach anthroposophischer-seelenkalender.de (`tools/fetch_seelenkalender.py`).
- Nebenübungen, Tage der Woche, Monatstugenden: Rudolf Steiner, Seelenübungen I (GA 267).
- Rückschau: Die Geheimwissenschaft im Umriß (GA 13).
- Hinweise unter „Anregung“ (Tätigkeiten) sind Vorschläge und stammen nicht von Steiner. Sie sind in der App so gekennzeichnet.
