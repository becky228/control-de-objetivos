import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthProvider.jsx";
import { COLORS, slab } from "../components/ui.jsx";
import { homeDe } from "../components/ProtectedRoute.jsx";

export default function Login() {
  const { session, profile, signIn } = useAuth();
  const [correo, setCorreo] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  if (session && profile) return <Navigate to={homeDe(profile.rol)} replace />;

  const entrar = async (e) => {
    e.preventDefault();
    setBusy(true); setErr("");
    const { error } = await signIn(correo.trim(), pass);
    if (error) setErr("Correo o contraseña incorrectos.");
    setBusy(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-16 px-4" style={{ background: COLORS.paper }}>
      <form onSubmit={entrar} className="w-full max-w-sm px-8 py-10" style={{ background: "#fff", border: `1px solid ${COLORS.line}` }}>
        <div className="mb-8">
          <div className="w-9 h-9 flex items-center justify-center mb-4" style={{ background: COLORS.forest }}>
            <span style={{ color: COLORS.amber, fontFamily: slab, fontWeight: 700 }}>T</span>
          </div>
          <h1 style={{ fontFamily: slab, color: COLORS.forest, fontSize: 26, fontWeight: 600 }}>TiendaOps</h1>
          <p className="text-sm mt-1" style={{ color: "#6B6858" }}>Ingresa con tu correo y contraseña.</p>
        </div>
        <label className="block text-xs mb-1" style={{ color: "#6B6858" }}>Correo</label>
        <input className="w-full mb-4 px-3 py-2 text-sm" style={{ border: `1px solid ${COLORS.line}`, background: "#FBFAF7" }}
          value={correo} onChange={(e) => setCorreo(e.target.value)} type="email" required autoFocus />
        <label className="block text-xs mb-1" style={{ color: "#6B6858" }}>Contraseña</label>
        <input className="w-full mb-2 px-3 py-2 text-sm" type="password" style={{ border: `1px solid ${COLORS.line}`, background: "#FBFAF7" }}
          value={pass} onChange={(e) => setPass(e.target.value)} required />
        {err && <p className="text-xs mb-3" style={{ color: COLORS.rust }}>{err}</p>}
        <button disabled={busy} type="submit" className="w-full py-2.5 text-sm mt-3 disabled:opacity-60" style={{ background: COLORS.forest, color: "#fff" }}>
          {busy ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
