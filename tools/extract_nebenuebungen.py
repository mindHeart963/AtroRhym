#!/usr/bin/env python3
"""Zieht den Volltext der Nebenübungen (GA 267) aus pdf/Nebenuebungen_Uebersicht_und_Volltext.pdf."""
import subprocess, re, json, sys
raw = subprocess.run(["pdftotext", "-f", "2", "-l", "4", "pdf/Nebenuebungen_Uebersicht_und_Volltext.pdf", "-"],
                     capture_output=True, text=True, check=True).stdout
raw = re.sub(r"Vollständiger Text · \d / \d", "", raw).replace("\f", "\n")
raw = re.sub("‐\n", "", raw)            # Silbentrennung am Zeilenende
raw = re.sub(r"(?<!\n)\n(?!\n)", " ", raw)  # harte Zeilenumbrüche -> Leerzeichen
parts = re.split(r"\n\n(?=[1-6]\n)", raw)
paras = [re.sub(r"\s+", " ", p).strip() for p in re.split(r"\n\s*\n", raw) if p.strip()]
paras = [p for p in paras if not p.startswith("GA 267 ·")]
paras = [p.replace(" GA 267 · Seelenübungen I", "") for p in paras]

# Seitenumbrüche haben Absätze mitten im Satz getrennt -> wieder zusammenfügen
merged = []
for p in paras:
    if merged and not re.match(r"^[1-6]( |$)", p) and (not re.search(r"[.:!?»)]$", merged[-1]) or p[0].islower()):
        sep = "" if (merged[-1].endswith(" die") and p.startswith("ser Stufe")) else " "
        merged[-1] = merged[-1].rstrip() + sep + p if sep else merged[-1] + p
    else:
        merged.append(p)
paras = merged

# Letzte Seite: pdftotext liest die Spalten durcheinander -> Schluss von Monat 5/6 neu ordnen
i5 = next(i for i, p in enumerate(paras) if p.startswith("5 "))
head5, tail5 = paras[i5].split(" schrift einen anderen", 1)
erstens = paras[i5 + 1].split(" ", 1)[1]          # "6 Erstens, daß ..." -> ohne Ziffer
sechs = paras[i5 + 2].rstrip("‐ ")                 # "... seine Hand"
paras[i5:i5 + 3] = [head5, "6 " + sechs + "schrift einen anderen" + tail5, erstens]

out, cur = {"einleitung": [], "monate": {}}, None
for p in paras:
    m = re.match(r"^([1-6]) (.*)$", p)
    if m and (cur is None and m.group(1) == "1" or cur and int(m.group(1)) == cur + 1):
        cur = int(m.group(1)); out["monate"][cur] = [m.group(2)]; continue
    (out["einleitung"] if cur is None else out["monate"][cur]).append(p)
out["einleitung"] = [re.sub(r"^Rudolf Steiner ", "", p) for p in out["einleitung"]]
titel, rest = out["einleitung"][0].split(" In dem Folgenden", 1)
out["einleitung"] = [titel, "In dem Folgenden" + rest] + out["einleitung"][1:]
KERN = {  # wörtliche Auszüge für die Übersicht (aus der Übersichtsseite der PDF)
 1: ("Gedankenkontrolle", "Die erste Bedingung ist die Aneignung eines vollkommen klaren Denkens. Man muß zu diesem Zwecke sich, wenn auch nur eine ganz kurze Zeit des Tages, etwa fünf Minuten (je mehr, desto besser) freimachen von dem Irrlichtelieren der Gedanken. Man muß Herr in seiner Gedankenwelt werden."),
 2: ("Initiative des Handelns", "Hat man sich etwa einen Monat also geübt, so lasse man eine zweite Forderung hinzutreten. Man versuche, irgendeine Handlung zu erdenken, die man nach dem gewöhnlichen Verlaufe seines bisherigen Lebens ganz gewiß nicht vorgenommen hätte. Man mache sich nun diese Handlung für jeden Tag selbst zur Pflicht."),
 3: ("Gleichmut", "Im dritten Monat soll als neue Übung in den Mittelpunkt des Lebens gerückt werden die Ausbildung eines gewissen Gleichmutes gegenüber den Schwankungen von Lust und Leid, Freude und Schmerz, das «Himmelhochjauchzend, zu Tode betrübt» soll mit Bewußtsein durch eine gleichmäßige Stimmung ersetzt werden."),
 4: ("Positivität", "Im vierten Monat soll man als neue Übung die sogenannte Positivität aufnehmen. Sie besteht darin, allen Erfahrungen, Wesenheiten und Dingen gegenüber stets das in ihnen vorhandene Gute, Vortreffliche, Schöne usw. aufzusuchen."),
 5: ("Unbefangenheit", "Im fünften Monat versuche man dann in sich das Gefühl auszubilden, völlig unbefangen einer jeden neuen Erfahrung gegenüberzutreten. […] Er muß bereit sein, jeden Augenblick eine völlig neue Erfahrung entgegenzunehmen."),
 6: ("Gleichgewicht der Seele", "Im sechsten Monat soll man dann versuchen, systematisch in einer regelmäßigen Abwechslung alle fünf Übungen immer wieder und wieder vorzunehmen. Es bildet sich daher allmählich ein schönes Gleichgewicht der Seele heraus."),
}
result = {
 "quelle": "Rudolf Steiner, Allgemeine Anforderungen, die ein jeder an sich selbst stellen muß, der eine okkulte Entwickelung durchmachen will [sogenannte Vor- oder Nebenübungen] (Seelenübungen I, GA 267)",
 "einleitung": out["einleitung"],
 "merksatz": "Man muß überhaupt darauf bedacht sein, daß man diese Früchte, einmal gewonnen, nie wieder verliere.",
 "uebungen": [{"nr": n, "name": KERN[n][0], "kern": KERN[n][1], "volltext": out["monate"][n]} for n in range(1, 7)],
}
json.dump(result, open(sys.argv[1], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print({n: len(out["monate"][n]) for n in out["monate"]}, "->", sys.argv[1])
