import React, { useEffect, useState } from "react";
import { SectionHeader, LedgerTable, Tag, PrimaryBtn, FilterBar, newFilter, COLORS } from "../../components/ui.jsx";
import { fetchVendedoras, fetchFbLog, fetchRegistroApp, fetchMetasGlobales, todayISO } from "../../lib/api.js";
import { metaRango, hechoCopy, hechoApp } from "../../lib/bono.js";
import { monthRange, minISO, sum } from "../../lib/dates.js";

function rangeOf(f, today) {
  if (f.mode === "dias") return [f.desde, f.hasta];
  if (f.mode === "mes") return monthRange(f.mes);
  if (f.mode === "anio") return [`${f.anio}-01-01`, `${f.anio}-12-31`];
  return ["2020-01-01", today];
}
function descargarCSV(nombre, headers, rows) {
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export default function Pendientes() {
  const today = todayISO();
  const [vendedoras, setVendedoras] = useState([]);
  const [fbLog, setFbLog] = useState([]);
  const [appLog, setAppLog] = useState([]);
  const [metasGlobales, setMetasGlobales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState(newFilter("mes", today));

  useEffect(() => {
    (async () => {
      const vs = await fetchVendedoras();
      const [fb, app, mg] = await Promise.all([fetchFbLog(), fetchRegistroApp(), fetchMetasGlobales(vs.map((v) => v.id))]);
      setVendedoras(vs); setFbLog(fb); setAppLog(app); setMetasGlobales(mg);
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="text-sm" style={{ color: COLORS.muted }}>Cargando…</p>;

  const [pa, pbRaw] = rangeOf(f, today);
  const pb = minISO(pbRaw, today);
  const vs = vendedoras.filter((v) => !f.vid || v.id === f.vid);
  const filas = vs.map((v) => {
    const copys = hechoCopy(fbLog, v.id, pa, pb);
    const metaC = metaRango(metasGlobales, v.id, "copy", pa, pb);
    const app = hechoApp(appLog, v.id, pa, pb);
    const metaA = metaRango(metasGlobales, v.id, "app", pa, pb);
    return { v, copys, metaC, pendC: Math.max(0, metaC - copys), app, metaA, pendA: Math.max(0, metaA - app) };
  });
  const T = (k) => sum(filas.map((x) => x[k]));
  const headers = ["Vendedora", "Copys", "Meta copy", "Pendiente copy", "App registrados", "Meta App", "Pendiente App"];
  const data = filas.map((x) => [x.v.nombre, x.copys, x.metaC, x.pendC, x.app, x.metaA, x.pendA]);

  return (
    <div>
      <SectionHeader eyebrow="Saldos pendientes de copy y de App" title="Pendientes"
        action={<PrimaryBtn onClick={() => descargarCSV(`pendientes_${f.mode}.csv`, headers, data)}>Exportar a Excel</PrimaryBtn>} />
      <FilterBar f={f} setF={setF} vendedoras={vendedoras} />
      <LedgerTable
        columns={headers}
        rows={[
          ...filas.map((x) => [x.v.nombre, x.copys, x.metaC, <Tag tone={x.pendC === 0 ? "good" : "warn"}>{x.pendC}</Tag>, x.app, x.metaA, <Tag tone={x.pendA === 0 ? "good" : "warn"}>{x.pendA}</Tag>]),
          [<b>Total</b>, <b>{T("copys")}</b>, <b>{T("metaC")}</b>, <b>{T("pendC")}</b>, <b>{T("app")}</b>, <b>{T("metaA")}</b>, <b>{T("pendA")}</b>],
        ]}
      />
      <p className="text-xs mt-3" style={{ color: COLORS.muted }}>Pendiente = meta − realizado en el período elegido. El botón descarga un archivo .csv que Excel abre directamente.</p>
    </div>
  );
}
