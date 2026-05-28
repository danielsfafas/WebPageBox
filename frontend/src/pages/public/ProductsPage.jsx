import React, { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { fmtCurrency, useSettings } from "@/lib/utils-app";
import { Search, Tag, Youtube } from "lucide-react";

const ytEmbed = (url) => {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{6,})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
};

export default function ProductsPage() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [open, setOpen] = useState(null);
  const settings = useSettings();
  const sym = settings.currency_symbol || "$";

  useEffect(() => { api.get("/products").then(r => setItems(r.data)).catch(() => {}); }, []);

  const categories = useMemo(() => Array.from(new Set(items.map(i => i.category).filter(Boolean))), [items]);

  const filtered = items.filter(i => {
    const match = (i.name + " " + (i.description || "") + " " + (i.tags || []).join(" "))
      .toLowerCase().includes(q.toLowerCase());
    const cm = !cat || i.category === cat;
    return match && cm;
  });

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 py-16">
      <div className="text-xs uppercase tracking-[0.3em] text-[#E63946]">Tienda oficial</div>
      <h1 className="font-display text-5xl md:text-7xl text-white mt-2">Equipo de <span className="text-[#FFD700]">guerreros</span></h1>
      <p className="text-white/60 mt-4 max-w-2xl">Guantes, vendas, sacos, ropa técnica. Todo lo que necesitas para entrenar como un campeón.</p>

      <div className="mt-10 flex flex-wrap gap-3 items-center" data-testid="products-filters">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
          <input
            data-testid="products-search"
            className="input-dark pl-10"
            placeholder="Buscar productos…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          data-testid="products-category"
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="input-dark md:w-56"
        >
          <option value="">Todas las categorías</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-16 text-center text-white/50 py-20 glass rounded-sm">
          No hay productos disponibles aún.
        </div>
      ) : (
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" data-testid="products-grid">
          {filtered.map(p => (
            <div
              key={p.id}
              data-testid="product-card"
              onClick={() => setOpen(p)}
              className="glass rounded-sm overflow-hidden group cursor-pointer transition-all hover:scale-[1.02] hover:border-[#E63946]/50"
            >
              <div className="h-56 bg-black overflow-hidden relative">
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-white/20 font-display text-5xl">{p.name?.[0]}</div>
                )}
                {p.youtube_url && (
                  <div className="absolute top-2 right-2 bg-[#E63946] p-1 rounded-sm">
                    <Youtube size={14} />
                  </div>
                )}
              </div>
              <div className="p-4">
                {p.category && <div className="text-[10px] uppercase tracking-widest text-[#FFD700]">{p.category}</div>}
                <div className="font-display text-2xl text-white mt-1">{p.name}</div>
                <p className="text-sm text-white/60 mt-1 line-clamp-2">{p.description}</p>
                <div className="flex items-end justify-between mt-3">
                  <div className="font-display text-2xl text-[#E63946]">{fmtCurrency(p.price, sym)}</div>
                  <div className="text-xs text-white/40">Stock: {p.stock}</div>
                </div>
                {p.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {p.tags.slice(0, 3).map((t, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 bg-white/5 border border-white/10 rounded-sm text-white/60">
                        <Tag className="inline" size={9} /> {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setOpen(null)}>
          <div className="glass-strong max-w-4xl w-full rounded-sm overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="grid md:grid-cols-2">
              <div className="bg-black">
                {open.images?.length > 0 ? (
                  <div className="space-y-2 p-2">
                    {open.images.map((img, i) => (
                      <img key={i} src={img} alt="" className="w-full h-64 object-cover rounded-sm" />
                    ))}
                  </div>
                ) : (
                  <div className="h-80 grid place-items-center text-white/20 font-display text-7xl">{open.name?.[0]}</div>
                )}
              </div>
              <div className="p-6">
                <div className="text-[10px] uppercase tracking-widest text-[#FFD700]">{open.category}</div>
                <h2 className="font-display text-4xl text-white">{open.name}</h2>
                <div className="font-display text-3xl text-[#E63946] mt-3">{fmtCurrency(open.price, sym)}</div>
                <p className="text-sm text-white/70 mt-4 whitespace-pre-line">{open.description}</p>
                {open.youtube_url && ytEmbed(open.youtube_url) && (
                  <div className="mt-4 aspect-video">
                    <iframe className="w-full h-full rounded-sm" src={ytEmbed(open.youtube_url)} title="video" allowFullScreen />
                  </div>
                )}
                {open.video_clip && (
                  <video src={open.video_clip} controls className="w-full mt-4 rounded-sm" />
                )}
                <button onClick={() => setOpen(null)} className="btn-outline mt-6">Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
