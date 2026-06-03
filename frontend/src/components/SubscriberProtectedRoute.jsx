import React from "react";
import { Navigate } from "react-router-dom";
import { useSubscriberAuth } from "@/contexts/SubscriberAuthContext";

export default function SubscriberProtectedRoute({ children }) {
  const { subscriber, ready } = useSubscriberAuth();
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-sm tracking-widest text-gray-400 uppercase">Cargando…</div>
      </div>
    );
  }
  if (!subscriber) return <Navigate to="/mi/login" replace />;
  return children;
}
