import React, { useEffect, useState } from "react";
import { Card, CardTitle, Tag, PrimaryBtn, Prog, Locked, COLORS, slab } from "../../components/ui.jsx";
import DayGrid from "../../components/DayGrid.jsx";
import { useAuth } from "../../context/AuthProvider.jsx";
import { supabase } from "../../lib/supabase.js";
import { fetchMetasGlobales, fetchFbLog, fetchRegistroApp, fetchVisibilidad, weekArrayFromRows, todayISO, currentWeekStart } from "../../lib/api.js";
import { metaRango, hechoCopy, hechoApp } from "../../lib/bono.js";
import { obtenerUbicacion, distanciaMetros } from "../../lib/geo.js";
import { addDays, monthRange, fmtY } from "../../lib/dates.js";

export default function Inicio() {
  const { profile } = useAuth();
  const today = todayISO();
  const [asistHoy, setAsistHoy] = useState(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsErr, setGpsErr] = useState("");
  const [metasG, setMetasG] = useState([]);
  const [fbLog, setFbLog] = useState([]);
  const [appLog, setAppLog] = useState([]);
  const [vis, setVis] = useState({});
  const [loading, setLoading] = useState(true);

  const cargar = async () => {
    setLoading(true);
    const { data: a } = await supabase.from("attendance").select("*").eq("user_id", profile.id).eq("fecha", today).maybeSingle();
    const [mg, fb, app, v] = await Promise.all([fetchMetasGlobales([profile.id]), fetchFbLog({ vid: profile.id }), fetchRegistroApp({ vid: profile.id }), fetchVisibilidad()]);
    setAsistHoy(a); setMetasG(mg); setFbLog(fb); setAppLog(app); setVis(v);
    setLoading(false);
  };
  useEffect(() => { cargar(); }, [profile.id]);

  const checkin = async () => {
    setGpsBusy(true); setGpsErr("");
    try {
      const { lat, lng } = await obtenerUbicacion();
      const { data: store } = await supabase.from("store_settings").select("*").eq("id", 1).single();
      let gps_estado = "Dentro del rango";
      if (store.lat != null && store.lng != null) {
        const d = distanciaMetros(lat, lng, store.lat, store.lng);
        gps_estado = d <= (store.radio_metros || 150) ? "Dentro del rango" : "Fuera del rango";
      }
      const hora = new Date().toTimeString().slice(0, 5);
      await supabase.from("attendance").upsert({ user_id: profile.id, fecha: today, hora_entrada: hora, lat, lng, gps_estado }, { onConflict: "user_id,fecha" });
      cargar();
    } catch (e) {
      setGpsErr(e.message);
    } finally {
      setGpsBusy(false);
    }
  };
  const checkout = async () => {
    const hora = new Date().toTimeString().slice(0, 5);
    await supabase.from("attendance").update({ hora_salida: hora }).eq("user_id", profile.id).eq("fecha", today);
    cargar();
  };

  if (loading) return <p className="text-sm" style={{ color: COLORS.muted }}>Cargando…</p>;

  const weekStart = currentWeekStart(today);
  const [ms] = monthRange(today.slice(0, 7));
  const arrCopy = weekArrayFromRows(metasG.filter((m) => m.variable === "copy"), weekStart);
  const arrApp = weekArrayFromRows(metasG.filter((m) => m.variable === "app"), weekStart);
  const hechoDia = (fecha) => hechoCopy(fbLog, profile.id, fecha, fecha);
  const hechoDiaApp = (fecha) => hechoApp(appLog, profile.id, fecha, fecha);

  return (
    <div>
      <div className="mb-4">
        <div className="text-xs" style={{ color: COLORS.muted }}>Hoy · {fmtY(today)} · Ingreso: {fmtY(profile.ingreso_fecha)}</div>
        <h1 style={{ fontFamily: slab, fontSize: 24, color: COLORS.forest, fontWeight: 600 }}>Hola, {profile.nombre?.split(" ")[0]}</h1>
      </div>

      <div className="p-3 mb-4 text-xs flex items-center gap-2" style={{ background: "#FBEFD9", border: "1px solid #EFCB86", color: "#8A5A00" }}>
        ⏰ Puedes registrar y editar tus avances de hoy hasta las 00:00. Después solo tu administradora puede modificarlos.
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm" style={{ color: COLORS.forest, fontWeight: 600 }}>Asistencia de hoy</span>
          {asistHoy ? <Tag tone={asistHoy.gps_estado === "Dentro del rango" ? "good" : "warn"}>{asistHoy.gps_estado}</Tag> : <Tag tone="bad">Sin registro</Tag>}
        </div>
        <div className="flex gap-2">
          <PrimaryBtn onClick={checkin} disabled={gpsBusy}>{gpsBusy ? "Ubicando…" : asistHoy ? `Check-in · ${asistHoy.hora_entrada}` : "Check-in"}</PrimaryBtn>
          <button onClick={checkout} disabled={!asistHoy} className="flex-1 py-2 text-sm disabled:opacity-50" style={{ background: "#fff", color: COLORS.forest, border: `1px solid ${COLORS.forest}` }}>
            {asistHoy?.hora_salida ? `Check-out · ${asistHoy.hora_salida}` : "Check-out"}
          </button>
        </div>
        {gpsErr && <p className="text-xs mt-2" style={{ color: COLORS.rust }}>{gpsErr}</p>}
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <CardTitle>Mis objetivos de la semana</CardTitle>
        <DayGrid totalLabel="TOTAL"
          rows={[
            { label: "Copy", arr: [0, 1, 2, 3, 4, 5, 6].map((i) => hechoDia(addDays(weekStart, i))) },
          ]}
        />
        <div className="mt-2 text-xs" style={{ color: COLORS.muted }}>Meta Copy semana: {arrCopy.reduce((a, b) => a + b, 0)} · Meta App semana: {arrApp.reduce((a, b) => a + b, 0)}</div>
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: COLORS.muted }}>Copy · mes (a la fecha)</span>
            <Prog hecho={hechoCopy(fbLog, profile.id, ms, today)} meta={metaRango(metasG, profile.id, "copy", ms, today)} />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: COLORS.muted }}>App · mes (a la fecha)</span>
            <Prog hecho={hechoApp(appLog, profile.id, ms, today)} meta={metaRango(metasG, profile.id, "app", ms, today)} />
          </div>
        </div>
      </Card>

      {vis.pendientes === "todas" ? (
        <Card style={{ marginBottom: 16 }}>
          <CardTitle>Mis pendientes del mes</CardTitle>
          <div className="flex gap-6 flex-wrap">
            <div><div style={{ fontFamily: slab, fontSize: 22, color: COLORS.forest, fontWeight: 600 }}>{hechoCopy(fbLog, profile.id, ms, today)}</div><div className="text-xs" style={{ color: COLORS.muted }}>Copys</div></div>
            <div><div style={{ fontFamily: slab, fontSize: 22, color: COLORS.amber, fontWeight: 600 }}>{Math.max(0, metaRango(metasG, profile.id, "copy", ms, today) - hechoCopy(fbLog, profile.id, ms, today))}</div><div className="text-xs" style={{ color: COLORS.muted }}>Pendiente copy</div></div>
            <div><div style={{ fontFamily: slab, fontSize: 22, color: COLORS.amber, fontWeight: 600 }}>{Math.max(0, metaRango(metasG, profile.id, "app", ms, today) - hechoApp(appLog, profile.id, ms, today))}</div><div className="text-xs" style={{ color: COLORS.muted }}>Pendiente App</div></div>
          </div>
        </Card>
      ) : <Locked label="Pendientes" />}
    </div>
  );
}
