import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { useNotifications } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";

const MobileNav = () => {
  const [location, navigate] = useLocation();
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
      <motion.div 
        className={cn(
          "flex flex-col items-center p-3 relative transition-all duration-200",
          isActive 
            ? "text-primary bg-primary/10 rounded-lg" 
            : "hover:bg-muted/50 rounded-lg"
        )}
        style={isActive ? {} : { color: 'var(--foreground)', opacity: '0.7' }}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.1 }}
        onClick={onClick}
      >
        <i className={`${icon} text-xl`}></i>
        <span className="text-xs mt-1 font-medium">{label}</span>
        {badge > 0 && (
          <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-card shadow-sm">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </motion.div>
    );
    
    if (href && !onClick) {
      return <Link href={href}>{content}</Link>;
    }
    
    return content;
  };
  
  const createTripButton = (
    <Link href="/create-trip">
      <motion.div 
        className="flex flex-col items-center p-3"
        whileTap={{ scale: 0.95 }}
      >
        <motion.div 
          className="w-12 h-12 bg-primary border-2 border-primary/20 rounded-full flex items-center justify-center text-primary-foreground -mt-5 shadow-lg"
          whileHover={{ 
            scale: 1.05,
            boxShadow: "0 10px 25px -5px rgba(var(--primary-rgb), 0.4)" 
          }}
          transition={{ duration: 0.2 }}
        >
          <i className="ri-add-line text-xl font-bold"></i>
        </motion.div>
      </motion.div>
    </Link>
  );
  
  return (
    <div className="md:hidden bg-card/95 backdrop-blur-sm border-t-2 border-border shadow-lg fixed bottom-0 left-0 right-0 z-50">
      <div className="flex justify-around px-2 py-1">
        <NavItem 
          href="/" 
          icon="ri-dashboard-line" 
          label="Home" 
          isActive={location === '/'} 
        />
        
        <NavItem 
          href="/join-trip" 
          icon="ri-ticket-2-line" 
          label="Join" 
          isActive={location === '/join-trip'} 
        />
        
        {createTripButton}
        
        <NavItem 
          href="/notifications" 
          icon="ri-notification-3-line" 
          label="Alerts" 
          isActive={location === '/notifications'} 
          badge={unreadCount}
        />
        
        <NavItem 
          href="/settings" 
          icon="ri-user-settings-line" 
          label="Settings" 
          isActive={location === '/settings'} 
        />
      </div>
    </div>
  );
};

export default MobileNav;
