# Pirulito

Sitio y API de Pirulito, una marca de postres por porción. El backend es Node
y sirve el frontend, así que todo corre en un solo proceso y un solo dominio.

La base de datos todavía no está conectada: los datos viven en memoria
(`DATA_PROVIDER=mock`). Cuando se sume Supabase se cambia una variable de
entorno y se escribe un módulo de datos nuevo, sin tocar las rutas ni el
frontend.

## Levantar el proyecto

```bash
npm install
cp .env.example .env
npm start
```

Abrí `http://localhost:3000`.

Para desarrollo con recarga automática: `npm run dev`.

## Usuarios de prueba

| usuario | contraseña | rol | qué puede hacer |
| --- | --- | --- | --- |
| `ana` | `pirulito123` | cliente | comprar, ver saldos, aplicar cupones |
| `admin` | `pirulito123` | admin | lo mismo, más cambiar la regla y simular saldo |

`ana` arranca con $7.000 acumulados y el límite es de $10.000, así que la
primera compra dispara el regalo y se puede ver el circuito completo sin
comprar 34 porciones.

## Cómo funciona el acumulado

- El botón **Comprar** de cada producto llama a `POST /api/compras`.
- El backend busca el precio en el catálogo. El cliente nunca manda un monto.
- Al llegar al límite se acredita saldo a favor y el ciclo reinicia.
- El excedente no se pierde: si comprás $12.000 con límite de $10.000, el
  ciclo queda en $2.000.
- El límite y el monto del regalo se cambian desde el panel de admin, sin
  tocar código ni redesplegar.

## Estructura

```
server/
  index.js          Express: estáticos, API y errores
  config.js         carga de .env
  auth.js           JWT en cookie httpOnly + middlewares de sesión y rol
  errors.js         ApiError y asyncHandler
  routes/           auth, catalogo, compras, cuenta, admin
  data/
    index.js        elige el proveedor de datos
    mock.js         implementación en memoria
  mock/             los datos de prueba y la regla de acumulación
public/
  index.html        portada
  cuenta.html       login, saldos, beneficios, historial, panel admin
  styles.css
  js/
    app.js          entrypoint del inicio
    cuenta.js       entrypoint de la cuenta
    api.js          cliente HTTP y formateo
    sesion.js       estado de sesión en el frontend
    catalogo.js     arma las tarjetas desde la API
    ui.js           menú móvil, avisos y helpers
tools/              scripts de prueba
```

## API

| Método | Ruta | Auth | Qué hace |
| --- | --- | --- | --- |
| `GET` | `/api/health` | no | estado del server |
| `POST` | `/api/auth/login` | no | usuario y contraseña → cookie de sesión |
| `POST` | `/api/auth/logout` | sí | borra la cookie |
| `GET` | `/api/auth/yo` | sí | perfil, saldos y beneficios |
| `GET` | `/api/productos` | no | catálogo con el precio del backend |
| `POST` | `/api/compras` | sí | registra la compra y aplica la regla |
| `GET` | `/api/cuenta/beneficios` | sí | promos, descuentos y cupones |
| `GET` | `/api/cuenta/historial` | sí | compras, regalos y canjes |
| `POST` | `/api/cuenta/cupones/:codigo/aplicar` | sí | canjea un cupón |
| `GET` | `/api/admin/config` | admin | lee la regla |
| `PATCH` | `/api/admin/config` | admin | cambia límite y monto de regalo |
| `GET` | `/api/admin/usuarios` | admin | lista para el selector del panel |
| `POST` | `/api/admin/simular` | admin | suma saldo sin comprar |
| `POST` | `/api/admin/reiniciar-datos` | admin | solo en desarrollo, vuelve los datos mock al inicio |

## Pruebas

Con el server corriendo en otra terminal:

```bash
npm test              # las tres suites
npm run test:enlaces  # HTML ↔ JS ↔ archivos
npm run test:api      # endpoints, auth, regla de acumulación, permisos
npm run test:frontend # catálogo, login, saldos y panel con jsdom
```

## Personalización

- **WhatsApp:** número y mensaje por defecto al inicio de `public/js/app.js`.
- **Productos:** hoy están en `server/mock/productos.js` (precio, foto,
  categoría). Con la base conectada van a ser filas.
- **Colores y estilos:** variables CSS al principio de `public/styles.css`.
- **Fotos:** son de muestra (Unsplash), conviene reemplazarlas.

## Próximo paso: Supabase

1. Crear el proyecto y el `schema.sql` con las tablas `profiles`,
   `clientes`, `productos`, `compras`, `saldos_cliente`, `regla_acumulacion`,
   `regalos_otorgados` y `cupones`.
2. Escribir `server/data/supabase.js` con los mismos exports que
   `server/data/mock.js` y agregarlo a `server/data/index.js`.
3. Poner `DATA_PROVIDER=supabase` en `.env`.
4. Cambiar la autenticación a Supabase Auth (Google o email).

El frontend y los endpoints no se tocan en ese paso.
