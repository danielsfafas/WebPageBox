import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { fmtCurrency, useSettings } from "@/lib/utils-app";
import { Users, TrendingUp, AlertTriangle, Clock, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const settings = useSettings();
  const sym = settings.currency_symbol || "$";

  useEffect(() => { api.get("/admin/dashboard").then(r => setStats(r.data)).catch(() => {}); }, []);

  if (!stats) return <div className="text-white/40">Cargando…</div>;

  const cards = [
    { label: "Suscriptores activos", value: stats.active_subscribers, total: `de ${stats.total_subscribers}`, icon: Users, accent: "text-[#FFD700]" },
    { label: "Ingresos del mes", value: fmtCurrency(stats.month_revenue, sym), icon: TrendingUp, accent: "text-green-400" },
    { label: "Pagos vencidos", value: stats.overdue_count, total: fmtCurrency(stats.overdue_amount, sym), icon: AlertTriangle, accent: "text-red-400" },
    { label: "Renovaciones 7 días", value: stats.upcoming_count, icon: Clock, accent: "text-yellow-400" },
  ];

  return (
    <div data-testid="admin-dashboard">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-[#E63946]">Resumen</div>
          <h1 className="font-display text-4xl md:text-5xl text-white mt-1">Dashboard</h1>
        </div>
      </div>

      <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <div key={i} className="glass p-5 rounded-sm" data-testid="metric-card">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-widest text-white/50">{c.label}</div>
              <c.icon size={18} className={c.accent} />
            </div>
            <div className={`font-display text-4xl mt-3 ${c.accent}`}>{c.value}</div>
            {c.total && <div className="text-xs text-white/40 mt-1">{c.total}</div>}
          </div>
        ))}
      </div>

      <div className="mt-8 glass p-6 rounded-sm">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={18} className="text-[#E63946]" />
          <h2 className="font-display text-2xl text-white">Ingresos por paquete</h2>
        </div>
        {stats.package_breakdown?.length === 0 ? (
          <div className="text-white/40 py-12 text-center">Aún no hay datos de pagos.</div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={stats.package_breakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="name" tick={{ fill: "#888", fontSize: 12 }} />
                <YAxis tick={{ fill: "#888", fontSize: 12 }} />
                <Tooltip contentStyle={{ background: "#0A0A0A", border: "1px solid #222", color: "#fff" }} formatter={(v) => fmtCurrency(v, sym)} />
                <Bar dataKey="revenue" fill="#E63946" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
