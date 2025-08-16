import { useState, useEffect } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertCircle,
  Bell,
  MessageSquare,
  ShoppingCart,
  DollarSign,
  Briefcase,
  UserPlus,
  Edit,
  Trash2,
  Check,
  Plus
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/use-notifications";
import { 
  Notification
} from "@/components/notifications/NotificationToast";

// Create a notification icon component
const NotificationIcon = ({ type }: { type: Notification["type"] }) => {
  switch (type) {
    case "trip_update":
      return <Edit className="h-5 w-5" />;
    case "grocery_add":
      return <Plus className="h-5 w-5" />;
    case "grocery_update":
      return <Edit className="h-5 w-5" />;
    case "grocery_delete":
      return <Trash2 className="h-5 w-5" />;
    case "expense_add":
      return <DollarSign className="h-5 w-5" />;
    case "expense_update":
      return <Edit className="h-5 w-5" />;
    case "expense_delete":
      return <Trash2 className="h-5 w-5" />;
    case "packing_add":
      return <Plus className="h-5 w-5" />;
    case "packing_update":
      return <Edit className="h-5 w-5" />;
    case "packing_delete":
      return <Trash2 className="h-5 w-5" />;
    case "chat_message":
      return <MessageSquare className="h-5 w-5" />;
    case "member_joined":
      return <UserPlus className="h-5 w-5" />;
    default:
      return <Bell className="h-5 w-5" />;
  }
};

// Helper function to get the appropriate CSS classes for notification type
const getNotificationColorClass = (type: Notification["type"]): string => {
  // Use theme-aware colors for better consistency
  return "bg-primary/10 text-primary";
};

const NotificationsPage = () => {
  const { notifications, clearNotifications, deleteNotification, markAsRead } = useNotifications();
  const { toast } = useToast();
  const [visibleNotifications, setVisibleNotifications] = useState<Notification[]>([...notifications]);
  
  // Update visible notifications when the actual notifications change
  useEffect(() => {
    setVisibleNotifications([...notifications]);
  }, [notifications]);

  // Function to handle swipe to delete
  const handleSwipe = (notificationId: string | undefined, info: PanInfo) => {
    if (!notificationId) return;
    
    if (info.offset.x > 100) {
      // Delete the notification
      deleteNotification(notificationId);
      
      // Also update the local state
      setVisibleNotifications(prev => 
        prev.filter(notification => notification.id !== notificationId)
      );
      
      toast({
        title: "Notification removed",
        description: "The notification has been removed",
      });
    }
  };

  // Use the notifications directly from context
  const displayedNotifications = notifications;

  // Group notifications by date
  const groupedNotifications: Record<string, typeof notifications> = {};
  
  displayedNotifications.forEach(notification => {
    const date = new Date(notification.timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let groupKey: string;
    
    if (date.toDateString() === today.toDateString()) {
      groupKey = "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      groupKey = "Yesterday";
    } else {
      groupKey = date.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
      });
    }
    
    if (!groupedNotifications[groupKey]) {
      groupedNotifications[groupKey] = [];
    }
    
    groupedNotifications[groupKey].push(notification);
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--foreground)' }}>Notifications</h1>
          <p className="mt-1" style={{ color: 'var(--foreground)', opacity: '0.7' }}>View and manage your notifications</p>
        </div>
        
        {displayedNotifications.length > 0 && (
          <Button 
            variant="outline" 
            onClick={() => {
              clearNotifications();
              toast({
                title: "Notifications cleared",
                description: "All notifications have been cleared"
              });
            }}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear All</span>
          </Button>
        )}
      </div>

      {/* Notification List */}
      {displayedNotifications.length > 0 ? (
        <>
          <div className="mb-4 text-sm" style={{ color: 'var(--foreground)', opacity: '0.7' }}>
            <p>Swipe right on a notification to delete it</p>
          </div>
          
          {Object.entries(groupedNotifications).map(([dateGroup, groupNotifications]) => (
            <div key={dateGroup} className="mb-6">
              <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--foreground)' }}>{dateGroup}</h2>
              
              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {groupNotifications.map(notification => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      layout
                      drag="x"
                      dragConstraints={{ left: 0, right: 100 }}
                      dragElastic={0.1}
                      onDragEnd={(_, info) => handleSwipe(notification.id, info)}
                      whileTap={{ cursor: "grabbing" }}
                      className="touch-manipulation"
                    >
                      <Card className={`${!notification.read ? 'border-l-4 border-l-primary' : ''} shadow-sm bg-card border-border`}>
                        <CardContent className="p-4">
                          <div className="flex gap-3">
                            <div 
                              className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center 
                                ${getNotificationColorClass(notification.type)}`}
                            >
                              <NotificationIcon type={notification.type} />
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <h4 className="font-medium" style={{ color: 'var(--foreground)' }}>{notification.title}</h4>
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {formatRelativeTime(notification.timestamp)}
                                </Badge>
                              </div>
                              <p className="text-sm mt-1" style={{ color: 'var(--foreground)', opacity: '0.7' }}>{notification.message}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </>
      ) : (
        <Card className="border-dashed bg-card border-border">
          <CardContent className="p-6 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Bell className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--foreground)' }}>No Notifications</h3>
            <p className="text-center max-w-md" style={{ color: 'var(--foreground)', opacity: '0.7' }}>
              You don't have any notifications at the moment. Notifications about your trips and activities will appear here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NotificationsPage;