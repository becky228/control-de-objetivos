import React, { useEffect, useState } from "react";
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
  const weekStart = currentWeekStart(today);

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
      <SectionHeader eyebrow="Objetivo por cuenta de Facebook, esta semana" title="Mis metas" />
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
