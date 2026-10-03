import * as C from "./calc.js";
import * as S from "./store.js";
import { radSvg } from "./wheel.js";
import { erinnerungenIcs, spruecheIcs } from "./ics.js";

const D = {};
const ui = { jahrAnsicht: "rad", gewMonat: null, seelenStart: null, uebenTab: "tag" };
const REIHENFOLGE = ["samstag", "sonntag", "montag", "dienstag", "mittwoch", "donnerstag", "freitag"];

const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignorieren */ } };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmt = (o) => new Intl.DateTimeFormat("de-DE", { timeZone: "UTC", ...o });
const fLang = fmt({ weekday: "long", day: "numeric", month: "long", year: "numeric" });
const fKurz = fmt({ day: "numeric", month: "short" });
const fTagMon = fmt({ day: "numeric", month: "long" });
const fLangOhneJahr = fmt({ weekday: "long", day: "numeric", month: "long" });
const bereich = (a, b) => `${fKurz.format(a)} – ${fKurz.format(C.addDays(b, -1))}`;
const absatz = (arr) => arr.map((p) => `<p>${p}</p>`).join("");
const tagFuer = (dt) => D.tage.tage.find((t) => t.wochentag === dt.getUTCDay());
const tagNach = (id) => (id === "selbstbesinnung" ? D.tage.selbstbesinnung : D.tage.tage.find((t) => t.id === id));
const monatName = (m) => fmt({ month: "long" }).format(C.utc(2000, m, 1));
const tugendNach = (m) => D.tugenden.tugenden.find((t) => t.monat === m);

function toast(text) {
  const el = document.createElement("div");
  el.className = "toast"; el.setAttribute("role", "status"); el.textContent = text;
  document.body.appendChild(el); setTimeout(() => el.remove(), 2600);
}

function dialog(html) {
  const d = document.createElement("dialog");
  d.innerHTML = `<button class="zu" aria-label="Schließen" data-a="zu">×</button>${html}`;
  d.addEventListener("click", (e) => { if (e.target === d) d.close(); });
  d.addEventListener("close", () => d.remove());
  document.body.appendChild(d); d.showModal();
  return d;
}

/* ---------- Bausteine ---------- */
function versHtml(nr) {
  return `<div class="vers">${D.seelenkalender[nr - 1].zeilen.map((z) => `<span>${esc(z)}</span>`).join("")}</div>`;
}

function beinameHtml(t) {
  return `<div class="beiname"><div class="vor">${t.vorsatz}</div><div class="gross">${t.beiname}</div>${t.zusatz ? `<div class="zus">${t.zusatz}</div>` : ""}</div>`;
}

function anregungHtml(t) {
  if (!t.anregung) return "";
  return `<div class="anregung"><span class="kicker">Anregung · nicht von Steiner</span>
    <div>${t.anregung.taetigkeit}</div></div>`;
}

function tagKarte(dt) {
  const t = tagFuer(dt);
  return `<section class="karte band" style="--band:${t.farbe}">
    <div class="kopfzeile"><span class="kicker">${t.name} · ${t.planet}</span><span class="vokal">${t.vokal}</span></div>
    <h2>${t.thema}</h2>
    <div class="meta"><span>${t.zeichen} ${t.planet}</span><span>${t.metall}</span><span>${t.getreide}</span></div>
    ${absatz(t.text)}${beinameHtml(t)}${anregungHtml(t)}
    <div class="reihe">${S.get().fokus && S.get().fokus.id === t.id ? `<span class="klein">✓ Das ist gerade deine Übung</span>` : `<button class="knopf" data-a="fokus-waehlen" data-id="${t.id}">Als meine Übung festlegen</button>`}</div>
  </section>`;
}

function fokusKarte(dt) {
  const f = S.get().fokus;
  if (!f) {
    return `<section class="karte"><div class="kicker">Übung für die nächsten Wochen</div>
      <p class="klein" style="margin-top:6px">Steiner empfiehlt, jeweils eine Übung acht oder vierzehn Tage lang zu üben und dann zur nächsten zu gehen. Lege hier fest, welche Übung jetzt dran ist.</p>
      <div class="reihe"><button class="knopf voll" data-a="fokus-waehlen">Übung festlegen</button></div></section>`;
  }
  const t = tagNach(f.id);
  const start = C.fromIso(f.start), n = C.diffDays(dt, start) + 1;
  const vorbei = n > f.tage;
  const punkte = Array.from({ length: f.tage }, (_, i) => `<i class="${i + 1 <= n ? "da" : ""} ${i + 1 === n ? "heute" : ""}"></i>`).join("");
  const naechste = REIHENFOLGE[(Math.max(0, REIHENFOLGE.indexOf(f.id)) + 1) % 7];
  return `<section class="karte" style="--band:${t.farbe}">
    <div class="kopfzeile"><span class="kicker">Meine Übung</span><span class="klein">begonnen am ${fTagMon.format(start)}</span></div>
    <h3>${t.name === "Selbstbesinnung" ? "Selbstbesinnung" : `${t.thema} <span class="klein">· ${t.name}sübung</span>`}</h3>
    ${n < 1 ? `<p class="klein">Beginnt am ${fLangOhneJahr.format(start)}.</p>` :
      vorbei ? `<p>Die ${f.tage} Tage sind vorbei. Zeit für die nächste Übung: <b>${tagNach(naechste).thema}</b>.</p>` :
      `<div class="punkte" aria-label="Tag ${n} von ${f.tage}">${punkte}</div><p class="klein">Tag ${n} von ${f.tage}</p>`}
    <details><summary>Übung lesen</summary>${absatz(t.text)}${beinameHtml(t)}</details>
    <div class="reihe"><button class="knopf" data-a="fokus-waehlen">${vorbei ? "Nächste Übung festlegen" : "Ändern"}</button>
      ${vorbei ? `<button class="knopf leise" data-a="fokus-ende">Beenden</button>` : ""}</div>
  </section>`;
}

function spruchKarte(dt) {
  const { jahr, treffer } = C.spruecheAm(dt);
  return treffer.map((v, i) => {
    const bis = C.addDays(v.start, 7 * v.weeks);
    return `<section class="karte band" style="--band:var(--gold)">
      <div class="kopfzeile"><span class="kicker">Seelenkalender · Woche ${v.nr}</span><span class="klein">${bereich(v.start, bis)}</span></div>
      ${versHtml(v.nr)}
      ${treffer.length > 1 && i === 0 ? `<p class="klein">In dieser Woche gelten zwei Sprüche, damit die Festzeiten stimmen.</p>` : ""}
      <div class="reihe"><button class="knopf" data-a="spruch" data-nr="${v.nr}">Gegen- und Spiegelspruch</button></div>
    </section>`;
  }).join("");
}

function tugendKarte(dt) {
  const aktiv = C.aktiveTugendMonate(dt);
  if (!aktiv.length) return "";
  const aktuell = C.tierkreisMonat(dt);
  return `<section class="karte"><div class="kicker">Tugend des Monats</div>${aktiv.map((a) => {
    const t = tugendNach(a.monat);
    return `<div style="margin-top:8px"><h3>${t.tugend} <span class="klein">wird zu</span> ${t.wird}</h3>
      <div class="klein">${t.tier}${t.variante ? " · " + esc(t.variante) : ""} · üben vom ${fTagMon.format(a.start)} bis ${fTagMon.format(a.end)}${a.monat === aktuell ? "" : " (klingt aus)"}</div></div>`;
  }).join("")}
  <div class="reihe"><a class="knopf" href="#jahr">Zum Jahresrad</a></div></section>`;
}

function nebenKarte(dt) {
  const n = S.get().neben;
  if (!n.aktuell) return "";
  const u = D.neben.uebungen[n.aktuell - 1];
  const start = n.start[n.aktuell] ? C.fromIso(n.start[n.aktuell]) : null;
  const tag = start ? C.diffDays(dt, start) + 1 : null;
  const reif = tag && tag > 30 && n.aktuell < 6;
  return `<section class="karte"><div class="kopfzeile"><span class="kicker">Nebenübung ${u.nr} von 6</span>${tag ? `<span class="klein">Tag ${tag}</span>` : ""}</div>
    <h3>${u.name}</h3>
    ${reif ? `<div class="hinweisbox">Du übst seit über einem Monat. Zeit für die nächste Übung: ${D.neben.uebungen[n.aktuell].name}.</div>` : ""}
    <div class="reihe"><a class="knopf" href="#ueben" data-a="zu-neben">Übungsweg öffnen</a></div></section>`;
}

function rueckKarte(dt) {
  const gemacht = S.get().rueck;
  const k = C.iso(dt);
  const letzte = Array.from({ length: 7 }, (_, i) => C.iso(C.addDays(dt, i - 6)));
  return `<section class="karte band" style="--band:var(--blau)"><div class="kopfzeile"><span class="kicker">Am Abend · Rückschau</span></div>
    <p>Den Tag rückwärts vor dem inneren Auge vorbeiziehen lassen, vom Abend zum Morgen, Bild für Bild, wie von außen betrachtet.</p>
    <div class="punkte" aria-label="Letzte sieben Tage">${letzte.map((d) => `<i class="${gemacht[d] ? "da" : ""} ${d === k ? "heute" : ""}"></i>`).join("")}</div>
    <div class="reihe"><button class="knopf ${gemacht[k] ? "" : "voll"}" data-a="rueck-heute">${gemacht[k] ? "✓ Heute gemacht" : "Heute gemacht"}</button>
    <button class="knopf leise" data-a="rueck-text">Text lesen</button></div></section>`;
}

function aktuellKarte(dt) {
  const liste = C.anlaesse(dt, D.aktuell, 21).slice(0, 3);
  if (!liste.length) return "";
  return `<section class="karte"><div class="kicker">Aktuell</div>${liste.map((e) => `<div style="margin-top:8px"><b>${e.titel}</b>
    <span class="klein"> · ${e.delta === 0 ? "heute" : e.delta === 1 ? "morgen" : e.delta === -1 ? "gestern" : "in " + e.delta + " Tagen"}${e.jahre ? ` · ${e.jahre}. Jahrestag` : ""}</span>
    <div class="klein">${e.text}</div></div>`).join("")}</section>`;
}

/* ---------- Ansichten ---------- */
function ansichtHeute() {
  const dt = C.today();
  const { treffer } = C.spruecheAm(dt);
  const sub = `Seelenwoche ${treffer.map((v) => v.nr).join(" und ")} · KW ${C.isoWeek(dt)}`;
  return `<div class="hero"><div class="datum">${fLang.format(dt)}</div><div class="unter">${sub}</div></div>
    ${tagKarte(dt)}${fokusKarte(dt)}${spruchKarte(dt)}${tugendKarte(dt)}${nebenKarte(dt)}${rueckKarte(dt)}${aktuellKarte(dt)}`;
}

function ansichtJahr() {
  const dt = C.today();
  const seg = `<div class="segment" role="group" aria-label="Ansicht">
    <button data-a="jahr-ansicht" data-v="rad" aria-pressed="${ui.jahrAnsicht === "rad"}">Monatstugenden</button>
    <button data-a="jahr-ansicht" data-v="sprueche" aria-pressed="${ui.jahrAnsicht === "sprueche"}">Wochensprüche</button></div>`;
  return seg + (ui.jahrAnsicht === "rad" ? radHtml(dt) : spruchListe(dt));
}

function radHtml(dt) {
  const aktivMonat = C.tierkreisMonat(dt);
  const gew = ui.gewMonat ?? aktivMonat;
  const t = tugendNach(gew);
  return `<div class="karte" style="padding:10px">${radSvg(D.tugenden.tugenden, dt, gew)}</div>
    <section class="karte"><div class="kicker">${t.tier}${gew === aktivMonat ? " · jetzt" : ""}</div>
      <h2>${t.tugend} <span class="klein">wird zu</span> ${t.wird}</h2>
      ${t.variante ? `<p class="klein">${esc(t.variante)}</p>` : ""}
      <p class="klein">Beginn um den 21. ${monatName(gew)}, geübt bis zum 1. ${monatName((gew + 1) % 12 + 1)}.</p>
      <div class="hinweisbox">${D.tugenden.regel}</div>
      <details><summary>Quelle und Hinweise</summary><p class="klein">${D.tugenden.quelle}</p><p class="klein">${D.tugenden.hinweis}</p></details></section>`;
}

function spruchListe(dt) {
  const aktuellesJahr = C.seelenjahrFuer(dt).startYear;
  const sj = ui.seelenStart ?? aktuellesJahr;
  const j = C.seelenjahr(sj);
  const jetzt = new Set(sj === aktuellesJahr ? C.spruecheAm(dt).treffer.map((v) => v.nr) : []);
  return `<div class="jahrwahl"><button data-a="seelenjahr" data-d="-1" aria-label="Vorheriges Seelenjahr">‹</button>
    <div class="titel"><h2>Seelenjahr ${sj}/${String(sj + 1).slice(2)}</h2><div class="klein">Beginn: Ostersonntag, ${fTagMon.format(j.ostern)}</div></div>
    <button data-a="seelenjahr" data-d="1" aria-label="Nächstes Seelenjahr">›</button></div>
    <section class="karte"><ul class="liste">${j.sprueche.map((v) => {
      const bis = C.addDays(v.start, 7 * v.weeks);
      const extra = v.weeks > 1 ? `<span class="etikett">${v.weeks} Wochen</span>` : v.geteilt ? `<span class="etikett">geteilte Woche</span>` : "";
      return `<li class="${jetzt.has(v.nr) ? "jetzt" : ""}"><button data-a="spruch" data-nr="${v.nr}">
        <span class="nr">${v.nr}</span><span class="zeit">${bereich(v.start, bis)} · KW ${C.isoWeek(C.addDays(v.start, 1))}${extra}</span>
        <span class="zeile">${esc(D.seelenkalender[v.nr - 1].zeilen[0])}</span></button></li>`;
    }).join("")}</ul></section>
    <div class="reihe" style="margin-bottom:14px"><button class="knopf" data-a="ics-sprueche">Als Kalenderdatei laden (.ics)</button></div>
    <p class="klein">Die Wochen beginnen am Sonntag. Die Sprüche 12, 26, 38 und 52 liegen in den Wochen von Johanni, Michaeli, Weihnachten und der Karwoche. Dazwischen teilen sich zwei Sprüche eine Woche oder ein Spruch gilt zwei Wochen.</p>`;
}

function ansichtUeben() {
  const tabs = [["tag", "Tagesübungen"], ["neben", "Übungsweg"], ["rueck", "Rückschau"]];
  const seg = `<div class="segment" role="group" aria-label="Übungen">${tabs.map(([k, n]) => `<button data-a="ueben-tab" data-v="${k}" aria-pressed="${ui.uebenTab === k}">${n}</button>`).join("")}</div>`;
  return seg + { tag: uebenTag, neben: uebenNeben, rueck: uebenRueck }[ui.uebenTab]();
}

function uebenTag() {
  const f = S.get().fokus;
  const alle = [...D.tage.tage.slice().sort((a, b) => REIHENFOLGE.indexOf(a.id) - REIHENFOLGE.indexOf(b.id)), D.tage.selbstbesinnung];
  return `<div class="hinweisbox">${D.tage.einleitung[1]}</div>
  ${alle.map((t) => `<section class="karte band" style="--band:${t.farbe}">
    <div class="kopfzeile"><span class="kicker">${t.name}${t.planet ? " · " + t.planet : ""}</span>${t.vokal ? `<span class="vokal">${t.vokal}</span>` : ""}</div>
    <h3>${t.thema}${f && f.id === t.id ? ` <span class="etikett">meine Übung</span>` : ""}</h3>
    <details><summary>Text lesen</summary>${absatz(t.text)}${beinameHtml(t)}${anregungHtml(t)}</details>
    <div class="reihe"><button class="knopf" data-a="fokus-waehlen" data-id="${t.id}">Als meine Übung festlegen</button></div></section>`).join("")}
  <p class="klein">${D.tage.quelle}</p>`;
}

function uebenNeben() {
  const n = S.get().neben;
  const stufen = D.neben.uebungen.map((u) => {
    const dran = n.aktuell === u.nr, weiter = n.aktuell && u.nr < n.aktuell;
    const start = n.start[u.nr] ? C.fromIso(n.start[u.nr]) : null;
    return `<div class="stufe ${dran ? "dran" : ""}"><div class="zahl">${u.nr}</div><div>
      <div class="name">${u.name}${dran ? `<span class="abzeichen">gerade dran</span>` : weiter ? `<span class="abzeichen weiter">wird weitergeübt</span>` : ""}</div>
      <p style="margin:.3em 0">${u.kern}</p>
      ${start ? `<div class="klein">begonnen am ${fLang.format(start)}</div>` : ""}
      <details class="volltext"><summary>Vollständiger Text</summary>${absatz(u.volltext)}</details>
      <div class="reihe"><button class="knopf ${dran ? "" : "voll"}" data-a="neben-start" data-nr="${u.nr}">${dran ? "Startdatum ändern" : start ? "Wieder aufnehmen" : "Jetzt beginnen"}</button>
      ${dran ? `<button class="knopf leise" data-a="neben-ende">Nicht mehr markieren</button>` : ""}</div></div></div>`;
  }).join("");
  return `<section class="karte"><div class="kicker">Die sechs Nebenübungen</div>
    <p class="klein" style="margin-top:6px">Jeweils etwa einen Monat lang eine Übung. Die neue steht im Mittelpunkt, die früheren werden weitergeübt. Im sechsten Monat wechseln alle fünf einander ab.</p>${stufen}
    <p class="klein" style="font-style:italic">${D.neben.merksatz}</p></section>
    <p class="klein">${D.neben.quelle}</p>`;
}

function uebenRueck() {
  return `<section class="karte band" style="--band:var(--blau)"><div class="kicker">${D.rueck.titel}</div>
    <div class="rueck-text volltext"><p style="margin-top:8px">${D.rueck.text}</p></div><p class="klein">${D.rueck.quelle}</p></section>
    ${rueckKarte(C.today())}`;
}

function ansichtLesen() {
  const dt = C.today();
  const anl = C.anlaesse(dt, D.aktuell, 60);
  const quelle = D.quellen;
  return `<section class="karte"><div class="kicker">Aktuell und anstehend</div>
    ${anl.length ? anl.map((e) => `<div style="margin-top:10px"><b>${e.titel}</b> <span class="klein">· ${fLang.format(e.wann)}${e.jahre ? ` · ${e.jahre}. Jahrestag` : ""}</span><div class="klein">${e.text}</div></div>`).join("") : `<p class="leer">In den nächsten Wochen steht nichts Besonderes an.</p>`}</section>
  <section class="karte"><div class="kicker">Bibliothek</div>
    <details><summary>Rückschau</summary><div class="rueck-text volltext"><p>${D.rueck.text}</p><p class="klein">${D.rueck.quelle}</p></div></details>
    <details><summary>Übungen für die Tage der Woche</summary><div class="volltext">${absatz(D.tage.einleitung)}${D.tage.tage.map((t) => `<h3 style="margin-top:1em">${t.name} · ${t.thema}</h3>${absatz(t.text)}`).join("")}<h3 style="margin-top:1em">Selbstbesinnung</h3>${absatz(D.tage.selbstbesinnung.text)}<p class="klein">${D.tage.quelle}</p></div></details>
    <details><summary>Nebenübungen, ganzer Text</summary><div class="volltext"><h3>${D.neben.einleitung[0]}</h3>${absatz(D.neben.einleitung.slice(1))}${D.neben.uebungen.map((u) => `<h3 style="margin-top:1em">${u.nr}. ${u.name}</h3>${absatz(u.volltext)}`).join("")}<p class="klein">${D.neben.quelle}</p></div></details>
    <details><summary>Zwölf Monatstugenden</summary><div class="volltext"><p>${D.tugenden.regel}</p>${D.tugenden.tugenden.map((t) => `<p><b>${t.tier}</b> · ${t.tugend}${t.variante ? " " + esc(t.variante) : ""} <i>wird zu</i> ${t.wird}</p>`).join("")}<p class="klein">${D.tugenden.quelle}</p></div></details>
  </section>
  <section class="karte"><div class="kicker">Quellen und weiterführende Schriften</div>
    ${quelle.werke.map((w) => `<div style="margin-top:8px"><b>${w.titel}</b> <span class="klein">(${w.ga})</span><div class="klein">${w.text}</div></div>`).join("")}
    <hr style="border:0;border-top:1px solid var(--linie);margin:14px 0">
    ${quelle.seiten.map((s) => `<div style="margin-top:6px"><a href="${s.url}" target="_blank" rel="noopener">${s.titel}</a><div class="klein">${s.text}</div></div>`).join("")}</section>
  <div class="hinweisbox">Steiners Worte sind in dieser App als Zitate mit Quelle wiedergegeben. Unter „Anregung“ stehende Hinweise zu Tätigkeiten sind Vorschläge der App und stammen nicht von Steiner.</div>`;
}

function ansichtEinstellungen() {
  const s = S.get().erinnerung;
  const perm = "Notification" in window ? Notification.permission : "nicht verfügbar";
  const theme = lsGet("atrorhym.theme") || "system";
  return `<h2 style="margin:6px 0 12px">Einstellungen</h2>
  <section class="karte"><div class="kicker">Erinnerungen</div>
    <p style="margin-top:8px">${D.erinn.einleitung}</p>
    ${D.erinn.eintraege.map((e) => `<div class="einstellung"><label class="zeile"><span>${e.titel}</span><input type="checkbox" data-a="erinn-an" data-k="${e.id}" ${s[e.id].an ? "checked" : ""}></label>
      <label class="zeile"><span class="klein">Uhrzeit (Vorschlag ${e.vorschlag})</span><input type="time" data-a="erinn-zeit" data-k="${e.id}" value="${s[e.id].zeit}"></label>
      <details><summary>Wann, warum und wie?</summary>
        <p><b>Wann.</b> ${e.wann}</p><p><b>Warum.</b> ${e.warum}</p><p><b>Wie.</b> ${e.wie}</p>
        <p class="klein"><b>Bei Steiner:</b> ${e.steiner}</p></details></div>`).join("")}
    <p class="klein">${D.erinn.technik}</p>
    <p class="klein">Benachrichtigungen: ${perm === "granted" ? "erlaubt" : perm === "denied" ? "im Browser blockiert, bitte dort freigeben" : perm === "default" ? "noch nicht erlaubt" : perm}.</p>
    <div class="reihe"><button class="knopf" data-a="erinn-erlauben">Benachrichtigungen erlauben</button>
    <button class="knopf" data-a="ics-erinn">Erinnerungen als Kalenderdatei</button></div></section>
  <section class="karte"><div class="kicker">Darstellung</div>
    <label class="zeile"><span>Farbschema</span><select data-a="theme"><option value="system" ${theme === "system" ? "selected" : ""}>System</option><option value="light" ${theme === "light" ? "selected" : ""}>Hell</option><option value="dark" ${theme === "dark" ? "selected" : ""}>Dunkel</option></select></label></section>
  <section class="karte"><div class="kicker">Meine Daten</div>
    <p class="klein">Dein Stand (Übung, Startdaten, Rückschau) liegt nur auf diesem Gerät. Sichere ihn hier oder übertrage ihn auf ein anderes Gerät.</p>
    <div class="reihe"><button class="knopf" data-a="export">Sichern</button><label class="knopf" style="cursor:pointer">Wiederherstellen<input type="file" accept="application/json" data-a="import" hidden></label>
    <button class="knopf leise" data-a="reset">Alles löschen</button></div></section>
  <p class="klein">Die Sprüche folgen der Handschrift von 1912/13 (anthroposophischer-seelenkalender.de). Die Berechnung der Seelenwochen stimmt mit dem Wegweiser 2026 bis 2030 überein.</p>`;
}

/* ---------- Rendern ---------- */
const ROUTEN = { heute: ansichtHeute, jahr: ansichtJahr, ueben: ansichtUeben, lesen: ansichtLesen, einstellungen: ansichtEinstellungen };
function route() { return location.hash.replace(/^#\/?/, "") || "heute"; }

function render(scroll = false) {
  const r = ROUTEN[route()] ? route() : "heute";
  document.getElementById("ansicht").innerHTML = ROUTEN[r]();
  document.querySelectorAll(".tabs a").forEach((a) => {
    if (a.dataset.tab === r) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
  if (scroll) window.scrollTo(0, 0);
}

/* ---------- Aktionen ---------- */
function spruchDialog(nr) {
  const gegen = C.gegenspruch(nr), spiegel = C.spiegelspruch(nr), spiegelG = C.gegenspruch(spiegel);
  const block = (n, kopf) => `<div style="margin-top:14px"><div class="kicker">${kopf}</div><div class="klein">Spruch ${n}</div>${versHtml(n)}</div>`;
  dialog(`<div class="kicker">Seelenkalender</div><div class="vers-nr">${nr}</div>${versHtml(nr)}
    ${block(gegen, "Gegenspruch")}${block(spiegel, "Spiegelspruch")}${block(spiegelG, "Gegenspruch des Spiegelspruchs")}
    <p class="klein" style="margin-top:14px">Gegensprüche liegen 26 Wochen auseinander. Spruch ${nr} und ${spiegel} sind Spiegelsprüche. Fassung der Handschrift 1912/13.</p>`);
}

function fokusDialog(vorId) {
  const f = S.get().fokus;
  const alle = [...REIHENFOLGE.map(tagNach), D.tage.selbstbesinnung];
  const gew = vorId || (f ? f.id : "samstag");
  const d = dialog(`<h3>Meine Übung</h3>
    <label class="zeile"><span>Übung</span><select id="f-id">${alle.map((t) => `<option value="${t.id}" ${t.id === gew ? "selected" : ""}>${t.name === "Selbstbesinnung" ? "Selbstbesinnung" : t.thema + " (" + t.name + ")"}</option>`).join("")}</select></label>
    <label class="zeile"><span>Dauer</span><select id="f-tage"><option value="7" ${f && f.tage === 7 ? "selected" : ""}>Eine Woche</option><option value="14" ${!f || f.tage === 14 ? "selected" : ""}>Zwei Wochen</option></select></label>
    <label class="zeile"><span>Beginn</span><input type="date" id="f-start" value="${C.iso(C.today())}"></label>
    <div class="reihe"><button class="knopf voll" data-a="fokus-speichern">Festlegen</button></div>`);
}

function nebenDialog(nr) {
  const n = S.get().neben;
  dialog(`<h3>${nr}. ${D.neben.uebungen[nr - 1].name}</h3>
    <label class="zeile"><span>Begonnen am</span><input type="date" id="n-start" value="${n.start[nr] || C.iso(C.today())}"></label>
    <div class="reihe"><button class="knopf voll" data-a="neben-speichern" data-nr="${nr}">Speichern</button></div>`);
}

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const erinnerungsListe = () => {
  const s = S.get().erinnerung;
  return [
    { id: "rueckschau", ...s.rueckschau, titel: "Rückschau", text: "Den Tag rückwärts vor dem inneren Auge vorbeiziehen lassen, vom Abend zum Morgen." },
    { id: "besinnung", ...s.besinnung, titel: "Selbstbesinnung", text: "Fünf Minuten in sein Inneres blicken, jeden Tag zur selben Zeit." },
    { id: "tag", ...s.tag, titel: "Tagesübung", text: "Die Übung des Tages: " + D.tage.tage.map((t) => t.name + " – " + t.thema).join("; ") },
  ];
};

document.addEventListener("click", async (e) => {
  const el = e.target.closest("[data-a], [data-monat]");
  if (!el) return;
  const a = el.dataset.a, set = S.set;
  if (el.dataset.monat && !a) { ui.gewMonat = +el.dataset.monat; return render(); }
  switch (a) {
    case "zu": el.closest("dialog").close(); break;
    case "jahr-ansicht": ui.jahrAnsicht = el.dataset.v; render(); break;
    case "ueben-tab": ui.uebenTab = el.dataset.v; render(); break;
    case "zu-neben": ui.uebenTab = "neben"; break;
    case "seelenjahr": ui.seelenStart = (ui.seelenStart ?? C.seelenjahrFuer(C.today()).startYear) + +el.dataset.d; render(); break;
    case "spruch": spruchDialog(+el.dataset.nr); break;
    case "rueck-text": dialog(`<div class="kicker">${D.rueck.titel}</div><div class="rueck-text volltext" style="margin-top:8px"><p>${D.rueck.text}</p></div><p class="klein">${D.rueck.quelle}</p>`); break;
    case "rueck-heute": set((s) => { const k = C.iso(C.today()); if (s.rueck[k]) delete s.rueck[k]; else s.rueck[k] = true; }); render(); break;
    case "fokus-waehlen": fokusDialog(el.dataset.id); break;
    case "fokus-speichern": {
      const d = el.closest("dialog");
      set((s) => { s.fokus = { id: d.querySelector("#f-id").value, tage: +d.querySelector("#f-tage").value, start: d.querySelector("#f-start").value || C.iso(C.today()) }; });
      d.close(); render(); toast("Übung festgelegt"); break;
    }
    case "fokus-ende": set((s) => { s.fokus = null; }); render(); break;
    case "neben-start": nebenDialog(+el.dataset.nr); break;
    case "neben-speichern": {
      const d = el.closest("dialog"), nr = +el.dataset.nr;
      set((s) => { s.neben.aktuell = nr; s.neben.start[nr] = d.querySelector("#n-start").value || C.iso(C.today()); });
      d.close(); render(); toast("Gespeichert"); break;
    }
    case "neben-ende": set((s) => { s.neben.aktuell = null; }); render(); break;
    case "erinn-erlauben":
      if (!("Notification" in window)) return toast("Dieser Browser unterstützt keine Benachrichtigungen");
      await Notification.requestPermission(); scheduleReminders(); render(); break;
    case "ics-erinn": {
      const an = erinnerungsListe().filter((r) => r.an);
      if (!an.length) return toast("Schalte zuerst eine Erinnerung ein");
      download("rhythmen-erinnerungen.ics", erinnerungenIcs(an), "text/calendar"); break;
    }
    case "ics-sprueche": {
      const sj = ui.seelenStart ?? C.seelenjahrFuer(C.today()).startYear;
      download(`seelenkalender-${sj}-${sj + 1}.ics`, spruecheIcs(D.seelenkalender, sj, sj), "text/calendar"); break;
    }
    case "export": download("rhythmen-stand.json", S.exportJson(), "application/json"); break;
    case "reset": dialog(`<h3>Alles löschen?</h3><p>Deine Übung, Startdaten und Rückschau-Einträge auf diesem Gerät werden entfernt.</p><div class="reihe"><button class="knopf voll" data-a="reset-ja">Ja, löschen</button><button class="knopf leise" data-a="zu">Abbrechen</button></div>`); break;
    case "reset-ja": try { localStorage.removeItem("atrorhym.v1"); } catch { /* ignorieren */ } location.reload(); break;
  }
});

document.addEventListener("change", async (e) => {
  const el = e.target, a = el.dataset.a;
  if (a === "erinn-an") {
    S.set((s) => { s.erinnerung[el.dataset.k].an = el.checked; });
    if (el.checked && "Notification" in window && Notification.permission === "default") await Notification.requestPermission();
    scheduleReminders(); render();
  } else if (a === "erinn-zeit") { S.set((s) => { s.erinnerung[el.dataset.k].zeit = el.value || "21:30"; }); scheduleReminders(); }
  else if (a === "theme") {
    lsSet("atrorhym.theme", el.value);
    applyTheme();
  } else if (a === "import" && el.files[0]) {
    try { S.importJson(await el.files[0].text()); render(); toast("Wiederhergestellt"); } catch { toast("Datei konnte nicht gelesen werden"); }
  }
});

function applyTheme() {
  const t = lsGet("atrorhym.theme");
  if (t === "light" || t === "dark") document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
}

/* ---------- Erinnerungen (nur bei geöffneter App) ---------- */
let timers = [];
async function zeigeBenachrichtigung(r) {
  let text = r.text;
  if (r.id === "tag") { const t = tagFuer(C.today()); text = `${t.name}: ${t.thema}`; }
  const opts = { body: text, icon: "icons/icon-192.png", tag: "rhythmen-" + r.id };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) return reg.showNotification(r.titel, opts);
  } catch { /* weiter */ }
  new Notification(r.titel, opts);
}
function scheduleReminders() {
  timers.forEach(clearTimeout); timers = [];
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const jetzt = new Date();
  for (const r of erinnerungsListe().filter((x) => x.an)) {
    const [h, m] = r.zeit.split(":").map(Number);
    const ziel = new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate(), h, m, 0);
    if (ziel <= jetzt) ziel.setDate(ziel.getDate() + 1);
    timers.push(setTimeout(() => { zeigeBenachrichtigung(r); scheduleReminders(); }, Math.min(ziel - jetzt, 2 ** 31 - 1)));
  }
}

/* ---------- Start ---------- */
async function start() {
  applyTheme();
  const dateien = { seelenkalender: "seelenkalender", tage: "tage", tugenden: "tugenden", neben: "nebenuebungen", rueck: "rueckschau", aktuell: "aktuell", quellen: "quellen", erinn: "erinnerungen" };
  try {
    await Promise.all(Object.entries(dateien).map(async ([k, f]) => { D[k] = await (await fetch(`data/${f}.json`)).json(); }));
  } catch {
    document.getElementById("ansicht").innerHTML = `<p class="leer">Die Inhalte konnten nicht geladen werden. Bitte die Seite neu laden.</p>`;
    return;
  }
  window.addEventListener("hashchange", () => render(true));
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { render(); scheduleReminders(); } });
  render(); scheduleReminders();
  try { if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {}); } catch { /* ohne Offline-Cache */ }
}
start();
