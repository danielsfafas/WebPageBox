import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import { fmtCurrency } from "@/lib/utils-app";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function AdminPaymentReturn() {
  const [sp] = useSearchParams();
  const sessionId = sp.get("session_id");
  const [status, setStatus] = useState("polling");
  const [info, setInfo] = useState(null);

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      return;
    }
    let attempts = 0;
    const poll = async () => {
      attempts += 1;
      try {
        const { data } = await api.get(`/payments/checkout/status/${sessionId}`);
        setInfo(data);
        if (data.payment_status === "paid") {
          setStatus("paid");
          return;
        }
        if (data.status === "expired") {
          setStatus("expired");
          return;
        }
        if (attempts >= 12) {
          setStatus("timeout");
          return;
        }
        setTimeout(poll, 2000);
      } catch {
        if (attempts >= 12) setStatus("error");
        else setTimeout(poll, 2000);
      }
    };
    poll();
  }, [sessionId]);

  return (
    <section className="max-w-3xl mx-auto px-4 md:px-8 py-16" data-testid="admin-payment-return-page">
      <div className="glass-strong p-10 rounded-sm text-center">
        {status === "polling" && (
          <>
            <Loader2 className="mx-auto animate-spin text-[#FFD700]" size={46} />
            <h1 className="font-display text-4xl text-white mt-4">Verificando pago…</h1>
            <p className="text-white/60 mt-2">Espera unos segundos mientras confirmamos la transacción.</p>
          </>
        )}
        {status === "paid" && (
          <>
            <CheckCircle2 className="mx-auto text-green-400" size={64} />
            <h1 className="font-display text-5xl text-white mt-4">Pago confirmado</h1>
            <p className="text-white/70 mt-3">
              Se registró el pago de{" "}
              <span className="text-[#FFD700] font-bold">{info?.amount ? fmtCurrency(info.amount) : ""}</span>.
            </p>
            <Link to="/admin/pagos" className="btn-primary mt-8">Ir a pagos</Link>
          </>
        )}
        {(status === "error" || status === "expired" || status === "timeout") && (
          <>
            <XCircle className="mx-auto text-red-400" size={64} />
            <h1 className="font-display text-4xl text-white mt-4">No se confirmó el pago</h1>
            <p className="text-white/60 mt-2">{status === "expired" ? "La sesión expiró." : "Puedes intentar nuevamente."}</p>
            <Link to="/admin/pagos" className="btn-outline mt-8">Volver a pagos</Link>
          </>
        )}
      </div>
    </section>
  );
}
