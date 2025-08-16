// TripMate Service Worker
const CACHE_NAME = 'tripmate-v1';
const API_CACHE_NAME = 'tripmate-api-v1';

// Resources to cache for offline use
const STATIC_CACHE_URLS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// API endpoints to cache
const API_CACHE_URLS = [
  '/api/auth/user',
  '/api/trips',
  '/api/trips/hidden'
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('TripMate SW: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('TripMate SW: Caching static resources');
      return cache.addAll(STATIC_CACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('TripMate SW: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            console.log('TripMate SW: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - cache first for offline support
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests - cache first for offline functionality
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then(async (cache) => {
        try {
          // Try network first
          const networkResponse = await fetch(request);
          
          // Cache successful GET requests and auth responses
          if (request.method === 'GET' && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          
          // Cache auth responses for offline access
          if (url.pathname === '/api/auth/user' && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          
          return networkResponse;
        } catch (error) {
          // Network failed - try cache
          const cachedResponse = await cache.match(request);
          
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Return offline response for auth when no cache available
          if (url.pathname === '/api/auth/user') {
            return new Response(
              JSON.stringify({ message: 'Offline mode - please connect to internet for full functionality' }),
              {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'application/json' }
              }
            );
          }
          
          // Return offline response for other API calls
          return new Response(
            JSON.stringify({ message: 'Offline - cached data not available' }),
            {
              status: 503,
              statusText: 'Service Unavailable', 
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
      })
    );
    return;
  }

  // Handle static resources - cache first strategy
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return fetch(request).then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        // Return a basic offline page for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('/');
        }
        throw error;
      });
    })
  );
});

// Background sync for when the app comes back online
self.addEventListener('sync', (event) => {
  console.log('TripMate SW: Background sync triggered');
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Implement background sync logic here
      console.log('TripMate SW: Performing background sync')
    );
  }
});

// Handle push notifications (for future implementation)
self.addEventListener('push', (event) => {
  console.log('TripMate SW: Push message received');
  
  const options = {
    body: event.data ? event.data.text() : 'New notification from TripMate',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Trip',
        icon: '/icons/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/icon-192x192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('TripMate', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('TripMate SW: Notification click received');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/trips')
    );
  }
});