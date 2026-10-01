/* ------------------------------------------------------------------ *
 * Capa de datos
 *
 * Todo el server habla con la base a través de este módulo. Hoy resuelve
 * a la implementación en memoria; cuando esté Supabase, se cambia
 * DATA_PROVIDER=supabase y se agrega supabase.js con los mismos exports.
 * Las rutas no necesitan enterarse de nada.
 * ------------------------------------------------------------------ */

import { config } from "../config.js";
import * as mock from "./mock.js";

const proveedores = {
  mock,
  // supabase: import("./supabase.js"),
};

const activo = proveedores[config.dataProvider];

if (!activo) {
  throw new Error(
    `No hay implementación para DATA_PROVIDER="${config.dataProvider}".`,
  );
}

console.log(`[data] proveedor: ${config.dataProvider}`);

export const dataProvider = config.dataProvider;
export const {
  buscarUsuarioPorNombre,
  buscarUsuarioPorId,
  verificarPassword,
  listarProductos,
  buscarProducto,
  registrarCompra,
  obtenerResumen,
  listarBeneficios,
  listarHistorial,
  aplicarCupon,
  obtenerConfig,
  actualizarConfig,
  simular,
  listarUsuarios,
  reiniciarDatos,
} = activo;
