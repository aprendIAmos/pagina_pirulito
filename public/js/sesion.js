/* ------------------------------------------------------------------ *
 * Sesión en el frontend
 *
 * Guarda en memoria quién está logueado y lo mantiene sincronizado con
 * el backend. El token nunca pasa por acá: viaja en una cookie httpOnly
 * que el browser manda solo.
 * ------------------------------------------------------------------ */

import { api } from "./api.js";

const OYENTE = "pirulito:sesion-cambiada";
const CLAVE_CACHE = "pirulito:resumen";

let usuario = null;
let cargando = false;
const suscriptores = new Set();

function avisar() {
  const estado = { usuario, cargando };
  suscriptores.forEach((fn) => {
    try {
      fn(estado);
    } catch (error) {
      console.error("[sesion] suscriptor falló", error);
    }
  });
  document.dispatchEvent(new CustomEvent(OYENTE, { detail: estado }));
}

function cachear(resumen) {
  try {
    if (resumen) sessionStorage.setItem(CLAVE_CACHE, JSON.stringify(resumen));
    else sessionStorage.removeItem(CLAVE_CACHE);
  } catch {
    // Modo privado o storage deshabilitado: seguimos igual.
  }
}

function leerCache() {
  try {
    const crudo = sessionStorage.getItem(CLAVE_CACHE);
    return crudo ? JSON.parse(crudo) : null;
  } catch {
    return null;
  }
}

/** Trae el estado real del servidor. Cachea para pintar rápido al cargar. */
export async function initSesion() {
  cargando = true;
  const cacheado = leerCache();
  if (cacheado) {
    usuario = cacheado;
    avisar();
  }
  avisar();

  try {
    const { usuario: real } = await api.auth.yo();
    usuario = real;
    cachear(real);
  } catch (error) {
    // 401 es lo normal si no hay sesión abierta.
    if (error.status !== 401) console.warn("[sesion]", error.message);
    usuario = null;
    cachear(null);
  } finally {
    cargando = false;
    avisar();
  }

  return usuario;
}

export async function login(usuarioIngresado, password) {
  const { usuario: resumen } = await api.auth.login(usuarioIngresado, password);
  usuario = resumen;
  cachear(resumen);
  avisar();
  return resumen;
}

export async function logout() {
  try {
    await api.auth.logout();
  } finally {
    usuario = null;
    cachear(null);
    avisar();
  }
}

/** Refresca saldos después de una compra o un canje. */
export async function refrescar() {
  try {
    const { usuario: resumen } = await api.auth.yo();
    usuario = resumen;
    cachear(resumen);
    avisar();
    return resumen;
  } catch (error) {
    if (error.status === 401) {
      usuario = null;
      cachear(null);
      avisar();
    }
    return null;
  }
}

export function obtenerUsuario() {
  return usuario;
}

export function estaLogueado() {
  return Boolean(usuario);
}

export function esAdmin() {
  return usuario?.rol === "admin";
}

export function alCambiar(fn) {
  suscriptores.add(fn);
  return () => suscriptores.delete(fn);
}
