const CACHE_NAME = 'tripset-v3';
const urlsToCache = [
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png'
];

// Install event - cache resources
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching files');
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        event.respondWith(fetch(event.request));
        return;
    }

    // Skip API requests (always use network for data)
    if (event.request.url.includes('/api/')) {
        event.respondWith(
            fetch(event.request).catch(() => {
                return new Response(JSON.stringify({ error: 'Offline - API unavailable' }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            })
        );
        return;
    }

    // Document/navigation: always network (session auth). Do not cache HTML.
    const url = new URL(event.request.url);
    if (event.request.mode === 'navigate' && (url.pathname === '/' || url.pathname === '')) {
        event.respondWith(
            fetch(event.request).catch(() => {
                return new Response('Offline – reload when back online.', { status: 503, statusText: 'Service Unavailable' });
            })
        );
        return;
    }

    // For other GET (static assets), try cache first, then network
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                return response || fetch(event.request).then(fetchResponse => {
                    if (fetchResponse && fetchResponse.status === 200) {
                        const responseToCache = fetchResponse.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return fetchResponse;
                });
            })
    );
});
