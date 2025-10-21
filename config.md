# Guía de Configuración - Variables de Entorno

Esta guía explica todas las variables de entorno necesarias para ejecutar **Captia**, dónde configurarlas y cómo obtener cada valor.

---

## Índice

1. [Variables Requeridas](#variables-requeridas)
2. [Variables Opcionales](#variables-opcionales)
3. [Dónde Configurar las Variables](#dónde-configurar-las-variables)
4. [Cómo Obtener Cada Valor](#cómo-obtener-cada-valor)

---

## Variables Requeridas

Estas variables son **obligatorias** para que la aplicación funcione correctamente:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Clave API de Google Gemini para procesamiento de imágenes | `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX` |
| `AIRTABLE_API_KEY` | Token de autenticación de Airtable | `patXXXXXXXXXXXXXX.XXXXXXXXXXXXXXX` |
| `AIRTABLE_BASE_ID` | ID de tu base de Airtable (empieza con `app`) | `appXXXXXXXXXXXXXX` |
| `AIRTABLE_TICKETS_TABLE` | Nombre de la tabla de tickets en Airtable | `Tickets` |
| `AIRTABLE_LINES_TABLE` | Nombre de la tabla de líneas/productos en Airtable | `Lineas_Ticket` |
| `APP_PASSWORD` | Contraseña para acceder a la aplicación | `tu_contraseña_segura` |
| `SESSION_SECRET` | Clave secreta para encriptación de JWT | `dedec242be3b4e75af3acf0ac3d62f77df4c0e8804e5a030a0e98bfce02fb1ed` |
| `GEMINI_PROMPT` | Prompt enviado a Gemini AI para extraer datos | Ver [Prompt de Gemini](#prompt-de-gemini) |

## Variables Opcionales

Estas variables son opcionales y tienen valores por defecto:

| Variable | Descripción | Valor por Defecto |
|----------|-------------|-------------------|
| `PORT` | Puerto en el que se ejecuta el servidor | `3000` |
| `BASE_PATH` | Ruta base para despliegue en subdirectorio | `` (vacío) |
| `NODE_ENV` | Entorno de ejecución (development/production) | `development` |

**Importante**: En **Vercel** debes configurar `NODE_ENV=production` para que las cookies seguras funcionen correctamente.

---

## Dónde Configurar las Variables

### Opción A: Vercel (Serverless)

1. Ve a tu proyecto en [vercel.com](https://vercel.com)
2. Click en **Settings** → **Environment Variables**
3. Agrega cada variable una por una:
   - **Key**: Nombre de la variable (ej: `GEMINI_API_KEY`)
   - **Value**: El valor correspondiente
   - **Environments**: Selecciona `Production`, `Preview`, y `Development` (recomendado)
4. Click en **Save**
5. **Redeploy** tu aplicación para que los cambios surtan efecto

**Nota**: Después de cambiar variables de entorno, Vercel hace redeploy automáticamente.

### Opción B: Servidor Tradicional (VPS, Servidor Dedicado)

#### Usando archivo `.env` (Recomendado)

1. Crea un archivo `.env` en la raíz del proyecto:
   ```bash
   nano .env
   ```

2. Copia el contenido de `.env.example` y completa los valores:
   ```bash
   cp .env.example .env
   nano .env
   ```

3. **IMPORTANTE**: Nunca subas el archivo `.env` a Git (ya está en `.gitignore`)

#### Usando variables de sistema

```bash
export GEMINI_API_KEY=tu_clave
export AIRTABLE_API_KEY=tu_token
# ... etc
npm start
```

#### Usando PM2

Crea un archivo `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'captia',
    script: './server.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      GEMINI_API_KEY: 'tu_clave',
      AIRTABLE_API_KEY: 'tu_token',
      // ... resto de variables
    }
  }]
}
```

Luego ejecuta:
```bash
pm2 start ecosystem.config.js
```

---

## Cómo Obtener Cada Valor

### 1. GEMINI_API_KEY

**Google Gemini API Key**

1. Ve a [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Inicia sesión con tu cuenta de Google
3. Click en **"Get API Key"** o **"Create API Key"**
4. Selecciona un proyecto de Google Cloud (o crea uno nuevo)
5. Copia la API Key generada
   - Formato: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

**Importante**:
- La API de Gemini tiene una cuota gratuita limitada
- Verifica los límites en: https://ai.google.dev/pricing

### 2. AIRTABLE_API_KEY

**Token de Airtable**

1. Ve a [Airtable Tokens](https://airtable.com/create/tokens)
2. Click en **"Create new token"**
3. Completa la información:
   - **Token name**: `Captia App` (o el nombre que prefieras)
   - **Scopes** (permisos necesarios):
     - ✅ `data.records:read` - Para leer tickets
     - ✅ `data.records:write` - Para crear tickets
   - **Access**: Selecciona tu base específica donde están las tablas
4. Click en **"Create token"**
5. Copia el token generado
   - Formato: `patXXXXXXXXXXXXXX.XXXXXXXXXXXXXXX`
   - **¡IMPORTANTE!**: Guárdalo inmediatamente, no podrás verlo de nuevo

**Nota**: NO uses la antigua "Airtable API Key" personal, usa los nuevos tokens con permisos específicos.

### 3. AIRTABLE_BASE_ID

**ID de tu Base de Airtable**

1. Abre tu base en [airtable.com](https://airtable.com)
2. Mira la URL en tu navegador:
   ```
   https://airtable.com/appXXXXXXXXXXXXXX/tblYYYYYYYYYYYYYY/...
                        ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑
                        Este es tu Base ID
   ```
3. Copia la parte que empieza con `app`
   - Formato: `appXXXXXXXXXXXXXX` (17 caracteres)

**Ejemplo**: Si tu URL es `https://airtable.com/appAbc123Def456/tblXYZ...`
- Tu Base ID es: `appAbc123Def456`

### 4. AIRTABLE_TICKETS_TABLE

**Nombre de la Tabla de Tickets**

1. Abre tu base en Airtable
2. Mira las **pestañas en la parte inferior** de la interfaz
3. Identifica la tabla donde guardas los tickets
4. Copia el nombre **EXACTO** (respetando mayúsculas/minúsculas)
   - Ejemplo: `Tickets`

**Estructura requerida de la tabla:**
- `Establecimiento` (Single line text)
- `Fecha` (Date)
- `Productos` (Link to another record → tabla Lineas_Ticket)

### 5. AIRTABLE_LINES_TABLE

**Nombre de la Tabla de Líneas/Productos**

1. En la misma base de Airtable
2. Identifica la tabla donde guardas los productos/líneas de cada ticket
3. Copia el nombre **EXACTO**
   - Ejemplo: `Lineas_Ticket`

**Estructura requerida de la tabla:**
- `Producto` (Single line text)
- `Unidades` (Number)
- `Precio_Unitario` (Number)
- `Ticket` (Link to another record → tabla Tickets)

### 6. APP_PASSWORD

**Contraseña de Acceso a la Aplicación**

Esta es la contraseña que usarán los usuarios para acceder a Captia.

- Elige una contraseña segura
- Ejemplo: `MiContraseñaSegura2024!`

**Nota**: Por ahora la aplicación usa una sola contraseña para todos los usuarios. Para múltiples usuarios, necesitarías implementar un sistema de autenticación más robusto.

### 7. SESSION_SECRET

**Clave Secreta para JWT**

Esta clave se usa para firmar y verificar los tokens JWT de autenticación.

**Generar una clave segura:**

Opción 1 - Desde terminal (Node.js):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Opción 2 - Online:
1. Ve a un generador de claves aleatorias como [RandomKeygen](https://randomkeygen.com/)
2. Usa una clave de al menos 64 caracteres hexadecimales

**Ejemplo de clave válida**:
```
dedec242be3b4e75af3acf0ac3d62f77df4c0e8804e5a030a0e98bfce02fb1ed
```

**IMPORTANTE**:
- Nunca compartas esta clave públicamente
- Usa una diferente para desarrollo y producción
- Si cambias esta clave, todos los usuarios deberán hacer login nuevamente

### 8. GEMINI_PROMPT

**Prompt para Gemini AI**

Este es el texto que se envía a Gemini para extraer información del ticket.

**Valor recomendado**:
```
Extrae la información del ticket y devuelve un JSON con la siguiente estructura: {establecimiento: string, fecha: string (YYYY-MM-DD), productos: [{descripcion: string, unidades: number, precio_unitario: number}]}
```

**Personalización**:
- Puedes modificar el prompt para obtener información adicional
- Si cambias la estructura del JSON, debes actualizar también:
  - La vista `edit.ejs`
  - La ruta `/save` en `server.js`
  - Las tablas de Airtable

---

## Configuración Completa de Ejemplo

### Para Vercel:

```
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
AIRTABLE_API_KEY=patXXXXXXXXXXXXXX.XXXXXXXXXXXXXXX
AIRTABLE_BASE_ID=appAbc123Def456
AIRTABLE_TICKETS_TABLE=Tickets
AIRTABLE_LINES_TABLE=Lineas_Ticket
APP_PASSWORD=MiContraseñaSegura2024!
SESSION_SECRET=dedec242be3b4e75af3acf0ac3d62f77df4c0e8804e5a030a0e98bfce02fb1ed
GEMINI_PROMPT=Extrae la información del ticket y devuelve un JSON con la siguiente estructura: {establecimiento: string, fecha: string (YYYY-MM-DD), productos: [{descripcion: string, unidades: number, precio_unitario: number}]}
NODE_ENV=production
```

### Para Servidor Local (.env):

```env
# API Keys
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
AIRTABLE_API_KEY=patXXXXXXXXXXXXXX.XXXXXXXXXXXXXXX

# Airtable Configuration
AIRTABLE_BASE_ID=appAbc123Def456
AIRTABLE_TICKETS_TABLE=Tickets
AIRTABLE_LINES_TABLE=Lineas_Ticket

# Authentication
APP_PASSWORD=MiContraseñaSegura2024!
SESSION_SECRET=dedec242be3b4e75af3acf0ac3d62f77df4c0e8804e5a030a0e98bfce02fb1ed

# Gemini AI Prompt
GEMINI_PROMPT=Extrae la información del ticket y devuelve un JSON con la siguiente estructura: {establecimiento: string, fecha: string (YYYY-MM-DD), productos: [{descripcion: string, unidades: number, precio_unitario: number}]}

# Optional Configuration
PORT=3000
BASE_PATH=
NODE_ENV=development
```

---

## Solución de Problemas Comunes

### Error: "Could not find what you are looking for" (Airtable)

**Causa**: Base ID o nombres de tablas incorrectos.

**Solución**:
1. Verifica que `AIRTABLE_BASE_ID` empiece con `app` (no con `tbl`)
2. Verifica que los nombres de las tablas coincidan **exactamente** (respetando mayúsculas)

### Error: "Failed to lookup view"

**Causa**: Problema con las rutas de archivos en entornos serverless.

**Solución**: Ya está solucionado en la versión actual del código.

### Error: "Invalid API key" (Gemini)

**Causa**: API key de Gemini incorrecta o sin permisos.

**Solución**:
1. Verifica que copiaste la clave completa
2. Genera una nueva en Google AI Studio
3. Verifica que no haya espacios al inicio/final

### Error: "INVALID_PERMISSIONS" (Airtable)

**Causa**: El token de Airtable no tiene los permisos necesarios.

**Solución**:
1. Ve a https://airtable.com/create/tokens
2. Edita tu token
3. Asegúrate de tener:
   - ✅ `data.records:read`
   - ✅ `data.records:write`
   - ✅ Acceso a tu base específica

### Los cambios no se reflejan en Vercel

**Causa**: Vercel no hizo redeploy después de cambiar variables.

**Solución**:
1. Ve a **Deployments** en Vercel
2. Click en el último deployment → "..." → **Redeploy**
3. Espera a que termine el deployment

---

## Verificar que Todo Está Configurado Correctamente

### Checklist Pre-Deploy:

- [ ] `GEMINI_API_KEY` configurada y válida
- [ ] `AIRTABLE_API_KEY` configurada con permisos correctos
- [ ] `AIRTABLE_BASE_ID` empieza con `app`
- [ ] `AIRTABLE_TICKETS_TABLE` coincide exactamente con el nombre en Airtable
- [ ] `AIRTABLE_LINES_TABLE` coincide exactamente con el nombre en Airtable
- [ ] `APP_PASSWORD` configurada (contraseña segura)
- [ ] `SESSION_SECRET` configurada (64+ caracteres aleatorios)
- [ ] `GEMINI_PROMPT` configurada
- [ ] (Vercel) `NODE_ENV=production` configurada

### Probar la Configuración:

1. **Login**: Intenta acceder a la aplicación con `APP_PASSWORD`
2. **Escanear**: Sube una foto de un ticket y verifica que Gemini la procese
3. **Editar**: Revisa que los datos extraídos se muestren correctamente
4. **Guardar**: Guarda un ticket y verifica que se cree en Airtable
5. **Mis Tickets**: Accede a la lista de tickets y verifica que se carguen

---

## Recursos Adicionales

- [Google Gemini API Documentation](https://ai.google.dev/docs)
- [Airtable API Documentation](https://airtable.com/developers/web/api/introduction)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [JWT (JSON Web Tokens)](https://jwt.io/)

---

## Soporte

Si encuentras problemas con la configuración:

1. Revisa los logs de error en Vercel (Runtime Logs) o en la consola del servidor
2. Verifica que todas las variables estén configuradas correctamente
3. Consulta la sección "Solución de Problemas Comunes" arriba
4. Revisa `CLAUDE.md` para más información sobre la arquitectura
