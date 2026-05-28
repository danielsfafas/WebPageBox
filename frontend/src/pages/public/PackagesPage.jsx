import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { fmtCurrency, useSettings } from "@/lib/utils-app";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";

export default function PackagesPage() {
  const [packages, setPackages] = useState([]);
  const [paying, setPaying] = useState(null);
  const settings = useSettings();
  const sym = settings.currency_symbol || "$";

  useEffect(() => { api.get("/packages").then(r => setPackages(r.data)).catch(() => {}); }, []);

  const subscribe = async (pkg) => {
    try {
      setPaying(pkg.id);
      const { data } = await api.post("/payments/checkout", {
        package_id: pkg.id,
        origin_url: window.location.origin,
        include_inscription: true,
      });
      if (data?.url) window.location.href = data.url;
    } catch (e) {
      toast.error(e?.response?.data?.detail || "No se pudo iniciar el pago");
      setPaying(null);
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 py-16">
      <div className="text-xs uppercase tracking-[0.3em] text-[#E63946]">Membresías</div>
      <h1 className="font-display text-5xl md:text-7xl text-white mt-2">Paquetes & <span className="text-[#FFD700]">promociones</span></h1>
      <p className="text-white/60 mt-4 max-w-2xl">Encuentra el plan que se ajusta a tu nivel de entrenamiento. Inscripción única + cuota mensual.</p>

      {packages.length === 0 ? (
        <div className="mt-12 glass p-10 text-center text-white/50">No hay paquetes activos por el momento.</div>
      ) : (
        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((p, i) => (
            <div key={p.id} className={`glass p-8 rounded-sm relative flex flex-col ${i === 1 ? "border-[#FFD700]/60" : ""}`} data-testid="package-card">
              {i === 1 && (
                <div className="absolute -top-3 left-6 bg-[#FFD700] text-black text-[10px] font-bold uppercase tracking-widest px-2 py-1">
                  Más popular
                </div>
              )}
              <div className="font-display text-3xl text-white">{p.name}</div>
              <p className="text-sm text-white/60 mt-2 min-h-[50px]">{p.description}</p>

              <div className="mt-6 flex items-end gap-1">
                <span className="font-display text-5xl text-[#E63946]">{fmtCurrency(p.monthly_cost, sym)}</span>
                <span className="text-sm text-white/50 mb-2">/{p.duration === "yearly" ? "año" : p.duration === "quarterly" ? "trim." : "mes"}</span>
              </div>
              {p.inscription_cost > 0 && (
                <div className="text-xs text-white/40 mt-1">+ {fmtCurrency(p.inscription_cost, sym)} de inscripción única</div>
              )}

              <ul className="mt-6 space-y-2 flex-1">
                {(p.benefits || []).map((b, j) => (
                  <li key={j} className="text-sm text-white/80 flex gap-2 items-start">
                    <Check size={16} className="text-[#E63946] mt-0.5 shrink-0" /> {b}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => subscribe(p)}
                disabled={paying === p.id}
                data-testid={`subscribe-btn-${p.id}`}
                className={`mt-8 w-full justify-center text-sm ${i === 1 ? "btn-gold" : "btn-primary"}`}
              >
                {paying === p.id ? <><Loader2 className="animate-spin" size={16} /> Procesando…</> : "Suscribirme ahora"}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
