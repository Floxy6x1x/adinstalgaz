// Service Worker pentru AdInstalGaz PWA - VERSIUNE ACTUALIZATĂ
const CACHE_NAME = 'adinstalgaz-v2.0';
const STATIC_FILES = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    
    // External resources
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// Install Event - Improved caching
self.addEventListener('install', event => {
    console.log('🔄 Service Worker: Installing v2.0...');
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('📦 Service Worker: Caching files...');
            
            // Cache static files with error handling
            const cachePromises = STATIC_FILES.map(url => {
                return cache.add(url).catch(error => {
                    console.warn(`Failed to cache ${url}:`, error);
                    return null; // Continue with other files
                });
            });
            
            return Promise.all(cachePromises);
        }).then(() => {
            console.log('✅ Service Worker: Installed successfully v2.0');
            return self.skipWaiting();
        }).catch(err => {
            console.log('❌ Service Worker: Cache failed:', err);
        })
    );
});

// Activate Event - Clean old caches
self.addEventListener('activate', event => {
    console.log('🚀 Service Worker: Activating v2.0...');
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
            console.log('✅ Service Worker: Activated successfully v2.0');
            return self.clients.claim();
        })
    );
});

// Fetch Event - Enhanced caching strategy
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Skip Firebase and external APIs
    if (event.request.url.includes('firebase') || 
        event.request.url.includes('googleapis') ||
        event.request.url.includes('smso.ro')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request).then(response => {
            if (response) {
                // Return cached version
                return response;
            }
            
            // Fetch from network with fallback
            return fetch(event.request).then(fetchResponse => {
                // Check if valid response
                if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
                    return fetchResponse;
                }
                
                // Clone response for cache
                const responseToCache = fetchResponse.clone();
                
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseToCache);
                });
                
                return fetchResponse;
            });
        }).catch(() => {
            // Fallback for navigation requests
            if (event.request.destination === 'document') {
                return caches.match('./index.html');
            }
            
            // Return a basic response for other failed requests
            return new Response('Offline - AdInstalGaz', {
                status: 503,
                statusText: 'Service Unavailable',
                headers: new Headers({
                    'Content-Type': 'text/plain'
                })
            });
        })
    );
});

// Background sync for assignments
self.addEventListener('sync', event => {
    console.log('🔄 Background sync triggered:', event.tag);
    
    if (event.tag === 'assignment-sync') {
        event.waitUntil(syncAssignments());
    } else if (event.tag === 'sms-reminder-sync') {
        event.waitUntil(syncSMSReminders());
    }
});

// Sync assignments to Firebase when online
async function syncAssignments() {
    try {
        console.log('📤 Syncing assignments to Firebase...');
        
        // Get stored assignments that need sync
        const pendingAssignments = await getPendingAssignments();
        
        if (pendingAssignments.length > 0) {
            // Send to main thread for Firebase sync
            const clients = await self.clients.matchAll();
            clients.forEach(client => {
                client.postMessage({
                    type: 'SYNC_ASSIGNMENTS',
                    assignments: pendingAssignments
                });
            });
        }
        
        console.log('✅ Assignment sync completed');
    } catch (error) {
        console.error('❌ Assignment sync failed:', error);
    }
}

// Push notifications for worker assignments
self.addEventListener('push', event => {
    let data = {};
    
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data = { title: 'AdInstalGaz', body: event.data.text() };
        }
    }
    
    const title = data.title || 'AdInstalGaz - Lucrare Nouă!';
    const options = {
        body: data.body || 'Aveți o lucrare nouă asignată!',
        icon: './icon-192.png',
        badge: './icon-192.png',
        tag: data.tag || 'adinstalgaz-assignment',
        renotify: true,
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200],
        data: data,
        actions: [
            {
                action: 'view',
                title: '👁️ Vezi Lucrarea',
                icon: './icon-192.png'
            },
            {
                action: 'accept',
                title: '✅ Accept Lucrarea'
            },
            {
                action: 'dismiss',
                title: '❌ Închide'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
    console.log('🔔 Notification clicked:', event.action);
    
    event.notification.close();
    
    if (event.action === 'view' || event.action === 'accept') {
        event.waitUntil(
            clients.openWindow('./index.html?section=lucrari&action=' + event.action)
        );
    }
    
    // If accept action, send message to main app
    if (event.action === 'accept' && event.notification.data) {
        clients.matchAll().then(clientList => {
            clientList.forEach(client => {
                client.postMessage({
                    type: 'ACCEPT_ASSIGNMENT',
                    assignmentId: event.notification.data.assignmentId
                });
            });
        });
    }
});

// Handle messages from main thread
self.addEventListener('message', event => {
    console.log('📨 SW received message:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    } else if (event.data && event.data.type === 'REGISTER_SYNC') {
        // Register background sync
        self.registration.sync.register(event.data.tag);
    }
});

// Utility functions
async function getPendingAssignments() {
    // This would get assignments that need to be synced
    // For now, return empty array as this is handled by main app
    return [];
}

async function syncSMSReminders() {
    console.log('📱 Checking SMS reminders...');
    
    // Send message to main thread to check SMS reminders
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
        client.postMessage({
            type: 'CHECK_SMS_REMINDERS'
        });
    });
}

// Periodic SMS check (if supported)
if ('periodicsync' in self.registration) {
    self.addEventListener('periodicsync', event => {
        if (event.tag === 'sms-expiry-check') {
            event.waitUntil(syncSMSReminders());
        }
    });
}

console.log('🚀 Service Worker v2.0 loaded - AdInstalGaz PWA Enhanced');

// Auto-update notification
self.addEventListener('updatefound', () => {
    console.log('🔄 New version available!');
    
    // Notify main app of update
    clients.matchAll().then(clientList => {
        clientList.forEach(client => {
            client.postMessage({
                type: 'UPDATE_AVAILABLE'
            });
        });
    });
});
