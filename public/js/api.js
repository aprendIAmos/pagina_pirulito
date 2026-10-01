/* ------------------------------------------------------------------ *
 * Cliente de la API
 *
 * Un solo lugar desde el que el frontend habla con el backend. Todas las
 * peticiones van con cookies (session) y los errores llegan como
 * { error, detalles } para poder mostrarlos tal cual.
 * ------------------------------------------------------------------ */

async function request(path, { method = "GET", body } = {}) {
  const opciones = {
    method,
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  };

  if (body !== undefined) {
    opciones.headers["Content-Type"] = "application/json";
    opciones.body = JSON.stringify(body);
  }

  let respuesta;
  try {
    respuesta = await fetch(path, opciones);
  } catch {
    throw new Error("No pudimos comunicarnos con el servidor. Revisá tu conexión.");
  }

  if (respuesta.status === 204) return null;

  const texto = await respuesta.text();
  let datos = null;
  if (texto) {
    try {
      datos = JSON.parse(texto);
    } catch {
      datos = null;
    }
  }

  if (!respuesta.ok) {
    const error = new Error(datos?.error || "Algo falló. Probá de nuevo.");
    error.status = respuesta.status;
    error.detalles = datos?.detalles;
    throw error;
  }

  return datos;
}

export const api = {
  health: () => request("/api/health"),

  auth: {
    login: (usuario, password) =>
      request("/api/auth/login", { method: "POST", body: { usuario, password } }),
    logout: () => request("/api/auth/logout", { method: "POST" }),
    yo: () => request("/api/auth/yo"),
  },

  productos: () => request("/api/productos"),

  compras: {
    crear: (productoId, cantidad = 1) =>
      request("/api/compras", {
        method: "POST",
        body: { producto_id: productoId, cantidad },
      }),
  },

  cuenta: {
    beneficios: () => request("/api/cuenta/beneficios"),
    historial: () => request("/api/cuenta/historial"),
    aplicarCupon: (codigo) =>
      request(`/api/cuenta/cupones/${encodeURIComponent(codigo)}/aplicar`, {
        method: "POST",
      }),
  },
};

/* ----------------------------- formateo ------------------------------- */

const pesos = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export function formatearPrecio(valor) {
  return pesos.format(Number(valor) || 0);
}

export function formatearFecha(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
