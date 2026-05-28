import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { fileToBase64 } from "@/lib/utils-app";
import { Save, Upload } from "lucide-react";

export default function AdminSettings() {
  const [s, setS] = useState(null);

  useEffect(() => { api.get("/settings").then(r => setS(r.data)); }, []);

  if (!s) return <div className="text-white/40">Cargando…</div>;

  const onLogo = async (f) => {
    if (!f) return;
    setS({ ...s, logo: await fileToBase64(f) });
  };

  const save = async () => {
    const body = { ...s };
    delete body.id;
    delete body._id;
    await api.put("/admin/settings", body);
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
      </div>

      <button onClick={save} className="btn-primary mt-8" data-testid="save-settings">
        <Save size={14} /> Guardar configuración
      </button>
    </div>
  );
}
