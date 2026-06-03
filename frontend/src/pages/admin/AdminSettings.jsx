import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { fileToBase64 } from "@/lib/utils-app";
import { Save, Upload, Trash2, Image, Youtube } from "lucide-react";
import { parseYoutubeVideoId } from "@/lib/youtube";

const THEMES = [
  { id: "crimson-knockout", name: "Crimson Knockout" },
  { id: "neon-venom", name: "Neon Venom" },
  { id: "toxic-sun", name: "Toxic Sun" },
  { id: "electric-storm", name: "Electric Storm" },
  { id: "purple-rage", name: "Purple Rage" },
  { id: "lava-core", name: "Lava Core" },
  { id: "ice-burst", name: "Ice Burst" },
  { id: "cyber-punch", name: "Cyber Punch" },
];

export default function AdminSettings() {
  const [s, setS] = useState(null);
  const [ytUrl, setYtUrl] = useState("");

  useEffect(() => {
    api.get("/admin/settings").then((r) => {
      const data = r.data || {};
      setS({
        ...data,
        hero_carousel_interval_sec: data.hero_carousel_interval_sec ?? 6,
        hero_carousel_slides: data.hero_carousel_slides || [],
      });
    });
  }, []);

  if (!s) return <div className="text-white/40">Cargando…</div>;

  const onLogo = async (f) => {
    if (!f) return;
    setS({ ...s, logo: await fileToBase64(f) });
  };

  const slides = s?.hero_carousel_slides || [];

  const addImageSlide = async (file) => {
    if (!file) return;
    const src = await fileToBase64(file);
    setS({ ...s, hero_carousel_slides: [...slides, { type: "image", src }] });
    toast.success("Imagen agregada al carrusel");
  };

  const addYoutubeSlide = () => {
    const url = ytUrl.trim();
    if (!url) {
      toast.error("Pega la URL del video");
      return;
    }
    if (!parseYoutubeVideoId(url)) {
      toast.error("URL de YouTube no válida (watch, shorts o youtu.be)");
      return;
    }
    setS({ ...s, hero_carousel_slides: [...slides, { type: "youtube", src: url }] });
    setYtUrl("");
    toast.success("Video agregado al carrusel");
  };

  const removeSlide = (idx) => {
    setS({ ...s, hero_carousel_slides: slides.filter((_, i) => i !== idx) });
  };

  const moveSlide = (idx, dir) => {
    const next = [...slides];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setS({ ...s, hero_carousel_slides: next });
  };

  const save = async () => {
    const body = { ...s };
    delete body.id;
    delete body._id;
    const { data } = await api.put("/admin/settings", body);
    document.body.setAttribute("data-theme", body.theme || "crimson-knockout");
    window.dispatchEvent(new CustomEvent("app-settings-updated", { detail: data || body }));
    toast.success("Configuración guardada");
  };

  const F = (label, key, type = "text") => (
    <div>
      <label className="text-xs uppercase tracking-widest text-white/60">{label}</label>
      <input type={type} className="input-dark mt-1" value={s[key] || ""} onChange={(e) => setS({ ...s, [key]: e.target.value })} />
    </div>
  );

  return (
    <div data-testid="admin-settings-page">
      <div className="text-xs uppercase tracking-[0.3em] text-[#E63946]">Sistema</div>
      <h1 className="font-display text-4xl text-white mt-1">Configuración</h1>

      <div className="mt-6 grid lg:grid-cols-2 gap-6">
        <div className="glass p-6 rounded-sm space-y-4">
          <h2 className="font-display text-2xl text-white">Identidad</h2>
          {F("Nombre del gimnasio", "gym_name")}
          <div>
            <label className="text-xs uppercase tracking-widest text-white/60">Logotipo</label>
            <div className="mt-2 flex items-center gap-3">
              {s.logo && <img src={s.logo} className="h-16 w-16 object-cover rounded-sm" />}
              <label className="btn-outline text-xs py-2 cursor-pointer">
                <Upload size={12} /> Subir
                <input type="file" accept="image/*" className="hidden" onChange={(e) => onLogo(e.target.files?.[0])} />
              </label>
              {s.logo && <button onClick={() => setS({ ...s, logo: null })} className="text-xs text-red-400">Quitar</button>}
            </div>
          </div>
          {F("Dirección", "address")}
          <div>
            <label className="text-xs uppercase tracking-widest text-white/60">Horario de atención</label>
            <textarea
              rows={4}
              className="input-dark mt-1 resize-none w-full"
              value={s.gym_hours || ""}
              onChange={(e) => setS({ ...s, gym_hours: e.target.value })}
              placeholder={"Lunes a Viernes: 6:00 – 22:00\nSábado: 7:00 – 14:00"}
            />
            <p className="text-xs text-white/45 mt-1">Se muestra en la página de paquetes. Una línea por día o turno.</p>
          </div>
          {F("Teléfono", "phone")}
          {F("Email de contacto (notificaciones)", "contact_email", "email")}
        </div>

        <div className="glass p-6 rounded-sm space-y-4">
          <h2 className="font-display text-2xl text-white">Redes sociales</h2>
          {F("Facebook URL", "facebook")}
          {F("Instagram URL", "instagram")}
          {F("Twitter / X URL", "twitter")}
          {F("YouTube URL", "youtube")}
        </div>

        <div className="glass p-6 rounded-sm space-y-4">
          <h2 className="font-display text-2xl text-white">Localización</h2>
          <div className="grid grid-cols-2 gap-3">
            {F("Moneda (código)", "currency")}
            {F("Símbolo", "currency_symbol")}
          </div>
          {F("Zona horaria", "timezone")}
        </div>

        <div className="glass p-6 rounded-sm space-y-4">
          <h2 className="font-display text-2xl text-white">Tema visual</h2>
          <div>
            <label className="text-xs uppercase tracking-widest text-white/60">Tema de colores</label>
            <select
              className="input-dark mt-1"
              value={s.theme || "crimson-knockout"}
              onChange={(e) => {
                const next = e.target.value;
                setS({ ...s, theme: next });
                document.body.setAttribute("data-theme", next);
              }}
            >
              {THEMES.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-white/50">
            Incluye 8 temas agresivos para toda la web pública y panel admin.
          </p>
        </div>

        <div className="glass p-6 rounded-sm space-y-4 lg:col-span-2">
          <h2 className="font-display text-2xl text-white">Carrusel — página principal</h2>
          <p className="text-xs text-white/50">
            Fondo del inicio (mismo tamaño que ahora). Alterna fotos y videos de YouTube (Shorts, watch o youtu.be).
          </p>
          <div className="max-w-xs">
            <label className="text-xs uppercase tracking-widest text-white/60">
              Segundos por diapositiva
            </label>
            <input
              type="number"
              min={3}
              max={60}
              className="input-dark mt-1"
              value={s.hero_carousel_interval_sec ?? 6}
              onChange={(e) =>
                setS({ ...s, hero_carousel_interval_sec: Number(e.target.value) || 6 })
              }
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <label className="btn-outline text-xs py-2 cursor-pointer">
              <Image size={14} /> Subir imagen
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => addImageSlide(e.target.files?.[0])}
              />
            </label>
            <div className="flex flex-1 min-w-[240px] gap-2">
              <input
                className="input-dark flex-1"
                placeholder="https://youtube.com/shorts/..."
                value={ytUrl}
                onChange={(e) => setYtUrl(e.target.value)}
              />
              <button type="button" onClick={addYoutubeSlide} className="btn-outline text-xs py-2 shrink-0">
                <Youtube size={14} /> Agregar video
              </button>
            </div>
          </div>

          {slides.length === 0 ? (
            <p className="text-sm text-white/40">Sin diapositivas. Se usará imagen por defecto.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {slides.map((slide, idx) => (
                <div key={idx} className="rounded-sm border border-white/10 overflow-hidden bg-black/40">
                  <div className="aspect-[16/10] relative bg-black">
                    {slide.type === "youtube" ? (
                      <div className="absolute inset-0 grid place-items-center text-white/50 text-xs p-2 text-center">
                        <Youtube size={28} className="text-[#E63946] mb-1" />
                        Video YouTube
                        <div className="text-[10px] mt-1 break-all opacity-70">{slide.src}</div>
                      </div>
                    ) : (
                      <img src={slide.src} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="p-2 flex items-center justify-between gap-1">
                    <span className="text-[10px] uppercase text-white/50">
                      {idx + 1}. {slide.type === "youtube" ? "Video" : "Imagen"}
                    </span>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => moveSlide(idx, -1)} className="text-xs text-white/50 hover:text-white px-1">↑</button>
                      <button type="button" onClick={() => moveSlide(idx, 1)} className="text-xs text-white/50 hover:text-white px-1">↓</button>
                      <button type="button" onClick={() => removeSlide(idx)} className="text-red-400"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass p-6 rounded-sm space-y-4">
          <h2 className="font-display text-2xl text-white">Pagos con tarjeta (Mercado Pago)</h2>
          <label className="flex items-center gap-2 text-sm text-white/80">
            <input
              type="checkbox"
              checked={!!s.mp_enabled}
              onChange={(e) => setS({ ...s, mp_enabled: e.target.checked })}
            />
            Habilitar pagos en línea
          </label>
          {F("Public key", "mp_public_key")}
          {F("Access token", "mp_access_token")}
          {F("Webhook secret (opcional)", "mp_webhook_secret")}
          <p className="text-xs text-white/50">
            La cuenta de Mercado Pago configurada aquí será global para todo el sistema.
          </p>
        </div>
      </div>

      <button onClick={save} className="btn-primary mt-8" data-testid="save-settings">
        <Save size={14} /> Guardar configuración
      </button>
    </div>
  );
}
