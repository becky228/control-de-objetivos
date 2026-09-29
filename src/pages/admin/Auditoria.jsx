import React, { useEffect, useState } from "react";
import { SectionHeader, FilterBar, newFilter, COLORS } from "../../components/ui.jsx";
import { fetchVendedoras, fetchAuditoria, todayISO } from "../../lib/api.js";

export default function Auditoria() {
  const [vendedoras, setVendedoras] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState(newFilter("todo", todayISO()));

  useEffect(() => {
    (async () => {
      const vs = await fetchVendedoras();
      const a = await fetchAuditoria(f.vid ? { vid: f.vid } : {});
      setVendedoras(vs); setRows(a); setLoading(false);
    })();
  }, [f.vid]);

  return (
    <div>
      <SectionHeader eyebrow="Reaperturas y cambios registrados" title="Auditoría" />
      <FilterBar f={f} setF={setF} vendedoras={vendedoras} modes={["todo"]} />
      {loading ? <p className="text-sm" style={{ color: COLORS.muted }}>Cargando…</p> : (
        <div className="flex flex-col gap-3">
          {rows.map((a) => (
            <div key={a.id} className="bg-white p-4" style={{ border: `1px solid ${COLORS.line}`, borderLeft: `3px solid ${COLORS.amber}` }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm" style={{ color: COLORS.forest, fontWeight: 600 }}>{a.accion}</span>
                <span className="text-xs" style={{ color: COLORS.muted }}>{new Date(a.fecha).toLocaleString()}</span>
              </div>
              {a.motivo && <p className="text-sm mb-2" style={{ color: COLORS.ink }}>{a.motivo}</p>}
              <div className="flex gap-4 text-xs" style={{ color: COLORS.muted }}>
                <span>Usuario afectado: {a.vendedora?.nombre || "—"}</span>
                <span>Realizado por: {a.admin?.nombre || "—"}</span>
              </div>
            </div>
          ))}
          {rows.length === 0 && <p className="text-xs" style={{ color: COLORS.muted }}>No hay registros con este filtro.</p>}
        </div>
      )}
    </div>
  );
}
