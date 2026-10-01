/* ------------------------------------------------------------------ *
 * Datos mock (en memoria)
 *
 * Implementa la interfaz que el resto del server consume. Cuando se
 * conecte Supabase, este archivo se reemplaza por supabase.js con los
 * mismos exports y ninguna otra ruta cambia.
 *
 * Ojo: los datos viven en memoria, se pierden al reiniciar el server.
 * ------------------------------------------------------------------ */

import bcrypt from "bcryptjs";
import { usuarios as semillaUsuarios } from "../mock/usuarios.js";
import { productos as catalogo } from "../mock/productos.js";
import { acumulacion, evaluarRegla } from "../mock/config.js";
import { ApiError } from "../errors.js";

// Copia profunda de la semilla para no mutar el módulo importado.
const estado = {
  usuarios: structuredClone(semillaUsuarios),
  productos: structuredClone(catalogo),
  config: { ...acumulacion },
  compras: [],
  regalos: [],
  canjes: [],
  secuencia: 1,
};

function proximoId(prefijo) {
  estado.secuencia += 1;
  return `${prefijo}_${Date.now().toString(36)}${estado.secuencia}`;
}

function esVigente(desde, hasta) {
  const ahora = new Date();
  if (desde && new Date(desde) > ahora) return false;
  if (hasta && new Date(hasta) < ahora) return false;
  return true;
}

function validar(preferido, nombre, { requerido = false } = {}) {
  if (preferido) return String(preferido).trim();
  if (requerido) throw ApiError.badRequest(`Falta ${nombre} en el pedido.`);
  return null;
}

/* ------------------------------ usuarios ----------------------------- */

export async function buscarUsuarioPorNombre(usuario) {
  const limpio = String(usuario || "").trim().toLowerCase();
  if (!limpio) return null;
  return estado.usuarios.find((u) => u.usuario.toLowerCase() === limpio) || null;
}

export async function buscarUsuarioPorId(id) {
  return estado.usuarios.find((u) => u.id === id) || null;
}

export async function verificarPassword(usuario, password) {
  if (!usuario || typeof password !== "string" || !password) return false;
  return bcrypt.compare(password, usuario.passwordHash);
}

function resumenUsuario(usuario) {
  const { limite, montoRegalo } = estado.config;
  const faltan = Math.max(0, limite - usuario.cicloAcumulado);
  return {
    id: usuario.id,
    usuario: usuario.usuario,
    nombre: usuario.nombre,
    email: usuario.email,
    telefono: usuario.telefono,
    rol: usuario.rol,
    cicloAcumulado: usuario.cicloAcumulado,
    saldoFavor: usuario.saldoFavor,
    totalCompras: usuario.totalCompras || 0,
    regla: {
      activa: estado.config.activa,
      limite,
      montoRegalo,
      reiniciarCiclo: estado.config.reiniciarCiclo,
      descripcion: estado.config.descripcion,
      faltan,
      progresoPct:
        limite > 0
          ? Math.min(100, Math.round((usuario.cicloAcumulado / limite) * 100))
          : 0,
      completo: limite > 0 && usuario.cicloAcumulado >= limite,
    },
  };
}

/* ------------------------------ catálogo ----------------------------- */

export async function listarProductos({ incluirInactivos = false } = {}) {
  return estado.productos.filter((p) => incluirInactivos || p.activo);
}

export async function buscarProducto(id) {
  return estado.productos.find((p) => p.id === id) || null;
}

/* ------------------------------- compras ----------------------------- */

export async function registrarCompra({ usuarioId, productoId, cantidad = 1 }) {
  const usuario = await buscarUsuarioPorId(usuarioId);
  if (!usuario) throw ApiError.noEncontrado("No encontramos tu cuenta.");

  const producto = await buscarProducto(validar(productoId, "producto_id", { requerido: true }));
  if (!producto) throw ApiError.noEncontrado("Ese producto no existe.");
  if (!producto.activo) {
    throw ApiError.conflicto("Ese producto no está disponible en este momento.");
  }

  const unidades = Math.max(1, Math.min(50, Number.parseInt(cantidad, 10) || 1));
  // El monto sale del catálogo del backend, nunca del body del cliente.
  const monto = producto.precio * unidades;

  const compra = {
    id: proximoId("cmp"),
    usuarioId: usuario.id,
    productoId: producto.id,
    productoNombre: producto.nombre,
    cantidad: unidades,
    monto,
    origen: "web",
    creadaEn: new Date().toISOString(),
  };

  usuario.cicloAcumulado += monto;
  usuario.totalCompras = (usuario.totalCompras || 0) + unidades;

  const evaluacion = evaluarRegla(usuario.cicloAcumulado, estado.config);
  usuario.cicloAcumulado = evaluacion.cicloRestante;

  let regalo = null;
  if (evaluacion.regaloOtorgado && evaluacion.montoRegalo > 0) {
    usuario.saldoFavor += evaluacion.montoRegalo;
    regalo = {
      id: proximoId("reg"),
      usuarioId: usuario.id,
      compraId: compra.id,
      monto: evaluacion.montoRegalo,
      limiteAlMomento: estado.config.limite,
      creadoEn: new Date().toISOString(),
    };
    estado.regalos.push(regalo);
  }

  estado.compras.push(compra);

  return {
    compra,
    regalo,
    usuario: resumenUsuario(usuario),
  };
}

/* ------------------------------ beneficios --------------------------- */

function beneficiosVigentes(usuario) {
  const { promos = [], descuentos = [], cupones = [] } = usuario.beneficios;
  const usados = new Set(usuario.cuponesUsados || []);
  const cuponesUsados = usuario.cuponesUsados || [];

  return {
    promos: promos.filter((p) => p.activo !== false && esVigente(p.vigenciaDesde, p.vigenciaHasta)),
    descuentos: descuentos.filter(
      (d) => d.activo !== false && esVigente(d.vigenciaDesde, d.vigenciaHasta),
    ),
    cupones: cupones
      .filter((c) => esVigente(c.vigenteDesde, c.vigenteHasta))
      .map((c) => ({
        ...c,
        usado: usados.has(c.codigo),
        usosRestantes: Math.max(0, (c.usosMax || 1) - cuponesUsados.filter((u) => u === c.codigo).length),
      })),
  };
}

export async function obtenerResumen(usuarioId) {
  const usuario = await buscarUsuarioPorId(usuarioId);
  if (!usuario) throw ApiError.noEncontrado("No encontramos tu cuenta.");
  return { ...resumenUsuario(usuario), beneficios: beneficiosVigentes(usuario) };
}

export async function listarBeneficios(usuarioId) {
  const usuario = await buscarUsuarioPorId(usuarioId);
  if (!usuario) throw ApiError.noEncontrado("No encontramos tu cuenta.");
  return beneficiosVigentes(usuario);
}

export async function listarHistorial(usuarioId) {
  const usuario = await buscarUsuarioPorId(usuarioId);
  if (!usuario) throw ApiError.noEncontrado("No encontramos tu cuenta.");

  const compras = estado.compras
    .filter((c) => c.usuarioId === usuarioId)
    .sort((a, b) => new Date(b.creadaEn) - new Date(a.creadaEn));
  const regalos = estado.regalos
    .filter((r) => r.usuarioId === usuarioId)
    .sort((a, b) => new Date(b.creadoEn) - new Date(a.creadoEn));
  const canjes = estado.canjes
    .filter((c) => c.usuarioId === usuarioId)
    .sort((a, b) => new Date(b.creadoEn) - new Date(a.creadoEn));

  return { compras, regalos, canjes, resumen: resumenUsuario(usuario) };
}

export async function aplicarCupon(usuarioId, codigo) {
  const usuario = await buscarUsuarioPorId(usuarioId);
  if (!usuario) throw ApiError.noEncontrado("No encontramos tu cuenta.");

  const limpio = String(codigo || "").trim().toUpperCase();
  if (!limpio) throw ApiError.badRequest("Falta el código del cupón.");

  const cupon = (usuario.beneficios.cupones || []).find(
    (c) => c.codigo.toUpperCase() === limpio,
  );
  if (!cupon) throw ApiError.noEncontrado("Ese cupón no existe para tu cuenta.");
  if (!esVigente(cupon.vigenteDesde, cupon.vigenteHasta)) {
    throw ApiError.conflicto("Ese cupón ya no está vigente.");
  }

  const usados = usuario.cuponesUsados || [];
  const vecesUsado = usados.filter((c) => c === cupon.codigo).length;
  if (vecesUsado >= (cupon.usosMax || 1)) {
    throw ApiError.conflicto("Ya usaste ese cupón.");
  }

  usuario.cuponesUsados = [...usados, cupon.codigo];

  const canje = {
    id: proximoId("cnj"),
    usuarioId: usuario.id,
    cuponId: cupon.id,
    codigo: cupon.codigo,
    titulo: cupon.titulo,
    tipo: cupon.tipo,
    valor: cupon.valor,
    minCompra: cupon.minCompra,
    creadoEn: new Date().toISOString(),
  };
  estado.canjes.push(canje);

  return { canje, usuario: resumenUsuario(usuario) };
}

/* -------------------------------- admin ------------------------------ */

export async function obtenerConfig() {
  return { ...estado.config };
}

export async function actualizarConfig(patch = {}) {
  const anterior = { ...estado.config };

  if (patch.activa !== undefined) estado.config.activa = Boolean(patch.activa);
  if (patch.limite !== undefined) {
    const limite = Number(patch.limite);
    if (!Number.isFinite(limite) || limite < 0) {
      throw ApiError.badRequest("El límite tiene que ser un número mayor o igual a 0.");
    }
    estado.config.limite = limite;
  }
  if (patch.montoRegalo !== undefined) {
    const monto = Number(patch.montoRegalo);
    if (!Number.isFinite(monto) || monto < 0) {
      throw ApiError.badRequest("El monto de regalo tiene que ser un número mayor o igual a 0.");
    }
    estado.config.montoRegalo = monto;
  }
  if (patch.reiniciarCiclo !== undefined) {
    estado.config.reiniciarCiclo = Boolean(patch.reiniciarCiclo);
  }
  if (typeof patch.descripcion === "string" && patch.descripcion.trim()) {
    estado.config.descripcion = patch.descripcion.trim();
  }

  return { anterior, config: { ...estado.config } };
}

/** Suma saldo al ciclo de un usuario para probar el umbral sin comprar. */
export async function simular(usuarioId, monto = 5000) {
  const usuario = await buscarUsuarioPorId(validar(usuarioId, "usuario_id", { requerido: true }));
  if (!usuario) throw ApiError.noEncontrado("Ese usuario no existe.");

  const cantidad = Number(monto);
  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    throw ApiError.badRequest("El monto a simular tiene que ser mayor a 0.");
  }

  usuario.cicloAcumulado += cantidad;
  const evaluacion = evaluarRegla(usuario.cicloAcumulado, estado.config);
  usuario.cicloAcumulado = evaluacion.cicloRestante;

  let regalo = null;
  if (evaluacion.regaloOtorgado && evaluacion.montoRegalo > 0) {
    usuario.saldoFavor += evaluacion.montoRegalo;
    regalo = {
      id: proximoId("reg"),
      usuarioId: usuario.id,
      compraId: null,
      monto: evaluacion.montoRegalo,
      limiteAlMomento: estado.config.limite,
      creadoEn: new Date().toISOString(),
      simulado: true,
    };
    estado.regalos.push(regalo);
  }

  return { usuario: resumenUsuario(usuario), regalo };
}

/** Lista mínima para que el panel admin pueda elegir a quién simular. */
export async function listarUsuarios() {
  return estado.usuarios.map((u) => resumenUsuario(u));
}

/** Reinicia el estado a la semilla. Solo para pruebas manuales. */
export async function reiniciarDatos() {
  estado.usuarios = structuredClone(semillaUsuarios);
  estado.productos = structuredClone(catalogo);
  estado.config = { ...acumulacion };
  estado.compras = [];
  estado.regalos = [];
  estado.canjes = [];
  estado.secuencia = 1;
  return { ok: true };
}
