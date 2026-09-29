-- =====================================================================
-- TIENDAOPS · SCRIPT ÚNICO PARA SUPABASE
-- =====================================================================
-- Copia TODO este archivo y pégalo en: Supabase -> SQL Editor -> New query
-- y presiona "Run". Crea todas las tablas, la seguridad (RLS) y los
-- automatismos que necesita la aplicación. Es seguro volver a ejecutarlo
-- si algo falla a la mitad: no borra datos que ya existan.
-- =====================================================================

-- ---------- Extensiones ----------
create extension if not exists "pgcrypto";

-- ---------- Tabla: profiles (una fila por cada persona que usa el sistema) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null default '',
  correo text not null default '',
  rol text not null default 'vendedora' check (rol in ('admin','vendedora')),
  ingreso_fecha date not null default current_date,
  bono_base numeric not null default 300,
  estado text not null default 'Activa' check (estado in ('Activa','Baja')),
  baja_fecha date,
  created_at timestamptz not null default now()
);

-- ---------- Configuración de la tienda (ubicación para el check-in GPS) ----------
create table if not exists public.store_settings (
  id int primary key default 1,
  lat numeric,
  lng numeric,
  radio_metros numeric not null default 150,
  constraint solo_una_fila check (id = 1)
);
insert into public.store_settings (id) values (1) on conflict (id) do nothing;

-- ---------- Asistencia ----------
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  fecha date not null default current_date,
  hora_entrada time,
  hora_salida time,
  lat numeric,
  lng numeric,
  gps_estado text check (gps_estado in ('Dentro del rango','Fuera del rango')),
  created_at timestamptz not null default now(),
  unique (user_id, fecha)
);

-- ---------- Registro en la APP (productos registrados por día) ----------
create table if not exists public.registro_app (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  fecha date not null default current_date,
  cantidad integer not null default 0,
  nota text,
  created_at timestamptz not null default now(),
  unique (user_id, fecha)
);

-- ---------- Categorías de Facebook Marketplace ----------
create table if not exists public.categorias_fb (
  id serial primary key,
  nombre text not null unique
);
insert into public.categorias_fb (nombre) values
  ('Auto'),('Bebé'),('Camping'),('Cocina'),('Cosméticos'),('Cotillón'),('Decoración'),
  ('Deporte'),('Halloween'),('Herramientas'),('Jardinería'),('Juguetes'),('Manualidades'),
  ('Mascotas'),('Material de escritorio'),('Mixtos'),('Muebles'),('Navidad'),('Otros'),
  ('Parrilla'),('Pesca'),('Piscina'),('Prohibidos'),('Ropa de cama'),('Salud')
on conflict (nombre) do nothing;

-- ---------- Cuentas de Facebook ----------
create table if not exists public.facebook_accounts (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  vendedora_id uuid references public.profiles(id) on delete set null,
  estado text not null default 'Activa' check (estado in ('Activa','Inactiva','Bloqueada')),
  created_at timestamptz not null default now()
);

-- ---------- Registro de publicaciones por cuenta (Fecha, Categoría, Inicio, Final, Total) ----------
create table if not exists public.fb_publicaciones (
  id uuid primary key default gen_random_uuid(),
  cuenta_id uuid not null references public.facebook_accounts(id) on delete cascade,
  vendedora_id uuid references public.profiles(id) on delete set null,
  fecha date not null default current_date,
  categoria text,
  inicio text,
  final text,
  total integer,
  created_at timestamptz not null default now()
);

-- ---------- Metas globales por vendedora (Copy / App), versionadas por semana ----------
-- Si no se agrega una fila nueva para una semana, se usa la última vigente
-- (así "si no hay cambios, se repite la semana anterior").
create table if not exists public.metas_globales (
  id bigserial primary key,
  vendedora_id uuid not null references public.profiles(id) on delete cascade,
  variable text not null check (variable in ('copy','app')),
  dia_semana smallint not null check (dia_semana between 0 and 6), -- 0=lunes ... 6=domingo
  valor integer not null default 0,
  vigente_desde date not null default current_date,
  created_at timestamptz not null default now()
);

-- ---------- Metas por cuenta de Facebook (solo Copy), versionadas por semana ----------
create table if not exists public.metas_cuenta (
  id bigserial primary key,
  cuenta_id uuid not null references public.facebook_accounts(id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 0 and 6),
  valor integer not null default 0,
  vigente_desde date not null default current_date,
  created_at timestamptz not null default now()
);

-- ---------- Puntos de mejora ----------
create table if not exists public.puntos_mejora (
  id uuid primary key default gen_random_uuid(),
  vendedora_id uuid not null references public.profiles(id) on delete cascade,
  fecha date not null default current_date,
  motivo text not null,
  gravedad text not null check (gravedad in ('Leve','Media','Fuerte')),
  descuento numeric not null default 0,
  admin_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ---------- Ventas mensuales (las llena la administradora) ----------
create table if not exists public.ventas_mensuales (
  id bigserial primary key,
  vendedora_id uuid not null references public.profiles(id) on delete cascade,
  periodo_inicio date not null,
  meta numeric not null default 0,
  logrado numeric not null default 0,
  unique (vendedora_id, periodo_inicio)
);

-- ---------- Reglas y pesos del cálculo de bono ----------
create table if not exists public.bono_config (
  clave text primary key,
  valor jsonb not null
);
insert into public.bono_config (clave, valor) values
  ('puntualidad', '{"peso":20,"p1":0,"p1pct":100,"p2":3,"p2pct":80,"p3pct":0}'),
  ('seguimiento', '{"peso":20,"s1pct":100,"sMediasMax":3,"s2pct":80,"sFuerteMax":1,"s3pct":0}'),
  ('copy', '{"peso":20,"a":100,"min":70,"b":50,"c":0}'),
  ('app', '{"peso":20,"a":100,"min":70,"b":50,"c":0}'),
  ('ventas', '{"peso":20,"a":100,"min":70,"b":50,"c":0}')
on conflict (clave) do nothing;

-- ---------- Quién puede ver cada dato sensible: "admin" o "todas" ----------
create table if not exists public.visibilidad_config (
  clave text primary key,
  valor text not null default 'admin' check (valor in ('admin','todas'))
);
insert into public.visibilidad_config (clave, valor) values
  ('asistencia','admin'), ('pendientes','admin'), ('bono','admin'), ('descuento','admin')
on conflict (clave) do nothing;

-- ---------- Auditoría ----------
create table if not exists public.auditoria (
  id bigserial primary key,
  fecha timestamptz not null default now(),
  vendedora_id uuid references public.profiles(id),
  admin_id uuid references public.profiles(id),
  accion text not null,
  motivo text,
  tabla_afectada text,
  registro_id text
);

-- =====================================================================
-- FUNCIÓN AUXILIAR: ¿la persona que está conectada es administradora?
-- (se usa en las reglas de seguridad de abajo)
-- =====================================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and rol = 'admin'
  );
$$;

-- =====================================================================
-- AL CREARSE UN USUARIO EN AUTHENTICATION, SE CREA SU PERFIL AUTOMÁTICO
-- =====================================================================
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
    coalesce(new.raw_user_meta_data->>'rol', 'vendedora'),
    coalesce((new.raw_user_meta_data->>'ingreso_fecha')::date, current_date)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =====================================================================
-- IMPIDE que una vendedora se cambie su propio rol o estado
-- =====================================================================
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
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_role_escalation on public.profiles;
create trigger trg_prevent_role_escalation
  before update on public.profiles
  for each row execute procedure public.prevent_role_escalation();

-- =====================================================================
-- AUDITORÍA AUTOMÁTICA: si la administradora corrige un registro de un
-- día ya cerrado (pasado), queda anotado solo.
-- =====================================================================
create or replace function public.log_edicion_pasada()
returns trigger
language plpgsql
security definer
as $$
begin
  if old.fecha < current_date and public.is_admin() then
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

drop trigger if exists trg_audit_attendance on public.attendance;
create trigger trg_audit_attendance after update on public.attendance
  for each row execute procedure public.log_edicion_pasada();

drop trigger if exists trg_audit_registro_app on public.registro_app;
create trigger trg_audit_registro_app after update on public.registro_app
  for each row execute procedure public.log_edicion_pasada();

drop trigger if exists trg_audit_fb on public.fb_publicaciones;
create trigger trg_audit_fb after update on public.fb_publicaciones
  for each row execute procedure public.log_edicion_pasada();

-- =====================================================================
-- SEGURIDAD (RLS): cada tabla solo deja ver/editar lo que corresponde
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.store_settings enable row level security;
alter table public.attendance enable row level security;
alter table public.registro_app enable row level security;
alter table public.categorias_fb enable row level security;
alter table public.facebook_accounts enable row level security;
alter table public.fb_publicaciones enable row level security;
alter table public.metas_globales enable row level security;
alter table public.metas_cuenta enable row level security;
alter table public.puntos_mejora enable row level security;
alter table public.ventas_mensuales enable row level security;
alter table public.bono_config enable row level security;
alter table public.visibilidad_config enable row level security;
alter table public.auditoria enable row level security;

-- profiles
drop policy if exists sel_profiles on public.profiles;
create policy sel_profiles on public.profiles for select
  using (public.is_admin() or id = auth.uid());
drop policy if exists upd_profiles on public.profiles;
create policy upd_profiles on public.profiles for update
  using (public.is_admin() or id = auth.uid());

-- store_settings: todas pueden leer, solo admin escribe
drop policy if exists sel_store on public.store_settings;
create policy sel_store on public.store_settings for select using (auth.uid() is not null);
drop policy if exists upd_store on public.store_settings;
create policy upd_store on public.store_settings for update using (public.is_admin());

-- attendance
drop policy if exists sel_attendance on public.attendance;
create policy sel_attendance on public.attendance for select
  using (public.is_admin() or user_id = auth.uid());
drop policy if exists ins_attendance on public.attendance;
create policy ins_attendance on public.attendance for insert
  with check (public.is_admin() or (user_id = auth.uid() and fecha = current_date));
drop policy if exists upd_attendance on public.attendance;
create policy upd_attendance on public.attendance for update
  using (public.is_admin() or (user_id = auth.uid() and fecha = current_date));

-- registro_app
drop policy if exists sel_registro on public.registro_app;
create policy sel_registro on public.registro_app for select
  using (public.is_admin() or user_id = auth.uid());
drop policy if exists ins_registro on public.registro_app;
create policy ins_registro on public.registro_app for insert
  with check (public.is_admin() or (user_id = auth.uid() and fecha = current_date));
drop policy if exists upd_registro on public.registro_app;
create policy upd_registro on public.registro_app for update
  using (public.is_admin() or (user_id = auth.uid() and fecha = current_date));

-- categorias_fb: todas leen, solo admin escribe
drop policy if exists sel_cat on public.categorias_fb;
create policy sel_cat on public.categorias_fb for select using (auth.uid() is not null);
drop policy if exists ins_cat on public.categorias_fb;
create policy ins_cat on public.categorias_fb for insert with check (public.is_admin());
drop policy if exists upd_cat on public.categorias_fb;
create policy upd_cat on public.categorias_fb for update using (public.is_admin());

-- facebook_accounts: la vendedora ve las suyas; solo admin crea/asigna
drop policy if exists sel_fbacc on public.facebook_accounts;
create policy sel_fbacc on public.facebook_accounts for select
  using (public.is_admin() or vendedora_id = auth.uid());
drop policy if exists ins_fbacc on public.facebook_accounts;
create policy ins_fbacc on public.facebook_accounts for insert with check (public.is_admin());
drop policy if exists upd_fbacc on public.facebook_accounts;
create policy upd_fbacc on public.facebook_accounts for update using (public.is_admin());

-- fb_publicaciones
drop policy if exists sel_fbpub on public.fb_publicaciones;
create policy sel_fbpub on public.fb_publicaciones for select
  using (public.is_admin() or vendedora_id = auth.uid());
drop policy if exists ins_fbpub on public.fb_publicaciones;
create policy ins_fbpub on public.fb_publicaciones for insert
  with check (public.is_admin() or (vendedora_id = auth.uid() and fecha = current_date));
drop policy if exists upd_fbpub on public.fb_publicaciones;
create policy upd_fbpub on public.fb_publicaciones for update
  using (public.is_admin() or (vendedora_id = auth.uid() and fecha = current_date));

-- metas_globales: la vendedora solo ve las suyas; solo admin escribe
drop policy if exists sel_metasg on public.metas_globales;
create policy sel_metasg on public.metas_globales for select
  using (public.is_admin() or vendedora_id = auth.uid());
drop policy if exists ins_metasg on public.metas_globales;
create policy ins_metasg on public.metas_globales for insert with check (public.is_admin());
drop policy if exists upd_metasg on public.metas_globales;
create policy upd_metasg on public.metas_globales for update using (public.is_admin());

-- metas_cuenta: visible si la cuenta es tuya; solo admin escribe
drop policy if exists sel_metasc on public.metas_cuenta;
create policy sel_metasc on public.metas_cuenta for select
  using (public.is_admin() or exists (
    select 1 from public.facebook_accounts fa
    where fa.id = metas_cuenta.cuenta_id and fa.vendedora_id = auth.uid()
  ));
drop policy if exists ins_metasc on public.metas_cuenta;
create policy ins_metasc on public.metas_cuenta for insert with check (public.is_admin());
drop policy if exists upd_metasc on public.metas_cuenta;
create policy upd_metasc on public.metas_cuenta for update using (public.is_admin());

-- puntos_mejora: la vendedora ve los suyos; solo admin escribe
drop policy if exists sel_pm on public.puntos_mejora;
create policy sel_pm on public.puntos_mejora for select
  using (public.is_admin() or vendedora_id = auth.uid());
drop policy if exists ins_pm on public.puntos_mejora;
create policy ins_pm on public.puntos_mejora for insert with check (public.is_admin());
drop policy if exists upd_pm on public.puntos_mejora;
create policy upd_pm on public.puntos_mejora for update using (public.is_admin());

-- ventas_mensuales
drop policy if exists sel_ventas on public.ventas_mensuales;
create policy sel_ventas on public.ventas_mensuales for select
  using (public.is_admin() or vendedora_id = auth.uid());
drop policy if exists ins_ventas on public.ventas_mensuales;
create policy ins_ventas on public.ventas_mensuales for insert with check (public.is_admin());
drop policy if exists upd_ventas on public.ventas_mensuales;
create policy upd_ventas on public.ventas_mensuales for update using (public.is_admin());

-- bono_config: todas leen, solo admin escribe
drop policy if exists sel_bc on public.bono_config;
create policy sel_bc on public.bono_config for select using (auth.uid() is not null);
drop policy if exists upd_bc on public.bono_config;
create policy upd_bc on public.bono_config for update using (public.is_admin());

-- visibilidad_config: todas leen, solo admin escribe
drop policy if exists sel_vc on public.visibilidad_config;
create policy sel_vc on public.visibilidad_config for select using (auth.uid() is not null);
drop policy if exists upd_vc on public.visibilidad_config;
create policy upd_vc on public.visibilidad_config for update using (public.is_admin());

-- auditoria: la vendedora ve lo suyo, solo admin agrega manualmente
drop policy if exists sel_aud on public.auditoria;
create policy sel_aud on public.auditoria for select
  using (public.is_admin() or vendedora_id = auth.uid());
drop policy if exists ins_aud on public.auditoria;
create policy ins_aud on public.auditoria for insert with check (public.is_admin());

-- =====================================================================
-- LISTO. Ahora sigue con el archivo "set_first_admin.sql".
-- =====================================================================
