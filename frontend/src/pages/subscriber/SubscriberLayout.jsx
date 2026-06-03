import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { User, Activity, Image, CreditCard, LogOut } from "lucide-react";
import { useSubscriberAuth } from "@/contexts/SubscriberAuthContext";
import { useSettings } from "@/lib/utils-app";

const links = [
  { to: "/mi/perfil", label: "Perfil", icon: User },
  { to: "/mi/progreso", label: "Progreso", icon: Activity },
  { to: "/mi/galeria", label: "Galería", icon: Image },
  { to: "/mi/pagos", label: "Pagos", icon: CreditCard },
];

export default function SubscriberLayout() {
  const { subscriber, logout } = useSubscriberAuth();
  const settings = useSettings();
  const nav = useNavigate();

  const doLogout = () => {
    logout();
    nav("/mi/login");
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <header className="border-b border-white/10 bg-black/50 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="font-display text-2xl tracking-wide">{settings.gym_name || "BOXING GYM"}</div>
          <button onClick={doLogout} className="btn-outline text-xs py-2">
            <LogOut size={14} /> Salir
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 grid md:grid-cols-[230px_1fr] gap-6">
        <aside className="glass rounded-sm p-3 h-fit">
          <div className="px-3 pb-3 border-b border-white/10 mb-2">
            <div className="text-xs uppercase tracking-widest text-white/50">Suscriptor</div>
            <div className="font-display text-lg">{subscriber?.full_name || "—"}</div>
          </div>
          <nav className="space-y-1">
            {links.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-sm text-sm ${
                    isActive ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                <it.icon size={15} /> {it.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
