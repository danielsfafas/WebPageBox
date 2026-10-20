import { useEffect, useState } from "react";
import api from "@/lib/api";

const SETTINGS_CACHE_KEY = "gym_settings_cache";
const SETTINGS_CACHE_TIMESTAMP_KEY = "gym_settings_cache_ts";
const CACHE_MAX_AGE_MS = 1000 * 60 * 60; // 1 hour

function getCachedSettings() {
  try {
    const cached = localStorage.getItem(SETTINGS_CACHE_KEY);
    const timestamp = localStorage.getItem(SETTINGS_CACHE_TIMESTAMP_KEY);
    if (cached && timestamp) {
      const age = Date.now() - parseInt(timestamp, 10);
      if (age < CACHE_MAX_AGE_MS) {
        return JSON.parse(cached);
      }
    }
  } catch (e) {
    console.warn("Failed to read settings cache:", e);
  }
  return null;
}

function setCachedSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(settings));
    localStorage.setItem(SETTINGS_CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch (e) {
    console.warn("Failed to cache settings:", e);
  }
}

export function useSettings() {
  const [settings, setSettings] = useState(() => {
    return getCachedSettings() || { gym_name: "BOXING GYM" };
  });

  useEffect(() => {
    const load = () => {
      api.get("/settings")
        .then((r) => {
          const newSettings = r.data || {};
          setSettings(newSettings);
          setCachedSettings(newSettings);
        })
        .catch(() => {});
    };
    
    load();
    
    const onUpdated = (e) => {
      if (e?.detail) {
        setSettings(e.detail);
        setCachedSettings(e.detail);
      } else {
        load();
      }
    };
    
    window.addEventListener("app-settings-updated", onUpdated);
    return () => window.removeEventListener("app-settings-updated", onUpdated);
  }, []);
  
  return settings;
}

export const fmtCurrency = (amount, symbol = "$") => {
  const n = Number(amount || 0);
  return `${symbol}${n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const fmtDate = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
};

export const fmtDateTime = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-MX", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
};

export function getOfferTimeLeft(isoDate, now = Date.now()) {
  if (!isoDate) return null;
  const ms = new Date(isoDate).getTime() - now;
  if (Number.isNaN(ms)) return null;
  if (ms <= 0) {
    return { h: "00", m: "00", s: "00", expired: true };
  }
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return {
    h: String(h).padStart(2, "0"),
    m: String(m).padStart(2, "0"),
    s: String(s).padStart(2, "0"),
    expired: false,
  };
}

export const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
