import { useState, useEffect } from 'react';
import { useOffline } from './useOffline';

interface OfflineUser {
  id: number;
  username: string;
  displayName: string;
  password: string;
  email: string | null;
  avatar: string | null;
  dateOfBirth: string | null;
  paymentPreference: string | null;
  lastSync: number;
}

export const useOfflineAuth = () => {
  const { isOffline } = useOffline();
  const [offlineUser, setOfflineUser] = useState<OfflineUser | null>(null);

  useEffect(() => {
    // Check for cached user data when offline
    if (isOffline) {
      const cachedUser = localStorage.getItem('tripmate_offline_user');
      if (cachedUser) {
        try {
          setOfflineUser(JSON.parse(cachedUser));
        } catch (error) {
          console.log('Error parsing cached user data:', error);
        }
      }
    } else {
      // Clear offline user when back online
      setOfflineUser(null);
    }
  }, [isOffline]);

  const cacheUserForOffline = (user: any) => {
    const offlineUserData = {
      ...user,
      lastSync: Date.now()
    };
    localStorage.setItem('tripmate_offline_user', JSON.stringify(offlineUserData));
  };

  const clearOfflineUser = () => {
    localStorage.removeItem('tripmate_offline_user');
    setOfflineUser(null);
  };

  return {
    offlineUser,
    isOfflineMode: isOffline && !!offlineUser,
    cacheUserForOffline,
    clearOfflineUser
  };
};