#!/usr/bin/env python3
"""Holt die 52 Sprüche (Handschrift-Fassung 1912/13) von anthroposophischer-seelenkalender.de.

Jeder Spruch steht in mehreren Beiträgen (als Gegen- und Spiegelspruch zitiert, teils mit
abweichender Zeichensetzung). Verwendet wird die Fassung aus dem Beitrag, dessen Titel der
Spruch selbst ist.
"""
import json, re, html, urllib.request, collections, sys

BASE = "https://anthroposophischer-seelenkalender.de/wp-json/wp/v2/"

def get(url):
    return json.load(urllib.request.urlopen(url, timeout=30))

def norm(s):
    return re.sub(r"[^a-zäöüß]", "", s.lower())

def text_of(p):
    t = html.unescape(re.sub(r"<br\s*/?>", "\n", p["content"]["rendered"]))
    t = re.sub(r"</p>|</div>|</h\d>", "\n\n", t)
    return re.sub(r"<[^>]+>", "", t).replace("\xa0", " ").split("Anmerkungen:")[0]

def main(out):
    posts = get(BASE + "posts?per_page=100&_fields=id,slug,title,categories,content")
    verses = collections.defaultdict(list)
    for p in (p for p in posts if 5 in p["categories"]):
        title = norm(html.unescape(p["title"]["rendered"]))
        for b in (b.strip() for b in re.split(r"\n\s*\n", text_of(p)) if b.strip()):
            m = re.match(r"^(\d{1,2})\.\s*\n(.+)$", b, re.S)
            if m:
                lines = [l.strip() for l in m.group(2).split("\n") if l.strip()]
                verses[int(m.group(1))].append((norm(lines[0]) == title, lines))
    result = []
    for n in range(1, 53):
        own = [l for ok, l in verses[n] if ok]
        lines = (own or [l for _, l in verses[n]])[0]
        result.append({"nr": n, "zeilen": lines})
    json.dump(result, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(len(result), "Sprüche ->", out)

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "web/data/seelenkalender.json")
