import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ExternalLink, Loader2 } from "lucide-react";
import subscriberApi from "@/lib/subscriberApi";
import { useSubscriberAuth } from "@/contexts/SubscriberAuthContext";
import { fmtCurrency, fmtDate } from "@/lib/utils-app";
import {
  getPendingSessionId,
  openMercadoPagoCheckout,
  pollPaymentStatus,
} from "@/lib/mercadoPagoCheckout";

export default function SubscriberPayments() {
  const { subscriber, refreshMe } = useSubscriberAuth();
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [loadingPay, setLoadingPay] = useState(false);
  const [awaitingPay, setAwaitingPay] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const stopPollRef = useRef(null);

  const load = useCallback(() => {
    subscriberApi.get("/subscriber/payments").then((r) => setRows(r.data || [])).catch(() => setRows([]));
    refreshMe().catch(() => {});
  }, [refreshMe]);

  const confirmSession = useCallback(
    (sessionId) =>
      subscriberApi
        .post("/subscriber/payments/confirm", { session_id: sessionId })
        .then((r) => r.data),
    [],
  );

  const startPolling = useCallback(
    (sessionId) => {
      stopPollRef.current?.();
      setAwaitingPay(true);
      stopPollRef.current = pollPaymentStatus(confirmSession, sessionId, {
        onPaid: () => {
          setAwaitingPay(false);
          setCheckoutUrl("");
          toast.success("¡Pago confirmado! Tu mensualidad quedó registrada.");
          load();
        },
        onFailed: () => {
          setAwaitingPay(false);
          toast.error("El pago no se completó");
        },
        onTimeout: () => {
          setAwaitingPay(false);
          toast.info("Si ya pagaste, espera un momento y pulsa «Ya pagué».");
        },
      });
    },
    [confirmSession, load],
  );

  useEffect(() => {
    load();
    return () => stopPollRef.current?.();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl =
      params.get("session_id") ||
      params.get("external_reference") ||
      params.get("preference_id");
    if (fromUrl || params.get("mp_status")) {
      nav(`/mi/pago-retorno${window.location.search}`, { replace: true });
      return;
    }
    const pending = getPendingSessionId();
    if (pending) startPolling(pending);
  }, [nav, startPolling]);

  const goCheckout = async () => {
    try {
      setLoadingPay(true);
      const { data } = await subscriberApi.post("/subscriber/payments/checkout", {
        origin_url: window.location.origin,
      });
      if (!data?.checkout_url || !data?.session_id) {
        toast.error("No se pudo iniciar el pago");
        return;
      }
      setCheckoutUrl(data.checkout_url);
      const opened = openMercadoPagoCheckout(data.checkout_url, data.session_id);
      if (opened) {
        toast.info("Mercado Pago se abrió en otra pestaña. Al pagar, esta pantalla se actualizará sola.");
      } else {
        toast.warning("Permite ventanas emergentes o abre el enlace de pago abajo.");
      }
      startPolling(data.session_id);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "No se pudo iniciar el pago en línea");
    } finally {
      setLoadingPay(false);
    }
  };

  const manualConfirm = () => {
    const sid = getPendingSessionId();
    if (!sid) {
      toast.error("No hay un pago pendiente");
      return;
    }
    startPolling(sid);
    toast.info("Verificando pago…");
  };

  return (
    <section className="space-y-4" data-testid="subscriber-payments-page">
      <h1 className="font-display text-4xl text-white">Mis pagos</h1>

      {awaitingPay && (
        <div className="glass border border-[#FFD700]/30 p-4 rounded-sm flex flex-wrap items-center gap-4">
          <Loader2 className="animate-spin text-[#FFD700] shrink-0" size={22} />
          <div className="flex-1 min-w-[200px]">
            <div className="text-white font-medium">Esperando confirmación de Mercado Pago</div>
            <p className="text-sm text-white/60 mt-1">
              Paga en la otra pestaña. No necesitas el botón «Volver»: al acreditarse el cobro, verás el pago aquí.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {checkoutUrl && (
              <a
                href={checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline text-xs py-2"
              >
                <ExternalLink size={14} /> Abrir Mercado Pago
              </a>
            )}
            <button type="button" onClick={manualConfirm} className="btn-primary text-xs py-2">
              Ya pagué — verificar
            </button>
          </div>
        </div>
      )}

      <div className="glass p-4 rounded-sm flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-white/40">Paquete</div>
          <div className="text-white">{subscriber?.package?.name || "—"}</div>
          <div className="text-sm text-white/70 mt-1">
            Mensualidad: <span className="text-[#FFD700]">{fmtCurrency(subscriber?.package?.monthly_cost || 0)}</span>
          </div>
          <div className="text-sm text-white/60 mt-1">Próximo vencimiento: {fmtDate(subscriber?.next_due_date)}</div>
        </div>
        <button onClick={goCheckout} disabled={loadingPay || awaitingPay} className="btn-primary text-sm">
          {loadingPay ? "Preparando..." : awaitingPay ? "Pago en proceso…" : "Pagar en línea"}
        </button>
      </div>

      <div className="glass rounded-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[680px]">
          <thead>
            <tr className="text-left text-xs uppercase tracking-widest text-white/40 border-b border-white/5">
              <th className="p-3">Fecha</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Método</th>
              <th className="p-3">Monto</th>
              <th className="p-3">Próximo vto.</th>
              <th className="p-3">Notas</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b border-white/5 text-white/80">
                <td className="p-3">{fmtDate(p.payment_date)}</td>
                <td className="p-3 capitalize">{p.type}</td>
                <td className="p-3 capitalize">{p.method}</td>
                <td className="p-3 text-[#E63946] font-bold">{fmtCurrency(p.amount)}</td>
                <td className="p-3">{fmtDate(p.next_due_date)}</td>
                <td className="p-3 text-white/50">{p.notes || "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-white/40">Sin pagos</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
