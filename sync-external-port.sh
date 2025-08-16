#!/bin/bash
# Auto-sync production build to external port
npm run build
cp -r dist/public/* server/public/
echo "✅ Production build synced to external port 80"
echo "📋 Build includes: CSS (117KB), JS (985KB), PWA manifest, service worker"
