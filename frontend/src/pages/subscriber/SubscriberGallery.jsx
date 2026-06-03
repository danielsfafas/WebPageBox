import React, { useEffect, useState } from "react";
import subscriberApi from "@/lib/subscriberApi";
import { fmtDate } from "@/lib/utils-app";

export default function SubscriberGallery() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    subscriberApi.get("/subscriber/media").then((r) => setItems(r.data || [])).catch(() => setItems([]));
  }, []);

  return (
    <section className="space-y-4" data-testid="subscriber-gallery-page">
      <h1 className="font-display text-4xl text-white">Mi galería</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((m) => (
          <article key={m.id} className="glass rounded-sm overflow-hidden">
            {m.type === "video" ? (
              <video src={m.data} controls className="w-full h-48 object-cover bg-black" />
            ) : (
              <img src={m.data} alt="Evidencia de progreso" className="w-full h-48 object-cover" />
            )}
            <div className="p-3">
              <div className="text-xs text-white/40">{fmtDate(m.date)}</div>
              <div className="text-sm text-white mt-1">{m.note || "Sin nota"}</div>
            </div>
          </article>
        ))}
        {items.length === 0 && (
          <div className="glass rounded-sm p-10 text-center text-white/40 sm:col-span-2 lg:col-span-3">
            No hay contenido disponible.
          </div>
        )}
      </div>
    </section>
  );
}
