import React, { useEffect, useState } from "react";
import { SectionHeader, LedgerTable, Tag, FilterBar, newFilter, passes, PrimaryBtn, Field, inputStyle, COLORS } from "../../components/ui.jsx";
import { supabase } from "../../lib/supabase.js";
import { useAuth } from "../../context/AuthProvider.jsx";
import { useBatch, ActualizarBtn } from "../../context/PendingProvider.jsx";
import { fetchVendedoras, fetchAsistencia, fetchMarcas, fetchHorario, cerrarSalidasOlvidadas, todayISO } from "../../lib/api.js";
import { cycleBack, cicloLabel, maxISO, minISO, workdays, fmtY, fmtLargo, dow, sum } from "../../lib/dates.js";
import { MOTIVOS, HORARIO_DEFECTO, dur, mm, hm, t5, turnoDe, esLibre, esTardeEntrada, calcDia, cierreAuto } from "../../lib/horario.js";

const ahoraHHMM = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

export default function Asistencia() {
  const today = todayISO();
  const [vendedoras, setVendedoras] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [att, setAtt] = useState([]);            // resumen del día (ubicación)
  const [horario, setHorario] = useState(HORARIO_DEFECTO);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState(newFilter("mes", today));
  const [back, setBack] = useState(0);
  const [sel, setSel] = useState(null);          // "user|fecha" del día con el detalle abierto
  const [err, setErr] = useState("");
  const [nv, setNv] = useState({ vid: "", fecha: today, entrada: "09:00", salida: "" });
  const { profile } = useAuth();
  const puedeBorrar = profile?.rol === "admin";
  const bm = useBatch({ key: "marcas", label: "Asistencia", table: "asistencia_marcas" });
  const bg = useBatch({ key: "asist_gps", label: "Ubicación", table: "attendance" });
  const pendiente = bm.count + bg.count;
  const guardarTodo = async () => { await bm.save(); await bg.save(); };

  const cargar = async () => {
    await cerrarSalidasOlvidadas();
    const [vs, m, a, h] = await Promise.all([fetchVendedoras(), fetchMarcas(), fetchAsistencia(), fetchHorario().catch(() => HORARIO_DEFECTO)]);
    setVendedoras(vs); setMarcas(m); setAtt(a); setHorario(h);
    setLoading(false);
  };
  useEffect(() => { cargar(); }, [bm.version, bg.version]);

  const perfil = (id) => vendedoras.find((v) => v.id === id);
  const nombre = (id) => perfil(id)?.nombre || "—";

  // marcas con los cambios pendientes aplicados (si cambias fecha/vendedora, el día se mueve)
  const vistaM = marcas.map((m) => ({ ...m, user_id: bm.val(m, "user_id"), fecha: bm.val(m, "fecha"), hora_entrada: bm.val(m, "hora_entrada"), hora_salida: bm.val(m, "hora_salida"), motivo: bm.val(m, "motivo") }));
  const dias = {};
  vistaM.forEach((m) => { (dias[`${m.user_id}|${m.fecha}`] ||= { user_id: m.user_id, fecha: m.fecha, marcas: [] }).marcas.push(m); });
  const lista = Object.entries(dias).map(([k, d]) => {
    const p = perfil(d.user_id);
    const c = calcDia(horario, p, d.fecha, d.marcas, today, d.fecha === today ? ahoraHHMM() : undefined);
    const a = att.find((x) => x.user_id === d.user_id && x.fecha === d.fecha);
    return { key: k, ...d, c, att: a, primera: c.ms[0]?.entrada || "" };
  });
  const filtradas = lista.filter((d) => passes(f, d.fecha, d.user_id)).sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : nombre(a.user_id).localeCompare(nombre(b.user_id))));
  const dia = lista.find((d) => d.key === sel);

  const moverDia = (d, campo, valor) => d.marcas.forEach((m) => bm.setCampo(marcas.find((x) => x.id === m.id), campo, valor));
  const eliminarMarca = async (m) => { setErr(""); const { error } = await supabase.from("asistencia_marcas").delete().eq("id", m.id); if (error) setErr(error.message); cargar(); };
  const eliminarDia = async (d) => {
    setErr("");
    const { error } = await supabase.from("asistencia_marcas").delete().eq("user_id", d.user_id).eq("fecha", d.fecha);
    if (error) setErr(error.message);
    if (sel === d.key) setSel(null);
    cargar();
  };
  const agregar = () => {
    if (!nv.vid || !nv.fecha || !nv.entrada) return;
    bm.addRow({ user_id: nv.vid, fecha: nv.fecha, hora_entrada: nv.entrada, hora_salida: nv.salida || null, motivo: nv.salida ? "Fin de jornada" : null, gps_entrada: "Dentro del rango" });
    setNv({ vid: "", fecha: today, entrada: "09:00", salida: "" });
  };

  if (loading) return <p className="text-sm" style={{ color: COLORS.muted }}>Cargando…</p>;
  const tin = { ...inputStyle, width: 96 };

  return (
    <div>
      <SectionHeader eyebrow="Control diario y resumen por período de pago" title="Asistencia"
        action={pendiente ? <button onClick={guardarTodo} disabled={bm.busy} className="text-sm px-3 py-2 disabled:opacity-60" style={{ background: COLORS.amber, color: "#fff" }}>⟳ Actualizar ({pendiente})</button> : <ActualizarBtn batch={bm} />} />

      <div className="bg-white p-4 mb-5" style={{ border: `1px solid ${COLORS.line}`, borderLeft: `3px solid ${COLORS.amber}` }}>
        <div className="text-sm mb-1" style={{ color: COLORS.forest, fontWeight: 600 }}>Agregar registro manual (por si olvidó marcar)</div>
        <p className="text-xs mb-3" style={{ color: COLORS.muted }}>Si ya existe un registro de esa vendedora ese día, se agrega como una entrada/salida más.</p>
        <div className="flex gap-2 flex-wrap items-end">
          <Field label="Vendedora">
            <select className="px-2 py-2 text-sm" style={{ ...inputStyle, minWidth: 150 }} value={nv.vid} onChange={(e) => setNv({ ...nv, vid: e.target.value })}>
              <option value="">Elegir…</option>
              {vendedoras.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
          </Field>
          <Field label="Fecha"><input type="date" className="px-2 py-2 text-sm" style={inputStyle} value={nv.fecha} onChange={(e) => setNv({ ...nv, fecha: e.target.value })} /></Field>
          <Field label="Entrada"><input type="time" className="px-2 py-2 text-sm" style={inputStyle} value={nv.entrada} onChange={(e) => setNv({ ...nv, entrada: e.target.value })} /></Field>
          <Field label="Salida"><input type="time" className="px-2 py-2 text-sm" style={inputStyle} value={nv.salida} onChange={(e) => setNv({ ...nv, salida: e.target.value })} /></Field>
          <PrimaryBtn onClick={agregar}>Agregar</PrimaryBtn>
        </div>
        {bm.adds.length > 0 && (
          <div className="mt-3 text-xs" style={{ color: COLORS.muted }}>
            Pendientes de guardar:
            {bm.adds.map((a) => (
              <span key={a._tmp} className="inline-flex items-center gap-1 ml-2"><Tag tone="warn">{nombre(a.user_id)} · {fmtY(a.fecha)} · {a.hora_entrada}{a.hora_salida ? `–${a.hora_salida}` : ""}</Tag>
                <button style={{ color: COLORS.rust }} onClick={() => bm.removeAdd(a._tmp)}>quitar</button></span>
            ))}
          </div>
        )}
      </div>
      {err && <p className="text-xs mb-3" style={{ color: COLORS.rust }}>{err}</p>}

      <FilterBar f={f} setF={setF} vendedoras={vendedoras} />

      <h3 className="text-sm mb-1" style={{ color: COLORS.forest, fontWeight: 600 }}>Detalle diario</h3>
      <p className="text-xs mb-3" style={{ color: COLORS.muted }}>Cada fila resume el día: 1ª entrada, última salida y horas trabajadas (tope: la salida del turno; si olvida marcar la salida, se cierra sola). Abre "Ver" para corregir todas sus entradas y salidas. Los cambios quedan pendientes hasta "Actualizar" y los de días cerrados van a Auditoría.</p>

      {dia && (
        <div className="bg-white p-4 mb-4" style={{ border: `1px solid ${COLORS.line}`, borderLeft: `3px solid ${COLORS.forest}` }}>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="text-sm" style={{ color: COLORS.forest, fontWeight: 600 }}>Marcas de {nombre(dia.user_id)} · {fmtLargo(dia.fecha)}
              <span className="text-xs ml-2" style={{ color: COLORS.muted, fontWeight: 400 }}>Trabajado: {dur(dia.c.horas)} · Permiso: {dur(dia.c.fuera)}</span></div>
            <button onClick={() => setSel(null)} className="text-xs px-2 py-1.5" style={{ color: COLORS.muted }}>Cerrar</button>
          </div>
          <LedgerTable
            columns={["#", "Entrada", "Salida", "Motivo de la salida", "Tiempo", ""]}
            rows={dia.marcas.map((m, i) => {
              const orig = marcas.find((x) => x.id === m.id);
              const e = t5(m.hora_entrada), s = t5(m.hora_salida);
              const tope = hm(turnoDe(horario, perfil(dia.user_id)).fin || "19:00");
              return [
                i + 1,
                <input type="time" className="text-sm px-1 py-0.5" style={tin} value={e} onChange={(ev) => ev.target.value && bm.setCampo(orig, "hora_entrada", ev.target.value)} />,
                <input type="time" className="text-sm px-1 py-0.5" style={tin} value={s} onChange={(ev) => bm.setCampo(orig, "hora_salida", ev.target.value || null)} />,
                <select className="text-sm px-1 py-0.5" style={inputStyle} value={m.motivo || ""} onChange={(ev) => bm.setCampo(orig, "motivo", ev.target.value || null)}>
                  <option value="">—</option>
                  {[...new Set([...MOTIVOS, ...(m.motivo ? [m.motivo] : [])])].map((x) => <option key={x}>{x}</option>)}
                </select>,
                s ? dur(Math.max(0, Math.min(hm(s), tope) - Math.min(hm(e), tope))) : <Tag tone="warn">sin salida · se cierra sola {mm(cierreAuto(horario, perfil(dia.user_id)))}</Tag>,
                puedeBorrar ? <button className="text-xs" style={{ color: COLORS.rust }} onClick={() => window.confirm("¿Quitar esta marca?") && eliminarMarca(m)}>Quitar</button> : "",
              ];
            })}
          />
        </div>
      )}

      <LedgerTable maxH={340}
        columns={["Fecha", "Vendedora", "Turno", "1ª entrada", "Últ. salida", "Horas", "Permiso", "Ubicación", "Puntualidad", "Marcas", ""]}
        rows={filtradas.map((d) => {
          const p = perfil(d.user_id);
          const ult = d.c.ms[d.c.ms.length - 1];
          const gpsOrig = d.att;
          return [
            <input type="date" className="text-sm px-1 py-0.5" style={inputStyle} value={d.fecha} onChange={(e) => e.target.value && moverDia(d, "fecha", e.target.value)} />,
            <select className="text-sm px-1 py-0.5" style={inputStyle} value={d.user_id} onChange={(e) => moverDia(d, "user_id", e.target.value)}>
              {vendedoras.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>,
            <span className="text-xs">{turnoDe(horario, p).nombre}</span>,
            d.primera || "—",
            ult ? (ult.salida ? <span className="whitespace-nowrap">{ult.salida}{ult.auto && <> <Tag tone="warn">automática</Tag></>}</span> : <Tag tone="good">en la tienda</Tag>) : "—",
            dur(d.c.horas),
            d.c.fuera ? dur(d.c.fuera) : "—",
            gpsOrig
              ? <select className="text-sm px-1 py-0.5" style={inputStyle} value={bg.val(gpsOrig, "gps_estado") || "Dentro del rango"} onChange={(e) => bg.setCampo(gpsOrig, "gps_estado", e.target.value)}>
                  <option>Dentro del rango</option><option>Fuera del rango</option>
                </select>
              : "—",
            esLibre(horario, p) ? <Tag tone="neutral">Libre</Tag> : esTardeEntrada(horario, p, d.primera) ? <Tag tone="warn">Retraso</Tag> : <Tag tone="good">A tiempo</Tag>,
            <button onClick={() => setSel(sel === d.key ? null : d.key)} className="text-xs underline" style={{ color: COLORS.forest }}>{sel === d.key ? "Ocultar" : `Ver (${d.marcas.length})`}</button>,
            puedeBorrar ? <button className="text-xs" style={{ color: COLORS.rust }} onClick={() => window.confirm("¿Eliminar TODAS las marcas de este día?") && eliminarDia(d)}>Eliminar</button> : "",
          ];
        })}
      />

      <div className="flex items-center justify-between mt-10 mb-3 flex-wrap gap-2">
        <h3 className="text-sm" style={{ color: COLORS.forest, fontWeight: 600 }}>Resumen por período de pago (cada una cierra en su fecha de ingreso)</h3>
        <div className="flex gap-1">
          {[["Período actual", 0], ["Período anterior", 1]].map(([l, b]) => (
            <button key={b} onClick={() => setBack(b)} className="text-xs px-2.5 py-1.5"
              style={{ background: back === b ? COLORS.forest : "transparent", color: back === b ? "#fff" : COLORS.forest, border: `1px solid ${COLORS.forest}` }}>{l}</button>
          ))}
        </div>
      </div>
      <LedgerTable
        columns={["Vendedora", "Turno", "Ingreso", "Período de pago", "Presentes", "Laborables", "Faltas", "Retrasos", "Fuera de rango", "Horas trabajadas", "Horas de permiso", "Pago por horas", "Índice"]}
        rows={vendedoras.filter((v) => !f.vid || v.id === f.vid).map((v) => {
          const t = turnoDe(horario, v), libre = t.tipo === "libre";
          const c = cycleBack(v.ingreso_fecha, today, back);
          if (c.end < v.ingreso_fecha) return [v.nombre, t.nombre, fmtY(v.ingreso_fecha), "Aún no ingresaba", "—", "—", "—", "—", "—", "—", "—", "—", "—"];
          const a = maxISO(c.start, v.ingreso_fecha), b = minISO(c.end, today);
          const r = lista.filter((d) => d.user_id === v.id && d.fecha >= a && d.fecha <= b);
          const rLab = r.filter((d) => dow(d.fecha) !== 6); // el domingo no es día laborable
          const lab = workdays(a, b);
          const horas = sum(r.map((d) => d.c.horas)), perm = sum(r.map((d) => d.c.fuera));
          const veces = sum(r.map((d) => Math.max(0, d.marcas.length - 1)));
          const fuera = att.filter((x) => x.user_id === v.id && x.fecha >= a && x.fecha <= b && x.gps_estado === "Fuera del rango").length;
          return [v.nombre, <span className="text-xs">{t.nombre}</span>, fmtY(v.ingreso_fecha), cicloLabel(c), r.length,
            libre ? "—" : lab, libre ? "—" : Math.max(0, lab - rLab.length),
            libre ? "—" : r.filter((d) => esTardeEntrada(horario, v, d.primera)).length, fuera,
            <b>{dur(horas)}</b>,
            perm ? <span>{dur(perm)} <span className="text-xs" style={{ color: COLORS.muted }}>({veces} {veces === 1 ? "vez" : "veces"})</span></span> : "—",
            libre ? <b style={{ color: COLORS.amber }}>Bs {Math.round((horas / 60) * (Number(v.tarifa_hora) || 0))}</b> : "—",
            libre ? "—" : <b style={{ color: COLORS.forest }}>{lab ? Math.round((rLab.length / lab) * 100) : 0}%</b>];
        })}
      />
      <p className="text-xs mt-3" style={{ color: COLORS.muted }}>Índice = días presentes ÷ días laborables (lunes a sábado) del período. Horas de permiso = tiempo que salió y volvió durante el día (el almuerzo es dentro de la tienda y no cuenta). No hay horas extras: no se cuentan horas después de la salida del turno, y una salida olvidada se cierra sola. En turno libre no hay retrasos, faltas ni índice: se paga por horas trabajadas × tarifa. Estas horas solo las ve la administradora.</p>
    </div>
  );
}
