import React from "react";
import { NumIn, COLORS, slab } from "./ui.jsx";
import { DAYS, sum } from "../lib/dates.js";

// Cuadrícula Lunes–Domingo con total. rows: [{ label, arr:[7], edit?(i,val), hint?, inTotal? }]
export default function DayGrid({ rows, totalLabel }) {
  const totalDia = (i) => sum(rows.filter((r) => r.inTotal !== false).map((r) => Number(r.arr[i]) || 0));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: `2px solid ${COLORS.forest}` }}>
            <th className="text-left py-2 pr-4 font-medium" style={{ color: COLORS.forest }}></th>
            {DAYS.map((d) => <th key={d} className="py-2 px-1 font-medium text-center" style={{ color: COLORS.forest }}>{d}</th>)}
            <th className="py-2 pl-3 font-medium text-right" style={{ color: COLORS.forest }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} style={{ borderBottom: `1px solid ${COLORS.line}` }}>
              <td className="py-2 pr-4" style={{ color: COLORS.ink }}>
                {r.label}
                {r.hint && <div className="text-xs" style={{ color: COLORS.muted }}>{r.hint}</div>}
              </td>
              {r.arr.map((val, i) => (
                <td key={i} className="px-1 py-1.5 text-center">
                  {r.edit ? <NumIn value={val} onChange={(x) => r.edit(i, x)} /> : <span style={{ color: val ? COLORS.ink : "#C9C5B4" }}>{val || "·"}</span>}
                </td>
              ))}
              <td className="py-2 pl-3 text-right" style={{ fontFamily: slab, fontWeight: 700, color: COLORS.forest }}>{sum(r.arr.map(Number))}</td>
            </tr>
          ))}
          <tr style={{ borderTop: `2px solid ${COLORS.forest}` }}>
            <td className="py-2 pr-4" style={{ fontWeight: 600, color: COLORS.forest }}>{totalLabel}</td>
            {DAYS.map((d, i) => <td key={d} className="py-2 text-center" style={{ fontWeight: 600, color: COLORS.forest }}>{totalDia(i)}</td>)}
            <td className="py-2 pl-3 text-right" style={{ fontFamily: slab, fontWeight: 700, color: COLORS.amber }}>{sum(DAYS.map((_, i) => totalDia(i)))}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
