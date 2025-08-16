import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import { formatRelativeTime } from "@/lib/utils";
import { useNotifications } from "@/hooks/use-notifications";
import { Notification } from "@/components/notifications/NotificationToast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const NotificationCenter = () => {
  const { notifications, clearNotifications, deleteNotification, markAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [location, navigate] = useLocation();
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <i className="ri-notification-3-line text-xl"></i>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 mr-4" align="end">
        <div className="flex items-center justify-between border-b p-3">
          <h3 className="font-semibold">Notifications</h3>
          {notifications.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-auto py-1 px-2 text-xs"
              onClick={clearNotifications}
            >
              Clear all
            </Button>
          )}
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          <AnimatePresence>
            {notifications.length > 0 ? (
              <>
                {/* Display most recent 5 notifications */}
                {notifications.slice(0, 5).map((notification) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`p-3 border-b ${!notification.read ? 'bg-primary/10' : ''}`}
                  >
                    <div className="flex items-start gap-2">
                      <div 
                        className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-primary/10 text-primary"
                      >
                        <i className={
                          notification.type === 'chat_message' ? 'ri-message-3-line' :
                          notification.type.includes('grocery') ? 'ri-shopping-cart-2-line' :
                          notification.type.includes('expense') ? 'ri-money-dollar-circle-line' :
                          notification.type.includes('packing') ? 'ri-luggage-cart-line' :
                          notification.type === 'trip_update' ? 'ri-calendar-event-line' :
                          notification.type === 'member_joined' ? 'ri-user-add-line' :
                          'ri-notification-line'
                        }></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <p className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>{notification.title}</p>
                          <Badge variant="outline" className="ml-auto text-[10px] px-1">
                            {formatRelativeTime(notification.timestamp)}
                          </Badge>
                        </div>
                        <p className="text-xs mt-1" style={{ color: 'var(--foreground)', opacity: '0.7' }}>{notification.message}</p>
                        <div className="flex space-x-2 mt-1">
                          {!notification.read && (
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs"
                              onClick={() => {
                                if (notification.id) {
                                  markAsRead(notification.id);
                                }
                              }}
                            >
                              Mark as read
                            </Button>
                          )}
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs text-red-500 hover:text-red-600"
                            onClick={() => {
                              if (notification.id) {
                                deleteNotification(notification.id);
                              }
                              setIsOpen(false); 
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {/* Show "View All" button if there are more than 5 notifications */}
                {notifications.length > 5 && (
                  <div className="p-2 text-center border-t">
                    <p className="text-xs text-muted-foreground mb-1">
                      {notifications.length - 5} more notification{notifications.length - 5 !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="py-8 text-center">
                <div className="w-12 h-12 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-400 mb-3">
                  <i className="ri-notification-off-line text-xl"></i>
                </div>
                <h3 className="text-sm font-medium mb-1">No notifications</h3>
                <p className="text-xs text-gray-500">
                  You're all caught up!
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Footer with View All button */}
        {notifications.length > 0 && (
          <div className="p-3 border-t text-center">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                setIsOpen(false);
                navigate('/notifications');
              }}
            >
              <i className="ri-external-link-line mr-1"></i>
              View All Notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default NotificationCenter;