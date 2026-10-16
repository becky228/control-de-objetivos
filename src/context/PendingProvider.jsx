import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { COLORS } from "../components/ui.jsx";

// Sistema general de "Actualizar": cada pantalla guarda sus cambios pendientes aquí
// (editados o nuevos) y una barra fija permite guardar TODO de una vez o descartar.
const Ctx = createContext(null);

export function PendingProvider({ children }) {
  const [store, setStore] = useState({});   // key -> { edits: {id: patch}, adds: [filas nuevas] }
  const meta = useRef({});                  // key -> { label, table }
  const [version, setVersion] = useState(0); // sube cada vez que se guarda: las pantallas recargan sus datos
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const count = (b) => Object.keys(b?.edits || {}).length + (b?.adds || []).length;
  const keys = Object.keys(store).filter((k) => count(store[k]) > 0);
  const total = keys.reduce((s, k) => s + count(store[k]), 0);

  const saveKeys = useCallback(async (ks) => {
    setBusy(true); setErr("");
    let fallo = null;
    for (const k of ks) {
      const b = store[k], m = meta.current[k];
      if (!b || !m) continue;
      for (const [id, patch] of Object.entries(b.edits || {})) {
        const { error } = await supabase.from(m.table).update(patch).eq("id", id);
        if (error) { fallo = `${m.label}: ${error.code === "23505" ? "ya existe un registro con esos datos." : error.message}`; break; }
      }
      if (fallo) break;
      for (const row of b.adds || []) {
        const { _tmp, ...fields } = row;
        const { error } = await supabase.from(m.table).insert(fields);
        if (error) { fallo = `${m.label}: ${error.code === "23505" ? "ya existe un registro con esos datos." : error.message}`; break; }
      }
      if (fallo) break;
      setStore((p) => { const { [k]: _, ...rest } = p; return rest; });
    }
    setBusy(false);
    if (fallo) setErr(fallo);
    setVersion((v) => v + 1);
  }, [store]);

  const discard = () => { setStore({}); setErr(""); };

  useEffect(() => {
    if (!total) return;
    const f = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", f);
    return () => window.removeEventListener("beforeunload", f);
  }, [total]);

  const value = useMemo(() => ({ store, setStore, meta, version, saveKeys, busy }), [store, version, saveKeys, busy]);
  const etiquetas = [...new Set(keys.map((k) => meta.current[k]?.label || k))].join(", ");

  return (
    <Ctx.Provider value={value}>
      {children}
      {total > 0 && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-16 z-50 flex items-center gap-3 px-4 py-3 text-sm flex-wrap justify-center"
          style={{ background: COLORS.forest, color: "#fff", boxShadow: "0 6px 24px rgba(0,0,0,.25)", maxWidth: "94vw" }}>
          <span>● Cambios sin guardar en: <b>{etiquetas}</b> ({total})</span>
          <button onClick={() => saveKeys(keys)} disabled={busy} className="px-3 py-1.5 text-sm disabled:opacity-60" style={{ background: COLORS.amber, color: "#fff" }}>
            {busy ? "Guardando…" : "Actualizar todo"}
          </button>
          <button onClick={discard} disabled={busy} className="px-3 py-1.5 text-sm" style={{ border: "1px solid #9FC2B4", color: "#fff" }}>Descartar</button>
          {err && <span className="w-full text-center text-xs" style={{ color: "#FFD6C9" }}>{err}</span>}
        </div>
      )}
    </Ctx.Provider>
  );
}

// useBatch: cambios pendientes de UNA tabla. Los campos se editan en pantalla y se guardan con "Actualizar".
//   const b = useBatch({ key: "fb", label: "Facebook", table: "fb_publicaciones" });
//   b.val(fila, "total")            -> valor a mostrar (editado o el original)
//   b.setCampo(fila, "total", 5)    -> deja el cambio pendiente
//   b.addRow({ ... })               -> deja una fila nueva pendiente
//   b.adds                          -> filas nuevas pendientes (para mostrarlas en la tabla)
//   b.count / b.save() / b.discard() / b.version (cambia al guardar: recarga tus datos)
export function useBatch({ key, label, table }) {
  const ctx = useContext(Ctx);
  const { store, setStore, meta, version, saveKeys, busy } = ctx;
  meta.current[key] = { label, table };
  const b = store[key] || { edits: {}, adds: [] };

  const setCampo = useCallback((row, campo, valor) => {
    setStore((p) => {
      const cur = p[key] || { edits: {}, adds: [] };
      const patch = { ...(cur.edits[row.id] || {}), [campo]: valor };
      if (patch[campo] === row[campo]) delete patch[campo];
      const edits = { ...cur.edits };
      if (Object.keys(patch).length) edits[row.id] = patch; else delete edits[row.id];
      return { ...p, [key]: { ...cur, edits } };
    });
  }, [key, setStore]);

  const addRow = useCallback((fields) => {
    setStore((p) => {
      const cur = p[key] || { edits: {}, adds: [] };
      return { ...p, [key]: { ...cur, adds: [...cur.adds, { _tmp: "n" + Date.now() + Math.random(), ...fields }] } };
    });
  }, [key, setStore]);

  const removeAdd = useCallback((tmp) => {
    setStore((p) => {
      const cur = p[key]; if (!cur) return p;
      return { ...p, [key]: { ...cur, adds: cur.adds.filter((a) => a._tmp !== tmp) } };
    });
  }, [key, setStore]);

  const val = (row, campo) => (b.edits[row.id] && campo in b.edits[row.id] ? b.edits[row.id][campo] : row[campo]);
  const editado = (row) => !!b.edits[row.id];
  const discard = () => setStore((p) => { const { [key]: _, ...rest } = p; return rest; });
  const count = Object.keys(b.edits).length + b.adds.length;

  return { val, setCampo, addRow, removeAdd, editado, adds: b.adds, count, version, busy, save: () => saveKeys([key]), discard };
}

// Botón "Actualizar" de una pantalla (guarda solo los cambios de esa pantalla)
export function ActualizarBtn({ batch }) {
  if (!batch.count) return <span className="text-xs" style={{ color: COLORS.muted }}>Sin cambios pendientes</span>;
  return (
    <button onClick={batch.save} disabled={batch.busy} className="text-sm px-3 py-2 flex items-center gap-1.5 disabled:opacity-60"
      style={{ background: COLORS.amber, color: "#fff" }}>
      ⟳ {batch.busy ? "Guardando…" : `Actualizar (${batch.count})`}
    </button>
  );
}

// Para pantallas que solo necesitan recargar sus datos cuando se guarda algo
export function usePendingVersion() {
  const { version } = useContext(Ctx);
  return { version };
}
