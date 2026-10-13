-- =====================================================================
-- MIGRACIÓN 2 · EDITAR TODO, BAJAS SEGURAS, CONTRASEÑAS, OBSERVACIÓN
-- =====================================================================
-- Pégalo completo en Supabase -> SQL Editor -> New query -> Run.
-- Se puede ejecutar más de una vez sin borrar datos.
-- EJECÚTALO ANTES de subir el código nuevo a GitHub.
-- =====================================================================

-- 1) Puntos de mejora: columna nueva "observación"
alter table public.puntos_mejora add column if not exists observacion text;

-- 2) CORRECCIÓN DE UN ERROR DEL ESQUEMA ORIGINAL
--    La auditoría automática leía new.vendedora_id en tablas que no tienen esa columna,
--    y eso hacía FALLAR cualquier edición de un registro de un día pasado.
--    Ahora funciona en todas las tablas y además registra las eliminaciones.
create or replace function public.log_edicion_pasada()
returns trigger
language plpgsql
security definer
as $$
declare
  j jsonb;
  duena uuid;
  f date;
begin
  if TG_OP = 'DELETE' then
    j := to_jsonb(old);
  else
    j := to_jsonb(new);
  end if;
  duena := coalesce((j->>'user_id')::uuid, (j->>'vendedora_id')::uuid);
  f := (j->>'fecha')::date;

  if TG_OP = 'DELETE' then
    if public.is_staff() then
      insert into public.auditoria (vendedora_id, admin_id, accion, motivo, tabla_afectada, registro_id)
      values (duena, auth.uid(), 'Registro eliminado', left('Datos: ' || j::text, 500), TG_TABLE_NAME, j->>'id');
    end if;
    return old;
  end if;

  if f < current_date and public.is_staff() then
    insert into public.auditoria (vendedora_id, admin_id, accion, motivo, tabla_afectada, registro_id)
    values (duena, auth.uid(), 'Corrección de un registro cerrado',
            'Editado el ' || to_char(now(), 'DD Mon YYYY HH24:MI'), TG_TABLE_NAME, j->>'id');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_audit_attendance on public.attendance;
create trigger trg_audit_attendance after update or delete on public.attendance
  for each row execute procedure public.log_edicion_pasada();
drop trigger if exists trg_audit_registro_app on public.registro_app;
create trigger trg_audit_registro_app after update or delete on public.registro_app
  for each row execute procedure public.log_edicion_pasada();
drop trigger if exists trg_audit_fb on public.fb_publicaciones;
create trigger trg_audit_fb after update or delete on public.fb_publicaciones
  for each row execute procedure public.log_edicion_pasada();
drop trigger if exists trg_audit_puntos on public.puntos_mejora;
create trigger trg_audit_puntos after update or delete on public.puntos_mejora
  for each row execute procedure public.log_edicion_pasada();

-- 3) Solo la administradora puede ELIMINAR registros de las vendedoras
drop policy if exists del_attendance on public.attendance;
create policy del_attendance on public.attendance for delete using (public.is_admin());
drop policy if exists del_registro on public.registro_app;
create policy del_registro on public.registro_app for delete using (public.is_admin());
drop policy if exists del_fbpub on public.fb_publicaciones;
create policy del_fbpub on public.fb_publicaciones for delete using (public.is_admin());
drop policy if exists del_pm on public.puntos_mejora;
create policy del_pm on public.puntos_mejora for delete using (public.is_admin());

-- 4) NADA SE PIERDE: si alguien borra un usuario (por error) en Supabase, antes se borraba
--    en cascada toda su información. Ahora el borrado se rechaza mientras tenga datos.
--    Para sacar a alguien se usa "Dar de baja" en la app.
do $$
declare r record; nueva text;
begin
  for r in
    select c.conrelid::regclass as tbl, c.conname, pg_get_constraintdef(c.oid) as d
    from pg_constraint c
    where c.contype = 'f'
      and (c.confrelid = 'public.profiles'::regclass
           or (c.conrelid = 'public.profiles'::regclass and c.confrelid = 'auth.users'::regclass))
  loop
    nueva := regexp_replace(r.d, ' ON DELETE (CASCADE|SET NULL)', ' ON DELETE RESTRICT');
    if nueva <> r.d then
      execute format('alter table %s drop constraint %I', r.tbl, r.conname);
      execute format('alter table %s add constraint %I %s', r.tbl, r.conname, nueva);
    end if;
  end loop;
end $$;

-- 5) Cambiar correo y/o contraseña de un usuario (solo la administradora).
--    La contraseña actual NO se puede leer (se guarda cifrada); aquí solo se PONE una nueva.
create or replace function public.admin_update_credentials(uid uuid, new_email text default null, new_password text default null)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare v_correo text;
begin
  if not public.is_admin() then
    raise exception 'Solo la administradora puede hacer esto';
  end if;
  if new_password is not null and length(new_password) > 0 then
    if length(new_password) < 6 then raise exception 'La contraseña debe tener al menos 6 caracteres'; end if;
    update auth.users set encrypted_password = crypt(new_password, gen_salt('bf')), updated_at = now() where id = uid;
  end if;
  if new_email is not null and length(trim(new_email)) > 0 then
    v_correo := lower(trim(new_email));
    if exists (select 1 from auth.users where lower(email) = v_correo and id <> uid) then
      raise exception 'Ese correo ya está en uso por otro usuario';
    end if;
    update auth.users set email = v_correo, updated_at = now() where id = uid;
    update auth.identities
       set identity_data = jsonb_set(identity_data, '{email}', to_jsonb(v_correo)), updated_at = now()
     where user_id = uid and provider = 'email';
    update public.profiles set correo = v_correo where id = uid;
  end if;
end;
$$;
revoke all on function public.admin_update_credentials(uuid, text, text) from public, anon;
grant execute on function public.admin_update_credentials(uuid, text, text) to authenticated;

-- 6) Dar de baja / reactivar: además de marcar el perfil, bloquea el inicio de sesión
--    (los datos que subió se conservan).
create or replace function public.admin_set_baja(uid uuid, baja boolean, fecha date default null)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo la administradora puede hacer esto';
  end if;
  if baja and uid = auth.uid() then
    raise exception 'No puedes darte de baja a ti misma';
  end if;
  update auth.users set banned_until = case when baja then 'infinity'::timestamptz else null end where id = uid;
  update public.profiles
     set estado = case when baja then 'Baja' else 'Activa' end,
         baja_fecha = case when baja then coalesce(fecha, current_date) else null end
   where id = uid;
end;
$$;
revoke all on function public.admin_set_baja(uuid, boolean, date) from public, anon;
grant execute on function public.admin_set_baja(uuid, boolean, date) to authenticated;

-- Comprobación: debe devolver 'f' en el SQL (sin error)
--   select proname from pg_proc where proname in ('admin_update_credentials','admin_set_baja');
