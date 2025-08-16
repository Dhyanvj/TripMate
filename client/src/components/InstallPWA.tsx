import { Download, X } from 'lucide-react';
import { useState } from 'react';
import { usePWA } from '../hooks/usePWA';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

export const InstallPWA = () => {
  const { isInstallable, installApp } = usePWA();
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if not installable, already dismissed, or if user dismissed in this session
  if (!isInstallable || isDismissed) {
    return null;
  }

  return (
    <Card className="fixed bottom-4 left-4 right-4 z-50 border-blue-200 bg-blue-50 shadow-lg md:left-auto md:right-4 md:w-80">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900">Install TripMate</h3>
            <p className="text-sm text-blue-700 mb-3">
              Install our app for a better experience with offline access and faster loading.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={installApp}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Download className="h-4 w-4 mr-1" />
                Install
              </Button>
              <Button
                onClick={() => setIsDismissed(true)}
                variant="outline"
                size="sm"
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                Not now
              </Button>
            </div>
          </div>
          <Button
            onClick={() => setIsDismissed(true)}
            variant="ghost"
            size="sm"
            className="p-1 h-auto text-blue-600 hover:bg-blue-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};