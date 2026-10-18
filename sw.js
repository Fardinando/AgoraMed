/* AGORAMED — Service Worker
   Estratégia: network-first (sempre busca a versão mais nova) com fallback ao cache
   quando o aluno estiver sem internet. Assim as aulas e materiais novos aparecem
   na hora, e o app continua abrindo offline.
*/
const CACHE = 'agoramed-v17';
/* A folha de fontes (css/fontes.css) e os arquivos .woff2 ficam FORA desta lista
   de propósito: a tela de login usa a fonte do sistema por padrão, então nada
   é baixado. Se a página pedir ?fonte=josefin|jost, o navegador busca online.
   As imagens da marca entram na lista para a tela de login abrir offline. */
const APP = [
  'index.html', 'app.html', 'curso.html', 'aula.html', 'admin.html', 'redefinir.html',
  'css/styles.css', 'js/store.js', 'manifest.json',
  'icons/icon-192.png', 'icons/icon-512.png',
  'img/agoramed-logo.png', 'img/agoramed-simbolo-branco.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  /* deixa passar tudo que não é do próprio site (YouTube, links externos…)
     e também /api/*: respostas autenticadas nunca vão para o cache */
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  e.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then((res) => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(req, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) => hit || caches.match('index.html'))
      )
  );
});
