import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthProvider.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AdminLayout from "./components/AdminLayout.jsx";
import VendedoraLayout from "./components/VendedoraLayout.jsx";
import Login from "./pages/Login.jsx";

import AdminDashboard from "./pages/admin/Dashboard.jsx";
import AdminUsuarios from "./pages/admin/Usuarios.jsx";
import AdminAsistencia from "./pages/admin/Asistencia.jsx";
import AdminRegistroApp from "./pages/admin/RegistroApp.jsx";
import AdminFacebook from "./pages/admin/Facebook.jsx";
import AdminPendientes from "./pages/admin/Pendientes.jsx";
import AdminMetas from "./pages/admin/Metas.jsx";
import AdminPuntos from "./pages/admin/PuntosMejora.jsx";
import AdminBonos from "./pages/admin/Bonificaciones.jsx";
import AdminAuditoria from "./pages/admin/Auditoria.jsx";
import AdminConfiguracion from "./pages/admin/Configuracion.jsx";

import VendedoraInicio from "./pages/vendedora/Inicio.jsx";
import VendedoraFacebook from "./pages/vendedora/Facebook.jsx";
import VendedoraMetas from "./pages/vendedora/Metas.jsx";
import VendedoraPuntos from "./pages/vendedora/PuntosMejora.jsx";
import VendedoraBono from "./pages/vendedora/Bono.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/admin" element={<ProtectedRoute rol={["admin", "supervisor"]}><AdminLayout /></ProtectedRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="usuarios" element={<ProtectedRoute rol="admin"><AdminUsuarios /></ProtectedRoute>} />
            <Route path="asistencia" element={<AdminAsistencia />} />
            <Route path="registro-app" element={<AdminRegistroApp />} />
            <Route path="facebook" element={<AdminFacebook />} />
            <Route path="pendientes" element={<AdminPendientes />} />
            <Route path="metas" element={<AdminMetas />} />
            <Route path="puntos-mejora" element={<AdminPuntos />} />
            <Route path="bonificaciones" element={<ProtectedRoute rol="admin"><AdminBonos /></ProtectedRoute>} />
            <Route path="auditoria" element={<AdminAuditoria />} />
            <Route path="configuracion" element={<ProtectedRoute rol="admin"><AdminConfiguracion /></ProtectedRoute>} />
          </Route>

          <Route path="/vendedora" element={<ProtectedRoute rol="vendedora"><VendedoraLayout /></ProtectedRoute>}>
            <Route index element={<VendedoraInicio />} />
            <Route path="facebook" element={<VendedoraFacebook />} />
            <Route path="metas" element={<VendedoraMetas />} />
            <Route path="puntos" element={<VendedoraPuntos />} />
            <Route path="bono" element={<VendedoraBono />} />
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
