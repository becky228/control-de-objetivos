import React, { useEffect, useState } from "react";
import { LedgerTable, NumIn, PrimaryBtn, Tag, FilterBar, newFilter, passes, COLORS, inputStyle } from "./ui.jsx";
import { fetchFbLog, fetchCategorias, todayISO } from "../lib/api.js";
import { supabase } from "../lib/supabase.js";
import { fmtY, fmt, isClosed, sum } from "../lib/dates.js";

// admin=true: puede editar cualquier día y cambiar categoría.
// admin=false: la vendedora solo agrega/edita el registro de HOY.
export default function FbTracker({ cuenta, admin }) {
  const today = todayISO();
  const [rows, setRows] = useState([]);
  const [cats, setCats] = useState([]);
  const [f, setF] = useState(newFilter("mes", today));
  const [nuevo, setNuevo] = useState({ categoria: "", inicio: "", final: "", total: "" });
  const [busy, setBusy] = useState(false);

  const cargar = async () => {
    const [r, c] = await Promise.all([fetchFbLog({ cuentaId: cuenta.id }), fetchCategorias()]);
    setRows(r); setCats(c);
  };
  useEffect(() => { cargar(); }, [cuenta.id]);

  const agregar = async () => {
    if (!nuevo.categoria || !nuevo.inicio || nuevo.total === "") return;
    setBusy(true);
    await supabase.from("fb_publicaciones").insert({
      cuenta_id: cuenta.id, vendedora_id: cuenta.vendedora_id, fecha: today,
      categoria: nuevo.categoria, inicio: nuevo.inicio, final: nuevo.final, total: Number(nuevo.total),
    });
    setNuevo({ categoria: "", inicio: "", final: "", total: "" });
    setBusy(false);
    cargar();
  };

  const actualizar = async (row, campo, valor) => {
    await supabase.from("fb_publicaciones").update({ [campo]: campo === "total" ? Number(valor) : valor }).eq("id", row.id);
    cargar();
  };

  const list = rows.filter((e) => passes(f, e.fecha, e.vendedora_id)).sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
  const out = [];
  list.forEach((e, i) => {
    const closed = isClosed(e.fecha);
    const puedeEditar = admin || e.fecha === today;
    out.push([
      <span className="flex items-center gap-1">{fmtY(e.fecha)}{closed && "🔒"}</span>,
      admin
        ? <select className="px-1 py-1 text-sm" style={inputStyle} defaultValue={e.categoria || ""} onChange={(ev) => actualizar(e, "categoria", ev.target.value)}>
            {cats.map((c) => <option key={c}>{c}</option>)}
          </select>
        : e.categoria,
      e.inicio,
      e.final ? e.final : puedeEditar
        ? <input className="px-2 py-1 text-sm" style={{ ...inputStyle, width: 64 }} placeholder="…" defaultValue="" onBlur={(ev) => ev.target.value && actualizar(e, "final", ev.target.value)} />
        : <Tag tone="warn">Sin cerrar</Tag>,
      e.total != null ? e.total : puedeEditar
        ? <input type="number" className="px-2 py-1 text-sm" style={{ ...inputStyle, width: 64 }} placeholder="…" defaultValue="" onBlur={(ev) => ev.target.value !== "" && actualizar(e, "total", ev.target.value)} />
        : "—",
    ]);
    const next = list[i + 1];
    if (!next || next.fecha !== e.fecha) {
      out.push([<span className="text-xs" style={{ color: COLORS.muted }}>{fmt(e.fecha)}</span>, <b style={{ color: COLORS.forest }}>Total del día</b>, "", "", <b style={{ color: COLORS.amber }}>{sum(list.filter((x) => x.fecha === e.fecha).map((x) => x.total || 0))}</b>]);
    }
  });

  return (
    <div>
      <FilterBar f={f} setF={setF} showVend={false} />
      {!admin && (
        <div className="bg-white p-4 mb-4" style={{ border: `1px solid ${COLORS.line}` }}>
          <div className="text-xs mb-2" style={{ color: COLORS.muted }}>Nuevo registro · Fecha: {fmtY(today)} (automática)</div>
          <div className="flex gap-2 flex-wrap">
            <select className="px-2 py-2 text-sm flex-1" style={{ ...inputStyle, minWidth: 130 }} value={nuevo.categoria} onChange={(e) => setNuevo({ ...nuevo, categoria: e.target.value })}>
              <option value="">Categoría…</option>
              {cats.map((c) => <option key={c}>{c}</option>)}
            </select>
            <input className="px-2 py-2 text-sm" style={{ ...inputStyle, width: 70 }} placeholder="Inicio" value={nuevo.inicio} onChange={(e) => setNuevo({ ...nuevo, inicio: e.target.value })} />
            <input className="px-2 py-2 text-sm" style={{ ...inputStyle, width: 70 }} placeholder="Final" value={nuevo.final} onChange={(e) => setNuevo({ ...nuevo, final: e.target.value })} />
            <input type="number" className="px-2 py-2 text-sm" style={{ ...inputStyle, width: 70 }} placeholder="Total" value={nuevo.total} onChange={(e) => setNuevo({ ...nuevo, total: e.target.value })} />
            <PrimaryBtn onClick={agregar} disabled={busy}>{busy ? "Guardando…" : "Agregar"}</PrimaryBtn>
          </div>
          <p className="text-xs mt-2" style={{ color: COLORS.muted }}>Total = cuántas publicaste realmente (los agotados se saltan).</p>
        </div>
      )}
      <LedgerTable columns={["Fecha", "Categoría", "Inicio", "Final", "Total"]} rows={out} maxH={360} />
    </div>
  );
}
