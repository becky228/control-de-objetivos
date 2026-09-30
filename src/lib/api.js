import { supabase } from "./supabase.js";
import { zeros, dow, weekStartOf } from "./dates.js";

// ---------- Perfiles / vendedoras ----------
export async function fetchVendedoras() {
  const { data, error } = await supabase.from("profiles").select("*").eq("rol", "vendedora").order("nombre");
  if (error) throw error;
  return data;
}
export async function fetchProfile(id) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

// ---------- Metas versionadas: arma el arreglo Lun..Dom vigente para una semana ----------
// rows: [{dia_semana, valor, vigente_desde}], semanaInicioISO: lunes de la semana consultada
export function weekArrayFromRows(rows, semanaInicioISO) {
  const arr = zeros();
  for (let d = 0; d < 7; d++) {
    const candidatos = rows.filter((r) => r.dia_semana === d && r.vigente_desde <= semanaInicioISO);
    if (candidatos.length) {
      candidatos.sort((a, b) => (a.vigente_desde < b.vigente_desde ? 1 : -1));
      arr[d] = candidatos[0].valor;
    }
  }
  return arr;
}

export async function fetchMetasGlobales(vendedoraIds) {
  if (!vendedoraIds.length) return [];
  const { data, error } = await supabase
    .from("metas_globales")
    .select("*")
    .in("vendedora_id", vendedoraIds)
    .order("vigente_desde", { ascending: false });
  if (error) throw error;
  return data;
}

export async function guardarMetaGlobal(vendedoraId, variable, semanaInicioISO, arr) {
  const rows = arr.map((valor, dia_semana) => ({
    vendedora_id: vendedoraId, variable, dia_semana, valor, vigente_desde: semanaInicioISO,
  }));
  const { error } = await supabase.from("metas_globales").insert(rows);
  if (error) throw error;
}

export async function fetchMetasCuenta(cuentaIds) {
  if (!cuentaIds.length) return [];
  const { data, error } = await supabase
    .from("metas_cuenta")
    .select("*")
    .in("cuenta_id", cuentaIds)
    .order("vigente_desde", { ascending: false });
  if (error) throw error;
  return data;
}
export async function guardarMetaCuenta(cuentaId, semanaInicioISO, arr) {
  const rows = arr.map((valor, dia_semana) => ({ cuenta_id: cuentaId, dia_semana, valor, vigente_desde: semanaInicioISO }));
  const { error } = await supabase.from("metas_cuenta").insert(rows);
  if (error) throw error;
}

// ---------- Asistencia ----------
export async function fetchAsistencia({ desde, hasta, vid } = {}) {
  let q = supabase.from("attendance").select("*, profiles(nombre)").order("fecha", { ascending: false });
  if (desde) q = q.gte("fecha", desde);
  if (hasta) q = q.lte("fecha", hasta);
  if (vid) q = q.eq("user_id", vid);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}
export async function upsertAsistencia(row) {
  const { error } = await supabase.from("attendance").upsert(row, { onConflict: "user_id,fecha" });
  if (error) throw error;
}

// ---------- Registro en la APP ----------
export async function fetchRegistroApp({ desde, hasta, vid } = {}) {
  let q = supabase.from("registro_app").select("*, profiles(nombre)").order("fecha", { ascending: false });
  if (desde) q = q.gte("fecha", desde);
  if (hasta) q = q.lte("fecha", hasta);
  if (vid) q = q.eq("user_id", vid);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}
export async function upsertRegistroApp(row) {
  const { error } = await supabase.from("registro_app").upsert(row, { onConflict: "user_id,fecha" });
  if (error) throw error;
}

// ---------- Facebook ----------
export async function fetchCuentas() {
  const { data, error } = await supabase.from("facebook_accounts").select("*, profiles(nombre)").order("nombre");
  if (error) throw error;
  return data;
}
export async function fetchFbLog({ cuentaId, desde, hasta, vid } = {}) {
  let q = supabase.from("fb_publicaciones").select("*").order("fecha", { ascending: false });
  if (cuentaId) q = q.eq("cuenta_id", cuentaId);
  if (desde) q = q.gte("fecha", desde);
  if (hasta) q = q.lte("fecha", hasta);
  if (vid) q = q.eq("vendedora_id", vid);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}
export async function fetchCategorias() {
  const { data, error } = await supabase.from("categorias_fb").select("*").order("nombre");
  if (error) throw error;
  return data.map((c) => c.nombre);
}

// ---------- Puntos de mejora ----------
export async function fetchPuntos({ desde, hasta, vid } = {}) {
  let q = supabase.from("puntos_mejora").select("*, profiles!puntos_mejora_vendedora_id_fkey(nombre)").order("fecha", { ascending: false });
  if (desde) q = q.gte("fecha", desde);
  if (hasta) q = q.lte("fecha", hasta);
  if (vid) q = q.eq("vendedora_id", vid);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

// ---------- Config de bono y visibilidad ----------
export async function fetchBonoConfig() {
  const { data, error } = await supabase.from("bono_config").select("*");
  if (error) throw error;
  const cfg = {};
  data.forEach((r) => (cfg[r.clave] = r.valor));
  return cfg;
}
export async function fetchVisibilidad() {
  const { data, error } = await supabase.from("visibilidad_config").select("*");
  if (error) throw error;
  const v = {};
  data.forEach((r) => (v[r.clave] = r.valor));
  return v;
}
export async function fetchVentas() {
  const { data, error } = await supabase.from("ventas_mensuales").select("*");
  if (error) throw error;
  return data;
}

// ---------- Auditoría ----------
export async function fetchAuditoria({ vid } = {}) {
  let q = supabase.from("auditoria").select("*, admin:admin_id(nombre), vendedora:vendedora_id(nombre)").order("fecha", { ascending: false }).limit(200);
  if (vid) q = q.eq("vendedora_id", vid);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export const currentWeekStart = (todayISO) => weekStartOf(todayISO);
export const todayISO = () => new Date().toISOString().slice(0, 10);
