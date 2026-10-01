/* ------------------------------------------------------------------ *
 * Configuración central
 *
 * Lee .env y expone todo lo que el server necesita. Fallar al arrancar
 * es mejor que arrancar con un secreto por defecto.
 * ------------------------------------------------------------------ */

import "dotenv/config";

const DEFAULT_PORT = 3000;
const DEV_SECRET = "dev-secret-no-usar-en-produccion-cambiame";

function required(name, fallback) {
  const value = process.env[name];
  if (value && value.trim()) return value.trim();
  if (fallback) return fallback;
  throw new Error(`Falta la variable de entorno ${name} en .env`);
}

function int(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";

if (isProduction) {
  // En producción el secreto tiene que venir sí o sí de .env.
  required("JWT_SECRET");
} else if (!process.env.JWT_SECRET) {
  console.warn(
    "[config] JWT_SECRET no está definido: se usa un secreto de desarrollo. No subas esto a producción.",
  );
}

export const config = {
  nodeEnv,
  isProduction,
  port: int(process.env.PORT, DEFAULT_PORT),
  jwtSecret: process.env.JWT_SECRET?.trim() || DEV_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  cookieName: "pirulito_session",
  dataProvider: (process.env.DATA_PROVIDER || "mock").toLowerCase(),
  corsOrigins: (process.env.CORS_ORIGIN || "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};

if (!["mock", "supabase"].includes(config.dataProvider)) {
  throw new Error(
    `DATA_PROVIDER inválido: "${config.dataProvider}". Usá "mock" o "supabase".`,
  );
}
