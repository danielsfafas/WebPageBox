import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { fmtCurrency, fmtDate } from "@/lib/utils-app";
import { Search, Trash2, CreditCard } from "lucide-react";

export default function AdminPayments() {
  const [items, setItems] = useState([]);
  const [subs, setSubs] = useState([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    api.get("/admin/payments").then(r => setItems(r.data));
    api.get("/admin/subscribers").then(r => setSubs(r.data));
  }, []);

  const del = async (id) => {
    if (!window.confirm("¿Eliminar pago?")) return;
    await api.delete(`/admin/payments/${id}`);
    toast.success("Eliminado");
    api.get("/admin/payments").then(r => setItems(r.data));
  };

  const statusClass = (s) => ({ valid: "badge-valid", expiring_soon: "badge-soon", overdue: "badge-overdue" }[s] || "bg-white/5 text-white/40 border border-white/10");
  const statusLabel = (s) => ({ valid: "Al día", expiring_soon: "Por vencer", overdue: "Vencido", unknown: "Sin pagos" }[s] || s);

  const filteredSubs = subs.filter(s => {
    if (filter !== "all" && s.payment_status !== filter) return false;
    return s.full_name.toLowerCase().includes(q.toLowerCase());
  });

  return (
    <div data-testid="admin-payments-page">
      <div className="text-xs uppercase tracking-[0.3em] text-[#E63946]">Membresías</div>
      <h1 className="font-display text-4xl text-white mt-1">Pagos & estados</h1>

      <div className="mt-6 grid lg:grid-cols-3 gap-4">
        <div className="glass p-4 rounded-sm border-l-4 border-green-500"><div className="text-xs uppercase text-white/40">Al día</div><div className="font-display text-3xl text-green-400">{subs.filter(s => s.payment_status === "valid").length}</div></div>
        <div className="glass p-4 rounded-sm border-l-4 border-yellow-500"><div className="text-xs uppercase text-white/40">Por vencer (7 días)</div><div className="font-display text-3xl text-yellow-400">{subs.filter(s => s.payment_status === "expiring_soon").length}</div></div>
        <div className="glass p-4 rounded-sm border-l-4 border-red-500"><div className="text-xs uppercase text-white/40">Vencidos</div><div className="font-display text-3xl text-red-400">{subs.filter(s => s.payment_status === "overdue").length}</div></div>
      </div>

      <h2 className="font-display text-2xl text-white mt-10">Estado por suscriptor</h2>
      <div className="mt-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
          <input className="input-dark pl-10" placeholder="Buscar atleta…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input-dark md:w-56" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">Todos los estados</option>
          <option value="valid">🟢 Al día</option>
          <option value="expiring_soon">🟡 Por vencer</option>
          <option value="overdue">🔴 Vencido</option>
          <option value="unknown">⚪ Sin pagos</option>
        </select>
      </div>

      <div className="mt-4 glass rounded-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="text-left text-xs uppercase tracking-widest text-white/40 border-b border-white/5">
              <th className="p-3">Atleta</th>
              <th className="p-3">Paquete</th>
              <th className="p-3">Último pago</th>
              <th className="p-3">Próximo vto.</th>
              <th className="p-3">Monto adeudado</th>
              <th className="p-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubs.map(s => (
              <tr key={s.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="p-3 text-white">{s.full_name}</td>
                <td className="p-3 text-white/60">{s.package?.name || "—"}</td>
                <td className="p-3 text-white/60">{fmtDate(s.last_payment?.payment_date)}</td>
                <td className="p-3 text-white/60">{fmtDate(s.next_due_date)}</td>
                <td className="p-3 text-[#E63946]">{s.payment_status === "overdue" && s.package ? fmtCurrency(s.package.monthly_cost) : "—"}</td>
                <td className="p-3"><span className={`badge-status ${statusClass(s.payment_status)}`}>{statusLabel(s.payment_status)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="font-display text-2xl text-white mt-10">Historial completo de pagos</h2>
      <div className="mt-4 glass rounded-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="text-left text-xs uppercase tracking-widest text-white/40 border-b border-white/5">
              <th className="p-3">Fecha</th><th className="p-3">Atleta</th><th className="p-3">Tipo</th><th className="p-3">Método</th><th className="p-3">Monto</th><th className="p-3">Registrado por</th><th></th>
            </tr>
          </thead>
          <tbody>
            {items.map(p => (
              <tr key={p.id} className="border-b border-white/5 text-white/80">
                <td className="p-3">{fmtDate(p.payment_date)}</td>
                <td className="p-3 text-white">{p.subscriber_name || "—"}</td>
                <td className="p-3 capitalize">{p.type}</td>
                <td className="p-3 capitalize flex items-center gap-1"><CreditCard size={12} /> {p.method}</td>
                <td className="p-3 text-[#E63946] font-bold">{fmtCurrency(p.amount)}</td>
                <td className="p-3 text-white/40">{p.recorded_by}</td>
                <td className="p-3 text-right"><button onClick={() => del(p.id)} className="text-red-400"><Trash2 size={14} /></button></td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-white/40">Sin pagos</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
