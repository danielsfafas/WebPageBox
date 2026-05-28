import React, { useState } from "react";
import { Outlet, NavLink, Link, useLocation } from "react-router-dom";
import { useSettings } from "@/lib/utils-app";
import { Menu, X, Instagram, Facebook, Twitter, Youtube } from "lucide-react";

const links = [
  { to: "/", label: "Inicio" },
  { to: "/paquetes", label: "Paquetes" },
  { to: "/productos", label: "Productos" },
  { to: "/eventos", label: "Eventos" },
  { to: "/contacto", label: "Contacto" },
];

export default function PublicLayout() {
  const settings = useSettings();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  return (
    <div className="min-h-screen flex flex-col" data-testid="public-layout">
      <header className="sticky top-0 z-50 glass-strong border-b border-white/10" data-testid="public-navbar">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" data-testid="brand-link">
            {settings.logo ? (
              <img src={settings.logo} alt="logo" className="h-9 w-9 object-cover rounded-sm" />
            ) : (
              <div className="h-9 w-9 grid place-items-center bg-[#E63946] text-black font-display text-xl rounded-sm">
                IF
              </div>
            )}
            <span className="font-display text-2xl tracking-wider text-white">
              {settings.gym_name || "BOXING GYM"}
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/"}
                data-testid={`nav-${l.label.toLowerCase()}`}
                className={({ isActive }) =>
                  `font-display text-lg tracking-wide uppercase transition-colors ${
                    isActive ? "text-[#E63946]" : "text-white/80 hover:text-white"
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
            <Link to="/paquetes" className="btn-primary text-sm" data-testid="nav-join-btn">
              Unirse Ahora
            </Link>
          </nav>

          <button
            className="md:hidden text-white p-2"
            onClick={() => setOpen(!open)}
            data-testid="mobile-menu-toggle"
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
        {open && (
          <div className="md:hidden border-t border-white/10 bg-black/95 px-4 py-4 space-y-3" data-testid="mobile-menu">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/"}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `block font-display text-lg ${isActive ? "text-[#E63946]" : "text-white"}`
                }
              >
                {l.label}
              </NavLink>
            ))}
            <Link to="/paquetes" className="btn-primary text-sm w-full justify-center" onClick={() => setOpen(false)}>
              Unirse Ahora
            </Link>
          </div>
        )}
      </header>

      <main key={loc.pathname} className="flex-1 anim-fade-up">
        <Outlet />
      </main>

      <footer className="border-t border-white/10 bg-black/60 mt-16" data-testid="public-footer">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 grid md:grid-cols-3 gap-8">
          <div>
            <div className="font-display text-3xl text-white">{settings.gym_name}</div>
            <p className="mt-2 text-sm text-white/60">{settings.address}</p>
            <p className="mt-1 text-sm text-white/60">{settings.phone}</p>
            <p className="mt-1 text-sm text-white/60">{settings.contact_email}</p>
          </div>
          <div>
            <div className="font-display text-xl text-[#FFD700]">Navegación</div>
            <ul className="mt-2 space-y-1 text-sm">
              {links.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-white/70 hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-display text-xl text-[#FFD700]">Síguenos</div>
            <div className="mt-2 flex gap-3">
              {settings.facebook && <a href={settings.facebook} target="_blank" rel="noreferrer" className="text-white/70 hover:text-[#E63946]"><Facebook /></a>}
              {settings.instagram && <a href={settings.instagram} target="_blank" rel="noreferrer" className="text-white/70 hover:text-[#E63946]"><Instagram /></a>}
              {settings.twitter && <a href={settings.twitter} target="_blank" rel="noreferrer" className="text-white/70 hover:text-[#E63946]"><Twitter /></a>}
              {settings.youtube && <a href={settings.youtube} target="_blank" rel="noreferrer" className="text-white/70 hover:text-[#E63946]"><Youtube /></a>}
            </div>
            <Link to="/admin/login" className="inline-flex items-center gap-2 mt-6 text-sm text-white/70 hover:text-[#FFD700] border border-white/15 hover:border-[#FFD700]/50 rounded-sm px-3 py-2 transition-all" data-testid="footer-admin-link">
              <ShieldCheck size={14} /> Acceso administrador
            </Link>
          </div>
        </div>
        <div className="border-t border-white/5 py-4 text-center text-xs text-white/40">
          © {new Date().getFullYear()} {settings.gym_name}. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}
