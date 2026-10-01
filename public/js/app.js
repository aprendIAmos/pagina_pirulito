document.documentElement.classList.add("js");

/* ------------------------------------------------------------------ *
 * Arranque
 *
 * Este archivo arma el sitio estático y coordina los módulos que hablan
 * con la API (sesión, catálogo, avisos). El orden importa: primero se
 * resuelve quién está logueado, después se pinta el catálogo.
 * ------------------------------------------------------------------ */

import { initSesion, alCambiar, obtenerUsuario } from "./sesion.js";
import { cargarCatalogo } from "./catalogo.js";
import { formatearPrecio } from "./api.js";

/* ------------------------------------------------------------------ *
 * Configuración central
 * ------------------------------------------------------------------ */

// Número de WhatsApp en formato internacional sin "+" (para wa.me).
const WHATSAPP_NUMBER = "5491138569142";

// Mensaje por defecto al abrir las consultas generales.
const DEFAULT_MESSAGE = "¡Hola! Quiero hacer un pedido en Pirulito 🍰";

function buildWhatsAppUrl(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/* ------------------------------------------------------------------ *
 * Enlaces de WhatsApp
 * ------------------------------------------------------------------ */

// Enlaces generales (portada, menú, contacto, etc.).
const generalLinks = document.querySelectorAll('[data-whatsapp="general"]');
generalLinks.forEach((link) => {
  link.href = buildWhatsAppUrl(DEFAULT_MESSAGE);
});

// Enlaces de cada producto (mensaje prearmado con el nombre del postre).
// El catálogo los arma js/catalogo.js, así que también los enganchamos
// apenas se pintan las tarjetas.
function conectarEnlacesProducto(contenedor = document) {
  contenedor.querySelectorAll("[data-product]").forEach((link) => {
    if (link.dataset.whatsappListo) return;
    link.dataset.whatsappListo = "1";
    const product = link.dataset.product;
    link.href = buildWhatsAppUrl(
      `¡Hola! Quiero pedir ${product} de Pirulito 🍰 ¿Me contás disponibilidad?`,
    );
  });
}

conectarEnlacesProducto();

document.addEventListener("pirulito:catalogo-listo", () => {
  conectarEnlacesProducto();
});

/* ------------------------------------------------------------------ *
 * Precios estáticos
 *
 * El catálogo se arma desde la API, así que acá solo quedan los precios
 * sueltos queMight这么写下去会乱。我先停一下对齐一下。

我们刚在做的是一个 Pirulito 甜品站的改造：把价格从 HTML 硬编码迁到 API 驱动，配套 session / 购物车 / 登录跳转，再加一个账户页。

在动 `app.js` 之前，有两点想跟你确认：

1. **静态价格还留不留？** 我倾向把 `data-price` 那段格式化逻辑整个删掉——所有商品价格都由 `catalogo.js` 从接口拿，页面里不再有需要前端算的价格节点。保留它只是死代码。

2. **`js/app.js` 要不要拆？** 它现在混了三类东西：静态站点的初始化（汉堡菜单、滚动 reveal、footer 年份）、页面启动流程、以及即将加的全局 UI（toast 提示、gift 弹层、session 状态）。我的建议是拆成：
   - `sitio.js` — 纯静态行为，跟 API 无关
   - `ui.js` — toast / gift 弹层，全站共用
   - `app.js` — 只留启动编排

不过如果这个站只有首页+账户页两个页面，拆的收益不大，合成一个文件也能维护。

你倾向哪种？如果没特别偏好我就按「删掉静态价格 + 拆成三个文件」往下做，然后把账户页（`cuenta.html` + `cuenta.js`）补上。

const menuToggle = document.querySelector(".menu-toggle");
const primaryNav = document.querySelector("#primary-nav");

function closeMenu() {
  if (!menuToggle || !primaryNav) return;
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Abrir menú");
  primaryNav.classList.remove("is-open");
}

if (menuToggle && primaryNav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Abrir menú" : "Cerrar menú");
    primaryNav.classList.toggle("is-open", !isOpen);
  });

  primaryNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("click", (event) => {
    if (
      primaryNav.classList.contains("is-open") &&
      !primaryNav.contains(event.target) &&
      !menuToggle.contains(event.target)
    ) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
}

/* ------------------------------------------------------------------ *
 * Catálogo: filtros y contadores automáticos
 * ------------------------------------------------------------------ */

const filterButtons = document.querySelectorAll("[data-filter]");
const filterStatus = document.getElementById("filter-status");

// Las tarjetas las arma js/catalogo.js después de pedirle los productos a
// la API, así que se consultan en el momento en vez de guardarse en una
// NodeList estática.
function tarjetas() {
  return document.querySelectorAll(".product-card[data-category]");
}

function filtroActivo() {
  // NodeList no tiene find: hay que convertirlo.
  const activo = [...filterButtons].find((b) => b.classList.contains("is-active"));
  return activo ? activo.dataset.filter : "all";
}

function padCount(count) {
  return String(count).padStart(2, "0");
}

function updateFilterCounts() {
  const todas = tarjetas();
  filterButtons.forEach((button) => {
    const filter = button.dataset.filter;
    const count =
      filter === "all"
        ? todas.length
        : document.querySelectorAll(
            `.product-card[data-category="${filter}"]`,
          ).length;
    const counter = button.querySelector("span");
    if (counter) counter.textContent = padCount(count);

    // Un filtro sin productos se deshabilita para no llevar a un vacío.
    button.disabled = filter !== "all" && count === 0;
    button.classList.toggle("is-empty", button.disabled);
  });
}

function getFilterLabel(filter) {
  const button = document.querySelector(`[data-filter="${filter}"]`);
  if (!button) return "Todos";
  return button.textContent.replace(/[0-9]/g, "").trim();
}

function applyFilter(filter) {
  tarjetas().forEach((card) => {
    const shouldShow = filter === "all" || card.dataset.category === filter;
    card.classList.toggle("is-hidden", !shouldShow);
  });

  filterButtons.forEach((button) => {
    const isActive = button.dataset.filter === filter;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  if (filterStatus) {
    const total = tarjetas().length;
    filterStatus.textContent =
      filter === "all"
        ? `Mostrando los ${total} postres.`
        : `Mostrando ${getFilterLabel(filter)}: ${
            document.querySelectorAll(
              `.product-card[data-category="${filter}"]:not(.is-hidden)`,
            ).length
          } de ${total}.`;
  }
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => applyFilter(button.dataset.filter));
});

// Se recalcula cuando el catálogo termina de cargarse.
document.addEventListener("pirulito:catalogo-listo", () => {
  updateFilterCounts();
  applyFilter(filtroActivo());
});

/* ------------------------------------------------------------------ *
 * Imágenes: respaldo si una foto no carga
 * ------------------------------------------------------------------ */

function vigilarImagenes(contenedor = document) {
  contenedor.querySelectorAll("img").forEach((img) => {
    if (img.dataset.vigilada) return;
    img.dataset.vigilada = "1";
    img.addEventListener(
      "error",
      () => img.classList.add("is-missing"),
      { once: true },
    );
  });
}

vigilarImagenes();

/* ------------------------------------------------------------------ *
 * Año del footer
 * ------------------------------------------------------------------ */

const year = document.querySelector("[data-year]");
if (year) year.textContent = new Date().getFullYear();

/* ------------------------------------------------------------------ *
 * Animaciones de aparición
 *
 * El catálogo se dibuja después, así que se vuelve a observar cuando
 * js/catalogo.js avisa que ya pintó las tarjetas.
 * ------------------------------------------------------------------ */

function observarRevelados(contenedor = document) {
  const items = contenedor.querySelectorAll(".reveal:not([data-revealado])");
  if (!("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.12 },
  );
  items.forEach((item) => {
    item.dataset.revealado = "1";
    observer.observe(item);
  });
}

observarRevelados();

/* ------------------------------------------------------------------ *
 * Avisos flotantes
 *
 * catalogo.js dispara los CustomEvent "pirulito:aviso" y
 * "pirulito:regalo"; acá se convierten en algo visible.
 * ------------------------------------------------------------------ */

const toastStack = document.getElementById("toast-stack");
const giftOverlay = document.getElementById("gift-overlay");
const giftMonto = document.getElementById("gift-monto");
const giftTexto = document.getElementById("gift-texto");

function mostrarToast(texto, tipo = "ok") {
  if (!toastStack) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${tipo}`;
  toast.setAttribute("role", "status");
  toast.textContent = texto;
  toastStack.appendChild(toast);

  // La animación de entrada la hace el CSS; la removemos al terminar para
  // que quede solo el aviso de salida.
  setTimeout(() => toast.classList.add("is-leaving"), 4200);
  setTimeout(() => toast.remove(), 4700);
}

function mostrarRegalo({ texto, monto }) {
  if (giftMonto) giftMonto.textContent = formatearPrecio(monto);
  if (giftTexto) giftTexto.textContent = texto;
  if (giftOverlay) {
    giftOverlay.hidden = false;
    giftOverlay.classList.add("is-open");
  }
}

function cerrarRegalo() {
  if (!giftOverlay) return;
  giftOverlay.classList.remove("is-open");
  giftOverlay.hidden = true;
}

document.addEventListener("pirulito:aviso", (evento) => {
  mostrarToast(evento.detail.texto, evento.detail.tipo || "ok");
});

document.addEventListener("pirulito:regalo", (evento) => {
  mostrarRegalo(evento.detail);
  mostrarToast(evento.detail.texto, "regalo");
});

document.addEventListener("click", (evento) => {
  if (evento.target.closest("[data-gift-cerrar]")) cerrarRegalo();
  if (evento.target === giftOverlay) cerrarRegalo();
});

document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape") cerrarRegalo();
});

/* ------------------------------------------------------------------ *
 * Enlace de "Mi cuenta" en el header
 * ------------------------------------------------------------------ */

const navCuenta = document.querySelector("[data-nav-cuenta]");

function pintarNavCuenta() {
  if (!navCuenta) return;
  const usuario = obtenerUsuario();
  if (usuario) {
    navCuenta.textContent = `Hola, ${usuario.nombre.split(" ")[0]}`;
    navCuenta.href = "cuenta.html";
    navCuenta.classList.add("is-active-user");
  } else {
    navCuenta.textContent = "Mi cuenta";
    navCuenta.href = "cuenta.html?login=1";
    navCuenta.classList.remove("is-active-user");
  }
}

alCambiar(pintarNavCuenta);

/* ------------------------------------------------------------------ *
 * Arranque
 *
 * Primero se resuelve la sesión y después se pide el catálogo: así los
 * botones "Comprar" ya saben si hay que llevar al login.
 * ------------------------------------------------------------------ */

async function iniciar() {
  pintarNavCuenta();
  await initSesion();
  pintarNavCuenta();
  await cargarCatalogo();
  if (navCuenta) pintarNavCuenta();
}

iniciar();