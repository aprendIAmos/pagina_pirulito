// Verifica que cada getElementById del frontend exista en su HTML y que
// los imports apunten a archivos reales.
//   node tools/verificar-enlaces.mjs
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const publicDir = "public";
const fallos = [];
let revisados = 0;

const paginas = [
  { html: "index.html", scripts: ["js/app.js", "js/api.js", "js/sesion.js", "js/catalogo.js", "js/ui.js"] },
  { html: "cuenta.html", scripts: ["js/cuenta.js", "js/api.js", "js/sesion.js", "js/ui.js"] },
];

for (const pagina of paginas) {
  const htmlPath = path.join(publicDir, pagina.html);
  const html = readFileSync(htmlPath, "utf8");

  console.log(`\n${pagina.html}`);

  // 1. Los scripts que la página carga tienen que existir.
  const cargados = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
  for (const src of cargados) {
    revisados += 1;
    const existe = existsSync(path.join(publicDir, src));
    if (!existe) fallos.push(`${pagina.html}: carga ${src} y no existe`);
    else console.log(`  ok   script ${src}`);
  }

  // 2. Todo getElementById de los módulos de esa página debe existir.
  for (const script of pagina.scripts) {
    const scriptPath = path.join(publicDir, script);
    if (!existsSync(scriptPath)) continue;
    const codigo = readFileSync(scriptPath, "utf8");

    const ids = [...codigo.matchAll(/getElementById\("([^"]+)"\)/g)].map((m) => m[1]);
    for (const id of new Set(ids)) {
      revisados += 1;
      if (!html.includes(`id="${id}"`)) {
        fallos.push(`${script}: busca #${id} y ${pagina.html} no lo tiene`);
      } else {
        console.log(`  ok   ${script} → #${id}`);
      }
    }

    // 3. Los imports relativos existen en disco.
    const imports = [...codigo.matchAll(/from\s+"(\.[^"]+)"/g)].map((m) => m[1]);
    for (const rel of imports) {
      revisados += 1;
      const destino = path.join(path.dirname(scriptPath), rel);
      if (!existsSync(destino)) fallos.push(`${script}: importa ${rel} y no existe`);
      else console.log(`  ok   ${script} importa ${rel}`);
    }
  }

  // 4. Los estilos y links locales. Los anchors (#seccion) se validan
  //    contra el id de la página destino, así que se separan del archivo.
  const assets = [...html.matchAll(/(?:href|src)="((?!https?:|data:|#|mailto:)[^"]+)"/g)].map((m) => m[1]);
  for (const ref of new Set(assets)) {
    revisados += 1;
    const [archivo, anchor] = ref.split("#");
    const existe = existsSync(path.join(publicDir, archivo));
    if (!existe) {
      fallos.push(`${pagina.html}: referencia ${ref} y no existe`);
      continue;
    }
    if (anchor) {
      const destino = readFileSync(path.join(publicDir, archivo), "utf8");
      if (!destino.includes(`id="${anchor}"`)) {
        fallos.push(`${pagina.html}: ${ref} apunta a un ancla inexistente`);
        continue;
      }
    }
    console.log(`  ok   asset ${ref}`);
  }
}

/* ------------------------------------------------------------------ *
 * Guarda de CSS
 *
 * El atributo hidden depende de la regla [hidden] { display: none } del
 * navegador, a la que cualquier `display` de autor le gana. Ya pasó: al
 * login le ganaba .login-panel { display: grid } y la pantalla se quedaba
 * pegada. Esta guarda falla si alguien saca el [hidden] global.
 * ------------------------------------------------------------------ */

console.log("\nstyles.css");

{
  const css = readFileSync(path.join(publicDir, "styles.css"), "utf8");
  const guarda = /\[hidden\]\s*\{[^}]*display:\s*none\s*!important/s.exec(css);

  revisados += 1;
  if (!guarda) {
    fallos.push(
      "styles.css: falta la regla global [hidden] { display: none !important }, sin ella los paneles con display propio no se ocultan",
    );
  } else {
    console.log("  ok   [hidden] fuerza display: none");
  }
}

console.log(`\n${revisados - fallos.length}/${revisados} comprobaciones OK.`);
if (fallos.length) {
  console.error("\nProblemas:");
  fallos.forEach((f) => console.error(`  - ${f}`));
  process.exit(1);
}
