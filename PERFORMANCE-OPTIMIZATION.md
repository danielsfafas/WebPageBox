# Optimización de Rendimiento: Logo y Assets

## Problema Identificado

El logo del gimnasio aparece varios segundos después de que la página carga porque:

1. **Espera al bundle de JavaScript**: El navegador debe descargar, parsear y ejecutar el bundle de React completo antes de que cualquier componente se renderice.

2. **Fetch de /api/settings**: Una vez que React se monta, el hook `useSettings()` hace un fetch a `/api/settings` para obtener la configuración del gimnasio, incluyendo el logo.

3. **Logo como Base64**: El logo se almacena como una cadena base64 en el JSON de settings, lo que:
   - Aumenta el tamaño del response de la API (~33% más grande que el archivo binario)
   - No puede aprovecharse del cache del navegador para imágenes
   - Debe descargarse completamente antes de que el logo aparezca

4. **Doble fetch innecesario**: Tanto `App.js` como `useSettings()` hacían fetch a `/api/settings` independientemente.

## Soluciones Implementadas

### 1. Cache de Settings en localStorage ✅

- **Implementado en**: `frontend/src/lib/utils-app.js`
- Settings se guardan en localStorage después del primer fetch
- En visitas subsiguientes, el logo aparece **inmediatamente** desde el cache
- El fetch se hace en segundo plano para actualizar el cache
- TTL de 1 hora para el cache

### 2. Carga Temprana de Settings ✅

- **Implementado en**: `frontend/public/index.html`
- Script inline que lee localStorage **antes** de que React se monte
- Aplica el título y preload del logo inmediatamente
- Evita el "flash" de contenido por defecto

### 3. Preload del Logo ✅

- **Implementado en**: `App.js` y `index.html`
- `<link rel="preload" as="image" fetchpriority="high">` para el logo
- El navegador prioriza la descarga del logo sobre otros recursos

### 4. Width/Height para Evitar Layout Shift ✅

- **Implementado en**: `PublicLayout.jsx`
- Atributos `width="36" height="36"` en la imagen del logo
- Previene el "salto" de layout cuando el logo carga

### 5. Cache Headers en Nginx ✅

- **Implementado en**: `frontend/nginx.conf`
- Assets estáticos (imágenes, JS, CSS) con `expires 1y`
- Header `Cache-Control: public, immutable`
- Reduce solicitudes al servidor en visitas subsiguientes

### 6. fetchpriority="high" ✅

- **Implementado en**: `PublicLayout.jsx`
- Atributo `fetchpriority="high"` en la imagen del logo
- Indica al navegador que priorice esta imagen sobre otras

## Flujo de Carga Optimizado

### Primera Visita:
1. HTML se descarga (< 1 KB)
2. Script inline intenta leer localStorage (vacío en primera visita)
3. React se monta y `useSettings()` hace fetch
4. Settings se guardan en localStorage
5. Logo se renderiza

### Visitas Subsiguientes:
1. HTML se descarga
2. **Script inline lee localStorage y aplica título + preload del logo**
3. **Logo aparece inmediatamente cuando React se monta** (desde cache)
4. Fetch en background actualiza el cache si hay cambios

## Limitaciones Actuales

### Base64 Storage
Los logos se almacenan como cadenas base64 en el JSON de settings. Esto tiene implicaciones:

- ⚠️ **Tamaño del response**: Un logo de 50 KB se convierte en ~66 KB de base64
- ⚠️ **Sin cache granular**: El navegador no puede cachear el logo independientemente del JSON
- ⚠️ **Transferencia completa siempre**: Incluso con cache del API, la cadena base64 completa viaja en cada response

**Código relevante**: `frontend/src/pages/admin/AdminSettings.jsx` línea 38
```javascript
const onLogo = async (f) => {
  if (!f) return;
  setS({ ...s, logo: await fileToBase64(f) });
};
```

### Recomendación para Optimización Futura

Para mejorar aún más el rendimiento, se podría:

1. **Crear un endpoint de upload**: `POST /api/admin/upload-logo` que:
   - Acepta archivos (multipart/form-data)
   - Optimiza la imagen (resize a 256x256, compresión WebP/JPEG)
   - Guarda el archivo en disco o S3
   - Retorna una URL pública

2. **Almacenar URLs en settings**: En lugar de base64, guardar:
   ```json
   {
     "logo": "https://cdn.gym.com/logos/morales-box.webp"
   }
   ```

3. **Beneficios**:
   - Logo se cachea independientemente (HTTP cache headers)
   - Tamaño de response de /api/settings se reduce drásticamente
   - Soporte para CDN y optimización de imágenes
   - Formato WebP para mejor compresión

Sin embargo, esto requeriría:
- Gestión de archivos estáticos (local storage o S3)
- Migración de logos existentes de base64 a archivos
- Cambios en el flujo de administración

## Resultados Esperados

Con las optimizaciones implementadas:

- ✅ **Primera visita**: Logo aparece después del fetch (sin cambio)
- 🚀 **Visitas subsiguientes**: Logo aparece **instantáneamente** (mejora significativa)
- ✅ **Sin flash de contenido**: El título y favicon también se aplican temprano
- ✅ **Sin layout shift**: Width/height previenen el "salto"
- ✅ **Menos solicitudes**: Assets estáticos se cachean 1 año

## Testing

Para verificar la mejora:

1. **Limpiar localStorage** (DevTools → Application → Local Storage → Clear)
2. Recargar la página (primera visita simulada)
3. Observar que el logo aparece después del fetch
4. **Recargar nuevamente** (visita subsiguiente)
5. **El logo debería aparecer inmediatamente** sin esperar el fetch

Puedes verificar en DevTools → Network que el fetch a `/api/settings` sigue ocurriendo en background, pero el logo ya está visible desde el primer frame.
