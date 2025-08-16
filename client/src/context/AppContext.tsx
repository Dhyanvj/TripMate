import { createContext, useState, useEffect, ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: "success" | "info" | "warning" | "error";
  read: boolean;
  timestamp: Date;
}

interface AppContextType {
  currentUser: User | null;
  isLoading: boolean;
  isDarkMode: boolean;
  notifications: NotificationItem[];
  setCurrentUser: (user: User | null) => void;
  login: (username: string, password: string) => Promise<User>;
  register: (userData: { username: string; password: string; displayName: string; email?: string }) => Promise<User>;
  logout: () => void;
  toggleDarkMode: () => void;
  addNotification: (notification: Omit<NotificationItem, "id" | "timestamp" | "read">) => void;
  markNotificationAsRead: (id: string) => void;
  deleteNotification: (id: string) => void;
  clearNotifications: () => void;
}

export const AppContext = createContext<AppContextType>({
  currentUser: null,
  isLoading: true,
  isDarkMode: false,
  notifications: [],
  setCurrentUser: () => {},
  login: async () => ({ id: 0 } as User),
  register: async () => ({ id: 0 } as User),
  logout: () => {},
  toggleDarkMode: () => {},
  addNotification: () => {},
  markNotificationAsRead: () => {},
  deleteNotification: () => {},
  clearNotifications: () => {},
});

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider = ({ children }: AppProviderProps) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const { toast } = useToast();

  // Initialize dark mode from local storage
  useEffect(() => {
    const savedMode = localStorage.getItem("darkMode");
    if (savedMode) {
      const isDark = JSON.parse(savedMode);
      setIsDarkMode(isDark);
      if (isDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, []);

  // Check for authentication
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        // First check the server for the current session
        const response = await fetch('/api/auth/user');
        
        if (response.ok) {
          // If server session exists, use that user data
          const userData = await response.json();
          console.log("Current user from server:", userData);
          setCurrentUser(userData);
          
          // Update local storage with the latest user data
          localStorage.setItem("user", JSON.stringify(userData));
          
          // Setup WebSocket connection for real-time updates
          setupRealtimeUpdates(userData.id);
        } else {
          // If no server session, check local storage as fallback
          const storedUser = localStorage.getItem("user");
          if (storedUser) {
            try {
              const user = JSON.parse(storedUser);
              // Validate the stored user with the server
              const validateResponse = await fetch('/api/auth/user');
              if (validateResponse.ok) {
                const validatedUser = await validateResponse.json();
                setCurrentUser(validatedUser);
                setupRealtimeUpdates(validatedUser.id);
              } else {
                // User in localStorage but not authenticated on server
                localStorage.removeItem("user");
              }
            } catch (error) {
              localStorage.removeItem("user");
            }
          }
        }
      } catch (error) {
        console.error("Error fetching current user:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCurrentUser();
  }, []);

  // Setup WebSocket connection for real-time updates
  const setupRealtimeUpdates = (userId: number) => {
    // For development, let's mock this behavior with frequent polling
    // In production, implement with actual WebSockets
    
    // Poll for trip updates every 30 seconds
    const intervalId = setInterval(() => {
      if (currentUser) {
        queryClient.invalidateQueries({ queryKey: ['/api/trips'] });
      }
    }, 30000);
    
    return () => clearInterval(intervalId);
  };



  const login = async (username: string, password: string): Promise<User> => {
    try {
      console.log(`Attempting to login with username: ${username}`);
      const res = await apiRequest("POST", "/api/auth/login", { username, password });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Login failed");
      }
      
      const user = await res.json();
      console.log("Login successful:", user);
      
      setCurrentUser(user);
      localStorage.setItem("user", JSON.stringify(user));
      
      // Setup WebSocket connection for real-time updates
      setupRealtimeUpdates(user.id);
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.displayName}!`,
      });
      
      return user;
    } catch (error) {
      console.error("Login error details:", error);
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid username or password",
        variant: "destructive",
      });
      throw error;
    }
  };

  const register = async (userData: { username: string; password: string; displayName: string; email?: string }): Promise<User> => {
    try {
      console.log("Attempting to register:", userData.username);
      const res = await apiRequest("POST", "/api/auth/register", userData);
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Registration failed");
      }
      
      const user = await res.json();
      console.log("Registration successful:", user);
      
      setCurrentUser(user);
      localStorage.setItem("user", JSON.stringify(user));
      
      // Setup WebSocket connection for real-time updates
      setupRealtimeUpdates(user.id);
      
      toast({
        title: "Registration successful",
        description: `Welcome, ${user.displayName}!`,
      });
      
      return user;
    } catch (error) {
      console.error("Registration error details:", error);
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Unable to create account",
        variant: "destructive",
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Call the backend logout endpoint
      await apiRequest("POST", "/api/auth/logout");
      
      // Clear user data locally
      setCurrentUser(null);
      localStorage.removeItem("user");
      
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
    } catch (error) {
      console.error("Logout error:", error);
      
      // Even if the API call fails, we still want to clear the local state
      setCurrentUser(null);
      localStorage.removeItem("user");
      
      toast({
        title: "Logged out",
        description: "You have been logged out locally",
      });
    }
  };
  
  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const newMode = !prev;
      localStorage.setItem("darkMode", JSON.stringify(newMode));
      
      if (newMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      
      return newMode;
    });
  };
  
  const addNotification = (notification: Omit<NotificationItem, "id" | "timestamp" | "read">) => {
    const newNotification: NotificationItem = {
      ...notification,
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false,
    };
    
    setNotifications(prev => [newNotification, ...prev.slice(0, 19)]); // Keep only 20 most recent
    
    // Also show as toast
    toast({
      title: notification.title,
      description: notification.message,
      variant: notification.type === 'error' ? 'destructive' : 'default',
    });
  };
  
  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true } 
          : notification
      )
    );
  };
  
  const deleteNotification = (id: string) => {
    setNotifications(prev => 
      prev.filter(notification => notification.id !== id)
    );
  };
  
  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isLoading,
        isDarkMode,
        notifications,
        setCurrentUser,
        login,
        register,
        logout,
        toggleDarkMode,
        addNotification,
        markNotificationAsRead,
        deleteNotification,
        clearNotifications
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
