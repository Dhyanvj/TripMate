import { useLocation, Link } from "wouter";
import { useContext } from "react";
import { motion } from "framer-motion";
import { AppContext } from "@/context/AppContext";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import Avatar from "@/components/ui/avatar";

const Sidebar = () => {
  const [location, navigate] = useLocation();
  const { isDarkMode, toggleDarkMode } = useContext(AppContext);
  const { user, logoutMutation } = useAuth();
  const { notifications } = useNotifications();
  
  const unreadCount = notifications.filter((n) => !n.read).length;
  
  const NavItem = ({ 
    href, 
    icon, 
    label, 
    isActive, 
    badge = 0,
    onClick
  }: { 
    href?: string; 
    icon: string; 
    label: string; 
    isActive: boolean; 
    badge?: number;
    onClick?: () => void;
  }) => {
    const content = (
      <div
        className={cn(
          "flex items-center space-x-3 px-3 py-2 rounded-lg relative",
          isActive 
            ? "bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400" 
            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
        )}
        onClick={onClick}
      >
        <i className={`${icon} text-xl`}></i>
        <span className={isActive ? "font-medium" : ""}>{label}</span>
        
        {badge > 0 && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
    );
    
    if (href && !onClick) {
      return <Link href={href}>{content}</Link>;
    }
    
    return content;
  };
  
  return (
    <motion.aside 
      className="hidden md:flex md:flex-col md:w-64 bg-card border-r border-border h-full"
      initial={{ x: -50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-primary-600 to-secondary-500 text-white p-2 rounded-lg">
              <i className="ri-suitcase-line text-xl"></i>
            </div>
            <h1 className="text-xl font-semibold text-gradient">TripMate</h1>
          </div>
          
          <div className="flex">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              className="mr-1"
            >
              {isDarkMode ? (
                <i className="ri-sun-line text-lg"></i>
              ) : (
                <i className="ri-moon-line text-lg"></i>
              )}
            </Button>
            <NotificationCenter />
          </div>
        </div>
      </div>
      
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        <NavItem 
          href="/"
          icon="ri-dashboard-line"
          label="Dashboard"
          isActive={location === '/'} 
        />
        
        <NavItem 
          href="/past-trips"
          icon="ri-time-line"
          label="Past Trips"
          isActive={location === '/past-trips'} 
        />
        
        <NavItem 
          href="/create-trip"
          icon="ri-add-circle-line"
          label="Create Trip"
          isActive={location === '/create-trip'} 
        />
        
        <NavItem 
          href="/join-trip"
          icon="ri-ticket-2-line"
          label="Join Trip"
          isActive={location === '/join-trip'} 
        />
        
        <div className="my-6 border-t border-border"></div>
        
        <NavItem 
          href="/notifications"
          icon="ri-notification-3-line"
          label="Notifications"
          isActive={location === '/notifications'}
          badge={unreadCount}
        />
        
        <NavItem 
          href="/settings"
          icon="ri-settings-4-line"
          label="Settings"
          isActive={location === '/settings'} 
        />
      </nav>
      
      <div className="p-4 border-t border-border">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Avatar 
              src={user?.avatar ?? undefined}
              fallback={user?.displayName ?? undefined}
              size="sm"
            />
            <div>
              <p className="font-medium text-sm">{user?.displayName || 'Guest User'}</p>
              <p className="text-xs text-gray-500">{user?.email || ''}</p>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              logoutMutation.mutate();
              navigate('/auth');
            }}
            disabled={logoutMutation.isPending}
            className="text-gray-500 hover:text-gray-700"
          >
            <i className="ri-logout-box-r-line"></i>
          </Button>
        </div>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
