import React, { useEffect, useMemo, useState } from "react";
import subscriberApi from "@/lib/subscriberApi";
import { fmtDate } from "@/lib/utils-app";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function SubscriberProgress() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    subscriberApi.get("/subscriber/progress").then((r) => setRows(r.data || [])).catch(() => setRows([]));
  }, []);

  const chartData = useMemo(
    () =>
      rows.map((r) => ({
        date: new Date(r.date).toLocaleDateString("es-MX", { day: "2-digit", month: "short" }),
        Peso: r.weight_kg,
        Cintura: r.waist_cm,
        Pecho: r.chest_cm,
      })),
    [rows],
  );

  return (
    <section className="space-y-4" data-testid="subscriber-progress-page">
      <h1 className="font-display text-4xl text-white">Mi progreso</h1>

      {chartData.length > 1 && (
        <div className="glass p-4 rounded-sm">
          <div className="h-72 min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="date" tick={{ fill: "#888", fontSize: 11 }} />
                <YAxis tick={{ fill: "#888", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#0A0A0A", border: "1px solid #222", color: "#fff" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="Peso" stroke="#E63946" strokeWidth={2} />
                <Line type="monotone" dataKey="Cintura" stroke="#FFD700" strokeWidth={2} />
                <Line type="monotone" dataKey="Pecho" stroke="#22C55E" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="glass rounded-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[580px]">
          <thead>
            <tr className="text-left text-xs uppercase tracking-widest text-white/40 border-b border-white/5">
              <th className="p-3">Fecha</th>
              <th className="p-3">Peso</th>
              <th className="p-3">Pecho</th>
              <th className="p-3">Cintura</th>
              <th className="p-3">% Grasa</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-white/5 text-white/80">
                <td className="p-3">{fmtDate(r.date)}</td>
                <td className="p-3">{r.weight_kg ?? "—"} kg</td>
                <td className="p-3">{r.chest_cm ?? "—"} cm</td>
                <td className="p-3">{r.waist_cm ?? "—"} cm</td>
                <td className="p-3">{r.body_fat_pct ?? "—"} %</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-white/40">Sin registros</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
