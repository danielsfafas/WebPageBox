import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { fmtDate, useSettings } from "@/lib/utils-app";
import { Calendar, MapPin, ExternalLink } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";

function Countdown({ target }) {
  const [t, setT] = useState({ d: 0, h: 0, m: 0, s: 0 });
  useEffect(() => {
    const tick = () => {
      const ms = new Date(target).getTime() - Date.now();
      if (ms <= 0) { setT({ d: 0, h: 0, m: 0, s: 0 }); return; }
      const d = Math.floor(ms / 86400000);
      const h = Math.floor((ms % 86400000) / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setT({ d, h, m, s });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return (
    <div className="flex gap-2">
      {["d","h","m","s"].map((k, i) => (
        <div key={k} className="bg-black/60 border border-white/10 px-3 py-2 min-w-[58px] text-center">
          <div className="font-display text-2xl text-[#FFD700]">{String(t[k]).padStart(2, "0")}</div>
          <div className="text-[10px] uppercase text-white/50 tracking-widest">{["Días","Hrs","Min","Seg"][i]}</div>
        </div>
      ))}
    </div>
  );
}

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const settings = useSettings();

  const title = `Eventos y Combates - ${settings.gym_name || 'Box de CrossFit'}`;
  const description = `Conoce los próximos eventos, torneos y seminarios de ${settings.gym_name || 'Box de CrossFit'}. ¡Únete a la acción!`;

  useSEO({
    title,
    description,
    canonical: window.location.origin + '/eventos',
    ogImage: settings.logo
  });

  useEffect(() => { api.get("/events").then(r => setEvents(r.data)).catch(() => {}); }, []);
  const upcoming = events.filter(e => new Date(e.date) >= new Date());
  const past = events.filter(e => new Date(e.date) < new Date());

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 py-16">
      <div className="text-xs uppercase tracking-[0.3em] text-[#E63946]">Calendario</div>
      <h1 className="font-display text-5xl md:text-7xl text-white mt-2">
        <span className="sr-only">{settings.gym_name || 'Box de CrossFit'} - </span>
        Eventos & <span className="text-[#FFD700]">combates</span>
      </h1>
      <p className="text-white/60 mt-4 max-w-2xl">Torneos, seminarios y noches de boxeo. La adrenalina te espera.</p>

      <h2 className="font-display text-3xl text-white mt-12">Próximos</h2>
      {upcoming.length === 0 ? (
        <div className="mt-6 glass p-10 text-center text-white/50">No hay eventos próximos por ahora.</div>
      ) : (
        <div className="mt-6 grid md:grid-cols-2 gap-6">
          {upcoming.map(ev => (
            <div key={ev.id} className="relative overflow-hidden glass rounded-sm group" data-testid="event-card-public">
              {ev.poster && (
                <div className="h-64 bg-cover bg-center" style={{ backgroundImage: `url(${ev.poster})` }} />
              )}
              <div className="p-6">
                <div className="text-[10px] uppercase tracking-widest text-[#FFD700]">{ev.type}</div>
                <h3 className="font-display text-3xl text-white mt-1">{ev.title}</h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/60 mt-2">
                  <span className="flex gap-1 items-center"><Calendar size={14} /> {fmtDate(ev.date)}</span>
                  {ev.location && <span className="flex gap-1 items-center"><MapPin size={14} /> {ev.location}</span>}
                </div>
                <p className="text-sm text-white/70 mt-3 line-clamp-3">{ev.description}</p>
                <div className="mt-5"><Countdown target={ev.date} /></div>
                {ev.registration_url && (
                  <a href={ev.registration_url} target="_blank" rel="noreferrer" className="btn-primary mt-5 text-sm">
                    Registrarse <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {past.length > 0 && (
        <>
          <h2 className="font-display text-3xl text-white mt-16">Pasados</h2>
          <div className="mt-6 grid md:grid-cols-3 gap-4">
            {past.map(ev => (
              <div key={ev.id} className="glass p-4 rounded-sm opacity-70">
                <div className="text-[10px] uppercase tracking-widest text-[#FFD700]">{ev.type}</div>
                <h4 className="font-display text-xl text-white">{ev.title}</h4>
                <div className="text-xs text-white/50 mt-1">{fmtDate(ev.date)} · {ev.location}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
