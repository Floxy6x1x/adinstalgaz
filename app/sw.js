// Service Worker pentru Ad Instal Gaz PWA
const CACHE_NAME = 'adinstalgaz-v1';
const STATIC_FILES = [
    './',
    './index.html',
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
            return cache.addAll(STATIC_FILES);
        }).then(() => {
            console.log('✅ Service Worker: Installed successfully');
            return self.skipWaiting();
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

console.log('🚀 Service Worker loaded - Ad Instal Gaz PWA');
