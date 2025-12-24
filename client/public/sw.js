/**
 * Service Worker for B³NMA Building Condition Assessment
 * 
 * Provides:
 * - Background sync for offline data
 * - Offline page caching
 * - Push notifications for sync completion
 * - Periodic background sync
 */

const CACHE_NAME = 'bca-offline-v1';
const STATIC_CACHE_NAME = 'bca-static-v1';
const API_CACHE_NAME = 'bca-api-v1';

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
];

// API routes to cache
const CACHEABLE_API_ROUTES = [
  '/api/trpc/buildingComponents.getAll',
  '/api/trpc/buildingCodes.getAll',
];

// ============================================================================
// Installation
// ============================================================================

self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('[ServiceWorker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      // Skip waiting to activate immediately
      self.skipWaiting(),
    ])
  );
});

// ============================================================================
// Activation
// ============================================================================

self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name.startsWith('bca-') && 
                     name !== CACHE_NAME && 
                     name !== STATIC_CACHE_NAME &&
                     name !== API_CACHE_NAME;
            })
            .map((name) => {
              console.log('[ServiceWorker] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      }),
      // Take control of all clients
      self.clients.claim(),
    ])
  );
});

// ============================================================================
// Fetch Handling
// ============================================================================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets
  if (isStaticAsset(url.pathname)) {
    event.respondWith(handleStaticRequest(request));
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Default: network first
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

/**
 * Check if URL is a static asset
 */
function isStaticAsset(pathname) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'];
  return staticExtensions.some(ext => pathname.endsWith(ext));
}

/**
 * Handle API requests with stale-while-revalidate
 */
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  // Check if this API route should be cached
  const shouldCache = CACHEABLE_API_ROUTES.some(route => url.pathname.includes(route));
  
  if (!shouldCache) {
    // Network only for non-cacheable API routes
    try {
      return await fetch(request);
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Network unavailable' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // Stale-while-revalidate for cacheable routes
  const cache = await caches.open(API_CACHE_NAME);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => null);

  // Return cached response immediately, update in background
  if (cachedResponse) {
    fetchPromise; // Fire and forget
    return cachedResponse;
  }

  // No cache, wait for network
  const networkResponse = await fetchPromise;
  if (networkResponse) {
    return networkResponse;
  }

  return new Response(JSON.stringify({ error: 'Data unavailable offline' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Handle static asset requests with cache-first
 */
async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    // Update cache in background
    fetch(request)
      .then((response) => {
        if (response.ok) {
          cache.put(request, response);
        }
      })
      .catch(() => {});
    
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return new Response('Asset not available offline', { status: 503 });
  }
}

/**
 * Handle navigation requests
 */
async function handleNavigationRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page
    const offlinePage = await caches.match('/offline.html');
    if (offlinePage) {
      return offlinePage;
    }

    // Last resort: return basic offline message
    return new Response(
      '<!DOCTYPE html><html><head><title>Offline</title></head><body><h1>You are offline</h1><p>Please check your internet connection.</p></body></html>',
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}

// ============================================================================
// Background Sync
// ============================================================================

self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Sync event:', event.tag);

  if (event.tag === 'sync-offline-data') {
    event.waitUntil(syncOfflineData());
  }
});

/**
 * Sync offline data to server
 */
async function syncOfflineData() {
  console.log('[ServiceWorker] Starting background sync...');

  try {
    // Notify all clients to start sync
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_START',
        timestamp: Date.now(),
      });
    });

    // The actual sync is handled by the main thread
    // This just triggers the sync process
    
  } catch (error) {
    console.error('[ServiceWorker] Background sync failed:', error);
    throw error; // Retry later
  }
}

// ============================================================================
// Periodic Background Sync
// ============================================================================

self.addEventListener('periodicsync', (event) => {
  console.log('[ServiceWorker] Periodic sync event:', event.tag);

  if (event.tag === 'sync-pending-data') {
    event.waitUntil(checkAndSync());
  }
});

/**
 * Check for pending data and sync if needed
 */
async function checkAndSync() {
  console.log('[ServiceWorker] Checking for pending data...');

  // Notify clients to check for pending data
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({
      type: 'CHECK_PENDING_DATA',
      timestamp: Date.now(),
    });
  });
}

// ============================================================================
// Push Notifications
// ============================================================================

self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push received:', event);

  let data = { title: 'BCA App', body: 'You have a notification' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/logo.png',
    badge: '/badge.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: data.primaryKey || 1,
    },
    actions: [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification click:', event.action);
  
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clientList) => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window
        if (self.clients.openWindow) {
          return self.clients.openWindow('/');
        }
      })
    );
  }
});

// ============================================================================
// Message Handling
// ============================================================================

self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] Message received:', event.data);

  const { type, payload } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CACHE_URLS':
      event.waitUntil(cacheUrls(payload.urls));
      break;

    case 'CLEAR_CACHE':
      event.waitUntil(clearCache(payload.cacheName));
      break;

    case 'SYNC_COMPLETE':
      notifySyncComplete(payload);
      break;

    case 'GET_CACHE_SIZE':
      event.waitUntil(getCacheSize().then((size) => {
        event.ports[0].postMessage({ size });
      }));
      break;
  }
});

/**
 * Cache specific URLs
 */
async function cacheUrls(urls) {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(urls);
  console.log('[ServiceWorker] Cached URLs:', urls);
}

/**
 * Clear a specific cache
 */
async function clearCache(cacheName) {
  await caches.delete(cacheName || CACHE_NAME);
  console.log('[ServiceWorker] Cleared cache:', cacheName || CACHE_NAME);
}

/**
 * Notify clients of sync completion
 */
async function notifySyncComplete(result) {
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({
      type: 'SYNC_COMPLETE',
      result,
      timestamp: Date.now(),
    });
  });

  // Show notification if permission granted
  if (Notification.permission === 'granted') {
    const { synced, failed } = result;
    const body = failed > 0
      ? `Synced ${synced} items, ${failed} failed`
      : `Successfully synced ${synced} items`;

    self.registration.showNotification('Sync Complete', {
      body,
      icon: '/logo.png',
      badge: '/badge.png',
    });
  }
}

/**
 * Get total cache size
 */
async function getCacheSize() {
  const cacheNames = await caches.keys();
  let totalSize = 0;

  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    
    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }

  return totalSize;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Register for periodic background sync
 */
async function registerPeriodicSync() {
  if ('periodicSync' in self.registration) {
    try {
      await self.registration.periodicSync.register('sync-pending-data', {
        minInterval: 15 * 60 * 1000, // 15 minutes
      });
      console.log('[ServiceWorker] Periodic sync registered');
    } catch (error) {
      console.log('[ServiceWorker] Periodic sync not supported:', error);
    }
  }
}

// Register periodic sync on activation
self.addEventListener('activate', (event) => {
  event.waitUntil(registerPeriodicSync());
});
