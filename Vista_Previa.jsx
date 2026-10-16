import React, { useState } from "react";
import {
  LogIn, LayoutGrid, Clock, Package, Facebook, Target, AlertTriangle, Wallet,
  ShieldCheck, MapPin, ChevronRight, ChevronLeft, Plus, CheckCircle2, XCircle,
  Users, Eye, EyeOff, Lock, ListChecks, ArrowLeft, Check, Repeat, Download,
  UserX, UserCheck, RefreshCw, Pencil, ArrowUp, Smartphone, Settings, Crosshair, Trash2, KeyRound, CalendarDays,
} from "lucide-react";

/**
 * TiendaOps — Vista previa visual (JSX)
 * ---------------------------------------------------------------------
 * SOLO para revisar interfaz y flujos. No hay base de datos: los datos
 * son de ejemplo (generados) y la "fecha de hoy" de la demo es el
 * sábado 26 de septiembre de 2026.
 *
 * NOVEDADES (ronda 7): vendedora con botón EDITAR en "Mis cuentas de Facebook" (el día se cierra a las
 * 11:59 pm) y sección nueva "Registro en la APP" donde registra lo ejecutado.
 *
 * NOVEDADES (ronda 6): tarifa por hora en Bs · la vendedora ve el tiempo de cada marca solo del día de hoy.
 *
 * NOVEDADES (ronda 5): si olvida marcar la salida se cierra sola 10 min después de la salida del
 * turno (19:10) y NO se cuentan horas extras (el tope es la salida del turno, 19:00). Configurable.
 *
 * NOVEDADES (ronda 4): sin motivo "Almuerzo" · horas trabajadas y de permiso solo las ve la
 * administradora (con resumen por vendedora) · asignación de turnos por vendedora en Configuración ·
 * turno LIBRE para quien cobra por hora trabajada.
 *
 * NOVEDADES (ronda 3): asistencia con VARIAS entradas y salidas al día (permisos) ·
 * horario y turnos configurables (tiempo completo 9–19, medio tiempo…) · domingo opcional
 * visible en el resumen de ejecución · barra "Actualizar todo" para guardar cualquier campo.
 *
 * NOVEDADES (ronda 2): Usuarios con todos los datos editables + cambio de contraseña ·
 * baja sin perder información · la administradora edita/elimina/agrega CUALQUIER registro
 * (asistencia, registro APP, Facebook, puntos de mejora) · puntos de mejora con observación ·
 * la vendedora ve las fechas de la semana en Inicio y en Metas.
 *
 * NOVEDADES (ronda 1): se trabaja de lunes a sábado · rol Supervisora · Usuarios con
 * Editar y "Subir rol" · Pendientes con "Autorizar visibilidad" · Configuración
 * con la ubicación de la tienda · resumen de la vendedora con Copy y App ·
 * botón "Instalar app".
 *
 * CÓMO FUNCIONA "ACTUALIZAR": todo lo que editas queda como borrador y
 * solo se guarda (y lo ven las demás pantallas y las vendedoras) al
 * presionar el botón "Actualizar" de esa sección.
 * ---------------------------------------------------------------------
 */

// ---------- Tokens ----------
const ink = "#1C1B17";
const paper = "#EDEAE3";
const forest = "#16342C";
const forestLight = "#264A40";
const amber = "#D98E04";
const rust = "#C1503B";
const line = "#D8D3C6";
const muted = "#8A8676";
const slab = "'Zilla Slab', serif";

// ---------- Fechas ----------
const TODAY_ISO = "2026-09-26";
const WEEK_START = "2026-09-21";
const LOG_START = "2026-08-01";
// Se trabaja de lunes a sábado (los arreglos siguen teniendo 7 posiciones; el domingo se ignora)
const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const NDIAS = DAYS.length;
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const pad = (n) => String(n).padStart(2, "0");
const hm = (t) => { const [h, m] = (t || "0:0").split(":").map(Number); return (h || 0) * 60 + (m || 0); };
const mm = (n) => `${pad(Math.floor(n / 60))}:${pad(n % 60)}`;
const dur = (min) => `${Math.floor(min / 60)} h ${pad(min % 60)} min`;
const MOTIVOS = ["Permiso personal", "Trámite", "Salud", "Fin de jornada", "Otro"]; // el almuerzo es dentro de la tienda: no es salida
const horarioInit = {
  tolerancia: 5, cierreMin: 10, porDefecto: "t1",
  turnos: [
    { id: "t1", nombre: "Tiempo completo", tipo: "fijo", inicio: "09:00", fin: "19:00" },
    { id: "t2", nombre: "Medio tiempo · mañana", tipo: "fijo", inicio: "09:00", fin: "13:00" },
    { id: "t3", nombre: "Medio tiempo · tarde", tipo: "fijo", inicio: "14:00", fin: "19:00" },
    { id: "t4", nombre: "Libre · pago por hora", tipo: "libre", inicio: "", fin: "19:00" },
  ],
};
const turnoDeVid = (ctx, vid) => {
  const u = (ctx.usuarios || []).find((x) => x.id === vid);
  return ctx.horario.turnos.find((t) => t.id === (u?.turno || ctx.horario.porDefecto)) || ctx.horario.turnos[0];
};
const esLibre = (ctx, vid) => turnoDeVid(ctx, vid).tipo === "libre";
const limiteTarde = (ctx, vid) => (esLibre(ctx, vid) ? "" : mm(hm(turnoDeVid(ctx, vid).inicio) + (Number(ctx.horario.tolerancia) || 0)));
const esTarde = (ctx, a) => !esLibre(ctx, a.vid) && !!a.entrada && a.entrada > limiteTarde(ctx, a.vid); // turno libre: no hay retraso
const finTurno = (ctx, vid) => hm(turnoDeVid(ctx, vid).fin || "19:00");               // tope: no hay horas extras
const cierreAuto = (ctx, vid) => finTurno(ctx, vid) + (Number(ctx.horario.cierreMin) || 0); // salida olvidada se cierra sola (ej. 19:10)
// Marcas "efectivas": una salida olvidada se cierra sola si el día ya pasó o ya llegó la hora de cierre
const marcasEf = (ctx, a, ahora) => (a.marcas || []).map((m) => {
  if (m.salida) return m;
  const vencida = a.fecha < TODAY_ISO || (ahora != null && hm(ahora) >= cierreAuto(ctx, a.vid));
  return vencida ? { ...m, salida: mm(cierreAuto(ctx, a.vid)), auto: true } : m;
});
// Horas trabajadas y tiempo de permiso de un día, con tope en la salida del turno (sin horas extras)
const calc = (ctx, a, ahora) => {
  const ms = marcasEf(ctx, a, ahora), tope = finTurno(ctx, a.vid);
  const cl = (t) => Math.min(hm(t), tope);
  let horas = 0, fuera = 0;
  ms.forEach((m) => { if (m.salida) horas += Math.max(0, cl(m.salida) - cl(m.entrada)); });
  ms.slice(1).forEach((m, i) => { const p = ms[i]; if (p.salida && !p.auto) fuera += Math.max(0, cl(m.entrada) - cl(p.salida)); });
  return { horas, fuera, ms, auto: ms.some((m) => m.auto) };
};
const derivar = (a) => {
  const ms = [...(a.marcas || [])].sort((x, y) => hm(x.entrada) - hm(y.entrada));
  const ult = ms[ms.length - 1];
  return { ...a, marcas: ms, entrada: ms[0]?.entrada || "", salida: ult && ult.salida ? ult.salida : "" };
};
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toDate = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = toDate(s); d.setDate(d.getDate() + n); return iso(d); };
const dow = (s) => (toDate(s).getDay() + 6) % 7; // 0 = lunes … 6 = domingo
const fmt = (s) => { const d = toDate(s); return `${pad(d.getDate())} ${MESES[d.getMonth()]}`; };
const MESES_L = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const fmtLargo = (s) => { const d = toDate(s); return `${d.getDate()} de ${MESES_L[d.getMonth()]}`; }; // "12 de octubre"
const fmtY = (s) => `${fmt(s)} ${toDate(s).getFullYear()}`;
const maxISO = (a, b) => (a > b ? a : b);
const minISO = (a, b) => (a < b ? a : b);
const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const clampDate = (y, m, d) => new Date(y, m, Math.min(d, daysInMonth(y, m)));
const monthRange = (ym) => { const [y, m] = ym.split("-").map(Number); return [`${ym}-01`, `${ym}-${pad(daysInMonth(y, m - 1))}`]; };
const isClosed = (fecha) => fecha < TODAY_ISO; // los días se cierran a las 00:00

// Período de pago: desde el día de ingreso hasta el día anterior del mes siguiente
function cycleFor(ing, ref) {
  const dd = toDate(ing).getDate();
  const r = toDate(ref);
  let start = clampDate(r.getFullYear(), r.getMonth(), dd);
  if (start > r) start = clampDate(r.getFullYear(), r.getMonth() - 1, dd);
  const next = clampDate(start.getFullYear(), start.getMonth() + 1, dd);
  const end = new Date(next); end.setDate(end.getDate() - 1);
  return { start: iso(start), end: iso(end) };
}
function cycleBack(ing, ref, back) {
  let c = cycleFor(ing, ref);
  for (let i = 0; i < back; i++) c = cycleFor(ing, addDays(c.start, -1));
  return c;
}
const cicloLabel = (c) => `${fmt(c.start)} – ${fmt(c.end)}`;
function workdays(a, b) { let n = 0; for (let d = a; d <= b; d = addDays(d, 1)) if (dow(d) !== 6) n++; return n; }

// ---------- Datos base ----------
const CATEGORIAS_INIT = [
  "Auto", "Bebé", "Camping", "Cocina", "Cosméticos", "Cotillón", "Decoración", "Deporte",
  "Halloween", "Herramientas", "Jardinería", "Juguetes", "Manualidades", "Mascotas",
  "Material de escritorio", "Mixtos", "Muebles", "Navidad", "Otros", "Parrilla", "Pesca",
  "Piscina", "Prohibidos", "Ropa de cama", "Salud",
];

const vendedoras = [
  { id: 1, nombre: "Mich", correo: "mich@tienda.com", ingresoISO: "2025-03-10", bonoBase: 300, lateMod: 0 },
  { id: 2, nombre: "María Cotrino", correo: "maria@tienda.com", ingresoISO: "2025-06-02", bonoBase: 300, lateMod: 11 },
  { id: 3, nombre: "Elvi", correo: "elvi@tienda.com", ingresoISO: "2025-08-18", bonoBase: 300, lateMod: 2 },
  { id: 4, nombre: "Ivi", correo: "ivi@tienda.com", ingresoISO: "2026-01-12", bonoBase: 300, lateMod: 9 },
  { id: 5, nombre: "Jess Go", correo: "jess@tienda.com", ingresoISO: "2026-09-15", bonoBase: 300, lateMod: 15 },
];
const nombreDe = (id) => vendedoras.find((v) => v.id === id)?.nombre || "—";

// Una vendedora puede atender varias cuentas de Facebook (la administradora las asigna)
const cuentasInit = [
  { id: 1, nombre: "alexia", vid: 1, estado: "Activa" },
  { id: 2, nombre: "pablo", vid: 1, estado: "Activa" },
  { id: 3, nombre: "mari", vid: 2, estado: "Activa" },
  { id: 4, nombre: "nay", vid: 3, estado: "Activa" },
  { id: 5, nombre: "paola", vid: 4, estado: "Activa" },
  { id: 6, nombre: "sofi", vid: 5, estado: "Activa" },
  { id: 7, nombre: "lucas", vid: 5, estado: "Activa" },
  { id: 8, nombre: "cuenta vieja", vid: null, estado: "Inactiva" },
];
function cuentasDe(lista, vid) { return lista.filter((c) => c.vid === vid && c.estado === "Activa"); }

// Metas globales por vendedora (Copy y App) → [Lun..Dom]
const metasInit = {
  copy: { 1: [0, 20, 20, 20, 0, 20, 0], 2: [0, 15, 15, 15, 0, 15, 0], 3: [5, 10, 10, 10, 5, 10, 0], 4: [0, 15, 15, 15, 0, 15, 0], 5: [0, 20, 20, 20, 0, 20, 0] },
  app: { 1: [20, 0, 0, 0, 20, 0, 0], 2: [20, 0, 0, 0, 20, 0, 0], 3: [20, 0, 0, 0, 20, 0, 0], 4: [20, 0, 0, 0, 20, 0, 0], 5: [20, 0, 0, 0, 20, 0, 0] },
};
// Objetivo de Copy por cuenta de Facebook → [Lun..Dom]
const metasCuentaInit = {
  1: [0, 10, 10, 10, 0, 10, 0], 2: [0, 10, 10, 10, 0, 10, 0],
  3: [0, 15, 15, 15, 0, 15, 0], 4: [5, 10, 10, 10, 5, 10, 0], 5: [0, 15, 15, 15, 0, 15, 0],
  6: [0, 12, 12, 12, 0, 12, 0], 7: [0, 8, 8, 8, 0, 8, 0],
};
const metricasInit = [
  { key: "copy", label: "Copy", desc: "Publicaciones en Marketplace, por día y por usuario" },
  { key: "app", label: "App", desc: "Productos registrados en la app de control de inventario (objetivo general para todas)" },
];
const ventasInit = {
  1: { meta: 5000, logrado: 5200 }, 2: { meta: 4000, logrado: 3100 }, 3: { meta: 4000, logrado: 2500 },
  4: { meta: 3500, logrado: 3500 }, 5: { meta: 2000, logrado: 900 },
};
const puntosInit = [
  { id: 1, vid: 2, fecha: "2026-09-14", motivo: "Impuntualidad", gravedad: "Media", descuento: 5, observacion: "" },
  { id: 2, vid: 3, fecha: "2026-09-19", motivo: "Impuntualidad", gravedad: "Media", descuento: 5, observacion: "" },
  { id: 3, vid: 3, fecha: "2026-09-22", motivo: "Errores en descripción", gravedad: "Media", descuento: 3 },
  { id: 4, vid: 4, fecha: "2026-09-20", motivo: "Copy sin enlace", gravedad: "Leve", descuento: 2, observacion: "" },
];
const auditoriaInit = [
  { id: 1, fecha: "2026-09-25", hora: "09:14", vid: 3, accion: "Reapertura de registro diario", motivo: "Olvidó registrar 2 productos antes del cierre", admin: "Admin. Rosa Vega" },
  { id: 2, fecha: "2026-09-23", hora: "18:02", vid: 4, accion: "Reapertura de asistencia", motivo: "Corrección de hora de salida", admin: "Admin. Rosa Vega" },
  { id: 3, fecha: "2026-09-21", hora: "08:47", vid: 1, accion: "Cambio de cuenta Facebook asignada", motivo: "Reasignación por vacaciones", admin: "Admin. Rosa Vega" },
];
const rulesInit = {
  p1: 0, p1pct: 100, p2: 3, p2pct: 80, p3pct: 0,
  s1pct: 100, sMediasMax: 3, s2pct: 80, sFuerteMax: 1, s3pct: 0,
  copy: { a: 100, min: 70, b: 50, c: 0 },
  app: { a: 100, min: 70, b: 50, c: 0 },
  ventas: { a: 100, min: 70, b: 50, c: 0 },
};
const pesosInit = { puntualidad: 20, seguimiento: 20, copy: 20, app: 20, ventas: 20 };
const usuariosInit = vendedoras.map((v, i) => ({ id: v.id, nombre: v.nombre, correo: v.correo, rol: "Vendedora", ingresoISO: v.ingresoISO, estado: "Activa", bajaISO: null, turno: i === 2 ? "t2" : i === 3 ? "t4" : "t1", tarifa: i === 3 ? 12 : 0 }));

// ---------- Datos de ejemplo generados (asistencia, registro APP, publicaciones FB) ----------
const hsh = (a, b) => (a * 7919 + b * 104729 + a * b * 31) % 97;
function genLogs() {
  const asist = [], appLog = [], fb = [], ptr = {};
  let n = 0;
  for (let d = LOG_START; d <= TODAY_ISO; d = addDays(d, 1)) {
    const w = dow(d);
    if (w === 6) continue;
    const k = Math.floor(toDate(d).getTime() / 86400000);
    vendedoras.forEach((v) => {
      if (d < v.ingresoISO) return;
      const h = hsh(v.id, k);
      if (h % 19 === 0) return; // falta
      const late = v.lateMod && h % v.lateMod === 1;
      const aid = "a" + n++;
      const e1 = late ? `09:${pad(10 + (h % 30))}` : `08:${pad(50 + (h % 9))}`;
      const medio = vendedoras.indexOf(v) === 2; // medio tiempo mañana
      const libre = vendedoras.indexOf(v) === 3; // turno libre (pago por hora)
      const marcas = [];
      if (libre) {
        // turno libre: viene cuando puede, un solo bloque de horas
        const ini = 9 * 60 + (h % 6) * 30;
        marcas.push({ id: aid + "-0", entrada: mm(ini), salida: d === TODAY_ISO ? "" : mm(ini + 180 + (h % 4) * 30), motivo: "Fin de jornada" });
      } else if (medio) {
        marcas.push({ id: aid + "-0", entrada: e1, salida: d === TODAY_ISO ? "" : "13:00", motivo: "Fin de jornada" });
      } else if (h % 5 === 0) {
        // un permiso corto en el día (el almuerzo es dentro de la tienda, no genera salida)
        marcas.push({ id: aid + "-0", entrada: e1, salida: "10:30", motivo: "Permiso personal" });
        marcas.push({ id: aid + "-1", entrada: "11:15", salida: d === TODAY_ISO ? "" : "19:00", motivo: "Fin de jornada" });
      } else {
        marcas.push({ id: aid + "-0", entrada: e1, salida: d === TODAY_ISO || h % 7 === 3 ? "" : "19:00", motivo: "Fin de jornada" }); // h%7==3: olvidó marcar la salida
      }
      asist.push({ id: aid, vid: v.id, fecha: d, gps: h % 23 === 2 ? "Fuera del rango" : "Dentro del rango", marcas });
      const mApp = metasInit.app[v.id][w];
      if (mApp > 0) appLog.push({ id: "p" + n++, vid: v.id, fecha: d, registrados: mApp - (h % 4 === 0 ? (h % 5) + 1 : 0) });
      cuentasDe(cuentasInit, v.id).forEach((c) => {
        const m = metasCuentaInit[c.id][w];
        if (!m) return;
        const hh = hsh(c.id + 10, k);
        const total = m - (hh % 5 === 0 ? hh % 4 : 0);
        const p = ptr[c.id] || 0;
        const final = p + total + (hh % 3);
        ptr[c.id] = final;
        fb.push({ id: "f" + n++, cuentaId: c.id, vid: v.id, fecha: d, categoria: CATEGORIAS_INIT[(k + c.id) % CATEGORIAS_INIT.length], inicio: String(p + 1), final: String(final), total, links: total - (hh % 7 === 0 ? 1 : 0) });
      });
    });
  }
  // Ejemplo de domingo (día no laborable): lo que se registre aparece en el resumen de la vendedora
  const dom = addDays(WEEK_START, 6), v0 = vendedoras[0], c0 = cuentasDe(cuentasInit, v0.id)[0];
  appLog.push({ id: "p-dom", vid: v0.id, fecha: dom, registrados: 6 });
  if (c0) fb.push({ id: "f-dom", cuentaId: c0.id, vid: v0.id, fecha: dom, categoria: CATEGORIAS_INIT[0], inicio: "900", final: "906", total: 6, links: 6 });
  return { asist: asist.map(derivar), appLog, fb };
}
const GEN = genLogs();

const estadoInicial = {
  metas: metasInit, metasCuenta: metasCuentaInit, metricas: metricasInit, rules: rulesInit, pesos: pesosInit,
  extra: [], ventas: ventasInit, puntos: puntosInit, cuentas: cuentasInit, categorias: CATEGORIAS_INIT,
  fbLog: GEN.fb, appLog: GEN.appLog, asist: GEN.asist, usuarios: usuariosInit,
  vis: { asistencia: "admin", pendientes: "admin", bono: "admin", descuento: "admin" },
  horario: horarioInit,
  tienda: { lat: "", lng: "", radio: 150 },
};

// ---------- Utilidades de cálculo ----------
const sum = (a) => (a || []).reduce((x, y) => x + y, 0);
const pct = (h, m) => (m ? Math.round((h / m) * 100) : 0);
const zeros = () => [0, 0, 0, 0, 0, 0, 0];

// El objetivo global de Copy de una vendedora = suma de sus cuentas de Facebook
function effMetas(metas, metasCuenta, cuentas) {
  const copy = { ...metas.copy };
  vendedoras.forEach((v) => {
    const mis = cuentasDe(cuentas, v.id);
    if (mis.length) {
      const t = zeros();
      mis.forEach((c) => (metasCuenta[c.id] || zeros()).forEach((x, j) => { t[j] += Number(x) || 0; }));
      copy[v.id] = t;
    }
  });
  return { ...metas, copy };
}
const draftCtx = (ctx) => ({ ...ctx, ...ctx.D, metas: effMetas(ctx.D.metas, ctx.D.metasCuenta, ctx.D.cuentas) });

const hechoFor = (ctx, key, vid, a, b) => {
  if (key === "copy") return sum(ctx.fbLog.filter((e) => e.vid === vid && e.fecha >= a && e.fecha <= b).map((e) => +e.total || 0));
  if (key === "app") return sum(ctx.appLog.filter((e) => e.vid === vid && e.fecha >= a && e.fecha <= b).map((e) => +e.registrados || 0));
  return 0;
};
const metaRango = (metas, key, v, a, b) => {
  const arr = metas[key]?.[v.id];
  if (!arr) return 0;
  let t = 0;
  for (let d = maxISO(a, v.ingresoISO); d <= b; d = addDays(d, 1)) if (dow(d) < NDIAS) t += Number(arr[dow(d)]) || 0;
  return t;
};
const tier = (p, c) => (p >= 100 ? c.a : p >= c.min ? c.b : c.c);

function computeBonos(ctx) {
  const { metas, asist, puntos, rules: r, pesos, extra, ventas } = ctx;
  return vendedoras.map((v) => {
    const c = cycleFor(v.ingresoISO, TODAY_ISO);
    const a = maxISO(c.start, v.ingresoISO), b = minISO(c.end, TODAY_ISO);
    const pc = (key) => { const m = metaRango(metas, key, v, a, b); return m ? (hechoFor(ctx, key, v.id, a, b) / m) * 100 : 100; };
    const copyP = pc("copy"), appP = pc("app");
    const vt = ventas[v.id] || { meta: 0, logrado: 0 };
    const ventasP = vt.meta ? (vt.logrado / vt.meta) * 100 : 100;
    const retr = asist.filter((x) => x.vid === v.id && x.fecha >= a && x.fecha <= b && esTarde(ctx, x)).length;
    const punt = retr <= r.p1 ? r.p1pct : retr <= r.p2 ? r.p2pct : r.p3pct;
    const pv = puntos.filter((p) => p.vid === v.id && p.fecha >= c.start && p.fecha <= c.end);
    const medias = pv.filter((p) => p.gravedad === "Media").length;
    const fuertes = pv.filter((p) => p.gravedad === "Fuerte").length;
    const seg = fuertes >= r.sFuerteMax || medias > r.sMediasMax ? r.s3pct : medias >= 1 ? r.s2pct : r.s1pct;
    const copyT = tier(copyP, r.copy), appT = tier(appP, r.app), ventasT = tier(ventasP, r.ventas);
    const w = { p: +pesos.puntualidad || 0, s: +pesos.seguimiento || 0, c: +pesos.copy || 0, a: +pesos.app || 0, v: +pesos.ventas || 0 };
    const pe = sum(extra.map((e) => +e.peso || 0));
    const tot = w.p + w.s + w.c + w.a + w.v + pe || 1;
    const cum = Math.round((punt * w.p + seg * w.s + copyT * w.c + appT * w.a + ventasT * w.v + 100 * pe) / tot);
    const desc = sum(pv.map((p) => Number(p.descuento) || 0));
    const final = Math.max(0, Math.round((v.bonoBase * cum) / 100 - desc));
    return { v, c, retr, copyP, appP, ventasP, copyT, appT, ventasT, punt, seg, cum, desc, final };
  });
}

// ---------- Filtros: rango de fechas, mes completo, año y total ----------
const newFilter = (mode = "mes") => ({ mode, desde: TODAY_ISO, hasta: TODAY_ISO, mes: TODAY_ISO.slice(0, 7), anio: "2026", vid: 0 });
function passes(f, fecha, vid) {
  if (f.vid && vid !== f.vid) return false;
  if (f.mode === "dias") return fecha >= f.desde && fecha <= f.hasta;
  if (f.mode === "mes") return fecha.slice(0, 7) === f.mes;
  if (f.mode === "anio") return fecha.slice(0, 4) === f.anio;
  return true;
}
function rangeOf(f) {
  if (f.mode === "dias") return [f.desde, f.hasta];
  if (f.mode === "mes") return monthRange(f.mes);
  if (f.mode === "anio") return [`${f.anio}-01-01`, `${f.anio}-12-31`];
  return [LOG_START, TODAY_ISO];
}
const byFechaDesc = (a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0);

function descargarCSV(nombre, headers, rows) {
  try {
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    alert("La descarga no está disponible en la vista previa. En el sistema final se genera el archivo Excel.");
  }
}

// ---------- Componentes base ----------
function Tag({ children, tone = "neutral" }) {
  const tones = {
    neutral: { bg: "#fff", color: ink, border: line },
    good: { bg: "#EAF2E7", color: "#2F5D3A", border: "#B9D3B1" },
    bad: { bg: "#F6E7E3", color: rust, border: "#E7BEB3" },
    warn: { bg: "#FBEFD9", color: "#8A5A00", border: "#EFCB86" },
  };
  const t = tones[tone];
  return (
    <span className="text-xs px-2 py-1 rounded-sm inline-flex items-center gap-1 whitespace-nowrap"
      style={{ background: t.bg, color: t.color, border: `1px solid ${t.border}` }}>{children}</span>
  );
}

function SectionHeader({ eyebrow, title, action }) {
  return (
    <div className="flex items-end justify-between mb-5 pb-4 gap-4" style={{ borderBottom: `1px solid ${line}` }}>
      <div>
        <div className="text-xs tracking-wide" style={{ color: muted }}>{eyebrow}</div>
        <h2 className="text-2xl mt-1" style={{ fontFamily: slab, color: forest, fontWeight: 600 }}>{title}</h2>
      </div>
      <div className="flex items-center gap-2 flex-wrap justify-end">{action}</div>
    </div>
  );
}

function LedgerTable({ columns, rows, maxH }) {
  return (
    <div className="w-full overflow-x-auto" style={maxH ? { maxHeight: maxH, overflowY: "auto" } : {}}>
      <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${forest}`, position: "sticky", top: 0, background: paper }}>
            {columns.map((c) => (
              <th key={c} className="text-left py-2 pr-4 font-medium whitespace-nowrap" style={{ color: forest }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${line}` }}>
              {r.map((cell, j) => <td key={j} className="py-2.5 pr-4" style={{ color: ink }}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="text-xs py-4" style={{ color: muted }}>No hay registros con este filtro.</p>}
    </div>
  );
}

function PrimaryBtn({ children, onClick }) {
  return (
    <button onClick={onClick} className="text-sm px-3 py-2 flex items-center gap-1.5" style={{ background: forest, color: "#fff" }}>{children}</button>
  );
}

// Botón "Actualizar": guarda los borradores de la sección (o refresca si no hay cambios)
function SaveBtn({ ctx, keys = [] }) {
  const [flash, setFlash] = useState(false);
  const dirty = ctx.dirty(keys);
  const click = () => { ctx.save(keys); setFlash(true); setTimeout(() => setFlash(false), 1600); };
  return (
    <button onClick={click} className="text-sm px-3 py-2 flex items-center gap-1.5"
      style={{ background: dirty ? amber : "#fff", color: dirty ? "#fff" : forest, border: `1px solid ${dirty ? amber : forest}` }}>
      <RefreshCw size={14} /> {flash ? "✓ Actualizado" : "Actualizar"}
      {dirty && !flash && <span className="text-xs">· cambios sin guardar</span>}
    </button>
  );
}

function NumIn({ value, onChange, w = 44 }) {
  return (
    <input type="number" value={value} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
      className="text-sm text-center py-1" style={{ width: w, border: `1px solid ${line}`, background: "#FBFAF7" }} />
  );
}

function Prog({ hecho, meta }) {
  if (!meta) return <span style={{ color: "#B5B19E" }}>—</span>;
  const p = pct(hecho, meta);
  return (
    <div className="flex items-center gap-2">
      <div className="w-14 h-1.5" style={{ background: "#E3E0D5" }}>
        <div className="h-1.5" style={{ width: `${Math.min(100, p)}%`, background: p >= 100 ? "#2F5D3A" : amber }} />
      </div>
      <span className="text-xs whitespace-nowrap">{hecho}/{meta} · {p}%</span>
    </div>
  );
}

// Barra de filtros: rango de fechas, mes completo, año, total y vendedora
function FilterBar({ f, setF, modes = ["dias", "mes", "anio", "todo"], showVend = true }) {
  const labels = { dias: "Por día (rango)", mes: "Mes completo", anio: "Año", todo: "Total" };
  const inp = { border: `1px solid ${line}`, background: "#FBFAF7" };
  return (
    <div className="flex items-center gap-2 flex-wrap mb-4 p-2" style={{ background: "#fff", border: `1px solid ${line}` }}>
      {modes.map((m) => (
        <button key={m} onClick={() => setF({ ...f, mode: m })} className="text-xs px-2.5 py-1.5"
          style={{ background: f.mode === m ? forest : "transparent", color: f.mode === m ? "#fff" : forest, border: `1px solid ${forest}` }}>{labels[m]}</button>
      ))}
      {f.mode === "dias" && (
        <div className="flex items-center gap-1 text-xs" style={{ color: muted }}>
          De <input type="date" className="px-2 py-1.5" style={inp} value={f.desde}
            onChange={(e) => e.target.value && setF({ ...f, desde: e.target.value, hasta: f.hasta < e.target.value ? e.target.value : f.hasta })} />
          a <input type="date" className="px-2 py-1.5" style={inp} value={f.hasta} min={f.desde}
            onChange={(e) => e.target.value && setF({ ...f, hasta: e.target.value })} />
        </div>
      )}
      {f.mode === "mes" && <input type="month" className="text-xs px-2 py-1.5" style={inp} value={f.mes} onChange={(e) => e.target.value && setF({ ...f, mes: e.target.value })} />}
      {f.mode === "anio" && (
        <select className="text-xs px-2 py-1.5" style={inp} value={f.anio} onChange={(e) => setF({ ...f, anio: e.target.value })}>
          {["2025", "2026", "2027"].map((y) => <option key={y}>{y}</option>)}
        </select>
      )}
      {showVend && (
        <select className="text-xs px-2 py-1.5 ml-auto" style={inp} value={f.vid} onChange={(e) => setF({ ...f, vid: Number(e.target.value) })}>
          <option value={0}>Todas las vendedoras</option>
          {vendedoras.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
        </select>
      )}
    </div>
  );
}

// Botón que define quién puede ver un dato (se guarda con "Actualizar")
function VisToggle({ k, ctx }) {
  const [open, setOpen] = useState(false);
  const v = ctx.D.vis[k];
  const opts = [
    { v: "admin", label: "Solo administradora", icon: EyeOff },
    { v: "todas", label: "Administradora + vendedoras", icon: Eye },
  ];
  const cur = opts.find((o) => o.v === v);
  const Icon = cur.icon;
  const on = v === "todas";
  return (
    <div className="relative inline-block">
      <button onClick={() => setOpen(!open)} className="text-xs px-2 py-1.5 flex items-center gap-1.5"
        style={{ border: `1px solid ${on ? "#B9D3B1" : line}`, background: on ? "#EAF2E7" : "#fff", color: on ? "#2F5D3A" : "#6B6858" }}>
        <Icon size={12} /> Visible: {cur.label}
      </button>
      {open && (
        <div className="absolute right-0 mt-1 bg-white z-20" style={{ border: `1px solid ${line}`, minWidth: 230 }}>
          <div className="px-3 py-2 text-xs" style={{ color: muted, borderBottom: `1px solid ${line}` }}>¿Quién puede ver esto?</div>
          {opts.map((o) => (
            <button key={o.v} onClick={() => { ctx.setDraft("vis", (x) => ({ ...x, [k]: o.v })); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs flex items-center gap-2"
              style={{ color: forest, background: o.v === v ? "#F3F1EC" : "#fff" }}>
              <o.icon size={12} /> {o.label} {o.v === v && <Check size={12} className="ml-auto" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Locked({ label }) {
  return (
    <div className="p-4 text-xs flex items-center gap-2 mb-4" style={{ border: `1px dashed ${line}`, color: muted, background: "#F6F4EE" }}>
      <Lock size={13} /> {label}: tu administradora aún no habilitó esta sección.
    </div>
  );
}

// Cuadrícula Lun–Sáb con total (editable o solo lectura)
function DayGrid({ rows, totalLabel }) {
  const totalDia = (i) => sum(rows.filter((r) => r.inTotal !== false).map((r) => Number(r.arr[i]) || 0));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${forest}` }}>
            <th className="text-left py-2 pr-4 font-medium" style={{ color: forest }}></th>
            {DAYS.map((d) => <th key={d} className="py-2 px-1 font-medium text-center" style={{ color: forest }}>{d}</th>)}
            <th className="py-2 pl-3 font-medium text-right" style={{ color: forest }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} style={{ borderBottom: `1px solid ${line}` }}>
              <td className="py-2 pr-4" style={{ color: ink }}>{r.label}{r.hint && <div className="text-xs" style={{ color: muted }}>{r.hint}</div>}</td>
              {r.arr.slice(0, NDIAS).map((val, i) => (
                <td key={i} className="px-1 py-1.5 text-center">
                  {r.edit ? <NumIn value={val === 0 ? "" : val} onChange={(x) => r.edit(i, x)} />
                    : <span style={{ color: val ? ink : "#C9C5B4" }}>{val ? val : "·"}</span>}
                </td>
              ))}
              <td className="py-2 pl-3 text-right" style={{ fontFamily: slab, fontWeight: 700, color: forest }}>{sum(r.arr.slice(0, NDIAS).map(Number))}</td>
            </tr>
          ))}
          <tr style={{ borderTop: `2px solid ${forest}` }}>
            <td className="py-2 pr-4" style={{ fontWeight: 600, color: forest }}>{totalLabel}</td>
            {DAYS.map((d, i) => <td key={d} className="py-2 text-center" style={{ fontWeight: 600, color: forest }}>{totalDia(i)}</td>)}
            <td className="py-2 pl-3 text-right" style={{ fontFamily: slab, fontWeight: 700, color: amber }}>{sum(DAYS.map((_, i) => totalDia(i)))}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// Eliminar con confirmación (en la app real solo la administradora; queda en Auditoría)
function DelBtn({ onDelete, label = "Eliminar" }) {
  const [c, setC] = useState(false);
  return c ? (
    <span className="text-xs flex items-center gap-2 whitespace-nowrap">¿Eliminar?
      <button onClick={() => { onDelete(); setC(false); }} style={{ color: rust, fontWeight: 600 }}>Sí</button>
      <button onClick={() => setC(false)} style={{ color: forest }}>No</button></span>
  ) : (
    <button onClick={() => setC(true)} className="text-xs flex items-center gap-1" style={{ color: rust }}><Trash2 size={12} /> {label}</button>
  );
}

// Botón "Instalar app" (en la app real aparece solo cuando el navegador permite instalarla)
function InstallBtn({ dark }) {
  const [msg, setMsg] = useState(false);
  const c = dark ? "#CFE2D9" : forest;
  return (
    <div>
      <button onClick={() => setMsg(!msg)} className="text-xs px-2 py-1 flex items-center gap-1.5" style={{ color: c, border: `1px solid ${dark ? "#3E5A50" : forest}` }}>
        <Smartphone size={12} /> Instalar app
      </button>
      {msg && <p className="text-xs mt-1" style={{ color: c }}>En la app real se abre el aviso de instalación del navegador. En iPhone: Compartir → Añadir a pantalla de inicio.</p>}
    </div>
  );
}

// "Registro en la APP" de la vendedora: aquí llena lo que ejecutó cada día
function RegistroAppVend({ ctx, me }) {
  const [edit, setEdit] = useState(false);
  const [nuevo, setNuevo] = useState("");
  const L = ctx.D.appLog;
  const reg = L.find((a) => a.vid === me.id && a.fecha === TODAY_ISO);
  const metaDe = (fecha) => ctx.metas.app?.[me.id]?.[dow(fecha)] || 0;
  const [ms0] = monthRange(TODAY_ISO.slice(0, 7));
  const hist = L.filter((a) => a.vid === me.id && a.fecha >= ms0 && a.fecha < TODAY_ISO).sort(byFechaDesc).slice(0, 7);
  const registrar = () => {
    if (nuevo === "") return;
    ctx.setDraft("appLog", (l) => [...l, { id: "p" + Date.now(), vid: me.id, fecha: TODAY_ISO, registrados: Number(nuevo) }]);
    setNuevo("");
  };
  const cambiar = (x) => ctx.setDraft("appLog", (l) => l.map((a) => (a.id === reg.id ? { ...a, registrados: x === "" ? 0 : Number(x) } : a)));
  return (
    <div className="p-5 mb-4" style={{ background: "#fff", border: `1px solid ${line}` }}>
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <span className="text-sm" style={{ color: forest, fontWeight: 600 }}>Registro en la APP</span>
        <div className="flex items-center gap-2">
          <Tag tone="good">Hoy: {reg ? reg.registrados : 0}</Tag>
          <SaveBtn ctx={ctx} keys={["appLog"]} />
        </div>
      </div>
      <div className="text-xs mb-3" style={{ color: muted }}>Productos que registraste hoy en la app de control de inventario · Meta de hoy: <b>{metaDe(TODAY_ISO)}</b></div>

      {!reg ? (
        <div className="flex items-center gap-2 flex-wrap">
          <NumIn w={90} value={nuevo} onChange={setNuevo} />
          <PrimaryBtn onClick={registrar}><Check size={14} /> Registrar</PrimaryBtn>
        </div>
      ) : (
        <div className="flex items-center gap-3 flex-wrap">
          {edit
            ? <NumIn w={90} value={reg.registrados} onChange={cambiar} />
            : <span style={{ fontFamily: slab, fontSize: 28, fontWeight: 700, color: forest }}>{reg.registrados}</span>}
          <div className="flex-1" style={{ minWidth: 140 }}><Prog hecho={+reg.registrados || 0} meta={metaDe(TODAY_ISO)} /></div>
          {edit
            ? <button onClick={() => setEdit(false)} className="text-xs flex items-center gap-1" style={{ color: forest, fontWeight: 600 }}><Check size={12} /> Listo</button>
            : <button onClick={() => setEdit(true)} className="text-xs flex items-center gap-1" style={{ color: forest }}><Pencil size={12} /> Editar</button>}
        </div>
      )}
      <p className="text-xs mt-3" style={{ color: muted }}>Escribe cuántos productos registraste hoy en la app. Puedes editarlo hasta las 11:59 pm; después el día se cierra (🔒) y solo la administradora puede corregirlo. Presiona Actualizar para guardar.</p>

      {hist.length > 0 && (
        <div className="mt-4">
          <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
            <thead><tr style={{ borderBottom: `2px solid ${forest}`, color: forest }}>
              <th className="text-left py-1.5">Día</th><th className="text-right py-1.5">Registrados</th><th className="text-right py-1.5">Meta</th><th className="text-right py-1.5"></th>
            </tr></thead>
            <tbody>
              {hist.map((a) => (
                <tr key={a.id} style={{ borderBottom: `1px solid ${line}` }}>
                  <td className="py-1.5">{fmtY(a.fecha)}</td>
                  <td className="py-1.5 text-right">{a.registrados}</td>
                  <td className="py-1.5 text-right">{metaDe(a.fecha) || "·"}</td>
                  <td className="py-1.5 text-right" style={{ color: muted }}><Lock size={11} className="inline" /> cerrado</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Asistencia de hoy de la vendedora: varias entradas y salidas durante el día
function AsistenciaHoy({ ctx, me }) {
  const [hora, setHora] = useState("15:30"); // hora simulada: en la app real es la hora del celular
  const [saliendo, setSaliendo] = useState(false);
  const [motivo, setMotivo] = useState("Permiso personal");
  const [aviso, setAviso] = useState("");
  const reg = ctx.D.asist.find((a) => a.vid === me.id && a.fecha === TODAY_ISO);
  const ms = reg ? marcasEf(ctx, reg, hora) : []; // incluye el cierre automático si ya pasó la hora
  const abierta = ms.find((m) => !m.salida);
  const ult = ms[ms.length - 1];
  const turno = turnoDeVid(ctx, me.id);
  const sel = { border: `1px solid ${line}`, background: "#FBFAF7" };
  const aplicar = (fn) => ctx.apply("asist", (l) => {
    const ex = l.find((a) => a.vid === me.id && a.fecha === TODAY_ISO);
    return ex ? l.map((a) => (a.id === ex.id ? derivar(fn(a)) : a)) : [...l, derivar(fn({ id: "a" + Date.now(), vid: me.id, fecha: TODAY_ISO, gps: "Dentro del rango", marcas: [] }))];
  });
  const entrar = () => {
    if (ult?.salida && hm(hora) < hm(ult.salida)) return setAviso(`La hora no puede ser anterior a tu última salida (${ult.salida}).`);
    setAviso(""); aplicar((a) => ({ ...a, marcas: [...a.marcas, { id: "m" + Date.now(), entrada: hora, salida: "", motivo: "" }] }));
  };
  const salir = () => {
    if (abierta && hm(hora) < hm(abierta.entrada)) return setAviso(`La hora no puede ser anterior a tu entrada (${abierta.entrada}).`);
    setAviso(""); aplicar((a) => ({ ...a, marcas: a.marcas.map((m) => (m.id === abierta.id ? { ...m, salida: hora, motivo } : m)) }));
    setSaliendo(false);
  };
  const setMotivoMarca = (mid, val) => ctx.setDraft("asist", (l) => l.map((a) => (a.id === reg.id ? { ...a, marcas: a.marcas.map((m) => (m.id === mid ? { ...m, motivo: val } : m)) } : a)));
  const tarde = reg && esTarde(ctx, reg);
  return (
    <div className="p-5 mb-4" style={{ background: "#fff", border: `1px solid ${line}` }}>
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <span className="text-sm" style={{ color: forest, fontWeight: 600 }}>Asistencia de hoy</span>
        <div className="flex items-center gap-2">{reg ? gpsTag(reg.gps) : <Tag tone="bad"><XCircle size={12} /> Sin registro</Tag>}<SaveBtn ctx={ctx} keys={["asist"]} /></div>
      </div>
      <div className="text-xs mb-3" style={{ color: muted }}>Tu turno: <b>{turno.nombre}</b>{turno.tipo === "libre" ? " · vienes cuando puedes" : ` · ${turno.inicio} – ${turno.fin}`}{tarde && <span className="ml-2"><Tag tone="warn">Entraste después de las {limiteTarde(ctx, me.id)}</Tag></span>}</div>

      <div className="p-3 mb-3 text-sm flex items-center gap-2" style={{ background: abierta ? "#E6F0E6" : ms.length ? "#FBEFD9" : "#F4F1EA", color: abierta ? "#2F5D3A" : ms.length ? "#8A5A00" : muted }}>
        <Clock size={14} />
        {abierta ? <>En la tienda desde las <b>{abierta.entrada}</b></> : ult ? <>Fuera de la tienda desde las <b>{ult.salida}</b>{ult.motivo ? ` · ${ult.motivo}` : ""}</> : "Todavía no marcaste tu entrada de hoy"}
      </div>

      <div className="flex items-center gap-2 mb-3 text-xs" style={{ color: muted }}>
        Hora actual (simulada en la vista previa): <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="px-2 py-1 text-sm" style={sel} />
      </div>

      <div className="flex gap-2 mb-1">
        <button onClick={entrar} disabled={!!abierta} className="flex-1 py-2 text-sm disabled:opacity-40" style={{ background: forest, color: "#fff" }}>{ms.length ? "Volver a entrar" : "Marcar entrada"}</button>
        <button onClick={() => setSaliendo(!saliendo)} disabled={!abierta} className="flex-1 py-2 text-sm disabled:opacity-40" style={{ background: "#fff", color: forest, border: `1px solid ${forest}` }}>Salir / pedir permiso</button>
      </div>
      {saliendo && abierta && (
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <select className="px-2 py-2 text-sm" style={sel} value={motivo} onChange={(e) => setMotivo(e.target.value)}>{MOTIVOS.map((x) => <option key={x}>{x}</option>)}</select>
          <PrimaryBtn onClick={salir}><Check size={14} /> Confirmar salida {hora}</PrimaryBtn>
        </div>
      )}
      {aviso && <p className="text-xs mt-2" style={{ color: rust }}>{aviso}</p>}
      <p className="text-xs mt-2" style={{ color: muted }}>Cada entrada y salida se guarda al momento de marcarla (con tu ubicación). El motivo se puede cambiar y se guarda con "Actualizar". Si olvidas marcar tu salida, el sistema la cierra solo a las {mm(cierreAuto(ctx, me.id))}. El tiempo de cada marca solo se muestra durante el día de hoy.</p>

      {ms.length > 0 && (
        <div className="mt-4">
          <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
            <thead><tr style={{ borderBottom: `2px solid ${forest}`, color: forest }}>
              <th className="text-left py-1.5">Entrada</th><th className="text-left py-1.5">Salida</th><th className="text-left py-1.5">Motivo</th><th className="text-right py-1.5">Tiempo</th>
            </tr></thead>
            <tbody>
              {ms.map((m) => (
                <tr key={m.id} style={{ borderBottom: `1px solid ${line}` }}>
                  <td className="py-1.5">{m.entrada}</td>
                  <td className="py-1.5">{m.salida ? <span className="whitespace-nowrap">{m.salida}{m.auto && <> <Tag tone="warn">automática</Tag></>}</span> : <Tag tone="good">en la tienda</Tag>}</td>
                  <td className="py-1.5">{m.auto ? <span style={{ color: muted }}>Cierre automático</span> : m.salida
                    ? <select className="text-xs px-1 py-0.5" style={sel} value={m.motivo || ""} onChange={(e) => setMotivoMarca(m.id, e.target.value)}><option value="">—</option>{MOTIVOS.map((x) => <option key={x}>{x}</option>)}</select>
                    : "—"}</td>
                  <td className="py-1.5 text-right">{m.salida ? dur(Math.max(0, Math.min(hm(m.salida), finTurno(ctx, me.id)) - Math.min(hm(m.entrada), finTurno(ctx, me.id)))) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------- Login ----------
function LoginScreen({ onLogin }) {
  return (
    <div className="min-h-full flex items-center justify-center py-16" style={{ background: paper }}>
      <div className="w-full max-w-sm px-8 py-10" style={{ background: "#fff", border: `1px solid ${line}` }}>
        <div className="mb-8">
          <div className="w-9 h-9 flex items-center justify-center mb-4" style={{ background: forest }}>
            <span style={{ color: amber, fontFamily: slab, fontWeight: 700 }}>T</span>
          </div>
          <h1 style={{ fontFamily: slab, color: forest, fontSize: 26, fontWeight: 600 }}>TiendaOps</h1>
          <p className="text-sm mt-1" style={{ color: "#6B6858" }}>Ingresa con tu correo y contraseña.</p>
        </div>
        <label className="block text-xs mb-1" style={{ color: "#6B6858" }}>Correo</label>
        <input className="w-full mb-4 px-3 py-2 text-sm" style={{ border: `1px solid ${line}`, background: "#FBFAF7" }} placeholder="tunombre@tienda.com" readOnly />
        <label className="block text-xs mb-1" style={{ color: "#6B6858" }}>Contraseña</label>
        <input className="w-full mb-6 px-3 py-2 text-sm" type="password" style={{ border: `1px solid ${line}`, background: "#FBFAF7" }} placeholder="••••••••" readOnly />
        <button onClick={() => onLogin("admin")} className="w-full py-2.5 text-sm mb-2 flex items-center justify-center gap-2" style={{ background: forest, color: "#fff" }}>
          <LogIn size={15} /> Entrar como Administradora
        </button>
        <button onClick={() => onLogin("supervisora")} className="w-full py-2.5 text-sm mb-2 flex items-center justify-center gap-2" style={{ background: "#fff", color: forest, border: `1px solid ${forest}` }}>
          <LogIn size={15} /> Entrar como Supervisora
        </button>
        <button onClick={() => onLogin("vendedora")} className="w-full py-2.5 text-sm flex items-center justify-center gap-2" style={{ background: "#fff", color: forest, border: `1px solid ${forest}` }}>
          <LogIn size={15} /> Entrar como Vendedora
        </button>
        <p className="text-xs mt-6" style={{ color: "#9B977F" }}>Vista previa — estos botones simulan el inicio de sesión real.</p>
      </div>
    </div>
  );
}

// ---------- Panel Administradora ----------
const adminNav = [
  { key: "dashboard", label: "Panel general", icon: LayoutGrid },
  { key: "usuarios", label: "Usuarios", icon: Users, soloAdmin: true },
  { key: "asistencia", label: "Asistencia", icon: Clock },
  { key: "registroapp", label: "Registro en la APP", icon: Package },
  { key: "facebook", label: "Cuentas Facebook", icon: Facebook },
  { key: "pendientes", label: "Pendientes", icon: ListChecks },
  { key: "metas", label: "Metas", icon: Target },
  { key: "puntos", label: "Puntos de mejora", icon: AlertTriangle },
  { key: "bonificaciones", label: "Bonificaciones", icon: Wallet, soloAdmin: true },
  { key: "auditoria", label: "Auditoría", icon: ShieldCheck },
  { key: "configuracion", label: "Configuración", icon: Settings, soloAdmin: true },
];

function AdminPanel({ ctx, esAdmin = true }) {
  const [tab, setTab] = useState("dashboard");
  const items = adminNav.filter((i) => esAdmin || !i.soloAdmin);
  return (
    <div className="min-h-full flex" style={{ background: paper }}>
      <div className="w-56 shrink-0 py-6 px-4" style={{ background: forest }}>
        <div className="px-2 mb-8">
          <div style={{ color: amber, fontFamily: slab, fontSize: 20, fontWeight: 700 }}>TiendaOps</div>
          <div className="text-xs mt-0.5" style={{ color: "#9FC2B4" }}>{esAdmin ? "Administradora" : "Supervisora"}</div>
        </div>
        <nav className="flex flex-col gap-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const active = tab === item.key;
            return (
              <button key={item.key} onClick={() => setTab(item.key)} className="flex items-center gap-2.5 px-3 py-2 text-sm text-left"
                style={{ background: active ? forestLight : "transparent", color: active ? amber : "#CFE2D9" }}>
                <Icon size={15} /> {item.label}
              </button>
            );
          })}
        </nav>
        <div className="mt-6"><InstallBtn dark /></div>
      </div>
      <div className="flex-1 min-w-0 px-8 py-8">
        {tab === "dashboard" && <AdminDashboard ctx={ctx} />}
        {tab === "usuarios" && <AdminUsuarios ctx={ctx} />}
        {tab === "asistencia" && <AdminAsistencia ctx={ctx} />}
        {tab === "registroapp" && <AdminRegistroApp ctx={ctx} />}
        {tab === "facebook" && <AdminFacebook ctx={ctx} />}
        {tab === "pendientes" && <AdminPendientes ctx={ctx} />}
        {tab === "metas" && <AdminMetas ctx={ctx} />}
        {tab === "puntos" && <AdminPuntos ctx={ctx} />}
        {tab === "bonificaciones" && <AdminBonos ctx={ctx} />}
        {tab === "auditoria" && <AdminAuditoria ctx={ctx} />}
        {tab === "configuracion" && <AdminConfiguracion ctx={ctx} />}
      </div>
    </div>
  );
}

function gpsTag(estado) {
  return (
    <Tag tone={estado === "Dentro del rango" ? "good" : "warn"}>
      {estado === "Dentro del rango" ? <CheckCircle2 size={12} /> : <MapPin size={12} />} {estado}
    </Tag>
  );
}
const cierreTag = (fecha) => (isClosed(fecha)
  ? <Tag tone="neutral"><Lock size={11} /> Cerrado 00:00</Tag>
  : <Tag tone="good">Abierto hasta 00:00</Tag>);

function AdminDashboard({ ctx }) {
  const [f, setF] = useState(newFilter("mes"));
  const { metas, metricas, asist } = ctx;
  const vs = vendedoras.filter((v) => !f.vid || v.id === f.vid);
  const bonos = computeBonos(ctx);
  const weekEnd = addDays(WEEK_START, 6);
  const [ms] = monthRange(TODAY_ISO.slice(0, 7));
  const [pa, pb] = rangeOf(f);

  const totals = (key) => {
    let mw = 0, hw = 0;
    vendedoras.forEach((v) => { mw += metaRango(metas, key, v, WEEK_START, weekEnd); hw += hechoFor(ctx, key, v.id, WEEK_START, weekEnd); });
    return pct(hw, mw);
  };
  const presentes = asist.filter((a) => a.fecha === TODAY_ISO).length;
  const stats = [
    { label: "Presentes hoy", value: `${presentes} / ${vendedoras.length}` },
    { label: "Copy · cumplimiento semanal", value: `${totals("copy")}%` },
    { label: "App · cumplimiento semanal", value: `${totals("app")}%` },
  ];

  return (
    <div>
      <SectionHeader eyebrow="Hoy · sábado 26 de septiembre (fecha de la demo)" title="Panel general" action={<SaveBtn ctx={ctx} keys={["vis"]} />} />
      <FilterBar f={f} setF={setF} />
      <div className="flex gap-10 mb-8 pb-6 flex-wrap" style={{ borderBottom: `1px solid ${line}` }}>
        {stats.map((s) => (
          <div key={s.label}>
            <div style={{ fontFamily: slab, fontSize: 28, color: forest, fontWeight: 600 }}>{s.value}</div>
            <div className="text-xs mt-1" style={{ color: muted }}>{s.label}</div>
          </div>
        ))}
        <div>
          <div style={{ fontFamily: slab, fontSize: 28, color: forest, fontWeight: 600 }}>${sum(bonos.map((b) => b.final))}</div>
          <div className="text-xs mt-1 mb-1.5" style={{ color: muted }}>Bono acumulado del mes</div>
          <VisToggle k="bono" ctx={ctx} />
        </div>
      </div>

      <h3 className="text-sm mb-3" style={{ color: forest, fontWeight: 600 }}>Cumplimiento de metas · semanal y mensual (a la fecha)</h3>
      <LedgerTable
        columns={["Vendedora", ...metricas.flatMap((m) => [`${m.label} · semana`, `${m.label} · mes`])]}
        rows={vs.map((v) => [
          v.nombre,
          ...metricas.flatMap((m) => [
            <Prog hecho={hechoFor(ctx, m.key, v.id, WEEK_START, weekEnd)} meta={metaRango(metas, m.key, v, WEEK_START, weekEnd)} />,
            <Prog hecho={hechoFor(ctx, m.key, v.id, ms, TODAY_ISO)} meta={metaRango(metas, m.key, v, ms, TODAY_ISO)} />,
          ]),
        ])}
      />

      <div className="mt-10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm" style={{ color: forest, fontWeight: 600 }}>Asistencia · según el filtro de período</h3>
          <VisToggle k="asistencia" ctx={ctx} />
        </div>
        <LedgerTable
          columns={["Vendedora", "Días presentes", "Retrasos", "Fuera de rango"]}
          rows={vs.map((v) => {
            const r = asist.filter((a) => a.vid === v.id && a.fecha >= pa && a.fecha <= pb);
            return [v.nombre, r.length, r.filter((a) => esTarde(ctx, a)).length, r.filter((a) => a.gps === "Fuera del rango").length];
          })}
        />
      </div>
    </div>
  );
}

const ROL_SIG = { Vendedora: "Supervisora", Supervisora: "Administradora" }; // "Subir rol"

function AdminUsuarios({ ctx }) {
  const lista = ctx.D.usuarios;
  const [abierto, setAbierto] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [subir, setSubir] = useState(null);
  const [edit, setEdit] = useState(null);
  const [f, setF] = useState({ nombre: "", correo: "", pass: "", ingreso: "", rol: "Vendedora", turno: ctx.horario.porDefecto });
  const inp = { border: `1px solid ${line}`, background: "#FBFAF7" };
  const lbl = (t) => <label className="block text-xs mb-1" style={{ color: muted }}>{t}</label>;

  const guardar = () => {
    if (!f.nombre || !f.correo || !f.ingreso) return;
    ctx.setDraft("usuarios", (l) => [...l, { id: "u" + Date.now(), nombre: f.nombre, correo: f.correo, rol: f.rol, ingresoISO: f.ingreso, estado: "Activa", bajaISO: null, turno: f.turno }]);
    setF({ nombre: "", correo: "", pass: "", ingreso: "", rol: "Vendedora", turno: ctx.horario.porDefecto });
    setAbierto(false);
  };
  const cambiar = (id, estado) => {
    ctx.setDraft("usuarios", (l) => l.map((u) => (u.id === id ? { ...u, estado, bajaISO: estado === "Baja" ? TODAY_ISO : null } : u)));
    setConfirm(null);
  };
  const subirRol = (u) => {
    ctx.setDraft("usuarios", (l) => l.map((x) => (x.id === u.id ? { ...x, rol: ROL_SIG[u.rol] } : x)));
    setSubir(null);
  };
  const [verPass, setVerPass] = useState(false);
  const [msgPass, setMsgPass] = useState("");
  const generar = () => {
    const abc = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let p = ""; for (let i = 0; i < 9; i++) p += abc[Math.floor(Math.random() * abc.length)];
    setEdit({ ...edit, pass: p }); setVerPass(true);
  };
  const guardarEdicion = () => {
    ctx.setDraft("usuarios", (l) => l.map((x) => (x.id === edit.id
      ? { ...x, nombre: edit.nombre, correo: edit.correo, ingresoISO: edit.ingresoISO, rol: edit.rol, turno: edit.turno, tarifa: edit.tarifa || 0, estado: edit.estado, bajaISO: edit.estado === "Baja" ? (edit.bajaISO || TODAY_ISO) : null }
      : x)));
    setMsgPass(edit.pass ? "Contraseña nueva para " + edit.nombre + ": " + edit.pass + "  (anótala y entrégasela; después ya no se puede ver)" : "");
    setEdit(null);
  };

  return (
    <div>
      <SectionHeader eyebrow="Alta, edición y baja de personal" title="Usuarios"
        action={<><SaveBtn ctx={ctx} keys={["usuarios"]} /><PrimaryBtn onClick={() => setAbierto(!abierto)}><Plus size={14} /> Nuevo usuario</PrimaryBtn></>} />
      {abierto && (
        <div className="bg-white p-5 mb-6" style={{ border: `1px solid ${line}`, borderLeft: `3px solid ${amber}` }}>
          <div className="grid grid-cols-2 gap-4">
            <div>{lbl("Nombre")}<input className="w-full px-3 py-2 text-sm" style={inp} value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></div>
            <div>{lbl("Correo")}<input className="w-full px-3 py-2 text-sm" style={inp} value={f.correo} onChange={(e) => setF({ ...f, correo: e.target.value })} /></div>
            <div>{lbl("Contraseña temporal")}<input className="w-full px-3 py-2 text-sm" style={inp} value={f.pass} onChange={(e) => setF({ ...f, pass: e.target.value })} /></div>
            <div>{lbl("Fecha de ingreso (contratación)")}<input type="date" className="w-full px-3 py-2 text-sm" style={inp} value={f.ingreso} onChange={(e) => setF({ ...f, ingreso: e.target.value })} /></div>
            <div>{lbl("Rol")}
              <select className="w-full px-3 py-2 text-sm" style={inp} value={f.rol} onChange={(e) => setF({ ...f, rol: e.target.value })}>
                <option>Vendedora</option><option>Supervisora</option><option>Administradora</option>
              </select></div>
            <div>{lbl("Turno de trabajo")}
              <select className="w-full px-3 py-2 text-sm" style={inp} value={f.turno} onChange={(e) => setF({ ...f, turno: e.target.value })}>
                {ctx.horario.turnos.map((t) => <option key={t.id} value={t.id}>{t.nombre}{t.tipo === "libre" ? "" : " · " + t.inicio + "–" + t.fin}</option>)}
              </select></div>
          </div>
          <p className="text-xs mt-3" style={{ color: muted }}>
            La fecha de ingreso define su período de pago: cada mes cierra el día anterior a su fecha de ingreso (ej. ingreso el 10 → del 10 al 9 del mes siguiente). Metas y acumulados empiezan de cero en cada período.
          </p>
          <div className="mt-4"><PrimaryBtn onClick={guardar}><Check size={14} /> Agregar a la lista</PrimaryBtn></div>
        </div>
      )}
      {msgPass && (
        <div className="p-3 mb-4 text-sm flex items-start justify-between gap-3" style={{ background: "#E6F0E6", border: "1px solid #B9D3B9", color: "#2F5D3A" }}>
          <span><KeyRound size={14} className="inline mr-1" />{msgPass}</span>
          <button onClick={() => setMsgPass("")} className="text-xs underline">Cerrar</button>
        </div>
      )}
      {edit && (
        <div className="bg-white p-5 mb-6" style={{ border: `1px solid ${line}`, borderLeft: `3px solid ${forest}` }}>
          <div className="text-sm mb-3" style={{ color: forest, fontWeight: 600 }}>Editar usuario · todos sus datos</div>
          <div className="grid grid-cols-2 gap-4">
            <div>{lbl("Nombre")}<input className="w-full px-3 py-2 text-sm" style={inp} value={edit.nombre} onChange={(e) => setEdit({ ...edit, nombre: e.target.value })} /></div>
            <div>{lbl("Correo (con el que inicia sesión)")}<input className="w-full px-3 py-2 text-sm" style={inp} value={edit.correo} onChange={(e) => setEdit({ ...edit, correo: e.target.value })} /></div>
            <div>{lbl("Fecha de ingreso (contratación)")}<input type="date" className="w-full px-3 py-2 text-sm" style={inp} value={edit.ingresoISO} onChange={(e) => setEdit({ ...edit, ingresoISO: e.target.value })} /></div>
            <div>{lbl("Rol")}
              <select className="w-full px-3 py-2 text-sm" style={inp} value={edit.rol} onChange={(e) => setEdit({ ...edit, rol: e.target.value })}>
                <option>Vendedora</option><option>Supervisora</option><option>Administradora</option>
              </select></div>
            <div>{lbl("Turno de trabajo")}
              <select className="w-full px-3 py-2 text-sm" style={inp} value={edit.turno || ctx.horario.porDefecto} onChange={(e) => setEdit({ ...edit, turno: e.target.value })}>
                {ctx.horario.turnos.map((t) => <option key={t.id} value={t.id}>{t.nombre}{t.tipo === "libre" ? "" : " · " + t.inicio + "–" + t.fin}</option>)}
              </select></div>
            {(ctx.horario.turnos.find((t) => t.id === (edit.turno || ctx.horario.porDefecto)) || {}).tipo === "libre" && (
              <div>{lbl("Tarifa por hora (Bs)")}<input type="number" className="w-full px-3 py-2 text-sm" style={inp} value={edit.tarifa || 0} onChange={(e) => setEdit({ ...edit, tarifa: Number(e.target.value) })} /></div>
            )}
            <div>{lbl("Estado")}
              <select className="w-full px-3 py-2 text-sm" style={inp} value={edit.estado} onChange={(e) => setEdit({ ...edit, estado: e.target.value, bajaISO: e.target.value === "Baja" ? (edit.bajaISO || TODAY_ISO) : null })}>
                <option>Activa</option><option>Baja</option>
              </select></div>
            <div>{lbl("Fecha de baja")}<input type="date" disabled={edit.estado !== "Baja"} className="w-full px-3 py-2 text-sm disabled:opacity-50" style={inp} value={edit.bajaISO || ""} onChange={(e) => setEdit({ ...edit, bajaISO: e.target.value })} /></div>
            <div className="col-span-2">{lbl("Contraseña")}
              <div className="flex gap-2 items-center flex-wrap">
                <input type={verPass ? "text" : "password"} placeholder="Escribe una nueva o genérala (vacío = no cambiar)" className="px-3 py-2 text-sm flex-1" style={{ ...inp, minWidth: 240 }} value={edit.pass || ""} onChange={(e) => setEdit({ ...edit, pass: e.target.value })} />
                <button onClick={() => setVerPass(!verPass)} className="p-2" style={{ border: `1px solid ${line}`, background: "#fff", color: forest }}>{verPass ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                <button onClick={generar} className="text-xs px-3 py-2 flex items-center gap-1" style={{ border: `1px solid ${forest}`, color: forest, background: "#fff" }}><KeyRound size={13} /> Generar</button>
              </div>
              <p className="text-xs mt-1" style={{ color: muted }}>La contraseña actual no se puede ver: se guarda cifrada y nadie, ni Supabase, puede leerla. Sí puedes poner una nueva; al guardar se muestra una vez para que se la entregues.</p>
            </div>
          </div>
          {edit.estado === "Baja" && <p className="text-xs mt-3" style={{ color: "#8A5A00" }}>En baja: ya no puede iniciar sesión, pero TODO lo que subió (asistencia, registros, Facebook, puntos, metas) se conserva y sigue visible para ti.</p>}
          <div className="mt-4 flex gap-2">
            <PrimaryBtn onClick={guardarEdicion}><Check size={14} /> Guardar cambios</PrimaryBtn>
            <button onClick={() => { setEdit(null); setVerPass(false); }} className="text-sm px-3 py-2" style={{ border: `1px solid ${forest}`, color: forest, background: "#fff" }}>Cancelar</button>
          </div>
        </div>
      )}

      <LedgerTable
        columns={["Nombre", "Correo", "Rol", "Turno", "Fecha de ingreso", "Período de pago actual", "Estado", ""]}
        rows={lista.map((u) => [
          u.nombre, u.correo,
          <Tag tone={u.rol === "Vendedora" ? "neutral" : "warn"}>{u.rol}</Tag>,
          (ctx.horario.turnos.find((t) => t.id === (u.turno || ctx.horario.porDefecto)) || {}).nombre || "—",
          fmtY(u.ingresoISO),
          u.estado === "Activa" ? cicloLabel(cycleFor(u.ingresoISO, TODAY_ISO)) : "—",
          u.estado === "Activa" ? <Tag tone="good">Activa</Tag> : <Tag tone="bad">Baja · {fmtY(u.bajaISO)}</Tag>,
          <span className="flex items-center gap-3 flex-wrap">
            <button onClick={() => { setEdit({ ...u, pass: "" }); setVerPass(false); }} className="text-xs flex items-center gap-1" style={{ color: forest }}><Pencil size={12} /> Editar</button>
            {u.estado === "Activa" && ROL_SIG[u.rol] && (
              subir === u.id
                ? <span className="text-xs flex items-center gap-2">¿Subir a {ROL_SIG[u.rol]}?
                    <button onClick={() => subirRol(u)} style={{ color: forest, fontWeight: 600 }}>Sí</button>
                    <button onClick={() => setSubir(null)} style={{ color: rust }}>No</button></span>
                : <button onClick={() => setSubir(u.id)} className="text-xs flex items-center gap-1" style={{ color: forest }}><ArrowUp size={12} /> Subir a {ROL_SIG[u.rol]}</button>
            )}
            {u.estado === "Activa"
              ? (confirm === u.id
                ? <span className="text-xs flex items-center gap-2">¿Dar de baja?
                    <button onClick={() => cambiar(u.id, "Baja")} style={{ color: rust, fontWeight: 600 }}>Sí</button>
                    <button onClick={() => setConfirm(null)} style={{ color: forest }}>No</button></span>
                : <button onClick={() => setConfirm(u.id)} className="text-xs flex items-center gap-1" style={{ color: rust }}><UserX size={13} /> Dar de baja</button>)
              : <button onClick={() => cambiar(u.id, "Activa")} className="text-xs flex items-center gap-1" style={{ color: forest }}><UserCheck size={13} /> Reactivar</button>}
          </span>,
        ])}
      />
      <p className="text-xs mt-4" style={{ color: muted }}>No existe "eliminar usuario": solo "Dar de baja". Así nada de lo que subieron se pierde (en la base de datos además queda protegido contra borrados). La supervisora trabaja con Asistencia, Registro App, Facebook, Pendientes, Metas y Puntos de mejora; no ve Usuarios, Bonificaciones ni Configuración. Presiona Actualizar para guardar.</p>
    </div>
  );
}

function AdminConfiguracion({ ctx }) {
  const [msg, setMsg] = useState("");
  const H = ctx.D.horario, T = ctx.D.tienda;
  const setH = (fn) => ctx.setDraft("horario", (h) => fn(h));
  const setT = (patch) => ctx.setDraft("tienda", (t) => ({ ...t, ...patch }));
  const sinUbic = T.lat === "" || T.lng === "";
  const inp = { border: `1px solid ${line}`, background: "#FBFAF7" };
  const usar = () => { setT({ lat: -17.393838, lng: -66.156946 }); setMsg('Ubicación obtenida (ejemplo). Presiona "Actualizar" para guardarla.'); };
  const asignadas = (id) => ctx.D.usuarios.filter((u) => (u.turno || H.porDefecto) === id).length;
  const updTurno = (id, patch) => setH((h) => ({ ...h, turnos: h.turnos.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  const addTurno = () => setH((h) => ({ ...h, turnos: [...h.turnos, { id: "t" + Date.now(), nombre: "Nuevo turno", inicio: "09:00", fin: "13:00" }] }));
  const addTurnoLibre = () => setH((h) => ({ ...h, turnos: [...h.turnos, { id: "t" + Date.now(), nombre: "Libre · pago por hora", tipo: "libre", inicio: "", fin: "19:00" }] }));
  const setUsr = (id, patch) => ctx.setDraft("usuarios", (l) => l.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  const delTurno = (id) => setH((h) => ({ ...h, turnos: h.turnos.filter((t) => t.id !== id) }));
  const principal = H.turnos.find((t) => t.id === H.porDefecto) || H.turnos[0];
  return (
    <div>
      <SectionHeader eyebrow="Horario de trabajo y ubicación de la tienda" title="Configuración"
        action={<SaveBtn ctx={ctx} keys={["horario", "tienda", "usuarios"]} />} />

      <div className="bg-white p-5 mb-6" style={{ border: `1px solid ${line}` }}>
        <div className="text-sm mb-1" style={{ color: forest, fontWeight: 600 }}>Horario de trabajo</div>
        <p className="text-xs mb-4" style={{ color: muted }}>Define a qué hora entran y salen. Se usa para saber si llegaron tarde y cuántas horas trabajaron. Puedes crear turnos (por ejemplo medio tiempo) y asignarlos en Usuarios.</p>

        <div className="flex items-center gap-4 flex-wrap mb-4">
          <div>
            <label className="block text-xs mb-1" style={{ color: muted }}>Días laborables</label>
            <div className="flex gap-1">{DAYS.map((d) => <span key={d} className="text-xs px-2 py-1" style={{ background: forest, color: "#fff" }}>{d}</span>)}<span className="text-xs px-2 py-1" style={{ background: "#fff", color: muted, border: `1px dashed ${line}` }}>Dom (opcional)</span></div>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: muted }}>Tolerancia de entrada (min)</label>
            <NumIn w={60} value={H.tolerancia} onChange={(x) => setH((h) => ({ ...h, tolerancia: x === "" ? 0 : x }))} />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: muted }}>Cierre automático de salida (min después de la salida del turno)</label>
            <NumIn w={60} value={H.cierreMin} onChange={(x) => setH((h) => ({ ...h, cierreMin: x === "" ? 0 : x }))} />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: muted }}>Turno por defecto</label>
            <select className="px-2 py-2 text-sm" style={inp} value={H.porDefecto} onChange={(e) => setH((h) => ({ ...h, porDefecto: e.target.value }))}>
              {H.turnos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
          </div>
        </div>

        <LedgerTable
          columns={["Turno", "Tipo", "Entrada", "Salida / tope", "Duración", "Hora límite (con tolerancia)", "Cierre automático", "Asignadas", ""]}
          rows={H.turnos.map((t) => {
            const libre = t.tipo === "libre";
            return [
              <input className="text-sm px-2 py-1" style={{ ...inp, minWidth: 190 }} value={t.nombre} onChange={(e) => updTurno(t.id, { nombre: e.target.value })} />,
              <select className="text-sm px-1 py-0.5" style={inp} value={t.tipo || "fijo"} onChange={(e) => updTurno(t.id, { tipo: e.target.value, ...(e.target.value === "fijo" && !t.inicio ? { inicio: "09:00", fin: t.fin || "13:00" } : {}) })}>
                <option value="fijo">Horario fijo</option><option value="libre">Libre (por horas)</option>
              </select>,
              libre ? "—" : <input type="time" className="text-sm px-1 py-0.5" style={{ ...inp, width: 100 }} value={t.inicio} onChange={(e) => updTurno(t.id, { inicio: e.target.value })} />,
              <input type="time" title={libre ? "Hora tope: no se cuentan horas después" : "Hora de salida del turno"} className="text-sm px-1 py-0.5" style={{ ...inp, width: 100 }} value={t.fin} onChange={(e) => updTurno(t.id, { fin: e.target.value })} />,
              libre ? <span className="text-xs" style={{ color: muted }}>sin horario fijo · tope {t.fin}</span> : dur(Math.max(0, hm(t.fin) - hm(t.inicio))),
              libre ? <span className="text-xs" style={{ color: muted }}>sin límite · no hay retraso</span> : mm(hm(t.inicio) + (Number(H.tolerancia) || 0)),
              mm(hm(t.fin || "19:00") + (Number(H.cierreMin) || 0)),
              asignadas(t.id) + (t.id === H.porDefecto ? " · por defecto" : ""),
              t.id === H.porDefecto || asignadas(t.id) > 0
                ? <span className="text-xs" style={{ color: muted }}>en uso</span>
                : <button onClick={() => delTurno(t.id)} className="text-xs flex items-center gap-1" style={{ color: rust }}><Trash2 size={12} /> Quitar</button>,
            ];
          })}
        />
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <button onClick={addTurno} className="text-sm px-3 py-2 flex items-center gap-1.5" style={{ border: `1px solid ${forest}`, color: forest, background: "#fff" }}><Plus size={14} /> Agregar turno</button>
          <button onClick={addTurnoLibre} className="text-sm px-3 py-2 flex items-center gap-1.5" style={{ border: `1px solid ${forest}`, color: forest, background: "#fff" }}><Plus size={14} /> Agregar turno libre</button>
          <span className="text-xs" style={{ color: muted }}>Se considera retraso si la primera entrada del día es posterior a la entrada del turno + tolerancia (turno principal: {principal ? mm(hm(principal.inicio) + (Number(H.tolerancia) || 0)) : "—"}).</span>
        </div>

        <div className="mt-6 mb-2 text-sm" style={{ color: forest, fontWeight: 600 }}>Asignar turno a cada vendedora</div>
        <p className="text-xs mb-3" style={{ color: muted }}>Elige quién trabaja tiempo completo, medio tiempo o en turno libre. En turno libre no hay hora de entrada ni retrasos: se paga por horas trabajadas × la tarifa por hora que pongas aquí.</p>
        <div className="flex gap-2 flex-wrap mb-3">
          {H.turnos.map((t) => <Tag key={t.id} tone={t.tipo === "libre" ? "warn" : "neutral"}>{t.nombre}: {asignadas(t.id)}</Tag>)}
        </div>
        <LedgerTable
          columns={["Vendedora", "Turno", "Horario", "Tarifa por hora (Bs)"]}
          rows={ctx.D.usuarios.filter((u) => u.rol === "Vendedora" && u.estado === "Activa").map((u) => {
            const t = H.turnos.find((x) => x.id === (u.turno || H.porDefecto)) || H.turnos[0];
            const libre = t.tipo === "libre";
            return [
              u.nombre,
              <select className="text-sm px-2 py-1" style={{ ...inp, minWidth: 200 }} value={t.id} onChange={(e) => setUsr(u.id, { turno: e.target.value })}>
                {H.turnos.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
              </select>,
              libre ? "Viene cuando puede" : `${t.inicio} – ${t.fin} (${dur(Math.max(0, hm(t.fin) - hm(t.inicio)))})`,
              libre ? <NumIn w={70} value={u.tarifa || 0} onChange={(x) => setUsr(u.id, { tarifa: x === "" ? 0 : x })} /> : <span style={{ color: muted }}>—</span>,
            ];
          })}
        />
        <p className="text-xs mt-3" style={{ color: muted }}>No hay horas extras: no se cuentan horas después de la salida del turno (o del tope, en turno libre). Si una vendedora olvida marcar su salida, el sistema la cierra sola a la salida del turno + {Number(H.cierreMin) || 0} min (ej. {mm(hm(principal?.fin || "19:00") + (Number(H.cierreMin) || 0))}).</p>
        <p className="text-xs mt-3" style={{ color: muted }}>El domingo no es día laborable: no tiene meta ni cuenta como falta. Si una vendedora trabaja un domingo, lo que registre aparece en su cuadro resumen de ejecución.</p>
      </div>

      <div className="bg-white p-5" style={{ border: `1px solid ${line}` }}>
        <div className="text-sm mb-3" style={{ color: forest, fontWeight: 600 }}>Ubicación de la tienda (check-in por GPS)</div>
        <div className="grid grid-cols-3 gap-4 mb-4 max-w-xl">
          <div><label className="block text-xs mb-1" style={{ color: muted }}>Latitud</label><input className="w-full px-3 py-2 text-sm" style={inp} value={T.lat} onChange={(e) => setT({ lat: e.target.value })} /></div>
          <div><label className="block text-xs mb-1" style={{ color: muted }}>Longitud</label><input className="w-full px-3 py-2 text-sm" style={inp} value={T.lng} onChange={(e) => setT({ lng: e.target.value })} /></div>
          <div><label className="block text-xs mb-1" style={{ color: muted }}>Radio (metros)</label><input className="w-full px-3 py-2 text-sm" style={inp} value={T.radio} onChange={(e) => setT({ radio: e.target.value })} /></div>
        </div>
        <div className="flex items-center gap-3 flex-wrap mb-3">
          <PrimaryBtn onClick={usar}><Crosshair size={14} /> Usar mi ubicación actual</PrimaryBtn>
          {!sinUbic && <span className="text-xs underline" style={{ color: forest }}>Ver en Google Maps</span>}
          {msg && <span className="text-xs" style={{ color: muted }}>{msg}</span>}
        </div>
        {sinUbic && (
          <div className="p-3 text-xs max-w-xl" style={{ background: "#FBEFD9", border: "1px solid #EFCB86", color: "#8A5A00" }}>
            ⚠️ Todavía no hay ubicación de la tienda. Mientras no la guardes, el check-in de todas las vendedoras aparece como "Dentro del rango".
          </div>
        )}
      </div>
    </div>
  );
}

function AdminAsistencia({ ctx }) {
  const [f, setF] = useState(newFilter("mes"));
  const [back, setBack] = useState(0);
  const [sel, setSel] = useState(null); // día cuyo detalle de marcas está abierto
  const [nv, setNv] = useState({ vid: 0, fecha: TODAY_ISO, entrada: "09:00", salida: "" });
  const puedeBorrar = ctx.esAdmin !== false;
  const A = ctx.D.asist;
  const rows = A.filter((a) => passes(f, a.fecha, a.vid)).sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : a.vid - b.vid));
  const vs = vendedoras.filter((v) => !f.vid || v.id === f.vid);
  const setDia = (id, fn) => ctx.setDraft("asist", (l) => l.map((a) => (a.id === id ? derivar(fn(a)) : a)));
  const editDia = (id, campo, val) => setDia(id, (a) => ({ ...a, [campo]: val }));
  const editMarca = (id, mid, campo, val) => setDia(id, (a) => ({ ...a, marcas: a.marcas.map((m) => (m.id === mid ? { ...m, [campo]: val } : m)) }));
  const delMarca = (id, mid) => setDia(id, (a) => ({ ...a, marcas: a.marcas.filter((m) => m.id !== mid) }));
  const addMarca = (id) => setDia(id, (a) => {
    const ult = [...a.marcas].sort((x, y) => hm(x.entrada) - hm(y.entrada)).pop();
    return { ...a, marcas: [...a.marcas, { id: "m" + Date.now(), entrada: ult?.salida || "09:00", salida: "", motivo: "Permiso personal" }] };
  });
  const del = (id) => { ctx.setDraft("asist", (l) => l.filter((a) => a.id !== id)); if (sel === id) setSel(null); };
  const dup = (a) => A.some((x) => x.id !== a.id && x.vid === a.vid && x.fecha === a.fecha);
  const agregar = () => {
    if (!nv.vid || !nv.fecha || !nv.entrada) return;
    const marca = { id: "m" + Date.now(), entrada: nv.entrada, salida: nv.salida, motivo: nv.salida ? "Fin de jornada" : "" };
    const existe = A.find((a) => a.vid === nv.vid && a.fecha === nv.fecha);
    if (existe) setDia(existe.id, (a) => ({ ...a, marcas: [...a.marcas, marca] }));
    else ctx.setDraft("asist", (l) => [...l, derivar({ id: "a" + Date.now(), vid: nv.vid, fecha: nv.fecha, gps: "Dentro del rango", marcas: [marca] })]);
    setNv({ vid: 0, fecha: TODAY_ISO, entrada: "09:00", salida: "" });
  };
  const tin = { border: `1px solid ${line}`, background: "#FBFAF7", width: 96 };
  const sel_ = { border: `1px solid ${line}`, background: "#FBFAF7" };
  const dia = A.find((a) => a.id === sel);

  return (
    <div>
      <SectionHeader eyebrow="Control diario y resumen por período de pago" title="Asistencia"
        action={<><VisToggle k="asistencia" ctx={ctx} /><SaveBtn ctx={ctx} keys={["asist", "vis"]} /></>} />

      <div className="bg-white p-4 mb-5" style={{ border: `1px solid ${line}`, borderLeft: `3px solid ${amber}` }}>
        <div className="text-sm mb-1" style={{ color: forest, fontWeight: 600 }}>Agregar registro manual (por si olvidó marcar)</div>
        <p className="text-xs mb-3" style={{ color: muted }}>Si ya existe un registro de esa vendedora ese día, se agrega como una entrada/salida más.</p>
        <div className="flex gap-2 flex-wrap items-end">
          <div><label className="block text-xs mb-1" style={{ color: muted }}>Vendedora</label>
            <select className="px-2 py-2 text-sm" style={{ ...sel_, minWidth: 150 }} value={nv.vid} onChange={(e) => setNv({ ...nv, vid: Number(e.target.value) })}>
              <option value={0}>Elegir…</option>{vendedoras.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select></div>
          <div><label className="block text-xs mb-1" style={{ color: muted }}>Fecha</label><input type="date" className="px-2 py-2 text-sm" style={sel_} value={nv.fecha} onChange={(e) => setNv({ ...nv, fecha: e.target.value })} /></div>
          <div><label className="block text-xs mb-1" style={{ color: muted }}>Entrada</label><input type="time" className="px-2 py-2 text-sm" style={sel_} value={nv.entrada} onChange={(e) => setNv({ ...nv, entrada: e.target.value })} /></div>
          <div><label className="block text-xs mb-1" style={{ color: muted }}>Salida</label><input type="time" className="px-2 py-2 text-sm" style={sel_} value={nv.salida} onChange={(e) => setNv({ ...nv, salida: e.target.value })} /></div>
          <PrimaryBtn onClick={agregar}><Plus size={14} /> Agregar</PrimaryBtn>
        </div>
      </div>

      <FilterBar f={f} setF={setF} />

      <h3 className="text-sm mb-1" style={{ color: forest, fontWeight: 600 }}>Detalle diario</h3>
      <p className="text-xs mb-3" style={{ color: muted }}>Cada fila resume el día: 1ª entrada, última salida y horas trabajadas (tope: la salida del turno; si olvida marcar la salida, se cierra sola). Abre "Marcas" para ver y corregir todas sus entradas y salidas (permisos, almuerzo…). Cada cambio queda en Auditoría.</p>

      {dia && (
        <div className="bg-white p-4 mb-4" style={{ border: `1px solid ${line}`, borderLeft: `3px solid ${forest}` }}>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="text-sm" style={{ color: forest, fontWeight: 600 }}>Marcas de {nombreDe(dia.vid)} · {fmtLargo(dia.fecha)}
              <span className="text-xs ml-2" style={{ color: muted, fontWeight: 400 }}>Trabajado: {dur(calc(ctx, dia).horas)} · Permiso: {dur(calc(ctx, dia).fuera)}</span></div>
            <div className="flex gap-2">
              <button onClick={() => addMarca(dia.id)} className="text-xs px-2 py-1.5 flex items-center gap-1" style={{ border: `1px solid ${forest}`, color: forest, background: "#fff" }}><Plus size={12} /> Agregar marca</button>
              <button onClick={() => setSel(null)} className="text-xs px-2 py-1.5" style={{ color: muted }}>Cerrar</button>
            </div>
          </div>
          <LedgerTable
            columns={["#", "Entrada", "Salida", "Motivo de la salida", "Tiempo", ""]}
            rows={dia.marcas.map((m, i) => [
              i + 1,
              <input type="time" className="text-sm px-1 py-0.5" style={tin} value={m.entrada} onChange={(e) => editMarca(dia.id, m.id, "entrada", e.target.value)} />,
              <input type="time" className="text-sm px-1 py-0.5" style={tin} value={m.salida} onChange={(e) => editMarca(dia.id, m.id, "salida", e.target.value)} />,
              <select className="text-sm px-1 py-0.5" style={sel_} value={m.motivo || ""} onChange={(e) => editMarca(dia.id, m.id, "motivo", e.target.value)}>
                <option value="">—</option>{MOTIVOS.map((x) => <option key={x}>{x}</option>)}
              </select>,
              m.salida ? dur(Math.max(0, Math.min(hm(m.salida), finTurno(ctx, dia.vid)) - Math.min(hm(m.entrada), finTurno(ctx, dia.vid)))) : <Tag tone="warn">sin salida · se cierra sola {mm(cierreAuto(ctx, dia.vid))}</Tag>,
              puedeBorrar ? <DelBtn label="Quitar" onDelete={() => delMarca(dia.id, m.id)} /> : "",
            ])}
          />
        </div>
      )}

      <LedgerTable maxH={300}
        columns={["Fecha", "Vendedora", "Turno", "1ª entrada", "Últ. salida", "Horas", "Permiso", "Ubicación", "Puntualidad", "Registro", "Marcas", ""]}
        rows={rows.map((a) => [
          <span className="flex items-center gap-1"><input type="date" className="text-sm px-1 py-0.5" style={sel_} value={a.fecha} onChange={(e) => editDia(a.id, "fecha", e.target.value)} />{dup(a) && <Tag tone="bad">duplicado</Tag>}</span>,
          <select className="text-sm px-1 py-0.5" style={sel_} value={a.vid} onChange={(e) => editDia(a.id, "vid", Number(e.target.value))}>{vendedoras.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}</select>,
          <span className="text-xs">{turnoDeVid(ctx, a.vid).nombre}</span>,
          a.entrada || "—",
          calc(ctx, a).auto ? <span className="whitespace-nowrap">{mm(cierreAuto(ctx, a.vid))} <Tag tone="warn">automática</Tag></span> : (a.salida || (a.marcas.length ? <Tag tone="good">en la tienda</Tag> : "—")),
          dur(calc(ctx, a).horas),
          calc(ctx, a).fuera ? dur(calc(ctx, a).fuera) : "—",
          <select className="text-sm px-1 py-0.5" style={sel_} value={a.gps} onChange={(e) => editDia(a.id, "gps", e.target.value)}><option>Dentro del rango</option><option>Fuera del rango</option></select>,
          esLibre(ctx, a.vid) ? <Tag tone="neutral">Libre</Tag> : esTarde(ctx, a) ? <Tag tone="warn">Retraso</Tag> : <Tag tone="good">A tiempo</Tag>,
          cierreTag(a.fecha),
          <button onClick={() => setSel(sel === a.id ? null : a.id)} className="text-xs underline" style={{ color: forest }}>{sel === a.id ? "Ocultar" : `Ver (${a.marcas.length})`}</button>,
          puedeBorrar ? <DelBtn onDelete={() => del(a.id)} /> : "",
        ])}
      />

      <div className="flex items-center justify-between mt-10 mb-3">
        <h3 className="text-sm" style={{ color: forest, fontWeight: 600 }}>Resumen mensual por período de pago (cada una cierra en su fecha de ingreso)</h3>
        <div className="flex gap-1">
          {[["Período actual", 0], ["Período anterior", 1]].map(([l, b]) => (
            <button key={b} onClick={() => setBack(b)} className="text-xs px-2.5 py-1.5"
              style={{ background: back === b ? forest : "transparent", color: back === b ? "#fff" : forest, border: `1px solid ${forest}` }}>{l}</button>
          ))}
        </div>
      </div>
      <LedgerTable
        columns={["Vendedora", "Turno", "Ingreso", "Período de pago", "Presentes", "Laborables", "Faltas", "Retrasos", "Fuera de rango", "Horas trabajadas", "Horas de permiso", "Pago por horas", "Índice"]}
        rows={vs.map((v) => {
          const c = cycleBack(v.ingresoISO, TODAY_ISO, back);
          const t = turnoDeVid(ctx, v.id), libre = t.tipo === "libre";
          const us = ctx.usuarios.find((x) => x.id === v.id);
          if (c.end < v.ingresoISO) return [v.nombre, t.nombre, fmtY(v.ingresoISO), "Aún no ingresaba", "—", "—", "—", "—", "—", "—", "—", "—", "—"];
          const a = maxISO(c.start, v.ingresoISO), b = minISO(c.end, TODAY_ISO);
          const r = A.filter((x) => x.vid === v.id && x.fecha >= a && x.fecha <= b);
          const lab = workdays(a, b);
          const horas = sum(r.map((x) => calc(ctx, x).horas)), perm = sum(r.map((x) => calc(ctx, x).fuera));
          const veces = sum(r.map((x) => Math.max(0, x.marcas.length - 1)));
          return [v.nombre, <span className="text-xs">{t.nombre}</span>, fmtY(v.ingresoISO), cicloLabel(c), r.length,
            libre ? "—" : lab, libre ? "—" : Math.max(0, lab - r.length),
            libre ? "—" : r.filter((x) => esTarde(ctx, x)).length, r.filter((x) => x.gps === "Fuera del rango").length,
            <b>{dur(horas)}</b>,
            perm ? <span>{dur(perm)} <span className="text-xs" style={{ color: muted }}>({veces} {veces === 1 ? "vez" : "veces"})</span></span> : "—",
            libre ? <b style={{ color: amber }}>Bs {Math.round((horas / 60) * (us?.tarifa || 0))}</b> : "—",
            libre ? "—" : <b style={{ color: forest }}>{pct(r.length, lab)}%</b>];
        })}
      />
      <p className="text-xs mt-3" style={{ color: muted }}>Índice = días presentes ÷ días laborables (lunes a sábado) del período, contando hasta hoy. Horas de permiso = tiempo que salió y volvió durante el día (el almuerzo es dentro de la tienda y no cuenta). En turno libre no hay retrasos, faltas ni índice: se paga por horas trabajadas × tarifa. No hay horas extras: no se cuentan horas después de la salida del turno, y una salida olvidada se cierra sola. Estas horas solo las ve la administradora.</p>
    </div>
  );
}

function AdminRegistroApp({ ctx }) {
  const [f, setF] = useState(newFilter("mes"));
  const [nv, setNv] = useState({ vid: 0, fecha: TODAY_ISO, registrados: "" });
  const puedeBorrar = ctx.esAdmin !== false;
  const L = ctx.D.appLog;
  const rows = L.filter((a) => passes(f, a.fecha, a.vid)).sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : a.vid - b.vid));
  const metaDia = (a) => ctx.metas.app?.[a.vid]?.[dow(a.fecha)] || 0;
  const upd = (id, campo, val) => ctx.setDraft("appLog", (l) => l.map((a) => (a.id === id ? { ...a, [campo]: val } : a)));
  const del = (id) => ctx.setDraft("appLog", (l) => l.filter((a) => a.id !== id));
  const dup = (a) => L.some((x) => x.id !== a.id && x.vid === a.vid && x.fecha === a.fecha);
  const agregar = () => {
    if (!nv.vid || !nv.fecha || nv.registrados === "") return;
    ctx.setDraft("appLog", (l) => [...l, { id: "r" + Date.now(), vid: nv.vid, fecha: nv.fecha, registrados: Number(nv.registrados) }]);
    setNv({ vid: 0, fecha: TODAY_ISO, registrados: "" });
  };
  const sel = { border: `1px solid ${line}`, background: "#FBFAF7" };
  return (
    <div>
      <SectionHeader eyebrow="Productos registrados en la app de control de inventario" title="Registro en la APP"
        action={<SaveBtn ctx={ctx} keys={["appLog"]} />} />
      <div className="bg-white p-4 mb-5" style={{ border: `1px solid ${line}`, borderLeft: `3px solid ${amber}` }}>
        <div className="text-sm mb-3" style={{ color: forest, fontWeight: 600 }}>Agregar registro manual</div>
        <div className="flex gap-2 flex-wrap items-end">
          <div><label className="block text-xs mb-1" style={{ color: muted }}>Vendedora</label>
            <select className="px-2 py-2 text-sm" style={{ ...sel, minWidth: 150 }} value={nv.vid} onChange={(e) => setNv({ ...nv, vid: Number(e.target.value) })}>
              <option value={0}>Elegir…</option>{vendedoras.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select></div>
          <div><label className="block text-xs mb-1" style={{ color: muted }}>Fecha</label><input type="date" className="px-2 py-2 text-sm" style={sel} value={nv.fecha} onChange={(e) => setNv({ ...nv, fecha: e.target.value })} /></div>
          <div><label className="block text-xs mb-1" style={{ color: muted }}>Registrados</label><NumIn w={70} value={nv.registrados} onChange={(x) => setNv({ ...nv, registrados: x })} /></div>
          <PrimaryBtn onClick={agregar}><Plus size={14} /> Agregar</PrimaryBtn>
        </div>
      </div>
      <FilterBar f={f} setF={setF} />
      <p className="text-xs mb-3" style={{ color: muted }}>Puedes cambiar fecha, vendedora y cantidad de cualquier registro, o eliminarlo (queda en Auditoría).</p>
      <LedgerTable maxH={420}
        columns={["Fecha", "Vendedora", "Registrados", "Meta del día", "Progreso", "Registro", ""]}
        rows={[
          ...rows.map((a) => [
            <span className="flex items-center gap-1"><input type="date" className="text-sm px-1 py-0.5" style={sel} value={a.fecha} onChange={(e) => upd(a.id, "fecha", e.target.value)} />{dup(a) && <Tag tone="bad">duplicado</Tag>}</span>,
            <select className="text-sm px-1 py-0.5" style={sel} value={a.vid} onChange={(e) => upd(a.id, "vid", Number(e.target.value))}>{vendedoras.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}</select>,
            <NumIn w={60} value={a.registrados} onChange={(x) => upd(a.id, "registrados", x === "" ? 0 : x)} />,
            metaDia(a), <Prog hecho={+a.registrados || 0} meta={metaDia(a)} />, cierreTag(a.fecha),
            puedeBorrar ? <DelBtn onDelete={() => del(a.id)} /> : "",
          ]),
          ...(rows.length ? [[<b>Total</b>, "", <b>{sum(rows.map((a) => +a.registrados || 0))}</b>, <b>{sum(rows.map(metaDia))}</b>, <Prog hecho={sum(rows.map((a) => +a.registrados || 0))} meta={sum(rows.map(metaDia))} />, "", ""]] : []),
        ]}
      />
    </div>
  );
}

function AdminFacebook({ ctx }) {
  const [sel, setSel] = useState(null);
  const [f, setF] = useState(newFilter("mes"));
  const [nuevaCat, setNuevaCat] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [nc, setNc] = useState({ nombre: "", vid: 0 });
  const [addOpen, setAddOpen] = useState(false);
  const D = ctx.D;
  const inp = { border: `1px solid ${line}`, background: "#FBFAF7" };
  const lista = D.cuentas.filter((c) => (showAll || c.estado === "Activa") && (!f.vid || c.vid === f.vid));
  const ocultas = D.cuentas.filter((c) => c.estado !== "Activa").length;
  const keys = ["fbLog", "cuentas", "categorias"];

  const upd = (id, campo, val) => ctx.setDraft("cuentas", (l) => l.map((c) => (c.id === id ? { ...c, [campo]: val } : c)));

  if (sel) {
    const c = D.cuentas.find((x) => x.id === sel);
    return (
      <div>
        <button onClick={() => setSel(null)} className="text-xs flex items-center gap-1 mb-3" style={{ color: forest }}><ArrowLeft size={13} /> Volver a la lista</button>
        <SectionHeader eyebrow={`Asignada a ${c.vid ? nombreDe(c.vid) : "nadie (sin asignar)"}`} title={`Cuenta: ${c.nombre}`} action={<SaveBtn ctx={ctx} keys={keys} />} />
        <p className="text-xs mb-4" style={{ color: muted }}>Seguimiento de dónde a dónde se publicó de la planilla de control de inventario, para no duplicar.</p>
        <FbTracker ctx={ctx} cuenta={c} mode="admin" initFilter={{ ...f, vid: 0 }} />
      </div>
    );
  }

  const agregarCat = () => {
    const n = nuevaCat.trim();
    if (!n || D.categorias.includes(n)) return;
    ctx.setDraft("categorias", (l) => [...l, n].sort((a, b) => a.localeCompare(b, "es")));
    setNuevaCat("");
  };
  const crearCuenta = () => {
    if (!nc.nombre.trim()) return;
    ctx.setDraft("cuentas", (l) => [...l, { id: "c" + Date.now(), nombre: nc.nombre.trim(), vid: nc.vid || null, estado: "Activa" }]);
    setNc({ nombre: "", vid: 0 }); setAddOpen(false);
  };

  return (
    <div>
      <SectionHeader eyebrow="Solo la administradora da de alta y asigna las cuentas" title="Cuentas de Facebook"
        action={<><SaveBtn ctx={ctx} keys={keys} /><PrimaryBtn onClick={() => setAddOpen(!addOpen)}><Plus size={14} /> Nueva cuenta</PrimaryBtn></>} />
      {addOpen && (
        <div className="bg-white p-4 mb-4 flex items-end gap-3 flex-wrap" style={{ border: `1px solid ${line}`, borderLeft: `3px solid ${amber}` }}>
          <div><label className="block text-xs mb-1" style={{ color: muted }}>Nombre de la cuenta</label>
            <input className="px-3 py-2 text-sm" style={{ ...inp, width: 200 }} value={nc.nombre} onChange={(e) => setNc({ ...nc, nombre: e.target.value })} /></div>
          <div><label className="block text-xs mb-1" style={{ color: muted }}>Asignar a</label>
            <select className="px-3 py-2 text-sm" style={inp} value={nc.vid} onChange={(e) => setNc({ ...nc, vid: Number(e.target.value) })}>
              <option value={0}>Sin asignar</option>
              {ctx.usuarios.filter((u) => u.rol === "Vendedora" && u.estado === "Activa" && typeof u.id === "number").map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select></div>
          <PrimaryBtn onClick={crearCuenta}><Check size={14} /> Agregar a la lista</PrimaryBtn>
        </div>
      )}
      <FilterBar f={f} setF={setF} />
      <LedgerTable
        columns={["Cuenta", "Asignada a (quién la atiende)", "Estado", "Registros", "Publicaciones (total manual)", ""]}
        rows={lista.map((c) => {
          const es = D.fbLog.filter((e) => e.cuentaId === c.id && passes(f, e.fecha, e.vid));
          return [
            c.nombre,
            <select className="text-sm px-2 py-1" style={inp} value={c.vid || 0} onChange={(e) => upd(c.id, "vid", Number(e.target.value) || null)}>
              <option value={0}>Sin asignar</option>
              {vendedoras.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>,
            <select className="text-sm px-2 py-1" style={inp} value={c.estado} onChange={(e) => upd(c.id, "estado", e.target.value)}>
              <option>Activa</option><option>Inactiva</option><option>Bloqueada</option>
            </select>,
            es.length, sum(es.map((e) => +e.total || 0)),
            <button onClick={() => setSel(c.id)} className="text-xs flex items-center gap-1" style={{ color: forest }}>Ver avance <ChevronRight size={13} /></button>,
          ];
        })}
      />
      <div className="flex items-center gap-3 mt-3 text-xs" style={{ color: muted }}>
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> Mostrar también inactivas y bloqueadas ({ocultas})</label>
      </div>
      <p className="text-xs mt-1" style={{ color: muted }}>Si cambias la asignación, el historial queda con quien lo hizo y los registros nuevos van a la nueva vendedora.</p>

      <div className="mt-8 bg-white p-4" style={{ border: `1px solid ${line}` }}>
        <div className="text-sm mb-2" style={{ color: forest, fontWeight: 600 }}>Qué cuentas atiende cada vendedora</div>
        {vendedoras.map((v) => (
          <div key={v.id} className="flex items-center gap-2 py-1.5 text-sm flex-wrap" style={{ borderBottom: `1px solid ${line}` }}>
            <span style={{ width: 120 }}>{v.nombre}</span>
            {cuentasDe(D.cuentas, v.id).length ? cuentasDe(D.cuentas, v.id).map((c) => <Tag key={c.id} tone="good">{c.nombre}</Tag>) : <span className="text-xs" style={{ color: muted }}>Sin cuentas asignadas</span>}
          </div>
        ))}
      </div>

      <div className="mt-6 bg-white p-4" style={{ border: `1px solid ${line}` }}>
        <div className="text-sm mb-2" style={{ color: forest, fontWeight: 600 }}>Categorías disponibles para las vendedoras</div>
        <div className="flex flex-wrap gap-1.5 mb-3">{D.categorias.map((c) => <Tag key={c}>{c}</Tag>)}</div>
        <div className="flex gap-2">
          <input className="px-2 py-1.5 text-sm" style={{ ...inp, width: 220 }} placeholder="Nueva categoría" value={nuevaCat} onChange={(e) => setNuevaCat(e.target.value)} />
          <PrimaryBtn onClick={agregarCat}><Plus size={14} /> Añadir categoría</PrimaryBtn>
        </div>
      </div>
    </div>
  );
}

// Registro de avance por cuenta: Fecha (auto), Categoría, Inicio, Final, Total (manual)
// mode "vend": la vendedora solo edita lo de HOY (hasta las 00:00). mode "admin": puede editar cualquier día.
function FbTracker({ ctx, cuenta, mode, initFilter }) {
  const admin = mode === "admin";
  const [f, setF] = useState(initFilter || newFilter("mes"));
  const [cat, setCat] = useState("");
  const [ini, setIni] = useState("");
  const [fin, setFin] = useState("");
  const [tot, setTot] = useState("");
  const [fecha, setFecha] = useState(TODAY_ISO);
  const puedeBorrar = ctx.esAdmin !== false;
  const [editId, setEditId] = useState(null); // fila que la vendedora está editando (solo registros de hoy)
  const inp = { border: `1px solid ${line}`, background: "#FBFAF7" };
  const list = ctx.D.fbLog.filter((e) => e.cuentaId === cuenta.id && passes(f, e.fecha, e.vid)).sort(byFechaDesc);

  const guardar = () => {
    if (!cat || !ini || tot === "") return;
    ctx.setDraft("fbLog", (l) => [...l, { id: "m" + Date.now(), cuentaId: cuenta.id, vid: cuenta.vid, fecha: admin ? fecha : TODAY_ISO, categoria: cat, inicio: ini, final: fin, total: Number(tot), links: Number(tot) }]);
    setCat(""); setIni(""); setFin(""); setTot(""); setFecha(TODAY_ISO);
  };
  const setCampo = (id, campo, val) => {
    if (val === "" && campo !== "final") return;
    ctx.setDraft("fbLog", (l) => l.map((e) => (e.id === id ? { ...e, [campo]: campo === "total" ? Number(val) : val } : e)));
  };
  const cell = (e, campo) => {
    const canEdit = admin || (editId === e.id && !isClosed(e.fecha));
    const v = e[campo];
    if (canEdit) {
      return <input key={e.id + campo + v} defaultValue={v ?? ""} type={campo === "total" ? "number" : "text"} className="px-2 py-1 text-sm"
        style={{ ...inp, width: 68 }} placeholder="…" onBlur={(ev) => setCampo(e.id, campo, ev.target.value)} />;
    }
    return v !== "" && v != null ? v : (campo === "final" ? <Tag tone="warn">Sin cerrar</Tag> : "—");
  };

  const rows = [];
  list.forEach((e, i) => {
    const closed = isClosed(e.fecha);
    rows.push([
      admin
        ? <span className="flex items-center gap-1"><input type="date" className="text-sm px-1 py-0.5" style={inp} value={e.fecha} onChange={(ev) => ev.target.value && setCampo(e.id, "fecha", ev.target.value)} />{closed && <Lock size={11} style={{ color: muted }} />}</span>
        : <span className="flex items-center gap-1">{fmtY(e.fecha)}{closed && <Lock size={11} style={{ color: muted }} />}</span>,
      (admin || editId === e.id)
        ? <select className="px-1 py-1 text-sm" style={inp} value={e.categoria} onChange={(ev) => setCampo(e.id, "categoria", ev.target.value)}>
            {ctx.D.categorias.map((c) => <option key={c}>{c}</option>)}
          </select>
        : e.categoria,
      (admin || editId === e.id) ? cell(e, "inicio") : e.inicio, cell(e, "final"), cell(e, "total"),
      admin
        ? (puedeBorrar ? <DelBtn onDelete={() => ctx.setDraft("fbLog", (l) => l.filter((x) => x.id !== e.id))} /> : "")
        : closed
          ? <span className="text-xs flex items-center gap-1 whitespace-nowrap" style={{ color: muted }}><Lock size={11} /> cerrado</span>
          : editId === e.id
            ? <button onClick={() => setEditId(null)} className="text-xs flex items-center gap-1" style={{ color: forest, fontWeight: 600 }}><Check size={12} /> Listo</button>
            : <button onClick={() => setEditId(e.id)} className="text-xs flex items-center gap-1" style={{ color: forest }}><Pencil size={12} /> Editar</button>,
    ]);
    const next = list[i + 1];
    if (!next || next.fecha !== e.fecha) {
      rows.push([<span className="text-xs" style={{ color: muted }}>{fmt(e.fecha)}</span>, <b style={{ color: forest }}>Total del día (esta cuenta)</b>, "", "", <b style={{ color: amber }}>{sum(list.filter((x) => x.fecha === e.fecha).map((x) => +x.total || 0))}</b>, ""]);
    }
  });

  return (
    <div>
      <FilterBar f={f} setF={setF} showVend={false} />
      {true && (
        <div className="bg-white p-4 mb-4" style={{ border: `1px solid ${line}` }}>
          <div className="text-xs mb-2 flex items-center gap-2 flex-wrap" style={{ color: muted }}>{admin ? <>Nuevo registro · Fecha: <input type="date" className="px-2 py-1 text-sm" style={inp} value={fecha} onChange={(e) => setFecha(e.target.value)} /></> : <>Nuevo registro · Fecha: {fmtY(TODAY_ISO)} (automática)</>}</div>
          <div className="flex gap-2 flex-wrap">
            <select className="px-2 py-2 text-sm flex-1" style={{ ...inp, minWidth: 130 }} value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="">Categoría…</option>
              {ctx.D.categorias.map((c) => <option key={c}>{c}</option>)}
            </select>
            <input className="px-2 py-2 text-sm" style={{ ...inp, width: 70 }} placeholder="Inicio" value={ini} onChange={(e) => setIni(e.target.value)} />
            <input className="px-2 py-2 text-sm" style={{ ...inp, width: 70 }} placeholder="Final" value={fin} onChange={(e) => setFin(e.target.value)} />
            <input className="px-2 py-2 text-sm" type="number" style={{ ...inp, width: 70 }} placeholder="Total" value={tot} onChange={(e) => setTot(e.target.value)} />
            <PrimaryBtn onClick={guardar}><Check size={14} /> Agregar</PrimaryBtn>
          </div>
          <p className="text-xs mt-2" style={{ color: muted }}>Total = cuántas publicaste realmente (los agotados se saltan). Presiona Actualizar para guardar.</p>
        </div>
      )}
      {admin && <p className="text-xs mb-3" style={{ color: muted }}>Como administradora puedes cambiar CUALQUIER dato (fecha, categoría, inicio, final, total), agregar registros de cualquier día o eliminarlos; los cambios en días cerrados (candado) quedan en Auditoría.</p>}
      {!admin && <p className="text-xs mb-3" style={{ color: muted }}>Usa "Editar" para corregir tus registros de hoy y presiona Actualizar para guardar. A las 11:59 pm el día se cierra (🔒) y ya no se puede modificar; solo la administradora puede corregirlo.</p>}
      <LedgerTable columns={["Fecha", "Categoría", "Inicio", "Final", "Total", ""]} rows={rows} maxH={360} />
    </div>
  );
}

function AdminPendientes({ ctx }) {
  const [f, setF] = useState(newFilter("mes"));
  const [pa, pb] = rangeOf(f);
  const pb2 = minISO(pb, TODAY_ISO);
  const vs = vendedoras.filter((v) => !f.vid || v.id === f.vid);
  const filas = vs.map((v) => {
    const es = ctx.fbLog.filter((e) => e.vid === v.id && e.fecha >= pa && e.fecha <= pb2);
    const copys = sum(es.map((e) => +e.total || 0));
    const links = sum(es.map((e) => +e.links || 0));
    const metaC = metaRango(ctx.metas, "copy", v, pa, pb2);
    const app = hechoFor(ctx, "app", v.id, pa, pb2);
    const metaA = metaRango(ctx.metas, "app", v, pa, pb2);
    return { v, copys, links, metaC, pendC: Math.max(0, metaC - copys), app, metaA, pendA: Math.max(0, metaA - app) };
  });
  const headers = ["Vendedora", "Copys", "Links", "Meta copy", "Pendiente copy", "App registrados", "Meta App", "Pendiente App"];
  const data = filas.map((x) => [x.v.nombre, x.copys, x.links, x.metaC, x.pendC, x.app, x.metaA, x.pendA]);
  const periodo = f.mode === "mes" ? f.mes : f.mode === "anio" ? f.anio : f.mode === "dias" ? `${f.desde}_a_${f.hasta}` : "total";
  const T = (k) => <b>{sum(filas.map((x) => x[k]))}</b>;

  return (
    <div>
      <SectionHeader eyebrow="Saldos pendientes de copy y de App" title="Pendientes"
        action={<>
          {ctx.esAdmin !== false && (
            <button onClick={() => ctx.setDraft("vis", (x) => ({ ...x, pendientes: x.pendientes === "todas" ? "admin" : "todas" }))}
              className="text-sm px-3 py-2 flex items-center gap-1.5"
              style={ctx.D.vis.pendientes === "todas" ? { background: "#fff", color: rust, border: `1px solid ${rust}` } : { background: "#fff", color: forest, border: `1px solid ${forest}` }}>
              {ctx.D.vis.pendientes === "todas" ? <><EyeOff size={14} /> Ocultar a vendedoras</> : <><Eye size={14} /> Autorizar visibilidad</>}
            </button>
          )}
          <SaveBtn ctx={ctx} keys={["vis"]} />
          <PrimaryBtn onClick={() => descargarCSV(`pendientes_${periodo}.csv`, headers, data)}><Download size={14} /> Exportar a Excel</PrimaryBtn>
        </>} />
      <div className="bg-white px-3 py-2 mb-4 text-sm" style={{ border: `1px solid ${line}`, borderLeft: `3px solid ${ctx.D.vis.pendientes === "todas" ? "#2F5D3A" : amber}` }}>
        {ctx.D.vis.pendientes === "todas"
          ? <>Las vendedoras <b>sí pueden ver</b> sus pendientes en su pantalla de inicio.</>
          : <>Las vendedoras <b>no ven</b> sus pendientes (solo la administradora).</>}
        <span className="text-xs ml-2" style={{ color: muted }}>Se aplica al presionar Actualizar.</span>
      </div>
      <FilterBar f={f} setF={setF} />
      <LedgerTable
        columns={headers}
        rows={[
          ...filas.map((x) => [x.v.nombre, x.copys, x.links, x.metaC, <Tag tone={x.pendC === 0 ? "good" : "warn"}>{x.pendC}</Tag>, x.app, x.metaA, <Tag tone={x.pendA === 0 ? "good" : "warn"}>{x.pendA}</Tag>]),
          [<b>Total</b>, T("copys"), T("links"), T("metaC"), T("pendC"), T("app"), T("metaA"), T("pendA")],
        ]}
      />
      <p className="text-xs mt-3" style={{ color: muted }}>Pendiente = meta − realizado en el período elegido. En la versión final el botón descarga un archivo .xlsx.</p>
    </div>
  );
}

function AdminMetas({ ctx }) {
  const { D, setDraft } = ctx;
  const [modo, setModo] = useState("global");
  const [activa, setActiva] = useState("copy");
  const [semana, setSemana] = useState(0);
  const [vid, setVid] = useState(0);
  const [selV, setSelV] = useState(1);
  const [nueva, setNueva] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const inp = { border: `1px solid ${line}`, background: "#FBFAF7" };

  const Dm = effMetas(D.metas, D.metasCuenta, D.cuentas); // metas con el borrador ya sumado
  const s0 = addDays(WEEK_START, semana * 7);
  const m = D.metricas.find((x) => x.key === activa);
  const vs = vendedoras.filter((v) => !vid || v.id === vid);
  const keys = ["metas", "metasCuenta", "metricas"];

  const setCelda = (id, i, val) => {
    setDraft("metas", (mt) => {
      const arr = [...(mt[activa]?.[id] || zeros())];
      arr[i] = val === "" ? 0 : val;
      return { ...mt, [activa]: { ...(mt[activa] || {}), [id]: arr } };
    });
  };
  const setCeldaCuenta = (cid, i, val) => {
    setDraft("metasCuenta", (mc) => {
      const arr = [...(mc[cid] || zeros())];
      arr[i] = val === "" ? 0 : val;
      return { ...mc, [cid]: arr };
    });
  };
  const setCeldaApp = (id, i, val) => {
    setDraft("metas", (mt) => {
      const arr = [...(mt.app?.[id] || zeros())];
      arr[i] = val === "" ? 0 : val;
      return { ...mt, app: { ...(mt.app || {}), [id]: arr } };
    });
  };
  const agregar = () => {
    if (!nueva.trim()) return;
    const key = "v" + Date.now();
    setDraft("metricas", (l) => [...l, { key, label: nueva.trim(), desc: "Variable personalizada" }]);
    setDraft("metas", (mt) => ({ ...mt, [key]: {} }));
    setActiva(key); setNueva(""); setAddOpen(false);
  };

  const mis = cuentasDe(D.cuentas, selV);
  const derivado = (id) => activa === "copy" && cuentasDe(D.cuentas, id).length > 0;

  return (
    <div>
      <SectionHeader eyebrow="Objetivos semanales en valor numérico" title="Metas"
        action={
          <>
            <div className="flex items-center gap-2">
              <button onClick={() => setSemana(semana - 1)} className="p-1.5" style={{ border: `1px solid ${line}`, background: "#fff" }}><ChevronLeft size={14} /></button>
              <span className="text-sm px-1" style={{ color: forest }}>Semana {fmt(s0)} – {fmt(addDays(s0, 5))}</span>
              <button onClick={() => setSemana(semana + 1)} className="p-1.5" style={{ border: `1px solid ${line}`, background: "#fff" }}><ChevronRight size={14} /></button>
            </div>
            <SaveBtn ctx={ctx} keys={keys} />
          </>
        } />

      <div className="flex gap-2 mb-4">
        {[["global", "Global por vendedora"], ["cuentas", "Por cuentas de Facebook"]].map(([k, l]) => (
          <button key={k} onClick={() => setModo(k)} className="text-sm px-3 py-1.5"
            style={{ background: modo === k ? forest : "#fff", color: modo === k ? "#fff" : forest, border: `1px solid ${forest}` }}>{l}</button>
        ))}
      </div>

      {modo === "global" && (
        <>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {D.metricas.map((x) => (
              <button key={x.key} onClick={() => setActiva(x.key)} className="text-sm px-3 py-1.5"
                style={{ background: activa === x.key ? amber : "#fff", color: activa === x.key ? "#fff" : forest, border: `1px solid ${amber}` }}>{x.label}</button>
            ))}
            {addOpen ? (
              <div className="flex items-center gap-1">
                <input autoFocus className="px-2 py-1.5 text-sm" style={{ ...inp, width: 150 }} placeholder="Nombre de la variable" value={nueva} onChange={(e) => setNueva(e.target.value)} />
                <PrimaryBtn onClick={agregar}><Check size={14} /></PrimaryBtn>
              </div>
            ) : (
              <button onClick={() => setAddOpen(true)} className="text-sm px-3 py-1.5 flex items-center gap-1" style={{ border: `1px dashed ${forest}`, color: forest }}><Plus size={13} /> Nueva variable</button>
            )}
            <select className="text-xs px-2 py-1.5 ml-auto" style={inp} value={vid} onChange={(e) => setVid(Number(e.target.value))}>
              <option value={0}>Todas las vendedoras</option>
              {vendedoras.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
          </div>
          <p className="text-xs mb-4" style={{ color: muted }}>{m.label}: {m.desc}</p>
          <DayGrid totalLabel={`TOTAL ${m.label.toUpperCase()}`}
            rows={vs.map((v) => ({
              label: v.nombre,
              hint: derivado(v.id) ? "suma de sus cuentas de Facebook" : undefined,
              arr: (activa === "copy" ? Dm.copy[v.id] : D.metas[activa]?.[v.id]) || zeros(),
              edit: derivado(v.id) ? null : (i, x) => setCelda(v.id, i, x),
            }))} />
        </>
      )}

      {modo === "cuentas" && (
        <>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span className="text-xs" style={{ color: muted }}>Vendedora:</span>
            <select className="text-sm px-2 py-1.5" style={inp} value={selV} onChange={(e) => setSelV(Number(e.target.value))}>
              {vendedoras.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
            <Tag tone="good">Total copy semanal de {nombreDe(selV)} en el global: {sum(Dm.copy[selV])}</Tag>
          </div>
          {mis.length === 0
            ? <p className="text-sm" style={{ color: muted }}>Esta vendedora no tiene cuentas de Facebook asignadas (asígnalas en Cuentas Facebook).</p>
            : <DayGrid totalLabel="TOTAL COPY"
              rows={[
                ...mis.map((c) => ({ label: c.nombre, arr: D.metasCuenta[c.id] || zeros(), edit: (i, x) => setCeldaCuenta(c.id, i, x) })),
                { label: "APP", arr: D.metas.app?.[selV] || zeros(), inTotal: false, edit: (i, x) => setCeldaApp(selV, i, x) },
              ]} />}
          <p className="text-xs mt-3" style={{ color: muted }}>Lo que cambies aquí (copy por cuenta y App) actualiza al instante el total global de esta pantalla; presiona Actualizar para que lo vea la vendedora y el panel general.</p>
        </>
      )}

      <div className="mt-5 p-3 text-xs flex items-center gap-2" style={{ background: "#fff", border: `1px solid ${line}`, color: "#6B6858" }}>
        <Repeat size={13} /> Si no modificas nada, cada semana nueva hereda automáticamente los mismos objetivos de la semana anterior. Cada vendedora solo ve sus propios objetivos.
      </div>
    </div>
  );
}

function AdminPuntos({ ctx }) {
  const [f, setF] = useState(newFilter("mes"));
  const [nv, setNv] = useState({ vid: 0, motivo: "", observacion: "", gravedad: "Leve", descuento: "" });
  const puedeBorrar = ctx.esAdmin !== false;
  const inp = { border: `1px solid ${line}`, background: "#FBFAF7" };
  const activas = ctx.usuarios.filter((u) => u.rol === "Vendedora" && u.estado === "Activa");
  const nom = (id) => ctx.D.usuarios.find((u) => u.id === id)?.nombre || nombreDe(id);
  const rows = ctx.D.puntos.filter((p) => passes(f, p.fecha, p.vid)).sort(byFechaDesc);
  const upd = (id, campo, val) => ctx.setDraft("puntos", (l) => l.map((p) => (p.id === id ? { ...p, [campo]: val } : p)));
  const gravTone = (g) => (g === "Fuerte" ? rust : g === "Media" ? "#8A5A00" : ink);

  const agregar = () => {
    if (!nv.vid || !nv.motivo.trim()) return;
    ctx.setDraft("puntos", (l) => [...l, { id: "pm" + Date.now(), vid: nv.vid, fecha: TODAY_ISO, motivo: nv.motivo.trim(), observacion: nv.observacion.trim(), gravedad: nv.gravedad, descuento: nv.descuento === "" ? 0 : nv.descuento }]);
    setNv({ vid: 0, motivo: "", observacion: "", gravedad: "Leve", descuento: "" });
  };

  return (
    <div>
      <SectionHeader eyebrow="Desempeño · el descuento controla su visibilidad" title="Puntos de mejora"
        action={<><VisToggle k="descuento" ctx={ctx} /><SaveBtn ctx={ctx} keys={["puntos", "vis"]} /></>} />

      <div className="bg-white p-4 mb-5" style={{ border: `1px solid ${line}`, borderLeft: `3px solid ${amber}` }}>
        <div className="text-sm mb-3" style={{ color: forest, fontWeight: 600 }}>Nuevo punto de mejora · Fecha: {fmtY(TODAY_ISO)}</div>
        <div className="flex gap-2 flex-wrap items-end">
          <div><label className="block text-xs mb-1" style={{ color: muted }}>Vendedora activa</label>
            <select className="px-2 py-2 text-sm" style={{ ...inp, minWidth: 150 }} value={nv.vid} onChange={(e) => setNv({ ...nv, vid: Number(e.target.value) })}>
              <option value={0}>Elegir…</option>
              {activas.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select></div>
          <div className="flex-1" style={{ minWidth: 200 }}><label className="block text-xs mb-1" style={{ color: muted }}>Motivo</label>
            <input className="w-full px-2 py-2 text-sm" style={inp} placeholder="Ej. mala atención, error en descripción…" value={nv.motivo} onChange={(e) => setNv({ ...nv, motivo: e.target.value })} /></div>
          <div className="flex-1" style={{ minWidth: 200 }}><label className="block text-xs mb-1" style={{ color: muted }}>Observación (opcional)</label>
            <input className="w-full px-2 py-2 text-sm" style={inp} placeholder="Detalle, qué pasó, qué se acordó…" value={nv.observacion} onChange={(e) => setNv({ ...nv, observacion: e.target.value })} /></div>
          <div><label className="block text-xs mb-1" style={{ color: muted }}>Gravedad</label>
            <select className="px-2 py-2 text-sm" style={inp} value={nv.gravedad} onChange={(e) => setNv({ ...nv, gravedad: e.target.value })}>
              <option>Leve</option><option>Media</option><option>Fuerte</option>
            </select></div>
          <div><label className="block text-xs mb-1" style={{ color: muted }}>Descuento</label>
            <NumIn w={70} value={nv.descuento} onChange={(x) => setNv({ ...nv, descuento: x })} /></div>
          <PrimaryBtn onClick={agregar}><Plus size={14} /> Agregar</PrimaryBtn>
        </div>
      </div>

      <FilterBar f={f} setF={setF} />
      <p className="text-xs mb-3" style={{ color: muted }}>Toca cualquier campo para editarlo (fecha, vendedora, motivo, observación, gravedad o descuento), o elimina el registro. Presiona Actualizar para guardar.</p>
      <LedgerTable
        columns={["Fecha", "Vendedora", "Motivo", "Observación", "Gravedad", "Descuento (columna controlada)", ""]}
        rows={rows.map((p) => [
          <input type="date" className="text-sm px-1 py-0.5" style={inp} value={p.fecha} onChange={(e) => upd(p.id, "fecha", e.target.value)} />,
          <select className="text-sm px-1 py-0.5" style={inp} value={p.vid} onChange={(e) => upd(p.id, "vid", Number(e.target.value))}>{vendedoras.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}</select>,
          <input className="px-2 py-1 text-sm w-full" style={{ ...inp, minWidth: 160 }} value={p.motivo} onChange={(e) => upd(p.id, "motivo", e.target.value)} />,
          <input className="px-2 py-1 text-sm w-full" style={{ ...inp, minWidth: 180 }} placeholder="Agregar observación…" value={p.observacion || ""} onChange={(e) => upd(p.id, "observacion", e.target.value)} />,
          <select className="px-2 py-1 text-sm" style={{ ...inp, color: gravTone(p.gravedad), fontWeight: 600 }} value={p.gravedad} onChange={(e) => upd(p.id, "gravedad", e.target.value)}>
            <option>Leve</option><option>Media</option><option>Fuerte</option>
          </select>,
          <span className="flex items-center gap-1">-$<NumIn w={56} value={p.descuento} onChange={(x) => upd(p.id, "descuento", x)} /></span>,
          puedeBorrar ? <DelBtn onDelete={() => ctx.setDraft("puntos", (l) => l.filter((x) => x.id !== p.id))} /> : "",
        ])}
      />
    </div>
  );
}

function TierEditor({ title, peso, onPeso, cfg, onCfg, note }) {
  const set = (k) => (v) => onCfg({ ...cfg, [k]: v === "" ? 0 : v });
  const Row = ({ children }) => <div className="flex items-center gap-2 text-sm py-1.5 flex-wrap" style={{ color: ink }}>{children}</div>;
  return (
    <div className="p-4" style={{ background: "#fff", border: `1px solid ${line}` }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm" style={{ color: forest, fontWeight: 600 }}>{title}</span>
        <span className="text-xs flex items-center gap-1" style={{ color: muted }}>Peso <NumIn w={46} value={peso} onChange={onPeso} />%</span>
      </div>
      <Row>Llega al objetivo (100%) → <NumIn value={cfg.a} onChange={set("a")} />% del bono</Row>
      <Row>Cumple de <NumIn value={cfg.min} onChange={set("min")} />% al 99% → <NumIn value={cfg.b} onChange={set("b")} />%</Row>
      <Row>Menos de {cfg.min}% → <NumIn value={cfg.c} onChange={set("c")} />%</Row>
      {note && <p className="text-xs mt-1" style={{ color: muted }}>{note}</p>}
    </div>
  );
}

function AdminBonos({ ctx }) {
  const { D, setDraft } = ctx;
  const { rules, pesos, extra, ventas } = D;
  const [f, setF] = useState(newFilter("todo"));
  const bonos = computeBonos(draftCtx(ctx)).filter((b) => !f.vid || b.v.id === f.vid);
  const setRules = (fn) => setDraft("rules", fn);
  const r = (k) => (v) => setRules((x) => ({ ...x, [k]: v === "" ? 0 : v }));
  const setPeso = (k) => (v) => setDraft("pesos", (x) => ({ ...x, [k]: v }));
  const card = { background: "#fff", border: `1px solid ${line}` };
  const Row = ({ children }) => <div className="flex items-center gap-2 text-sm py-1.5 flex-wrap" style={{ color: ink }}>{children}</div>;
  const P = ({ k }) => <span className="text-xs flex items-center gap-1" style={{ color: muted }}>Peso <NumIn w={46} value={pesos[k]} onChange={setPeso(k)} />%</span>;

  return (
    <div>
      <SectionHeader eyebrow="Bono base × % cumplimiento − descuentos" title="Bonificaciones"
        action={<><VisToggle k="bono" ctx={ctx} /><SaveBtn ctx={ctx} keys={["rules", "pesos", "extra", "ventas", "vis"]} /></>} />
      <FilterBar f={f} setF={setF} modes={[]} />

      <h3 className="text-sm mb-3" style={{ color: forest, fontWeight: 600 }}>Reglas de medición del % de cumplimiento</h3>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-4" style={card}>
          <div className="flex items-center justify-between mb-2"><span className="text-sm" style={{ color: forest, fontWeight: 600 }}>Puntualidad</span><P k="puntualidad" /></div>
          <Row>Hasta <NumIn value={rules.p1} onChange={r("p1")} /> retrasos → <NumIn value={rules.p1pct} onChange={r("p1pct")} />% del bono</Row>
          <Row>Hasta <NumIn value={rules.p2} onChange={r("p2")} /> retrasos → <NumIn value={rules.p2pct} onChange={r("p2pct")} />% del bono</Row>
          <Row>Más de {rules.p2} retrasos → <NumIn value={rules.p3pct} onChange={r("p3pct")} />%</Row>
        </div>
        <div className="p-4" style={card}>
          <div className="flex items-center justify-between mb-2"><span className="text-sm" style={{ color: forest, fontWeight: 600 }}>Seguimiento de instrucciones</span><P k="seguimiento" /></div>
          <Row>Sin llamadas de atención → <NumIn value={rules.s1pct} onChange={r("s1pct")} />%</Row>
          <Row>Hasta <NumIn value={rules.sMediasMax} onChange={r("sMediasMax")} /> puntos de gravedad media → <NumIn value={rules.s2pct} onChange={r("s2pct")} />%</Row>
          <Row>Más de {rules.sMediasMax} medias, o <NumIn value={rules.sFuerteMax} onChange={r("sFuerteMax")} /> o más de gravedad fuerte → <NumIn value={rules.s3pct} onChange={r("s3pct")} />%</Row>
        </div>
        <TierEditor title="Cumplimiento de metas · APP" peso={pesos.app} onPeso={setPeso("app")} cfg={rules.app} onCfg={(c) => setRules((x) => ({ ...x, app: c }))} />
        <TierEditor title="Cumplimiento de metas · Copy" peso={pesos.copy} onPeso={setPeso("copy")} cfg={rules.copy} onCfg={(c) => setRules((x) => ({ ...x, copy: c }))} note="Mismas escalas que APP por defecto; puedes cambiarlas." />
        <TierEditor title="Cumplimiento de ventas" peso={pesos.ventas} onPeso={setPeso("ventas")} cfg={rules.ventas} onCfg={(c) => setRules((x) => ({ ...x, ventas: c }))} note="Las ventas las llena la administradora cada mes (tabla de abajo)." />
        <div className="p-4" style={card}>
          <div className="text-sm mb-2" style={{ color: forest, fontWeight: 600 }}>Otras variables de medición</div>
          {extra.map((e, i) => (
            <div key={i} className="flex items-center justify-between py-1.5">
              <input className="px-2 py-1 text-sm" style={{ border: `1px solid ${line}`, background: "#FBFAF7", width: 190 }} value={e.name}
                onChange={(ev) => setDraft("extra", (l) => l.map((x, j) => (j === i ? { ...x, name: ev.target.value } : x)))} />
              <span className="text-xs flex items-center gap-1" style={{ color: muted }}>Peso <NumIn w={46} value={e.peso} onChange={(x) => setDraft("extra", (l) => l.map((y, j) => (j === i ? { ...y, peso: x } : y)))} />%</span>
            </div>
          ))}
          <button onClick={() => setDraft("extra", (l) => [...l, { name: "Nueva variable (definir regla)", peso: 0 }])} className="text-xs mt-1 flex items-center gap-1" style={{ color: forest }}>
            <Plus size={12} /> Agregar variable de medición
          </button>
        </div>
      </div>

      <h3 className="text-sm mb-3 mt-8" style={{ color: forest, fontWeight: 600 }}>Ventas del período (las llena la administradora cada mes)</h3>
      <LedgerTable
        columns={["Vendedora", "Período de pago", "Meta de ventas", "Ventas logradas", "% logrado"]}
        rows={vendedoras.filter((v) => !f.vid || v.id === f.vid).map((v) => {
          const vt = ventas[v.id] || { meta: 0, logrado: 0 };
          const set = (k) => (x) => setDraft("ventas", (l) => ({ ...l, [v.id]: { ...vt, [k]: x === "" ? 0 : x } }));
          return [v.nombre, cicloLabel(cycleFor(v.ingresoISO, TODAY_ISO)), <NumIn w={80} value={vt.meta} onChange={set("meta")} />, <NumIn w={80} value={vt.logrado} onChange={set("logrado")} />, `${pct(vt.logrado, vt.meta)}%`];
        })}
      />

      <h3 className="text-sm mb-3 mt-8" style={{ color: forest, fontWeight: 600 }}>Resultado por vendedora (avance a la fecha de su período de pago)</h3>
      <LedgerTable
        columns={["Vendedora", "Período", "Base", "Copy", "App", "Ventas", "Puntualidad", "Seguimiento", "Cumplimiento", "Descuentos", "Bono final"]}
        rows={bonos.map((b) => {
          const sub = (p) => <span className="text-xs" style={{ color: muted }}> ({Math.round(p)}%)</span>;
          return [
            b.v.nombre, cicloLabel(b.c), `$${b.v.bonoBase}`,
            <span>{b.copyT}%{sub(b.copyP)}</span>, <span>{b.appT}%{sub(b.appP)}</span>, <span>{b.ventasT}%{sub(b.ventasP)}</span>,
            <span>{b.punt}%<span className="text-xs" style={{ color: muted }}> ({b.retr} retr.)</span></span>, `${b.seg}%`,
            <b>{b.cum}%</b>, `-$${b.desc}`,
            <span style={{ fontFamily: slab, fontWeight: 700, color: forest }}>${b.final}</span>,
          ];
        })}
      />
      <p className="text-xs mt-3" style={{ color: muted }}>Entre paréntesis: el avance real; el porcentaje grande es el que aplica según la escala. El resultado se recalcula al instante con tus cambios; presiona Actualizar para guardarlos.</p>
    </div>
  );
}

function AdminAuditoria({ ctx }) {
  const [f, setF] = useState(newFilter("todo"));
  const rows = ctx.auditoria.filter((a) => passes(f, a.fecha, a.vid));
  return (
    <div>
      <SectionHeader eyebrow="Reaperturas y cambios registrados" title="Auditoría" action={<SaveBtn ctx={ctx} keys={[]} />} />
      <FilterBar f={f} setF={setF} />
      <div className="flex flex-col gap-3">
        {rows.map((a) => (
          <div key={a.id} className="bg-white p-4" style={{ border: `1px solid ${line}`, borderLeft: `3px solid ${amber}` }}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm" style={{ color: forest, fontWeight: 600 }}>{a.accion}</span>
              <span className="text-xs" style={{ color: muted }}>{fmtY(a.fecha)}, {a.hora}</span>
            </div>
            <p className="text-sm mb-2" style={{ color: ink }}>{a.motivo}</p>
            <div className="flex gap-4 text-xs" style={{ color: muted }}>
              <span>Usuario afectado: {nombreDe(a.vid)}</span>
              <span>Reabierto por: {a.admin}</span>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-xs" style={{ color: muted }}>No hay registros con este filtro.</p>}
      </div>
    </div>
  );
}

// ---------- Panel Vendedora (solo ve lo suyo) ----------
function VendedoraPanel({ ctx, me }) {
  // Sus propios avances (fbLog) son borrador hasta que presione "Actualizar"; lo demás viene de lo ya guardado por la administradora
  const vctx = { ...ctx, fbLog: ctx.D.fbLog, appLog: ctx.D.appLog };
  const { metas, metricas, vis, puntos, metasCuenta, asist } = vctx;
  const mis = cuentasDe(ctx.cuentas, me.id);
  const [cid, setCid] = useState(null);
  const [semV, setSemV] = useState(0); // semana que se está viendo en Metas
  const cuenta = mis.find((c) => c.id === cid) || mis[0];
  const c = cycleFor(me.ingresoISO, TODAY_ISO);
  const b = computeBonos(vctx).find((x) => x.v.id === me.id);
  const misPuntos = puntos.filter((p) => p.vid === me.id && p.fecha >= c.start && p.fecha <= c.end);
  const hoy = asist.find((a) => a.vid === me.id && a.fecha === TODAY_ISO);
  const pubHoy = sum(vctx.fbLog.filter((e) => e.vid === me.id && e.fecha === TODAY_ISO).map((e) => +e.total || 0));
  const [ms] = monthRange(TODAY_ISO.slice(0, 7));
  const card = { background: "#fff", border: `1px solid ${line}` };
  const H = ({ children }) => <div className="text-sm mb-3" style={{ color: forest, fontWeight: 600 }}>{children}</div>;

  const cyA = maxISO(c.start, me.ingresoISO), cyB = minISO(c.end, TODAY_ISO);
  const presentes = asist.filter((a) => a.vid === me.id && a.fecha >= cyA && a.fecha <= cyB);
  const pendCopy = Math.max(0, metaRango(metas, "copy", me, ms, TODAY_ISO) - hechoFor(vctx, "copy", me.id, ms, TODAY_ISO));
  const pendApp = Math.max(0, metaRango(metas, "app", me, ms, TODAY_ISO) - hechoFor(vctx, "app", me.id, ms, TODAY_ISO));
  // Domingo: no es día laborable (sin meta), pero si trabajó se muestra en su resumen
  const domISO = addDays(WEEK_START, 6);
  const conDom = metricas.some((m) => hechoFor(vctx, m.key, me.id, domISO, domISO) > 0);
  const dias = conDom ? [...DAYS, "Dom"] : DAYS;

  return (
    <div className="min-h-full py-8 px-6 max-w-lg mx-auto" style={{ background: paper }}>
      <div className="mb-6">
        <div className="text-xs" style={{ color: muted }}>Hoy · sábado 26 de septiembre · Ingreso: {fmtY(me.ingresoISO)}</div>
        <h1 style={{ fontFamily: slab, fontSize: 24, color: forest, fontWeight: 600 }}>Hola, {me.nombre.split(" ")[0]}</h1>
        <div className="mt-2"><InstallBtn /></div>
      </div>

      <div className="p-3 mb-4 text-xs flex items-center gap-2" style={{ background: "#FBEFD9", border: "1px solid #EFCB86", color: "#8A5A00" }}>
        <Clock size={14} /> Puedes registrar y editar tus avances de hoy hasta las 00:00. Después solo la administradora puede modificarlos.
      </div>

      <AsistenciaHoy ctx={ctx} me={me} />

      <div className="p-5 mb-4" style={card}>
        <H>Mis objetivos de la semana · Copy y App</H>
        <div className="text-xs mb-3 -mt-2 flex items-center gap-1.5" style={{ color: amber, fontWeight: 600 }}>
          <CalendarDays size={13} /> {fmtLargo(WEEK_START)} – {fmtLargo(addDays(WEEK_START, conDom ? 6 : 5))}
          {conDom && <span className="text-xs" style={{ color: muted, fontWeight: 400 }}>· incluye lo que trabajaste el domingo (sin meta)</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${forest}` }}>
                <th className="py-1.5 pr-2"></th>
                {dias.map((d) => <th key={d} className="py-1.5 px-1 text-center font-medium" style={{ color: d === "Dom" ? amber : forest }}>{d}</th>)}
                <th className="py-1.5 pl-2 text-right" style={{ color: forest }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {metricas.map((m) => {
                const meta = [...(metas[m.key]?.[me.id] || zeros()).slice(0, NDIAS), ...(conDom ? [0] : [])];
                const hecho = dias.map((_, i) => { const d = addDays(WEEK_START, i); return hechoFor(vctx, m.key, me.id, d, d); });
                return (
                  <React.Fragment key={m.key}>
                    <tr style={{ borderTop: `1px solid ${line}` }}>
                      <td className="py-1.5 pr-2" style={{ color: muted }}>{m.label} · meta</td>
                      {meta.map((x, i) => <td key={i} className="px-1 text-center" style={{ color: x ? ink : "#C9C5B4" }}>{x || "·"}</td>)}
                      <td className="pl-2 text-right" style={{ fontFamily: slab, fontWeight: 700, color: forest }}>{sum(meta.map(Number))}</td>
                    </tr>
                    <tr style={{ borderBottom: `1px solid ${line}` }}>
                      <td className="py-1.5 pr-2" style={{ color: forest, fontWeight: 600 }}>{m.label} · hecho</td>
                      {hecho.map((x, i) => <td key={i} className="px-1 text-center" style={{ color: meta[i] && x >= meta[i] ? "#2F5D3A" : ink, fontWeight: x ? 600 : 400 }}>{x || "·"}</td>)}
                      <td className="pl-2 text-right" style={{ fontFamily: slab, fontWeight: 700, color: amber }}>{sum(hecho)}</td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {metricas.map((m) => (
            <div key={m.key} className="flex items-center justify-between text-xs">
              <span style={{ color: muted }}>{m.label} · mes (a la fecha)</span>
              <Prog hecho={hechoFor(vctx, m.key, me.id, ms, TODAY_ISO)} meta={metaRango(metas, m.key, me, ms, TODAY_ISO)} />
            </div>
          ))}
        </div>
      </div>

      <div className="p-5 mb-4" style={card}>
        <H>Objetivo por cuenta de Facebook</H>
        <div className="flex items-center gap-1 mb-3">
          <button onClick={() => setSemV(semV - 1)} className="p-1.5" style={{ border: `1px solid ${line}`, background: "#fff" }}><ChevronLeft size={14} /></button>
          <span className="text-sm px-1" style={{ color: forest }}>Semana {fmt(addDays(WEEK_START, semV * 7))} – {fmt(addDays(WEEK_START, semV * 7 + 5))}{semV === 0 && <span className="text-xs ml-1" style={{ color: muted }}>(esta semana)</span>}</span>
          <button onClick={() => setSemV(semV + 1)} className="p-1.5" style={{ border: `1px solid ${line}`, background: "#fff" }}><ChevronRight size={14} /></button>
        </div>
        {mis.length === 0 ? <p className="text-xs" style={{ color: muted }}>No tienes cuentas asignadas.</p> : (
          <DayGrid totalLabel="TOTAL COPY"
            rows={[...mis.map((x) => ({ label: x.nombre, arr: metasCuenta[x.id] || zeros() })), { label: "APP", arr: metas.app?.[me.id] || zeros(), inTotal: false }]} />
        )}
      </div>

      {vis.pendientes === "todas" ? (
        <div className="p-5 mb-4" style={card}>
          <H>Mis pendientes del mes</H>
          <div className="flex gap-6 flex-wrap">
            <div><div style={{ fontFamily: slab, fontSize: 22, color: forest, fontWeight: 600 }}>{hechoFor(vctx, "copy", me.id, ms, TODAY_ISO)}</div><div className="text-xs" style={{ color: muted }}>Copys</div></div>
            <div><div style={{ fontFamily: slab, fontSize: 22, color: forest, fontWeight: 600 }}>{sum(vctx.fbLog.filter((e) => e.vid === me.id && e.fecha >= ms && e.fecha <= TODAY_ISO).map((e) => +e.links || 0))}</div><div className="text-xs" style={{ color: muted }}>Links</div></div>
            <div><div style={{ fontFamily: slab, fontSize: 22, color: amber, fontWeight: 600 }}>{pendCopy}</div><div className="text-xs" style={{ color: muted }}>Pendiente copy</div></div>
            <div><div style={{ fontFamily: slab, fontSize: 22, color: amber, fontWeight: 600 }}>{pendApp}</div><div className="text-xs" style={{ color: muted }}>Pendiente App</div></div>
          </div>
        </div>
      ) : <Locked label="Pendientes" />}

      <div className="p-5 mb-4" style={card}>
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <span className="text-sm" style={{ color: forest, fontWeight: 600 }}>Mis cuentas de Facebook</span>
          <div className="flex items-center gap-2">
            <Tag tone="good">Publicaciones de hoy: {pubHoy}</Tag>
            <SaveBtn ctx={ctx} keys={["fbLog"]} />
          </div>
        </div>
        {mis.length === 0 ? <p className="text-xs" style={{ color: muted }}>No tienes cuentas asignadas.</p> : (
          <>
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {mis.map((x) => (
                <button key={x.id} onClick={() => setCid(x.id)} className="text-xs px-2.5 py-1.5"
                  style={{ background: cuenta.id === x.id ? forest : "#fff", color: cuenta.id === x.id ? "#fff" : forest, border: `1px solid ${forest}` }}>{x.nombre}</button>
              ))}
            </div>
            <FbTracker key={cuenta.id} ctx={ctx} cuenta={cuenta} mode="vend" />
          </>
        )}
      </div>

      <RegistroAppVend ctx={ctx} me={me} />

      {vis.asistencia === "todas" ? (
        <div className="p-5 mb-4" style={card}>
          <H>Mi asistencia · período {cicloLabel(c)}</H>
          <div className="text-sm flex justify-between" style={{ color: ink }}>
            <span>Presentes: {presentes.length}</span>
            <span>Retrasos: {presentes.filter((a) => esTarde(ctx, a)).length}</span>
            <span>Faltas: {esLibre(ctx, me.id) ? "—" : Math.max(0, workdays(cyA, cyB) - presentes.length)}</span>
          </div>
        </div>
      ) : <Locked label="Asistencia" />}

      <div className="p-5 mb-4" style={card}>
        <H>Mis puntos de mejora</H>
        {misPuntos.length === 0 && <p className="text-xs" style={{ color: muted }}>Sin puntos de mejora en este período.</p>}
        {misPuntos.map((p) => (
          <div key={p.id} className="flex items-center justify-between text-sm py-2" style={{ borderBottom: `1px solid ${line}` }}>
            <span>{fmt(p.fecha)} · {p.motivo}</span>
            <span className="flex items-center gap-2">
              <Tag tone={p.gravedad === "Fuerte" ? "bad" : p.gravedad === "Media" ? "warn" : "neutral"}>{p.gravedad}</Tag>
              {vis.descuento === "todas" && <span className="text-xs">-${p.descuento}</span>}
            </span>
          </div>
        ))}
        {vis.descuento !== "todas" && misPuntos.length > 0 && <p className="text-xs mt-2 flex items-center gap-1" style={{ color: muted }}><Lock size={11} /> El descuento no está habilitado para ti.</p>}
      </div>

      {vis.bono === "todas" ? (
        <div className="p-5 mb-4" style={card}>
          <H>Mi bono del período</H>
          <div style={{ fontFamily: slab, fontSize: 26, color: forest, fontWeight: 700 }}>${b.final}</div>
          <div className="text-xs mt-1" style={{ color: muted }}>Cumplimiento {b.cum}% · Descuentos -${b.desc}</div>
        </div>
      ) : <Locked label="Bonificación" />}
    </div>
  );
}

const NOMBRES_CAMBIO = {
  asist: "Asistencia", usuarios: "Usuarios", horario: "Horario", tienda: "Ubicación de la tienda", fbLog: "Facebook",
  appLog: "Registro APP", puntos: "Puntos de mejora", metas: "Metas", metasCuenta: "Metas", vis: "Visibilidad",
  rules: "Bonificaciones", pesos: "Bonificaciones", extra: "Bonificaciones", ventas: "Ventas", cuentas: "Cuentas", categorias: "Categorías",
};

// ---------- App raíz (solo vista previa) ----------
export default function App() {
  const [view, setView] = useState("login");
  const [viewerId, setViewerId] = useState(1);
  // S = lo guardado (lo que ven las demás pantallas). D = borrador (lo que se está editando).
  const [S, setS] = useState(estadoInicial);
  const [D, setD] = useState(estadoInicial);
  const setDraft = (k, v) => setD((p) => ({ ...p, [k]: typeof v === "function" ? v(p[k]) : v }));
  const dirty = (ks) => ks.some((k) => D[k] !== S[k]);
  // aplica un cambio al instante (por ejemplo una marca de entrada/salida) sin esperar a "Actualizar"
  const apply = (k, fn) => {
    const nv = fn(S[k]);
    setS((p) => ({ ...p, [k]: nv }));
    setD((p) => ({ ...p, [k]: p[k] === S[k] ? nv : fn(p[k]) }));
  };
  const pendientes = Object.keys(D).filter((k) => D[k] !== S[k]);
  const saveAll = () => setS(D);
  const discard = () => setD(S);
  const save = (ks) => setS((p) => { const n = { ...p }; ks.forEach((k) => { n[k] = D[k]; }); return n; });

  const ctx = {
    ...S,
    metas: effMetas(S.metas, S.metasCuenta, S.cuentas),
    S, D, setDraft, apply, dirty, save, auditoria: auditoriaInit,
  };
  const me = vendedoras.find((v) => v.id === viewerId);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: ink }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Zilla+Slab:wght@500;600;700&display=swap');`}</style>
      <div className="flex items-center gap-2 px-4 py-2 text-xs flex-wrap" style={{ background: "#fff", borderBottom: `1px solid ${line}` }}>
        <span style={{ color: muted }}>Vista previa:</span>
        {["login", "admin", "supervisora", "vendedora"].map((v) => (
          <button key={v} onClick={() => setView(v)} className="px-2.5 py-1"
            style={{ background: view === v ? forest : "transparent", color: view === v ? "#fff" : forest, border: `1px solid ${forest}` }}>
            {v === "login" ? "Login" : v === "admin" ? "Administradora" : v === "supervisora" ? "Supervisora" : "Vendedora"}
          </button>
        ))}
        {view === "vendedora" && (
          <>
            <span style={{ color: muted }} className="ml-3">Ver como:</span>
            <select value={viewerId} onChange={(e) => setViewerId(Number(e.target.value))} className="px-2 py-1" style={{ border: `1px solid ${line}` }}>
              {vendedoras.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
          </>
        )}
      </div>
      {view === "login" && <LoginScreen onLogin={(role) => setView(role)} />}
      {view === "admin" && <AdminPanel ctx={ctx} esAdmin />}
      {view === "supervisora" && <AdminPanel key="sup" ctx={{ ...ctx, esAdmin: false }} esAdmin={false} />}
      {view === "vendedora" && <VendedoraPanel ctx={ctx} me={me} />}

      {/* Barra general: guarda CUALQUIER campo editado, en el bloque de la administradora y en el de la vendedora */}
      {view !== "login" && pendientes.length > 0 && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-4 z-50 flex items-center gap-3 px-4 py-3 text-sm flex-wrap justify-center"
          style={{ background: forest, color: "#fff", boxShadow: "0 6px 24px rgba(0,0,0,.25)", maxWidth: "94vw" }}>
          <span>● Cambios sin guardar en: <b>{[...new Set(pendientes.map((k) => NOMBRES_CAMBIO[k] || k))].join(", ")}</b></span>
          <button onClick={saveAll} className="px-3 py-1.5 text-sm flex items-center gap-1.5" style={{ background: amber, color: "#fff" }}><RefreshCw size={14} /> Actualizar todo</button>
          <button onClick={discard} className="px-3 py-1.5 text-sm" style={{ border: "1px solid #9FC2B4", color: "#fff" }}>Descartar</button>
        </div>
      )}
    </div>
  );
}
