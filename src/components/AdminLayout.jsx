import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthProvider.jsx";
import { COLORS, slab } from "./ui.jsx";
import InstallButton from "./InstallButton.jsx";

const nav = [
  { to: "/admin", label: "Panel general", end: true },
  { to: "/admin/usuarios", label: "Usuarios", soloAdmin: true },
  { to: "/admin/asistencia", label: "Asistencia" },
  { to: "/admin/registro-app", label: "Registro en la APP" },
  { to: "/admin/facebook", label: "Cuentas Facebook" },
  { to: "/admin/pendientes", label: "Pendientes" },
  { to: "/admin/metas", label: "Metas" },
  { to: "/admin/puntos-mejora", label: "Puntos de mejora" },
  { to: "/admin/bonificaciones", label: "Bonificaciones", soloAdmin: true },
  { to: "/admin/auditoria", label: "Auditoría" },
  { to: "/admin/configuracion", label: "Configuración", soloAdmin: true },
];

export default function AdminLayout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const esAdmin = profile?.rol === "admin";
  const items = nav.filter((i) => esAdmin || !i.soloAdmin);

  const logout = async () => { await signOut(); navigate("/login"); };

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: COLORS.paper }}>
      <div className="flex md:hidden items-center justify-between px-4 py-3" style={{ background: COLORS.forest }}>
        <span style={{ color: COLORS.amber, fontFamily: slab, fontSize: 18, fontWeight: 700 }}>TiendaOps</span>
        <button onClick={() => setOpen(!open)} className="text-sm px-2 py-1" style={{ color: "#CFE2D9", border: "1px solid #CFE2D9" }}>Menú</button>
      </div>
      <div className={(open ? "flex" : "hidden") + " md:flex w-full md:w-56 shrink-0 py-6 px-4 flex-col"} style={{ background: COLORS.forest }}>
        <div className="px-2 mb-6 hidden md:block">
          <div style={{ color: COLORS.amber, fontFamily: slab, fontSize: 20, fontWeight: 700 }}>TiendaOps</div>
          <div className="text-xs mt-0.5" style={{ color: "#9FC2B4" }}>{esAdmin ? "Administradora" : "Supervisora"} · {profile?.nombre}</div>
        </div>
        <nav className="flex flex-col gap-0.5 flex-1">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setOpen(false)}
              className={({ isActive }) => "px-3 py-2 text-sm text-left"}
              style={({ isActive }) => ({ background: isActive ? "#264A40" : "transparent", color: isActive ? COLORS.amber : "#CFE2D9" })}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <InstallButton dark />
        <button onClick={logout} className="text-xs px-3 py-2 mt-2 text-left" style={{ color: "#CFE2D9", border: "1px solid #3E5A50" }}>
          Cerrar sesión
        </button>
      </div>
      <div className="flex-1 min-w-0 px-4 md:px-8 py-6 md:py-8">
        <Outlet />
      </div>
    </div>
  );
}
