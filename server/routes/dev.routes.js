/* ------------------------------------------------------------------ *
 * Rutas de desarrollo
 *
 * Solo se montan cuando NODE_ENV !== "production". Sirven para trabajar
 * con los datos mock en memoria sin tener que reiniciar el proceso a
 * mano: las pruebas las usan para partir del estado inicial.
 *
 * Con Supabase no hace falta: los datos viven en la base.
 * ------------------------------------------------------------------ */

import { Router } from "express";
import * as data from "../data/index.js";
import { dataProvider } from "../data/index.js";
import { asyncHandler } from "../errors.js";

const router = Router();

/** Vuelve los datos mock a su semilla, como si recién arrancáramos. */
router.post(
  "/reiniciar",
  asyncHandler(async (_req, res) => {
    // Con Supabase los datos están en la base y no hay nada que resetear.
    if (typeof data.reiniciarDatos !== "function") {
      return res.status(501).json({
        error: `El proveedor "${dataProvider}" no tiene datos en memoria para reiniciar.`,
      });
    }

    const resultado = await data.reiniciarDatos();
    return res.json({ ...resultado, dataProvider });
  }),
);

export default router;
