/* ------------------------------------------------------------------ *
 * Página de cuenta
 *
 * Si no hay sesión muestra el login; si la hay, pinta saldos,
 * beneficios, historial y el panel de admin para el equipo.
 * ------------------------------------------------------------------ */

import { api, formatearPrecio, formatearFecha } from "./api.js";
import { initSesion, login, logout, refrescar, alCambiar, obtenerUsuario, esAdmin } from "./sesion.js";
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

  const adminPanel = document.getElementById("admin-panel");
  if (adminPanel) adminPanel.hidden = !esAdmin();

  try {
    const historial = await api.cuenta.historial();
    pintarHistorial(historial);
  } catch (error) {
    console.warn("[cuenta] no se pudo cargar el historial", error);
  }

  if (esAdmin()) await cargarAdmin();
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

/* -------------------------------- admin ------------------------------- */

// cargarAdmin() se vuelve a llamar cada vez que se repinta el panel, así
// que los listeners se registran una sola vez.
let adminConectado = false;

async function cargarAdmin() {
  const form = document.getElementById("admin-config-form");
  const selectUsuarios = document.getElementById("admin-usuario");

  try {
    const { config } = await api.admin.config();
    const limite = document.getElementById("admin-limite");
    const regalo = document.getElementById("admin-regalo");
    const activa = document.getElementById("admin-activa");
    const reinicia = document.getElementById("admin-reinicia");

    if (limite) limite.value = config.limite;
    if (regalo) regalo.value = config.montoRegalo;
    if (activa) activa.checked = config.activa;
    if (reinicia) reinicia.checked = config.reiniciarCiclo;

    const { usuarios } = await api.admin.usuarios();
    if (selectUsuarios) {
      selectUsuarios.innerHTML = usuarios
        .map(
          (u) =>
            `<option value="${escapar(u.id)}">${escapar(u.nombre)} · ${formatearPrecio(
              u.cicloAcumulado,
            )}</option>`,
        )
        .join("");
    }
  } catch (error) {
    console.warn("[admin] no se pudo cargar la config", error);
    return;
  }

  if (adminConectado) return;
  adminConectado = true;

  if (form) {
    form.addEventListener("submit", async (evento) => {
      evento.preventDefault();
      const status = document.getElementById("admin-status");
      const datos = new FormData(form);

      try {
        const { config } = await api.admin.actualizarConfig({
          limite: Number(datos.get("limite")),
          montoRegalo: Number(datos.get("montoRegalo")),
          activa: datos.get("activa") === "on",
          reiniciarCiclo: datos.get("reiniciarCiclo") === "on",
        });
        if (status) {
          status.hidden = false;
          status.textContent = `Guardado: ${formatearPrecio(config.limite)} → ${formatearPrecio(
            config.montoRegalo,
          )}.`;
        }
        mostrarToast("Regla actualizada para todos.", "ok");
      } catch (error) {
        if (status) {
          status.hidden = false;
          status.textContent = error.message;
        }
      }
    });
  }

  const simularForm = document.getElementById("admin-simular-form");
  simularForm?.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const datos = new FormData(simularForm);
    const status = document.getElementById("admin-status");

    try {
      const { usuario, regalo } = await api.admin.simular(
        String(datos.get("usuarioId")),
        Number(datos.get("monto")),
      );
      const texto = regalo
        ? `Sumaste y el cliente ganó ${formatearPrecio(regalo.monto)}.`
        : `Ciclo ahora en ${formatearPrecio(usuario.cicloAcumulado)}.`;
      if (status) {
        status.hidden = false;
        status.textContent = texto;
      }
      mostrarToast(texto, "ok");
      await refrescar();
      await pintarCuenta();
    } catch (error) {
      if (status) {
        status.hidden = false;
        status.textContent = error.message;
      }
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
