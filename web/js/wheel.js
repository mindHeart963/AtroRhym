// Jahresrad der Monatstugenden als SVG. Alle Wechsel liegen am 21.; Kalendermonate stehen außen, versetzt.
import { utc, diffDays } from "./calc.js";

const CX = 360, CY = 360;
const R = { datum: 346, monatA: 302, monatB: 326, zeichenA: 252, zeichenB: 302, tugendA: 160, tugendB: 252, wirdA: 82, wirdB: 160 };
const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const KURZ = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sep.", "Okt.", "Nov.", "Dez."];

const rad = (deg) => (deg * Math.PI) / 180;
const pt = (r, deg) => [CX + r * Math.cos(rad(deg)), CY + r * Math.sin(rad(deg))];

// Winkel eines Datums: 21. März oben (−90°), im Uhrzeigersinn, proportional zu den Tagen
function winkel(dt) {
  const y = dt.getUTCFullYear();
  let start = utc(y, 3, 21);
  if (dt < start) start = utc(y - 1, 3, 21);
  return -90 + (360 * diffDays(dt, start)) / 365.25;
}
const winkelMD = (m, d, jahrBezug) => winkel(utc(jahrBezug, m, d));

function ring(rA, rB, a0, a1) {
  const [x0, y0] = pt(rB, a0), [x1, y1] = pt(rB, a1), [x2, y2] = pt(rA, a1), [x3, y3] = pt(rA, a0);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M${x0.toFixed(1)},${y0.toFixed(1)} A${rB},${rB} 0 ${large} 1 ${x1.toFixed(1)},${y1.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)} A${rA},${rA} 0 ${large} 0 ${x3.toFixed(1)},${y3.toFixed(1)} Z`;
}

// Lange Wörter in zwei Zeilen (an Silbengrenzen)
const TEILE = {
  Gedankenkontrolle: ["Gedanken-", "kontrolle"], Selbstlosigkeit: ["Selbst-", "losigkeit"], Zufriedenheit: ["Zufrieden-", "heit"],
  Gleichgewicht: ["Gleich-", "gewicht"], Meditationskraft: ["Meditations-", "kraft"], Wahrheitsempfinden: ["Wahrheits-", "empfinden"],
  Erlöserkraft: ["Erlöser-", "kraft"], Gelassenheit: ["Gelassen-", "heit"], Herzenstakt: ["Herzens-", "takt"], Fortschritt: ["Fort-", "schritt"],
};

function text(r, deg, s, { size = 14, cls = "", mode = "tang", len = 0, weight = "", zweizeilig = false } = {}) {
  const [x, y] = pt(r, deg);
  const cos = Math.cos(rad(deg)), sin = Math.sin(rad(deg));
  let rot;
  if (mode === "rad") rot = cos < 0 ? deg + 180 : deg;
  else rot = sin > 0 ? deg - 90 : deg + 90;
  const tl = len ? ` textLength="${len}" lengthAdjust="spacingAndGlyphs"` : "";
  if (zweizeilig && TEILE[s]) {
    const [a, b] = TEILE[s], dy = size * 0.55;
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" transform="rotate(${rot.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})" text-anchor="middle" font-size="${size}" class="${cls}" ${weight ? `font-weight="${weight}"` : ""}><tspan x="${x.toFixed(1)}" dy="${-dy + size * 0.35}">${a}</tspan><tspan x="${x.toFixed(1)}" dy="${size * 1.05}">${b}</tspan></text>`;
  }
  return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" transform="rotate(${rot.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})" text-anchor="middle" dominant-baseline="central" font-size="${size}" class="${cls}" ${weight ? `font-weight="${weight}"` : ""}${tl}>${s}</text>`;
}

export function radSvg(tugenden, heute, gewaehlt) {
  const j = heute.getUTCFullYear();
  const bezug = heute >= utc(j, 3, 21) ? j : j - 1; // Jahr, in dem der aktuelle Kreis begann
  const out = [];
  const aktivMonat = (() => { const d = heute.getUTCDate(), m = heute.getUTCMonth() + 1; return d >= 21 ? m : ((m + 10) % 12) + 1; })();
  // Segmente
  tugenden.forEach((t, i) => {
    const m = t.monat;
    const yr = m >= 3 ? bezug : bezug + 1;
    const nm = (m % 12) + 1;
    const yrN = nm >= 3 ? bezug : bezug + 1;
    const a0 = winkelMD(m, 21, yr);
    let a1 = winkelMD(nm, 21, yrN);
    if (a1 <= a0) a1 += 360;
    const mid = (a0 + a1) / 2;
    const cls = ["seg", m === aktivMonat ? "aktiv" : "", gewaehlt === m ? "gewaehlt" : ""].join(" ");
    const fill = t.farbe;
    out.push(`<g class="${cls}" data-monat="${m}" tabindex="0" role="button" aria-label="${t.tugend} wird zu ${t.wird}">`);
    out.push(`<path d="${ring(R.zeichenA, R.zeichenB, a0, a1)}" fill="${fill}" class="p1"/>`);
    out.push(`<path d="${ring(R.tugendA, R.tugendB, a0, a1)}" fill="${fill}" class="p2"/>`);
    out.push(`<path d="${ring(R.wirdA, R.wirdB, a0, a1)}" fill="${fill}" class="p3"/>`);
    out.push(text((R.zeichenA + R.zeichenB) / 2, mid, t.tier, { size: 15, cls: "tier" }));
    const name = t.tugend;
    const lang = name.length > 11 && TEILE[name];
    out.push(text((R.tugendA + R.tugendB) / 2, mid, name, { size: lang ? 15 : 17, cls: "tugend", mode: "rad", weight: 600, zweizeilig: !!lang }));
    const langW = t.wird.length > 9 && TEILE[t.wird];
    out.push(text((R.wirdA + R.wirdB) / 2, mid, t.wird, { size: langW ? 12 : 13.5, cls: "wird", mode: "rad", zweizeilig: !!langW }));
    out.push("</g>");
    // Strahl am 21.
    const [x0, y0] = pt(R.wirdA, a0), [x1, y1] = pt(R.monatB + 4, a0);
    out.push(`<line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" class="strahl"/>`);
    out.push(text(R.datum, a0, `21. ${KURZ[m - 1]}`, { size: 12, cls: "datum" }));
  });
  // Monatsring (echte Kalendermonate, 1. bis Monatsende)
  for (let m = 1; m <= 12; m++) {
    const yr = m >= 3 ? bezug : bezug + 1;
    const nm = (m % 12) + 1, yrN = nm >= 3 ? bezug : bezug + 1;
    const a0 = winkelMD(m, 1, yr), a1 = winkelMD(nm, 1, yrN) + (nm === 3 ? 0 : 0);
    const end = a1 <= a0 ? a1 + 360 : a1;
    const mid = (a0 + end) / 2;
    const cur = heute.getUTCMonth() + 1 === m;
    out.push(`<path d="${ring(R.monatA, R.monatB, a0, end)}" class="monat ${cur ? "jetzt" : ""}"/>`);
    out.push(text((R.monatA + R.monatB) / 2, mid, MONATE[m - 1], { size: 13, cls: "monatname" }));
    const [x, y] = pt(R.monatA, a0), [x2, y2] = pt(R.monatB, a0);
    out.push(`<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" class="tick"/>`);
  }
  // Heute
  const aH = winkel(heute);
  const [hx0, hy0] = pt(R.zeichenA, aH), [hx1, hy1] = pt(R.monatB + 2, aH), [hx, hy] = pt((R.monatA + R.monatB) / 2, aH);
  out.push(`<line x1="${hx0.toFixed(1)}" y1="${hy0.toFixed(1)}" x2="${hx1.toFixed(1)}" y2="${hy1.toFixed(1)}" class="heute"/>`);
  out.push(`<circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="6" class="heute-punkt"/>`);
  // Mitte: Kreis mit Punkt (Sonnenzeichen)
  out.push(`<circle cx="${CX}" cy="${CY}" r="${R.wirdA - 10}" class="mitte"/><circle cx="${CX}" cy="${CY}" r="7" class="mitte-punkt"/>`);
  return `<svg viewBox="0 0 720 720" class="rad" role="img" aria-label="Jahresrad der zwölf Monatstugenden">${out.join("")}</svg>`;
}
