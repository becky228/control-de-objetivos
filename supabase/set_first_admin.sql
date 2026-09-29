-- =====================================================================
-- PASO 2 · CONVERTIR TU PRIMER USUARIO EN ADMINISTRADORA
-- =====================================================================
-- Antes de correr esto:
--   1) Ve a Supabase -> Authentication -> Users -> Add user
--   2) Crea tu usuario con tu correo y una contraseña (marca
--      "Auto Confirm User" si aparece esa opción)
--   3) Copia ese mismo correo y reemplázalo aquí abajo
--   4) Pega este script en el SQL Editor y presiona "Run"
-- =====================================================================

update public.profiles
set rol = 'admin'
where correo = 'REEMPLAZA_CON_TU_CORREO@ejemplo.com';

-- Para comprobar que quedó bien, puedes correr:
-- select nombre, correo, rol from public.profiles;
