import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { fmtDateTime, fileToBase64 } from "@/lib/utils-app";
import { Plus, Pencil, Trash2, X, Upload, Calendar, MapPin } from "lucide-react";

const empty = {
  title: "", type: "fight", date: new Date().toISOString().slice(0, 16),
  location: "", description: "", poster: null, registration_url: "",
  active: true, priority: 0,
};

export default function AdminEvents() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const load = () => api.get("/admin/events").then(r => setItems(r.data));
  useEffect(() => { load(); }, []);

  const startNew = () => { setForm(empty); setEditing(null); setOpen(true); };
  const startEdit = (e) => {
    setForm({ ...empty, ...e, date: e.date ? new Date(e.date).toISOString().slice(0, 16) : "" });
    setEditing(e.id);
    setOpen(true);
  };

  const save = async () => {
    try {
      const body = { ...form, priority: Number(form.priority), date: new Date(form.date).toISOString() };
      if (editing) await api.put(`/admin/events/${editing}`, body);
      else await api.post("/admin/events", body);
      toast.success("Evento guardado");
      setOpen(false);
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Error"); }
  };

  const del = async (id) => {
    if (!window.confirm("¿Eliminar evento?")) return;
    await api.delete(`/admin/events/${id}`);
    toast.success("Eliminado");
    load();
  };

  const onPoster = async (f) => {
    if (!f) return;
    const b64 = await fileToBase64(f);
    setForm((s) => ({ ...s, poster: b64 }));
  };

  return (
    <div data-testid="admin-events-page">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-[#E63946]">Agenda</div>
          <h1 className="font-display text-4xl text-white mt-1">Eventos</h1>
        </div>
        <button onClick={startNew} className="btn-primary text-sm"><Plus size={14} /> Nuevo evento</button>
      </div>

      <div className="mt-6 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(e => (
          <div key={e.id} className="glass rounded-sm overflow-hidden">
            {e.poster ? <div className="h-40 bg-cover bg-center" style={{ backgroundImage: `url(${e.poster})` }} /> : <div className="h-40 bg-white/5 grid place-items-center text-white/20"><Calendar size={32} /></div>}
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-widest text-[#FFD700]">{e.type}</div>
                <span className={`badge-status ${e.active ? "badge-valid" : "badge-overdue"}`}>{e.active ? "Activo" : "Inactivo"}</span>
              </div>
              <h3 className="font-display text-xl text-white mt-1">{e.title}</h3>
              <div className="text-xs text-white/60 mt-1"><Calendar className="inline" size={11} /> {fmtDateTime(e.date)}</div>
              {e.location && <div className="text-xs text-white/60 mt-0.5"><MapPin className="inline" size={11} /> {e.location}</div>}
              <div className="mt-3 flex gap-2">
                <button onClick={() => startEdit(e)} className="btn-outline text-xs py-1.5"><Pencil size={12} /> Editar</button>
                <button onClick={() => del(e.id)} className="text-red-400 ml-auto"><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="glass p-10 text-center text-white/40 md:col-span-3">No hay eventos</div>}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-start justify-center p-4 overflow-y-auto" onClick={() => setOpen(false)}>
          <div className="glass-strong max-w-2xl w-full rounded-sm my-8" onClick={(ev) => ev.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <div className="font-display text-2xl text-white">{editing ? "Editar evento" : "Nuevo evento"}</div>
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white"><X /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/60">Título</label>
                  <input className="input-dark mt-1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/60">Tipo</label>
                  <select className="input-dark mt-1" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option value="fight">Combate</option>
                    <option value="tournament">Torneo</option>
                    <option value="internal">Evento interno</option>
                    <option value="seminar">Seminario</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/60">Fecha y hora</label>
                  <input type="datetime-local" className="input-dark mt-1" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/60">Ubicación</label>
                  <input className="input-dark mt-1" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-white/60">Descripción</label>
                <textarea rows={3} className="input-dark mt-1 resize-none" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-white/60">Póster</label>
                <div className="mt-2 flex items-center gap-3">
                  {form.poster && <img src={form.poster} className="h-24 rounded-sm" />}
                  <label className="btn-outline text-xs py-2 cursor-pointer">
                    <Upload size={12} /> Subir imagen
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => onPoster(e.target.files?.[0])} />
                  </label>
                  {form.poster && <button onClick={() => setForm({ ...form, poster: null })} className="text-red-400 text-xs">Quitar</button>}
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/60">URL Registro</label>
                  <input className="input-dark mt-1" value={form.registration_url || ""} onChange={(e) => setForm({ ...form, registration_url: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/60">Prioridad</label>
                  <input type="number" className="input-dark mt-1" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/60">Estado</label>
                  <select className="input-dark mt-1" value={form.active ? "1" : "0"} onChange={(e) => setForm({ ...form, active: e.target.value === "1" })}>
                    <option value="1">Activo</option>
                    <option value="0">Inactivo</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-white/5 flex justify-end gap-3">
              <button onClick={() => setOpen(false)} className="btn-outline text-sm py-2">Cancelar</button>
              <button onClick={save} className="btn-primary text-sm py-2">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
