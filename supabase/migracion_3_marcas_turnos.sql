-- =====================================================================
-- MIGRACIÓN 3 · VARIAS ENTRADAS/SALIDAS, TURNOS, TARIFA POR HORA, CIERRE AUTOMÁTICO
-- =====================================================================
-- Pégalo completo en Supabase -> SQL Editor -> New query -> Run.
-- Se puede ejecutar más de una vez sin borrar datos.
-- EJECÚTALO ANTES de subir el código nuevo a GitHub.
-- Requiere haber corrido antes la migración 1 (supervisora) y la 2 (editar todo).
-- =====================================================================

-- 1) TURNOS (horario de trabajo configurable)
create table if not exists public.turnos (
  id bigserial primary key,
  nombre text not null,
  tipo text not null default 'fijo' check (tipo in ('fijo','libre')),
  hora_inicio time,                         -- libre: sin hora de entrada
  hora_fin time not null default '19:00',   -- libre: hora tope (no se cuentan horas después)
  created_at timestamptz not null default now()
);

insert into public.turnos (nombre, tipo, hora_inicio, hora_fin)
select * from (values
  ('Tiempo completo',        'fijo',  '09:00'::time, '19:00'::time),
  ('Medio tiempo · mañana',  'fijo',  '09:00'::time, '13:00'::time),
  ('Medio tiempo · tarde',   'fijo',  '14:00'::time, '19:00'::time),
  ('Libre · pago por hora',  'libre', null::time,    '19:00'::time)
) as v(nombre, tipo, hora_inicio, hora_fin)
where not exists (select 1 from public.turnos);

create table if not exists public.horario_config (
  id int primary key default 1,
  tolerancia_min int not null default 5,    -- minutos de tolerancia en la entrada
  cierre_min int not null default 10,       -- salida olvidada: se cierra sola X min después de la salida del turno
  turno_defecto bigint references public.turnos(id),
  constraint horario_una_fila check (id = 1)
);
insert into public.horario_config (id, turno_defecto)
select 1, (select id from public.turnos order by id limit 1)
on conflict (id) do nothing;

-- turno y tarifa por hora de cada usuaria
alter table public.profiles add column if not exists turno_id bigint references public.turnos(id) on delete restrict;
alter table public.profiles add column if not exists tarifa_hora numeric not null default 0;

alter table public.turnos enable row level security;
alter table public.horario_config enable row level security;
drop policy if exists sel_turnos on public.turnos;
create policy sel_turnos on public.turnos for select using (auth.uid() is not null);
drop policy if exists ins_turnos on public.turnos;
create policy ins_turnos on public.turnos for insert with check (public.is_admin());
drop policy if exists upd_turnos on public.turnos;
create policy upd_turnos on public.turnos for update using (public.is_admin());
drop policy if exists del_turnos on public.turnos;
create policy del_turnos on public.turnos for delete using (public.is_admin());
drop policy if exists sel_horario on public.horario_config;
create policy sel_horario on public.horario_config for select using (auth.uid() is not null);
drop policy if exists upd_horario on public.horario_config;
create policy upd_horario on public.horario_config for update using (public.is_admin());

-- Una vendedora NO puede cambiarse sola el turno ni la tarifa
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
as $$
begin
  if not public.is_admin() then
    new.rol := old.rol;
    new.estado := old.estado;
    new.bono_base := old.bono_base;
    new.turno_id := old.turno_id;
    new.tarifa_hora := old.tarifa_hora;
  end if;
  return new;
end;
$$;

-- 2) MARCAS DE ENTRADA / SALIDA (varias por día)
create table if not exists public.asistencia_marcas (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete restrict,
  fecha date not null default current_date,
  hora_entrada time not null,
  hora_salida time,
  motivo text,                    -- motivo de la salida (permiso, trámite, fin de jornada…)
  auto_cierre boolean not null default false,
  gps_entrada text check (gps_entrada in ('Dentro del rango','Fuera del rango')),
  lat_entrada numeric,
  lng_entrada numeric,
  gps_salida text check (gps_salida in ('Dentro del rango','Fuera del rango')),
  lat_salida numeric,
  lng_salida numeric,
  created_at timestamptz not null default now(),
  constraint marca_salida_ok check (hora_salida is null or hora_salida >= hora_entrada)
);
create index if not exists idx_marcas_user_fecha on public.asistencia_marcas (user_id, fecha);
-- no puede haber dos entradas abiertas el mismo día
create unique index if not exists uq_marca_abierta on public.asistencia_marcas (user_id, fecha) where hora_salida is null;

alter table public.asistencia_marcas enable row level security;
drop policy if exists sel_marcas on public.asistencia_marcas;
create policy sel_marcas on public.asistencia_marcas for select using (public.is_staff() or user_id = auth.uid());
drop policy if exists ins_marcas on public.asistencia_marcas;
create policy ins_marcas on public.asistencia_marcas for insert
  with check (public.is_staff() or (user_id = auth.uid() and fecha = current_date));
drop policy if exists upd_marcas on public.asistencia_marcas;
create policy upd_marcas on public.asistencia_marcas for update
  using (public.is_staff() or (user_id = auth.uid() and fecha = current_date));
drop policy if exists del_marcas on public.asistencia_marcas;
create policy del_marcas on public.asistencia_marcas for delete using (public.is_admin());

-- 2a) Protección: la vendedora no puede inventar ni cambiar horas.
--     La hora de entrada/salida la pone el SERVIDOR (hora de Bolivia). Solo el personal puede corregirlas.
create or replace function public.marcas_guard()
returns trigger
language plpgsql
security definer
as $$
declare ahora time := date_trunc('minute', now())::time;   -- hora de Bolivia (la base de datos está en America/La_Paz)
begin
  if auth.uid() is null or current_setting('app.sistema', true) = '1' or public.is_staff() then
    return new;                      -- sistema (cierre automático) o administradora/supervisora
  end if;
  if TG_OP = 'INSERT' then
    new.user_id := auth.uid();
    new.fecha := current_date;
    new.hora_entrada := ahora;
    new.hora_salida := null;
    new.auto_cierre := false;
    return new;
  end if;
  if new.user_id <> old.user_id or new.fecha <> old.fecha or new.hora_entrada <> old.hora_entrada then
    raise exception 'No puedes cambiar la hora de entrada';
  end if;
  if old.hora_salida is not null then
    if new.hora_salida is distinct from old.hora_salida then
      raise exception 'La salida ya fue marcada';
    end if;
  elsif new.hora_salida is not null then
    new.hora_salida := greatest(ahora, old.hora_entrada);
  end if;
  new.auto_cierre := old.auto_cierre;
  return new;
end;
$$;
drop trigger if exists trg_marcas_guard on public.asistencia_marcas;
create trigger trg_marcas_guard before insert or update on public.asistencia_marcas
  for each row execute procedure public.marcas_guard();

-- 2b) La tabla "attendance" pasa a ser el RESUMEN DEL DÍA (primera entrada, última salida),
--     calculado solo a partir de las marcas. Así el Panel, el bono y los reportes siguen funcionando.
create or replace function public.recalcular_asistencia(p_user uuid, p_fecha date)
returns void
language plpgsql
security definer
as $$
declare e time; s time; abierta boolean; n int; g text; prev text;
begin
  prev := coalesce(current_setting('app.recalc', true), '0');
  perform set_config('app.recalc', '1', true);
  select min(hora_entrada), count(*), bool_or(hora_salida is null), max(hora_salida),
         (array_agg(gps_entrada order by hora_entrada))[1]
    into e, n, abierta, s, g
    from public.asistencia_marcas where user_id = p_user and fecha = p_fecha;
  if n = 0 then
    delete from public.attendance where user_id = p_user and fecha = p_fecha;
  else
    insert into public.attendance (user_id, fecha, hora_entrada, hora_salida, gps_estado)
    values (p_user, p_fecha, e, case when abierta then null else s end, coalesce(g, 'Dentro del rango'))
    on conflict (user_id, fecha) do update
      set hora_entrada = excluded.hora_entrada,
          hora_salida = excluded.hora_salida,
          gps_estado = coalesce(public.attendance.gps_estado, excluded.gps_estado);
  end if;
  perform set_config('app.recalc', prev, true);
end;
$$;

create or replace function public.trg_marcas_recalc()
returns trigger
language plpgsql
security definer
as $$
begin
  if TG_OP in ('UPDATE', 'DELETE') then perform public.recalcular_asistencia(old.user_id, old.fecha); end if;
  if TG_OP in ('INSERT', 'UPDATE') then perform public.recalcular_asistencia(new.user_id, new.fecha); end if;
  return null;
end;
$$;
drop trigger if exists trg_marcas_recalc on public.asistencia_marcas;
create trigger trg_marcas_recalc after insert or update or delete on public.asistencia_marcas
  for each row execute procedure public.trg_marcas_recalc();

-- 2c) Auditoría: no registrar los recálculos automáticos; sí las correcciones y eliminaciones de la administradora
create or replace function public.log_edicion_pasada()
returns trigger
language plpgsql
security definer
as $$
declare j jsonb; duena uuid; f date;
begin
  if current_setting('app.recalc', true) = '1' or current_setting('app.sistema', true) = '1' then
    return null;
  end if;
  if TG_OP = 'DELETE' then j := to_jsonb(old); else j := to_jsonb(new); end if;
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
drop trigger if exists trg_audit_marcas on public.asistencia_marcas;
create trigger trg_audit_marcas after update or delete on public.asistencia_marcas
  for each row execute procedure public.log_edicion_pasada();

-- 3) Pasar la asistencia que ya existe a "marcas" (una marca por día). No duplica si se corre de nuevo.
insert into public.asistencia_marcas (user_id, fecha, hora_entrada, hora_salida, motivo, gps_entrada, lat_entrada, lng_entrada)
select a.user_id, a.fecha, a.hora_entrada, a.hora_salida,
       case when a.hora_salida is not null then 'Fin de jornada' end, a.gps_estado, a.lat, a.lng
from public.attendance a
where a.hora_entrada is not null
  and not exists (select 1 from public.asistencia_marcas m where m.user_id = a.user_id and m.fecha = a.fecha);

-- 4) CIERRE AUTOMÁTICO de salidas olvidadas:
--    se cierra sola a (salida del turno + cierre_min), p. ej. 19:00 + 10 min = 19:10.
--    Las horas se cuentan solo hasta la salida del turno: no hay horas extras.
create or replace function public.cerrar_salidas_olvidadas()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare n int; cm int; def bigint;
begin
  perform set_config('app.sistema', '1', true);
  select cierre_min, turno_defecto into cm, def from public.horario_config where id = 1;
  with cand as (
    select m.id, m.fecha, m.hora_entrada,
           (coalesce(t.hora_fin, '19:00'::time) + make_interval(mins => coalesce(cm, 10))) as cierre
    from public.asistencia_marcas m
    join public.profiles p on p.id = m.user_id
    left join public.turnos t on t.id = coalesce(p.turno_id, def)
    where m.hora_salida is null
  )
  update public.asistencia_marcas m
     set hora_salida = greatest(c.hora_entrada, c.cierre),
         auto_cierre = true,
         motivo = coalesce(m.motivo, 'Cierre automático')
    from cand c
   where m.id = c.id and (c.fecha < current_date or localtime >= c.cierre);
  get diagnostics n = row_count;
  perform set_config('app.sistema', '0', true);
  return n;
end;
$$;
revoke all on function public.cerrar_salidas_olvidadas() from public, anon;
grant execute on function public.cerrar_salidas_olvidadas() to authenticated;

-- Programarlo cada 10 minutos (si tu proyecto no permite pg_cron, no pasa nada:
-- la app también lo ejecuta cada vez que alguien la abre).
do $$
begin
  create extension if not exists pg_cron with schema pg_catalog;
  perform cron.schedule('cerrar-salidas-olvidadas', '*/10 * * * *', 'select public.cerrar_salidas_olvidadas()');
exception when others then
  raise notice 'pg_cron no disponible (%). La app cerrará las salidas olvidadas al abrirse.', sqlerrm;
end $$;

-- 5) Cambiar correo/contraseña y dar de baja: ya existen de la migración 2.
-- Comprobación (después de correrlo):
--   select count(*) from public.asistencia_marcas;
--   select id, nombre, tipo, hora_inicio, hora_fin from public.turnos order by id;
