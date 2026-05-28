import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import { fmtCurrency } from "@/lib/utils-app";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function PaymentSuccess() {
  const [sp] = useSearchParams();
  const sessionId = sp.get("session_id");
  const [status, setStatus] = useState("polling");
  const [info, setInfo] = useState(null);

  useEffect(() => {
    if (!sessionId) { setStatus("error"); return; }
    let attempts = 0;
    const poll = async () => {
      attempts++;
      try {
        const { data } = await api.get(`/payments/checkout/status/${sessionId}`);
        setInfo(data);
        if (data.payment_status === "paid") { setStatus("paid"); return; }
        if (data.status === "expired") { setStatus("expired"); return; }
        if (attempts >= 10) { setStatus("timeout"); return; }
        setTimeout(poll, 2000);
      } catch {
        if (attempts >= 10) setStatus("error");
        else setTimeout(poll, 2000);
      }
    };
    poll();
  }, [sessionId]);

  return (
    <section className="max-w-3xl mx-auto px-4 md:px-8 py-24" data-testid="payment-success-page">
      <div className="glass-strong p-12 rounded-sm text-center">
        {status === "polling" && (
          <>
            <Loader2 className="mx-auto animate-spin text-[#FFD700]" size={48} />
            <h1 className="font-display text-4xl text-white mt-4">Verificando pago…</h1>
            <p className="text-white/60 mt-2">Esto puede tardar unos segundos.</p>
          </>
        )}
        {status === "paid" && (
          <>
            <CheckCircle2 className="mx-auto text-green-400" size={64} />
            <h1 className="font-display text-5xl text-white mt-4">¡Pago confirmado!</h1>
            <p className="text-white/70 mt-3">
              Recibimos tu pago de <span className="text-[#FFD700] font-bold">{info?.amount ? fmtCurrency(info.amount) : ""}</span>.
              El administrador te contactará para activar tu membresía.
            </p>
            <Link to="/" className="btn-primary mt-8" data-testid="back-home">Volver al inicio</Link>
          </>
        )}
        {(status === "error" || status === "expired" || status === "timeout") && (
          <>
            <XCircle className="mx-auto text-red-400" size={64} />
            <h1 className="font-display text-4xl text-white mt-4">No pudimos confirmar el pago</h1>
            <p className="text-white/60 mt-2">{status === "expired" ? "La sesión expiró." : "Intenta nuevamente o contacta soporte."}</p>
            <Link to="/paquetes" className="btn-outline mt-8">Volver a paquetes</Link>
          </>
        )}
      </div>
    </section>
  );
}
