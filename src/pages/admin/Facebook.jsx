import React, { useEffect, useState } from "react";
import { SectionHeader, LedgerTable, Tag, PrimaryBtn, FilterBar, newFilter, passes, COLORS, inputStyle, Field, TextInput } from "../../components/ui.jsx";
import { fetchVendedoras, fetchCuentas, fetchCategorias, fetchFbLog, todayISO } from "../../lib/api.js";
import { supabase } from "../../lib/supabase.js";
import { sum } from "../../lib/dates.js";
import FbTracker from "../../components/FbTracker.jsx";

export default function Facebook() {
  const [vendedoras, setVendedoras] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [cats, setCats] = useState([]);
  const [fbLog, setFbLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState(null);
  const [f, setF] = useState(newFilter("mes", todayISO()));
  const [showAll, setShowAll] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [nc, setNc] = useState({ nombre: "", vid: "" });
  const [nuevaCat, setNuevaCat] = useState("");

  const cargar = async () => {
    setLoading(true);
    const [vs, cu, ca, log] = await Promise.all([fetchVendedoras(), fetchCuentas(), fetchCategorias(), fetchFbLog()]);
    setVendedoras(vs); setCuentas(cu); setCats(ca); setFbLog(log);
    setLoading(false);
  };
  useEffect(() => { cargar(); }, []);

  const crearCuenta = async () => {
    if (!nc.nombre.trim()) return;
    await supabase.from("facebook_accounts").insert({ nombre: nc.nombre.trim(), vendedora_id: nc.vid || null });
    setNc({ nombre: "", vid: "" }); setAddOpen(false); cargar();
  };
  const reasignar = async (cuenta, vid) => { await supabase.from("facebook_accounts").update({ vendedora_id: vid || null }).eq("id", cuenta.id); cargar(); };
  const cambiarEstado = async (cuenta, estado) => { await supabase.from("facebook_accounts").update({ estado }).eq("id", cuenta.id); cargar(); };
  const agregarCat = async () => {
    const n = nuevaCat.trim();
    if (!n) return;
    await supabase.from("categorias_fb").insert({ nombre: n });
    setNuevaCat(""); cargar();
  };

  if (loading) return <p className="text-sm" style={{ color: COLORS.muted }}>Cargando…</p>;

  if (sel) {
    const c = cuentas.find((x) => x.id === sel);
    return (
      <div>
        <button onClick={() => setSel(null)} className="text-xs mb-3" style={{ color: COLORS.forest }}>← Volver a la lista</button>
        <SectionHeader eyebrow={`Asignada a ${c.profiles?.nombre || "nadie (sin asignar)"}`} title={`Cuenta: ${c.nombre}`} />
        <FbTracker cuenta={c} admin />
      </div>
    );
  }

  const lista = cuentas.filter((c) => (showAll || c.estado === "Activa") && (!f.vid || c.vendedora_id === f.vid));

  return (
    <div>
      <SectionHeader eyebrow="Solo la administradora da de alta y asigna las cuentas" title="Cuentas de Facebook"
        action={<PrimaryBtn onClick={() => setAddOpen(!addOpen)}>+ Nueva cuenta</PrimaryBtn>} />

      {addOpen && (
        <div className="bg-white p-4 mb-4 flex items-end gap-3 flex-wrap" style={{ border: `1px solid ${COLORS.line}`, borderLeft: `3px solid ${COLORS.amber}` }}>
          <Field label="Nombre de la cuenta"><TextInput style={{ width: 200 }} value={nc.nombre} onChange={(e) => setNc({ ...nc, nombre: e.target.value })} /></Field>
          <Field label="Asignar a">
            <select className="px-3 py-2 text-sm" style={inputStyle} value={nc.vid} onChange={(e) => setNc({ ...nc, vid: e.target.value })}>
              <option value="">Sin asignar</option>
              {vendedoras.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
          </Field>
          <PrimaryBtn onClick={crearCuenta}>Agregar</PrimaryBtn>
        </div>
      )}

      <FilterBar f={f} setF={setF} vendedoras={vendedoras} modes={["todo"]} />
      <LedgerTable
        columns={["Cuenta", "Asignada a", "Estado", "Publicaciones (total)", ""]}
        rows={lista.map((c) => {
          const es = fbLog.filter((e) => e.cuenta_id === c.id);
          return [
            c.nombre,
            <select className="text-sm px-2 py-1" style={inputStyle} value={c.vendedora_id || ""} onChange={(e) => reasignar(c, e.target.value)}>
              <option value="">Sin asignar</option>
              {vendedoras.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>,
            <select className="text-sm px-2 py-1" style={inputStyle} value={c.estado} onChange={(e) => cambiarEstado(c, e.target.value)}>
              <option>Activa</option><option>Inactiva</option><option>Bloqueada</option>
            </select>,
            sum(es.map((e) => e.total || 0)),
            <button onClick={() => setSel(c.id)} className="text-xs" style={{ color: COLORS.forest }}>Ver avance →</button>,
          ];
        })}
      />
      <label className="flex items-center gap-1.5 text-xs mt-3" style={{ color: COLORS.muted }}>
        <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> Mostrar también inactivas y bloqueadas
      </label>

      <div className="mt-8 bg-white p-4" style={{ border: `1px solid ${COLORS.line}` }}>
        <div className="text-sm mb-2" style={{ color: COLORS.forest, fontWeight: 600 }}>Categorías disponibles</div>
        <div className="flex flex-wrap gap-1.5 mb-3">{cats.map((c) => <Tag key={c}>{c}</Tag>)}</div>
        <div className="flex gap-2">
          <TextInput style={{ width: 220 }} placeholder="Nueva categoría" value={nuevaCat} onChange={(e) => setNuevaCat(e.target.value)} />
          <PrimaryBtn onClick={agregarCat}>Añadir categoría</PrimaryBtn>
        </div>
      </div>
    </div>
  );
}
