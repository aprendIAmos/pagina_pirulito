/* ------------------------------------------------------------------ *
 * Rutas de administración
 *
 * Permiten cambiar la regla de acumulación (límite y monto de regalo)
 * sin tocar código ni redesplegar, y simular saldo para probar el
 * umbral sin llenar el historial de compras a mano.
 * ------------------------------------------------------------------ */

import { Router } from "express";
import * as data from "../data/index.js";
import { dataProvider } from "../data/index.js";
import { config } from "../config.js";
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

/**
 * Vuelve los datos mock a su estado inicial. Solo existe en desarrollo
 * para poder repetir las pruebas sin reiniciar el proceso; con Supabase
 * esto no aplica porque los datos viven en la base.
 */
if (!config.isProduction && dataProvider === "mock") {
  router.post(
    "/reiniciar-datos",
    asyncHandler(async (_req, res) => {
      const resultado = await data.reiniciarDatos();
      res.json(resultado);
    }),
  );
}

export default router;
