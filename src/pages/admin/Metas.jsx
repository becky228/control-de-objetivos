import React, { useEffect, useState } from "react";
import { SectionHeader, Tag, PrimaryBtn, SaveBtn, COLORS, inputStyle } from "../../components/ui.jsx";
import DayGrid from "../../components/DayGrid.jsx";
import { fetchVendedoras, fetchCuentas, fetchMetasGlobales, fetchMetasCuenta, guardarMetaGlobal, guardarMetaCuenta, weekArrayFromRows, todayISO, currentWeekStart } from "../../lib/api.js";
import { addDays, fmt, zeros, sum } from "../../lib/dates.js";

export default function Metas() {
  const today = todayISO();
  const [vendedoras, setVendedoras] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [metasG, setMetasG] = useState([]);
  const [metasC, setMetasC] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modo, setModo] = useState("global");
  const [variable, setVariable] = useState("copy");
  const [semanaOffset, setSemanaOffset] = useState(0);
  const [selV, setSelV] = useState(null);
  const [draft, setDraft] = useState({}); // { "global:copy:vid": [7], "cuenta:cid": [7] }

  const s0 = addDays(currentWeekStart(today), semanaOffset * 7);

  const cargar = async () => {
    setLoading(true);
    const vs = await fetchVendedoras();
    const cu = await fetchCuentas();
    const [mg, mc] = await Promise.all([fetchMetasGlobales(vs.map((v) => v.id)), fetchMetasCuenta(cu.map((c) => c.id))]);
    setVendedoras(vs); setCuentas(cu); setMetasG(mg); setMetasC(mc);
    setDraft({});
    setSelV((v) => v || vs[0]?.id || null);
    setLoading(false);
  };
  useEffect(() => { cargar(); }, []);

  if (loading) return <p className="text-sm" style={{ color: COLORS.muted }}>Cargando…</p>;

  const cuentasDe = (vid) => cuentas.filter((c) => c.vendedora_id === vid && c.estado === "Activa");

  const arrGlobal = (vid, varb) => {
    const key = `global:${varb}:${vid}`;
    if (draft[key]) return draft[key];
    if (varb === "copy" && cuentasDe(vid).length) {
      // Es la suma de sus cuentas: se calcula, no se edita aquí.
      const sumaSemana = zeros();
      cuentasDe(vid).forEach((c) => {
        const arr = draft[`cuenta:${c.id}`] || weekArrayFromRows(metasC.filter((m) => m.cuenta_id === c.id), s0);
        arr.forEach((x, i) => (sumaSemana[i] += Number(x) || 0));
      });
      return sumaSemana;
    }
    return weekArrayFromRows(metasG.filter((m) => m.vendedora_id === vid && m.variable === varb), s0);
  };
  const arrCuenta = (cid) => draft[`cuenta:${cid}`] || weekArrayFromRows(metasC.filter((m) => m.cuenta_id === cid), s0);

  const setGlobal = (vid, varb, i, val) => {
    const base = [...arrGlobal(vid, varb)];
    base[i] = val;
    setDraft((d) => ({ ...d, [`global:${varb}:${vid}`]: base }));
  };
  const setCuenta = (cid, i, val) => {
    const base = [...arrCuenta(cid)];
    base[i] = val;
    setDraft((d) => ({ ...d, [`cuenta:${cid}`]: base }));
  };

  const guardar = async () => {
    const ops = [];
    Object.entries(draft).forEach(([key, arr]) => {
      if (key.startsWith("global:")) {
        const [, varb, vid] = key.split(":");
        ops.push(guardarMetaGlobal(vid, varb, s0, arr));
      } else if (key.startsWith("cuenta:")) {
        const cid = key.split(":")[1];
        ops.push(guardarMetaCuenta(cid, s0, arr));
      }
    });
    await Promise.all(ops);
    await cargar();
  };

  const vs = vendedoras;
  const mis = selV ? cuentasDe(selV) : [];

  return (
    <div>
      <SectionHeader eyebrow="Objetivos semanales en valor numérico" title="Metas"
        action={
          <>
            <div className="flex items-center gap-2">
              <button onClick={() => setSemanaOffset(semanaOffset - 1)} className="p-1.5" style={{ border: `1px solid ${COLORS.line}`, background: "#fff" }}>◀</button>
              <span className="text-sm px-1" style={{ color: COLORS.forest }}>Semana {fmt(s0)} – {fmt(addDays(s0, 6))}</span>
              <button onClick={() => setSemanaOffset(semanaOffset + 1)} className="p-1.5" style={{ border: `1px solid ${COLORS.line}`, background: "#fff" }}>▶</button>
            </div>
            <SaveBtn onSave={guardar} label="Actualizar" />
          </>
        } />

      <div className="flex gap-2 mb-4">
        {[["global", "Global por vendedora"], ["cuentas", "Por cuentas de Facebook"]].map(([k, l]) => (
          <button key={k} onClick={() => setModo(k)} className="text-sm px-3 py-1.5"
            style={{ background: modo === k ? COLORS.forest : "#fff", color: modo === k ? "#fff" : COLORS.forest, border: `1px solid ${COLORS.forest}` }}>{l}</button>
        ))}
      </div>

      {modo === "global" && (
        <>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {[["copy", "Copy"], ["app", "App"]].map(([k, l]) => (
              <button key={k} onClick={() => setVariable(k)} className="text-sm px-3 py-1.5"
                style={{ background: variable === k ? COLORS.amber : "#fff", color: variable === k ? "#fff" : COLORS.forest, border: `1px solid ${COLORS.amber}` }}>{l}</button>
            ))}
          </div>
          <DayGrid totalLabel={`TOTAL ${variable.toUpperCase()}`}
            rows={vs.map((v) => {
              const derivado = variable === "copy" && cuentasDe(v.id).length > 0;
              return { label: v.nombre, hint: derivado ? "suma de sus cuentas de Facebook" : undefined, arr: arrGlobal(v.id, variable), edit: derivado ? null : (i, x) => setGlobal(v.id, variable, i, x) };
            })}
          />
        </>
      )}

      {modo === "cuentas" && (
        <>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span className="text-xs" style={{ color: COLORS.muted }}>Vendedora:</span>
            <select className="text-sm px-2 py-1.5" style={inputStyle} value={selV || ""} onChange={(e) => setSelV(e.target.value)}>
              {vs.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
            <Tag tone="good">Total copy semanal en el global: {sum(arrGlobal(selV, "copy"))}</Tag>
          </div>
          {mis.length === 0 ? (
            <p className="text-sm" style={{ color: COLORS.muted }}>Esta vendedora no tiene cuentas de Facebook asignadas (asígnalas en Cuentas Facebook).</p>
          ) : (
            <DayGrid totalLabel="TOTAL COPY" rows={mis.map((c) => ({ label: c.nombre, arr: arrCuenta(c.id), edit: (i, x) => setCuenta(c.id, i, x) }))} />
          )}
          <p className="text-xs mt-3" style={{ color: COLORS.muted }}>Lo que cambies aquí actualiza el total global al instante. Presiona Actualizar para guardarlo.</p>
        </>
      )}

      <div className="mt-5 p-3 text-xs" style={{ background: "#fff", border: `1px solid ${COLORS.line}`, color: "#6B6858" }}>
        Si no modificas nada, cada semana nueva hereda automáticamente los objetivos de la semana anterior.
      </div>
    </div>
  );
}
