// Persönlicher Stand (nur auf diesem Gerät, im Browser gespeichert).
const KEY = "atrorhym.v1";
const defaults = () => ({
  fokus: null, // { id, start: "YYYY-MM-DD", tage: 7|14 }
  neben: { aktuell: null, start: {} }, // Nebenübungen: gerade dran + Startdaten je Übung
  rueck: {}, // { "YYYY-MM-DD": true } Rückschau gemacht
  erinnerung: {
    rueckschau: { an: false, zeit: "21:30" },
    besinnung: { an: false, zeit: "07:00" },
    tag: { an: false, zeit: "08:00" },
  },
});

const merge = (base, over) => {
  if (!over || typeof over !== "object") return base;
  for (const k of Object.keys(base)) {
    if (over[k] === undefined) continue;
    base[k] = base[k] && typeof base[k] === "object" && !Array.isArray(base[k]) && base[k] !== null
      ? merge(base[k], over[k]) : over[k];
  }
  if (base.fokus === null && over.fokus) base.fokus = over.fokus;
  return base;
};

let state;
try { state = merge(defaults(), JSON.parse(localStorage.getItem(KEY))); } catch { state = defaults(); }

export const get = () => state;
export function set(fn) {
  fn(state);
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* privater Modus o. ä. */ }
}
export const exportJson = () => JSON.stringify(state, null, 1);
export function importJson(text) {
  const parsed = JSON.parse(text);
  state = merge(defaults(), parsed);
  if (parsed.fokus === null) state.fokus = null;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
}
