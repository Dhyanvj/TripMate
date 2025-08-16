import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "./lib/queryClient";
import { AppProvider } from "@/context/AppContext";
import { ThemeProvider } from "./components/theme-provider";
import { AuthProvider } from "@/hooks/use-auth";
import { NotificationProvider } from "@/hooks/use-notifications";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Pages
import Dashboard from "@/pages/Dashboard";
import TripDetail from "@/pages/TripDetail";
import ItineraryPage from "@/pages/ItineraryPage";
import CreateTrip from "@/pages/CreateTrip";
import JoinTrip from "@/pages/JoinTrip";
import PastTrips from "@/pages/PastTrips";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import SettingsPage from "@/pages/SettingsPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import NotificationsPage from "@/pages/NotificationsPage";

// Components
import Sidebar from "@/components/nav/Sidebar";
import MobileNav from "@/components/nav/MobileNav";
import MobileHeader from "./components/nav/MobileHeader";
import DesktopHeader from "./components/nav/DesktopHeader";
import { InstallPWA } from "./components/InstallPWA";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { OfflineBanner } from "./components/OfflineBanner";

// Main App Component
function App() {
  console.log('%cTripMate App: Component loading...', 'color:purple; font-size:14px');
  
  const [location] = useLocation();
  
  // Set document title
  useEffect(() => {
    document.title = "TripMate - Group Trip Planning";
    console.log('%cTripMate App: Component mounted', 'color:green; font-size:14px');
  }, []);

  // Determine if sidebar should be shown
  const isAuthPage = location === '/auth';
  const isForgotPasswordPage = location === '/forgot-password';
  const isResetPasswordPage = location.startsWith('/reset-password');
  const isCreatePage = location.startsWith('/create-trip');
  const showNavigation = !isAuthPage && !isCreatePage && !isForgotPasswordPage && !isResetPasswordPage;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppProvider>
          <NotificationProvider>
            <ThemeProvider defaultTheme={{ mode: "light", presetId: "ocean" }} storageKey="vite-ui-theme">
              <TooltipProvider>
                <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground transition-colors duration-150 overflow-hidden">
                  {/* Mobile Header - shown on mobile only */}
                  {showNavigation && <MobileHeader />}

                  {/* Desktop Header - shown on desktop only */}
                  {showNavigation && <DesktopHeader />}

                  {/* Sidebar - hidden on mobile, shown on desktop */}
                  {showNavigation && <Sidebar />}

                  {/* Main Content */}
                  <main className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden pt-16 md:pt-20">
                    <div className="flex-1 flex flex-col">
                      {/* Offline Banner */}
                      <div className="px-4 pt-4">
                        <OfflineBanner />
                      </div>
                      <Switch>
                        <Route path="/auth" component={AuthPage} />
                        <Route path="/forgot-password" component={ForgotPasswordPage} />
                        <Route path="/reset-password" component={ResetPasswordPage} />
                        
                        {/* Protected Routes */}
                        <ProtectedRoute path="/" component={Dashboard} />
                        <ProtectedRoute path="/trips/:id" component={TripDetail} />
                        <ProtectedRoute path="/trips/:id/itinerary" component={ItineraryPage} />
                        <ProtectedRoute path="/create-trip" component={CreateTrip} />
                        <ProtectedRoute path="/join-trip" component={JoinTrip} />
                        <ProtectedRoute path="/past-trips" component={PastTrips} />
                        <ProtectedRoute path="/notifications" component={NotificationsPage} />
                        <ProtectedRoute path="/settings" component={SettingsPage} />
                        
                        {/* 404 Page */}
                        <Route component={NotFound} />
                      </Switch>
                    </div>
                  </main>

                  {/* Mobile Bottom Navigation - shown on mobile only */}
                  {showNavigation && <MobileNav />}

                  {/* PWA Install Prompt */}
                  <InstallPWA />
                  
                  {/* Offline Indicator */}
                  <OfflineIndicator />

                  <Toaster />
                </div>
              </TooltipProvider>
            </ThemeProvider>
          </NotificationProvider>
        </AppProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
