import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthProvider.jsx";
import { COLORS, slab } from "./ui.jsx";
import InstallButton from "./InstallButton.jsx";

const nav = [
  { to: "/vendedora", label: "Inicio", end: true },
  { to: "/vendedora/facebook", label: "Facebook" },
  { to: "/vendedora/metas", label: "Metas" },
  { to: "/vendedora/puntos", label: "Puntos" },
  { to: "/vendedora/bono", label: "Bono" },
];

export default function VendedoraLayout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const logout = async () => { await signOut(); navigate("/login"); };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: COLORS.paper }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ background: "#fff", borderBottom: `1px solid ${COLORS.line}` }}>
        <span style={{ color: COLORS.forest, fontFamily: slab, fontSize: 18, fontWeight: 700 }}>TiendaOps</span>
        <div className="flex items-center gap-2">
          <InstallButton />
          <button onClick={logout} className="text-xs px-2 py-1" style={{ color: COLORS.forest, border: `1px solid ${COLORS.forest}` }}>Salir</button>
        </div>
      </div>
      <div className="flex-1 max-w-lg w-full mx-auto px-4 pb-24 pt-4">
        <Outlet />
      </div>
      <nav className="fixed bottom-0 left-0 right-0 flex justify-around py-2" style={{ background: "#fff", borderTop: `1px solid ${COLORS.line}` }}>
        {nav.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end}
            className="text-xs px-2 py-1 flex-1 text-center"
            style={({ isActive }) => ({ color: isActive ? COLORS.forest : COLORS.muted, fontWeight: isActive ? 700 : 400 })}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
