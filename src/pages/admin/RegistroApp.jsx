import React, { useEffect, useState } from "react";
import { SectionHeader, LedgerTable, NumIn, Prog, FilterBar, newFilter, passes, PrimaryBtn, Field, inputStyle, Tag, COLORS } from "../../components/ui.jsx";
import { supabase } from "../../lib/supabase.js";
import { useAuth } from "../../context/AuthProvider.jsx";
import { fetchVendedoras, fetchRegistroApp, fetchMetasGlobales, todayISO } from "../../lib/api.js";
import { metaRango } from "../../lib/bono.js";
import { fmtY, dow, sum } from "../../lib/dates.js";

export default function RegistroApp() {
  const today = todayISO();
  const [vendedoras, setVendedoras] = useState([]);
  const [rows, setRows] = useState([]);
  const [metasGlobales, setMetasGlobales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState(newFilter("mes", today));
  const { profile } = useAuth();
  const puedeBorrar = profile?.rol === "admin";
  const [err, setErr] = useState("");
  const [nv, setNv] = useState({ vid: "", fecha: today, cantidad: "" });

  const cargar = async () => {
    setLoading(true);
    const vs = await fetchVendedoras();
    const [r, mg] = await Promise.all([fetchRegistroApp(), fetchMetasGlobales(vs.map((v) => v.id))]);
    setVendedoras(vs); setRows(r); setMetasGlobales(mg);
    setLoading(false);
  };
  useEffect(() => { cargar(); }, []);

  const msgError = (error) => (error.code === "23505" ? "Esa vendedora ya tiene un registro en esa fecha." : error.message);
  const actualizar = async (row, cambios) => {
    setErr("");
    const { error } = await supabase.from("registro_app").update(cambios).eq("id", row.id);
    if (error) setErr(msgError(error));
    cargar();
  };
  const eliminar = async (row) => {
    setErr("");
    const { error } = await supabase.from("registro_app").delete().eq("id", row.id);
    if (error) setErr(error.message);
    cargar();
  };
  const agregar = async () => {
    if (!nv.vid || !nv.fecha || nv.cantidad === "") return;
    setErr("");
    const { error } = await supabase.from("registro_app").insert({ user_id: nv.vid, fecha: nv.fecha, cantidad: Number(nv.cantidad) });
    if (error) return setErr(msgError(error));
    setNv({ vid: "", fecha: today, cantidad: "" });
    cargar();
  };
  const duplicado = (a, lista) => lista.some((x) => x.id !== a.id && x.user_id === a.user_id && x.fecha === a.fecha);

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
      <div className="bg-white p-4 mb-5" style={{ border: `1px solid ${COLORS.line}`, borderLeft: `3px solid ${COLORS.amber}` }}>
        <div className="text-sm mb-3" style={{ color: COLORS.forest, fontWeight: 600 }}>Agregar registro manual</div>
        <div className="flex gap-2 flex-wrap items-end">
          <Field label="Vendedora">
            <select className="px-2 py-2 text-sm" style={{ ...inputStyle, minWidth: 150 }} value={nv.vid} onChange={(e) => setNv({ ...nv, vid: e.target.value })}>
              <option value="">Elegir…</option>
              {vendedoras.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
          </Field>
          <Field label="Fecha"><input type="date" className="px-2 py-2 text-sm" style={inputStyle} value={nv.fecha} onChange={(e) => setNv({ ...nv, fecha: e.target.value })} /></Field>
          <Field label="Registrados"><NumIn w={70} value={nv.cantidad} onChange={(x) => setNv({ ...nv, cantidad: x })} /></Field>
          <PrimaryBtn onClick={agregar}>Agregar</PrimaryBtn>
        </div>
      </div>
      {err && <p className="text-xs mb-3" style={{ color: COLORS.rust }}>{err}</p>}
      <FilterBar f={f} setF={setF} vendedoras={vendedoras} />
      <p className="text-xs mb-3" style={{ color: COLORS.muted }}>Puedes cambiar fecha, vendedora y cantidad de cualquier registro{puedeBorrar ? ", o eliminarlo" : ""}. Los cambios en días cerrados quedan en Auditoría.</p>
      <LedgerTable maxH={440}
        columns={["Fecha", "Vendedora", "Registrados", "Meta del día", "Progreso", ""]}
        rows={[
          ...filtradas.map((a) => [
            <span key={a.id + a.fecha} className="flex items-center gap-1">
              <input type="date" defaultValue={a.fecha} className="text-sm px-1 py-0.5" style={inputStyle} onBlur={(e) => e.target.value && e.target.value !== a.fecha && actualizar(a, { fecha: e.target.value })} />
              {duplicado(a, rows) && <Tag tone="bad">duplicado</Tag>}
            </span>,
            <select className="text-sm px-1 py-0.5" style={inputStyle} value={a.user_id} onChange={(e) => actualizar(a, { user_id: e.target.value })}>
              {vendedoras.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>,
            <NumIn w={60} value={a.cantidad} onChange={(x) => actualizar(a, { cantidad: Number(x) || 0 })} />,
            metaDia(a), <Prog hecho={a.cantidad || 0} meta={metaDia(a)} />,
            puedeBorrar ? <button className="text-xs" style={{ color: COLORS.rust }} onClick={() => window.confirm("¿Eliminar este registro?") && eliminar(a)}>Eliminar</button> : "",
          ]),
          ...(filtradas.length ? [[<b>Total</b>, "", <b>{sum(filtradas.map((a) => a.cantidad))}</b>, <b>{sum(filtradas.map(metaDia))}</b>, <Prog hecho={sum(filtradas.map((a) => a.cantidad))} meta={sum(filtradas.map(metaDia))} />, ""]] : []),
        ]}
      />
    </div>
  );
}
