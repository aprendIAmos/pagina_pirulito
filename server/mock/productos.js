/* ------------------------------------------------------------------ *
 * Productos
 *
 * El precio vive acá y no en el frontend: el backend es la única fuente
 * de verdad. `imagen` apunta a Unsplash (foto de muestra) y `categoria`
 * alimenta los filtros del catálogo.
 * ------------------------------------------------------------------ */

export const productos = [
  {
    id: "chocotorta",
    nombre: "Chocotorta",
    categoria: "chocolate",
    categoriaLabel: "Chocolate",
    descripcion:
      "Galletitas de chocolate, dulce de leche y una cremosidad que invita a darle otro bocado.",
    precio: 3000,
    imagen:
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=85",
    badge: "Más pedido",
    badgeLight: false,
    emoji: "♡",
    activo: true,
  },
  {
    id: "lemon-pie",
    nombre: "Lemon Pie",
    categoria: "citrico",
    categoriaLabel: "Cítrico",
    descripcion:
      "Masa crocante, relleno cremoso y un toque cítrico para cerrar el día con algo liviano.",
    precio: 3000,
    imagen:
      "https://images.unsplash.com/photo-1519915028121-7d3463d20b13?auto=format&fit=crop&w=600&q=85",
    badge: "Fresco y ácido",
    badgeLight: true,
    emoji: "✦",
    activo: true,
  },
  {
    id: "cheesecake",
    nombre: "Cheesecake",
    categoria: "cremoso",
    categoriaLabel: "Cremoso",
    descripcion:
      "Textura suave, cremosa y un equilibrio dulce-acidez para disfrutar sin apuro.",
    precio: 3000,
    imagen:
      "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=600&q=85",
    badge: "Suave y cremoso",
    badgeLight: true,
    emoji: "♡",
    activo: true,
  },
  {
    id: "tiramisu",
    nombre: "Tiramisú",
    categoria: "cremoso",
    categoriaLabel: "Café",
    descripcion:
      "Capas de bizcocho, café y crema con ese toque de cacao que nunca sobra.",
    precio: 3000,
    imagen:
      "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=600&q=85",
    badge: "Para amantes del café",
    badgeLight: true,
    emoji: "✦",
    activo: true,
  },
];
