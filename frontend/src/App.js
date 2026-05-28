import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import "@/App.css";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

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

function App() {
  return (
    <AuthProvider>
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
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
