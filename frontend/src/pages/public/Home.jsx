import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Trophy, Dumbbell, Flame, Users } from "lucide-react";
import api from "@/lib/api";
import { fmtCurrency, fmtDate, useSettings } from "@/lib/utils-app";
import OfferCountdown from "@/components/OfferCountdown";
import HeroCarousel from "@/components/HeroCarousel";

const GYM_INTERIOR = "https://images.pexels.com/photos/5750886/pexels-photo-5750886.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

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
    <div className="flex gap-2 text-center" data-testid="countdown">
      {["d","h","m","s"].map((k, i) => (
        <div key={k} className="bg-black/60 border border-white/10 rounded-sm px-3 py-2 min-w-[58px]">
          <div className="font-display text-2xl text-[#FFD700]">{String(t[k]).padStart(2, "0")}</div>
          <div className="text-[10px] uppercase text-white/50 tracking-widest">{["Días","Hrs","Min","Seg"][i]}</div>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const settings = useSettings();
  const [packages, setPackages] = useState([]);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    api.get("/packages").then(r => setPackages(r.data.slice(0, 3))).catch(() => {});
    api.get("/events").then(r => {
      const upcoming = r.data.filter(e => new Date(e.date) > new Date()).slice(0, 2);
      setEvents(upcoming);
    }).catch(() => {});
  }, []);

  return (
    <div data-testid="hero-section">
      {/* HERO */}
      <section className="relative min-h-[88vh] overflow-hidden flex items-center">
        <HeroCarousel
          slides={settings.hero_carousel_slides}
          intervalSec={settings.hero_carousel_interval_sec}
        />
        <div className="absolute inset-0 z-[2] bg-gradient-to-r from-black/95 via-black/70 to-black/30" />
        <div className="absolute inset-0 z-[2] noise" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 py-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-[#E63946] mb-6">
              <Flame size={14} /> Desafía tus límites
            </div>
            <h1 className="font-display text-6xl md:text-8xl leading-[0.9] uppercase text-white">
              Forja al <span className="text-[#E63946]">campeón</span><br/>que llevas dentro
            </h1>
            <p className="mt-6 text-lg text-white/70 max-w-xl">
              Entrena con disciplina, suda con propósito. Un gimnasio de boxeo donde
              cada round te transforma — entrenadores élite, equipo profesional, comunidad real.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link to="/paquetes" className="btn-primary" data-testid="hero-join-btn">
                Unirse Ahora <ChevronRight size={18} />
              </Link>
              <Link to="/paquetes" className="btn-outline" data-testid="hero-packages-btn">
                Ver Paquetes
              </Link>
              <Link to="/contacto" className="btn-outline" data-testid="hero-contact-btn">
                Contacto
              </Link>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl">
            {[
              { icon: Trophy, n: "12+", l: "Campeones formados" },
              { icon: Users, n: "850+", l: "Atletas activos" },
              { icon: Dumbbell, n: "24/7", l: "Acceso flexible" },
              { icon: Flame, n: "15", l: "Años forjando legados" },
            ].map(({ icon: Icon, n, l }, i) => (
              <div key={i} className="glass p-4 rounded-sm">
                <Icon className="text-[#FFD700]" size={20} />
                <div className="font-display text-3xl text-white mt-1">{n}</div>
                <div className="text-xs uppercase tracking-wider text-white/60">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PACKAGES TEASER */}
      {packages.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 md:px-8 py-20">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-[#E63946]">Membresías</div>
              <h2 className="font-display text-5xl md:text-6xl text-white mt-2">Elige tu <span className="text-[#FFD700]">paquete</span></h2>
            </div>
            <Link to="/paquetes" className="btn-outline text-sm">Ver todos</Link>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {packages.map((p, i) => (
              <div key={p.id} className={`glass p-8 rounded-sm relative ${i === 1 ? "border-[#FFD700]/40" : ""}`} data-testid="pricing-card">
                {i === 1 && (
                  <div className="absolute -top-3 left-6 bg-[#FFD700] text-black text-[10px] font-bold uppercase tracking-widest px-2 py-1">
                    Más popular
                  </div>
                )}
                <div className="font-display text-3xl text-white">{p.name}</div>
                <p className="text-sm text-white/60 mt-2 min-h-[40px]">{p.description}</p>
                <div className="mt-6 flex items-end gap-1">
                  <span className="font-display text-5xl text-[#E63946]">{fmtCurrency(p.monthly_cost)}</span>
                  <span className="text-sm text-white/50 mb-2">/mes</span>
                </div>
                {p.inscription_cost > 0 && (
                  <div className="text-xs text-white/40 mt-1">+ {fmtCurrency(p.inscription_cost)} inscripción</div>
                )}
                <OfferCountdown expiresAt={p.offer_expires_at} publicView />
                <ul className="mt-6 space-y-2">
                  {(p.benefits || []).slice(0, 5).map((b, j) => (
                    <li key={j} className="text-sm text-white/70 flex gap-2"><span className="text-[#E63946]">▸</span> {b}</li>
                  ))}
                </ul>
                <Link to="/paquetes" className="mt-8 btn-primary w-full justify-center text-sm">
                  Suscribirme
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* EVENTS TEASER */}
      {events.length > 0 && (
        <section className="border-y border-white/5 bg-black/40 py-20">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-[#E63946]">Próximamente</div>
                <h2 className="font-display text-5xl md:text-6xl text-white mt-2">Combates <span className="text-[#FFD700]">en vivo</span></h2>
              </div>
              <Link to="/eventos" className="btn-outline text-sm">Ver agenda</Link>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {events.map((ev) => (
                <div key={ev.id} className="relative overflow-hidden rounded-sm border border-white/10 group" data-testid="event-card">
                  <div className="h-72 bg-cover bg-center" style={{ backgroundImage: `url(${ev.poster || GYM_INTERIOR})` }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <div className="text-[10px] uppercase tracking-widest text-[#FFD700]">{ev.type}</div>
                    <h3 className="font-display text-3xl text-white mt-1">{ev.title}</h3>
                    <p className="text-sm text-white/70 mt-1">{fmtDate(ev.date)} · {ev.location}</p>
                    <div className="mt-4">
                      <Countdown target={ev.date} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-20">
        <div className="relative glass-strong rounded-sm overflow-hidden p-8 md:p-16">
          <div className="absolute inset-0 noise opacity-50" />
          <div className="relative grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="font-display text-5xl text-white">¿Listo para el <span className="text-[#E63946]">primer round</span>?</h2>
              <p className="text-white/70 mt-4">Reserva tu primera clase y descubre por qué somos referente. Sin compromiso, solo sudor.</p>
            </div>
            <div className="flex gap-4">
              <Link to="/contacto" className="btn-gold">Reservar clase gratis</Link>
              <Link to="/paquetes" className="btn-outline">Ver paquetes</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
