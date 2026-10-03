-- =====================================================================
-- MIGRACIÓN · ROL SUPERVISORA + SEGURIDAD + ZONA HORARIA
-- =====================================================================
-- Pégalo completo en Supabase -> SQL Editor -> New query -> Run.
-- Se puede ejecutar más de una vez sin borrar datos.
-- EJECÚTALO ANTES de subir el código nuevo a GitHub.
-- =====================================================================

-- 1) Permitir el rol 'supervisor'
alter table public.profiles drop constraint if exists profiles_rol_check;
alter table public.profiles
  add constraint profiles_rol_check check (rol in ('admin','supervisor','vendedora'));

-- 2) "Personal": administradora o supervisora (se usa en las reglas de seguridad)
create or replace function public.is_staff()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and rol in ('admin','supervisor')
  );
$$;

-- 3) SEGURIDAD: un usuario nuevo SIEMPRE nace como vendedora.
--    Antes el rol venía de los datos del registro, y cualquiera que conociera la clave pública
--    de Supabase podía crearse una cuenta de administradora. Ahora el rol solo lo cambia una
--    administradora desde la pantalla Usuarios.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, nombre, correo, rol, ingreso_fecha)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    new.email,
    'vendedora',
    coalesce((new.raw_user_meta_data->>'ingreso_fecha')::date, current_date)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 4) La auditoría automática también registra las correcciones de la supervisora
create or replace function public.log_edicion_pasada()
returns trigger
language plpgsql
security definer
as $$
begin
  if old.fecha < current_date and public.is_staff() then
    insert into public.auditoria (vendedora_id, admin_id, accion, motivo, tabla_afectada, registro_id)
    values (
      coalesce(new.user_id, new.vendedora_id),
      auth.uid(),
      'Corrección de un registro cerrado',
      'Editado el ' || to_char(now(), 'DD Mon YYYY HH24:MI'),
      TG_TABLE_NAME,
      new.id::text
    );
  end if;
  return new;
end;
$$;

-- 5) Reglas de seguridad: la supervisora trabaja con lo operativo.
--    Sigue siendo SOLO de la administradora: editar usuarios, ubicación de la tienda,
--    visibilidad, reglas de bono y ventas mensuales.

-- profiles: la supervisora puede VER a todas (editar sigue siendo solo de admin o de la propia persona)
drop policy if exists sel_profiles on public.profiles;
create policy sel_profiles on public.profiles for select
  using (public.is_staff() or id = auth.uid());

-- attendance
drop policy if exists sel_attendance on public.attendance;
create policy sel_attendance on public.attendance for select
  using (public.is_staff() or user_id = auth.uid());
drop policy if exists ins_attendance on public.attendance;
create policy ins_attendance on public.attendance for insert
  with check (public.is_staff() or (user_id = auth.uid() and fecha = current_date));
drop policy if exists upd_attendance on public.attendance;
create policy upd_attendance on public.attendance for update
  using (public.is_staff() or (user_id = auth.uid() and fecha = current_date));

-- registro_app
drop policy if exists sel_registro on public.registro_app;
create policy sel_registro on public.registro_app for select
  using (public.is_staff() or user_id = auth.uid());
drop policy if exists ins_registro on public.registro_app;
create policy ins_registro on public.registro_app for insert
  with check (public.is_staff() or (user_id = auth.uid() and fecha = current_date));
drop policy if exists upd_registro on public.registro_app;
create policy upd_registro on public.registro_app for update
  using (public.is_staff() or (user_id = auth.uid() and fecha = current_date));

-- categorias_fb
drop policy if exists ins_cat on public.categorias_fb;
create policy ins_cat on public.categorias_fb for insert with check (public.is_staff());
drop policy if exists upd_cat on public.categorias_fb;
create policy upd_cat on public.categorias_fb for update using (public.is_staff());

-- facebook_accounts
drop policy if exists sel_fbacc on public.facebook_accounts;
create policy sel_fbacc on public.facebook_accounts for select
  using (public.is_staff() or vendedora_id = auth.uid());
drop policy if exists ins_fbacc on public.facebook_accounts;
create policy ins_fbacc on public.facebook_accounts for insert with check (public.is_staff());
drop policy if exists upd_fbacc on public.facebook_accounts;
create policy upd_fbacc on public.facebook_accounts for update using (public.is_staff());

-- fb_publicaciones
drop policy if exists sel_fbpub on public.fb_publicaciones;
create policy sel_fbpub on public.fb_publicaciones for select
  using (public.is_staff() or vendedora_id = auth.uid());
drop policy if exists ins_fbpub on public.fb_publicaciones;
create policy ins_fbpub on public.fb_publicaciones for insert
  with check (public.is_staff() or (vendedora_id = auth.uid() and fecha = current_date));
drop policy if exists upd_fbpub on public.fb_publicaciones;
create policy upd_fbpub on public.fb_publicaciones for update
  using (public.is_staff() or (vendedora_id = auth.uid() and fecha = current_date));

-- metas_globales
drop policy if exists sel_metasg on public.metas_globales;
create policy sel_metasg on public.metas_globales for select
  using (public.is_staff() or vendedora_id = auth.uid());
drop policy if exists ins_metasg on public.metas_globales;
create policy ins_metasg on public.metas_globales for insert with check (public.is_staff());
drop policy if exists upd_metasg on public.metas_globales;
create policy upd_metasg on public.metas_globales for update using (public.is_staff());

-- metas_cuenta
drop policy if exists sel_metasc on public.metas_cuenta;
create policy sel_metasc on public.metas_cuenta for select
  using (public.is_staff() or exists (
    select 1 from public.facebook_accounts fa
    where fa.id = metas_cuenta.cuenta_id and fa.vendedora_id = auth.uid()
  ));
drop policy if exists ins_metasc on public.metas_cuenta;
create policy ins_metasc on public.metas_cuenta for insert with check (public.is_staff());
drop policy if exists upd_metasc on public.metas_cuenta;
create policy upd_metasc on public.metas_cuenta for update using (public.is_staff());

-- puntos_mejora
drop policy if exists sel_pm on public.puntos_mejora;
create policy sel_pm on public.puntos_mejora for select
  using (public.is_staff() or vendedora_id = auth.uid());
drop policy if exists ins_pm on public.puntos_mejora;
create policy ins_pm on public.puntos_mejora for insert with check (public.is_staff());
drop policy if exists upd_pm on public.puntos_mejora;
create policy upd_pm on public.puntos_mejora for update using (public.is_staff());

-- auditoria
drop policy if exists sel_aud on public.auditoria;
create policy sel_aud on public.auditoria for select
  using (public.is_staff() or vendedora_id = auth.uid());
drop policy if exists ins_aud on public.auditoria;
create policy ins_aud on public.auditoria for insert with check (public.is_staff());

-- 6) Zona horaria de Bolivia: así "hoy" en la base de datos coincide con "hoy" en la tienda
--    (si no, entre las 20:00 y las 24:00 la base ya cree que es el día siguiente).
alter database postgres set timezone to 'America/La_Paz';

-- Comprobación (después de correrlo, abre una query NUEVA y ejecuta):
--   select current_date, now();
--   select nombre, correo, rol from public.profiles;
