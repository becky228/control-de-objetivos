import React, { useEffect, useState } from "react";
import { SectionHeader, LedgerTable, NumIn, PrimaryBtn, FilterBar, newFilter, passes, COLORS, inputStyle, Field } from "../../components/ui.jsx";
import { fetchVendedoras, fetchPuntos, todayISO } from "../../lib/api.js";
import { supabase } from "../../lib/supabase.js";
import { fmtY } from "../../lib/dates.js";

export default function PuntosMejora() {
  const today = todayISO();
  const [vendedoras, setVendedoras] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState(newFilter("mes", today));
  const [nv, setNv] = useState({ vid: "", motivo: "", gravedad: "Leve", descuento: 0 });

  const cargar = async () => {
    setLoading(true);
    const [vs, p] = await Promise.all([fetchVendedoras(), fetchPuntos()]);
    setVendedoras(vs); setRows(p);
    setLoading(false);
  };
  useEffect(() => { cargar(); }, []);

  const agregar = async () => {
    if (!nv.vid || !nv.motivo.trim()) return;
    await supabase.from("puntos_mejora").insert({ vendedora_id: nv.vid, fecha: today, motivo: nv.motivo.trim(), gravedad: nv.gravedad, descuento: nv.descuento || 0 });
    setNv({ vid: "", motivo: "", gravedad: "Leve", descuento: 0 });
    cargar();
  };
  const editar = async (row, campo, valor) => { await supabase.from("puntos_mejora").update({ [campo]: valor }).eq("id", row.id); cargar(); };

  if (loading) return <p className="text-sm" style={{ color: COLORS.muted }}>Cargando…</p>;
  const rowsF = rows.filter((p) => passes(f, p.fecha, p.vendedora_id));

  return (
    <div>
      <SectionHeader eyebrow="Desempeño" title="Puntos de mejora" />

      <div className="bg-white p-4 mb-5" style={{ border: `1px solid ${COLORS.line}`, borderLeft: `3px solid ${COLORS.amber}` }}>
        <div className="text-sm mb-3" style={{ color: COLORS.forest, fontWeight: 600 }}>Nuevo punto de mejora · Fecha: {fmtY(today)}</div>
        <div className="flex gap-2 flex-wrap items-end">
          <Field label="Vendedora activa">
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
      <LedgerTable
        columns={["Fecha", "Vendedora", "Motivo", "Gravedad", "Descuento"]}
        rows={rowsF.map((p) => [
          fmtY(p.fecha), p.profiles?.nombre || "—",
          <input className="px-2 py-1 text-sm w-full" style={{ ...inputStyle, minWidth: 180 }} defaultValue={p.motivo} onBlur={(e) => e.target.value !== p.motivo && editar(p, "motivo", e.target.value)} />,
          <select className="px-2 py-1 text-sm" style={inputStyle} defaultValue={p.gravedad} onChange={(e) => editar(p, "gravedad", e.target.value)}>
            <option>Leve</option><option>Media</option><option>Fuerte</option>
          </select>,
          <span className="flex items-center gap-1">-$<NumIn w={56} value={p.descuento} onChange={(x) => editar(p, "descuento", x)} /></span>,
        ])}
      />
    </div>
  );
}
