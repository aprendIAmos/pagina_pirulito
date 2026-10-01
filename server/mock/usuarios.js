/* ------------------------------------------------------------------ *
 * Usuarios de prueba
 *
 * Contraseñas hasheadas con bcrypt. Los dos usuarios usan "pirulito123".
 * `cicloAcumulado` arranca en $7.000 a propósito: con el límite de
 * $10.000, la primera compra de Ana dispara el regalo y se puede ver el
 * circuito completo sin llenar el historial a mano.
 *
 * Cuando esto pase a Supabase, estos datos pasan a ser filas de
 * `profiles` + `saldos_cliente` y las contraseñas las maneja Supabase
 * Auth. Nada más del server necesita cambiar.
 * ------------------------------------------------------------------ */

export const usuarios = [
  {
    id: "usr_ana",
    usuario: "ana",
    passwordHash:
      "$2b$10$FJ21uj2Qu3A8v4GlBmO.iuaKTQOCjK3pEqML00/9x19lO3dh31uum",
    nombre: "Ana Gómez",
    email: "ana@pirulito.test",
    telefono: "+54 9 11 5555-0001",
    rol: "cliente",
    activo: true,
    cicloAcumulado: 7000,
    saldoFavor: 0,
    beneficios: {
      promos: [
        {
          id: "promo_bienvenida",
          titulo: "Bienvenida a Pirulito",
          descripcion:
            "Tu primera porción tiene 15% off. Se aplica solo por código.",
          tipo: "porcentaje",
          valor: 15,
          vigenciaDesde: "2026-01-01",
          vigenciaHasta: "2026-12-31",
          activo: true,
        },
      ],
      descuentos: [
        {
          id: "desc_envio",
          titulo: "Envío gratis en CABA",
          descripcion:
            "Sin costo de envío en compras de $20.000 o más dentro de CABA.",
          tipo: "monto",
          valor: 0,
          montoBeneficio: "envio_gratis",
          minCompra: 20000,
          vigenciaDesde: "2026-01-01",
          vigenciaHasta: "2026-12-31",
          activo: true,
        },
        {
          id: "desc_repe",
          titulo: "Tiramisú de regalo",
          descripcion:
            "20% off en tu próximo Tiramisú, todos los martes y miércoles.",
          tipo: "porcentaje",
          valor: 20,
          productos: ["tiramisu"],
          vigenciaDesde: "2026-01-01",
          vigenciaHasta: "2026-12-31",
          activo: true,
        },
      ],
      cupones: [
        {
          id: "cup_menos10",
          codigo: "MENOS10",
          titulo: "$1.000 off",
          descripcion: "Descuenta $1.000 en compras de $8.000 o más.",
          tipo: "monto",
          valor: 1000,
          minCompra: 8000,
          usosMax: 1,
          vigenteDesde: "2026-01-01",
          vigenteHasta: "2026-12-31",
        },
        {
          id: "cup_bienvenida",
          codigo: "BIENVENIDA20",
          titulo: "20% off",
          descripcion: "Tu descuento de bienvenida, sin mínimo de compra.",
          tipo: "porcentaje",
          valor: 20,
          minCompra: 0,
          usosMax: 1,
          vigenteDesde: "2026-01-01",
          vigenciaHasta: "2026-12-31",
        },
      ],
    },
  },
  {
    id: "usr_admin",
    usuario: "admin",
    passwordHash:
      "$2b$10$F.sAfcGlxm.wkfW6XOvl.eCsscku89v1GF9xUoIjdUBLco0iFH0la",
    nombre: "Equipo Pirulito",
    email: "admin@pirulito.test",
    telefono: "+54 9 11 3856-9142",
    rol: "admin",
    activo: true,
    cicloAcumulado: 0,
    saldoFavor: 0,
    beneficios: { promos: [], descuentos: [], cupones: [] },
  },
];
