import { useOffline } from '../hooks/useOffline';
import { useOfflineAuth } from '../hooks/useOfflineAuth';
import { Alert, AlertDescription } from './ui/alert';
import { WifiOff, User } from 'lucide-react';

export const OfflineBanner = () => {
  const { isOffline } = useOffline();
  const { isOfflineMode, offlineUser } = useOfflineAuth();

  if (!isOffline) return null;

  return (
    <Alert className="border-orange-200 bg-orange-50 mb-4">
      <WifiOff className="h-4 w-4 text-orange-600" />
      <AlertDescription className="text-orange-800">
        {isOfflineMode ? (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>
              Offline mode - Logged in as {offlineUser?.displayName}. 
              Limited functionality available. Connect to internet for full features.
            </span>
          </div>
        ) : (
          <span>
            You're offline. Please log in when connected to internet to access your data offline.
          </span>
        )}
      </AlertDescription>
    </Alert>
  );
};