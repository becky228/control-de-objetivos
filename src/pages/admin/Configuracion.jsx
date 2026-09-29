import React, { useEffect, useState } from "react";
import { SectionHeader, Field, TextInput, SaveBtn, Tag, COLORS } from "../../components/ui.jsx";
import { supabase } from "../../lib/supabase.js";
import { fetchVisibilidad } from "../../lib/api.js";

const OPCIONES_VIS = [
  { k: "asistencia", label: "Asistencia (detalle propio)" },
  { k: "pendientes", label: "Pendientes" },
  { k: "bono", label: "Bono / bonificaciones" },
  { k: "descuento", label: "Descuento en puntos de mejora" },
];

export default function Configuracion() {
  const [store, setStore] = useState(null);
  const [vis, setVis] = useState({});
  const [loading, setLoading] = useState(true);

  const cargar = async () => {
    setLoading(true);
    const { data } = await supabase.from("store_settings").select("*").eq("id", 1).single();
    const v = await fetchVisibilidad();
    setStore(data); setVis(v); setLoading(false);
  };
  useEffect(() => { cargar(); }, []);

  if (loading || !store) return <p className="text-sm" style={{ color: COLORS.muted }}>Cargando…</p>;

  const guardar = async () => {
    await supabase.from("store_settings").update({ lat: store.lat, lng: store.lng, radio_metros: store.radio_metros }).eq("id", 1);
    await Promise.all(Object.entries(vis).map(([k, v]) => supabase.from("visibilidad_config").update({ valor: v }).eq("clave", k)));
  };

  return (
    <div>
      <SectionHeader eyebrow="Ubicación de la tienda y visibilidad para vendedoras" title="Configuración" action={<SaveBtn onSave={guardar} label="Actualizar" />} />

      <h3 className="text-sm mb-3" style={{ color: COLORS.forest, fontWeight: 600 }}>Ubicación para validar el check-in por GPS</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 max-w-xl">
        <Field label="Latitud"><TextInput type="number" step="0.000001" value={store.lat ?? ""} onChange={(e) => setStore({ ...store, lat: e.target.value })} /></Field>
        <Field label="Longitud"><TextInput type="number" step="0.000001" value={store.lng ?? ""} onChange={(e) => setStore({ ...store, lng: e.target.value })} /></Field>
        <Field label="Radio permitido (metros)"><TextInput type="number" value={store.radio_metros ?? ""} onChange={(e) => setStore({ ...store, radio_metros: e.target.value })} /></Field>
      </div>
      <p className="text-xs mb-8" style={{ color: COLORS.muted }}>Consejo: abre Google Maps, ubica tu tienda, mantén presionado el punto exacto y copia la latitud y longitud que aparecen.</p>

      <h3 className="text-sm mb-3" style={{ color: COLORS.forest, fontWeight: 600 }}>Qué puede ver cada vendedora de sí misma</h3>
      <div className="flex flex-col gap-2 max-w-md">
        {OPCIONES_VIS.map((o) => (
          <div key={o.k} className="flex items-center justify-between bg-white px-3 py-2" style={{ border: `1px solid ${COLORS.line}` }}>
            <span className="text-sm">{o.label}</span>
            <div className="flex gap-1">
              {[["admin", "Solo administradora"], ["todas", "También vendedoras"]].map(([val, lab]) => (
                <button key={val} onClick={() => setVis({ ...vis, [o.k]: val })} className="text-xs px-2 py-1"
                  style={{ background: vis[o.k] === val ? COLORS.forest : "#fff", color: vis[o.k] === val ? "#fff" : COLORS.forest, border: `1px solid ${COLORS.forest}` }}>{lab}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
