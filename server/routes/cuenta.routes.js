/* ------------------------------------------------------------------ *
 * Rutas de la cuenta del cliente
 * ------------------------------------------------------------------ */

import { Router } from "express";
import * as data from "../data/index.js";
import { requiereSesion } from "../auth.js";
import { ApiError, asyncHandler } from "../errors.js";

const router = Router();

router.use(requiereSesion);

router.get(
  "/beneficios",
  asyncHandler(async (req, res) => {
    const beneficios = await data.listarBeneficios(req.usuario.id);
    res.json(beneficios);
  }),
);

router.get(
  "/historial",
  asyncHandler(async (req, res) => {
    const historial = await data.listarHistorial(req.usuario.id);
    res.json(historial);
  }),
);

router.post(
  "/cupones/:codigo/aplicar",
  asyncHandler(async (req, res) => {
    const codigo = req.params.codigo;
    if (!codigo) throw ApiError.badRequest("Falta el código del cupón.");

    const { canje, usuario } = await data.aplicarCupon(req.usuario.id, codigo);
    res.status(201).json({ canje, usuario });
  }),
);

export default router;
