import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { websocketService } from "@/lib/websocketService";
import { 
  Notification, 
  showNotificationToast 
} from "@/components/notifications/NotificationToast";
import { useAuth } from "@/hooks/use-auth";

// Create a context for notifications
const NotificationContext = createContext<{
  notifications: Notification[];
  clearNotifications: () => void;
  deleteNotification: (id: string) => void;
  markAsRead: (id: string) => void;
}>({
  notifications: [],
  clearNotifications: () => {},
  deleteNotification: () => {},
  markAsRead: () => {},
});

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user } = useAuth();

  const clearNotifications = () => {
    setNotifications([]);
  };
  
  // Function to delete a single notification
  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => 
      notification.id !== id
    ));
  };
  
  // Function to mark a notification as read
  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(notification => 
      notification.id === id 
        ? { ...notification, read: true } 
        : notification
    ));
  };

  // Listen for new notifications via WebSocket
  useEffect(() => {
    if (!user?.id) return;

    // Register connection with the WebSocket service
    websocketService.registerConnection();

    // Set up the auth data for the WebSocket connection
    websocketService.send('auth', { userId: user.id });

    // Handler for notification events
    const handleNotification = (data: any) => {
      console.log("WebSocket notification received:", data);
      
      // Make sure we have proper payload data
      if (!data || !data.payload) {
        console.error("Invalid notification data received:", data);
        return;
      }
      
      const notification = data.payload as Notification;
      console.log("Parsed notification:", notification);
      
      // For demo purposes, show all notifications including own actions
      // In production, you might want to filter out own notifications:
      // if (notification.userId === user?.id) return;
      
      // Add an ID and mark as unread for management in UI
      const enhancedNotification = {
        ...notification,
        id: `notification-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        read: false
      };
      
      console.log("Adding notification to state:", enhancedNotification);
      setNotifications((prev) => {
        console.log("Previous notifications:", prev);
        return [...prev, enhancedNotification];
      });
      
      // Show toast notification
      showNotificationToast(enhancedNotification);
    };

    // Trigger an initial fetch of recent notifications
    console.log("Registering for WebSocket notifications");

    // Register for websocket notifications
    websocketService.on("notification", handleNotification);

    return () => {
      // Clean up event listener
      websocketService.off("notification", handleNotification);
      websocketService.deregisterConnection();
    };
  }, [user?.id]);

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      clearNotifications,
      deleteNotification,
      markAsRead
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

// Custom hook to use notifications
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};