import { useContext } from "react";
import { useLocation } from "wouter";
import { AppContext } from "@/context/AppContext";
import { useAuth } from "@/hooks/use-auth";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { motion } from "framer-motion";
import Avatar from "@/components/ui/avatar";

// Desktop header component shown only on desktop devices
const DesktopHeader = () => {
  const { isDarkMode, toggleDarkMode } = useContext(AppContext);
  const { user } = useAuth();
  const [location] = useLocation();
  
  // Get page title based on current location
  const getPageTitle = () => {
    switch (location) {
      case "/":
        return "Dashboard";
      case "/notifications":
        return "Notifications";
      case "/settings":
        return "Settings";
      case "/past-trips":
        return "Past Trips";
      default:
        return "TripMate";
    }
  };
  
  return (
    <motion.header 
      className="fixed top-0 left-64 right-0 bg-card shadow-sm py-4 px-6 flex justify-between items-center hidden md:flex z-50 border-b"
      initial={{ y: -50 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center space-x-3">
        <h1 className="text-2xl font-bold">{getPageTitle()}</h1>
      </div>
      
      <div className="flex items-center space-x-3">
        <ThemeToggle />
        
        <NotificationCenter />
        
        <div className="flex items-center space-x-3 pl-3 border-l border-border">
          <div className="text-right">
            <p className="text-sm font-medium">{user?.displayName || "User"}</p>
            <p className="text-xs text-muted-foreground">{user?.email || ""}</p>
          </div>
          <Avatar 
            src={user?.avatar ?? undefined}
            fallback={user?.displayName ?? undefined}
            size="md"
            className="border-2 border-primary-200/50 shadow-sm"
          />
        </div>
      </div>
    </motion.header>
  );
};

export default DesktopHeader;