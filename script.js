document.documentElement.classList.add("js");

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
const productLinks = document.querySelectorAll("[data-product]");
productLinks.forEach((link) => {
  const product = link.dataset.product;
  link.href = buildWhatsAppUrl(
    `¡Hola! Quiero pedir ${product} de Pirulito 🍰 ¿Me contás disponibilidad?`,
  );
});

/* ------------------------------------------------------------------ *
 * Precios
 * ------------------------------------------------------------------ */

const prices = document.querySelectorAll("[data-price]");
const priceFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});
prices.forEach((price) => {
  price.textContent = priceFormatter.format(Number(price.dataset.price));
});

/* ------------------------------------------------------------------ *
 * Menú móvil
 * ------------------------------------------------------------------ */

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
const productCards = document.querySelectorAll(".product-card[data-category]");
const filterStatus = document.getElementById("filter-status");

function padCount(count) {
  return String(count).padStart(2, "0");
}

function updateFilterCounts() {
  filterButtons.forEach((button) => {
    const filter = button.dataset.filter;
    const count =
      filter === "all"
        ? productCards.length
        : document.querySelectorAll(
            `.product-card[data-category="${filter}"]`,
          ).length;
    const counter = button.querySelector("span");
    if (counter) counter.textContent = padCount(count);
  });
}

function getFilterLabel(filter) {
  const button = document.querySelector(`[data-filter="${filter}"]`);
  if (!button) return "Todos";
  return button.textContent.replace(/[0-9]/g, "").trim();
}

function applyFilter(filter) {
  productCards.forEach((card) => {
    const shouldShow = filter === "all" || card.dataset.category === filter;
    card.classList.toggle("is-hidden", !shouldShow);
  });

  filterButtons.forEach((button) => {
    const isActive = button.dataset.filter === filter;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  if (filterStatus) {
    filterStatus.textContent = `Mostrando: ${getFilterLabel(filter)}.`;
  }
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => applyFilter(button.dataset.filter));
});

updateFilterCounts();

/* ------------------------------------------------------------------ *
 * Imágenes: respaldo si una foto no carga
 * ------------------------------------------------------------------ */

document.querySelectorAll("img").forEach((img) => {
  img.addEventListener(
    "error",
    () => img.classList.add("is-missing"),
    { once: true },
  );
});

/* ------------------------------------------------------------------ *
 * Año del footer
 * ------------------------------------------------------------------ */

const year = document.querySelector("[data-year]");
if (year) year.textContent = new Date().getFullYear();

/* ------------------------------------------------------------------ *
 * Animaciones de aparición
 * ------------------------------------------------------------------ */

const revealItems = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12 },
  );
  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}