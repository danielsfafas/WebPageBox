import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import { fmtDate } from "@/lib/utils-app";
import ProfilePhotoField from "@/components/ProfilePhotoField";
import { Plus, Pencil, Trash2, Search, X, User, Eye } from "lucide-react";

const empty = {
  full_name: "", birth_date: "", gender: "", phone: "", email: "",
  emergency_contact_name: "", emergency_contact_phone: "", profile_photo: null,
  package_id: "", active: true, fitness_goal: "", username: "", password: "", password_confirm: "",
};

const toSubscriberPayload = (form, { isEdit }) => {
  const payload = {
    full_name: form.full_name?.trim() || "",
    birth_date: form.birth_date || null,
    gender: form.gender || "",
    phone: form.phone || "",
    email: form.email || "",
    emergency_contact_name: form.emergency_contact_name || "",
    emergency_contact_phone: form.emergency_contact_phone || "",
    profile_photo: form.profile_photo || null,
    package_id: form.package_id || null,
    active: Boolean(form.active),
    fitness_goal: form.fitness_goal || "",
    username: (form.username || "").trim().toLowerCase(),
  };
  const pwd = (form.password || "").trim();
  if (isEdit) {
    if (pwd) payload.password = pwd;
  } else {
    payload.password = pwd;
  }
  return payload;
};

const subscriberToForm = (s) => ({
  ...empty,
  full_name: s.full_name || "",
  birth_date: s.birth_date || "",
  gender: s.gender || "",
  phone: s.phone || "",
  email: s.email || "",
  emergency_contact_name: s.emergency_contact_name || "",
  emergency_contact_phone: s.emergency_contact_phone || "",
  profile_photo: s.profile_photo || null,
  package_id: s.package_id || "",
  active: s.active !== false,
  fitness_goal: s.fitness_goal || "",
  username: s.username || "",
  password: "",
  password_confirm: "",
});

export default function AdminSubscribers() {
  const [items, setItems] = useState([]);
  const [packages, setPackages] = useState([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const load = () => api.get("/admin/subscribers").then(r => setItems(r.data));
  useEffect(() => { load(); api.get("/admin/packages").then(r => setPackages(r.data)); }, []);

  const startNew = () => { setForm(empty); setEditing(null); setOpen(true); };
  const startEdit = (s) => { setForm(subscriberToForm(s)); setEditing(s.id); setOpen(true); };

  const save = async () => {
    const pwd = (form.password || "").trim();
    const pwdConfirm = (form.password_confirm || "").trim();
    if (!editing && !pwd) {
      toast.error("La contraseña es obligatoria para nuevos suscriptores");
      return;
    }
    if (pwd && pwd.length < 4) {
      toast.error("La contraseña debe tener al menos 4 caracteres");
      return;
    }
    if (pwd && pwd !== pwdConfirm) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    const payload = toSubscriberPayload(form, { isEdit: Boolean(editing) });
    if (!(payload.username || "").trim()) {
      toast.error("El usuario de acceso es obligatorio");
      return;
    }
    try {
      if (editing) await api.put(`/admin/subscribers/${editing}`, payload);
      else await api.post("/admin/subscribers", payload);
      toast.success(editing && pwd ? "Suscriptor y contraseña actualizados" : "Suscriptor guardado");
      setOpen(false);
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Error"); }
  };

  const del = async (id) => {
    if (!window.confirm("¿Eliminar suscriptor y todo su historial?")) return;
    await api.delete(`/admin/subscribers/${id}`);
    toast.success("Eliminado");
    load();
  };

  const statusClass = (s) => ({
    valid: "badge-valid",
    expiring_soon: "badge-soon",
    overdue: "badge-overdue",
    unknown: "bg-white/5 text-white/40 border border-white/10",
  }[s] || "badge-status");

  const statusLabel = (s) => ({ valid: "Al día", expiring_soon: "Próximo a vencer", overdue: "Vencido", unknown: "Sin pagos" }[s] || s);

  const filtered = items.filter(i => {
    if (filter !== "all" && i.payment_status !== filter) return false;
    return i.full_name.toLowerCase().includes(q.toLowerCase()) || (i.email || "").toLowerCase().includes(q.toLowerCase());
  });

  return (
    <div data-testid="admin-subscribers-page">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-[#E63946]">Atletas</div>
          <h1 className="font-display text-4xl text-white mt-1">Suscriptores</h1>
        </div>
        <button onClick={startNew} className="btn-primary text-sm" data-testid="new-subscriber-btn"><Plus size={14} /> Nuevo suscriptor</button>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
          <input className="input-dark pl-10" placeholder="Buscar por nombre o email…" value={q} onChange={(e) => setQ(e.target.value)} data-testid="subscribers-search" />
        </div>
        <select className="input-dark md:w-56" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">Todos los estados</option>
          <option value="valid">🟢 Al día</option>
          <option value="expiring_soon">🟡 Próximo a vencer</option>
          <option value="overdue">🔴 Vencido</option>
          <option value="unknown">⚪ Sin pagos</option>
        </select>
      </div>

      <div className="mt-6 glass rounded-sm overflow-x-auto" data-testid="subscribers-table">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="text-left text-xs uppercase tracking-widest text-white/40 border-b border-white/5">
              <th className="p-3">Atleta</th>
              <th className="p-3">Paquete</th>
              <th className="p-3">Último pago</th>
              <th className="p-3">Próxima fecha</th>
              <th className="p-3">Estado pago</th>
              <th className="p-3">Activo</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id} className="border-b border-white/5 hover:bg-white/[0.02]" data-testid="subscriber-row">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    {s.profile_photo ? <img src={s.profile_photo} className="h-10 w-10 object-cover rounded-full" /> : <div className="h-10 w-10 grid place-items-center bg-white/5 rounded-full"><User size={16} /></div>}
                    <div>
                      <div className="text-white font-medium">{s.full_name}</div>
                      <div className="text-xs text-white/40">{s.email}</div>
                    </div>
                  </div>
                </td>
                <td className="p-3 text-white/70">{s.package?.name || "—"}</td>
                <td className="p-3 text-white/60">{fmtDate(s.last_payment?.payment_date)}</td>
                <td className="p-3 text-white/60">{fmtDate(s.next_due_date)}</td>
                <td className="p-3"><span className={`badge-status ${statusClass(s.payment_status)}`}>{statusLabel(s.payment_status)}</span></td>
                <td className="p-3"><span className={`badge-status ${s.active ? "badge-valid" : "badge-overdue"}`}>{s.active ? "Sí" : "No"}</span></td>
                <td className="p-3 text-right space-x-2 whitespace-nowrap">
                  <Link to={`/admin/suscriptores/${s.id}`} className="text-white/60 hover:text-[#FFD700] inline-flex"><Eye size={16} /></Link>
                  <button onClick={() => startEdit(s)} className="text-white/60 hover:text-[#FFD700]"><Pencil size={16} /></button>
                  <button onClick={() => del(s.id)} className="text-white/60 hover:text-red-400"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-white/40">No hay suscriptores</td></tr>}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-start justify-center p-4 overflow-y-auto" onClick={() => setOpen(false)}>
          <div className="glass-strong max-w-2xl w-full rounded-sm my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <div className="font-display text-2xl text-white">{editing ? "Editar suscriptor" : "Nuevo suscriptor"}</div>
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white"><X /></button>
            </div>
            <div className="p-5 space-y-4">
              <ProfilePhotoField
                value={form.profile_photo}
                onChange={(profile_photo) => setForm((s) => ({ ...s, profile_photo }))}
              />
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/60">Nombre completo</label>
                  <input className="input-dark mt-1" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/60">Fecha nacimiento</label>
                  <input type="date" className="input-dark mt-1" value={form.birth_date?.slice(0, 10) || ""} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/60">Género</label>
                  <select className="input-dark mt-1" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                    <option value="">—</option>
                    <option value="male">Masculino</option>
                    <option value="female">Femenino</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/60">Teléfono</label>
                  <input className="input-dark mt-1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs uppercase tracking-widest text-white/60">Email</label>
                  <input type="email" className="input-dark mt-1" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/60">Usuario de acceso</label>
                  <input className="input-dark mt-1" value={form.username || ""} onChange={(e) => setForm({ ...form, username: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/60">{editing ? "Nueva contraseña" : "Contraseña"}</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    className="input-dark mt-1"
                    placeholder={editing ? "Dejar vacío para no cambiar" : ""}
                    value={form.password || ""}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                  {editing && (
                    <p className="text-[10px] text-white/40 mt-1">Completa solo si quieres cambiar la contraseña del portal /mi</p>
                  )}
                </div>
                {(form.password || !editing) && (
                  <div>
                    <label className="text-xs uppercase tracking-widest text-white/60">
                      {editing ? "Confirmar nueva contraseña" : "Confirmar contraseña"}
                    </label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      className="input-dark mt-1"
                      value={form.password_confirm || ""}
                      onChange={(e) => setForm({ ...form, password_confirm: e.target.value })}
                    />
                  </div>
                )}
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/60">Contacto emergencia (nombre)</label>
                  <input className="input-dark mt-1" value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/60">Contacto emergencia (teléfono)</label>
                  <input className="input-dark mt-1" value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/60">Paquete</label>
                  <select className="input-dark mt-1" value={form.package_id || ""} onChange={(e) => setForm({ ...form, package_id: e.target.value })}>
                    <option value="">—</option>
                    {packages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/60">Estado</label>
                  <select className="input-dark mt-1" value={form.active ? "1" : "0"} onChange={(e) => setForm({ ...form, active: e.target.value === "1" })}>
                    <option value="1">Activo</option>
                    <option value="0">Inactivo</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs uppercase tracking-widest text-white/60">Objetivo / notas</label>
                  <textarea rows={2} className="input-dark mt-1 resize-none" value={form.fitness_goal} onChange={(e) => setForm({ ...form, fitness_goal: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-white/5 flex justify-end gap-3">
              <button onClick={() => setOpen(false)} className="btn-outline text-sm py-2">Cancelar</button>
              <button onClick={save} className="btn-primary text-sm py-2" data-testid="save-subscriber">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
