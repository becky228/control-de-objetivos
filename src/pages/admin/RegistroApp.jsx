import React, { useEffect, useState } from "react";
import { SectionHeader, LedgerTable, NumIn, Prog, FilterBar, newFilter, passes, COLORS } from "../../components/ui.jsx";
import { fetchVendedoras, fetchRegistroApp, fetchMetasGlobales, upsertRegistroApp, todayISO } from "../../lib/api.js";
import { metaRango } from "../../lib/bono.js";
import { fmtY, dow, sum } from "../../lib/dates.js";

export default function RegistroApp() {
  const today = todayISO();
  const [vendedoras, setVendedoras] = useState([]);
  const [rows, setRows] = useState([]);
  const [metasGlobales, setMetasGlobales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState(newFilter("mes", today));

  const cargar = async () => {
    setLoading(true);
    const vs = await fetchVendedoras();
    const [r, mg] = await Promise.all([fetchRegistroApp(), fetchMetasGlobales(vs.map((v) => v.id))]);
    setVendedoras(vs); setRows(r); setMetasGlobales(mg);
    setLoading(false);
  };
  useEffect(() => { cargar(); }, []);

  const editar = async (row, cantidad) => {
    await upsertRegistroApp({ id: row.id, user_id: row.user_id, fecha: row.fecha, cantidad });
    cargar();
  };

  if (loading) return <p className="text-sm" style={{ color: COLORS.muted }}>Cargando…</p>;
  const filtradas = rows.filter((a) => passes(f, a.fecha, a.user_id));
  const metaDia = (a) => {
    const w = dow(a.fecha);
    const cand = metasGlobales.filter((m) => m.vendedora_id === a.user_id && m.variable === "app" && m.dia_semana === w && m.vigente_desde <= a.fecha);
    if (!cand.length || w === 6) return 0;
    cand.sort((x, y) => (x.vigente_desde < y.vigente_desde ? 1 : x.vigente_desde > y.vigente_desde ? -1 : (y.id || 0) - (x.id || 0)));
    return cand[0].valor;
  };

  return (
    <div>
      <SectionHeader eyebrow="Productos registrados en la app de control de inventario" title="Registro en la APP" />
      <FilterBar f={f} setF={setF} vendedoras={vendedoras} />
      <p className="text-xs mb-3" style={{ color: COLORS.muted }}>Las vendedoras registran hasta las 00:00; después solo tú puedes corregir el número.</p>
      <LedgerTable maxH={440}
        columns={["Fecha", "Vendedora", "Registrados", "Meta del día", "Progreso"]}
        rows={[
          ...filtradas.map((a) => [
            fmtY(a.fecha), a.profiles?.nombre || "—",
            <NumIn w={60} value={a.cantidad} onChange={(x) => editar(a, x)} />,
            metaDia(a), <Prog hecho={a.cantidad || 0} meta={metaDia(a)} />,
          ]),
          ...(filtradas.length ? [[<b>Total</b>, "", <b>{sum(filtradas.map((a) => a.cantidad))}</b>, <b>{sum(filtradas.map(metaDia))}</b>, <Prog hecho={sum(filtradas.map((a) => a.cantidad))} meta={sum(filtradas.map(metaDia))} />]] : []),
        ]}
      />
    </div>
  );
}
