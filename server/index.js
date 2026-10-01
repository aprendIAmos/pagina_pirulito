/* ------------------------------------------------------------------ *
 * Server
 *
 * Express sirve la API y también el frontend estático de public/, así
 * que todo corre en un solo proceso y un solo dominio.
 * ------------------------------------------------------------------ */

import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cookieParser from "cookie-parser";

import { config } from "./config.js";
import { cargarSesion } from "./auth.js";
import { ApiError } from "./errors.js";
import { dataProvider } from "./data/index.js";

import authRoutes from "./routes/auth.routes.js";
import catalogoRoutes from "./routes/catalogo.routes.js";
import comprasRoutes from "./routes/compras.routes.js";
import cuentaRoutes from "./routes/cuenta.routes.js";
import adminRoutes from "./routes/admin.routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");

const app = express();

// Render corre detrás de un proxy, sin esto las cookies seguras no llegan.
app.set("trust proxy", 1);
app.disable("x-powered-by");

/* ----------------------------- middlewares ---------------------------- */

app.use(express.json({ limit: "64kb" }));
app.use(cookieParser());

// CORS manual: alcanza con reflecting el origen si está en la lista.
app.use((req, res, next) => {
  const origin = req.get("origin");
  if (origin && config.corsOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    res.setHeader("Vary", "Origin");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  return next();
});

app.use("/api", cargarSesion);

/* -------------------------------- API --------------------------------- */

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    servicio: "pirulito-api",
    dataProvider,
    env: config.nodeEnv,
    hora: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/productos", catalogoRoutes);
app.use("/api/compras", comprasRoutes);
app.use("/api/cuenta", cuentaRoutes);
app.use("/api/admin", adminRoutes);

// Cualquier otra ruta de API que no exista responde JSON, no el index.
app.use("/api", (_req, _res, next) => {
  next(ApiError.noEncontrado("Ese endpoint no existe."));
});

/* ----------------------------- frontend ------------------------------- */

app.use(
  express.static(publicDir, {
    extensions: ["html"],
    setHeaders(res, filePath) {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  }),
);

app.use((req, res) => {
  if (req.method === "GET" && !req.path.includes(".")) {
    return res.sendFile(path.join(publicDir, "index.html"));
  }
  return res.status(404).sendFile(path.join(publicDir, "index.html"));
});

/* --------------------------- errores --------------------------------- */

app.use((err, _req, res, _next) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: err.message,
      detalles: err.detalles || undefined,
    });
  }

  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "El cuerpo del pedido no es JSON válido." });
  }

  console.error("[error]", err);
  return res.status(500).json({
    error: "Algo falló de nuestro lado. Probá de nuevo en un momento.",
  });
});

/* ------------------------------ arranque ------------------------------ */

const server = app.listen(config.port, () => {
  console.log(`[server] Pirulito escuchando en http://localhost:${config.port}`);
  console.log(`[server] datos: ${dataProvider} · env: ${config.nodeEnv}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    console.log(`\n[server] ${signal} recibido, cerrando.`);
    server.close(() => process.exit(0));
  });
}

export default app;
