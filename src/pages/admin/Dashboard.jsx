import React, { useEffect, useState } from "react";
import { SectionHeader, LedgerTable, Prog, Tag, COLORS } from "../../components/ui.jsx";
import { fetchVendedoras, fetchMetasGlobales, fetchAsistencia, fetchFbLog, fetchRegistroApp, fetchPuntos, fetchVentas, fetchBonoConfig } from "../../lib/api.js";
import { computeBonoVendedora, metaRango, hechoCopy, hechoApp } from "../../lib/bono.js";
import { addDays, weekStartOf, monthRange, sum, pct } from "../../lib/dates.js";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    (async () => {
      try {
        const [vendedoras, asist, fbLog, appLog, puntos, ventas, bonoConfig] = await Promise.all([
          fetchVendedoras(), fetchAsistencia(), fetchFbLog(), fetchRegistroApp(), fetchPuntos(), fetchVentas(), fetchBonoConfig(),
        ]);
        const metasGlobales = await fetchMetasGlobales(vendedoras.map((v) => v.id));
        setData({ vendedoras, asist, fbLog, appLog, puntos, ventas, bonoConfig, metasGlobales });
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p className="text-sm" style={{ color: COLORS.muted }}>Cargando…</p>;
  if (err) return <p className="text-sm" style={{ color: COLORS.rust }}>{err}</p>;

  const { vendedoras, asist, fbLog, appLog, metasGlobales, puntos, ventas, bonoConfig } = data;
  const weekStart = weekStartOf(today);
  const weekEnd = addDays(weekStart, 6);
  const [ms] = monthRange(today.slice(0, 7));
  const presentes = asist.filter((a) => a.fecha === today).length;

  const totals = (metaFn, hechoFn) => {
    let mw = 0, hw = 0;
    vendedoras.forEach((v) => {
      mw += metaFn(v);
      hw += hechoFn(v);
    });
    return pct(hw, mw);
  };
  const copyPct = totals(
    (v) => metaRango(metasGlobales, v.id, "copy", weekStart, weekEnd),
    (v) => hechoCopy(fbLog, v.id, weekStart, weekEnd)
  );
  const appPct = totals(
    (v) => metaRango(metasGlobales, v.id, "app", weekStart, weekEnd),
    (v) => hechoApp(appLog, v.id, weekStart, weekEnd)
  );
  const bonos = vendedoras.map((v) => computeBonoVendedora(v, { metasGlobales, fbLog, appLog, asist, puntos, ventas, bonoConfig, todayISO: today }));

  return (
    <div>
      <SectionHeader eyebrow={`Hoy · ${today}`} title="Panel general" />
      <div className="flex gap-10 mb-8 pb-6 flex-wrap" style={{ borderBottom: `1px solid ${COLORS.line}` }}>
        <Stat label="Presentes hoy" value={`${presentes} / ${vendedoras.length}`} />
        <Stat label="Copy · cumplimiento semanal" value={`${copyPct}%`} />
        <Stat label="App · cumplimiento semanal" value={`${appPct}%`} />
        <Stat label="Bono acumulado del mes" value={`$${sum(bonos.map((b) => b.final))}`} />
      </div>

      <h3 className="text-sm mb-3" style={{ color: COLORS.forest, fontWeight: 600 }}>Cumplimiento de metas · semanal y mensual (a la fecha)</h3>
      <LedgerTable
        columns={["Vendedora", "Copy · semana", "Copy · mes", "App · semana", "App · mes"]}
        rows={vendedoras.map((v) => [
          v.nombre,
          <Prog hecho={hechoCopy(fbLog, v.id, weekStart, weekEnd)} meta={metaRango(metasGlobales, v.id, "copy", weekStart, weekEnd)} />,
          <Prog hecho={hechoCopy(fbLog, v.id, ms, today)} meta={metaRango(metasGlobales, v.id, "copy", ms, today)} />,
          <Prog hecho={hechoApp(appLog, v.id, weekStart, weekEnd)} meta={metaRango(metasGlobales, v.id, "app", weekStart, weekEnd)} />,
          <Prog hecho={hechoApp(appLog, v.id, ms, today)} meta={metaRango(metasGlobales, v.id, "app", ms, today)} />,
        ])}
      />

      <div className="mt-10">
        <h3 className="text-sm mb-3" style={{ color: COLORS.forest, fontWeight: 600 }}>Asistencia de hoy</h3>
        <LedgerTable
          columns={["Vendedora", "Entrada", "Ubicación"]}
          rows={vendedoras.map((v) => {
            const a = asist.find((x) => x.user_id === v.id && x.fecha === today);
            return [
              v.nombre, a?.hora_entrada || "—",
              a ? <Tag tone={a.gps_estado === "Dentro del rango" ? "good" : "warn"}>{a.gps_estado}</Tag> : <Tag tone="bad">Sin registro</Tag>,
            ];
          })}
        />
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div style={{ fontFamily: "'Zilla Slab', serif", fontSize: 28, color: COLORS.forest, fontWeight: 600 }}>{value}</div>
      <div className="text-xs mt-1" style={{ color: COLORS.muted }}>{label}</div>
    </div>
  );
}
