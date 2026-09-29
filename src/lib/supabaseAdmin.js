import { createClient } from "@supabase/supabase-js";

/**
 * Segundo cliente de Supabase, SOLO para que la administradora cree
 * usuarios nuevos desde dentro del software (pantalla "Usuarios").
 *
 * persistSession:false es clave: crea el usuario nuevo sin reemplazar
 * la sesión de la administradora que está conectada en el cliente
 * principal (src/lib/supabase.js). No usa la service_role, así que es
 * seguro dejarlo en el código del navegador.
 */
export const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);
