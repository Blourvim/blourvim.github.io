const broadcast = new BroadcastChannel('sw-channel');
const cacheName = "v10";
const cacheList = [
  "/",
  "/offline/",
  "/404.html",
  "/favicon.ico",
  "/apple-touch-icon.png",
  "/favicon-16x16.png",
  "/favicon-32x32.png",
  "/main.css",
  "/nerd-fonts.css",
  "/unstyle.css",
  "/langs.css",
  "/syntax-theme-light.css",
  "/syntax-theme-dark.css",
  "/webfonts/Pixeboy.woff2",
  "/webfonts/PressStart2P-latin-v15.woff2",
  "/webfonts/PressStart2P-latin-ext-v15.woff2",
  "/webfonts/PressStart2P-greek-v15.woff2",
  "/webfonts/PressStart2P-cyrillic-v15.woff2",
  "/webfonts/PressStart2P-cyrillic-ext-v15.woff2",
  "/webfonts/hack-bold.woff2?sha=3114f1256",
  "/webfonts/hack-bolditalic.woff2?sha=3114f1256",
  "/webfonts/hack-italic.woff2?sha=3114f1256",
  "/webfonts/hack-regular.woff2?sha=3114f1256",
];

oninstall = (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(cacheName);
      await cache.addAll(cacheList)
        .catch((error) => {
          broadcast.postMessage({type: 'SW_INSTALL_ERR'});
          console.log("Service worker failed", error);
        });
    })(),
  );

  broadcast.postMessage({type: 'SW_INSTALL_FINISH'});
};

onfetch = (event) => {
  console.log("Service worker fetching", event.request.url);
  event.respondWith(caches.open(cacheName).then((cache) => {
    return cache.match(event.request)
      .then((cachedResponse) => {
        const fetchedResponse = fetch(event.request).then((networkResponse) => {
          if (networkResponse.status < 400) {
            console.log("Caching the response to", event.request.url);
            cache.put(event.request, networkResponse.clone());
          } else {
            console.log("Service worker not caching the response to", event.request.url);
          }

          return networkResponse;
        }).catch(() => caches.match("/offline/"));

        return cachedResponse || fetchedResponse;
      });
  }));
};

onmessage = (event) => {
  if (event.data.type === "PRECACHE") {
    const data = [...new Set(event.data.payload)];
    broadcast.postMessage({type: 'SW_PRECACHE'});
    console.log("Service worker started precache", data);
    event.waitUntil(
      (async () => {
        const cache = await caches.open(cacheName);
        await cache.addAll(data)
          .catch((error) => {
            broadcast.postMessage({type: 'SW_PRECACHE_ERR'});
            console.log("Service worker failed precache", error);
          });

        broadcast.postMessage({type: 'SW_PRECACHE_FINISH'});
      })(),
    );
  }
};

onactivate = (event) =>  {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      return keys.map(async (cache) => {
        if(cache !== cacheName) {
          console.log("Removing old service worker cache", cache);
          return await caches.delete(cache);
        }

        broadcast.postMessage({type: 'SW_ACTIVATED'});
      })
    })()
  )
};
