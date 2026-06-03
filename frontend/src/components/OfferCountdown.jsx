import React, { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { getOfferTimeLeft } from "@/lib/utils-app";

export default function OfferCountdown({ expiresAt, publicView = false }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const left = getOfferTimeLeft(expiresAt, now);
  if (!left) return null;

  if (publicView) {
    return (
      <div
        className={`mt-4 rounded-sm border p-3 ${
          left.expired
            ? "border-red-500/40 bg-red-950/30"
            : "border-[#FFD700]/50 bg-[#FFD700]/10"
        }`}
        data-testid="offer-countdown"
      >
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#FFD700]">
          <Timer size={14} />
          {left.expired ? "Oferta finalizada" : "¡La promoción termina en!"}
        </div>
        <div
          className={`font-display text-3xl md:text-4xl mt-1 tabular-nums ${
            left.expired ? "text-red-400" : "text-[#FFD700]"
          }`}
        >
          {left.h}:{left.m}:{left.s}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-sm border border-white/10 bg-black/40 p-2">
      <div className="text-[10px] uppercase tracking-widest text-white/40">Tiempo restante oferta</div>
      <div className={`font-display text-2xl tabular-nums ${left.expired ? "text-red-400" : "text-[#FFD700]"}`}>
        {left.h}:{left.m}:{left.s}
      </div>
    </div>
  );
}
