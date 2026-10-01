// Prueba del frontend con jsdom: monta index.html y cuenta.html, deja que
// los módulos corran contra el server real y verifica que se pinten las
// tarjetas, el login, los saldos y el panel de admin.
//   node tools/probar-frontend.mjs
//
// Requiere el server corriendo en :3000 (npm start).

import { readFileSync } from "node:fs";
import path from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";

const BASE = process.env.BASE || "http://localhost:3000";
const PASSWORD = "pirulito123";
const COOKIE = "pirulito_session";

let fallos = 0;
let pruebas = 0;

function ok(nombre, condicion, extra = "") {
  pruebas += 1;
  if (condicion) console.log(`  ok   ${nombre}`);
  else {
    fallos += 1;
    console.error(`  FALLA ${nombre} ${extra}`);
  }
}

function seccion(titulo) {
  console.log(`\n${titulo}`);
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const erroresConsola = [];

/* ------------------------------------------------------------------ *
 * Entorno jsdom
 *
 * jsdom no ejecuta scripts type="module", así que en vez de inyectar los
 * <script> del HTML importamos los módulos a mano desde Node y les damos
 * los globals que esperan (document, fetch, CustomEvent, etc). El fetch
 * va con un tarro de cookies propio porque el de Node no las guarda.
 * ------------------------------------------------------------------ */

let cookie = "";

// El fetch nativo, guardado antes de que los módulos reemplacen el global.
const fetchNativo = globalThis.fetch;

/**
 * fetch con tarro de cookies: el de Node no guarda cookies entre
 * llamadas, así que la mantenemos a mano para simular al browser.
 * Devuelve la Response cruda, que es lo que espera el código del sitio.
 */
async function fetchConCookie(url, opciones = {}) {
  const cabeceras = { ...(opciones.headers || {}) };
  if (cookie) cabeceras.Cookie = cookie;

  const respuesta = await fetchNativo(url, { ...opciones, headers: cabeceras });

  for (const linea of respuesta.headers.getSetCookie?.() || []) {
    const par = linea.split(";")[0];
    if (par.startsWith(`${COOKIE}=`)) cookie = par;
  }

  return respuesta;
}

/** Igual que fetchConCookie pero devuelve { status, datos } para assert. */
async function consultar(url, opciones = {}) {
  const respuesta = await fetchConCookie(url, opciones);
  const texto = await respuesta.text();
  let datos = null;
  if (texto) {
    try {
      datos = JSON.parse(texto);
    } catch {
      datos = texto;
    }
  }
  return { status: respuesta.status, datos };
}

function instalarGlobals(window) {
  globalThis.window = window;
  globalThis.document = window.document;
  // navigator y location son getters en Node: se redefinen, no se asignan.
  Object.defineProperty(globalThis, "navigator", {
    value: window.navigator,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, "location", {
    value: window.location,
    configurable: true,
    writable: true,
  });
  globalThis.sessionStorage = window.sessionStorage;
  globalThis.localStorage = window.localStorage;
  globalThis.CustomEvent = window.CustomEvent;
  globalThis.Event = window.Event;
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.Element = window.Element;
  globalThis.Node = window.Node;
  globalThis.FormData = window.FormData;
  globalThis.getComputedStyle = window.getComputedStyle.bind(window);
  globalThis.requestAnimationFrame = (fn) => setTimeout(() => fn(Date.now()), 0);
  // Los módulos usan IntersectionObserver como global suelto.
  globalThis.IntersectionObserver = window.IntersectionObserver;
  globalThis.matchMedia = window.matchMedia;

  // Las rutas relativas ("/api/...") se resuelven contra el server.
  globalThis.fetch = (url, opciones) =>
    fetchConCookie(String(url).startsWith("http") ? String(url) : `${BASE}${url}`, opciones);
}

/**
 * Monta una página del sitio y ejecuta su entrypoint.
 * `salto` permite recargar el módulo con la sesión ya abierta.
 */
async function montarPagina(nombrePagina, entrada) {
  const html = readFileSync(path.join("public", nombrePagina), "utf8");

  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error) => {
    erroresConsola.push(`[${nombrePagina}] ${error.message}`);
  });
  virtualConsole.on("error", (...args) => {
    erroresConsola.push(`[${nombrePagina}] ${args.join(" ")}`);
  });

  const dom = new JSDOM(html, {
    url: `${BASE}/${nombrePagina}`,
    runScripts: "dangerously",
    pretendToBeVisual: true,
    virtualConsole,
  });

  const { window } = dom;
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  window.matchMedia = () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  });

  instalarGlobals(window);

  await import(`../public/${entrada}`);

  return { dom, window, document: window.document };
}

function enviar(form, window) {
  form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
}

/* ------------------------------------------------------------------ */

seccion("Reinicio de los datos mock");
// Los datos viven en memoria: la prueba necesita partir del estado inicial
// para que los saldos y el historial sean predecibles.
{
  await consultar(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario: "admin", password: PASSWORD }),
  });
  const reinicio = await consultar(`${BASE}/api/admin/reiniciar-datos`, { method: "POST" });
  ok("los datos volvieron al estado inicial", reinicio.status === 200, `(${reinicio.status})`);
  cookie = "";
}

seccion("Página de inicio: el catálogo viene de la API");
let inicio;
{
  inicio = await montarPagina("index.html", "js/app.js");
  const { document } = inicio;
  await esperar(500);

  const tarjetas = document.querySelectorAll(".product-card");
  ok("se pintaron 4 tarjetas", tarjetas.length === 4, `(${tarjetas.length})`);

  const precio = document.querySelector(".product-price")?.textContent || "";
  ok("el precio viene de la API", precio.includes("3.000"), precio);

  ok("cada tarjeta tiene botón Comprar",
    document.querySelectorAll("[data-comprar]").length === 4,
    String(document.querySelectorAll("[data-comprar]").length));

  const wa = document.querySelector(".product-order")?.getAttribute("href") || "";
  ok("el enlace de WhatsApp se armó solo", wa.startsWith("https://wa.me/5491138569142"), wa);
  ok("el mensaje incluye el nombre del postre", wa.includes("Chocotorta"), wa);

  const contador = document.querySelector('[data-filter="all"] span')?.textContent;
  ok("el contador de filtros quedó en 04", contador === "04", contador);

  const navCuenta = document.querySelector("[data-nav-cuenta]");
  ok("el link de cuenta apunta al login sin sesión",
    navCuenta?.getAttribute("href")?.includes("login=1"), navCuenta?.getAttribute("href"));
  ok("el link dice 'Mi cuenta' sin sesión",
    navCuenta?.textContent === "Mi cuenta", navCuenta?.textContent);

  ok("los 3 filtros quedaron cargados",
    document.querySelectorAll("[data-filter]").length === 4,
    String(document.querySelectorAll("[data-filter]").length));
}

seccion("El botón Comprar existe aunque no haya sesión");
{
  // jsdom no navega entre documentos, así que acá se verifica que el botón
  // está listo y que el catálogo no se rompe al primer click.
  const { document } = inicio;
  const boton = document.querySelector("[data-comprar]");
  ok("el botón Comprar está en el DOM", Boolean(boton));
  ok("invita a iniciar sesión en el title",
    (boton?.getAttribute("title") || "").includes("Iniciá sesión"),
    boton?.getAttribute("title"));
  boton?.click();
  await esperar(150);
  const relevantes = erroresConsola.filter((e) => !e.includes("Not implemented: navigation"));
  ok("el click no tira errores de JS", relevantes.length === 0,
    JSON.stringify(relevantes.slice(0, 3)));
}

seccion("Cuenta: login con los datos mock");
const cuenta = await montarPagina("cuenta.html", "js/cuenta.js");
{
  const { document } = cuenta;
  await esperar(500);

  ok("arranca mostrando el login", document.getElementById("login-panel")?.hidden === false);
  ok("el panel de cuenta está oculto", document.getElementById("cuenta-panel")?.hidden === true);

  document.querySelector('[data-demo="ana"]').click();
  ok("el chip de demo completa el usuario",
    document.getElementById("login-usuario").value === "ana");
  ok("el chip de demo completa la contraseña",
    document.getElementById("login-password").value === PASSWORD);

  enviar(document.getElementById("login-form"), cuenta.window);
  await esperar(700);

  ok("tras entrar se oculta el login", document.getElementById("login-panel")?.hidden === true);
  ok("se muestra el panel de cuenta", document.getElementById("cuenta-panel")?.hidden === false);
  ok("saluda a Ana por nombre",
    document.getElementById("cuenta-nombre")?.textContent === "Ana",
    document.getElementById("cuenta-nombre")?.textContent);
  ok("el ciclo muestra $7.000",
    document.getElementById("saldo-ciclo")?.textContent?.includes("7.000"),
    document.getElementById("saldo-ciclo")?.textContent);
  ok("la barra de progreso va al 70%",
    document.getElementById("progreso-bar")?.style?.width === "70%",
    document.getElementById("progreso-bar")?.style?.width);

  const progreso = document.getElementById("saldo-progreso-texto")?.textContent || "";
  ok("dice cuánto falta para el regalo", progreso.includes("3.000"), progreso);

  ok("lista 1 promo", document.querySelectorAll("#lista-promos .beneficio").length === 1);
  ok("lista 2 descuentos", document.querySelectorAll("#lista-descuentos .beneficio").length === 2);
  ok("lista 2 cupones", document.querySelectorAll("#lista-cupones .beneficio").length === 2);
  ok("el panel de admin queda oculto para el cliente",
    document.getElementById("admin-panel")?.hidden === true);
  ok("el historial de compras arranca vacío",
    document.getElementById("lista-compras")?.textContent?.includes("Todavía no compraste"),
    document.getElementById("lista-compras")?.textContent?.trim());
}

seccion("Aplicar un cupón");
{
  const { document, window } = cuenta;
  document.getElementById("cupon-codigo").value = "MENOS10";
  enviar(document.getElementById("cupon-form"), window);
  await esperar(600);

  ok("no muestra error", document.getElementById("cupon-error")?.hidden === true,
    document.getElementById("cupon-error")?.textContent);
  ok("el cupón figura como usado",
    document.querySelectorAll("#lista-cupones .beneficio.is-usado").length === 1);
  ok("aparece en el historial de canjes",
    document.getElementById("lista-canjes")?.textContent?.includes("MENOS10"),
    document.getElementById("lista-canjes")?.textContent?.slice(0, 60));
}

seccion("La API le cierra el panel a la cliente");
{
  const respuesta = await consultar(`${BASE}/api/admin/config`);
  ok("/api/admin/config responde 403 para la cliente", respuesta.status === 403,
    `(${respuesta.status})`);
}

seccion("Admin entra y cambia la regla");
{
  const { document, window } = cuenta;
  document.getElementById("logout-button").click();
  await esperar(600);
  ok("vuelve al login", document.getElementById("login-panel")?.hidden === false);

  document.querySelector('[data-demo="admin"]').click();
  enviar(document.getElementById("login-form"), window);
  await esperar(800);

  ok("el panel de admin se muestra", document.getElementById("admin-panel")?.hidden === false);
  ok("el form cargó el límite $10.000",
    document.getElementById("admin-limite")?.value === "10000",
    document.getElementById("admin-limite")?.value);
  ok("el form cargó el regalo $1.000",
    document.getElementById("admin-regalo")?.value === "1000",
    document.getElementById("admin-regalo")?.value);
  ok("el select de usuarios se llenó",
    document.querySelectorAll("#admin-usuario option").length === 2,
    String(document.querySelectorAll("#admin-usuario option").length));

  document.getElementById("admin-limite").value = "20000";
  document.getElementById("admin-regalo").value = "3000";
  enviar(document.getElementById("admin-config-form"), window);
  await esperar(600);

  const status = document.getElementById("admin-status")?.textContent || "";
  ok("confirma el cambio guardado",
    status.includes("20.000") && status.includes("3.000"), status);

  const verificacion = await consultar(`${BASE}/api/admin/config`);
  ok("la regla quedó en $20.000 / $3.000 en el backend",
    verificacion.datos?.config?.limite === 20000 && verificacion.datos?.config?.montoRegalo === 3000,
    JSON.stringify(verificacion.datos?.config));
}

seccion("Dejamos la regla como estaba");
{
  await consultar(`${BASE}/api/admin/config`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ limite: 10000, montoRegalo: 1000, activa: true, reiniciarCiclo: true }),
  });
  const restaurado = await consultar(`${BASE}/api/admin/config`);
  ok("la regla volvió a $10.000 / $1.000",
    restaurado.datos?.config?.limite === 10000 && restaurado.datos?.config?.montoRegalo === 1000,
    JSON.stringify(restaurado.datos?.config));
}

seccion("Errores de consola");
{
  // jsdom no implementa la navegación entre documentos: el aviso de
  // "Not implemented: navigation" no es un problema del sitio.
  const relevantes = erroresConsola.filter((e) => !e.includes("Not implemented: navigation"));
  ok("ninguna página tiró errores de JS", relevantes.length === 0,
    JSON.stringify(relevantes.slice(0, 4)));
}

console.log(`\n${pruebas - fallos}/${pruebas} pruebas pasaron.`);
if (fallos) {
  console.error(`${fallos} fallaron.`);
  process.exit(1);
}
