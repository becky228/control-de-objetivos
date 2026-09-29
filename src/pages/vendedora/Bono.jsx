import React, { useEffect, useState } from "react";
import { SectionHeader, Card, Locked, COLORS, slab } from "../../components/ui.jsx";
import { useAuth } from "../../context/AuthProvider.jsx";
import { fetchMetasGlobales, fetchFbLog, fetchRegistroApp, fetchAsistencia, fetchPuntos, fetchVentas, fetchBonoConfig, fetchVisibilidad, todayISO } from "../../lib/api.js";
import { computeBonoVendedora } from "../../lib/bono.js";
import { cicloLabel } from "../../lib/dates.js";

export default function Bono() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [b, setB] = useState(null);
  const [vis, setVis] = useState({});
  const today = todayISO();

  useEffect(() => {
    (async () => {
      const [metasGlobales, fbLog, appLog, asist, puntos, ventas, bonoConfig, v] = await Promise.all([
        fetchMetasGlobales([profile.id]), fetchFbLog({ vid: profile.id }), fetchRegistroApp({ vid: profile.id }),
        fetchAsistencia({ vid: profile.id }), fetchPuntos({ vid: profile.id }), fetchVentas(), fetchBonoConfig(), fetchVisibilidad(),
      ]);
      setB(computeBonoVendedora(profile, { metasGlobales, fbLog, appLog, asist, puntos, ventas, bonoConfig, todayISO: today }));
      setVis(v);
      setLoading(false);
    })();
  }, [profile.id]);

  if (loading) return <p className="text-sm" style={{ color: COLORS.muted }}>Cargando…</p>;

  return (
    <div>
      <SectionHeader eyebrow="Tu período de pago actual" title="Mi bono" />
      {vis.bono === "todas" ? (
        <Card>
          <div style={{ fontFamily: slab, fontSize: 30, color: COLORS.forest, fontWeight: 700 }}>${b.final}</div>
          <div className="text-xs mt-1" style={{ color: COLORS.muted }}>{cicloLabel(b.c)} · Cumplimiento {b.cum}% · Descuentos -${b.desc}</div>
        </Card>
      ) : <Locked label="Bonificación" />}
    </div>
  );
}
