# MilSitios

Nueve microherramientas gratuitas, sin registro, hechas con HTML, CSS y JavaScript. `juegos-de-cartas.html` agrupa los cuatro juegos; no es una herramienta adicional.

## Abrir el proyecto

Descargá los archivos y abrí `index.html` en tu navegador. Conservá la carpeta `assets` junto a los HTML. No hace falta instalar paquetes ni compilar.

## Dónde editar el diseño

- `index.html`: portada, textos, enlaces y tarjetas de herramientas. Las tarjetas están en el HTML para que sean accesibles también sin ejecutar JavaScript.
- `assets/home.css`: diseño adaptable de la portada.
- `assets/home.js`: buscador y filtros por categoría. Reconoce palabras con o sin tildes.
- `assets/theme.css`: colores, tipografía y estilo compartido por todas las páginas. Cambiar este archivo actualiza todo el sitio.
- `assets/*.svg`: ilustraciones originales y favicon, sin imágenes ni fuentes externas.
- Cada HTML de herramienta conserva sus estilos específicos y su lógica JavaScript. La hoja compartida se carga después para actualizar la apariencia.

Los colores de cada categoría se definen al principio de `theme.css`. El atributo `data-category` del `body` selecciona la categoría de cada herramienta: `social`, `finance`, `text` o `games`.

## Agregar una herramienta a la portada

Copiá una tarjeta `.tool-card` de `index.html`, actualizá su enlace, imagen, título, descripción, `data-category` y `data-keywords`. El buscador y el contador la incorporan automáticamente. Actualizá también la descripción de la página y este documento si cambia el total de herramientas.

## GitHub y Netlify

El sitio sigue siendo estático y conserva las URLs existentes. No requiere un comando de build; el directorio publicado es la raíz del repositorio. Conservá la configuración de Netlify que ya utiliza el proyecto.

El rediseño está preparado en una rama separada. La versión publicada cambia cuando se integra en la rama que Netlify tenga configurada para producción. Si el proyecto tiene habilitadas las Deploy Previews, Netlify puede generar una vista previa desde el pull request.

## Verificación del rediseño

Se verificaron los enlaces y recursos locales de las once páginas, los IDs únicos, la sintaxis de JavaScript y SVG, y las interacciones del buscador y filtros con un DOM simulado. Los scripts de las herramientas se conservaron sin cambios. Queda pendiente comprobar visualmente en un navegador de escritorio y móvil, y probar los flujos completos de cada herramienta antes de publicar.
