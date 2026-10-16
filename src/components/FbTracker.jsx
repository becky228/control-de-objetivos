import React, { useEffect, useState } from "react";
import { LedgerTable, PrimaryBtn, Tag, FilterBar, newFilter, passes, COLORS, inputStyle } from "./ui.jsx";
import { fetchFbLog, fetchCategorias, todayISO } from "../lib/api.js";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../context/AuthProvider.jsx";
import { useBatch, ActualizarBtn } from "../context/PendingProvider.jsx";
import { fmtY, fmt, isClosed, sum } from "../lib/dates.js";

// admin=true: puede editar cualquier día y cualquier dato (y eliminar si es administradora).
// admin=false: la vendedora ve sus registros y puede EDITAR solo los de HOY (a las 11:59 pm el día se cierra).
// Todo cambio queda pendiente hasta presionar "Actualizar".
export default function FbTracker({ cuenta, admin }) {
  const today = todayISO();
  const [rows, setRows] = useState([]);
  const [cats, setCats] = useState([]);
  const [f, setF] = useState(newFilter("mes", today));
  const [nuevo, setNuevo] = useState({ categoria: "", inicio: "", final: "", total: "" });
  const [fecha, setFecha] = useState(today); // solo la administradora puede elegir otra fecha
  const [editId, setEditId] = useState(null); // fila que la vendedora está editando
  const { profile } = useAuth();
  const puedeBorrar = profile?.rol === "admin";
  const b = useBatch({ key: "fb", label: "Facebook", table: "fb_publicaciones" });

  const cargar = async () => {
    const [r, c] = await Promise.all([fetchFbLog({ cuentaId: cuenta.id }), fetchCategorias()]);
    setRows(r); setCats(c);
  };
  useEffect(() => { cargar(); }, [cuenta.id, b.version]);

  const agregar = () => {
    if (!nuevo.categoria || !nuevo.inicio || nuevo.total === "") return;
    b.addRow({
      cuenta_id: cuenta.id, vendedora_id: cuenta.vendedora_id, fecha: admin ? fecha : today,
      categoria: nuevo.categoria, inicio: nuevo.inicio, final: nuevo.final, total: Number(nuevo.total),
    });
    setNuevo({ categoria: "", inicio: "", final: "", total: "" });
    setFecha(today);
  };

  const eliminar = async (row) => {
    await supabase.from("fb_publicaciones").delete().eq("id", row.id);
    cargar();
  };

  // filas con los cambios pendientes aplicados
  const vista = rows.map((r) => ({ ...r, fecha: b.val(r, "fecha"), categoria: b.val(r, "categoria"), inicio: b.val(r, "inicio"), final: b.val(r, "final"), total: b.val(r, "total") }));
  const list = vista.filter((e) => passes(f, e.fecha, e.vendedora_id)).sort((a, c) => (a.fecha < c.fecha ? 1 : a.fecha > c.fecha ? -1 : 0));
  const num = (e) => (e.total === "" || e.total == null ? null : Number(e.total));
  const out = [];

  // nuevos registros pendientes (todavía sin guardar)
  b.adds.forEach((a) => {
    out.push([
      <span className="text-xs">{fmtY(a.fecha)} <Tag tone="warn">sin guardar</Tag></span>,
      a.categoria, a.inicio, a.final || "—", a.total,
      <button className="text-xs" style={{ color: COLORS.rust }} onClick={() => b.removeAdd(a._tmp)}>Quitar</button>,
    ]);
  });

  list.forEach((e, i) => {
    const orig = rows.find((r) => r.id === e.id);
    const closed = isClosed(e.fecha);
    const editando = admin || editId === e.id;
    const input = (campo, w, type) => (
      <input type={type || "text"} className="px-2 py-1 text-sm" style={{ ...inputStyle, width: w, background: b.editado(orig) ? "#FFF6DD" : inputStyle.background }}
        value={e[campo] ?? ""} onChange={(ev) => b.setCampo(orig, campo, type === "number" ? (ev.target.value === "" ? null : Number(ev.target.value)) : ev.target.value)} />
    );
    out.push([
      admin
        ? <span className="flex items-center gap-1"><input type="date" className="text-sm px-1 py-0.5" style={inputStyle} value={e.fecha} onChange={(ev) => ev.target.value && b.setCampo(orig, "fecha", ev.target.value)} />{closed && "🔒"}</span>
        : <span className="flex items-center gap-1">{fmtY(e.fecha)}{closed && "🔒"}</span>,
      editando
        ? <select className="px-1 py-1 text-sm" style={inputStyle} value={e.categoria || ""} onChange={(ev) => b.setCampo(orig, "categoria", ev.target.value)}>
            {cats.map((c) => <option key={c}>{c}</option>)}
          </select>
        : e.categoria,
      editando ? input("inicio", 70) : e.inicio,
      editando ? input("final", 70) : (e.final ? e.final : <Tag tone="warn">Sin cerrar</Tag>),
      editando ? input("total", 70, "number") : (e.total != null ? e.total : "—"),
      admin
        ? (puedeBorrar ? <button className="text-xs" style={{ color: COLORS.rust }} onClick={() => window.confirm("¿Eliminar este registro?") && eliminar(e)}>Eliminar</button> : "")
        : closed
          ? <span className="text-xs whitespace-nowrap" style={{ color: COLORS.muted }}>🔒 cerrado</span>
          : editId === e.id
            ? <button className="text-xs" style={{ color: COLORS.forest, fontWeight: 600 }} onClick={() => setEditId(null)}>✓ Listo</button>
            : <button className="text-xs" style={{ color: COLORS.forest }} onClick={() => setEditId(e.id)}>✎ Editar</button>,
    ]);
    const next = list[i + 1];
    if (!next || next.fecha !== e.fecha) {
      out.push([<span className="text-xs" style={{ color: COLORS.muted }}>{fmt(e.fecha)}</span>, <b style={{ color: COLORS.forest }}>Total del día</b>, "", "", <b style={{ color: COLORS.amber }}>{sum(list.filter((x) => x.fecha === e.fecha).map((x) => num(x) || 0))}</b>, ""]);
    }
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
        <FilterBar f={f} setF={setF} showVend={false} />
        <ActualizarBtn batch={b} />
      </div>
      <div className="bg-white p-4 mb-4" style={{ border: `1px solid ${COLORS.line}` }}>
        <div className="text-xs mb-2 flex items-center gap-2 flex-wrap" style={{ color: COLORS.muted }}>
          {admin ? <>Nuevo registro · Fecha: <input type="date" className="px-2 py-1 text-sm" style={inputStyle} value={fecha} onChange={(e) => setFecha(e.target.value)} /></> : <>Nuevo registro · Fecha: {fmtY(today)} (automática)</>}
        </div>
        <div className="flex gap-2 flex-wrap">
          <select className="px-2 py-2 text-sm flex-1" style={{ ...inputStyle, minWidth: 130 }} value={nuevo.categoria} onChange={(e) => setNuevo({ ...nuevo, categoria: e.target.value })}>
            <option value="">Categoría…</option>
            {cats.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input className="px-2 py-2 text-sm" style={{ ...inputStyle, width: 70 }} placeholder="Inicio" value={nuevo.inicio} onChange={(e) => setNuevo({ ...nuevo, inicio: e.target.value })} />
          <input className="px-2 py-2 text-sm" style={{ ...inputStyle, width: 70 }} placeholder="Final" value={nuevo.final} onChange={(e) => setNuevo({ ...nuevo, final: e.target.value })} />
          <input type="number" className="px-2 py-2 text-sm" style={{ ...inputStyle, width: 70 }} placeholder="Total" value={nuevo.total} onChange={(e) => setNuevo({ ...nuevo, total: e.target.value })} />
          <PrimaryBtn onClick={agregar}>Agregar</PrimaryBtn>
        </div>
        <p className="text-xs mt-2" style={{ color: COLORS.muted }}>Total = cuántas publicaste realmente (los agotados se saltan). El registro queda pendiente hasta que presiones "Actualizar".</p>
      </div>
      {admin
        ? <p className="text-xs mb-3" style={{ color: COLORS.muted }}>Como administradora puedes cambiar cualquier dato (fecha, categoría, inicio, final, total), agregar registros de cualquier día{puedeBorrar ? " o eliminarlos" : ""}. Los cambios en días cerrados quedan en Auditoría.</p>
        : <p className="text-xs mb-3" style={{ color: COLORS.muted }}>Usa "Editar" para corregir tus registros de hoy y presiona "Actualizar" para guardar. A las 11:59 pm el día se cierra (🔒) y ya no se puede modificar; solo la administradora puede corregirlo.</p>}
      <LedgerTable columns={["Fecha", "Categoría", "Inicio", "Final", "Total", ""]} rows={out} maxH={360} />
    </div>
  );
}
