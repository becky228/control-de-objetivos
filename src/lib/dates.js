// Utilidades de fecha compartidas por toda la app.
export const pad = (n) => String(n).padStart(2, "0");
export const isoToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const toDate = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const addDays = (s, n) => {
  const d = toDate(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};
// 0 = lunes ... 6 = domingo
export const dow = (s) => (toDate(s).getDay() + 6) % 7;
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const fmt = (s) => {
  const d = toDate(s);
  return `${pad(d.getDate())} ${MESES[d.getMonth()]}`;
};
export const fmtY = (s) => `${fmt(s)} ${toDate(s).getFullYear()}`;
export const maxISO = (a, b) => (a > b ? a : b);
export const minISO = (a, b) => (a < b ? a : b);
const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const clampDate = (y, m, d) => new Date(y, m, Math.min(d, daysInMonth(y, m)));
export const monthRange = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return [`${ym}-01`, `${ym}-${pad(daysInMonth(y, m - 1))}`];
};
export const isClosed = (fecha) => fecha < isoToday(); // los registros cierran a las 00:00

// Período de pago de una vendedora: desde su día de ingreso hasta el
// día anterior de ese mismo día del mes siguiente (ej. ingreso el 10 ->
// el período va del 10 al 9 del mes siguiente).
export function cycleFor(ingresoISO, refISO) {
  const dd = toDate(ingresoISO).getDate();
  const r = toDate(refISO);
  let start = clampDate(r.getFullYear(), r.getMonth(), dd);
  if (start > r) start = clampDate(r.getFullYear(), r.getMonth() - 1, dd);
  const next = clampDate(start.getFullYear(), start.getMonth() + 1, dd);
  const end = new Date(next);
  end.setDate(end.getDate() - 1);
  return { start: iso(start), end: iso(end) };
}
export function cycleBack(ingresoISO, refISO, back) {
  let c = cycleFor(ingresoISO, refISO);
  for (let i = 0; i < back; i++) c = cycleFor(ingresoISO, addDays(c.start, -1));
  return c;
}
export const cicloLabel = (c) => `${fmt(c.start)} – ${fmt(c.end)}`;
export function workdays(a, b) {
  let n = 0;
  for (let d = a; d <= b; d = addDays(d, 1)) if (dow(d) !== 6) n++;
  return n;
}
export const sum = (arr) => (arr || []).reduce((x, y) => x + (Number(y) || 0), 0);
export const pct = (h, m) => (m ? Math.round((h / m) * 100) : 0);
export const zeros = () => [0, 0, 0, 0, 0, 0, 0];
// Se trabaja de lunes a sábado (6 días). Los arreglos de metas siguen teniendo 7 posiciones; la 7ª (domingo) se ignora.
export const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export const NDIAS = DAYS.length;
export const sumSemana = (arr) => sum((arr || []).slice(0, NDIAS));
export const weekStartOf = (fechaISO) => addDays(fechaISO, -dow(fechaISO));
