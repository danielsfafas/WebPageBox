import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import subscriberApi from "@/lib/subscriberApi";
import { fmtCurrency } from "@/lib/utils-app";
import { useSubscriberAuth } from "@/contexts/SubscriberAuthContext";

function resolveSessionId(searchParams) {
  return (
    searchParams.get("session_id") ||
    searchParams.get("external_reference") ||
    searchParams.get("preference_id") ||
    localStorage.getItem("mp_pending_session") ||
    ""
  );
}

export default function SubscriberPaymentReturn() {
  const [searchParams] = useSearchParams();
  const nav = useNavigate();
  const { subscriber, ready } = useSubscriberAuth();
  const [status, setStatus] = useState("polling");
  const [info, setInfo] = useState(null);

  const sessionId = resolveSessionId(searchParams);
  const mpStatus =
    searchParams.get("mp_status") ||
    searchParams.get("status") ||
    searchParams.get("collection_status");

  useEffect(() => {
    if (!sessionId) {
      setStatus(mpStatus === "approved" ? "polling" : "error");
      if (!mpStatus) setStatus("error");
      return;
    }

    let attempts = 0;
    let cancelled = false;

    const sync = async () => {
      attempts += 1;
      try {
        let data;
        const token = localStorage.getItem("subscriber_token");
        if (token) {
          try {
            const r = await subscriberApi.post("/subscriber/payments/confirm", {
              session_id: sessionId,
            });
            data = r.data;
          } catch {
            const r = await api.get(`/payments/checkout/status/${sessionId}`);
            data = r.data;
          }
        } else {
          const r = await api.get(`/payments/checkout/status/${sessionId}`);
          data = r.data;
        }

        if (cancelled) return;
        setInfo(data);

        if (data.payment_status === "paid") {
          localStorage.removeItem("mp_pending_session");
          setStatus("paid");
          toast.success("Pago registrado correctamente");
          window.history.replaceState({}, "", "/mi/pago-retorno");
          setTimeout(() => nav("/mi/pagos", { replace: true }), 2200);
          return;
        }
        if (data.payment_status === "failed" || mpStatus === "rejected" || mpStatus === "failure") {
          setStatus("failed");
          return;
        }
        if (attempts >= 15) {
          setStatus("timeout");
          return;
        }
        setTimeout(sync, 2000);
      } catch {
        if (cancelled) return;
        if (attempts >= 15) setStatus("error");
        else setTimeout(sync, 2000);
      }
    };

    sync();
    return () => {
      cancelled = true;
    };
  }, [sessionId, mpStatus, nav, ready, subscriber]);

  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#0A0A0A] text-white">
        <Loader2 className="animate-spin text-[#FFD700]" size={40} />
      </div>
    );
  }

  return (
    <section className="min-h-screen grid place-items-center px-4 py-12 bg-[#0A0A0A]" data-testid="subscriber-payment-return">
      <div className="glass-strong max-w-lg w-full p-10 rounded-sm text-center">
        {status === "polling" && (
          <>
            <Loader2 className="mx-auto animate-spin text-[#FFD700]" size={48} />
            <h1 className="font-display text-3xl text-white mt-4">Confirmando tu pago…</h1>
            <p className="text-white/60 mt-2 text-sm">
              Mercado Pago aprobó el cobro. Estamos registrando tu mensualidad en el gimnasio.
            </p>
          </>
        )}
        {status === "paid" && (
          <>
            <CheckCircle2 className="mx-auto text-green-400" size={64} />
            <h1 className="font-display text-4xl text-white mt-4">¡Pago confirmado!</h1>
            <p className="text-white/70 mt-3">
              {info?.amount ? (
                <>
                  Monto: <span className="text-[#FFD700] font-bold">{fmtCurrency(info.amount)}</span>
                </>
              ) : (
                "Tu mensualidad quedó registrada."
              )}
            </p>
            <p className="text-white/50 text-sm mt-2">Redirigiendo a Mis pagos…</p>
            <Link to="/mi/pagos" className="btn-primary mt-6 inline-flex">
              Ir a Mis pagos ahora
            </Link>
          </>
        )}
        {(status === "failed" || status === "error" || status === "timeout") && (
          <>
            <XCircle className="mx-auto text-red-400" size={64} />
            <h1 className="font-display text-3xl text-white mt-4">No se confirmó el pago</h1>
            <p className="text-white/60 mt-2 text-sm">
              {status === "timeout"
                ? "El pago puede estar en proceso. Revisa Mis pagos en unos minutos."
                : "Intenta de nuevo o contacta al gimnasio."}
            </p>
            <div className="mt-6 flex flex-col gap-2">
              {subscriber ? (
                <Link to="/mi/pagos" className="btn-primary">
                  Volver a Mis pagos
                </Link>
              ) : (
                <Link to="/mi/login" className="btn-primary">
                  Iniciar sesión
                </Link>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
