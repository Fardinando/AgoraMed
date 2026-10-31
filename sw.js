/* AGORAMED — Service Worker
   Estratégia: network-first (sempre busca a versão mais nova) com fallback ao cache
   quando o aluno estiver sem internet. Assim as aulas e materiais novos aparecem
   na hora, e o app continua abrindo offline.
*/
const CACHE = 'agoramed-v60';
/* Recursos visuais do login e ícones também ficam disponíveis offline.
   As respostas autenticadas de /api/ continuam fora do cache. */
const APP = [
  'morte-encefalica.html', 'css/landing-me.css?v=57', 'index.html', 'app.html', 'curso.html', 'aula.html', 'admin.html', 'redefinir.html', 'sobre.html',
  'css/dialogos.css?v=56', 'js/dialogos.js?v=56', 'css/redefinir.css?v=56', 'css/admin.css?v=58', 'css/aula.css?v=53', 'css/curso.css?v=52', 'css/styles.css?v=50', 'css/inicio.css?v=50', 'css/sobre.css', 'css/sobre-petroleo.css?v=51', 'img/anderson-uti.jpg', 'js/store.js?v=58', 'js/admin-ranking.js?v=58', 'js/admin-progresso.js?v=58', 'js/catalogo-cursos.js', 'js/editor-curso.js', 'manifest.json',
  'icons/icon-192.png?v=2', 'icons/icon-512.png?v=2', 'icons/icon-maskable-v2.png', 'icons/apple-touch-icon-v2.png',
  'css/login.css?v=48', 'js/login-ui.js', 'fonts/playfair-display-400-latin.woff2',
  'fonts/playfair-display-400-italic-latin.woff2', 'img/agoramed-logo-branco.png',
  'img/agoramed-monograma-branco.png', 'img/login-coracao.webp', 'img/login-coracao-640.webp',
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

  /* stale-while-revalidate: serve do cache instantaneamente e revalida em segundo plano */
  e.respondWith(
    caches.match(req).then((cached) => {
      const rede = fetch(req).then((res) => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(req, clone));
        }
        return res;
      }).catch(() => cached || caches.match('index.html'));
      return cached || rede;
    })
  );
});
