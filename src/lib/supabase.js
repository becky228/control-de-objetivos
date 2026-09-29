import { createClient } from "@supabase/supabase-js";

// Cliente principal: aquí vive la sesión de la persona que inició sesión.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
