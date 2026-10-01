/* ------------------------------------------------------------------ *
 * Rutas del catálogo
 * ------------------------------------------------------------------ */

import { Router } from "express";
import * as data from "../data/index.js";
import { asyncHandler } from "../errors.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const productos = await data.listarProductos();
    res.json({ productos });
  }),
);

export default router;
