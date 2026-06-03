import React from "react";
import { useSubscriberAuth } from "@/contexts/SubscriberAuthContext";
import { fmtDate } from "@/lib/utils-app";

export default function SubscriberProfile() {
  const { subscriber } = useSubscriberAuth();

  return (
    <section className="space-y-4" data-testid="subscriber-profile-page">
      <h1 className="font-display text-4xl text-white">Mi perfil</h1>
      <div className="grid md:grid-cols-2 gap-4">
        {[
          ["Nombre", subscriber?.full_name],
          ["Usuario", subscriber?.username],
          ["Email", subscriber?.email],
          ["Teléfono", subscriber?.phone],
          ["Paquete actual", subscriber?.package?.name || "—"],
          ["Beneficios", (subscriber?.package?.benefits || []).join(", ") || "—"],
          ["Vencimiento", fmtDate(subscriber?.next_due_date)],
          ["Cambio pendiente", subscriber?.pending_package?.name || "Sin cambio programado"],
        ].map(([k, v]) => (
          <div key={k} className="glass p-4 rounded-sm">
            <div className="text-xs uppercase tracking-widest text-white/40">{k}</div>
            <div className="mt-1 text-white">{v || "—"}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
