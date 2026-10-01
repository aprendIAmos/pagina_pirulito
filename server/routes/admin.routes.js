/* ------------------------------------------------------------------ *
 * Rutas de administración
 *
 * Permiten cambiar la regla de acumulación (límite y monto de regalo)
 * sin tocar código ni redesplegar, y simular saldo para probar el
 * umbral sin llenar el historial de compras a mano.
 *
 * Hoy no hay pantalla que las use: el panel se retiró de la página de
 * cuenta. El backend queda en pie porque es la parte que, con Supabase,
 * va a escribir la regla en la base.
 * ------------------------------------------------------------------ */

import { Router } from "express";
import * as data from "../data/index.js";
import { requiereAdmin } from "../auth.js";
import { asyncHandler } from "../errors.js";

const router = Router();

router.use(requiereAdmin);

router.get(
  "/config",
  asyncHandler(async (_req, res) => {
    const config = await data.obtenerConfig();
    res.json({ config });
  }),
);

router.patch(
  "/config",
  asyncHandler(async (req, res) => {
    const { config, anterior } = await data.actualizarConfig(req.body || {});
    res.json({ config, anterior });
  }),
);

router.get(
  "/usuarios",
  asyncHandler(async (_req, res) => {
    const usuarios = await data.listarUsuarios();
    res.json({ usuarios });
  }),
);

router.post(
  "/simular",
  asyncHandler(async (req, res) => {
    const { usuario_id: usuarioId, monto } = req.body || {};
    const { usuario, regalo } = await data.simular(usuarioId, monto);
    res.json({ usuario, regalo });
  }),
);

export default router;
