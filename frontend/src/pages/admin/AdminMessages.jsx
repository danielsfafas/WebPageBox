import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { fmtDateTime } from "@/lib/utils-app";
import { Trash2, Mail, Phone, Eye } from "lucide-react";

export default function AdminMessages() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(null);

  const load = () => api.get("/admin/messages").then(r => setItems(r.data));
  useEffect(() => { load(); }, []);

  const del = async (id) => {
    if (!window.confirm("¿Eliminar mensaje?")) return;
    await api.delete(`/admin/messages/${id}`);
    toast.success("Eliminado");
    load();
  };

  const view = async (m) => {
    setOpen(m);
    if (!m.read) {
      await api.put(`/admin/messages/${m.id}/read`);
      load();
    }
  };

  return (
    <div data-testid="admin-messages-page">
      <div className="text-xs uppercase tracking-[0.3em] text-[#E63946]">Bandeja</div>
      <h1 className="font-display text-4xl text-white mt-1">Mensajes de contacto</h1>

      <div className="mt-6 glass rounded-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="text-left text-xs uppercase tracking-widest text-white/40 border-b border-white/5">
              <th className="p-3">Fecha</th><th className="p-3">Nombre</th><th className="p-3">Email</th><th className="p-3">Teléfono</th><th className="p-3">Estado</th><th></th>
            </tr>
          </thead>
          <tbody>
            {items.map(m => (
              <tr key={m.id} className={`border-b border-white/5 hover:bg-white/[0.02] ${!m.read ? "bg-[#E63946]/5" : ""}`}>
                <td className="p-3 text-white/60">{fmtDateTime(m.created_at)}</td>
                <td className="p-3 text-white">{m.name}</td>
                <td className="p-3 text-white/60">{m.email}</td>
                <td className="p-3 text-white/60">{m.phone || "—"}</td>
                <td className="p-3"><span className={`badge-status ${m.read ? "badge-valid" : "badge-soon"}`}>{m.read ? "Leído" : "Nuevo"}</span></td>
                <td className="p-3 text-right space-x-2 whitespace-nowrap">
                  <button onClick={() => view(m)} className="text-white/60 hover:text-[#FFD700]"><Eye size={16} /></button>
                  <button onClick={() => del(m.id)} className="text-red-400"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-white/40">Sin mensajes</td></tr>}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setOpen(null)}>
          <div className="glass-strong max-w-lg w-full p-6 rounded-sm" onClick={(e) => e.stopPropagation()}>
            <div className="font-display text-3xl text-white">{open.name}</div>
            <div className="mt-2 text-sm text-white/60 space-y-1">
              <div className="flex gap-1 items-center"><Mail size={12} /> {open.email}</div>
              {open.phone && <div className="flex gap-1 items-center"><Phone size={12} /> {open.phone}</div>}
              <div className="text-xs text-white/40">{fmtDateTime(open.created_at)}</div>
            </div>
            <div className="mt-4 p-4 bg-black/40 rounded-sm text-white/80 whitespace-pre-line">{open.message}</div>
            <button onClick={() => setOpen(null)} className="btn-outline w-full justify-center mt-4">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
