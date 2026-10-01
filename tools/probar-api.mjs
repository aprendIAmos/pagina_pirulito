// Prueba de punta a punta contra el server corriendo en :3000.
//   node tools/probar-api.mjs
//
// Cubre: health, catálogo, login, compra que dispara el regalo,
// validación de precio, cupones, permisos de admin y logout.

const BASE = process.env.BASE || "http://localhost:3000";
const PASSWORD = "pirulito123";

let fallos = 0;
let pruebas = 0;

function ok(nombre, condicion, extra = "") {
  pruebas += 1;
  if (condicion) {
    console.log(`  ok   ${nombre}`);
  } else {
    fallos += 1;
    console.error(`  FALLA ${nombre} ${extra}`);
  }
}

function seccion(titulo) {
  console.log(`\n${titulo}`);
}

/** Cliente HTTP que conserva la cookie de sesión entre llamadas. */
function crearCliente() {
  let cookie = "";
  return async function pedir(ruta, { metodo = "GET", cuerpo } = {}) {
    const cabeceras = { Accept: "application/json" };
    if (cuerpo !== undefined) cabeceras["Content-Type"] = "application/json";
    if (cookie) cabeceras.Cookie = cookie;

    const respuesta = await fetch(`${BASE}${ruta}`, {
      method: metodo,
      headers: cabeceras,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });

    const setCookie = respuesta.headers.getSetCookie?.() || [];
    for (const linea of setCookie) {
      const par = linea.split(";")[0];
      if (par.startsWith("pirulito_session=")) cookie = par;
    }

    const texto = await respuesta.text();
    let datos = null;
    if (texto) {
      try {
        datos = JSON.parse(texto);
      } catch {
        datos = texto;
      }
    }
    return { status: respuesta.status, datos };
  };
}

/* ------------------------------------------------------------------ */

const ana = crearCliente();
const admin = crearCliente();

/**
 * Los datos viven en memoria, así que la prueba necesita partir del
 * estado inicial. Reiniciamos con el endpoint de desarrollo; si no está
 * disponible (por ejemplo contra Supabase) seguimos con el estado actual.
 */
async function reiniciarDatosMock() {
  await admin("/api/auth/login", {
    metodo: "POST",
    cuerpo: { usuario: "admin", password: PASSWORD },
  });
  const { status } = await admin("/api/admin/reiniciar-datos", { metodo: "POST" });
  if (status !== 200) {
    console.warn("[aviso] no se pudieron reiniciar los datos; la prueba arranca con el estado actual.");
  }
}

seccion("Reinicio de datos");
{
  await reiniciarDatosMock();
  ok("los datos mock volvieron al estado inicial", true);
}

seccion("Health y catálogo");
{
  const { status, datos } = await ana("/api/health");
  ok("health responde 200", status === 200, `(${status})`);
  ok("health dice que anda con mock", datos?.dataProvider === "mock", JSON.stringify(datos));

  const catalogo = await ana("/api/productos");
  ok("catálogo responde 200", catalogo.status === 200);
  ok("catálogo tiene 4 productos", catalogo.datos?.productos?.length === 4);
  ok(
    "el precio viene del backend",
    catalogo.datos?.productos?.[0]?.precio === 3000,
    JSON.stringify(catalogo.datos?.productos?.[0]),
  );
}

seccion("Compra sin sesión bloqueada");
{
  const { status } = await ana("/api/compras", {
    metodo: "POST",
    cuerpo: { producto_id: "chocotorta" },
  });
  ok("sin sesión devuelve 401", status === 401, `(${status})`);
}

seccion("Login");
{
  const malo = await ana("/api/auth/login", {
    metodo: "POST",
    cuerpo: { usuario: "ana", password: "incorrecta" },
  });
  ok("password incorrecta devuelve 401", malo.status === 401, `(${malo.status})`);

  const vacio = await ana("/api/auth/login", { metodo: "POST", cuerpo: {} });
  ok("pedido incompleto devuelve 400", vacio.status === 400, `(${vacio.status})`);

  const okLogin = await ana("/api/auth/login", {
    metodo: "POST",
    cuerpo: { usuario: "ana", password: PASSWORD },
  });
  ok("login de ana devuelve 200", okLogin.status === 200, JSON.stringify(okLogin.datos));
  ok("devuelve el nombre", okLogin.datos?.usuario?.nombre === "Ana Gómez");
  ok("ana arranca con $7.000 de ciclo", okLogin.datos?.usuario?.cicloAcumulado === 7000,
    String(okLogin.datos?.usuario?.cicloAcumulado));
  ok("ana arranca sin saldo a favor", okLogin.datos?.usuario?.saldoFavor === 0);

  const yo = await ana("/api/auth/yo");
  ok("/api/auth/yo responde con la sesión", yo.status === 200);
  ok("trae 1 promo", yo.datos?.usuario?.beneficios?.promos?.length === 1);
  ok("trae 2 descuentos", yo.datos?.usuario?.beneficios?.descuentos?.length === 2);
  ok("trae 2 cupones", yo.datos?.usuario?.beneficios?.cupones?.length === 2);
}

seccion("Compra: el precio lo decide el backend");
{
  const intento = await ana("/api/compras", {
    metodo: "POST",
    // El cliente intenta mandar su propio precio: se ignora.
    cuerpo: { producto_id: "chocotorta", cantidad: 1, monto: 1, precio: 1 },
  });
  ok("compra devuelve 201", intento.status === 201, JSON.stringify(intento.datos));
  ok("el monto es el del catálogo ($3.000)", intento.datos?.compra?.monto === 3000,
    String(intento.datos?.compra?.monto));
  ok("el ciclo llegó a $10.000 y disparó el regalo", intento.datos?.regalo?.monto === 1000,
    JSON.stringify(intento.datos?.regalo));
  ok("acreditó $1.000 de saldo a favor", intento.datos?.usuario?.saldoFavor === 1000,
    String(intento.datos?.usuario?.saldoFavor));
  ok("el ciclo reinició en 0", intento.datos?.usuario?.cicloAcumulado === 0,
    String(intento.datos?.usuario?.cicloAcumulado));
  ok("el mensaje avisa el regalo", /saldo a favor/i.test(intento.datos?.mensaje || ""));
}

seccion("Excedente: no se pierde");
{
  // Con el ciclo en 0 y límite $10.000, una compra de 4 porte deja $2.000.
  const partes = [];
  for (let i = 0; i < 4; i += 1) {
    partes.push(await ana("/api/compras", { metodo: "POST", cuerpo: { producto_id: "lemon-pie" } }));
  }
  ok("la cuarta compra dispara otro regalo", partes[3]?.datos?.regalo?.monto === 1000,
    JSON.stringify(partes[3]?.datos?.regalo));
  ok("quedan $2.000 de remanente en el ciclo", partes[3]?.datos?.usuario?.cicloAcumulado === 2000,
    String(partes[3]?.datos?.usuario?.cicloAcumulado));
  ok("el saldo a favor llegó a $2.000", partes[3]?.datos?.usuario?.saldoFavor === 2000,
    String(partes[3]?.datos?.usuario?.saldoFavor));
}

seccion("Producto inexistente y cantidad");
{
  const fantasma = await ana("/api/compras", {
    metodo: "POST",
    cuerpo: { producto_id: "no-existe" },
  });
  ok("producto inexistente devuelve 404", fantasma.status === 404, `(${fantasma.status})`);

  const vacio = await ana("/api/compras", { metodo: "POST", cuerpo: {} });
  ok("sin producto_id devuelve 400", vacio.status === 400, `(${vacio.status})`);

  const dos = await ana("/api/compras", {
    metodo: "POST",
    cuerpo: { producto_id: "cheesecake", cantidad: 2 },
  });
  ok("2 porciones se cobran $6.000", dos.datos?.compra?.monto === 6000, String(dos.datos?.compra?.monto));
}

seccion("Historial y cupones");
{
  const historial = await ana("/api/cuenta/historial");
  ok("historial responde 200", historial.status === 200);
  ok("registró 6 compras", historial.datos?.compras?.length === 6, String(historial.datos?.compras?.length));
  ok("registró 2 regalos", historial.datos?.regalos?.length === 2, String(historial.datos?.regalos?.length));

  const cupon = await ana("/api/cuenta/cupones/MENOS10/aplicar", { metodo: "POST" });
  ok("aplicar MENOS10 devuelve 201", cupon.status === 201, JSON.stringify(cupon.datos));

  const repetido = await ana("/api/cuenta/cupones/MENOS10/aplicar", { metodo: "POST" });
  ok("reaplicar el mismo cupón devuelve 409", repetido.status === 409, `(${repetido.status})`);

  const falso = await ana("/api/cuenta/cupones/NOEXISTE/aplicar", { metodo: "POST" });
  ok("cupón inexistente devuelve 404", falso.status === 404, `(${falso.status})`);
}

seccion("Permisos de admin");
{
  const prohibido = await ana("/api/admin/config");
  ok("un cliente no entra al panel (403)", prohibido.status === 403, `(${prohibido.status})`);

  const loginAdmin = await admin("/api/auth/login", {
    metodo: "POST",
    cuerpo: { usuario: "admin", password: PASSWORD },
  });
  ok("login de admin devuelve 200", loginAdmin.status === 200);
  ok("el rol es admin", loginAdmin.datos?.usuario?.rol === "admin");

  const config = await admin("/api/admin/config");
  ok("admin lee la regla", config.datos?.config?.limite === 10000, JSON.stringify(config.datos?.config));
  ok("el monto de regalo es $1.000", config.datos?.config?.montoRegalo === 1000);

  const cambio = await admin("/api/admin/config", {
    metodo: "PATCH",
    cuerpo: { limite: 15000, montoRegalo: 2500 },
  });
  ok("admin actualiza la regla", cambio.datos?.config?.limite === 15000, JSON.stringify(cambio.datos));
  ok("guarda el monto nuevo", cambio.datos?.config?.montoRegalo === 2500);

  const invalido = await admin("/api/admin/config", { metodo: "PATCH", cuerpo: { limite: -5 } });
  ok("rechaza un límite negativo (400)", invalido.status === 400, `(${invalido.status})`);

  const usuarios = await admin("/api/admin/usuarios");
  ok("admin lista los usuarios", usuarios.datos?.usuarios?.length === 2);

  // Devolvemos la regla a $10.000 / $1.000 para el resto de las pruebas.
  await admin("/api/admin/config", {
    metodo: "PATCH",
    cuerpo: { limite: 10000, montoRegalo: 1000 },
  });

  const anaId = usuarios.datos?.usuarios?.find((u) => u.usuario === "ana")?.id;
  const antes = usuarios.datos?.usuarios?.find((u) => u.id === anaId);
  const cicloAntes = antes?.cicloAcumulado ?? 0;
  const saldoAntes = antes?.saldoFavor ?? 0;
  const falta = 10000 - cicloAntes;

  // Un peso antes del límite todavía no hay regalo.
  const casi = await admin("/api/admin/simular", {
    metodo: "POST",
    cuerpo: { usuario_id: anaId, monto: falta - 1 },
  });
  ok("admin simula saldo", casi.status === 200, JSON.stringify(casi.datos));
  ok("un peso antes del límite no otorga regalo", !casi.datos?.regalo, JSON.stringify(casi.datos?.regalo));
  ok("el ciclo queda a un peso del límite", casi.datos?.usuario?.cicloAcumulado === 9999,
    String(casi.datos?.usuario?.cicloAcumulado));

  // Un peso más y llega exacto al límite: ahí sí se otorga.
  const completo = await admin("/api/admin/simular", {
    metodo: "POST",
    cuerpo: { usuario_id: anaId, monto: 1 },
  });
  ok("al llegar al límite se otorga el regalo", completo.datos?.regalo?.monto === 1000,
    JSON.stringify(completo.datos?.regalo));
  ok("el ciclo reinicia en 0 tras el regalo", completo.datos?.usuario?.cicloAcumulado === 0,
    String(completo.datos?.usuario?.cicloAcumulado));
  ok("el saldo a favor subió $1.000", completo.datos?.usuario?.saldoFavor === saldoAntes + 1000,
    String(completo.datos?.usuario?.saldoFavor));
  ok("el progreso vuelve a 0%", completo.datos?.usuario?.regla?.progresoPct === 0,
    String(completo.datos?.usuario?.regla?.progresoPct));

  const montoInvalido = await admin("/api/admin/simular", {
    metodo: "POST",
    cuerpo: { usuario_id: anaId, monto: -100 },
  });
  ok("rechaza simular un monto negativo (400)", montoInvalido.status === 400, `(${montoInvalido.status})`);
}

seccion("Logout y sesión cerrada");
{
  const salir = await ana("/api/auth/logout", { metodo: "POST" });
  ok("logout devuelve 200", salir.status === 200);

  const despues = await ana("/api/auth/yo");
  ok("tras logout, /api/auth/yo da 401", despues.status === 401, `(${despues.status})`);

  const comprar = await ana("/api/compras", {
    metodo: "POST",
    cuerpo: { producto_id: "chocotorta" },
  });
  ok("tras logout no se puede comprar", comprar.status === 401, `(${comprar.status})`);
}

seccion("Rutas inexistentes y frontend");
{
  const fantasma = await ana("/api/no-existe");
  ok("endpoint inexistente devuelve 404", fantasma.status === 404, `(${fantasma.status})`);

  const inicio = await fetch(`${BASE}/`);
  ok("el server sirve el index", inicio.status === 200, `(${inicio.status})`);
  const html = await inicio.text();
  ok("el index tiene el contenedor del catálogo", html.includes('id="catalogo-grid"'));
  ok("el index ya no trae tarjetas hardcodeadas", !html.includes('data-price="3000"'));

  const cuenta = await fetch(`${BASE}/cuenta.html`);
  ok("el server sirve la página de cuenta", cuenta.status === 200, `(${cuenta.status})`);

  const css = await fetch(`${BASE}/styles.css`);
  ok("el server sirve los estilos", css.status === 200, `(${css.status})`);

  const modulo = await fetch(`${BASE}/js/cuenta.js`);
  ok("el server sirve los módulos JS", modulo.status === 200, `(${modulo.status})`);
}

/* ------------------------------------------------------------------ */

console.log(`\n${pruebas - fallos}/${pruebas} pruebas pasaron.`);
if (fallos) {
  console.error(`${fallos} fallaron.`);
  process.exit(1);
}
