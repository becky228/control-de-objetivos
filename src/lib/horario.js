// Horario, turnos, marcas de entrada/salida y horas trabajadas.
// Reglas: no hay horas extras (se cuenta hasta la salida del turno) y una salida olvidada se cierra sola
// a (salida del turno + cierre_min), por ejemplo 19:00 + 10 min = 19:10.

export const MOTIVOS = ["Permiso personal", "Trámite", "Salud", "Fin de jornada", "Otro"];

const pad = (n) => String(n).padStart(2, "0");
export const t5 = (t) => (t ? String(t).slice(0, 5) : ""); // "08:05:00" -> "08:05"
export const hm = (t) => { const [h, m] = String(t || "0:0").split(":").map(Number); return (h || 0) * 60 + (m || 0); };
export const mm = (n) => `${pad(Math.floor(n / 60) % 24)}:${pad(n % 60)}`;
export const dur = (min) => `${Math.floor(min / 60)} h ${pad(min % 60)} min`;

export const HORARIO_DEFECTO = {
  tolerancia: 5, cierreMin: 10, defecto: 0,
  turnos: [{ id: 0, nombre: "Tiempo completo", tipo: "fijo", inicio: "09:00", fin: "19:00" }],
};

export const turnoDe = (h, perfil) => {
  const x = h || HORARIO_DEFECTO;
  return x.turnos.find((t) => t.id === (perfil?.turno_id ?? x.defecto)) || x.turnos[0];
};
export const esLibre = (h, perfil) => turnoDe(h, perfil).tipo === "libre";
export const finTurno = (h, perfil) => hm(turnoDe(h, perfil).fin || "19:00"); // tope: no hay horas extras
export const cierreAuto = (h, perfil) => finTurno(h, perfil) + (Number((h || HORARIO_DEFECTO).cierreMin) || 0);
export const limiteTarde = (h, perfil) =>
  esLibre(h, perfil) ? "" : mm(hm(turnoDe(h, perfil).inicio) + (Number((h || HORARIO_DEFECTO).tolerancia) || 0));
// turno libre: no hay retraso
export const esTardeEntrada = (h, perfil, entrada) => !!entrada && !esLibre(h, perfil) && t5(entrada) > limiteTarde(h, perfil);

// Marcas "efectivas": una salida olvidada se cierra sola si el día ya pasó o ya llegó la hora de cierre
export function marcasEf(h, perfil, fecha, marcas, todayISO, ahora) {
  return (marcas || []).map((m) => {
    const base = { ...m, entrada: t5(m.hora_entrada), salida: t5(m.hora_salida) };
    if (base.salida) return { ...base, auto: !!m.auto_cierre };
    const vencida = fecha < todayISO || (ahora != null && hm(ahora) >= cierreAuto(h, perfil));
    return vencida ? { ...base, salida: mm(Math.max(hm(base.entrada), cierreAuto(h, perfil))), auto: true } : base;
  }).sort((a, b) => hm(a.entrada) - hm(b.entrada));
}

// Horas trabajadas y tiempo de permiso de un día, con tope en la salida del turno
export function calcDia(h, perfil, fecha, marcas, todayISO, ahora) {
  const ms = marcasEf(h, perfil, fecha, marcas, todayISO, ahora);
  const tope = finTurno(h, perfil);
  const cl = (t) => Math.min(hm(t), tope);
  let horas = 0, fuera = 0;
  ms.forEach((m) => { if (m.salida) horas += Math.max(0, cl(m.salida) - cl(m.entrada)); });
  ms.slice(1).forEach((m, i) => { const p = ms[i]; if (p.salida && !p.auto) fuera += Math.max(0, cl(m.entrada) - cl(p.salida)); });
  return { horas, fuera, ms, auto: ms.some((m) => m.auto) };
}

export const claveDia = (userId, fecha) => `${userId}|${fecha}`;
export function agruparMarcas(marcas) {
  const mapa = {};
  (marcas || []).forEach((m) => { (mapa[claveDia(m.user_id, m.fecha)] ||= []).push(m); });
  return mapa;
}
