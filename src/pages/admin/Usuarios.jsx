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
  const [verPass, setVerPass] = useState(false);
  const [msgPass, setMsgPass] = useState("");
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

  const generar = () => {
    const abc = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = crypto.getRandomValues(new Uint32Array(9));
    const p = Array.from(bytes, (n) => abc[n % abc.length]).join("");
    setEdit({ ...edit, pass: p }); setVerPass(true);
  };

  const guardarEdicion = async (e) => {
    e.preventDefault();
    setBusy(true); setEditErr("");
    try {
      const orig = lista.find((x) => x.id === edit.id);
      if (edit.pass && edit.pass.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres.");
      if (!edit.correo.trim()) throw new Error("El correo no puede quedar vacío.");
      const cambios = { nombre: edit.nombre.trim(), ingreso_fecha: edit.ingreso_fecha, bono_base: Number(edit.bono_base) || 0 };
      if (edit.id !== yo.id) cambios.rol = edit.rol; // no te puedes quitar tu propio rol
      const { error } = await supabase.from("profiles").update(cambios).eq("id", edit.id);
      if (error) throw error;

      // correo y/o contraseña (solo la administradora, desde una función segura de la base de datos)
      const correoNuevo = edit.correo.trim().toLowerCase();
      const cambiaCorreo = correoNuevo !== (orig?.correo || "").toLowerCase();
      if (cambiaCorreo || edit.pass) {
        const { error: e2 } = await supabase.rpc("admin_update_credentials", {
          uid: edit.id, new_email: cambiaCorreo ? correoNuevo : null, new_password: edit.pass || null,
        });
        if (e2) throw e2;
      }

      // estado (baja / reactivar): bloquea o permite el inicio de sesión; los datos se conservan
      if (edit.id !== yo.id && (edit.estado !== orig?.estado || (edit.estado === "Baja" && edit.baja_fecha !== orig?.baja_fecha))) {
        const { error: e3 } = await supabase.rpc("admin_set_baja", {
          uid: edit.id, baja: edit.estado === "Baja", fecha: edit.estado === "Baja" ? (edit.baja_fecha || today) : null,
        });
        if (e3) throw e3;
      }

      if (edit.pass) setMsgPass(`Contraseña nueva de ${edit.nombre}: ${edit.pass}  — anótala y entrégasela; después ya no se puede ver.`);
      setEdit(null); setVerPass(false);
      await cargar();
    } catch (e4) {
      setEditErr(e4.message || "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  };

  const subirRol = async (u) => {
    const nuevo = SIGUIENTE[u.rol];
    if (!nuevo) return;
    await supabase.from("profiles").update({ rol: nuevo }).eq("id", u.id);
    setSubir(null);
    cargar();
  };

  const cambiarEstado = async (id, estado) => {
    // marca la baja y bloquea el inicio de sesión; los datos que subió se conservan
    await supabase.rpc("admin_set_baja", { uid: id, baja: estado === "Baja", fecha: estado === "Baja" ? today : null });
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

      {msgPass && (
        <div className="p-3 mb-4 text-sm flex items-start justify-between gap-3" style={{ background: "#E6F0E6", border: "1px solid #B9D3B9", color: "#2F5D3A" }}>
          <span>🔑 {msgPass}</span>
          <button onClick={() => setMsgPass("")} className="text-xs underline">Cerrar</button>
        </div>
      )}
      {edit && (
        <form onSubmit={guardarEdicion} className="bg-white p-5 mb-6" style={{ border: `1px solid ${COLORS.line}`, borderLeft: `3px solid ${COLORS.forest}` }}>
          <div className="text-sm mb-3" style={{ color: COLORS.forest, fontWeight: 600 }}>Editar usuario</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nombre"><TextInput value={edit.nombre} onChange={(e) => setEdit({ ...edit, nombre: e.target.value })} /></Field>
            <Field label="Correo (con el que inicia sesión)"><TextInput type="email" value={edit.correo} onChange={(e) => setEdit({ ...edit, correo: e.target.value })} /></Field>
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
            <Field label="Estado">
              <select disabled={edit.id === yo.id} className="w-full px-3 py-2 text-sm disabled:opacity-60" style={{ border: `1px solid ${COLORS.line}`, background: "#FBFAF7" }}
                value={edit.estado} onChange={(e) => setEdit({ ...edit, estado: e.target.value, baja_fecha: e.target.value === "Baja" ? (edit.baja_fecha || today) : null })}>
                <option value="Activa">Activa</option>
                <option value="Baja">Baja</option>
              </select>
            </Field>
            <Field label="Fecha de baja"><TextInput type="date" disabled={edit.estado !== "Baja"} value={edit.baja_fecha || ""} onChange={(e) => setEdit({ ...edit, baja_fecha: e.target.value })} /></Field>
            <div className="md:col-span-2">
              <Field label="Contraseña">
                <div className="flex gap-2 items-center flex-wrap">
                  <TextInput type={verPass ? "text" : "password"} placeholder="Escribe una nueva o genérala (vacío = no cambiar)" style={{ minWidth: 240, flex: 1 }} value={edit.pass || ""} onChange={(e) => setEdit({ ...edit, pass: e.target.value })} />
                  <GhostBtn onClick={() => setVerPass(!verPass)}>{verPass ? "Ocultar" : "Mostrar"}</GhostBtn>
                  <GhostBtn onClick={generar}>Generar</GhostBtn>
                </div>
              </Field>
              <p className="text-xs" style={{ color: COLORS.muted }}>La contraseña actual no se puede ver: se guarda cifrada y nadie puede leerla. Sí puedes poner una nueva; al guardar se muestra una vez para que se la entregues.</p>
            </div>
          </div>
          {edit.estado === "Baja" && <p className="text-xs mt-3" style={{ color: "#8A5A00" }}>En baja: ya no puede iniciar sesión, pero todo lo que subió (asistencia, registros, Facebook, puntos, metas) se conserva y sigue visible para ti.</p>}
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
              <GhostBtn onClick={() => { setEditErr(""); setEdit({ id: u.id, nombre: u.nombre, correo: u.correo, ingreso_fecha: u.ingreso_fecha, bono_base: u.bono_base, rol: u.rol, estado: u.estado, baja_fecha: u.baja_fecha, pass: "" }); setVerPass(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Editar</GhostBtn>
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
      <p className="text-xs mt-4" style={{ color: COLORS.muted }}>No existe "eliminar usuario": solo "Dar de baja". Así se conserva todo su historial (asistencia, registros, Facebook, puntos y metas) y solo deja de poder iniciar sesión.</p>
    </div>
  );
}
