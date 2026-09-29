import React, { useEffect, useState } from "react";
import { SectionHeader, Tag, COLORS } from "../../components/ui.jsx";
import FbTracker from "../../components/FbTracker.jsx";
import { useAuth } from "../../context/AuthProvider.jsx";
import { fetchCuentas, fetchFbLog, todayISO } from "../../lib/api.js";

export default function Facebook() {
  const { profile } = useAuth();
  const [cuentas, setCuentas] = useState([]);
  const [cid, setCid] = useState(null);
  const [pubHoy, setPubHoy] = useState(0);
  const [loading, setLoading] = useState(true);
  const today = todayISO();

  useEffect(() => {
    (async () => {
      const todas = await fetchCuentas();
      const mias = todas.filter((c) => c.vendedora_id === profile.id && c.estado === "Activa");
      setCuentas(mias);
      setCid(mias[0]?.id || null);
      const log = await fetchFbLog({ vid: profile.id, desde: today, hasta: today });
      setPubHoy(log.reduce((s, e) => s + (e.total || 0), 0));
      setLoading(false);
    })();
  }, [profile.id]);

  if (loading) return <p className="text-sm" style={{ color: COLORS.muted }}>Cargando…</p>;
  const cuenta = cuentas.find((c) => c.id === cid);

  return (
    <div>
      <SectionHeader eyebrow="Registro de avance por cuenta" title="Mis cuentas de Facebook" action={<Tag tone="good">Publicaciones de hoy: {pubHoy}</Tag>} />
      {cuentas.length === 0 ? (
        <p className="text-sm" style={{ color: COLORS.muted }}>Tu administradora aún no te asignó ninguna cuenta.</p>
      ) : (
        <>
          <div className="flex gap-1.5 mb-4 flex-wrap">
            {cuentas.map((c) => (
              <button key={c.id} onClick={() => setCid(c.id)} className="text-xs px-2.5 py-1.5"
                style={{ background: cid === c.id ? COLORS.forest : "#fff", color: cid === c.id ? "#fff" : COLORS.forest, border: `1px solid ${COLORS.forest}` }}>{c.nombre}</button>
            ))}
          </div>
          {cuenta && <FbTracker key={cuenta.id} cuenta={cuenta} admin={false} />}
        </>
      )}
    </div>
  );
}
