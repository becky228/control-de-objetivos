import React, { useEffect, useState } from "react";
import { LedgerTable, NumIn, PrimaryBtn, Tag, FilterBar, newFilter, passes, COLORS, inputStyle } from "./ui.jsx";
import { fetchFbLog, fetchCategorias, todayISO } from "../lib/api.js";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../context/AuthProvider.jsx";
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
  const { profile } = useAuth();
  const puedeBorrar = profile?.rol === "admin";
  const [fecha, setFecha] = useState(today); // solo la administradora puede elegir otra fecha

  const cargar = async () => {
    const [r, c] = await Promise.all([fetchFbLog({ cuentaId: cuenta.id }), fetchCategorias()]);
    setRows(r); setCats(c);
  };
  useEffect(() => { cargar(); }, [cuenta.id]);

  const agregar = async () => {
    if (!nuevo.categoria || !nuevo.inicio || nuevo.total === "") return;
    setBusy(true);
    await supabase.from("fb_publicaciones").insert({
      cuenta_id: cuenta.id, vendedora_id: cuenta.vendedora_id, fecha: admin ? fecha : today,
      categoria: nuevo.categoria, inicio: nuevo.inicio, final: nuevo.final, total: Number(nuevo.total),
    });
    setNuevo({ categoria: "", inicio: "", final: "", total: "" });
    setFecha(today);
    setBusy(false);
    cargar();
  };

  const actualizar = async (row, campo, valor) => {
    await supabase.from("fb_publicaciones").update({ [campo]: campo === "total" ? Number(valor) : valor }).eq("id", row.id);
    cargar();
  };

  const eliminar = async (row) => {
    await supabase.from("fb_publicaciones").delete().eq("id", row.id);
    cargar();
  };

  const list = rows.filter((e) => passes(f, e.fecha, e.vendedora_id)).sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
  const out = [];
  list.forEach((e, i) => {
    const closed = isClosed(e.fecha);
    const puedeEditar = admin || e.fecha === today;
    out.push([
      admin
        ? <span className="flex items-center gap-1"><input key={e.id + e.fecha} type="date" defaultValue={e.fecha} className="text-sm px-1 py-0.5" style={inputStyle} onBlur={(ev) => ev.target.value && ev.target.value !== e.fecha && actualizar(e, "fecha", ev.target.value)} />{closed && "🔒"}</span>
        : <span className="flex items-center gap-1">{fmtY(e.fecha)}{closed && "🔒"}</span>,
      admin
        ? <select className="px-1 py-1 text-sm" style={inputStyle} defaultValue={e.categoria || ""} onChange={(ev) => actualizar(e, "categoria", ev.target.value)}>
            {cats.map((c) => <option key={c}>{c}</option>)}
          </select>
        : e.categoria,
      admin
        ? <input key={e.id + "i" + e.inicio} className="px-2 py-1 text-sm" style={{ ...inputStyle, width: 70 }} defaultValue={e.inicio || ""} onBlur={(ev) => ev.target.value !== (e.inicio || "") && actualizar(e, "inicio", ev.target.value)} />
        : e.inicio,
      admin
        ? <input key={e.id + "f" + e.final} className="px-2 py-1 text-sm" style={{ ...inputStyle, width: 70 }} defaultValue={e.final || ""} onBlur={(ev) => ev.target.value !== (e.final || "") && actualizar(e, "final", ev.target.value)} />
        : e.final ? e.final : puedeEditar
        ? <input className="px-2 py-1 text-sm" style={{ ...inputStyle, width: 64 }} placeholder="…" defaultValue="" onBlur={(ev) => ev.target.value && actualizar(e, "final", ev.target.value)} />
        : <Tag tone="warn">Sin cerrar</Tag>,
      admin
        ? <input key={e.id + "t" + e.total} type="number" className="px-2 py-1 text-sm" style={{ ...inputStyle, width: 70 }} defaultValue={e.total ?? ""} onBlur={(ev) => ev.target.value !== "" && Number(ev.target.value) !== e.total && actualizar(e, "total", ev.target.value)} />
        : e.total != null ? e.total : puedeEditar
        ? <input type="number" className="px-2 py-1 text-sm" style={{ ...inputStyle, width: 64 }} placeholder="…" defaultValue="" onBlur={(ev) => ev.target.value !== "" && actualizar(e, "total", ev.target.value)} />
        : "—",
      ...(admin ? [puedeBorrar ? <button className="text-xs" style={{ color: COLORS.rust }} onClick={() => window.confirm("¿Eliminar este registro?") && eliminar(e)}>Eliminar</button> : ""] : []),
    ]);
    const next = list[i + 1];
    if (!next || next.fecha !== e.fecha) {
      out.push([<span className="text-xs" style={{ color: COLORS.muted }}>{fmt(e.fecha)}</span>, <b style={{ color: COLORS.forest }}>Total del día</b>, "", "", <b style={{ color: COLORS.amber }}>{sum(list.filter((x) => x.fecha === e.fecha).map((x) => x.total || 0))}</b>, ...(admin ? [""] : [])]);
    }
  });

  return (
    <div>
      <FilterBar f={f} setF={setF} showVend={false} />
      {true && (
        <div className="bg-white p-4 mb-4" style={{ border: `1px solid ${COLORS.line}` }}>
          <div className="text-xs mb-2 flex items-center gap-2 flex-wrap" style={{ color: COLORS.muted }}>{admin ? <>Nuevo registro · Fecha: <input type="date" className="px-2 py-1 text-sm" style={inputStyle} value={fecha} onChange={(e) => setFecha(e.target.value)} /></> : <>Nuevo registro · Fecha: {fmtY(today)} (automática)</>}</div>
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
      {admin && <p className="text-xs mb-3" style={{ color: COLORS.muted }}>Como administradora puedes cambiar cualquier dato (fecha, categoría, inicio, final, total), agregar registros de cualquier día{puedeBorrar ? " o eliminarlos" : ""}. Los cambios en días cerrados quedan en Auditoría.</p>}
      <LedgerTable columns={admin ? ["Fecha", "Categoría", "Inicio", "Final", "Total", ""] : ["Fecha", "Categoría", "Inicio", "Final", "Total"]} rows={out} maxH={360} />
    </div>
  );
}
