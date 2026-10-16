import React, { useEffect, useState } from "react";
import { SectionHeader, LedgerTable, NumIn, Prog, FilterBar, newFilter, passes, PrimaryBtn, Field, inputStyle, Tag, COLORS } from "../../components/ui.jsx";
import { supabase } from "../../lib/supabase.js";
import { useAuth } from "../../context/AuthProvider.jsx";
import { useBatch, ActualizarBtn } from "../../context/PendingProvider.jsx";
import { fetchVendedoras, fetchRegistroApp, fetchMetasGlobales, todayISO } from "../../lib/api.js";
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
  const b = useBatch({ key: "registro_app", label: "Registro APP", table: "registro_app" });

  const cargar = async () => {
    const vs = await fetchVendedoras();
    const [r, mg] = await Promise.all([fetchRegistroApp(), fetchMetasGlobales(vs.map((v) => v.id))]);
    setVendedoras(vs); setRows(r); setMetasGlobales(mg);
    setLoading(false);
  };
  useEffect(() => { cargar(); }, [b.version]);

  const eliminar = async (row) => {
    setErr("");
    const { error } = await supabase.from("registro_app").delete().eq("id", row.id);
    if (error) setErr(error.message);
    cargar();
  };
  const agregar = () => {
    if (!nv.vid || !nv.fecha || nv.cantidad === "") return;
    b.addRow({ user_id: nv.vid, fecha: nv.fecha, cantidad: Number(nv.cantidad) });
    setNv({ vid: "", fecha: today, cantidad: "" });
  };
  const nombre = (id) => vendedoras.find((v) => v.id === id)?.nombre || "—";

  if (loading) return <p className="text-sm" style={{ color: COLORS.muted }}>Cargando…</p>;
  const vista = rows.map((r) => ({ ...r, fecha: b.val(r, "fecha"), user_id: b.val(r, "user_id"), cantidad: b.val(r, "cantidad") }));
  const filtradas = vista.filter((a) => passes(f, a.fecha, a.user_id));
  const duplicado = (a) => vista.some((x) => x.id !== a.id && x.user_id === a.user_id && x.fecha === a.fecha);
  const metaDia = (a) => {
    const w = dow(a.fecha);
    const cand = metasGlobales.filter((m) => m.vendedora_id === a.user_id && m.variable === "app" && m.dia_semana === w && m.vigente_desde <= a.fecha);
    if (!cand.length || w === 6) return 0;
    cand.sort((x, y) => (x.vigente_desde < y.vigente_desde ? 1 : x.vigente_desde > y.vigente_desde ? -1 : (y.id || 0) - (x.id || 0)));
    return cand[0].valor;
  };

  return (
    <div>
      <SectionHeader eyebrow="Productos registrados en la app de control de inventario" title="Registro en la APP" action={<ActualizarBtn batch={b} />} />
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
      <p className="text-xs mb-3" style={{ color: COLORS.muted }}>Puedes cambiar fecha, vendedora y cantidad de cualquier registro{puedeBorrar ? ", o eliminarlo" : ""}. Los cambios quedan pendientes hasta que presiones "Actualizar". Los cambios en días cerrados quedan en Auditoría.</p>
      <LedgerTable maxH={440}
        columns={["Fecha", "Vendedora", "Registrados", "Meta del día", "Progreso", ""]}
        rows={[
          ...b.adds.map((a) => [
            <span className="text-xs">{fmtY(a.fecha)} <Tag tone="warn">sin guardar</Tag></span>, nombre(a.user_id), a.cantidad, "—", "—",
            <button className="text-xs" style={{ color: COLORS.rust }} onClick={() => b.removeAdd(a._tmp)}>Quitar</button>,
          ]),
          ...filtradas.map((a) => {
            const orig = rows.find((r) => r.id === a.id);
            const mark = b.editado(orig) ? { background: "#FFF6DD" } : {};
            return [
              <span className="flex items-center gap-1">
                <input type="date" value={a.fecha} className="text-sm px-1 py-0.5" style={{ ...inputStyle, ...mark }} onChange={(e) => e.target.value && b.setCampo(orig, "fecha", e.target.value)} />
                {duplicado(a) && <Tag tone="bad">duplicado</Tag>}
              </span>,
              <select className="text-sm px-1 py-0.5" style={{ ...inputStyle, ...mark }} value={a.user_id} onChange={(e) => b.setCampo(orig, "user_id", e.target.value)}>
                {vendedoras.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
              </select>,
              <NumIn w={60} value={a.cantidad} onChange={(x) => b.setCampo(orig, "cantidad", x === "" ? 0 : Number(x))} />,
              metaDia(a), <Prog hecho={a.cantidad || 0} meta={metaDia(a)} />,
              puedeBorrar ? <button className="text-xs" style={{ color: COLORS.rust }} onClick={() => window.confirm("¿Eliminar este registro?") && eliminar(a)}>Eliminar</button> : "",
            ];
          }),
          ...(filtradas.length ? [[<b>Total</b>, "", <b>{sum(filtradas.map((a) => a.cantidad))}</b>, <b>{sum(filtradas.map(metaDia))}</b>, <Prog hecho={sum(filtradas.map((a) => a.cantidad))} meta={sum(filtradas.map(metaDia))} />, ""]] : []),
        ]}
      />
    </div>
  );
}
