// Kalenderdateien (.ics): feste Erinnerungen und die Wochensprüche als Ganztagstermine.
import { seelenjahr, addDays } from "./calc.js";

const CRLF = "\r\n";
const esc = (s) => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, "");
const fold = (line) => {
  const out = []; let l = line;
  while (l.length > 73) { out.push(l.slice(0, 73)); l = " " + l.slice(73); }
  out.push(l); return out.join(CRLF);
};
const wrap = (lines) => ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//AtroRhym//DE", "CALSCALE:GREGORIAN", ...lines, "END:VCALENDAR"].map(fold).join(CRLF) + CRLF;

export function erinnerungenIcs(list) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const day = ymd(new Date());
  const lines = [];
  for (const r of list) {
    const t = r.zeit.replace(":", "") + "00";
    lines.push("BEGIN:VEVENT", `UID:atrorhym-${r.id}@atrorhym`, `DTSTAMP:${stamp}`,
      `DTSTART:${day}T${t}`, "DURATION:PT10M", "RRULE:FREQ=DAILY", `SUMMARY:${esc(r.titel)}`,
      `DESCRIPTION:${esc(r.text)}`, "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(r.titel)}`, "TRIGGER:PT0M", "END:VALARM", "END:VEVENT");
  }
  return wrap(lines);
}

export function spruecheIcs(sprueche, vonJahr, bisJahr) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const lines = [];
  for (let y = vonJahr; y <= bisJahr; y++) {
    const jahr = seelenjahr(y);
    // gemeinsame Wochen: beide Sprüche in einem Termin
    const byStart = new Map();
    for (const v of jahr.sprueche) {
      const key = ymd(v.start);
      (byStart.get(key) ?? byStart.set(key, []).get(key)).push(v);
    }
    for (const group of byStart.values()) {
      const v0 = group[0];
      const titel = "Seelenkalender · Spruch " + group.map((g) => g.nr).join(" und ");
      const text = group.map((g) => `${g.nr}.\n` + sprueche[g.nr - 1].zeilen.join("\n")).join("\n\n");
      const end = addDays(v0.start, 7 * Math.max(...group.map((g) => g.weeks)));
      lines.push("BEGIN:VEVENT", `UID:seelenkalender-${y}-${v0.nr}@atrorhym`, `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${ymd(v0.start)}`, `DTEND;VALUE=DATE:${ymd(end)}`,
        `SUMMARY:${esc(titel)}`, `DESCRIPTION:${esc(text)}`, "TRANSP:TRANSPARENT", "END:VEVENT");
    }
  }
  return wrap(lines);
}
