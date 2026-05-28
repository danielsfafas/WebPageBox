import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Package,
  Users,
  CreditCard,
  Calendar,
  MessageSquare,
  Settings as Cog,
  LogOut,
  Box,
  Menu,
  X,
} from "lucide-react";

const items = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/productos", label: "Productos", icon: Box },
  { to: "/admin/paquetes", label: "Paquetes", icon: Package },
  { to: "/admin/suscriptores", label: "Suscriptores", icon: Users },
  { to: "/admin/pagos", label: "Pagos", icon: CreditCard },
  { to: "/admin/eventos", label: "Eventos", icon: Calendar },
  { to: "/admin/mensajes", label: "Mensajes", icon: MessageSquare },
  { to: "/admin/configuracion", label: "Configuración", icon: Cog },
];

export default function AdminLayout() {
  const { logout, user } = useAuth();
  const nav = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const doLogout = () => {
    logout();
    nav("/admin/login");
  };

  return (
    <div className="min-h-screen flex bg-[#0A0A0A]" data-testid="admin-layout">
      {/* Sidebar */}
      <aside
        className={`${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:static z-40 inset-y-0 left-0 w-64 bg-[#0F0F0F] border-r border-white/5 transition-transform`}
        data-testid="admin-sidebar"
      >
        <div className="h-16 px-5 flex items-center gap-2 border-b border-white/5">
          <div className="h-9 w-9 grid place-items-center bg-[#E63946] text-black font-display text-xl rounded-sm">IF</div>
          <div>
            <div className="font-display text-xl text-white leading-none">IRONFIST</div>
            <div className="text-[10px] text-white/40 uppercase tracking-widest">Admin</div>
          </div>
        </div>
        <nav className="p-4 space-y-1">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              data-testid={`sidebar-${it.label.toLowerCase()}`}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-sm text-sm transition-all relative ${
                  isActive
                    ? "bg-white/5 text-white before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:bg-[#E63946]"
                    : "text-white/60 hover:text-white hover:bg-white/[0.03]"
                }`
              }
            >
              <it.icon size={16} /> {it.label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5">
          <div className="text-xs text-white/40 truncate">{user?.email}</div>
          <button onClick={doLogout} className="btn-outline w-full justify-center mt-3 text-xs py-2" data-testid="logout-btn">
            <LogOut size={14} /> Salir
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-white/5 px-4 md:px-8 flex items-center justify-between bg-[#0A0A0A]">
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden text-white" data-testid="sidebar-toggle">
            {mobileOpen ? <X /> : <Menu />}
          </button>
          <div className="text-sm text-white/50">Panel de administración</div>
          <div className="text-xs text-white/40">{new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}</div>
        </header>
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
      {mobileOpen && <div className="fixed inset-0 bg-black/60 md:hidden z-30" onClick={() => setMobileOpen(false)} />}
    </div>
  );
}
