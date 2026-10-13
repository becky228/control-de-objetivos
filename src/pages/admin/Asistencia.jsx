import React, { useEffect, useState } from "react";
import { SectionHeader, LedgerTable, Tag, FilterBar, newFilter, passes, PrimaryBtn, Field, inputStyle, COLORS } from "../../components/ui.jsx";
import { supabase } from "../../lib/supabase.js";
import { useAuth } from "../../context/AuthProvider.jsx";
import { fetchVendedoras, fetchAsistencia, todayISO } from "../../lib/api.js";
import { cycleBack, cicloLabel, maxISO, minISO, workdays, fmtY } from "../../lib/dates.js";

const LATE_AFTER = "08:05";

export default function Asistencia() {
  const today = todayISO();
  const [vendedoras, setVendedoras] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState(newFilter("mes", today));
  const [back, setBack] = useState(0);
  const { profile } = useAuth();
  const puedeBorrar = profile?.rol === "admin";
  const [err, setErr] = useState("");
  const [nv, setNv] = useState({ vid: "", fecha: today, hora_entrada: "08:00", hora_salida: "" });

  const cargar = async () => {
    setLoading(true);
    const [vs, a] = await Promise.all([fetchVendedoras(), fetchAsistencia()]);
    setVendedoras(vs); setRows(a);
    setLoading(false);
  };
  useEffect(() => { cargar(); }, []);

  const msgError = (error) => (error.code === "23505" ? "Esa vendedora ya tiene un registro en esa fecha." : error.message);
  const actualizar = async (row, cambios) => {
    setErr("");
    const { error } = await supabase.from("attendance").update(cambios).eq("id", row.id);
    if (error) setErr(msgError(error));
    cargar();
  };
  const eliminar = async (row) => {
    setErr("");
    const { error } = await supabase.from("attendance").delete().eq("id", row.id);
    if (error) setErr(error.message);
    cargar();
  };
  const agregar = async () => {
    if (!nv.vid || !nv.fecha || !nv.hora_entrada) return;
    setErr("");
    const { error } = await supabase.from("attendance").insert({ user_id: nv.vid, fecha: nv.fecha, hora_entrada: nv.hora_entrada, hora_salida: nv.hora_salida || null, gps_estado: "Dentro del rango" });
    if (error) return setErr(msgError(error));
    setNv({ vid: "", fecha: today, hora_entrada: "08:00", hora_salida: "" });
    cargar();
  };

  if (loading) return <p className="text-sm" style={{ color: COLORS.muted }}>Cargando…</p>;

  const filtradas = rows.filter((a) => passes(f, a.fecha, a.user_id));

  return (
    <div>
      <SectionHeader eyebrow="Control diario y resumen por período de pago" title="Asistencia" />
      <div className="bg-white p-4 mb-5" style={{ border: `1px solid ${COLORS.line}`, borderLeft: `3px solid ${COLORS.amber}` }}>
        <div className="text-sm mb-3" style={{ color: COLORS.forest, fontWeight: 600 }}>Agregar registro manual (por si olvidó marcar)</div>
        <div className="flex gap-2 flex-wrap items-end">
          <Field label="Vendedora">
            <select className="px-2 py-2 text-sm" style={{ ...inputStyle, minWidth: 150 }} value={nv.vid} onChange={(e) => setNv({ ...nv, vid: e.target.value })}>
              <option value="">Elegir…</option>
              {vendedoras.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
          </Field>
          <Field label="Fecha"><input type="date" className="px-2 py-2 text-sm" style={inputStyle} value={nv.fecha} onChange={(e) => setNv({ ...nv, fecha: e.target.value })} /></Field>
          <Field label="Entrada"><input type="time" className="px-2 py-2 text-sm" style={inputStyle} value={nv.hora_entrada} onChange={(e) => setNv({ ...nv, hora_entrada: e.target.value })} /></Field>
          <Field label="Salida"><input type="time" className="px-2 py-2 text-sm" style={inputStyle} value={nv.hora_salida} onChange={(e) => setNv({ ...nv, hora_salida: e.target.value })} /></Field>
          <PrimaryBtn onClick={agregar}>Agregar</PrimaryBtn>
        </div>
      </div>
      {err && <p className="text-xs mb-3" style={{ color: COLORS.rust }}>{err}</p>}

      <FilterBar f={f} setF={setF} vendedoras={vendedoras} />

      <h3 className="text-sm mb-1" style={{ color: COLORS.forest, fontWeight: 600 }}>Detalle diario</h3>
      <p className="text-xs mb-3" style={{ color: COLORS.muted }}>Puedes cambiar cualquier dato (fecha, vendedora, horas, ubicación){puedeBorrar ? " o eliminar el registro" : ""}. Los cambios en días cerrados quedan en Auditoría.</p>
      <LedgerTable maxH={340}
        columns={["Fecha", "Vendedora", "Entrada", "Salida", "Ubicación", "Puntualidad", ""]}
        rows={filtradas.map((a) => [
          <input key={a.id + a.fecha} type="date" defaultValue={a.fecha} className="text-sm px-1 py-0.5" style={inputStyle} onBlur={(e) => e.target.value && e.target.value !== a.fecha && actualizar(a, { fecha: e.target.value })} />,
          <select className="text-sm px-1 py-0.5" style={inputStyle} value={a.user_id} onChange={(e) => actualizar(a, { user_id: e.target.value })}>
            {vendedoras.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
          </select>,
          <input type="time" defaultValue={a.hora_entrada || ""} className="text-sm px-1 py-0.5" style={{ ...inputStyle, width: 96 }} onBlur={(e) => e.target.value && e.target.value !== (a.hora_entrada || "").slice(0, 5) && actualizar(a, { hora_entrada: e.target.value })} />,
          <input type="time" defaultValue={a.hora_salida || ""} className="text-sm px-1 py-0.5" style={{ ...inputStyle, width: 96 }} onBlur={(e) => e.target.value !== (a.hora_salida || "").slice(0, 5) && actualizar(a, { hora_salida: e.target.value || null })} />,
          <select className="text-sm px-1 py-0.5" style={inputStyle} value={a.gps_estado || "Dentro del rango"} onChange={(e) => actualizar(a, { gps_estado: e.target.value })}>
            <option>Dentro del rango</option><option>Fuera del rango</option>
          </select>,
          (a.hora_entrada || "") > LATE_AFTER ? <Tag tone="warn">Retraso</Tag> : <Tag tone="good">A tiempo</Tag>,
          puedeBorrar ? <button className="text-xs" style={{ color: COLORS.rust }} onClick={() => window.confirm("¿Eliminar este registro de asistencia?") && eliminar(a)}>Eliminar</button> : "",
        ])}
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
        columns={["Vendedora", "Período de pago", "Presentes", "Laborables", "Faltas", "Retrasos", "Índice"]}
        rows={vendedoras.filter((v) => !f.vid || v.id === f.vid).map((v) => {
          const c = cycleBack(v.ingreso_fecha, today, back);
          if (c.end < v.ingreso_fecha) return [v.nombre, "Aún no ingresaba", "—", "—", "—", "—", "—"];
          const a = maxISO(c.start, v.ingreso_fecha), b = minISO(c.end, today);
          const r = rows.filter((x) => x.user_id === v.id && x.fecha >= a && x.fecha <= b);
          const lab = workdays(a, b);
          return [v.nombre, cicloLabel(c), r.length, lab, Math.max(0, lab - r.length),
            r.filter((x) => x.hora_entrada > LATE_AFTER).length,
            <b style={{ color: COLORS.forest }}>{lab ? Math.round((r.length / lab) * 100) : 0}%</b>];
        })}
      />
    </div>
  );
}
