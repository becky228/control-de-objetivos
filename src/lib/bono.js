import { addDays, maxISO, minISO, dow, weekStartOf, sum, cycleFor } from "./dates.js";

// Valor de meta vigente para un día concreto, a partir de las filas versionadas.
function metaValorDia(rows, vendedoraId, variable, fechaISO) {
  const semanaInicio = weekStartOf(fechaISO);
  const d = dow(fechaISO);
  const candidatos = rows.filter(
    (r) => r.vendedora_id === vendedoraId && r.variable === variable && r.dia_semana === d && r.vigente_desde <= semanaInicio
  );
  if (!candidatos.length) return 0;
  candidatos.sort((a, b) => (a.vigente_desde < b.vigente_desde ? 1 : -1));
  return candidatos[0].valor;
}
export function metaRango(rows, vendedoraId, variable, a, b) {
  let t = 0;
  for (let d = a; d <= b; d = addDays(d, 1)) t += metaValorDia(rows, vendedoraId, variable, d);
  return t;
}
export function hechoCopy(fbLog, vendedoraId, a, b) {
  return sum(fbLog.filter((e) => e.vendedora_id === vendedoraId && e.fecha >= a && e.fecha <= b).map((e) => e.total || 0));
}
export function hechoApp(appLog, vendedoraId, a, b) {
  return sum(appLog.filter((e) => e.user_id === vendedoraId && e.fecha >= a && e.fecha <= b).map((e) => e.cantidad || 0));
}

const tier = (p, c) => (p >= 100 ? c.a : p >= c.min ? c.b : c.c);

// Calcula el bono de una vendedora para su período de pago actual.
export function computeBonoVendedora(v, { metasGlobales, fbLog, appLog, asist, puntos, ventas, bonoConfig, todayISO }) {
  const c = cycleFor(v.ingreso_fecha, todayISO);
  const a = maxISO(c.start, v.ingreso_fecha), b = minISO(c.end, todayISO);

  const metaCopy = metaRango(metasGlobales, v.id, "copy", a, b);
  const metaApp = metaRango(metasGlobales, v.id, "app", a, b);
  const hCopy = hechoCopy(fbLog, v.id, a, b);
  const hApp = hechoApp(appLog, v.id, a, b);
  const copyP = metaCopy ? (hCopy / metaCopy) * 100 : 100;
  const appP = metaApp ? (hApp / metaApp) * 100 : 100;

  const vt = ventas.find((x) => x.vendedora_id === v.id && x.periodo_inicio === c.start) || { meta: 0, logrado: 0 };
  const ventasP = vt.meta ? (vt.logrado / vt.meta) * 100 : 100;

  const LATE_AFTER = "08:05";
  const retr = asist.filter((x) => x.user_id === v.id && x.fecha >= a && x.fecha <= b && x.hora_entrada && x.hora_entrada > LATE_AFTER).length;
  const rp = bonoConfig.puntualidad;
  const punt = retr <= rp.p1 ? rp.p1pct : retr <= rp.p2 ? rp.p2pct : rp.p3pct;

  const pv = puntos.filter((p) => p.vendedora_id === v.id && p.fecha >= c.start && p.fecha <= c.end);
  const medias = pv.filter((p) => p.gravedad === "Media").length;
  const fuertes = pv.filter((p) => p.gravedad === "Fuerte").length;
  const rs = bonoConfig.seguimiento;
  const seg = fuertes >= rs.sFuerteMax || medias > rs.sMediasMax ? rs.s3pct : medias >= 1 ? rs.s2pct : rs.s1pct;

  const copyT = tier(copyP, bonoConfig.copy);
  const appT = tier(appP, bonoConfig.app);
  const ventasT = tier(ventasP, bonoConfig.ventas);

  const w = { p: +rp.peso || 0, s: +rs.peso || 0, c: +bonoConfig.copy.peso || 0, a: +bonoConfig.app.peso || 0, v: +bonoConfig.ventas.peso || 0 };
  const tot = w.p + w.s + w.c + w.a + w.v || 1;
  const cum = Math.round((punt * w.p + seg * w.s + copyT * w.c + appT * w.a + ventasT * w.v) / tot);
  const desc = sum(pv.map((p) => p.descuento));
  const final = Math.max(0, Math.round((v.bono_base * cum) / 100 - desc));

  return { v, c, retr, copyP, appP, ventasP, copyT, appT, ventasT, punt, seg, cum, desc, final, metaCopy, hCopy, metaApp, hApp };
}
