import React, { useEffect, useState } from "react";
import { SectionHeader, Field, TextInput, SaveBtn, Tag, LedgerTable, NumIn, COLORS, inputStyle } from "../../components/ui.jsx";
import { supabase } from "../../lib/supabase.js";
import { fetchVisibilidad, fetchVendedoras, fetchHorario } from "../../lib/api.js";
import { obtenerUbicacion } from "../../lib/geo.js";
import { dur, hm, mm } from "../../lib/horario.js";
import { DAYS } from "../../lib/dates.js";

const OPCIONES_VIS = [
  { k: "asistencia", label: "Asistencia (detalle propio)" },
  { k: "pendientes", label: "Pendientes" },
  { k: "bono", label: "Bono / bonificaciones" },
  { k: "descuento", label: "Descuento en puntos de mejora" },
];
const esNuevo = (id) => typeof id === "string";

export default function Configuracion() {
  const [store, setStore] = useState(null);
  const [vis, setVis] = useState({});
  const [horario, setHorario] = useState(null);
  const [quitados, setQuitados] = useState([]);   // turnos eliminados (se borran al actualizar)
  const [vend, setVend] = useState([]);           // vendedoras con su turno y tarifa
  const [origVend, setOrigVend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gpsMsg, setGpsMsg] = useState("");

  const cargar = async () => {
    const { data } = await supabase.from("store_settings").select("*").eq("id", 1).single();
    const [v, h, vs] = await Promise.all([fetchVisibilidad(), fetchHorario(), fetchVendedoras()]);
    setStore(data); setVis(v); setHorario(h); setQuitados([]);
    setVend(vs.filter((x) => x.estado === "Activa").map((x) => ({ id: x.id, nombre: x.nombre, turno_id: x.turno_id ?? null, tarifa_hora: Number(x.tarifa_hora) || 0 })));
    setOrigVend(vs.map((x) => ({ id: x.id, turno_id: x.turno_id ?? null, tarifa_hora: Number(x.tarifa_hora) || 0 })));
    setLoading(false);
  };
  useEffect(() => { cargar(); }, []);

  if (loading || !store || !horario) return <p className="text-sm" style={{ color: COLORS.muted }}>Cargando…</p>;

  const H = horario;
  const setH = (fn) => setHorario((h) => fn(h));
  const updTurno = (id, patch) => setH((h) => ({ ...h, turnos: h.turnos.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  const addTurno = (tipo) => setH((h) => ({ ...h, turnos: [...h.turnos, tipo === "libre"
    ? { id: "n" + Date.now(), nombre: "Libre · pago por hora", tipo: "libre", inicio: "", fin: "19:00" }
    : { id: "n" + Date.now(), nombre: "Nuevo turno", tipo: "fijo", inicio: "09:00", fin: "13:00" }] }));
  const delTurno = (id) => { setH((h) => ({ ...h, turnos: h.turnos.filter((t) => t.id !== id) })); if (!esNuevo(id)) setQuitados((q) => [...q, id]); };
  const turnoDeV = (u) => H.turnos.find((t) => t.id === (u.turno_id ?? H.defecto)) || H.turnos[0];
  const asignadas = (id) => vend.filter((u) => (u.turno_id ?? H.defecto) === id).length;
  const setUsr = (id, patch) => setVend((l) => l.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  const principal = H.turnos.find((t) => t.id === H.defecto) || H.turnos[0];

  const usarMiUbicacion = async () => {
    setGpsMsg("Obteniendo ubicación…");
    try {
      const { lat, lng } = await obtenerUbicacion();
      setStore((s) => ({ ...s, lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) }));
      setGpsMsg("Listo. Presiona \"Actualizar\" para guardarla.");
    } catch (e) { setGpsMsg(e.message); }
  };

  const guardar = async () => {
    const num = (x) => (x === "" || x == null ? null : Number(x));
    // ubicación + visibilidad
    await supabase.from("store_settings").update({ lat: num(store.lat), lng: num(store.lng), radio_metros: num(store.radio_metros) ?? 150 }).eq("id", 1);
    await Promise.all(Object.entries(vis).map(([k, v]) => supabase.from("visibilidad_config").update({ valor: v }).eq("clave", k)));

    // turnos: crear los nuevos, actualizar los existentes
    const mapa = {};
    for (const t of H.turnos) {
      const fila = { nombre: t.nombre.trim() || "Turno", tipo: t.tipo, hora_inicio: t.tipo === "libre" ? null : (t.inicio || "09:00"), hora_fin: t.fin || "19:00" };
      if (esNuevo(t.id)) {
        const { data, error } = await supabase.from("turnos").insert(fila).select("id").single();
        if (error) throw error;
        mapa[t.id] = data.id;
      } else {
        const { error } = await supabase.from("turnos").update(fila).eq("id", t.id);
        if (error) throw error;
      }
    }
    const real = (id) => (id == null ? null : (mapa[id] ?? id));
    await supabase.from("horario_config").update({ tolerancia_min: Number(H.tolerancia) || 0, cierre_min: Number(H.cierreMin) || 0, turno_defecto: real(H.defecto) }).eq("id", 1);

    // turno y tarifa de cada vendedora
    for (const u of vend) {
      const o = origVend.find((x) => x.id === u.id);
      if (!o || o.turno_id !== u.turno_id || o.tarifa_hora !== Number(u.tarifa_hora)) {
        const { error } = await supabase.from("profiles").update({ turno_id: real(u.turno_id), tarifa_hora: Number(u.tarifa_hora) || 0 }).eq("id", u.id);
        if (error) throw error;
      }
    }
    // turnos quitados (ya sin vendedoras)
    for (const id of quitados) await supabase.from("turnos").delete().eq("id", id);
    await cargar();
  };

  const sinUbic = store.lat == null || store.lat === "" || store.lng == null || store.lng === "";

  return (
    <div>
      <SectionHeader eyebrow="Horario de trabajo, turnos, ubicación de la tienda y visibilidad" title="Configuración" action={<SaveBtn onSave={guardar} label="Actualizar" />} />

      <div className="bg-white p-5 mb-8" style={{ border: `1px solid ${COLORS.line}` }}>
        <div className="text-sm mb-1" style={{ color: COLORS.forest, fontWeight: 600 }}>Horario de trabajo</div>
        <p className="text-xs mb-4" style={{ color: COLORS.muted }}>Define a qué hora entran y salen. Se usa para saber si llegaron tarde y cuántas horas trabajaron. Puedes crear turnos (por ejemplo medio tiempo) y asignarlos a cada vendedora.</p>

        <div className="flex items-end gap-4 flex-wrap mb-4">
          <div>
            <div className="text-xs mb-1" style={{ color: COLORS.muted }}>Días laborables</div>
            <div className="flex gap-1">
              {DAYS.map((d) => <span key={d} className="text-xs px-2 py-1" style={{ background: COLORS.forest, color: "#fff" }}>{d}</span>)}
              <span className="text-xs px-2 py-1" style={{ color: COLORS.muted, border: `1px dashed ${COLORS.line}` }}>Dom (opcional)</span>
            </div>
          </div>
          <Field label="Tolerancia de entrada (min)"><NumIn w={60} value={H.tolerancia} onChange={(x) => setH((h) => ({ ...h, tolerancia: x === "" ? 0 : Number(x) }))} /></Field>
          <Field label="Cierre automático de salida (min después de la salida del turno)"><NumIn w={60} value={H.cierreMin} onChange={(x) => setH((h) => ({ ...h, cierreMin: x === "" ? 0 : Number(x) }))} /></Field>
          <Field label="Turno por defecto">
            <select className="px-2 py-2 text-sm" style={inputStyle} value={H.defecto ?? ""} onChange={(e) => setH((h) => ({ ...h, defecto: esNuevo(e.target.value) || Number.isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value) }))}>
              {H.turnos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
          </Field>
        </div>

        <LedgerTable
          columns={["Turno", "Tipo", "Entrada", "Salida / tope", "Duración", "Hora límite (con tolerancia)", "Cierre automático", "Asignadas", ""]}
          rows={H.turnos.map((t) => {
            const libre = t.tipo === "libre";
            const enUso = t.id === H.defecto || asignadas(t.id) > 0;
            return [
              <input className="text-sm px-2 py-1" style={{ ...inputStyle, minWidth: 190 }} value={t.nombre} onChange={(e) => updTurno(t.id, { nombre: e.target.value })} />,
              <select className="text-sm px-1 py-0.5" style={inputStyle} value={t.tipo} onChange={(e) => updTurno(t.id, { tipo: e.target.value, ...(e.target.value === "fijo" && !t.inicio ? { inicio: "09:00" } : {}) })}>
                <option value="fijo">Horario fijo</option><option value="libre">Libre (por horas)</option>
              </select>,
              libre ? "—" : <input type="time" className="text-sm px-1 py-0.5" style={{ ...inputStyle, width: 100 }} value={t.inicio} onChange={(e) => updTurno(t.id, { inicio: e.target.value })} />,
              <input type="time" title={libre ? "Hora tope: no se cuentan horas después" : "Hora de salida del turno"} className="text-sm px-1 py-0.5" style={{ ...inputStyle, width: 100 }} value={t.fin} onChange={(e) => updTurno(t.id, { fin: e.target.value })} />,
              libre ? <span className="text-xs" style={{ color: COLORS.muted }}>sin horario fijo · tope {t.fin}</span> : dur(Math.max(0, hm(t.fin) - hm(t.inicio))),
              libre ? <span className="text-xs" style={{ color: COLORS.muted }}>sin límite · no hay retraso</span> : mm(hm(t.inicio) + (Number(H.tolerancia) || 0)),
              mm(hm(t.fin || "19:00") + (Number(H.cierreMin) || 0)),
              asignadas(t.id) + (t.id === H.defecto ? " · por defecto" : ""),
              enUso ? <span className="text-xs" style={{ color: COLORS.muted }}>en uso</span>
                : <button onClick={() => delTurno(t.id)} className="text-xs" style={{ color: COLORS.rust }}>Quitar</button>,
            ];
          })}
        />
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <button onClick={() => addTurno("fijo")} className="text-sm px-3 py-2" style={{ border: `1px solid ${COLORS.forest}`, color: COLORS.forest, background: "#fff" }}>+ Agregar turno</button>
          <button onClick={() => addTurno("libre")} className="text-sm px-3 py-2" style={{ border: `1px solid ${COLORS.forest}`, color: COLORS.forest, background: "#fff" }}>+ Agregar turno libre</button>
          <span className="text-xs" style={{ color: COLORS.muted }}>Se considera retraso si la primera entrada del día es posterior a la entrada del turno + tolerancia (turno principal: {principal && principal.tipo !== "libre" ? mm(hm(principal.inicio) + (Number(H.tolerancia) || 0)) : "—"}).</span>
        </div>

        <div className="mt-6 mb-2 text-sm" style={{ color: COLORS.forest, fontWeight: 600 }}>Asignar turno a cada vendedora</div>
        <p className="text-xs mb-3" style={{ color: COLORS.muted }}>Elige quién trabaja tiempo completo, medio tiempo o en turno libre. En turno libre no hay hora de entrada ni retrasos: se paga por horas trabajadas × la tarifa por hora (en Bs) que pongas aquí.</p>
        <div className="flex gap-2 flex-wrap mb-3">
          {H.turnos.map((t) => <Tag key={t.id} tone={t.tipo === "libre" ? "warn" : "neutral"}>{t.nombre}: {asignadas(t.id)}</Tag>)}
        </div>
        <LedgerTable
          columns={["Vendedora", "Turno", "Horario", "Tarifa por hora (Bs)"]}
          rows={vend.map((u) => {
            const t = turnoDeV(u), libre = t.tipo === "libre";
            return [
              u.nombre,
              <select className="text-sm px-2 py-1" style={{ ...inputStyle, minWidth: 200 }} value={t.id} onChange={(e) => setUsr(u.id, { turno_id: esNuevo(e.target.value) ? e.target.value : Number(e.target.value) })}>
                {H.turnos.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
              </select>,
              libre ? "Viene cuando puede" : `${t.inicio} – ${t.fin} (${dur(Math.max(0, hm(t.fin) - hm(t.inicio)))})`,
              libre ? <NumIn w={70} value={u.tarifa_hora} onChange={(x) => setUsr(u.id, { tarifa_hora: x === "" ? 0 : Number(x) })} /> : <span style={{ color: COLORS.muted }}>—</span>,
            ];
          })}
        />
        <p className="text-xs mt-3" style={{ color: COLORS.muted }}>No hay horas extras: no se cuentan horas después de la salida del turno (o del tope, en turno libre). Si una vendedora olvida marcar su salida, el sistema la cierra sola a la salida del turno + {Number(H.cierreMin) || 0} min (ej. {mm(hm(principal?.fin || "19:00") + (Number(H.cierreMin) || 0))}).</p>
        <p className="text-xs mt-2" style={{ color: COLORS.muted }}>El domingo no es día laborable: no tiene meta ni cuenta como falta. Si una vendedora trabaja un domingo, lo que registre aparece en su cuadro resumen de ejecución.</p>
      </div>

      <h3 className="text-sm mb-3" style={{ color: COLORS.forest, fontWeight: 600 }}>Ubicación para validar el check-in por GPS</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 max-w-xl">
        <Field label="Latitud"><TextInput type="number" step="0.000001" value={store.lat ?? ""} onChange={(e) => setStore({ ...store, lat: e.target.value })} /></Field>
        <Field label="Longitud"><TextInput type="number" step="0.000001" value={store.lng ?? ""} onChange={(e) => setStore({ ...store, lng: e.target.value })} /></Field>
        <Field label="Radio permitido (metros)"><TextInput type="number" value={store.radio_metros ?? ""} onChange={(e) => setStore({ ...store, radio_metros: e.target.value })} /></Field>
      </div>
      <div className="flex items-center gap-3 flex-wrap mb-2">
        <button onClick={usarMiUbicacion} className="text-sm px-3 py-2" style={{ background: COLORS.forest, color: "#fff" }}>📍 Usar mi ubicación actual</button>
        {!sinUbic && <a className="text-xs underline" style={{ color: COLORS.forest }} target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${store.lat},${store.lng}`}>Ver en Google Maps</a>}
        {gpsMsg && <span className="text-xs" style={{ color: COLORS.muted }}>{gpsMsg}</span>}
      </div>
      {sinUbic && (
        <div className="p-3 mb-3 text-xs max-w-xl" style={{ background: "#FBEFD9", border: "1px solid #EFCB86", color: "#8A5A00" }}>
          ⚠️ Todavía no hay ubicación de la tienda. Mientras no la guardes, el check-in de todas las vendedoras aparece como "Dentro del rango".
        </div>
      )}
      <p className="text-xs mb-8" style={{ color: COLORS.muted }}>Lo más fácil: ve a la tienda, abre esta pantalla desde tu celular y presiona "Usar mi ubicación actual". También puedes copiar la latitud y longitud desde Google Maps. Después presiona "Actualizar".</p>

      <h3 className="text-sm mb-3" style={{ color: COLORS.forest, fontWeight: 600 }}>Qué puede ver cada vendedora de sí misma</h3>
      <div className="flex flex-col gap-2 max-w-md">
        {OPCIONES_VIS.map((o) => (
          <div key={o.k} className="flex items-center justify-between bg-white px-3 py-2" style={{ border: `1px solid ${COLORS.line}` }}>
            <span className="text-sm">{o.label}</span>
            <div className="flex gap-1">
              {[["admin", "Solo administradora"], ["todas", "También vendedoras"]].map(([val, lab]) => (
                <button key={val} onClick={() => setVis({ ...vis, [o.k]: val })} className="text-xs px-2 py-1"
                  style={{ background: vis[o.k] === val ? COLORS.forest : "#fff", color: vis[o.k] === val ? "#fff" : COLORS.forest, border: `1px solid ${COLORS.forest}` }}>{lab}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
