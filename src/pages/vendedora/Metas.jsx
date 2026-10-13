import React, { useEffect, useState } from "react";
import { addDays, fmt } from "../../lib/dates.js";
import { SectionHeader, COLORS } from "../../components/ui.jsx";
import DayGrid from "../../components/DayGrid.jsx";
import { useAuth } from "../../context/AuthProvider.jsx";
import { fetchCuentas, fetchMetasGlobales, fetchMetasCuenta, weekArrayFromRows, todayISO, currentWeekStart } from "../../lib/api.js";

export default function Metas() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cuentas, setCuentas] = useState([]);
  const [metasC, setMetasC] = useState([]);
  const [metasG, setMetasG] = useState([]);
  const today = todayISO();
  const [sem, setSem] = useState(0); // 0 = esta semana, -1 = anterior, 1 = siguiente
  const weekStart = addDays(currentWeekStart(today), sem * 7);

  useEffect(() => {
    (async () => {
      const todas = await fetchCuentas();
      const mias = todas.filter((c) => c.vendedora_id === profile.id && c.estado === "Activa");
      const [mc, mg] = await Promise.all([fetchMetasCuenta(mias.map((c) => c.id)), fetchMetasGlobales([profile.id])]);
      setCuentas(mias); setMetasC(mc); setMetasG(mg);
      setLoading(false);
    })();
  }, [profile.id]);

  if (loading) return <p className="text-sm" style={{ color: COLORS.muted }}>Cargando…</p>;
  const arrApp = weekArrayFromRows(metasG.filter((m) => m.variable === "app"), weekStart);

  return (
    <div>
      <SectionHeader eyebrow="Objetivo por cuenta de Facebook" title="Mis metas" />
      <div className="flex items-center gap-1 mb-4">
        <button onClick={() => setSem(sem - 1)} className="p-1.5" style={{ border: `1px solid ${COLORS.line}`, background: "#fff" }}>◀</button>
        <span className="text-sm px-1" style={{ color: COLORS.forest }}>Semana {fmt(weekStart)} – {fmt(addDays(weekStart, 5))}{sem === 0 && <span className="text-xs ml-1" style={{ color: COLORS.muted }}>(esta semana)</span>}</span>
        <button onClick={() => setSem(sem + 1)} className="p-1.5" style={{ border: `1px solid ${COLORS.line}`, background: "#fff" }}>▶</button>
      </div>
      {cuentas.length === 0 ? (
        <p className="text-sm" style={{ color: COLORS.muted }}>Aún no tienes cuentas de Facebook asignadas.</p>
      ) : (
        <DayGrid totalLabel="TOTAL COPY"
          rows={[
            ...cuentas.map((c) => ({ label: c.nombre, arr: weekArrayFromRows(metasC.filter((m) => m.cuenta_id === c.id), weekStart) })),
            { label: "APP", arr: arrApp, inTotal: false },
          ]}
        />
      )}
    </div>
  );
}
