// Prüft die Seelenwochen-Berechnung gegen die Tabellen im PDF-Wegweiser (benötigt pdftotext).
import { seelenjahr, iso, gegenspruch, spiegelspruch, easter } from "../web/js/calc.js";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
process.chdir(fileURLToPath(new URL(".", import.meta.url)));
const txt = execSync("pdftotext -layout ../pdf/Seelenkalender_Jahreskarten_2026-2030.pdf -").toString();
const MON = {"Jan.":1,"Feb.":2,"März":3,"Apr.":4,"Mai":5,"Juni":6,"Juli":7,"Aug.":8,"Sep.":9,"Okt.":10,"Nov.":11,"Dez.":12};
let fail = 0;
const parts = txt.split(/A B S O N N TA G · ([\d ]+?) \/ /);
for (let pi = 1; pi < parts.length; pi += 2) {
  const y = +parts[pi].replace(/ /g, ""); const sec = parts[pi + 1];
  const rows = [...sec.matchAll(/(?<![\d.])(\d{1,2}) (\d{1,2})\. (Jan\.|Feb\.|März|Apr\.|Mai|Juni|Juli|Aug\.|Sep\.|Okt\.|Nov\.|Dez\.)/g)].sort((a, b) => a[1] - b[1]);
  const j = seelenjahr(y);
  let ok = rows.length === 52; let prev = 0;
  for (const r of rows) {
    const v = j.sprueche.find(s => s.nr === +r[1]);
    const m = MON[r[3]]; let yy = y; if (Date.UTC(yy, m - 1, +r[2]) < prev) yy = y + 1; prev = Date.UTC(yy, m - 1, +r[2]);
    const exp = `${yy}-${String(m).padStart(2,"0")}-${String(r[2]).padStart(2,"0")}`;
    if (!v || iso(v.start) !== exp) { ok = false; console.log("  Abweichung", y, r[1], exp, v && iso(v.start)); }
  }
  console.log(y, ok ? "OK" : "FEHLER", rows.length);
  if (!ok) fail++;
}
console.log("Ostern 2026", iso(easter(2026)), "2027", iso(easter(2027)));
console.log("Gegen 26->", gegenspruch(26), "52->", gegenspruch(52), "1->", gegenspruch(1), "Spiegel 26->", spiegelspruch(26), "27->", spiegelspruch(27), "25->", spiegelspruch(25), "28->", spiegelspruch(28), "1->", spiegelspruch(1), "52->", spiegelspruch(52));
process.exit(fail ? 1 : 0);
