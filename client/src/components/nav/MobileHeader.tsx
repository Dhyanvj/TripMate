import { useContext } from "react";
import { Link, useLocation } from "wouter";
import { AppContext } from "@/context/AppContext";
import { useAuth } from "@/hooks/use-auth";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { motion } from "framer-motion";
import Avatar from "@/components/ui/avatar";

// Mobile header component shown only on mobile devices
const MobileHeader = () => {
  const { isDarkMode, toggleDarkMode } = useContext(AppContext);
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  
  // Don't show back button on home page
  const showBackButton = location !== "/";
  
  const handleBack = () => {
    navigate("/");
  };
  
  const handleProfileClick = () => {
    navigate("/settings");
  };
  
  return (
    <motion.header 
      className="fixed top-0 left-0 right-0 bg-card shadow-sm py-4 px-4 flex justify-between items-center md:hidden z-50 border-b"
      initial={{ y: -50 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center space-x-2">
        {showBackButton ? (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleBack}
            className="mr-2"
          >
            <i className="ri-arrow-left-line text-xl"></i>
          </Button>
        ) : (
          <div className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white p-2 rounded-full">
            <i className="ri-suitcase-line text-xl"></i>
          </div>
        )}
        <h1 className="text-xl font-semibold">TripMate</h1>
      </div>
      
      <div className="flex items-center space-x-1">
        <ThemeToggle />
        
        <NotificationCenter />
        
        <Button 
          variant="ghost" 
          size="icon"
          onClick={handleProfileClick}
          className="relative"
        >
          <Avatar 
            src={user?.avatar ?? undefined}
            fallback={user?.displayName ?? undefined}
            size="sm"
          />
        </Button>
      </div>
    </motion.header>
  );
};

export default MobileHeader;