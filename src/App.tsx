import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Catalog from "./pages/Catalog";
import CatalogSection from "./pages/CatalogSection";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import NotFound from "./pages/NotFound";

// Catalog layout
import { CatalogLayout } from "./components/catalog/CatalogLayout";

// Admin imports
import { AdminLayout } from "./components/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Sections from "./pages/admin/Sections";
import SectionEdit from "./pages/admin/SectionEdit";
import AdminProperties from "./pages/admin/Properties";
import PropertyEdit from "./pages/admin/PropertyEdit";
import PropertyOptionEdit from "./pages/admin/PropertyOptionEdit";
import Products from "./pages/admin/Products";
import ProductEdit from "./pages/admin/ProductEdit";
import Orders from "./pages/admin/Orders";
import OrderDetail from "./pages/admin/OrderDetail";
import OrderStatuses from "./pages/admin/OrderStatuses";
import Users from "./pages/admin/Users";
import UserEdit from "./pages/admin/UserEdit";
import UserCategories from "./pages/admin/UserCategories";
import UserCategoryEdit from "./pages/admin/UserCategoryEdit";
import UserCategoryRules from "./pages/admin/UserCategoryRules";
import UserCategoryRuleEdit from "./pages/admin/UserCategoryRuleEdit";
import Plugins from "./pages/admin/Plugins";
import PluginSettings from "./pages/admin/PluginSettings";
import PlaceholderPage from "./pages/admin/PlaceholderPage";
import Shipping from "./pages/admin/Shipping";
import ShippingMethods from "./pages/admin/ShippingMethods";
import ShippingMethodEdit from "./pages/admin/ShippingMethodEdit";
import ShippingZones from "./pages/admin/ShippingZones";
import ShippingZoneEdit from "./pages/admin/ShippingZoneEdit";
import PickupPoints from "./pages/admin/PickupPoints";
import PickupPointEdit from "./pages/admin/PickupPointEdit";
import Settings from "./pages/admin/Settings";


// Public property pages
import Properties from "./pages/Properties";
import PropertyDetail from "./pages/PropertyDetail";
import PropertyPage from "./pages/PropertyPage";

// Profile pages
import { ProfileLayout } from "./components/profile/ProfileLayout";
import Profile from "./pages/Profile";
import ProfileOrders from "./pages/ProfileOrders";
import ProfileOrderDetail from "./pages/ProfileOrderDetail";
import ProfileSettings from "./pages/ProfileSettings";

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
          <CartProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  
                  {/* Catalog routes with shared layout */}
                  <Route element={<CatalogLayout />}>
                    <Route path="/catalog" element={<Catalog />} />
                    <Route path="/catalog/:sectionSlug" element={<CatalogSection />} />
                    <Route path="/catalog/:sectionSlug/:productSlug" element={<ProductDetail />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/order-success/:orderId" element={<OrderSuccess />} />
                    
                    {/* Property pages */}
                    <Route path="/properties" element={<Properties />} />
                    <Route path="/properties/:propertySlug" element={<PropertyDetail />} />
                    <Route path="/properties/:propertySlug/:optionSlug" element={<PropertyPage />} />
                  </Route>
                  
                  {/* Profile routes (protected) */}
                  <Route path="/profile" element={<ProfileLayout />}>
                    <Route index element={<Profile />} />
                    <Route path="orders" element={<ProfileOrders />} />
                    <Route path="orders/:orderId" element={<ProfileOrderDetail />} />
                    <Route path="settings" element={<ProfileSettings />} />
                  </Route>
                  
                  {/* Admin routes */}
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="sections" element={<Sections />} />
                    <Route path="sections/:sectionId" element={<SectionEdit />} />
                    <Route path="properties" element={<AdminProperties />} />
                    <Route path="properties/:propertyId" element={<PropertyEdit />} />
                    <Route path="properties/:propertyId/options/new" element={<PropertyOptionEdit />} />
                    <Route path="properties/:propertyId/options/:optionId" element={<PropertyOptionEdit />} />
                    <Route path="products" element={<Products />} />
                    <Route path="products/:productId" element={<ProductEdit />} />
                    <Route path="orders" element={<Orders />} />
                    <Route path="orders/:orderId" element={<OrderDetail />} />
                    <Route path="order-statuses" element={<OrderStatuses />} />
                    <Route path="plugins" element={<Plugins />} />
                    <Route path="plugins/:pluginId" element={<PluginSettings />} />
                    <Route path="shipping" element={<Shipping />} />
                    <Route path="shipping/methods" element={<ShippingMethods />} />
                    <Route path="shipping/methods/:methodId" element={<ShippingMethodEdit />} />
                    <Route path="shipping/zones" element={<ShippingZones />} />
                    <Route path="shipping/zones/:zoneId" element={<ShippingZoneEdit />} />
                    <Route path="shipping/pickup-points" element={<PickupPoints />} />
                    <Route path="shipping/pickup-points/:pointId" element={<PickupPointEdit />} />
                    <Route path="users" element={<Users />} />
                    <Route path="users/:userId" element={<UserEdit />} />
                    <Route path="user-categories" element={<UserCategories />} />
                    <Route path="user-categories/new" element={<UserCategoryEdit />} />
                    <Route path="user-categories/:categoryId" element={<UserCategoryEdit />} />
                    <Route path="user-categories/rules" element={<UserCategoryRules />} />
                    <Route path="user-categories/rules/new" element={<UserCategoryRuleEdit />} />
                    <Route path="user-categories/rules/:ruleId" element={<UserCategoryRuleEdit />} />
                    <Route path="services" element={<PlaceholderPage />} />
                    <Route path="service-requests" element={<PlaceholderPage />} />
                    <Route path="languages" element={<PlaceholderPage />} />
                    <Route path="settings" element={<Settings />} />
                  </Route>
                  
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
