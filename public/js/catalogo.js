/* ------------------------------------------------------------------ *
 * Catálogo
 *
 * Pide los productos a /api/productos y arma las tarjetas. El precio y el
 * id salen del backend, nunca del HTML. El botón Comprar llama a
 * /api/compras; el enlace de WhatsApp se mantiene como estaba.
 * ------------------------------------------------------------------ */

import { api, formatearPrecio } from "./api.js";
import { estaLogueado, refrescar, alCambiar } from "./sesion.js";

const WHATSAPP_NUMBER = "5491138569142";
const grid = document.getElementById("catalogo-grid");
const estadoVacio = document.getElementById("catalogo-vacio");

let productos = [];
let comprando = null;

function mensajeWhatsApp(producto) {
  return `¡Hola! Quiero pedir ${producto} de Pirulito 🍰 ¿Me contás disponibilidad?`;
}

function crearTarjeta(producto, indice) {
  const articulo = document.createElement("article");
  articulo.className = "product-card reveal";
  articulo.dataset.category = producto.categoria;
  articulo.dataset.productId = producto.id;
  // Escalonamos la aparición de a una tarjeta, en un ciclo de cuatro.
  const retardo = (indice % 4) + 1;
  if (retardo > 1) articulo.classList.add(`reveal-delay-${retardo - 1}`);

  const badge = producto.badge
    ? `<span class="product-badge${producto.badgeLight ? " product-badge-light" : ""}">${escapar(producto.badge)}</span>`
    : "";
  const emoji = producto.emoji
    ? `<span class="product-emoji" aria-hidden="true">${escapar(producto.emoji)}</span>`
    : "";

  articulo.innerHTML = `
    <div class="product-image">
      <img src="${escapar(producto.imagen)}" alt="${escapar(producto.nombre)} de Pirulito" loading="lazy" />
      ${badge}
      ${emoji}
    </div>
    <div class="product-body">
      <div class="product-meta">
        <span>${escapar(producto.categoriaLabel)}</span>
        <span>Porción individual</span>
      </div>
      <h3>${escapar(producto.nombre)}</h3>
      <p>${escapar(producto.descripcion)}</p>
      <div class="product-footer">
        <span class="product-price">${formatearPrecio(producto.precio)}</span>
        <div class="product-actions">
          <a
            class="product-order"
            href="https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensajeWhatsApp(producto.nombre))}"
            target="_blank"
            rel="noreferrer"
            aria-label="Pedir ${escapar(producto.nombre)} por WhatsApp"
          >WhatsApp <span aria-hidden="true">↗</span></a>
          <button
            class="product-buy"
            type="button"
            data-comprar="${escapar(producto.id)}"
            aria-label="Comprar ${escapar(producto.nombre)}"
          >Comprar</button>
        </div>
      </div>
    </div>
  `;

  return articulo;
}

function escapar(texto) {
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

function marcarEstadoVacio() {
  if (!estadoVacio) return;
  estadoVacio.hidden = productos.length > 0;
}

function observarTarjetas() {
  // js/app.js ya tiene un observador para los .reveal del HTML original;
  // las tarjetas nuevas se registran acá para que aparezcan al hacer scroll.
  const tarjetas = grid.querySelectorAll(".reveal:not([data-revealado])");
  if (!("IntersectionObserver" in window)) {
    tarjetas.forEach((t) => t.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entradas, obs) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        entrada.target.classList.add("is-visible");
        obs.unobserve(entrada.target);
      });
    },
    { threshold: 0.12 },
  );

  tarjetas.forEach((t) => {
    t.dataset.revealado = "1";
    observer.observe(t);
  });
}

async function comprar(boton, productoId) {
  if (comprando) return;

  if (!estaLogueado()) {
    const destino = `cuenta.html?login=1&volver=${encodeURIComponent(
      window.location.pathname + window.location.hash,
    )}`;
    window.location.href = destino;
    return;
  }

  comprando = productoId;
  const textoOriginal = boton.textContent;
  boton.disabled = true;
  boton.classList.add("is-loading");
  boton.textContent = "Comprando…";

  try {
    const resultado = await api.compras.crear(productoId, 1);
    if (resultado.regalo) {
      mostrarRegalo(resultado.mensaje, resultado.regalo.monto);
    } else {
      mostrarAviso(resultado.mensaje, "ok");
    }
    await refrescar();
  } catch (error) {
    if (error.status === 401) {
      mostrarAviso("Tu sesión venció. Volvé a iniciar sesión.", "error");
      setTimeout(() => window.location.reload(), 1200);
    } else {
      mostrarAviso(error.message, "error");
    }
  } finally {
    comprando = null;
    boton.disabled = false;
    boton.classList.remove("is-loading");
    boton.textContent = textoOriginal;
  }
}

function mostrarAviso(texto, tipo = "ok") {
  document.dispatchEvent(
    new CustomEvent("pirulito:aviso", { detail: { texto, tipo } }),
  );
}

function mostrarRegalo(texto, monto) {
  document.dispatchEvent(
    new CustomEvent("pirulito:regalo", { detail: { texto, monto } }),
  );
}

function conectarBotones() {
  grid.querySelectorAll("[data-comprar]").forEach((boton) => {
    if (boton.dataset.comprarListo) return;
    boton.dataset.comprarListo = "1";
    boton.addEventListener("click", () => comprar(boton, boton.dataset.comprar));
  });
}

function actualizarEstadoCompra() {
  // Si no hay sesión, el botón lo lleva a iniciar sesión igual, pero lo
  // dejamos más claro con un título.
  const sesion = estaLogueado();
  grid.querySelectorAll("[data-comprar]").forEach((boton) => {
    boton.title = sesion ? "Sumar a tu acumulado" : "Iniciá sesión para comprar";
  });
}

export async function cargarCatalogo() {
  try {
    const { productos: lista } = await api.productos();
    productos = lista;

    grid.replaceChildren(...lista.map(crearTarjeta));
    conectarBotones();
    marcarEstadoVacio();
    observarTarjetas();
    actualizarEstadoCompra();

    document.dispatchEvent(new CustomEvent("pirulito:catalogo-listo"));
  } catch (error) {
    grid.replaceChildren();
    marcarEstadoVacio();
    if (estadoVacio) {
      estadoVacio.innerHTML = `<strong>No pudimos cargar el catálogo.</strong><span>${escapar(error.message)}</span>`;
    }
  }
}

export function recargarCatalogo() {
  return cargarCatalogo();
}

alCambiar(actualizarEstadoCompra);
actualizarEstadoCompra();
