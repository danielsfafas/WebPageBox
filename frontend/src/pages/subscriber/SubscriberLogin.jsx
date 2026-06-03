import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ShieldCheck, LogIn } from "lucide-react";
import { useSubscriberAuth } from "@/contexts/SubscriberAuthContext";
import { useSettings } from "@/lib/utils-app";

export default function SubscriberLogin() {
  const { login } = useSubscriberAuth();
  const settings = useSettings();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/mi/perfil";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error("Ingresa usuario y contraseña");
      return;
    }
    try {
      setLoading(true);
      await login(username, password);
      nav(redirectTo.startsWith("/") ? redirectTo : "/mi/perfil");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-screen grid place-items-center px-4 py-10">
      <div className="w-full max-w-md space-y-4">
        <form onSubmit={onSubmit} className="glass-strong w-full p-8 rounded-sm space-y-4" data-testid="subscriber-login">
          <div className="text-center">
            <div className="font-display text-4xl text-white">{settings.gym_name || "BOXING GYM"}</div>
            <div className="text-sm text-white/60 mt-1">Login usuario — portal de suscriptor</div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-white/60">Usuario</label>
            <input className="input-dark mt-1" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-white/60">Contraseña</label>
            <input type="password" className="input-dark mt-1" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? "Entrando..." : <><LogIn size={16} /> Entrar</>}
          </button>
          <p className="text-xs text-white/50 text-center">
            Usa el usuario de acceso que te asignó el gimnasio (campo &quot;Usuario de acceso&quot; en tu ficha).
          </p>
        </form>

        <div className="glass p-5 rounded-sm text-center space-y-3">
          <div className="text-xs uppercase tracking-widest text-white/50">¿Eres administrador?</div>
          <Link to="/admin/login" className="btn-outline w-full justify-center text-sm" data-testid="login-admin-link">
            <ShieldCheck size={16} /> Acceso administrador
          </Link>
        </div>

        <Link to="/" className="block text-center text-sm text-white/60 hover:text-white">
          Volver al inicio
        </Link>
      </div>
    </section>
  );
}
