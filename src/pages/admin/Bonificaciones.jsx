import React, { useEffect, useState } from "react";
import { SectionHeader, LedgerTable, NumIn, SaveBtn, COLORS } from "../../components/ui.jsx";
import { fetchVendedoras, fetchMetasGlobales, fetchFbLog, fetchRegistroApp, fetchAsistencia, fetchPuntos, fetchVentas, fetchBonoConfig, todayISO } from "../../lib/api.js";
import { computeBonoVendedora } from "../../lib/bono.js";
import { supabase } from "../../lib/supabase.js";
import { cycleFor, cicloLabel } from "../../lib/dates.js";

export default function Bonificaciones() {
  const today = todayISO();
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState(null);
  const [cfg, setCfg] = useState(null);
  const [ventasDraft, setVentasDraft] = useState({});

  const cargar = async () => {
    setLoading(true);
    const vendedoras = await fetchVendedoras();
    const [metasGlobales, fbLog, appLog, asist, puntos, ventas, bonoConfig] = await Promise.all([
      fetchMetasGlobales(vendedoras.map((v) => v.id)), fetchFbLog(), fetchRegistroApp(), fetchAsistencia(), fetchPuntos(), fetchVentas(), fetchBonoConfig(),
    ]);
    setState({ vendedoras, metasGlobales, fbLog, appLog, asist, puntos, ventas });
    setCfg(JSON.parse(JSON.stringify(bonoConfig)));
    setVentasDraft({});
    setLoading(false);
  };
  useEffect(() => { cargar(); }, []);

  if (loading || !state || !cfg) return <p className="text-sm" style={{ color: COLORS.muted }}>Cargando…</p>;

  const bonos = state.vendedoras.map((v) => computeBonoVendedora(v, { ...state, bonoConfig: cfg, todayISO: today }));
  const setC = (clave, campo, val) => setCfg((c) => ({ ...c, [clave]: { ...c[clave], [campo]: val } }));
  const ventaFor = (vid) => {
    const c = cycleFor(state.vendedoras.find((v) => v.id === vid).ingreso_fecha, today);
    const key = `${vid}:${c.start}`;
    if (ventasDraft[key]) return ventasDraft[key];
    const found = state.ventas.find((x) => x.vendedora_id === vid && x.periodo_inicio === c.start);
    return { meta: found?.meta || 0, logrado: found?.logrado || 0, periodo_inicio: c.start };
  };
  const setVenta = (vid, campo, val) => {
    const c = cycleFor(state.vendedoras.find((v) => v.id === vid).ingreso_fecha, today);
    const key = `${vid}:${c.start}`;
    setVentasDraft((d) => ({ ...d, [key]: { ...ventaFor(vid), [campo]: val, periodo_inicio: c.start } }));
  };

  const guardar = async () => {
    const ops = Object.entries(cfg).map(([clave, valor]) => supabase.from("bono_config").update({ valor }).eq("clave", clave));
    Object.entries(ventasDraft).forEach(([key, v]) => {
      const vid = key.split(":")[0];
      ops.push(supabase.from("ventas_mensuales").upsert({ vendedora_id: vid, periodo_inicio: v.periodo_inicio, meta: v.meta, logrado: v.logrado }, { onConflict: "vendedora_id,periodo_inicio" }));
    });
    await Promise.all(ops);
    await cargar();
  };

  const Tier = ({ title, clave, note }) => (
    <div className="p-4 bg-white" style={{ border: `1px solid ${COLORS.line}` }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm" style={{ color: COLORS.forest, fontWeight: 600 }}>{title}</span>
        <span className="text-xs flex items-center gap-1" style={{ color: COLORS.muted }}>Peso <NumIn w={46} value={cfg[clave].peso} onChange={(x) => setC(clave, "peso", x)} />%</span>
      </div>
      <Row>Llega al objetivo (100%) → <NumIn value={cfg[clave].a} onChange={(x) => setC(clave, "a", x)} />% del bono</Row>
      <Row>Cumple de <NumIn value={cfg[clave].min} onChange={(x) => setC(clave, "min", x)} />% al 99% → <NumIn value={cfg[clave].b} onChange={(x) => setC(clave, "b", x)} />%</Row>
      <Row>Menos de {cfg[clave].min}% → <NumIn value={cfg[clave].c} onChange={(x) => setC(clave, "c", x)} />%</Row>
      {note && <p className="text-xs mt-1" style={{ color: COLORS.muted }}>{note}</p>}
    </div>
  );

  return (
    <div>
      <SectionHeader eyebrow="Bono base × % cumplimiento − descuentos" title="Bonificaciones" action={<SaveBtn onSave={guardar} label="Actualizar" />} />

      <h3 className="text-sm mb-3" style={{ color: COLORS.forest, fontWeight: 600 }}>Reglas de medición del % de cumplimiento</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="p-4 bg-white" style={{ border: `1px solid ${COLORS.line}` }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm" style={{ color: COLORS.forest, fontWeight: 600 }}>Puntualidad</span>
            <span className="text-xs flex items-center gap-1" style={{ color: COLORS.muted }}>Peso <NumIn w={46} value={cfg.puntualidad.peso} onChange={(x) => setC("puntualidad", "peso", x)} />%</span>
          </div>
          <Row>Hasta <NumIn value={cfg.puntualidad.p1} onChange={(x) => setC("puntualidad", "p1", x)} /> retrasos → <NumIn value={cfg.puntualidad.p1pct} onChange={(x) => setC("puntualidad", "p1pct", x)} />%</Row>
          <Row>Hasta <NumIn value={cfg.puntualidad.p2} onChange={(x) => setC("puntualidad", "p2", x)} /> retrasos → <NumIn value={cfg.puntualidad.p2pct} onChange={(x) => setC("puntualidad", "p2pct", x)} />%</Row>
          <Row>Más de {cfg.puntualidad.p2} retrasos → <NumIn value={cfg.puntualidad.p3pct} onChange={(x) => setC("puntualidad", "p3pct", x)} />%</Row>
        </div>
        <div className="p-4 bg-white" style={{ border: `1px solid ${COLORS.line}` }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm" style={{ color: COLORS.forest, fontWeight: 600 }}>Seguimiento de instrucciones</span>
            <span className="text-xs flex items-center gap-1" style={{ color: COLORS.muted }}>Peso <NumIn w={46} value={cfg.seguimiento.peso} onChange={(x) => setC("seguimiento", "peso", x)} />%</span>
          </div>
          <Row>Sin llamadas de atención → <NumIn value={cfg.seguimiento.s1pct} onChange={(x) => setC("seguimiento", "s1pct", x)} />%</Row>
          <Row>Hasta <NumIn value={cfg.seguimiento.sMediasMax} onChange={(x) => setC("seguimiento", "sMediasMax", x)} /> puntos de gravedad media → <NumIn value={cfg.seguimiento.s2pct} onChange={(x) => setC("seguimiento", "s2pct", x)} />%</Row>
          <Row>Más de {cfg.seguimiento.sMediasMax} medias, o {cfg.seguimiento.sFuerteMax} o más de gravedad fuerte → <NumIn value={cfg.seguimiento.s3pct} onChange={(x) => setC("seguimiento", "s3pct", x)} />%</Row>
        </div>
        <Tier title="Cumplimiento de metas · APP" clave="app" />
        <Tier title="Cumplimiento de metas · Copy" clave="copy" note="Mismas escalas que APP por defecto; puedes cambiarlas." />
        <Tier title="Cumplimiento de ventas" clave="ventas" note="Las ventas las llena la administradora cada mes (tabla de abajo)." />
      </div>

      <h3 className="text-sm mb-3 mt-8" style={{ color: COLORS.forest, fontWeight: 600 }}>Ventas del período (las llena la administradora cada mes)</h3>
      <LedgerTable
        columns={["Vendedora", "Período de pago", "Meta de ventas", "Ventas logradas", "% logrado"]}
        rows={state.vendedoras.map((v) => {
          const vt = ventaFor(v.id);
          const c = cycleFor(v.ingreso_fecha, today);
          return [v.nombre, cicloLabel(c), <NumIn w={80} value={vt.meta} onChange={(x) => setVenta(v.id, "meta", x)} />, <NumIn w={80} value={vt.logrado} onChange={(x) => setVenta(v.id, "logrado", x)} />, `${vt.meta ? Math.round((vt.logrado / vt.meta) * 100) : 0}%`];
        })}
      />

      <h3 className="text-sm mb-3 mt-8" style={{ color: COLORS.forest, fontWeight: 600 }}>Resultado por vendedora (avance a la fecha de su período de pago)</h3>
      <LedgerTable
        columns={["Vendedora", "Período", "Base", "Copy", "App", "Ventas", "Puntualidad", "Seguimiento", "Cumplimiento", "Descuentos", "Bono final"]}
        rows={bonos.map((b) => [
          b.v.nombre, cicloLabel(b.c), `$${b.v.bono_base}`,
          `${b.copyT}% (${Math.round(b.copyP)}%)`, `${b.appT}% (${Math.round(b.appP)}%)`, `${b.ventasT}% (${Math.round(b.ventasP)}%)`,
          `${b.punt}% (${b.retr} retr.)`, `${b.seg}%`, <b>{b.cum}%</b>, `-$${b.desc}`,
          <span style={{ fontFamily: "'Zilla Slab', serif", fontWeight: 700, color: COLORS.forest }}>${b.final}</span>,
        ])}
      />
    </div>
  );
}

function Row({ children }) {
  return <div className="flex items-center gap-2 text-sm py-1.5 flex-wrap" style={{ color: COLORS.ink }}>{children}</div>;
}
