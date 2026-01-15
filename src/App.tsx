
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AdminRoute from "./components/auth/AdminRoute";
import { StaticBackground } from "./components/ui/StaticBackground";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import Dashboard from "./pages/Dashboard";
import AccountSettings from "./pages/AccountSettings";
import PaymentPage from "./pages/PaymentPage";
import PaymentSuccess from "./pages/PaymentSuccess";
import AdminSetup from "./pages/AdminSetup";
import EmailPreview from "./pages/EmailPreview";
import EmailTest from "./pages/EmailTest";
import Privacy from "./pages/Privacy";
import CookieSettings from "./pages/CookieSettings";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import { CookieBanner } from "./components/CookieBanner";
import { supabase } from "./integrations/supabase/client";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        // Optionnel: Rediriger automatiquement après login
        if (event === 'SIGNED_IN' && session) {
          // L'utilisateur vient de se connecter
          console.log('User signed in:', session.user.email);
        }
        
        if (event === 'SIGNED_OUT') {
          // L'utilisateur vient de se déconnecter
          console.log('User signed out');
        }
      }
    );

    // Cleanup
    return () => subscription.unsubscribe();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {/* Static Background - appears behind all content */}
        <StaticBackground />

        {/* Toast notifications */}
        <Toaster
          position="top-right"
          richColors
          expand
          closeButton
          toastOptions={{
            duration: 5000,
            style: {
              background: 'white',
              border: '1px solid #e2e8f0',
              color: '#1f2937',
            },
          }}
        />

        <BrowserRouter>
          <Routes>
            {/* ANONYMOUS ROUTES - No authentication required */}
            <Route path="/" element={<Index />} />
            <Route path="/pay/:userId" element={<PaymentPage />} />
            <Route path="/payment/:userId" element={<PaymentPage />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />

            {/* AUTHENTICATION ROUTES - For login/signup only */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/confirm" element={<AuthCallback />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* LEGAL & PRIVACY ROUTES - Public access */}
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/cookie-settings" element={<CookieSettings />} />

            {/* BLOG ROUTES - Public access for SEO */}
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />

            {/* PROTECTED ROUTES - Authentication required */}
            <Route path="/dashboard" element={
              <AuthProvider>
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              </AuthProvider>
            } />

            <Route path="/settings" element={
              <AuthProvider>
                <ProtectedRoute>
                  <AccountSettings />
                </ProtectedRoute>
              </AuthProvider>
            } />

            <Route path="/admin-setup" element={
              <AuthProvider>
                <AdminRoute>
                  <AdminSetup />
                </AdminRoute>
              </AuthProvider>
            } />

            <Route path="/email-preview" element={
              <AuthProvider>
                <AdminRoute>
                  <EmailPreview />
                </AdminRoute>
              </AuthProvider>
            } />

            <Route path="/email-test" element={
              <AuthProvider>
                <AdminRoute>
                  <EmailTest />
                </AdminRoute>
              </AuthProvider>
            } />

            {/* Route 404 - Fallback */}
            <Route path="*" element={
              <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
                <div className="text-center p-8">
                  <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
                  <p className="text-gray-600 mb-6">Page not found</p>
                  <a
                    href="/"
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Back to Home
                  </a>
                </div>
              </div>
            } />
          </Routes>

          {/* Cookie Banner - Appears outside routes */}
          <CookieBanner />
        </BrowserRouter>
      </TooltipProvider>

      {/* React Query DevTools - Development only */}
      <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />
    </QueryClientProvider>
  );
};

export default App;
