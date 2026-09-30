# TiendaOps — Guía para dejarlo funcionando

No necesitas saber programar para seguir esta guía. Son 3 partes:
**A) Supabase (la base de datos)**, **B) Netlify (donde vive la página web)**,
**C) el primer inicio de sesión**.

---

## A) Supabase — 5 minutos

1. Entra a [supabase.com](https://supabase.com), crea una cuenta y crea un **proyecto nuevo**. Elige una contraseña de base de datos y guárdala en un lugar seguro (no es la que usarás para entrar al sistema, es solo de Supabase).

2. Ve a **SQL Editor** (menú de la izquierda) → **New query**.
   Abre el archivo `supabase/schema.sql` de esta carpeta, copia **todo** su contenido, pégalo ahí y presiona **Run**.
   Esto crea todas las tablas, la seguridad y los automatismos. Es seguro volver a correrlo si algo falla a la mitad.

3. Ve a **Authentication → Providers → Email** y **desactiva** la opción "Confirm email" (o "Enable email confirmations"). Así, cuando crees usuarios nuevos, podrán entrar de inmediato sin tener que confirmar un correo.

4. Ve a **Authentication → Users → Add user**. Crea tu propio usuario con tu correo y una contraseña. Marca "Auto Confirm User" si aparece esa casilla.

5. Ve otra vez a **SQL Editor → New query**. Abre el archivo `supabase/set_first_admin.sql`, reemplaza el correo de ejemplo por el tuyo (el mismo que usaste en el paso 4), pégalo y presiona **Run**. Con esto tu usuario queda como **Administradora**.

6. Ve a **Settings → API**. Ahí vas a ver dos datos que necesitas para el siguiente paso:
   - **Project URL**
   - **Project API keys → anon / public** (a veces aparece como "Publishable key")

### Sobre archivos e imágenes (Storage)
**No necesitas crear ningún bucket.** Por ahora el sistema no guarda fotos ni archivos, así que este paso no aplica. Si más adelante quieres agregar fotos de productos, avísame y te digo exactamente qué bucket crear.

---

## B) Netlify — publicar la página web

### Opción 1: arrastrar y soltar (la más simple)
1. En tu computadora, dentro de esta carpeta, crea un archivo llamado **`.env`** (así, empezando con punto) copiando el contenido de `.env.example`, y complétalo con los dos datos del paso A6:
   ```
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-clave-anon
   ```
2. Abre una terminal en esta carpeta y ejecuta:
   ```
   npm install
   npm run build
   ```
   Esto crea una carpeta llamada **`dist`**.
3. Ve a [app.netlify.com](https://app.netlify.com), y en la pantalla principal arrastra la carpeta **`dist`** al recuadro que dice "Drag and drop your site output folder here".
4. Netlify te da un enlace (algo como `tu-sitio.netlify.app`). Esa es tu página web.

### Opción 2: conectando tu repositorio de GitHub (recomendada a futuro)
1. Sube esta carpeta a un repositorio de GitHub.
2. En Netlify: **Add new site → Import an existing project** y elige tu repositorio.
3. En **Build settings** deja: Build command `npm run build`, Publish directory `dist` (el archivo `netlify.toml` ya lo trae configurado).
4. En **Site settings → Environment variables**, agrega las mismas dos variables del paso A6:
   `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
5. Presiona **Deploy site**.

Con cualquiera de las dos opciones, el archivo `public/_redirects` (y `netlify.toml`) ya están listos para que rutas como `/admin` o `/vendedora` funcionen aunque la persona entre directo o refresque la página, tanto en computadora como en celular.

---

## C) Primer inicio de sesión

1. Abre el enlace de tu sitio en Netlify.
2. Entra con el correo y la contraseña que creaste en el paso A4. Entrarás como **Administradora**.
3. Ve a **Usuarios → Nueva vendedora** para crear a las demás personas del equipo (empleadas, vendedoras, etc.) directamente desde ahí — no necesitas volver a Supabase para esto.
4. Ve a **Configuración** para poner la ubicación de la tienda (para el check-in por GPS) y decidir qué información pueden ver las vendedoras.
5. Ve a **Cuentas Facebook** para dar de alta las cuentas y asignarlas a cada vendedora.
6. Ve a **Metas** para poner los objetivos semanales.

---

## Resumen rápido (lista de pasos)

**En Supabase:**
1. Crear el proyecto.
2. Pegar y correr `supabase/schema.sql` en el SQL Editor.
3. Desactivar "Confirm email" en Authentication → Providers → Email.
4. Crear tu usuario en Authentication → Users → Add user.
5. Pegar y correr `supabase/set_first_admin.sql` (con tu correo) en el SQL Editor.
6. Copiar el "Project URL" y la "anon key" desde Settings → API.

**En Netlify:**
7. Poner esos dos datos en un archivo `.env` (o en las variables de entorno del sitio).
8. `npm install` y `npm run build`.
9. Arrastrar la carpeta `dist` a Netlify (o conectar el repositorio).

**Ya en el sistema:**
10. Entrar con tu correo y contraseña.
11. Crear a las demás vendedoras desde "Usuarios".
12. Configurar ubicación de la tienda y metas.

---

## Qué hay en esta carpeta

- `src/` — todo el código de la aplicación (React + Vite).
- `supabase/schema.sql` — el único script que pegas en Supabase para crear todo.
- `supabase/set_first_admin.sql` — el script pequeño para volverte administradora.
- `Vista_Previa.jsx` — el archivo de vista previa visual con datos de ejemplo (el mismo que ya revisamos juntos), útil como referencia de diseño; no es parte del sistema conectado a la base de datos real.
- `.env.example` — plantilla para tus datos de conexión.
- `netlify.toml` / `public/_redirects` — configuración para que las rutas funcionen en Netlify.

## Si algo no carga
Revisa primero que el archivo `.env` (o las variables de entorno en Netlify) tengan exactamente el `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` correctos, sin espacios extra. Es la causa más común de que la página se quede en blanco o no deje iniciar sesión.

Despliegue en Vercel
