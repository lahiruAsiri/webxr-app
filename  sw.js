const CACHE_NAME = "ar-wallart-threejs-v2"
const urlsToCache = [
  "/",
  "/index.html",
  "/app.js",
  "/manifest.json",
  "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache")
      return cache.addAll(urlsToCache).catch((err) => {
        console.log("Cache addAll failed:", err)
      })
    }),
  )
})

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request)
    }),
  )
})
