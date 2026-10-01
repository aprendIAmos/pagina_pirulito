/* ------------------------------------------------------------------ *
 * Autenticación
 *
 * Sesión con JWT en cookie httpOnly: el frontend nunca toca el token.
 * El middleware `requiereSesion` deja req.usuario con los datos del
 * cliente y `requiereAdmin` agrega la validación de rol.
 * ------------------------------------------------------------------ */

import jwt from "jsonwebtoken";
import { config } from "./config.js";
import { ApiError } from "./errors.js";
import * as data from "./data/index.js";

const COOKIE_BASE = {
  httpOnly: true,
  sameSite: "lax",
  secure: config.isProduction,
  path: "/",
};

export function emitirSesion(res, usuario) {
  const token = jwt.sign(
    { sub: usuario.id, usuario: usuario.usuario, rol: usuario.rol },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn },
  );

  res.cookie(config.cookieName, token, {
    ...COOKIE_BASE,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return token;
}

export function limpiarSesion(res) {
  res.clearCookie(config.cookieName, { ...COOKIE_BASE });
}

/** Lee el token de la cookie o del header, para clientes no navegador. */
function leerToken(req) {
  const deCookie = req.cookies?.[config.cookieName];
  if (deCookie) return deCookie;

  const header = req.get("authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7).trim();

  return null;
}

/** Adjunta req.usuario si hay sesión válida. No bloquea si no hay. */
export async function cargarSesion(req, _res, next) {
  const token = leerToken(req);
  if (!token) return next();

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const usuario = await data.buscarUsuarioPorId(payload.sub);
    if (usuario && usuario.activo) req.usuario = usuario;
  } catch {
    // Token vencido o con firma inválida: se ignora y sigue como anónimo.
  }

  return next();
}

export async function requiereSesion(req, _res, next) {
  if (!req.usuario) return next(ApiError.noAutorizado());
  return next();
}

export function requiereAdmin(req, _res, next) {
  if (!req.usuario) return next(ApiError.noAutorizado());
  if (req.usuario.rol !== "admin") {
    return next(ApiError.prohibido("Esta sección es solo para el equipo de Pirulito."));
  }
  return next();
}
