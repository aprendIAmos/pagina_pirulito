/* ------------------------------------------------------------------ *
 * Errores de API
 *
 * Una sola clase para que las rutas tiren errores con código y mensaje
 * en español, y el middleware los convierta en JSON.
 * ------------------------------------------------------------------ */

export class ApiError extends Error {
  constructor(status, message, detalles = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detalles = detalles;
  }

  static badRequest(message, detalles) {
    return new ApiError(400, message, detalles);
  }

  static noAutorizado(message = "Necesitás iniciar sesión para ver esto.") {
    return new ApiError(401, message);
  }

  static prohibido(message = "No tenés permisos para hacer eso.") {
    return new ApiError(403, message);
  }

  static noEncontrado(message = "No encontramos lo que estabas buscando.") {
    return new ApiError(404, message);
  }

  static conflicto(message, detalles) {
    return new ApiError(409, message, detalles);
  }
}

/**
 * Envuelve un handler async para que los rechazos lleguen al middleware
 * de errores en vez de dejar la petición colgada.
 */
export function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
