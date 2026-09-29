import React, { useState } from "react";

export const COLORS = {
  ink: "#1C1B17", paper: "#EDEAE3", forest: "#16342C", forestLight: "#264A40",
  amber: "#D98E04", rust: "#C1503B", line: "#D8D3C6", muted: "#8A8676",
};
export const slab = "'Zilla Slab', serif";

export function Tag({ children, tone = "neutral" }) {
  const tones = {
    neutral: { bg: "#fff", color: COLORS.ink, border: COLORS.line },
    good: { bg: "#EAF2E7", color: "#2F5D3A", border: "#B9D3B1" },
    bad: { bg: "#F6E7E3", color: COLORS.rust, border: "#E7BEB3" },
    warn: { bg: "#FBEFD9", color: "#8A5A00", border: "#EFCB86" },
  };
  const t = tones[tone];
  return (
    <span className="text-xs px-2 py-1 rounded-sm inline-flex items-center gap-1 whitespace-nowrap"
      style={{ background: t.bg, color: t.color, border: `1px solid ${t.border}` }}>
      {children}
    </span>
  );
}

export function SectionHeader({ eyebrow, title, action }) {
  return (
    <div className="flex items-end justify-between mb-5 pb-4 gap-4 flex-wrap" style={{ borderBottom: `1px solid ${COLORS.line}` }}>
      <div>
        <div className="text-xs tracking-wide" style={{ color: COLORS.muted }}>{eyebrow}</div>
        <h2 className="text-2xl mt-1" style={{ fontFamily: slab, color: COLORS.forest, fontWeight: 600 }}>{title}</h2>
      </div>
      <div className="flex items-center gap-2 flex-wrap justify-end">{action}</div>
    </div>
  );
}

export function LedgerTable({ columns, rows, maxH, empty = "No hay registros con este filtro." }) {
  return (
    <div className="w-full overflow-x-auto" style={maxH ? { maxHeight: maxH, overflowY: "auto" } : {}}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: `2px solid ${COLORS.forest}`, position: "sticky", top: 0, background: COLORS.paper }}>
            {columns.map((c) => (
              <th key={c} className="text-left py-2 pr-4 font-medium whitespace-nowrap" style={{ color: COLORS.forest }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${COLORS.line}` }}>
              {r.map((cell, j) => <td key={j} className="py-2.5 pr-4" style={{ color: COLORS.ink }}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="text-xs py-4" style={{ color: COLORS.muted }}>{empty}</p>}
    </div>
  );
}

export function PrimaryBtn({ children, onClick, disabled, type = "button" }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className="text-sm px-3 py-2 flex items-center gap-1.5 disabled:opacity-50"
      style={{ background: COLORS.forest, color: "#fff" }}>
      {children}
    </button>
  );
}

export function GhostBtn({ children, onClick, tone = "forest" }) {
  const c = tone === "rust" ? COLORS.rust : COLORS.forest;
  return (
    <button onClick={onClick} className="text-xs px-2.5 py-1.5" style={{ background: "#fff", color: c, border: `1px solid ${c}` }}>
      {children}
    </button>
  );
}

export function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs mb-1" style={{ color: COLORS.muted }}>{label}</label>
      {children}
    </div>
  );
}
export const inputStyle = { border: `1px solid ${COLORS.line}`, background: "#FBFAF7" };

export function TextInput(props) {
  return <input {...props} className={"w-full px-3 py-2 text-sm " + (props.className || "")} style={{ ...inputStyle, ...(props.style || {}) }} />;
}

export function NumIn({ value, onChange, w = 44 }) {
  return (
    <input type="number" value={value ?? 0}
      onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      className="text-sm text-center py-1" style={{ width: w, ...inputStyle }} />
  );
}

export function Prog({ hecho, meta }) {
  if (!meta) return <span style={{ color: "#B5B19E" }}>—</span>;
  const p = Math.min(999, Math.round((hecho / meta) * 100));
  return (
    <div className="flex items-center gap-2">
      <div className="w-14 h-1.5" style={{ background: "#E3E0D5" }}>
        <div className="h-1.5" style={{ width: `${Math.min(100, p)}%`, background: p >= 100 ? "#2F5D3A" : COLORS.amber }} />
      </div>
      <span className="text-xs whitespace-nowrap">{hecho}/{meta} · {p}%</span>
    </div>
  );
}

export function Card({ children, style }) {
  return <div className="p-5" style={{ background: "#fff", border: `1px solid ${COLORS.line}`, ...style }}>{children}</div>;
}

export function CardTitle({ children }) {
  return <div className="text-sm mb-3" style={{ color: COLORS.forest, fontWeight: 600 }}>{children}</div>;
}

export function Locked({ label }) {
  return (
    <div className="p-4 text-xs flex items-center gap-2 mb-4" style={{ border: `1px dashed ${COLORS.line}`, color: COLORS.muted, background: "#F6F4EE" }}>
      🔒 {label}: tu administradora aún no habilitó esta sección.
    </div>
  );
}

// Barra de filtros compartida: por día (rango), mes completo, año o total.
export function FilterBar({ f, setF, modes = ["dias", "mes", "anio", "todo"], showVend = true, vendedoras = [] }) {
  const labels = { dias: "Por día (rango)", mes: "Mes completo", anio: "Año", todo: "Total" };
  return (
    <div className="flex items-center gap-2 flex-wrap mb-4 p-2" style={{ background: "#fff", border: `1px solid ${COLORS.line}` }}>
      {modes.map((m) => (
        <button key={m} onClick={() => setF({ ...f, mode: m })} className="text-xs px-2.5 py-1.5"
          style={{ background: f.mode === m ? COLORS.forest : "transparent", color: f.mode === m ? "#fff" : COLORS.forest, border: `1px solid ${COLORS.forest}` }}>
          {labels[m]}
        </button>
      ))}
      {f.mode === "dias" && (
        <div className="flex items-center gap-1 text-xs" style={{ color: COLORS.muted }}>
          De <input type="date" className="px-2 py-1.5" style={inputStyle} value={f.desde}
            onChange={(e) => e.target.value && setF({ ...f, desde: e.target.value, hasta: f.hasta < e.target.value ? e.target.value : f.hasta })} />
          a <input type="date" className="px-2 py-1.5" style={inputStyle} value={f.hasta} min={f.desde}
            onChange={(e) => e.target.value && setF({ ...f, hasta: e.target.value })} />
        </div>
      )}
      {f.mode === "mes" && <input type="month" className="text-xs px-2 py-1.5" style={inputStyle} value={f.mes} onChange={(e) => e.target.value && setF({ ...f, mes: e.target.value })} />}
      {f.mode === "anio" && (
        <select className="text-xs px-2 py-1.5" style={inputStyle} value={f.anio} onChange={(e) => setF({ ...f, anio: e.target.value })}>
          {["2024", "2025", "2026", "2027"].map((y) => <option key={y}>{y}</option>)}
        </select>
      )}
      {showVend && (
        <select className="text-xs px-2 py-1.5 ml-auto" style={inputStyle} value={f.vid || ""} onChange={(e) => setF({ ...f, vid: e.target.value || null })}>
          <option value="">Todas las vendedoras</option>
          {vendedoras.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
        </select>
      )}
    </div>
  );
}

export function newFilter(mode = "mes", todayISO) {
  return { mode, desde: todayISO, hasta: todayISO, mes: todayISO.slice(0, 7), anio: todayISO.slice(0, 4), vid: null };
}
export function passes(f, fecha, vid) {
  if (f.vid && vid !== f.vid) return false;
  if (f.mode === "dias") return fecha >= f.desde && fecha <= f.hasta;
  if (f.mode === "mes") return fecha.slice(0, 7) === f.mes;
  if (f.mode === "anio") return fecha.slice(0, 4) === f.anio;
  return true;
}

// Botón que guarda en Supabase y avisa con un check temporal.
export function SaveBtn({ onSave, label = "Guardar" }) {
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState("");
  const click = async () => {
    setBusy(true); setErr("");
    try {
      await onSave();
      setOk(true);
      setTimeout(() => setOk(false), 1600);
    } catch (e) {
      setErr(e.message || "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };
  return (
    <span className="inline-flex items-center gap-2">
      <button onClick={click} disabled={busy} className="text-sm px-3 py-2 flex items-center gap-1.5 disabled:opacity-60"
        style={{ background: ok ? "#2F5D3A" : COLORS.forest, color: "#fff" }}>
        {busy ? "Guardando…" : ok ? "✓ Guardado" : label}
      </button>
      {err && <span className="text-xs" style={{ color: COLORS.rust }}>{err}</span>}
    </span>
  );
}
