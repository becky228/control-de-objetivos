import React, { useEffect, useState } from "react";
import { SectionHeader, LedgerTable, NumIn, PrimaryBtn, FilterBar, newFilter, passes, Tag, COLORS, inputStyle, Field } from "../../components/ui.jsx";
import { fetchVendedoras, fetchPuntos, todayISO } from "../../lib/api.js";
import { supabase } from "../../lib/supabase.js";
import { useAuth } from "../../context/AuthProvider.jsx";
import { useBatch, ActualizarBtn } from "../../context/PendingProvider.jsx";
import { fmtY } from "../../lib/dates.js";

export default function PuntosMejora() {
  const today = todayISO();
  const [vendedoras, setVendedoras] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState(newFilter("mes", today));
  const { profile } = useAuth();
  const puedeBorrar = profile?.rol === "admin";
  const [nv, setNv] = useState({ vid: "", motivo: "", observacion: "", gravedad: "Leve", descuento: 0 });
  const b = useBatch({ key: "puntos", label: "Puntos de mejora", table: "puntos_mejora" });

  const cargar = async () => {
    const [vs, p] = await Promise.all([fetchVendedoras(), fetchPuntos()]);
    setVendedoras(vs); setRows(p);
    setLoading(false);
  };
  useEffect(() => { cargar(); }, [b.version]);

  const agregar = () => {
    if (!nv.vid || !nv.motivo.trim()) return;
    b.addRow({ vendedora_id: nv.vid, fecha: today, motivo: nv.motivo.trim(), observacion: nv.observacion.trim() || null, gravedad: nv.gravedad, descuento: nv.descuento || 0 });
    setNv({ vid: "", motivo: "", observacion: "", gravedad: "Leve", descuento: 0 });
  };
  const eliminar = async (row) => { await supabase.from("puntos_mejora").delete().eq("id", row.id); cargar(); };
  const nombre = (id) => vendedoras.find((v) => v.id === id)?.nombre || "—";

  if (loading) return <p className="text-sm" style={{ color: COLORS.muted }}>Cargando…</p>;
  const vista = rows.map((p) => ({ ...p, fecha: b.val(p, "fecha"), vendedora_id: b.val(p, "vendedora_id"), motivo: b.val(p, "motivo"), observacion: b.val(p, "observacion"), gravedad: b.val(p, "gravedad"), descuento: b.val(p, "descuento") }));
  const rowsF = vista.filter((p) => passes(f, p.fecha, p.vendedora_id));

  return (
    <div>
      <SectionHeader eyebrow="Desempeño · puedes editar cualquier campo" title="Puntos de mejora" action={<ActualizarBtn batch={b} />} />

      <div className="bg-white p-4 mb-5" style={{ border: `1px solid ${COLORS.line}`, borderLeft: `3px solid ${COLORS.amber}` }}>
        <div className="text-sm mb-3" style={{ color: COLORS.forest, fontWeight: 600 }}>Nuevo punto de mejora · Fecha: {fmtY(today)}</div>
        <div className="flex gap-2 flex-wrap items-end">
          <Field label="Vendedora">
            <select className="px-2 py-2 text-sm" style={{ ...inputStyle, minWidth: 150 }} value={nv.vid} onChange={(e) => setNv({ ...nv, vid: e.target.value })}>
              <option value="">Elegir…</option>
              {vendedoras.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
          </Field>
          <div className="flex-1" style={{ minWidth: 200 }}>
            <Field label="Motivo">
              <input className="w-full px-2 py-2 text-sm" style={inputStyle} placeholder="Ej. mala atención, error en descripción…" value={nv.motivo} onChange={(e) => setNv({ ...nv, motivo: e.target.value })} />
            </Field>
          </div>
          <div className="flex-1" style={{ minWidth: 200 }}>
            <Field label="Observación (opcional)">
              <input className="w-full px-2 py-2 text-sm" style={inputStyle} placeholder="Detalle, qué pasó, qué se acordó…" value={nv.observacion} onChange={(e) => setNv({ ...nv, observacion: e.target.value })} />
            </Field>
          </div>
          <Field label="Gravedad">
            <select className="px-2 py-2 text-sm" style={inputStyle} value={nv.gravedad} onChange={(e) => setNv({ ...nv, gravedad: e.target.value })}>
              <option>Leve</option><option>Media</option><option>Fuerte</option>
            </select>
          </Field>
          <Field label="Descuento"><NumIn w={70} value={nv.descuento} onChange={(x) => setNv({ ...nv, descuento: x })} /></Field>
          <PrimaryBtn onClick={agregar}>Agregar</PrimaryBtn>
        </div>
      </div>

      <FilterBar f={f} setF={setF} vendedoras={vendedoras} />
      <p className="text-xs mb-3" style={{ color: COLORS.muted }}>Toca cualquier campo para editarlo{puedeBorrar ? " o elimina el registro" : ""}. Los cambios quedan pendientes hasta que presiones "Actualizar".</p>
      <LedgerTable
        columns={["Fecha", "Vendedora", "Motivo", "Observación", "Gravedad", "Descuento", ""]}
        rows={[
          ...b.adds.map((a) => [
            <span className="text-xs">{fmtY(a.fecha)} <Tag tone="warn">sin guardar</Tag></span>, nombre(a.vendedora_id), a.motivo, a.observacion || "—", a.gravedad, `-$${a.descuento}`,
            <button className="text-xs" style={{ color: COLORS.rust }} onClick={() => b.removeAdd(a._tmp)}>Quitar</button>,
          ]),
          ...rowsF.map((p) => {
            const orig = rows.find((r) => r.id === p.id);
            const mark = b.editado(orig) ? { background: "#FFF6DD" } : {};
            return [
              <input type="date" value={p.fecha} className="text-sm px-1 py-0.5" style={{ ...inputStyle, ...mark }} onChange={(e) => e.target.value && b.setCampo(orig, "fecha", e.target.value)} />,
              <select className="text-sm px-1 py-0.5" style={{ ...inputStyle, ...mark }} value={p.vendedora_id} onChange={(e) => b.setCampo(orig, "vendedora_id", e.target.value)}>
                {vendedoras.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
              </select>,
              <input className="px-2 py-1 text-sm w-full" style={{ ...inputStyle, ...mark, minWidth: 180 }} value={p.motivo || ""} onChange={(e) => b.setCampo(orig, "motivo", e.target.value)} />,
              <input className="px-2 py-1 text-sm w-full" style={{ ...inputStyle, ...mark, minWidth: 180 }} placeholder="Agregar observación…" value={p.observacion || ""} onChange={(e) => b.setCampo(orig, "observacion", e.target.value || null)} />,
              <select className="px-2 py-1 text-sm" style={{ ...inputStyle, ...mark }} value={p.gravedad} onChange={(e) => b.setCampo(orig, "gravedad", e.target.value)}>
                <option>Leve</option><option>Media</option><option>Fuerte</option>
              </select>,
              <span className="flex items-center gap-1">-$<NumIn w={56} value={p.descuento} onChange={(x) => b.setCampo(orig, "descuento", Number(x) || 0)} /></span>,
              puedeBorrar ? <button className="text-xs" style={{ color: COLORS.rust }} onClick={() => window.confirm("¿Eliminar este punto de mejora?") && eliminar(p)}>Eliminar</button> : "",
            ];
          }),
        ]}
      />
    </div>
  );
}
