// Service Worker pentru Ad Instal Gaz PWA
const CACHE_NAME = 'adinstalgaz-v1.2';
const STATIC_FILES = [
    './',
    './index.html',
    './manifest.json',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js'
];

// Install Event
self.addEventListener('install', event => {
    console.log('🔄 Service Worker: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('📦 Service Worker: Caching files...');
            return cache.addAll(STATIC_FILES.map(url => new Request(url, {cache: 'reload'})));
        }).then(() => {
            console.log('✅ Service Worker: Installed successfully');
            return self.skipWaiting();
        }).catch(err => {
            console.log('❌ Service Worker: Cache failed:', err);
        })
    );
});

// Activate Event
self.addEventListener('activate', event => {
    console.log('🚀 Service Worker: Activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('✅ Service Worker: Activated successfully');
            return self.clients.claim();
        })
    );
});

// Fetch Event
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            if (response) {
                return response;
            }
            return fetch(event.request).catch(() => {
                if (event.request.destination === 'document') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});

// Background sync for reminders
self.addEventListener('sync', event => {
    if (event.tag === 'reminder-sync') {
        event.waitUntil(
            console.log('🔄 Background sync triggered for reminders')
        );
    }
});

// Push notifications
self.addEventListener('push', event => {
    const options = {
        body: event.data ? event.data.text() : 'Ai o notificare nouă de la Ad Instal Gaz!',
        icon: './icon-192x192.png',
        badge: './icon-192x192.png',
        tag: 'ad-instal-gaz-notification',
        renotify: true,
        requireInteraction: false,
        actions: [
            {
                action: 'view',
                title: '👁️ Vezi detalii',
                icon: './icon-192x192.png'
            },
            {
                action: 'dismiss',
                title: '❌ Închide'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('Ad Instal Gaz SRL', options)
    );
});

// Notification click handling
self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'view') {
        event.waitUntil(
            clients.openWindow('./')
        );
    }
});

console.log('🚀 Service Worker loaded - Ad Instal Gaz PWA v1.1');
