# Pirulito

Landing page de Pirulito, una marca de postres por porción. Todo el sitio es estático y no necesita base de datos.

## Ver el sitio

Abrí `index.html` en un navegador o levantá un servidor local:

```bash
python -m http.server 8080
```

Luego abrí `http://localhost:8080`.

## Personalización rápida

- **WhatsApp:** el número y los mensajes se configuran al inicio de `script.js` (`WHATSAPP_NUMBER` y `DEFAULT_MESSAGE`). Los enlaces se completan solos desde ahí.
- **Precios:** se editan con el atributo `data-price` de cada producto en `index.html` (por ejemplo `data-price="3000"`).
- **Productos y mensajes de pedido:** agregá o editá las tarjetas en `index.html`; el mensaje del catálogo se arma solo con `data-product`.
- **Filtros:** los contadores del catálogo se calculan solos desde `script.js`, no hace falta tocarlos a mano.
- **Fotos:** las imágenes actuales son de muestra (Unsplash). Reemplazá las URLs de `images.unsplash.com` en `index.html` por las fotos reales de Pirulito.
- **Colores y estilos:** están agrupados al inicio de `styles.css` como variables CSS.
- **Redes sociales:** no se incluyen porque la marca todavía no tiene Instagram.