import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import "@/App.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriberAuthProvider } from "@/contexts/SubscriberAuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import SubscriberProtectedRoute from "@/components/SubscriberProtectedRoute";
import api from "@/lib/api";

import Home from "@/pages/public/Home";
import ProductsPage from "@/pages/public/ProductsPage";
import EventsPage from "@/pages/public/EventsPage";
import PackagesPage from "@/pages/public/PackagesPage";
import ContactPage from "@/pages/public/ContactPage";
import PaymentSuccess from "@/pages/public/PaymentSuccess";
import PublicLayout from "@/pages/public/PublicLayout";

import AdminLogin from "@/pages/admin/AdminLogin";
import AdminLayout from "@/pages/admin/AdminLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminProducts from "@/pages/admin/AdminProducts";
import AdminPackages from "@/pages/admin/AdminPackages";
import AdminSubscribers from "@/pages/admin/AdminSubscribers";
import AdminSubscriberDetail from "@/pages/admin/AdminSubscriberDetail";
import AdminPayments from "@/pages/admin/AdminPayments";
import AdminEvents from "@/pages/admin/AdminEvents";
import AdminMessages from "@/pages/admin/AdminMessages";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminPaymentReturn from "@/pages/admin/AdminPaymentReturn";
import SubscriberLayout from "@/pages/subscriber/SubscriberLayout";
import SubscriberLogin from "@/pages/subscriber/SubscriberLogin";
import SubscriberProfile from "@/pages/subscriber/SubscriberProfile";
import SubscriberProgress from "@/pages/subscriber/SubscriberProgress";
import SubscriberGallery from "@/pages/subscriber/SubscriberGallery";
import SubscriberPayments from "@/pages/subscriber/SubscriberPayments";
import SubscriberPaymentReturn from "@/pages/subscriber/SubscriberPaymentReturn";

function App() {
  const applyAppSettings = (settings = {}) => {
    const theme = settings.theme || "crimson-knockout";
    const gymName = settings.gym_name || "Ironfist Boxing Gym";
    const logo = settings.logo || "";

    document.body.setAttribute("data-theme", theme);
    document.title = gymName;

    let favicon = document.querySelector("link[rel='icon']");
    if (!favicon) {
      favicon = document.createElement("link");
      favicon.setAttribute("rel", "icon");
      document.head.appendChild(favicon);
    }
    favicon.setAttribute("href", logo || `${process.env.PUBLIC_URL}/favicon.ico`);

    // Preload logo for faster loading
    if (logo) {
      let preload = document.querySelector("link[rel='preload'][as='image'][data-logo='true']");
      if (!preload) {
        preload = document.createElement("link");
        preload.setAttribute("rel", "preload");
        preload.setAttribute("as", "image");
        preload.setAttribute("data-logo", "true");
        document.head.appendChild(preload);
      }
      preload.setAttribute("href", logo);
      preload.setAttribute("fetchpriority", "high");
    }
  };

  useEffect(() => {
    // Try to apply cached settings immediately
    try {
      const cached = localStorage.getItem("gym_settings_cache");
      if (cached) {
        applyAppSettings(JSON.parse(cached));
      }
    } catch (e) {
      // Ignore cache errors
    }

    // Fetch fresh settings in background
    api.get("/settings")
      .then((r) => {
        applyAppSettings(r?.data || {});
      })
      .catch(() => {
        applyAppSettings({});
      });

    const onSettingsUpdated = (event) => {
      applyAppSettings(event?.detail || {});
    };
    window.addEventListener("app-settings-updated", onSettingsUpdated);
    return () => window.removeEventListener("app-settings-updated", onSettingsUpdated);
  }, []);

  return (
    <AuthProvider>
      <SubscriberAuthProvider>
        <BrowserRouter>
          <Toaster theme="dark" position="top-right" richColors />
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/productos" element={<ProductsPage />} />
              <Route path="/eventos" element={<EventsPage />} />
              <Route path="/paquetes" element={<PackagesPage />} />
              <Route path="/contacto" element={<ContactPage />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />
            </Route>

            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="productos" element={<AdminProducts />} />
              <Route path="paquetes" element={<AdminPackages />} />
              <Route path="suscriptores" element={<AdminSubscribers />} />
              <Route path="suscriptores/:id" element={<AdminSubscriberDetail />} />
              <Route path="pagos" element={<AdminPayments />} />
              <Route path="eventos" element={<AdminEvents />} />
              <Route path="mensajes" element={<AdminMessages />} />
              <Route path="configuracion" element={<AdminSettings />} />
              <Route path="payment-return" element={<AdminPaymentReturn />} />
            </Route>

            <Route path="/mi/login" element={<SubscriberLogin />} />
            <Route path="/mi/pago-retorno" element={<SubscriberPaymentReturn />} />
            <Route
              path="/mi"
              element={(
                <SubscriberProtectedRoute>
                  <SubscriberLayout />
                </SubscriberProtectedRoute>
              )}
            >
              <Route index element={<Navigate to="/mi/perfil" replace />} />
              <Route path="perfil" element={<SubscriberProfile />} />
              <Route path="progreso" element={<SubscriberProgress />} />
              <Route path="galeria" element={<SubscriberGallery />} />
              <Route path="pagos" element={<SubscriberPayments />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </SubscriberAuthProvider>
    </AuthProvider>
  );
}

export default App;
