import React, { useEffect, useState } from "react";
import { SectionHeader, LedgerTable, Tag, PrimaryBtn, GhostBtn, Field, TextInput, COLORS } from "../../components/ui.jsx";
import { supabase } from "../../lib/supabase.js";
import { supabaseAdmin } from "../../lib/supabaseAdmin.js";
import { cycleFor, cicloLabel, fmtY } from "../../lib/dates.js";

export default function Usuarios() {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [abierto, setAbierto] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [f, setF] = useState({ nombre: "", correo: "", pass: "", ingreso: "", rol: "vendedora" });
  const today = new Date().toISOString().slice(0, 10);

  const cargar = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("profiles").select("*").order("nombre");
    if (!error) setLista(data);
    setLoading(false);
  };
  useEffect(() => { cargar(); }, []);

  const crear = async (e) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      if (!f.nombre || !f.correo || !f.pass || !f.ingreso) throw new Error("Completa todos los campos.");
      const { error } = await supabaseAdmin.auth.signUp({
        email: f.correo.trim(),
        password: f.pass,
        options: { data: { nombre: f.nombre.trim(), rol: f.rol, ingreso_fecha: f.ingreso } },
      });
      if (error) throw error;
      // que la nueva sesión creada por signUp en el cliente "admin" no quede activa
      await supabaseAdmin.auth.signOut();
      setF({ nombre: "", correo: "", pass: "", ingreso: "", rol: "vendedora" });
      setAbierto(false);
      await cargar();
    } catch (e2) {
      setErr(e2.message || "No se pudo crear el usuario.");
    } finally {
      setBusy(false);
    }
  };

  const cambiarEstado = async (id, estado) => {
    await supabase.from("profiles").update({ estado, baja_fecha: estado === "Baja" ? today : null }).eq("id", id);
    setConfirm(null);
    cargar();
  };

  return (
    <div>
      <SectionHeader eyebrow="Alta y baja de personal" title="Usuarios"
        action={<PrimaryBtn onClick={() => setAbierto(!abierto)}>+ Nueva vendedora</PrimaryBtn>} />

      {abierto && (
        <form onSubmit={crear} className="bg-white p-5 mb-6" style={{ border: `1px solid ${COLORS.line}`, borderLeft: `3px solid ${COLORS.amber}` }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nombre"><TextInput value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></Field>
            <Field label="Correo"><TextInput type="email" value={f.correo} onChange={(e) => setF({ ...f, correo: e.target.value })} /></Field>
            <Field label="Contraseña temporal"><TextInput value={f.pass} onChange={(e) => setF({ ...f, pass: e.target.value })} /></Field>
            <Field label="Fecha de ingreso (contratación)"><TextInput type="date" value={f.ingreso} onChange={(e) => setF({ ...f, ingreso: e.target.value })} /></Field>
            <Field label="Rol">
              <select className="w-full px-3 py-2 text-sm" style={{ border: `1px solid ${COLORS.line}`, background: "#FBFAF7" }}
                value={f.rol} onChange={(e) => setF({ ...f, rol: e.target.value })}>
                <option value="vendedora">Vendedora</option>
                <option value="admin">Administradora</option>
              </select>
            </Field>
          </div>
          <p className="text-xs mt-3" style={{ color: COLORS.muted }}>
            La fecha de ingreso define su período de pago: cada mes cierra el día anterior a su fecha de ingreso.
          </p>
          {err && <p className="text-xs mt-2" style={{ color: COLORS.rust }}>{err}</p>}
          <div className="mt-4"><PrimaryBtn type="submit" disabled={busy}>{busy ? "Creando…" : "Crear usuario"}</PrimaryBtn></div>
        </form>
      )}

      {loading ? <p className="text-sm" style={{ color: COLORS.muted }}>Cargando…</p> : (
        <LedgerTable
          columns={["Nombre", "Correo", "Rol", "Fecha de ingreso", "Período de pago actual", "Estado", ""]}
          rows={lista.map((u) => [
            u.nombre, u.correo, u.rol === "admin" ? "Administradora" : "Vendedora", fmtY(u.ingreso_fecha),
            u.estado === "Activa" ? cicloLabel(cycleFor(u.ingreso_fecha, today)) : "—",
            u.estado === "Activa" ? <Tag tone="good">Activa</Tag> : <Tag tone="bad">Baja · {u.baja_fecha ? fmtY(u.baja_fecha) : ""}</Tag>,
            u.estado === "Activa"
              ? (confirm === u.id
                ? <span className="text-xs flex items-center gap-2">¿Confirmar?
                  <button onClick={() => cambiarEstado(u.id, "Baja")} style={{ color: COLORS.rust, fontWeight: 600 }}>Sí</button>
                  <button onClick={() => setConfirm(null)} style={{ color: COLORS.forest }}>No</button></span>
                : <GhostBtn tone="rust" onClick={() => setConfirm(u.id)}>Dar de baja</GhostBtn>)
              : <GhostBtn onClick={() => cambiarEstado(u.id, "Activa")}>Reactivar</GhostBtn>,
          ])}
        />
      )}
      <p className="text-xs mt-4" style={{ color: COLORS.muted }}>Al dar de baja se conserva todo su historial; solo deja de poder iniciar sesión.</p>
    </div>
  );
}
