import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { fmtCurrency, fileToBase64 } from "@/lib/utils-app";
import { Plus, Pencil, Trash2, Search, X, Upload, Youtube } from "lucide-react";

const empty = {
  name: "", description: "", category: "", price: 0, stock: 0,
  images: [], youtube_url: "", video_clip: "", tags: [], active: true,
};

export default function AdminProducts() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [tagInput, setTagInput] = useState("");

  const load = () => api.get("/admin/products").then(r => setItems(r.data));
  useEffect(() => { load(); }, []);

  const startNew = () => { setForm(empty); setEditing(null); setOpen(true); };
  const startEdit = (p) => { setForm({ ...empty, ...p }); setEditing(p.id); setOpen(true); };

  const save = async () => {
    try {
      const body = { ...form, price: Number(form.price), stock: Number(form.stock) };
      if (editing) await api.put(`/admin/products/${editing}`, body);
      else await api.post("/admin/products", body);
      toast.success("Producto guardado");
      setOpen(false);
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Error al guardar"); }
  };

  const del = async (id) => {
    if (!window.confirm("¿Eliminar producto?")) return;
    await api.delete(`/admin/products/${id}`);
    toast.success("Eliminado");
    load();
  };

  const onImages = async (files) => {
    const arr = [];
    for (const f of files) arr.push(await fileToBase64(f));
    setForm((s) => ({ ...s, images: [...s.images, ...arr] }));
  };
  const onVideo = async (f) => {
    if (!f) return;
    const b64 = await fileToBase64(f);
    setForm((s) => ({ ...s, video_clip: b64 }));
  };

  const filtered = items.filter(i => (i.name + " " + (i.description || "")).toLowerCase().includes(q.toLowerCase()));

  return (
    <div data-testid="admin-products-page">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-[#E63946]">Tienda</div>
          <h1 className="font-display text-4xl text-white mt-1">Productos</h1>
        </div>
        <button onClick={startNew} className="btn-primary text-sm" data-testid="new-product-btn"><Plus size={14} /> Nuevo producto</button>
      </div>

      <div className="mt-6 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
        <input className="input-dark pl-10" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} data-testid="products-search" />
      </div>

      <div className="mt-6 glass rounded-sm overflow-hidden">
        <table className="w-full text-sm" data-testid="data-table">
          <thead>
            <tr className="text-left text-xs uppercase tracking-widest text-white/40 border-b border-white/5">
              <th className="p-3">Imagen</th>
              <th className="p-3">Nombre</th>
              <th className="p-3 hidden md:table-cell">Categoría</th>
              <th className="p-3">Precio</th>
              <th className="p-3 hidden md:table-cell">Stock</th>
              <th className="p-3">Estado</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="p-3">
                  {p.images?.[0] ? <img src={p.images[0]} className="h-12 w-12 object-cover rounded-sm" /> : <div className="h-12 w-12 bg-white/5 rounded-sm" />}
                </td>
                <td className="p-3 text-white">{p.name}</td>
                <td className="p-3 text-white/60 hidden md:table-cell">{p.category}</td>
                <td className="p-3 text-[#E63946] font-bold">{fmtCurrency(p.price)}</td>
                <td className="p-3 text-white/60 hidden md:table-cell">{p.stock}</td>
                <td className="p-3"><span className={`badge-status ${p.active ? "badge-valid" : "badge-overdue"}`}>{p.active ? "Activo" : "Inactivo"}</span></td>
                <td className="p-3 text-right space-x-2 whitespace-nowrap">
                  <button onClick={() => startEdit(p)} className="text-white/60 hover:text-[#FFD700]"><Pencil size={16} /></button>
                  <button onClick={() => del(p.id)} className="text-white/60 hover:text-red-400" data-testid={`delete-product-${p.id}`}><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-10 text-white/40">No hay productos</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-start justify-center p-4 overflow-y-auto" onClick={() => setOpen(false)}>
          <div className="glass-strong max-w-3xl w-full rounded-sm my-8" onClick={(e) => e.stopPropagation()} data-testid="product-modal">
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <div className="font-display text-2xl text-white">{editing ? "Editar producto" : "Nuevo producto"}</div>
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white"><X /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/60">Nombre</label>
                  <input className="input-dark mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/60">Categoría</label>
                  <input className="input-dark mt-1" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-white/60">Descripción</label>
                <textarea rows={3} className="input-dark mt-1 resize-none" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/60">Precio</label>
                  <input type="number" step="0.01" className="input-dark mt-1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/60">Stock</label>
                  <input type="number" className="input-dark mt-1" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
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
                <label className="text-xs uppercase tracking-widest text-white/60">Imágenes</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {form.images.map((img, i) => (
                    <div key={i} className="relative">
                      <img src={img} className="h-20 w-20 object-cover rounded-sm" />
                      <button onClick={() => setForm({ ...form, images: form.images.filter((_, j) => j !== i) })} className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1">
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                  <label className="h-20 w-20 grid place-items-center border border-dashed border-white/20 rounded-sm cursor-pointer hover:border-[#E63946]">
                    <Upload size={16} className="text-white/40" />
                    <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => onImages(Array.from(e.target.files))} />
                  </label>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/60"><Youtube className="inline" size={12} /> YouTube URL</label>
                  <input className="input-dark mt-1" value={form.youtube_url || ""} onChange={(e) => setForm({ ...form, youtube_url: e.target.value })} placeholder="https://youtube.com/watch?v=…" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/60">Video corto (MP4)</label>
                  <input type="file" accept="video/mp4" className="input-dark mt-1" onChange={(e) => onVideo(e.target.files?.[0])} />
                  {form.video_clip && <div className="text-xs text-green-400 mt-1">Video cargado ✓</div>}
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-widest text-white/60">Etiquetas</label>
                <div className="flex gap-2 mt-1">
                  <input className="input-dark" value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Agregar etiqueta" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (tagInput) { setForm({ ...form, tags: [...form.tags, tagInput] }); setTagInput(""); } } }} />
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {form.tags.map((t, i) => (
                    <span key={i} className="text-xs px-2 py-1 bg-white/5 border border-white/10 rounded-sm flex items-center gap-1">
                      {t}
                      <button onClick={() => setForm({ ...form, tags: form.tags.filter((_, j) => j !== i) })}><X size={10} /></button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-white/5 flex justify-end gap-3">
              <button onClick={() => setOpen(false)} className="btn-outline text-sm py-2">Cancelar</button>
              <button onClick={save} className="btn-primary text-sm py-2" data-testid="save-product">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
