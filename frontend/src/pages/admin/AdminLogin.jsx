import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, ShieldAlert } from "lucide-react";

export default function AdminLogin() {
  const { login, user, ready } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("admin@boxinggym.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (ready && user) return <Navigate to="/admin" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Bienvenido al panel");
      nav("/admin");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Error de autenticación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative grid place-items-center px-4" data-testid="admin-login-page">
      <div className="absolute inset-0 noise opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0A] via-[#1a0a0a] to-[#0A0A0A]" />
      <div className="relative glass-strong w-full max-w-md p-10 rounded-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 grid place-items-center bg-[#E63946] text-black font-display text-2xl rounded-sm">IF</div>
          <div>
            <div className="font-display text-3xl text-white">Panel Admin</div>
            <div className="text-xs text-white/40 uppercase tracking-widest">Acceso restringido</div>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-white/60">Email</label>
            <input data-testid="login-email" type="email" className="input-dark mt-1" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-white/60">Contraseña</label>
            <input data-testid="login-password" type="password" className="input-dark mt-1" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button data-testid="login-submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? <Loader2 className="animate-spin" size={16} /> : "Iniciar sesión"}
          </button>
        </form>
        <div className="mt-6 text-[11px] text-white/40 flex items-start gap-2">
          <ShieldAlert size={14} className="mt-0.5" />
          Únicamente personal autorizado. Las sesiones expiran en 12 horas.
        </div>
      </div>
    </div>
  );
}
