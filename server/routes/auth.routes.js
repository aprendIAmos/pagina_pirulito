/* ------------------------------------------------------------------ *
 * Rutas de autenticación
 * ------------------------------------------------------------------ */

import { Router } from "express";
import * as data from "../data/index.js";
import { emitirSesion, limpiarSesion, requiereSesion } from "../auth.js";
import { ApiError, asyncHandler } from "../errors.js";

const router = Router();

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const usuario = String(req.body?.usuario || "").trim();
    const password = String(req.body?.password || "");

    if (!usuario || !password) {
      throw ApiError.badRequest("Escribí tu usuario y tu contraseña.");
    }

    const encontrado = await data.buscarUsuarioPorNombre(usuario);
    const passwordOk = await data.verificarPassword(encontrado, password);

    // Mismo mensaje en los dos casos para no revelar qué usuarios existen.
    if (!encontrado || !passwordOk) {
      throw ApiError.noAutorizado("Usuario o contraseña incorrectos.");
    }
    if (!encontrado.activo) {
      throw ApiError.prohibido("Tu cuenta está desactivada. Escribinos y lo vemos.");
    }

    emitirSesion(res, encontrado);
    const resumen = await data.obtenerResumen(encontrado.id);
    res.json({ usuario: resumen });
  }),
);

router.post(
  "/logout",
  asyncHandler(async (_req, res) => {
    limpiarSesion(res);
    res.json({ ok: true });
  }),
);

router.get(
  "/yo",
  requiereSesion,
  asyncHandler(async (req, res) => {
    const resumen = await data.obtenerResumen(req.usuario.id);
    res.json({ usuario: resumen });
  }),
);

export default router;
