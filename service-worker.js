const CACHE_NAME = 'cideg-biblio-v3'
const SHELL_CACHE = CACHE_NAME + '-shell'
const PDF_CACHE = CACHE_NAME + '-pdfs'
const STATIC_CACHE = CACHE_NAME + '-static'

const SHELL_URLS = [
  '/Biblio-Vitrine/',
  '/Biblio-Vitrine/index.html',
  '/Biblio-Vitrine/missions.html',
  '/Biblio-Vitrine/admin.html',
  '/Biblio-Vitrine/assets/css/style.css',
  '/Biblio-Vitrine/assets/js/script.js',
  '/Biblio-Vitrine/assets/js/admin.js',
  '/Biblio-Vitrine/assets/images/Lumiere_sur_parole.png',
  '/Biblio-Vitrine/manifest.json',
  '/Biblio-Vitrine/assets/data/version.json'
]

self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      caches.open(SHELL_CACHE).then(cache => cache.addAll(SHELL_URLS)),
      caches.open(PDF_CACHE),
      caches.open(STATIC_CACHE)
    ])
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== SHELL_CACHE && k !== PDF_CACHE && k !== STATIC_CACHE).map(k => caches.delete(k)))
    )
  )
})

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // PDF files: network-first with cache fallback
  if (url.pathname.match(/\.pdf$/i)) {
    event.respondWith(networkFirstWithCache(request, PDF_CACHE))
    return
  }

  // Static assets: cache-first
  if (url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|woff2?|json)$/i)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // Navigation / shell: network-first with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithCache(request, SHELL_CACHE))
    return
  }

  // Everything else: network-first
  event.respondWith(networkFirstWithCache(request, SHELL_CACHE))
})

async function networkFirstWithCache(request, cacheName) {
  try {
    const response = await fetch(request)
    if (response && response.ok) {
      const clone = response.clone()
      const cache = await caches.open(cacheName)
      cache.put(request, clone)
    }
    return response
  } catch (err) {
    const cached = await caches.match(request)
    if (cached) return cached
    // Return a minimal offline fallback for navigation requests
    if (request.mode === 'navigate') {
      return new Response(
        '<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hors ligne</title><style>body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0a0a0f;color:#fff;text-align:center;padding:2rem}h1{color:#00f5c8}p{color:#888;max-width:400px}</style></head><body><h1>Vous êtes hors ligne</h1><p>Certains contenus peuvent ne pas être disponibles. Les PDFs déjà consultés restent accessibles.</p></body></html>',
        { headers: { 'Content-Type': 'text/html;charset=UTF-8' } }
      )
    }
    return new Response('Hors ligne', { status: 503 })
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response && response.ok) {
      const clone = response.clone()
      const cache = await caches.open(cacheName)
      cache.put(request, clone)
    }
    return response
  } catch (err) {
    return new Response('', { status: 404 })
  }
}
