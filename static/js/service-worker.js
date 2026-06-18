const CACHE_NAME = 'radio-player-v1';
const ASSETS = [
    '/',
    '/static/css/style.css',
    '/static/js/script.js',
    '/static/manifest.json'
];

// УСТАНОВКА SERVICE WORKER
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

// АКТИВАЦИЯ И ОЧИСТКА СТАРОГО КЭША
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
});

// ЛОГИКА ПЕРЕХВАТА ЗАПРОСОВ
self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => {
            return response || fetch(e.request);
        })
    );
});