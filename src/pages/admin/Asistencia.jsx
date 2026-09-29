import React, { useEffect, useState } from "react";
import { SectionHeader, LedgerTable, Tag, FilterBar, newFilter, passes, COLORS } from "../../components/ui.jsx";
import { fetchVendedoras, fetchAsistencia, upsertAsistencia, todayISO } from "../../lib/api.js";
import { cycleBack, cicloLabel, maxISO, minISO, workdays, fmtY } from "../../lib/dates.js";

const LATE_AFTER = "08:05";

export default function Asistencia() {
  const today = todayISO();
  const [vendedoras, setVendedoras] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState(newFilter("mes", today));
  const [back, setBack] = useState(0);

  const cargar = async () => {
    setLoading(true);
    const [vs, a] = await Promise.all([fetchVendedoras(), fetchAsistencia()]);
    setVendedoras(vs); setRows(a);
    setLoading(false);
  };
  useEffect(() => { cargar(); }, []);

  const editar = async (row, campo, valor) => {
    await upsertAsistencia({ id: row.id, user_id: row.user_id, fecha: row.fecha, hora_entrada: campo === "hora_entrada" ? valor : row.hora_entrada, hora_salida: campo === "hora_salida" ? valor : row.hora_salida });
    cargar();
  };

  if (loading) return <p className="text-sm" style={{ color: COLORS.muted }}>Cargando…</p>;

  const filtradas = rows.filter((a) => passes(f, a.fecha, a.user_id));

  return (
    <div>
      <SectionHeader eyebrow="Control diario y resumen por período de pago" title="Asistencia" />
      <FilterBar f={f} setF={setF} vendedoras={vendedoras} />

      <h3 className="text-sm mb-1" style={{ color: COLORS.forest, fontWeight: 600 }}>Detalle diario</h3>
      <p className="text-xs mb-3" style={{ color: COLORS.muted }}>Las vendedoras registran hasta las 00:00; después solo tú puedes editar (queda en Auditoría).</p>
      <LedgerTable maxH={340}
        columns={["Fecha", "Vendedora", "Entrada", "Salida", "Ubicación", "Puntualidad"]}
        rows={filtradas.map((a) => [
          fmtY(a.fecha), a.profiles?.nombre || "—",
          <input type="time" defaultValue={a.hora_entrada || ""} className="text-sm px-1 py-0.5" style={{ border: `1px solid ${COLORS.line}`, width: 96 }} onBlur={(e) => e.target.value && editar(a, "hora_entrada", e.target.value)} />,
          <input type="time" defaultValue={a.hora_salida || ""} className="text-sm px-1 py-0.5" style={{ border: `1px solid ${COLORS.line}`, width: 96 }} onBlur={(e) => editar(a, "hora_salida", e.target.value)} />,
          <Tag tone={a.gps_estado === "Dentro del rango" ? "good" : "warn"}>{a.gps_estado || "—"}</Tag>,
          a.hora_entrada > LATE_AFTER ? <Tag tone="warn">Retraso</Tag> : <Tag tone="good">A tiempo</Tag>,
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
