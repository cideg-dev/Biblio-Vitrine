const CACHE_NAME = 'cideg-biblio-v1'
const urlsToCache = [
  '/Biblio-Vitrine/',
  '/Biblio-Vitrine/index.html',
  '/Biblio-Vitrine/missions.html',
  '/Biblio-Vitrine/admin.html',
  '/Biblio-Vitrine/assets/css/style.css',
  '/Biblio-Vitrine/assets/js/script.js',
  '/Biblio-Vitrine/assets/js/admin.js',
  '/Biblio-Vitrine/assets/images/Lumiere_sur_parole.png',
  '/Biblio-Vitrine/manifest.json'
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
})

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(response => {
        if (response && response.ok && response.type === 'basic') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
        }
        return response
      }).catch(() => cached)
      return cached || fetchPromise
    })
  )
})
