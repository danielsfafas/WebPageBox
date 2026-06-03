/**
 * Abre Mercado Pago en otra pestaña y permite confirmar el pago sin depender
 * del botón "Volver a la tienda" (no aparece en localhost / algunas cuentas).
 */
export function openMercadoPagoCheckout(checkoutUrl, sessionId) {
  if (sessionId) {
    localStorage.setItem("mp_pending_session", sessionId);
  }
  const popup = window.open(checkoutUrl, "_blank", "noopener,noreferrer");
  return Boolean(popup);
}

export function pollPaymentStatus(confirmFn, sessionId, callbacks = {}) {
  const {
    onPaid,
    onFailed,
    onTimeout,
    intervalMs = 2500,
    maxAttempts = 150,
  } = callbacks;

  let attempts = 0;
  let stopped = false;

  const stop = () => {
    if (stopped) return;
    stopped = true;
    clearInterval(timer);
    window.removeEventListener("focus", tick);
  };

  const tick = async () => {
    if (stopped || !sessionId) return;
    attempts += 1;
    try {
      const data = await confirmFn(sessionId);
      if (data?.payment_status === "paid") {
        stop();
        localStorage.removeItem("mp_pending_session");
        onPaid?.(data);
        return;
      }
      if (data?.payment_status === "failed") {
        stop();
        onFailed?.(data);
        return;
      }
    } catch {
      /* sigue intentando */
    }
    if (attempts >= maxAttempts) {
      stop();
      onTimeout?.();
    }
  };

  tick();
  const timer = setInterval(tick, intervalMs);
  window.addEventListener("focus", tick);

  return stop;
}

export function getPendingSessionId() {
  return localStorage.getItem("mp_pending_session") || "";
}
