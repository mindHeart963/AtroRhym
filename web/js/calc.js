// Kalenderlogik: Ostern, Seelenwochen, Monatstugenden. Alle Daten sind UTC-Mitternacht.
const DAY = 86400000;

export const utc = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
export const addDays = (dt, n) => new Date(dt.getTime() + n * DAY);
export const diffDays = (a, b) => Math.round((a - b) / DAY);
export const iso = (dt) => dt.toISOString().slice(0, 10);
export const fromIso = (s) => { const [y, m, d] = s.split("-").map(Number); return utc(y, m, d); };

export function today() {
  const n = new Date();
  return utc(n.getFullYear(), n.getMonth() + 1, n.getDate());
}

// Ostersonntag (gregorianisch, Verfahren nach Meeus/Jones/Butcher)
export function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return utc(y, month, day);
}

const sundayOnOrBefore = (dt) => addDays(dt, -dt.getUTCDay());

// ISO-Kalenderwoche
export function isoWeek(dt) {
  const t = utc(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  const dow = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - dow + 3);
  const first = utc(t.getUTCFullYear(), 1, 4);
  return 1 + Math.round(((t - first) / DAY - 3 + ((first.getUTCDay() + 6) % 7)) / 7);
}

/**
 * Das Seelenjahr beginnt mit dem Ostersonntag (Spruch 1). Damit die Feste stimmen, hängen
 * die Sprüche 12, 26, 38 und 52 an festen Wochen (Johanni, Michaeli, Weihnachten, Karwoche).
 * Dazwischen werden fehlende Wochen durch gemeinsame Wochen zweier Sprüche ausgeglichen, überzählige
 * durch Sprüche, die zwei Wochen gelten. Beides liegt jeweils am Ende des Abschnitts.
 */
export function seelenjahr(startYear) {
  const e0 = easter(startYear), e1 = easter(startYear + 1);
  const anchors = [
    [1, e0],
    [12, sundayOnOrBefore(utc(startYear, 6, 24))],
    [26, sundayOnOrBefore(utc(startYear, 9, 29))],
    [38, sundayOnOrBefore(utc(startYear, 12, 25))],
    [52, addDays(e1, -7)],
  ];
  const verses = [];
  for (let s = 0; s < 4; s++) {
    const [vA, dA] = anchors[s], [vB, dB] = anchors[s + 1];
    const weeks = diffDays(dB, dA) / 7 + 1, count = vB - vA + 1;
    const surplus = weeks - count;
    if (surplus >= 0) {
      let at = dA;
      for (let nr = vA; nr < vB; nr++) {
        const w = vB - nr <= surplus ? 2 : 1;
        verses.push({ nr, start: at, weeks: w, geteilt: false });
        at = addDays(at, 7 * w);
      }
    } else {
      const d = -surplus, singles = count - 1 - 2 * d;
      let at = dA;
      for (let nr = vA; nr < vB; nr++) {
        if (nr - vA < singles) { verses.push({ nr, start: at, weeks: 1, geteilt: false }); at = addDays(at, 7); }
        else {
          verses.push({ nr, start: at, weeks: 1, geteilt: true });
          if ((nr - vA - singles) % 2 === 1) at = addDays(at, 7);
        }
      }
    }
  }
  verses.push({ nr: 52, start: anchors[4][1], weeks: 1, geteilt: false });
  return { startYear, ostern: e0, naechstesOstern: e1, sprueche: verses };
}

export function seelenjahrFuer(dt) {
  const y = dt.getUTCFullYear();
  return seelenjahr(dt >= easter(y) ? y : y - 1);
}

// Sprüche, die am Datum gelten (ein oder zwei)
export function spruecheAm(dt) {
  const j = seelenjahrFuer(dt);
  const hit = j.sprueche.filter((v) => dt >= v.start && dt < addDays(v.start, 7 * v.weeks));
  return { jahr: j, treffer: hit };
}

export const gegenspruch = (n) => ((n + 25) % 52) + 1;
export const spiegelspruch = (n) => ((27 - n - 1 + 52) % 52) + 1;

// Monatstugend nach Tierkreis (Wechsel jeweils am 21.)
export function tierkreisMonat(dt) {
  const m = dt.getUTCMonth() + 1, d = dt.getUTCDate();
  return d >= 21 ? m : (m + 10) % 12 + 1;
}

// Tugenden, die am Datum geübt werden: vom 21. bis zum 1. des übernächsten Monats
export function tugendFenster(monat, jahr) {
  const start = utc(jahr, monat, 21);
  const end = utc(monat + 2 > 12 ? jahr + 1 : jahr, ((monat + 1) % 12) + 1, 1);
  return { start, end };
}

export function aktiveTugendMonate(dt) {
  const out = [];
  for (let back = 0; back <= 14; back++) {
    const ref = utc(dt.getUTCFullYear(), dt.getUTCMonth() + 1 - back, 1);
    const monat = ref.getUTCMonth() + 1;
    const { start, end } = tugendFenster(monat, ref.getUTCFullYear());
    if (dt >= start && dt < end) out.push({ monat, start, end });
  }
  return out.sort((a, b) => b.start - a.start);
}

// Bewegliche und feste Anlässe
export function anlaesse(dt, aktuell, spanne = 14) {
  const y = dt.getUTCFullYear();
  const res = [];
  const push = (when, e, extra = {}) => {
    const delta = diffDays(when, dt);
    if (delta >= -1 && delta <= spanne) res.push({ ...e, wann: when, delta, ...extra });
  };
  for (const e of aktuell.feste) {
    for (const yy of [y, y + 1]) {
      const when = utc(yy, e.monat, e.tag);
      const jahre = e.jahr ? yy - e.jahr : null;
      push(when, e, { jahre });
    }
  }
  for (const yy of [y, y + 1]) {
    const o = easter(yy);
    for (const b of aktuell.bewegliche) push(addDays(o, b.offset), { titel: b.name, text: b.text, art: "Jahresfest" });
  }
  return res.sort((a, b) => a.delta - b.delta);
}
