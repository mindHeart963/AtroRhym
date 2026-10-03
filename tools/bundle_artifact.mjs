// Baut aus web/ eine einzelne HTML-Datei (CSS, Skripte, Daten eingebettet) für die Veröffentlichung als Artifact.
// Aufruf: node tools/bundle_artifact.mjs <ausgabe.html>
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../web/", import.meta.url));
const read = (f) => readFileSync(root + f, "utf8");

const module = (name, file) => {
  let code = read(file);
  const exportsList = [];
  code = code.replace(/^export\s+(async\s+function|function|const)\s+([A-Za-z0-9_]+)/gm, (_, kind, n) => { exportsList.push(n); return `${kind} ${n}`; });
  code = code.replace(/^import \* as (\w+) from "\.\/(\w+)\.js";\n/gm, (_, ns, m) => `const ${ns} = __${m};\n`);
  code = code.replace(/^import \{([^}]+)\} from "\.\/(\w+)\.js";\n/gm, (_, names, m) => `const {${names}} = __${m};\n`);
  return `const __${name} = (() => {\n${code}\nreturn { ${exportsList.join(", ")} };\n})();\n`;
};

const data = {};
for (const f of ["seelenkalender", "tage", "tugenden", "nebenuebungen", "rueckschau", "aktuell", "quellen"]) data[f] = JSON.parse(read(`data/${f}.json`));

let app = read("js/app.js")
  .replace(/^import \* as (\w+) from "\.\/(\w+)\.js";\n/gm, (_, ns, m) => `const ${ns} = __${m};\n`)
  .replace(/^import \{([^}]+)\} from "\.\/(\w+)\.js";\n/gm, (_, names, m) => `const {${names}} = __${m};\n`);
app = app.replace("D[k] = await (await fetch(`data/${f}.json`)).json();", "D[k] = __DATA[f];");
app = app.replace(/try \{ if \("serviceWorker"[^\n]*\n/, "");

const script = `const __DATA = ${JSON.stringify(data)};\n` +
  module("calc", "js/calc.js") + module("store", "js/store.js") + module("ics", "js/ics.js") + module("wheel", "js/wheel.js") +
  app.replace(/^const D = \{\};/m, "const D = {};");

const index = read("index.html");
const body = index.match(/<body>([\s\S]*?)<script type="module"[^>]*><\/script>/)[1];
const fonts = index.match(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>/)[0];
const html = `<title>Rhythmen</title>
${fonts}
<style>
${read("css/style.css")}
body { padding-inline: 0; }
</style>
${body}
<script>
${script}
</script>
`;
writeFileSync(process.argv[2], html);
console.log(process.argv[2], (html.length / 1024).toFixed(0) + " KB");
