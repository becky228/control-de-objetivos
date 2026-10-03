import React, { useEffect, useState } from "react";
import { SectionHeader, LedgerTable, Tag, PrimaryBtn, GhostBtn, Field, TextInput, COLORS } from "../../components/ui.jsx";
import { supabase } from "../../lib/supabase.js";
import { supabaseAdmin } from "../../lib/supabaseAdmin.js";
import { cycleFor, cicloLabel, fmtY, isoToday } from "../../lib/dates.js";
import { useAuth } from "../../context/AuthProvider.jsx";

const ROLES = { vendedora: "Vendedora", supervisor: "Supervisora", admin: "Administradora" };
const SIGUIENTE = { vendedora: "supervisor", supervisor: "admin" }; // "subir de rol"

export default function Usuarios() {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [abierto, setAbierto] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const { profile: yo } = useAuth();
  const [edit, setEdit] = useState(null); // { id, nombre, ingreso_fecha, bono_base, rol }
  const [subir, setSubir] = useState(null); // id pendiente de confirmar
  const [editErr, setEditErr] = useState("");
  const [f, setF] = useState({ nombre: "", correo: "", pass: "", ingreso: "", rol: "vendedora" });
  const today = isoToday();

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
      const { data: nuevo, error } = await supabaseAdmin.auth.signUp({
        email: f.correo.trim(),
        password: f.pass,
        options: { data: { nombre: f.nombre.trim(), ingreso_fecha: f.ingreso } },
      });
      if (error) throw error;
      // Por seguridad, todo usuario nuevo nace como vendedora; el rol lo asigna la administradora desde su sesión.
      if (f.rol !== "vendedora" && nuevo?.user?.id) {
        const { error: e3 } = await supabase.from("profiles").update({ rol: f.rol }).eq("id", nuevo.user.id);
        if (e3) throw new Error("Se creó el usuario pero no se pudo asignar el rol: " + e3.message);
      }
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

  const guardarEdicion = async (e) => {
    e.preventDefault();
    setBusy(true); setEditErr("");
    const cambios = { nombre: edit.nombre.trim(), ingreso_fecha: edit.ingreso_fecha, bono_base: Number(edit.bono_base) || 0 };
    if (edit.id !== yo.id) cambios.rol = edit.rol; // no te puedes quitar tu propio rol
    const { error } = await supabase.from("profiles").update(cambios).eq("id", edit.id);
    setBusy(false);
    if (error) return setEditErr(error.message);
    setEdit(null);
    cargar();
  };

  const subirRol = async (u) => {
    const nuevo = SIGUIENTE[u.rol];
    if (!nuevo) return;
    await supabase.from("profiles").update({ rol: nuevo }).eq("id", u.id);
    setSubir(null);
    cargar();
  };

  const cambiarEstado = async (id, estado) => {
    await supabase.from("profiles").update({ estado, baja_fecha: estado === "Baja" ? today : null }).eq("id", id);
    setConfirm(null);
    cargar();
  };

  return (
    <div>
      <SectionHeader eyebrow="Alta y baja de personal" title="Usuarios"
        action={<PrimaryBtn onClick={() => setAbierto(!abierto)}>+ Nuevo usuario</PrimaryBtn>} />

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
                <option value="supervisor">Supervisora</option>
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

      {edit && (
        <form onSubmit={guardarEdicion} className="bg-white p-5 mb-6" style={{ border: `1px solid ${COLORS.line}`, borderLeft: `3px solid ${COLORS.forest}` }}>
          <div className="text-sm mb-3" style={{ color: COLORS.forest, fontWeight: 600 }}>Editar usuario</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nombre"><TextInput value={edit.nombre} onChange={(e) => setEdit({ ...edit, nombre: e.target.value })} /></Field>
            <Field label="Correo (no se puede cambiar aquí)"><TextInput value={edit.correo} disabled readOnly /></Field>
            <Field label="Fecha de ingreso (contratación)"><TextInput type="date" value={edit.ingreso_fecha} onChange={(e) => setEdit({ ...edit, ingreso_fecha: e.target.value })} /></Field>
            <Field label="Bono base"><TextInput type="number" value={edit.bono_base} onChange={(e) => setEdit({ ...edit, bono_base: e.target.value })} /></Field>
            <Field label="Rol">
              <select disabled={edit.id === yo.id} className="w-full px-3 py-2 text-sm disabled:opacity-60" style={{ border: `1px solid ${COLORS.line}`, background: "#FBFAF7" }}
                value={edit.rol} onChange={(e) => setEdit({ ...edit, rol: e.target.value })}>
                <option value="vendedora">Vendedora</option>
                <option value="supervisor">Supervisora</option>
                <option value="admin">Administradora</option>
              </select>
            </Field>
          </div>
          {edit.id === yo.id && <p className="text-xs mt-2" style={{ color: COLORS.muted }}>No puedes cambiar tu propio rol (así no te quedas sin acceso).</p>}
          {editErr && <p className="text-xs mt-2" style={{ color: COLORS.rust }}>{editErr}</p>}
          <div className="mt-4 flex gap-2">
            <PrimaryBtn type="submit" disabled={busy}>{busy ? "Guardando…" : "Guardar cambios"}</PrimaryBtn>
            <GhostBtn onClick={() => { setEdit(null); setEditErr(""); }}>Cancelar</GhostBtn>
          </div>
        </form>
      )}

      {loading ? <p className="text-sm" style={{ color: COLORS.muted }}>Cargando…</p> : (
        <LedgerTable
          columns={["Nombre", "Correo", "Rol", "Fecha de ingreso", "Período de pago actual", "Estado", ""]}
          rows={lista.map((u) => [
            u.nombre, u.correo, ROLES[u.rol] || u.rol, fmtY(u.ingreso_fecha),
            u.estado === "Activa" ? cicloLabel(cycleFor(u.ingreso_fecha, today)) : "—",
            u.estado === "Activa" ? <Tag tone="good">Activa</Tag> : <Tag tone="bad">Baja · {u.baja_fecha ? fmtY(u.baja_fecha) : ""}</Tag>,
            <span className="flex items-center gap-2 flex-wrap">
              <GhostBtn onClick={() => { setEditErr(""); setEdit({ id: u.id, nombre: u.nombre, correo: u.correo, ingreso_fecha: u.ingreso_fecha, bono_base: u.bono_base, rol: u.rol }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Editar</GhostBtn>
              {u.estado === "Activa" && SIGUIENTE[u.rol] && u.id !== yo.id && (
                subir === u.id
                  ? <span className="text-xs flex items-center gap-2">¿Subir a {ROLES[SIGUIENTE[u.rol]]}?
                      <button onClick={() => subirRol(u)} style={{ color: COLORS.forest, fontWeight: 600 }}>Sí</button>
                      <button onClick={() => setSubir(null)} style={{ color: COLORS.rust }}>No</button></span>
                  : <GhostBtn onClick={() => setSubir(u.id)}>↑ Subir a {ROLES[SIGUIENTE[u.rol]]}</GhostBtn>
              )}
              {u.estado === "Activa"
                ? (confirm === u.id
                  ? <span className="text-xs flex items-center gap-2">¿Confirmar?
                      <button onClick={() => cambiarEstado(u.id, "Baja")} style={{ color: COLORS.rust, fontWeight: 600 }}>Sí</button>
                      <button onClick={() => setConfirm(null)} style={{ color: COLORS.forest }}>No</button></span>
                  : u.id !== yo.id && <GhostBtn tone="rust" onClick={() => setConfirm(u.id)}>Dar de baja</GhostBtn>)
                : <GhostBtn onClick={() => cambiarEstado(u.id, "Activa")}>Reactivar</GhostBtn>}
            </span>,
          ])}
        />
      )}
      <p className="text-xs mt-4" style={{ color: COLORS.muted }}>Al dar de baja se conserva todo su historial; solo deja de poder iniciar sesión.</p>
    </div>
  );
}
