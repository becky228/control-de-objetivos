import React, { useEffect, useState } from "react";
import { SectionHeader, Card, Tag, PrimaryBtn, Prog, NumIn, COLORS, slab } from "../../components/ui.jsx";
import { useAuth } from "../../context/AuthProvider.jsx";
import { useBatch, ActualizarBtn } from "../../context/PendingProvider.jsx";
import { fetchRegistroApp, fetchMetasGlobales, weekArrayFromRows, todayISO, currentWeekStart } from "../../lib/api.js";
import { dow, monthRange, fmtY } from "../../lib/dates.js";

// "Registro en la APP": aquí la vendedora llena lo que ejecutó hoy (productos registrados en la app de inventario).
// Puede registrar y editar HOY; a las 11:59 pm el día se cierra y solo la administradora puede corregirlo.
export default function RegistroApp() {
  const { profile } = useAuth();
  const today = todayISO();
  const [rows, setRows] = useState([]);
  const [metasG, setMetasG] = useState([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(false);
  const [nuevo, setNuevo] = useState("");
  const b = useBatch({ key: "app_vend", label: "Registro APP", table: "registro_app" });

  const cargar = async () => {
    const [r, mg] = await Promise.all([fetchRegistroApp({ vid: profile.id }), fetchMetasGlobales([profile.id])]);
    setRows(r); setMetasG(mg); setLoading(false);
  };
  useEffect(() => { cargar(); }, [profile.id, b.version]);

  if (loading) return <p className="text-sm" style={{ color: COLORS.muted }}>Cargando…</p>;

  const metaDe = (fecha) => (dow(fecha) === 6 ? 0 : weekArrayFromRows(metasG.filter((m) => m.variable === "app"), currentWeekStart(fecha))[dow(fecha)] || 0);
  const hoy = rows.find((r) => r.fecha === today);
  const pendienteHoy = b.adds.find((a) => a.fecha === today);
  const cantidadHoy = hoy ? Number(b.val(hoy, "cantidad")) || 0 : pendienteHoy ? pendienteHoy.cantidad : 0;
  const [ms] = monthRange(today.slice(0, 7));
  const hist = rows.filter((r) => r.fecha >= ms && r.fecha < today).sort((a, c) => (a.fecha < c.fecha ? 1 : -1)).slice(0, 7);

  const registrar = () => {
    if (nuevo === "") return;
    b.addRow({ user_id: profile.id, fecha: today, cantidad: Number(nuevo) });
    setNuevo("");
  };

  return (
    <div>
      <SectionHeader eyebrow="Lo que ejecutaste hoy" title="Registro en la APP" action={<Tag tone="good">Hoy: {cantidadHoy}</Tag>} />
      <Card style={{ marginBottom: 16 }}>
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <div className="text-xs" style={{ color: COLORS.muted }}>Productos que registraste hoy en la app de control de inventario · Meta de hoy: <b>{metaDe(today)}</b></div>
          <ActualizarBtn batch={b} />
        </div>

        {!hoy && !pendienteHoy ? (
          <div className="flex items-center gap-2 flex-wrap">
            <NumIn w={90} value={nuevo} onChange={setNuevo} />
            <PrimaryBtn onClick={registrar}>Registrar</PrimaryBtn>
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            {pendienteHoy
              ? <>
                  <span style={{ fontFamily: slab, fontSize: 28, fontWeight: 700, color: COLORS.forest }}>{pendienteHoy.cantidad}</span>
                  <Tag tone="warn">sin guardar</Tag>
                  <button className="text-xs" style={{ color: COLORS.rust }} onClick={() => b.removeAdd(pendienteHoy._tmp)}>Quitar</button>
                </>
              : <>
                  {edit
                    ? <NumIn w={90} value={b.val(hoy, "cantidad")} onChange={(x) => b.setCampo(hoy, "cantidad", x === "" ? 0 : Number(x))} />
                    : <span style={{ fontFamily: slab, fontSize: 28, fontWeight: 700, color: COLORS.forest }}>{b.val(hoy, "cantidad")}</span>}
                  <div className="flex-1" style={{ minWidth: 140 }}><Prog hecho={cantidadHoy} meta={metaDe(today)} /></div>
                  <button onClick={() => setEdit(!edit)} className="text-xs" style={{ color: COLORS.forest, fontWeight: edit ? 600 : 400 }}>{edit ? "✓ Listo" : "✎ Editar"}</button>
                </>}
          </div>
        )}
        <p className="text-xs mt-3" style={{ color: COLORS.muted }}>
          Escribe cuántos productos registraste hoy en la app. Puedes editarlo hasta las 11:59 pm; después el día se cierra (🔒) y solo la administradora puede corregirlo. Presiona "Actualizar" para guardar.
        </p>
      </Card>

      {hist.length > 0 && (
        <Card>
          <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${COLORS.forest}`, color: COLORS.forest }}>
                <th className="text-left py-1.5">Día</th><th className="text-right py-1.5">Registrados</th><th className="text-right py-1.5">Meta</th><th className="text-right py-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {hist.map((a) => (
                <tr key={a.id} style={{ borderBottom: `1px solid ${COLORS.line}` }}>
                  <td className="py-1.5">{fmtY(a.fecha)}</td>
                  <td className="py-1.5 text-right">{a.cantidad}</td>
                  <td className="py-1.5 text-right">{metaDe(a.fecha) || "·"}</td>
                  <td className="py-1.5 text-right" style={{ color: COLORS.muted }}>🔒 cerrado</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
