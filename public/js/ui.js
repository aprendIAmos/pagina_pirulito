/* ------------------------------------------------------------------ *
 * UI compartida
 *
 * Menú móvil, avisos flotantes y el cartel de regalo. Es lo mismo que
 * hace js/app.js en el inicio, replicado acá para que cada página ande
 * sola sin depender del otro entrypoint.
 * ------------------------------------------------------------------ */

/* ---------------------------- Menú móvil ----------------------------- */

export function activarMenuMovil() {
  const menuToggle = document.querySelector(".menu-toggle");
  const primaryNav = document.getElementById("primary-nav");
  if (!menuToggle || !primaryNav) return;

  const cerrar = () => {
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Abrir menú");
    primaryNav.classList.remove("is-open");
  };

  menuToggle.addEventListener("click", () => {
    const abierto = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!abierto));
    menuToggle.setAttribute("aria-label", abierto ? "Abrir menú" : "Cerrar menú");
    primaryNav.classList.toggle("is-open", !abierto);
  });

  primaryNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", cerrar);
  });

  document.addEventListener("click", (event) => {
    if (
      primaryNav.classList.contains("is-open") &&
      !primaryNav.contains(event.target) &&
      !menuToggle.contains(event.target)
    ) {
      cerrar();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") cerrar();
  });
}

/* ------------------------------ Avisos ------------------------------- */

export function mostrarToast(texto, tipo = "ok") {
  const stack = document.getElementById("toast-stack");
  if (!stack) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${tipo}`;
  toast.setAttribute("role", "status");
  toast.textContent = texto;
  stack.appendChild(toast);

  setTimeout(() => toast.classList.add("is-leaving"), 4200);
  setTimeout(() => toast.remove(), 4700);
}

/* ----------------------------- Auxiliares ---------------------------- */

export function escapar(texto) {
  return String(texto ?? "").replace(/[&<>"']/g, (caracter) => {
    switch (caracter) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

export function pintarYear() {
  const year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();
}
