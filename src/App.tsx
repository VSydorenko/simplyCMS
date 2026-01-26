import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Catalog from "./pages/Catalog";
import CatalogSection from "./pages/CatalogSection";
import ProductDetail from "./pages/ProductDetail";
import NotFound from "./pages/NotFound";

// Admin imports
import { AdminLayout } from "./components/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Sections from "./pages/admin/Sections";
import SectionProperties from "./pages/admin/SectionProperties";
import Products from "./pages/admin/Products";
import ProductEdit from "./pages/admin/ProductEdit";
import Orders from "./pages/admin/Orders";
import PlaceholderPage from "./pages/admin/PlaceholderPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="solarstore-theme">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/catalog" element={<Catalog />} />
                <Route path="/catalog/:sectionSlug" element={<CatalogSection />} />
                <Route path="/catalog/:sectionSlug/:productSlug" element={<ProductDetail />} />
                
                {/* Admin routes */}
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="sections" element={<Sections />} />
                  <Route path="sections/:sectionId/properties" element={<SectionProperties />} />
                  <Route path="products" element={<Products />} />
                  <Route path="products/:productId" element={<ProductEdit />} />
                  <Route path="orders" element={<Orders />} />
                  <Route path="order-statuses" element={<PlaceholderPage />} />
                  <Route path="services" element={<PlaceholderPage />} />
                  <Route path="service-requests" element={<PlaceholderPage />} />
                  <Route path="users" element={<PlaceholderPage />} />
                  <Route path="user-categories" element={<PlaceholderPage />} />
                  <Route path="languages" element={<PlaceholderPage />} />
                  <Route path="settings" element={<PlaceholderPage />} />
                </Route>
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
