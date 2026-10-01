/* ------------------------------------------------------------------ *
 * Página de cuenta
 *
 * Si no hay sesión muestra el login; si la hay, pinta saldos,
 * beneficios, historial y el panel de admin para el equipo.
 * ------------------------------------------------------------------ */

import { api, formatearPrecio, formatearFecha } from "./api.js";
import { initSesion, login, logout, refrescar, alCambiar, obtenerUsuario } from "./sesion.js";
import { activarMenuMovil, mostrarToast, escapar, pintarYear } from "./ui.js";

const DEMO_PASSWORD = "pirulito123";

const loginPanel = document.getElementById("login-panel");
const cuentaPanel = document.getElementById("cuenta-panel");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const loginSubmit = document.getElementById("login-submit");
const logoutButton = document.getElementById("logout-button");

/* -------------------------------- login ------------------------------- */

function mostrarError(elemento, texto) {
  if (!elemento) return;
  if (!texto) {
    elemento.hidden = true;
    elemento.textContent = "";
    return;
  }
  elemento.hidden = false;
  elemento.textContent = texto;
}

async function enviarLogin(evento) {
  evento.preventDefault();
  mostrarError(loginError, "");

  const datos = new FormData(loginForm);
  const usuario = String(datos.get("usuario") || "").trim();
  const password = String(datos.get("password") || "");

  if (!usuario || !password) {
    mostrarError(loginError, "Escribí tu usuario y tu contraseña.");
    return;
  }

  loginSubmit.disabled = true;
  const textoOriginal = loginSubmit.querySelector("span")?.textContent;
  const etiqueta = loginSubmit.querySelector("span");
  if (etiqueta) etiqueta.textContent = "Entrando…";

  try {
    const resumen = await login(usuario, password);
    mostrarToast(`¡Hola de nuevo, ${resumen.nombre.split(" ")[0]}!`, "ok");
    await pintarCuenta();
  } catch (error) {
    mostrarError(loginError, error.message);
  } finally {
    loginSubmit.disabled = false;
    if (etiqueta) etiqueta.textContent = textoOriginal;
  }
}

function conectarDemo() {
  document.querySelectorAll("[data-demo]").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.getElementById("login-usuario").value = chip.dataset.demo;
      document.getElementById("login-password").value = DEMO_PASSWORD;
      document.getElementById("login-password").focus();
    });
  });
}

function conectarLogout() {
  if (!logoutButton) return;
  logoutButton.addEventListener("click", async () => {
    await logout();
    mostrarToast("Cerramos sesión. Hasta la próxima.", "ok");
    mostrarLogin();
  });
}

/* ------------------------------- pintado ------------------------------ */

function textoO(elemento, valor) {
  if (elemento) elemento.textContent = valor;
}

function pintarVacio(contenedor, mensaje) {
  if (!contenedor) return;
  contenedor.innerHTML = `<p class="lista-vacia">${escapar(mensaje)}</p>`;
}

function pintarSaldos(usuario) {
  textoO(document.getElementById("cuenta-nombre"), usuario.nombre.split(" ")[0]);
  textoO(document.getElementById("cuenta-email"), usuario.email);
  textoO(document.getElementById("saldo-favor"), formatearPrecio(usuario.saldoFavor));
  textoO(document.getElementById("saldo-ciclo"), formatearPrecio(usuario.cicloAcumulado));
  textoO(document.getElementById("saldo-total"), String(usuario.totalCompras));

  const regla = usuario.regla;
  const barra = document.getElementById("progreso-bar");
  if (barra) barra.style.width = `${regla.progresoPct}%`;

  const progreso = document.getElementById("saldo-progreso-texto");
  if (progreso) {
    progreso.textContent = regla.completo
      ? "¡Ciclo completo!"
      : `Te faltan ${formatearPrecio(regla.faltan)} para ganar ${formatearPrecio(regla.montoRegalo)}.`;
  }

  textoO(document.getElementById("saldo-regla"), regla.descripcion);
}

function pintarPromos(promos) {
  const contenedor = document.getElementById("lista-promos");
  if (!contenedor) return;
  if (!promos.length) return pintarVacio(contenedor, "No hay promos activas ahora.");

  contenedor.innerHTML = promos
    .map(
      (promo) => `
      <article class="beneficio">
        <span class="beneficio-tag">${
          promo.tipo === "porcentaje" ? `${promo.valor}% off` : formatearPrecio(promo.valor)
        }</span>
        <h4>${escapar(promo.titulo)}</h4>
        <p>${escapar(promo.descripcion)}</p>
        <small>Vigente hasta el ${formatearFecha(promo.vigenciaHasta)}</small>
      </article>`,
    )
    .join("");
}

function pintarDescuentos(descuentos) {
  const contenedor = document.getElementById("lista-descuentos");
  if (!contenedor) return;
  if (!descuentos.length) return pintarVacio(contenedor, "No hay descuentos cargados.");

  contenedor.innerHTML = descuentos
    .map(
      (descuento) => `
      <article class="beneficio">
        <span class="beneficio-tag">${
          descuento.tipo === "porcentaje"
            ? `${descuento.valor}% off`
            : descuento.montoBeneficio === "envio_gratis"
              ? "Envío gratis"
              : formatearPrecio(descuento.valor)
        }</span>
        <h4>${escapar(descuento.titulo)}</h4>
        <p>${escapar(descuento.descripcion)}</p>
        <small>${
          descuento.minCompra > 0
            ? `Desde ${formatearPrecio(descuento.minCompra)}`
            : "Sin mínimo"
        }</small>
      </article>`,
    )
    .join("");
}

function pintarCupones(cupones) {
  const contenedor = document.getElementById("lista-cupones");
  if (!contenedor) return;
  if (!cupones.length) return pintarVacio(contenedor, "No tenés cupones disponibles.");

  contenedor.innerHTML = cupones
    .map(
      (cupon) => `
      <article class="beneficio beneficio-cupon${cupon.usado ? " is-usado" : ""}">
        <span class="beneficio-tag">${escapar(cupon.codigo)}</span>
        <h4>${escapar(cupon.titulo)}</h4>
        <p>${escapar(cupon.descripcion)}</p>
        <small>${
          cupon.usado
            ? "Ya lo usaste"
            : cupon.minCompra > 0
              ? `Desde ${formatearPrecio(cupon.minCompra)}`
              : "Sin mínimo"
        }</small>
      </article>`,
    )
    .join("");
}

function pintarHistorial({ compras, regalos, canjes }) {
  const listaCompras = document.getElementById("lista-compras");
  if (listaCompras) {
    if (!compras.length) pintarVacio(listaCompras, "Todavía no compraste nada.");
    else {
      listaCompras.innerHTML = compras
        .map(
          (compra) => `
          <div class="historial-item">
            <span>
              <strong>${escapar(compra.productoNombre)}</strong>
              <small>${formatearFecha(compra.creadaEn)} · ${compra.cantidad} ${
                compra.cantidad > 1 ? "porciones" : "porción"
              }</small>
            </span>
            <b>${formatearPrecio(compra.monto)}</b>
          </div>`,
        )
        .join("");
    }
  }

  const listaRegalos = document.getElementById("lista-regalos");
  if (listaRegalos) {
    if (!regalos.length) pintarVacio(listaRegalos, "Todavía no llegaste al límite.");
    else {
      listaRegalos.innerHTML = regalos
        .map(
          (regalo) => `
          <div class="historial-item">
            <span>
              <strong>Regalo por ${formatearPrecio(regalo.limiteAlMomento)}</strong>
              <small>${formatearFecha(regalo.creadoEn)}${
                regalo.simulado ? " · simulado" : ""
              }</small>
            </span>
            <b class="is-positive">+${formatearPrecio(regalo.monto)}</b>
          </div>`,
        )
        .join("");
    }
  }

  const listaCanjes = document.getElementById("lista-canjes");
  if (listaCanjes) {
    if (!canjes.length) pintarVacio(listaCanjes, "No usaste cupones todavía.");
    else {
      listaCanjes.innerHTML = canjes
        .map(
          (canje) => `
          <div class="historial-item">
            <span>
              <strong>${escapar(canje.codigo)} · ${escapar(canje.titulo)}</strong>
              <small>${formatearFecha(canje.creadoEn)}</small>
            </span>
            <b class="is-positive">aplicado</b>
          </div>`,
        )
        .join("");
    }
  }
}

async function pintarCuenta() {
  const usuario = obtenerUsuario();
  if (!usuario) {
    mostrarLogin();
    return;
  }

  if (loginPanel) loginPanel.hidden = true;
  if (cuentaPanel) cuentaPanel.hidden = false;

  pintarSaldos(usuario);
  pintarPromos(usuario.beneficios?.promos || []);
  pintarDescuentos(usuario.beneficios?.descuentos || []);
  pintarCupones(usuario.beneficios?.cupones || []);

  try {
    const historial = await api.cuenta.historial();
    pintarHistorial(historial);
  } catch (error) {
    console.warn("[cuenta] no se pudo cargar el historial", error);
  }
}

function mostrarLogin() {
  if (loginPanel) loginPanel.hidden = false;
  if (cuentaPanel) cuentaPanel.hidden = true;
}

/* -------------------------------- cupón ------------------------------- */

function conectarCupon() {
  const form = document.getElementById("cupon-form");
  const error = document.getElementById("cupon-error");
  if (!form) return;

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    mostrarError(error, "");

    const codigo = String(new FormData(form).get("codigo") || "").trim();
    if (!codigo) {
      mostrarError(error, "Escribí el código del cupón.");
      return;
    }

    try {
      const { canje } = await api.cuenta.aplicarCupon(codigo);
      mostrarToast(`Cupón ${canje.codigo} aplicado.`, "ok");
      form.reset();
      await refrescar();
      await pintarCuenta();
    } catch (err) {
      mostrarError(error, err.message);
    }
  });
}

/* ------------------------------- arranque ----------------------------- */

function queriendoLogin() {
  const params = new URLSearchParams(window.location.search);
  return params.get("login") === "1";
}

async function iniciar() {
  activarMenuMovil();
  pintarYear();
  conectarDemo();
  conectarLogout();
  conectarCupon();

  if (loginForm) loginForm.addEventListener("submit", enviarLogin);

  await initSesion();
  await pintarCuenta();

  // Si llegaron desde "Comprar" sin sesión, dejamos el login a la vista.
  if (!obtenerUsuario() && queriendoLogin()) {
    document.getElementById("login-usuario")?.focus();
  }

  alCambiar(() => {
    pintarCuenta();
  });
}

iniciar();
