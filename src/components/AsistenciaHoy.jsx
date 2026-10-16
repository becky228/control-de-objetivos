import React, { useEffect, useState } from "react";
import { Card, Tag, PrimaryBtn, COLORS, inputStyle } from "./ui.jsx";
import { supabase } from "../lib/supabase.js";
import { fetchMarcas, fetchHorario, cerrarSalidasOlvidadas, todayISO } from "../lib/api.js";
import { obtenerUbicacion, distanciaMetros } from "../lib/geo.js";
import { useBatch, ActualizarBtn } from "../context/PendingProvider.jsx";
import { MOTIVOS, HORARIO_DEFECTO, hm, mm, dur, turnoDe, esTardeEntrada, limiteTarde, marcasEf, finTurno, cierreAuto } from "../lib/horario.js";

const ahoraHHMM = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

// Asistencia de hoy de la vendedora: varias entradas y salidas durante el día (permisos).
// La hora real la pone el servidor al guardar la marca. El tiempo de cada marca solo se muestra HOY.
export default function AsistenciaHoy({ profile }) {
  const today = todayISO();
  const [marcas, setMarcas] = useState([]);
  const [horario, setHorario] = useState(HORARIO_DEFECTO);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [saliendo, setSaliendo] = useState(false);
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const b = useBatch({ key: "marcas_hoy", label: "Asistencia", table: "asistencia_marcas" });

  const cargar = async () => {
    await cerrarSalidasOlvidadas();
    const [m, h] = await Promise.all([fetchMarcas({ vid: profile.id, desde: today, hasta: today }), fetchHorario().catch(() => HORARIO_DEFECTO)]);
    setMarcas(m); setHorario(h);
  };
  useEffect(() => { cargar(); }, [profile.id, b.version]);

  // ubicación + si está dentro del rango de la tienda
  const ubicar = async (obligatoria) => {
    try {
      const { lat, lng } = await obtenerUbicacion();
      const { data: store } = await supabase.from("store_settings").select("*").eq("id", 1).single();
      let estado = "Dentro del rango";
      if (store?.lat != null && store?.lng != null) {
        estado = distanciaMetros(lat, lng, store.lat, store.lng) <= (store.radio_metros || 150) ? "Dentro del rango" : "Fuera del rango";
      }
      return { lat, lng, estado };
    } catch (e) {
      if (obligatoria) throw e;
      return null;
    }
  };

  const entrar = async () => {
    setBusy(true); setErr("");
    try {
      const u = await ubicar(true);
      const { error } = await supabase.from("asistencia_marcas").insert({
        user_id: profile.id, fecha: today, hora_entrada: ahoraHHMM(), // la hora real la pone el servidor
        gps_entrada: u.estado, lat_entrada: u.lat, lng_entrada: u.lng,
      });
      if (error) throw new Error(error.code === "23505" ? "Ya tienes una entrada abierta. Marca primero tu salida." : error.message);
      await cargar();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const salir = async (abiertaRaw) => {
    setBusy(true); setErr("");
    try {
      const u = await ubicar(false); // en la salida la ubicación es opcional
      const { error } = await supabase.from("asistencia_marcas").update({
        hora_salida: ahoraHHMM(), motivo, // la hora real la pone el servidor
        gps_salida: u?.estado ?? null, lat_salida: u?.lat ?? null, lng_salida: u?.lng ?? null,
      }).eq("id", abiertaRaw.id);
      if (error) throw error;
      setSaliendo(false);
      await cargar();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  // marcas con el motivo editado (pendiente) y el cierre automático aplicado
  const conMotivo = marcas.map((m) => ({ ...m, motivo: b.val(m, "motivo") }));
  const ef = marcasEf(horario, profile, today, conMotivo, today, ahoraHHMM());
  const abierta = ef.find((m) => !m.salida);
  const abiertaRaw = abierta && marcas.find((m) => m.id === abierta.id);
  const ult = ef[ef.length - 1];
  const turno = turnoDe(horario, profile);
  const tope = finTurno(horario, profile);
  const tarde = ef.length > 0 && esTardeEntrada(horario, profile, ef[0].entrada);
  const gpsHoy = marcas[0]?.gps_entrada;

  return (
    <Card style={{ marginBottom: 16 }}>
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <span className="text-sm" style={{ color: COLORS.forest, fontWeight: 600 }}>Asistencia de hoy</span>
        <div className="flex items-center gap-2">
          {gpsHoy ? <Tag tone={gpsHoy === "Dentro del rango" ? "good" : "warn"}>{gpsHoy}</Tag> : <Tag tone="bad">Sin registro</Tag>}
          <ActualizarBtn batch={b} />
        </div>
      </div>
      <div className="text-xs mb-3" style={{ color: COLORS.muted }}>
        Tu turno: <b>{turno.nombre}</b>{turno.tipo === "libre" ? " · vienes cuando puedes" : ` · ${turno.inicio} – ${turno.fin}`}
        {tarde && <span className="ml-2"><Tag tone="warn">Entraste después de las {limiteTarde(horario, profile)}</Tag></span>}
      </div>

      <div className="p-3 mb-3 text-sm" style={{ background: abierta ? "#E6F0E6" : ef.length ? "#FBEFD9" : "#F4F1EA", color: abierta ? "#2F5D3A" : ef.length ? "#8A5A00" : COLORS.muted }}>
        {abierta
          ? <>En la tienda desde las <b>{abierta.entrada}</b></>
          : ult ? <>Fuera de la tienda desde las <b>{ult.salida}</b>{ult.motivo ? ` · ${ult.motivo}` : ""}</> : "Todavía no marcaste tu entrada de hoy"}
      </div>

      <div className="flex gap-2 mb-1">
        <button onClick={entrar} disabled={busy || !!abierta} className="flex-1 py-2 text-sm disabled:opacity-40" style={{ background: COLORS.forest, color: "#fff" }}>
          {busy && !saliendo ? "Ubicando…" : ef.length ? "Volver a entrar" : "Marcar entrada"}
        </button>
        <button onClick={() => setSaliendo(!saliendo)} disabled={busy || !abiertaRaw} className="flex-1 py-2 text-sm disabled:opacity-40" style={{ background: "#fff", color: COLORS.forest, border: `1px solid ${COLORS.forest}` }}>
          Salir / pedir permiso
        </button>
      </div>
      {saliendo && abiertaRaw && (
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <select className="px-2 py-2 text-sm" style={inputStyle} value={motivo} onChange={(e) => setMotivo(e.target.value)}>{MOTIVOS.map((x) => <option key={x}>{x}</option>)}</select>
          <PrimaryBtn onClick={() => salir(abiertaRaw)} disabled={busy}>{busy ? "Guardando…" : "Confirmar salida"}</PrimaryBtn>
        </div>
      )}
      {err && <p className="text-xs mt-2" style={{ color: COLORS.rust }}>{err}</p>}
      <p className="text-xs mt-2" style={{ color: COLORS.muted }}>
        Cada entrada y salida se guarda al momento de marcarla (con tu ubicación y la hora del sistema). El motivo se puede cambiar y se guarda con "Actualizar". Si olvidas marcar tu salida, el sistema la cierra solo a las {mm(cierreAuto(horario, profile))}. El tiempo de cada marca solo se muestra durante el día de hoy.
      </p>

      {ef.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${COLORS.forest}`, color: COLORS.forest }}>
                <th className="text-left py-1.5">Entrada</th><th className="text-left py-1.5">Salida</th><th className="text-left py-1.5">Motivo</th><th className="text-right py-1.5">Tiempo</th>
              </tr>
            </thead>
            <tbody>
              {ef.map((m) => {
                const orig = marcas.find((x) => x.id === m.id);
                return (
                  <tr key={m.id} style={{ borderBottom: `1px solid ${COLORS.line}` }}>
                    <td className="py-1.5">{m.entrada}</td>
                    <td className="py-1.5">{m.salida ? <span className="whitespace-nowrap">{m.salida}{m.auto && <> <Tag tone="warn">automática</Tag></>}</span> : <Tag tone="good">en la tienda</Tag>}</td>
                    <td className="py-1.5">
                      {m.auto ? <span style={{ color: COLORS.muted }}>Cierre automático</span>
                        : m.salida
                          ? <select className="text-xs px-1 py-0.5" style={inputStyle} value={m.motivo || ""} onChange={(e) => b.setCampo(orig, "motivo", e.target.value || null)}>
                              <option value="">—</option>{MOTIVOS.map((x) => <option key={x}>{x}</option>)}
                            </select>
                          : "—"}
                    </td>
                    <td className="py-1.5 text-right">{m.salida ? dur(Math.max(0, Math.min(hm(m.salida), tope) - Math.min(hm(m.entrada), tope))) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
