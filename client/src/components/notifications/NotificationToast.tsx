import { useEffect, ReactNode } from "react";
import { toast } from "@/hooks/use-toast";
import { ToastActionElement } from "@/components/ui/toast";
import {
  Bell,
  MessageSquare,
  ShoppingCart,
  DollarSign,
  Briefcase,
  UserPlus,
  Edit,
  Trash2,
  Check,
  Plus,
} from "lucide-react";

export interface Notification {
  type: 
    | "trip_update" 
 
    | "expense_add" 
    | "expense_update" 
    | "expense_delete" 
    | "packing_add" 
    | "packing_update" 
    | "packing_delete" 
    | "chat_message" 
    | "member_joined";
  title: string;
  message: string;
  tripId: number;
  userId: number;
  timestamp: string;
  itemName?: string;
  userName?: string;
  id?: string; // Used for managing notifications in lists
  read?: boolean; // Track if notification has been read
}

interface NotificationIconProps {
  type: Notification["type"];
}

export const NotificationIcon = ({ type }: NotificationIconProps) => {
  switch (type) {
    case "trip_update":
      return <Edit className="h-4 w-4 text-blue-500" />;

    case "expense_add":
      return <DollarSign className="h-4 w-4 text-green-500" />;
    case "expense_update":
      return <Edit className="h-4 w-4 text-blue-500" />;
    case "expense_delete":
      return <Trash2 className="h-4 w-4 text-red-500" />;
    case "packing_add":
      return <Plus className="h-4 w-4 text-green-500" />;
    case "packing_update":
      return <Edit className="h-4 w-4 text-blue-500" />;
    case "packing_delete":
      return <Trash2 className="h-4 w-4 text-red-500" />;
    case "chat_message":
      return <MessageSquare className="h-4 w-4 text-purple-500" />;
    case "member_joined":
      return <UserPlus className="h-4 w-4 text-teal-500" />;
    default:
      return <Bell className="h-4 w-4 text-gray-500" />;
  }
};

export const showNotificationToast = (notification: Notification) => {
  const { type, title, message } = notification;

  // Create a simple message string with emoji based on notification type
  let iconText = '📣 '; // Default
  
  if (type === 'chat_message') {
    iconText = '💬 ';
  } else if (type.includes('expense')) {
    iconText = '💰 ';
  } else if (type.includes('packing')) {
    if (type === 'packing_add') {
      iconText = '🧳 ';
    } else if (type === 'packing_update') {
      iconText = message.includes('marked complete') ? '✅ ' : '🧳 ';
    } else if (type === 'packing_delete') {
      iconText = '🗑️ ';
    }
  } else if (type === 'trip_update') {
    iconText = '🗓️ ';
  } else if (type === 'member_joined') {
    iconText = '👋 ';
  }
                  
  toast({
    title,
    description: `${iconText}${message}`,
    className: "notification-toast bg-white dark:bg-slate-800 border-blue-500",
  });
};

// The main component to handle real-time notifications
const NotificationToast = ({
  notification
}: {
  notification: Notification;
}) => {
  useEffect(() => {
    if (notification) {
      showNotificationToast(notification);
    }
  }, [notification]);

  return null; // This is a functional component that doesn't render anything
};

export default NotificationToast;