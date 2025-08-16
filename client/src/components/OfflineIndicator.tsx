import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { Card, CardContent } from './ui/card';

export const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOffline, setShowOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOffline(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Hide after coming back online for a few seconds
  useEffect(() => {
    if (isOnline && showOffline) {
      const timer = setTimeout(() => {
        setShowOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, showOffline]);

  if (!showOffline && isOnline) return null;

  return (
    <Card className={`fixed top-20 left-4 right-4 z-40 transition-all duration-300 md:left-auto md:right-4 md:w-80 ${
      isOnline ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'
    }`}>
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="h-5 w-5 text-green-600" />
          ) : (
            <WifiOff className="h-5 w-5 text-orange-600" />
          )}
          <div className="flex-1">
            <p className={`font-medium ${isOnline ? 'text-green-900' : 'text-orange-900'}`}>
              {isOnline ? 'Back online!' : 'You\'re offline'}
            </p>
            <p className={`text-sm ${isOnline ? 'text-green-700' : 'text-orange-700'}`}>
              {isOnline 
                ? 'Your connection has been restored.' 
                : 'Some features may be limited. Your data will sync when you\'re back online.'
              }
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};