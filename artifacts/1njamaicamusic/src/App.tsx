import { useState, useCallback } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnimatePresence } from "framer-motion";

import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import CustomCursor from "@/components/CustomCursor";
import GrainOverlay from "@/components/GrainOverlay";
import Navigation from "@/components/Navigation";
import CartDrawer from "@/components/CartDrawer";
import Loader from "@/components/Loader";

import Home from "@/pages/Home";
import Artists from "@/pages/Artists";
import ArtistPage from "@/pages/ArtistPage";
import ReleaseDetail from "@/pages/ReleaseDetail";
import Events from "@/pages/Events";
import EventDetail from "@/pages/EventDetail";
import Booking from "@/pages/Booking";
import ShopPage from "@/pages/ShopPage";
import ProductDetail from "@/pages/ProductDetail";
import CheckoutPage from "@/pages/CheckoutPage";
import OrderConfirmation from "@/pages/OrderConfirmation";
import AuthPage from "@/pages/AuthPage";
import AccountPage from "@/pages/AccountPage";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function App() {
  const [loaded, setLoaded] = useState(false);
  const handleLoaderComplete = useCallback(() => setLoaded(true), []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <CartProvider>
            <Loader onComplete={handleLoaderComplete} />
            <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <CustomCursor />
              <GrainOverlay />
              <Navigation />
              <CartDrawer />
              <AnimatePresence mode="wait">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/artists" element={<Artists />} />
                  <Route path="/artists/:artist" element={<ArtistPage />} />
                  <Route path="/releases/:slug" element={<ReleaseDetail />} />
                  <Route path="/events" element={<Events />} />
                  <Route path="/events/:slug" element={<EventDetail />} />
                  <Route path="/booking" element={<Booking />} />
                  <Route path="/shop" element={<ShopPage />} />
                  <Route path="/shop/:productId" element={<ProductDetail />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/order-confirmation" element={<OrderConfirmation />} />
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/account" element={<AccountPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AnimatePresence>
            </BrowserRouter>
            <Toaster />
          </CartProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
