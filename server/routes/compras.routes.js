/* ------------------------------------------------------------------ *
 * Rutas de compras
 *
 * El botón "Comprar" de cada producto pega acá. El precio lo resuelve
 * el backend desde el catálogo: el cliente solo manda qué producto y
 * cuántas porciones, nunca un monto.
 * ------------------------------------------------------------------ */

import { Router } from "express";
import * as data from "../data/index.js";
import { requiereSesion } from "../auth.js";
import { asyncHandler } from "../errors.js";

const router = Router();

router.post(
  "/",
  requiereSesion,
  asyncHandler(async (req, res) => {
    const { producto_id: productoId, cantidad } = req.body || {};
    const resultado = await data.registrarCompra({
      usuarioId: req.usuario.id,
      productoId,
      cantidad,
    });

    res.status(201).json({
      compra: resultado.compra,
      usuario: resultado.usuario,
      regalo: resultado.regalo
        ? {
            monto: resultado.regalo.monto,
            limiteAlMomento: resultado.regalo.limiteAlMomento,
          }
        : null,
      mensaje: resultado.regalo
        ? `¡Llegaste a $${resultado.regalo.limiteAlMomento.toLocaleString("es-AR")}! Te acreditamos $${resultado.regalo.monto.toLocaleString("es-AR")} de saldo a favor.`
        : `Compra registrada por $${resultado.compra.monto.toLocaleString("es-AR")}.`,
    });
  }),
);

export default router;
