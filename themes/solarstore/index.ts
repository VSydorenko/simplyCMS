/**
 * SolarStore Theme
 *
 * Blue palette for solar energy equipment store.
 */

import manifest from "./manifest";
import "./styles/theme.css";

// Layouts
import { MainLayout } from "./layouts/MainLayout";
import { CatalogLayout } from "./layouts/CatalogLayout";
import { ProfileLayout } from "./layouts/ProfileLayout";

// Pages
import HomePage from "./pages/HomePage";
import CatalogPage from "./pages/CatalogPage";
import CatalogSectionPage from "./pages/CatalogSectionPage";
import ProductPage from "./pages/ProductPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderSuccessPage from "./pages/OrderSuccessPage";
import AuthPage from "./pages/AuthPage";
import ProfilePage from "./pages/ProfilePage";
import ProfileOrdersPage from "./pages/ProfileOrdersPage";
import ProfileOrderDetailPage from "./pages/ProfileOrderDetailPage";
import ProfileSettingsPage from "./pages/ProfileSettingsPage";
import PropertiesPage from "./pages/PropertiesPage";
import PropertyDetailPage from "./pages/PropertyDetailPage";
import PropertyOptionPage from "./pages/PropertyOptionPage";
import NotFoundPage from "./pages/NotFoundPage";

// Components
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";

const theme = {
  manifest,

  MainLayout,
  CatalogLayout,
  ProfileLayout,

  pages: {
    HomePage,
    CatalogPage,
    CatalogSectionPage,
    ProductPage,
    CartPage,
    CheckoutPage,
    OrderSuccessPage,
    AuthPage,
    ProfilePage,
    ProfileOrdersPage,
    ProfileOrderDetailPage,
    ProfileSettingsPage,
    PropertiesPage,
    PropertyDetailPage,
    PropertyOptionPage,
    NotFoundPage,
  },

  components: {
    Header,
    Footer,
  },
};

export default theme;
