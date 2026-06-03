import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { fmtCurrency, getOfferTimeLeft } from "@/lib/utils-app";
import OfferCountdown from "@/components/OfferCountdown";
import { Plus, Pencil, Trash2, X, BarChart3 } from "lucide-react";

const empty = {
  name: "", description: "", inscription_cost: 0, monthly_cost: 0,
  duration: "monthly", duration_days: 30, offer_expires_at: null, benefits: [], active: true,
};

export default function AdminPackages() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [benefitInput, setBenefitInput] = useState("");
  const [analyticsOpen, setAnalyticsOpen] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [now, setNow] = useState(Date.now());

  const load = () => api.get("/admin/packages").then(r => setItems(r.data));
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeLeft = (isoDate) => getOfferTimeLeft(isoDate, now);

  const startNew = () => { setForm(empty); setEditing(null); setOpen(true); };
  const startEdit = (p) => { setForm({ ...empty, ...p }); setEditing(p.id); setOpen(true); };

  const save = async () => {
    try {
      const body = { ...form, inscription_cost: Number(form.inscription_cost), monthly_cost: Number(form.monthly_cost), duration_days: Number(form.duration_days) };
      if (editing) await api.put(`/admin/packages/${editing}`, body);
      else await api.post("/admin/packages", body);
      toast.success("Paquete guardado");
      setOpen(false);
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Error"); }
  };

  const del = async (id) => {
    if (!window.confirm("¿Eliminar paquete?")) return;
    await api.delete(`/admin/packages/${id}`);
    toast.success("Eliminado");
    load();
  };

  const viewAnalytics = async (pkg) => {
    const { data } = await api.get(`/admin/packages/${pkg.id}/analytics`);
    setAnalytics({ ...data, pkg });
    setAnalyticsOpen(true);
  };

  return (
    <div data-testid="admin-packages-page">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-[#E63946]">Membresías</div>
          <h1 className="font-display text-4xl text-white mt-1">Paquetes</h1>
        </div>
        <button onClick={startNew} className="btn-primary text-sm" data-testid="new-package-btn"><Plus size={14} /> Nuevo paquete</button>
      </div>

      <div className="mt-6 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(p => (
          <div key={p.id} className="glass p-5 rounded-sm" data-testid="package-card-admin">
            {(() => {
              const left = timeLeft(p.offer_expires_at);
              const isActive = p.active && !(left && left.expired);
              return (
                <>
            <div className="flex justify-between items-start">
              <div className="font-display text-2xl text-white">{p.name}</div>
              <span className={`badge-status ${isActive ? "badge-valid" : "badge-overdue"}`}>{isActive ? "Activo" : "Inactivo"}</span>
            </div>
            <p className="text-sm text-white/60 mt-1">{p.description}</p>
            <div className="mt-3 flex gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-white/40">Inscripción</div>
                <div className="text-white font-display text-xl">{fmtCurrency(p.inscription_cost)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-white/40">Mensual</div>
                <div className="text-[#E63946] font-display text-xl">{fmtCurrency(p.monthly_cost)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-white/40">Duración</div>
                <div className="text-white font-display text-xl">{p.duration_days} días</div>
              </div>
            </div>
            <OfferCountdown expiresAt={p.offer_expires_at} />
            <ul className="mt-3 space-y-1 max-h-24 overflow-auto">
              {(p.benefits || []).map((b, i) => <li key={i} className="text-xs text-white/60">▸ {b}</li>)}
            </ul>
            <div className="mt-4 flex gap-2">
              <button onClick={() => viewAnalytics(p)} className="btn-outline text-xs py-1.5"><BarChart3 size={12} /> Analítica</button>
              <button onClick={() => startEdit(p)} className="btn-outline text-xs py-1.5"><Pencil size={12} /> Editar</button>
              <button onClick={() => del(p.id)} className="text-red-400 ml-auto"><Trash2 size={14} /></button>
            </div>
                </>
              );
            })()}
          </div>
        ))}
        {items.length === 0 && <div className="glass p-10 text-center text-white/40 md:col-span-3">No hay paquetes</div>}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-start justify-center p-4 overflow-y-auto" onClick={() => setOpen(false)}>
          <div className="glass-strong max-w-2xl w-full rounded-sm my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <div className="font-display text-2xl text-white">{editing ? "Editar paquete" : "Nuevo paquete"}</div>
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white"><X /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs uppercase tracking-widest text-white/60">Nombre</label>
                <input className="input-dark mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-white/60">Descripción</label>
                <textarea rows={2} className="input-dark mt-1 resize-none" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/60">Costo inscripción (único)</label>
                  <input type="number" step="0.01" className="input-dark mt-1" value={form.inscription_cost} onChange={(e) => setForm({ ...form, inscription_cost: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/60">Costo mensual</label>
                  <input type="number" step="0.01" className="input-dark mt-1" value={form.monthly_cost} onChange={(e) => setForm({ ...form, monthly_cost: e.target.value })} />
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/60">Periodo</label>
                  <select className="input-dark mt-1" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })}>
                    <option value="monthly">Mensual</option>
                    <option value="quarterly">Trimestral</option>
                    <option value="yearly">Anual</option>
                    <option value="custom">Personalizado</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/60">Días duración</label>
                  <input type="number" className="input-dark mt-1" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/60">Expira oferta</label>
                  <input
                    type="datetime-local"
                    className="input-dark mt-1"
                    value={form.offer_expires_at ? form.offer_expires_at.slice(0, 16) : ""}
                    onChange={(e) => setForm({ ...form, offer_expires_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/60">Estado</label>
                  <select className="input-dark mt-1" value={form.active ? "1" : "0"} onChange={(e) => setForm({ ...form, active: e.target.value === "1" })}>
                    <option value="1">Activo</option>
                    <option value="0">Inactivo</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-white/60">Beneficios</label>
                <div className="flex gap-2 mt-1">
                  <input className="input-dark" value={benefitInput} onChange={(e) => setBenefitInput(e.target.value)} placeholder="Agregar beneficio (Enter)" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (benefitInput) { setForm({ ...form, benefits: [...form.benefits, benefitInput] }); setBenefitInput(""); } } }} />
                </div>
                <ul className="mt-2 space-y-1">
                  {form.benefits.map((b, i) => (
                    <li key={i} className="text-sm flex justify-between items-center bg-white/5 px-3 py-1 rounded-sm">
                      <span>▸ {b}</span>
                      <button onClick={() => setForm({ ...form, benefits: form.benefits.filter((_, j) => j !== i) })}><X size={12} /></button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="p-5 border-t border-white/5 flex justify-end gap-3">
              <button onClick={() => setOpen(false)} className="btn-outline text-sm py-2">Cancelar</button>
              <button onClick={save} className="btn-primary text-sm py-2" data-testid="save-package">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {analyticsOpen && analytics && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setAnalyticsOpen(false)}>
          <div className="glass-strong max-w-lg w-full rounded-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="font-display text-3xl text-white">{analytics.pkg.name}</div>
            <div className="text-xs text-white/40 uppercase tracking-widest">Analítica de rentabilidad</div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="glass p-4 rounded-sm">
                <div className="text-xs uppercase text-white/40">Suscriptores totales</div>
                <div className="font-display text-3xl text-white">{analytics.total_subscribers}</div>
              </div>
              <div className="glass p-4 rounded-sm">
                <div className="text-xs uppercase text-white/40">Activos</div>
                <div className="font-display text-3xl text-green-400">{analytics.active_subscribers}</div>
              </div>
              <div className="glass p-4 rounded-sm">
                <div className="text-xs uppercase text-white/40">Inactivos</div>
                <div className="font-display text-3xl text-white/60">{analytics.inactive_subscribers}</div>
              </div>
              <div className="glass p-4 rounded-sm">
                <div className="text-xs uppercase text-white/40">Ingresos totales</div>
                <div className="font-display text-3xl text-[#FFD700]">{fmtCurrency(analytics.total_revenue)}</div>
              </div>
            </div>
            <button onClick={() => setAnalyticsOpen(false)} className="btn-outline mt-6 w-full justify-center">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
