import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthProvider.jsx";

// rol: "admin" | "vendedora" | undefined (cualquiera con sesión)
export default function ProtectedRoute({ rol, children }) {
  const { session, profile, loading } = useAuth();

  if (loading) return <FullscreenMsg text="Cargando…" />;
  if (!session) return <Navigate to="/login" replace />;
  if (!profile) return <FullscreenMsg text="Cargando tu perfil…" />;
  if (profile.estado !== "Activa") return <FullscreenMsg text="Tu usuario está dado de baja. Contacta a tu administradora." />;
  if (rol && profile.rol !== rol) {
    return <Navigate to={profile.rol === "admin" ? "/admin" : "/vendedora"} replace />;
  }
  return children;
}

function FullscreenMsg({ text }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#EDEAE3", color: "#16342C", fontFamily: "Inter, sans-serif" }}>
      {text}
    </div>
  );
}
