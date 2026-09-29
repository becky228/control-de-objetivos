import React, { useEffect, useState } from "react";
import { SectionHeader, LedgerTable, Tag, Locked, COLORS } from "../../components/ui.jsx";
import { useAuth } from "../../context/AuthProvider.jsx";
import { fetchPuntos, fetchVisibilidad, todayISO } from "../../lib/api.js";
import { cycleFor, fmt } from "../../lib/dates.js";

export default function PuntosMejora() {
  const { profile } = useAuth();
  const [rows, setRows] = useState([]);
  const [vis, setVis] = useState({});
  const [loading, setLoading] = useState(true);
  const today = todayISO();

  useEffect(() => {
    (async () => {
      const c = cycleFor(profile.ingreso_fecha, today);
      const [p, v] = await Promise.all([fetchPuntos({ vid: profile.id, desde: c.start, hasta: c.end }), fetchVisibilidad()]);
      setRows(p); setVis(v); setLoading(false);
    })();
  }, [profile.id]);

  if (loading) return <p className="text-sm" style={{ color: COLORS.muted }}>Cargando…</p>;

  return (
    <div>
      <SectionHeader eyebrow="En tu período de pago actual" title="Mis puntos de mejora" />
      {rows.length === 0 && <p className="text-sm" style={{ color: COLORS.muted }}>Sin puntos de mejora en este período. 🎉</p>}
      <LedgerTable
        columns={vis.descuento === "todas" ? ["Fecha", "Motivo", "Gravedad", "Descuento"] : ["Fecha", "Motivo", "Gravedad"]}
        rows={rows.map((p) => {
          const base = [fmt(p.fecha), p.motivo, <Tag tone={p.gravedad === "Fuerte" ? "bad" : p.gravedad === "Media" ? "warn" : "neutral"}>{p.gravedad}</Tag>];
          return vis.descuento === "todas" ? [...base, `-$${p.descuento}`] : base;
        })}
      />
      {vis.descuento !== "todas" && rows.length > 0 && <p className="text-xs mt-2" style={{ color: COLORS.muted }}>🔒 El descuento no está habilitado para ti.</p>}
    </div>
  );
}
