import React, { useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { useSettings } from "@/lib/utils-app";
import { MapPin, Phone, Mail, Send } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";

export default function ContactPage() {
  const settings = useSettings();
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [loading, setLoading] = useState(false);

  const gymCity = settings.address ? settings.address.split(',').pop()?.trim() : '';
  const title = `Contacto - ${settings.gym_name || 'Box de CrossFit'}`;
  const description = `Contáctanos en ${settings.gym_name || 'Box de CrossFit'} ${gymCity ? `en ${gymCity}` : ''}. Estamos aquí para ayudarte. ${settings.phone ? `Tel: ${settings.phone}` : ''}`;

  useSEO({
    title,
    description,
    canonical: window.location.origin + '/contacto',
    ogImage: settings.logo
  });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Por favor completa los campos requeridos");
      return;
    }
    setLoading(true);
    try {
      await api.post("/contact", form);
      toast.success("Mensaje enviado. Te contactaremos pronto.");
      setForm({ name: "", email: "", phone: "", message: "" });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Error al enviar el mensaje");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 py-16">
      <div className="text-xs uppercase tracking-[0.3em] text-[#E63946]">Contacto</div>
      <h1 className="font-display text-5xl md:text-7xl text-white mt-2">
        <span className="sr-only">{settings.gym_name || 'Box de CrossFit'} - </span>
        Hablemos <span className="text-[#FFD700]">cara a cara</span>
      </h1>

      <div className="mt-12 grid md:grid-cols-2 gap-10">
        <form onSubmit={submit} className="glass p-8 rounded-sm space-y-4" data-testid="contact-form">
          <div>
            <label className="text-xs uppercase tracking-widest text-white/60">Nombre</label>
            <input data-testid="contact-name" className="input-dark mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-white/60">Correo electrónico</label>
            <input data-testid="contact-email" type="email" className="input-dark mt-1" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-white/60">Teléfono</label>
            <input data-testid="contact-phone" className="input-dark mt-1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-white/60">Mensaje</label>
            <textarea data-testid="contact-message" rows={5} className="input-dark mt-1 resize-none" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center" data-testid="contact-submit">
            {loading ? "Enviando…" : <>Enviar mensaje <Send size={14} /></>}
          </button>
        </form>

        <div className="space-y-6">
          <div className="glass p-6 rounded-sm flex gap-4 items-start">
            <MapPin className="text-[#FFD700] mt-1" />
            <div>
              <div className="text-xs uppercase tracking-widest text-white/60">Ubicación</div>
              <div className="text-white mt-1">{settings.address || "—"}</div>
            </div>
          </div>
          <div className="glass p-6 rounded-sm flex gap-4 items-start">
            <Phone className="text-[#FFD700] mt-1" />
            <div>
              <div className="text-xs uppercase tracking-widest text-white/60">Teléfono</div>
              <div className="text-white mt-1">{settings.phone || "—"}</div>
            </div>
          </div>
          <div className="glass p-6 rounded-sm flex gap-4 items-start">
            <Mail className="text-[#FFD700] mt-1" />
            <div>
              <div className="text-xs uppercase tracking-widest text-white/60">Email</div>
              <div className="text-white mt-1">{settings.contact_email || "—"}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
