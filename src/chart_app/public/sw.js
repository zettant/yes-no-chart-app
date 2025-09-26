// Service Worker for Yes/No Chart PWA
const CACHE_NAME = 'yes-no-chart-v2';
const APP_SHELL_CACHE = 'app-shell-v1';

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    Promise.all([
      // Pre-cache the app shell (essential files)
      caches.open(APP_SHELL_CACHE).then((cache) => {
        // We'll cache files as they're requested during first visit
        return Promise.resolve();
      }),
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches and take control
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== APP_SHELL_CACHE) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients
      self.clients.claim()
    ]).then(() => {
      console.log('Service Worker: Activation complete');
    })
  );
});

// Fetch event - Cache First strategy for app shell, Network First for API
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle API requests - Network First, no cache
  if (url.pathname.includes('/api/')) {
    event.respondWith(
      fetch(request).catch((error) => {
        console.log('Service Worker: API request failed, letting app handle offline logic');
        throw error;
      })
    );
    return;
  }
  
  // Handle navigation requests and app assets - Cache First with network fallback
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('Service Worker: Serving from cache:', request.url);
          
          // Update cache in background for non-navigation requests
          if (request.mode !== 'navigate') {
            fetch(request).then((response) => {
              if (response.ok) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, response.clone());
                });
              }
            }).catch(() => {
              // Ignore network errors for background updates
            });
          }
          
          return cachedResponse;
        }
        
        // Not in cache, try network
        return fetch(request)
          .then((response) => {
            // Only cache successful responses from our origin
            if (response.ok && url.origin === location.origin) {
              const responseClone = response.clone();
              
              // Determine which cache to use
              const cacheName = (
                request.mode === 'navigate' || 
                url.pathname.endsWith('.html') ||
                url.pathname.endsWith('.js') ||
                url.pathname.endsWith('.css')
              ) ? APP_SHELL_CACHE : CACHE_NAME;
              
              caches.open(cacheName).then((cache) => {
                console.log('Service Worker: Caching new resource:', request.url);
                cache.put(request, responseClone);
              });
            }
            
            return response;
          })
          .catch((error) => {
            console.log('Service Worker: Network failed for:', request.url, error);
            
            // For navigation requests, try to return the main page
            if (request.mode === 'navigate') {
              return caches.match('/chart/index.html')
                .then((response) => {
                  if (response) {
                    console.log('Service Worker: Serving offline fallback page');
                    return response;
                  }
                  // If no cached page available, return a basic offline page
                  return new Response(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>オフライン</title>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <style>
                            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                            .offline { color: #666; }
                        </style>
                    </head>
                    <body>
                        <div class="offline">
                            <h1>オフラインです</h1>
                            <p>インターネット接続を確認してページを再読み込みしてください。</p>
                        </div>
                    </body>
                    </html>
                  `, {
                    headers: { 'Content-Type': 'text/html' }
                  });
                });
            }
            
            // For other requests, just throw the error
            throw error;
          });
      })
  );
});