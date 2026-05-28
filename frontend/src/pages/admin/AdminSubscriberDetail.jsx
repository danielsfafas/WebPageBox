import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import { fmtDate, fileToBase64, fmtCurrency } from "@/lib/utils-app";
import { ArrowLeft, Plus, Trash2, Upload, User, X, Camera, Activity, Calendar } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const emptyRec = { weight_kg: "", height_cm: "", chest_cm: "", waist_cm: "", hip_cm: "", biceps_cm: "", thigh_cm: "", calf_cm: "", body_fat_pct: "", notes: "", date: new Date().toISOString().slice(0, 10) };

export default function AdminSubscriberDetail() {
  const { id } = useParams();
  const [sub, setSub] = useState(null);
  const [tab, setTab] = useState("info");
  const [recOpen, setRecOpen] = useState(false);
  const [rec, setRec] = useState(emptyRec);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [mediaData, setMediaData] = useState({ data: "", type: "image", note: "", date: new Date().toISOString().slice(0, 10) });
  const [payOpen, setPayOpen] = useState(false);
  const [payForm, setPayForm] = useState({ amount: 0, method: "cash", payment_date: new Date().toISOString().slice(0, 10), period_days: 30, notes: "", type: "monthly" });

  const load = () => api.get(`/admin/subscribers/${id}`).then(r => setSub(r.data));
  useEffect(() => { load(); }, [id]);

  if (!sub) return <div className="text-white/40">Cargando…</div>;

  const addRecord = async () => {
    const body = Object.fromEntries(Object.entries(rec).map(([k, v]) => [k, ["notes", "date"].includes(k) ? v : (v === "" ? null : Number(v))]));
    body.date = new Date(body.date).toISOString();
    await api.post(`/admin/subscribers/${id}/progress`, body);
    toast.success("Registro agregado");
    setRecOpen(false);
    setRec(emptyRec);
    load();
  };

  const delRecord = async (rid) => {
    if (!window.confirm("Eliminar registro?")) return;
    await api.delete(`/admin/subscribers/${id}/progress/${rid}`);
    load();
  };

  const addMedia = async () => {
    if (!mediaData.data) { toast.error("Carga un archivo"); return; }
    const body = { ...mediaData, date: new Date(mediaData.date).toISOString() };
    await api.post(`/admin/subscribers/${id}/media`, body);
    toast.success("Multimedia agregada");
    setMediaOpen(false);
    setMediaData({ data: "", type: "image", note: "", date: new Date().toISOString().slice(0, 10) });
    load();
  };

  const delMedia = async (mid) => {
    if (!window.confirm("Eliminar multimedia?")) return;
    await api.delete(`/admin/subscribers/${id}/media/${mid}`);
    load();
  };

  const onMediaFile = async (f) => {
    if (!f) return;
    const type = f.type.startsWith("video") ? "video" : "image";
    setMediaData({ ...mediaData, type, data: await fileToBase64(f) });
  };

  const addPayment = async () => {
    const body = {
      ...payForm,
      subscriber_id: id,
      amount: Number(payForm.amount),
      period_days: Number(payForm.period_days),
      payment_date: new Date(payForm.payment_date).toISOString(),
    };
    await api.post("/admin/payments", body);
    toast.success("Pago registrado");
    setPayOpen(false);
    setPayForm({ amount: 0, method: "cash", payment_date: new Date().toISOString().slice(0, 10), period_days: 30, notes: "", type: "monthly" });
    load();
  };

  const chartData = (sub.progress_records || []).map(r => ({
    date: new Date(r.date).toLocaleDateString("es-MX", { day: "2-digit", month: "short" }),
    Peso: r.weight_kg,
    Cintura: r.waist_cm,
    Pecho: r.chest_cm,
    Cadera: r.hip_cm,
  }));

  return (
    <div data-testid="subscriber-detail-page">
      <Link to="/admin/suscriptores" className="text-sm text-white/50 hover:text-white inline-flex items-center gap-1 mb-4"><ArrowLeft size={14} /> Volver</Link>
      <div className="glass p-6 rounded-sm flex flex-wrap items-center gap-6">
        <div className="h-24 w-24 rounded-full overflow-hidden bg-white/5 grid place-items-center shrink-0">
          {sub.profile_photo ? <img src={sub.profile_photo} className="h-full w-full object-cover" /> : <User size={36} className="text-white/30" />}
        </div>
        <div className="flex-1 min-w-[240px]">
          <h1 className="font-display text-4xl text-white">{sub.full_name}</h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/60 mt-1">
            <span>📧 {sub.email || "—"}</span>
            <span>📞 {sub.phone || "—"}</span>
            <span>📅 Inscrito {fmtDate(sub.enrolled_at)}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {sub.package && <span className="badge-status badge-valid">{sub.package.name}</span>}
            <span className={`badge-status ${sub.payment_status === "valid" ? "badge-valid" : sub.payment_status === "expiring_soon" ? "badge-soon" : sub.payment_status === "overdue" ? "badge-overdue" : "bg-white/5 text-white/40 border border-white/10"}`}>
              {sub.payment_status === "valid" ? "Al día" : sub.payment_status === "expiring_soon" ? "Por vencer" : sub.payment_status === "overdue" ? "Vencido" : "Sin pagos"}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 border-b border-white/5 flex gap-1 overflow-x-auto">
        {[
          { k: "info", l: "Información" },
          { k: "progress", l: "Progreso físico" },
          { k: "media", l: "Galería" },
          { k: "payments", l: "Pagos" },
        ].map(t => (
          <button
            key={t.k}
            data-testid={`tab-${t.k}`}
            onClick={() => setTab(t.k)}
            className={`px-4 py-2 text-sm uppercase tracking-widest font-display ${tab === t.k ? "text-white border-b-2 border-[#E63946]" : "text-white/40 hover:text-white"}`}
          >
            {t.l}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "info" && (
          <div className="grid md:grid-cols-2 gap-4">
            {[
              ["Género", sub.gender],
              ["Nacimiento", fmtDate(sub.birth_date)],
              ["Contacto emergencia", sub.emergency_contact_name],
              ["Tel. emergencia", sub.emergency_contact_phone],
              ["Objetivo", sub.fitness_goal || "—"],
            ].map(([k, v], i) => (
              <div key={i} className="glass p-4 rounded-sm">
                <div className="text-xs uppercase tracking-widest text-white/40">{k}</div>
                <div className="text-white mt-1">{v || "—"}</div>
              </div>
            ))}
          </div>
        )}

        {tab === "progress" && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display text-2xl text-white">Registros físicos</h3>
              <button onClick={() => setRecOpen(true)} className="btn-primary text-sm" data-testid="new-progress-btn"><Plus size={14} /> Nuevo registro</button>
            </div>
            {chartData.length > 1 && (
              <div className="glass p-4 rounded-sm mb-4">
                <div className="text-xs uppercase tracking-widest text-white/40 mb-2"><Activity className="inline" size={12} /> Evolución</div>
                <div className="h-72">
                  <ResponsiveContainer>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                      <XAxis dataKey="date" tick={{ fill: "#888", fontSize: 11 }} />
                      <YAxis tick={{ fill: "#888", fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: "#0A0A0A", border: "1px solid #222", color: "#fff" }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="Peso" stroke="#E63946" strokeWidth={2} />
                      <Line type="monotone" dataKey="Cintura" stroke="#FFD700" strokeWidth={2} />
                      <Line type="monotone" dataKey="Pecho" stroke="#22C55E" strokeWidth={2} />
                      <Line type="monotone" dataKey="Cadera" stroke="#3B82F6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            <div className="glass rounded-sm overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-widest text-white/40 border-b border-white/5">
                    <th className="p-3">Fecha</th><th className="p-3">Peso</th><th className="p-3">Cintura</th><th className="p-3">Pecho</th><th className="p-3">Cadera</th><th className="p-3">Bíceps</th><th className="p-3">%Grasa</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {(sub.progress_records || []).map(r => (
                    <tr key={r.id} className="border-b border-white/5 text-white/80">
                      <td className="p-3">{fmtDate(r.date)}</td>
                      <td className="p-3">{r.weight_kg ?? "—"} kg</td>
                      <td className="p-3">{r.waist_cm ?? "—"} cm</td>
                      <td className="p-3">{r.chest_cm ?? "—"} cm</td>
                      <td className="p-3">{r.hip_cm ?? "—"} cm</td>
                      <td className="p-3">{r.biceps_cm ?? "—"} cm</td>
                      <td className="p-3">{r.body_fat_pct ?? "—"} %</td>
                      <td className="p-3 text-right"><button onClick={() => delRecord(r.id)} className="text-red-400"><Trash2 size={14} /></button></td>
                    </tr>
                  ))}
                  {(sub.progress_records || []).length === 0 && <tr><td colSpan={8} className="text-center py-10 text-white/40">Sin registros</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === "media" && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display text-2xl text-white">Galería cronológica</h3>
              <button onClick={() => setMediaOpen(true)} className="btn-primary text-sm" data-testid="new-media-btn"><Camera size={14} /> Agregar</button>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {(sub.media || []).map(m => (
                <div key={m.id} className="glass rounded-sm overflow-hidden">
                  {m.type === "image" ? (
                    <img src={m.data} className="w-full h-48 object-cover" />
                  ) : (
                    <video src={m.data} controls className="w-full h-48 object-cover bg-black" />
                  )}
                  <div className="p-3">
                    <div className="text-xs text-white/40">{fmtDate(m.date)}</div>
                    <div className="text-sm text-white mt-1 line-clamp-2">{m.note}</div>
                    <button onClick={() => delMedia(m.id)} className="text-xs text-red-400 mt-2"><Trash2 className="inline" size={12} /> Eliminar</button>
                  </div>
                </div>
              ))}
              {(sub.media || []).length === 0 && <div className="md:col-span-3 lg:col-span-4 glass p-10 text-center text-white/40">No hay multimedia aún.</div>}
            </div>
          </>
        )}

        {tab === "payments" && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display text-2xl text-white">Historial de pagos</h3>
              <button onClick={() => setPayOpen(true)} className="btn-primary text-sm" data-testid="new-payment-btn"><Plus size={14} /> Registrar pago</button>
            </div>
            <div className="glass rounded-sm overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-widest text-white/40 border-b border-white/5">
                    <th className="p-3">Fecha</th><th className="p-3">Tipo</th><th className="p-3">Método</th><th className="p-3">Monto</th><th className="p-3">Próximo vto.</th><th className="p-3">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {(sub.payments || []).map(p => (
                    <tr key={p.id} className="border-b border-white/5 text-white/80">
                      <td className="p-3">{fmtDate(p.payment_date)}</td>
                      <td className="p-3 capitalize">{p.type}</td>
                      <td className="p-3 capitalize">{p.method}</td>
                      <td className="p-3 text-[#E63946] font-bold">{fmtCurrency(p.amount)}</td>
                      <td className="p-3">{fmtDate(p.next_due_date)}</td>
                      <td className="p-3 text-white/50">{p.notes}</td>
                    </tr>
                  ))}
                  {(sub.payments || []).length === 0 && <tr><td colSpan={6} className="text-center py-10 text-white/40">Sin pagos</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {recOpen && (
        <Modal title="Nuevo registro físico" onClose={() => setRecOpen(false)} onSave={addRecord}>
          <div className="grid md:grid-cols-3 gap-3">
            <Field label="Fecha"><input type="date" className="input-dark mt-1" value={rec.date} onChange={(e) => setRec({ ...rec, date: e.target.value })} /></Field>
            <Field label="Peso (kg)"><input type="number" step="0.1" className="input-dark mt-1" value={rec.weight_kg} onChange={(e) => setRec({ ...rec, weight_kg: e.target.value })} /></Field>
            <Field label="Altura (cm)"><input type="number" step="0.1" className="input-dark mt-1" value={rec.height_cm} onChange={(e) => setRec({ ...rec, height_cm: e.target.value })} /></Field>
            <Field label="Pecho (cm)"><input type="number" step="0.1" className="input-dark mt-1" value={rec.chest_cm} onChange={(e) => setRec({ ...rec, chest_cm: e.target.value })} /></Field>
            <Field label="Cintura (cm)"><input type="number" step="0.1" className="input-dark mt-1" value={rec.waist_cm} onChange={(e) => setRec({ ...rec, waist_cm: e.target.value })} /></Field>
            <Field label="Cadera (cm)"><input type="number" step="0.1" className="input-dark mt-1" value={rec.hip_cm} onChange={(e) => setRec({ ...rec, hip_cm: e.target.value })} /></Field>
            <Field label="Bíceps (cm)"><input type="number" step="0.1" className="input-dark mt-1" value={rec.biceps_cm} onChange={(e) => setRec({ ...rec, biceps_cm: e.target.value })} /></Field>
            <Field label="Muslo (cm)"><input type="number" step="0.1" className="input-dark mt-1" value={rec.thigh_cm} onChange={(e) => setRec({ ...rec, thigh_cm: e.target.value })} /></Field>
            <Field label="Pantorrilla (cm)"><input type="number" step="0.1" className="input-dark mt-1" value={rec.calf_cm} onChange={(e) => setRec({ ...rec, calf_cm: e.target.value })} /></Field>
            <Field label="% Grasa corporal"><input type="number" step="0.1" className="input-dark mt-1" value={rec.body_fat_pct} onChange={(e) => setRec({ ...rec, body_fat_pct: e.target.value })} /></Field>
          </div>
          <Field label="Notas"><textarea rows={2} className="input-dark mt-1 resize-none" value={rec.notes} onChange={(e) => setRec({ ...rec, notes: e.target.value })} /></Field>
        </Modal>
      )}

      {mediaOpen && (
        <Modal title="Agregar multimedia" onClose={() => setMediaOpen(false)} onSave={addMedia}>
          <Field label="Archivo (imagen o video)"><input type="file" accept="image/*,video/*" className="input-dark mt-1" onChange={(e) => onMediaFile(e.target.files?.[0])} /></Field>
          {mediaData.data && mediaData.type === "image" && <img src={mediaData.data} className="max-h-48 rounded-sm" />}
          {mediaData.data && mediaData.type === "video" && <video src={mediaData.data} controls className="max-h-48" />}
          <Field label="Fecha"><input type="date" className="input-dark mt-1" value={mediaData.date} onChange={(e) => setMediaData({ ...mediaData, date: e.target.value })} /></Field>
          <Field label="Nota"><textarea rows={2} className="input-dark mt-1 resize-none" value={mediaData.note} onChange={(e) => setMediaData({ ...mediaData, note: e.target.value })} placeholder="Antes / después / observación" /></Field>
        </Modal>
      )}

      {payOpen && (
        <Modal title="Registrar pago" onClose={() => setPayOpen(false)} onSave={addPayment}>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Tipo"><select className="input-dark mt-1" value={payForm.type} onChange={(e) => setPayForm({ ...payForm, type: e.target.value })}><option value="monthly">Mensualidad</option><option value="inscription">Inscripción</option></select></Field>
            <Field label="Método"><select className="input-dark mt-1" value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}><option value="cash">Efectivo</option><option value="transfer">Transferencia</option><option value="online">En línea</option></select></Field>
            <Field label="Monto"><input type="number" step="0.01" className="input-dark mt-1" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} /></Field>
            <Field label="Fecha de pago"><input type="date" className="input-dark mt-1" value={payForm.payment_date} onChange={(e) => setPayForm({ ...payForm, payment_date: e.target.value })} /></Field>
            <Field label="Periodo (días)"><input type="number" className="input-dark mt-1" value={payForm.period_days} onChange={(e) => setPayForm({ ...payForm, period_days: e.target.value })} /></Field>
          </div>
          <Field label="Notas"><textarea rows={2} className="input-dark mt-1 resize-none" value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} /></Field>
        </Modal>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-widest text-white/60">{label}</label>
      {children}
    </div>
  );
}

function Modal({ title, children, onClose, onSave }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="glass-strong max-w-2xl w-full rounded-sm my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div className="font-display text-2xl text-white">{title}</div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X /></button>
        </div>
        <div className="p-5 space-y-3">{children}</div>
        <div className="p-5 border-t border-white/5 flex justify-end gap-3">
          <button onClick={onClose} className="btn-outline text-sm py-2">Cancelar</button>
          <button onClick={onSave} className="btn-primary text-sm py-2">Guardar</button>
        </div>
      </div>
    </div>
  );
}
