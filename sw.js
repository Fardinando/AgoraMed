/* AGORAMED — Service Worker
   Estratégia: network-first (sempre busca a versão mais nova) com fallback ao cache
   quando o aluno estiver sem internet. Assim as aulas e materiais novos aparecem
   na hora, e o app continua abrindo offline.
*/
const CACHE = 'agoramed-v100';
/* Recursos visuais do login e ícones também ficam disponíveis offline.
   As respostas autenticadas de /api/ continuam fora do cache. */
const APP = [
  'edema-agudo-pulmao-hipertensivo.html','css/landing-edema-pulmao.css?v=81','img/edema-pulmoes-anatomicos.webp','img/edema-pulmao-hero.webp','img/edema-pulmao-hero-800.webp',
'bradicardia-sintomatica.html','css/landing-bradicardia.css?v=78','img/bradicardia-hero.webp','img/bradicardia-hero-800.webp',
'hipercalemia.html', 'css/landing-hipercalemia.css?v=77', 'img/hipercalemia-hero.webp', 'img/hipercalemia-hero-800.webp', 'img/hipercalemia-capa.webp',
  'cetoacidose-diabetica.html', 'css/landing-cetoacidose.css?v=75', 'img/cetoacidose-hero.webp', 'img/cetoacidose-hero-800.webp', 'img/cetoacidose-pancreas.webp',
  'gasometria.html', 'css/landing-gasometria.css?v=74', 'img/gasometria-hero.webp', 'img/gasometria-hero-800.webp',
  'css/quiz-aula.css?v=66', 'js/quiz-aula.js?v=67',
  'plantao-virtual.html', 'css/plantao-virtual.css?v=64', 'js/plantao-engine.js?v=62', 'js/plantao-virtual.js?v=63', 'img/plantao-virtual-uti.webp',
  'agoraquiz-curso.html', 'css/agoraquiz-curso.css?v=4', 'js/agoraquiz-curso.js?v=4',
  'agoraquiz.html', 'css/agoraquiz.css?v=61', 'js/agoraquiz.js?v=62', 'js/admin-quiz.js?v=61',
  'agoraquest.html', 'css/agoraquest.css?v=4', 'js/agoraquest.js?v=5',
  'caderno-erros.html', 'css/caderno-erros.css?v=2', 'js/caderno-erros.js?v=3',
  'morte-encefalica.html', 'css/landing-me.css?v=57', 'index.html', 'app.html', 'curso.html', 'aula.html', 'admin.html', 'redefinir.html', 'sobre.html',
  'agoraprescreva.html', 'css/agoraprescreva.css?v=2', 'js/agoraprescreva-rules.js?v=1', 'js/agoraprescreva.js?v=1', 'css/curso.css?v=116', 'js/atividades-curso.js?v=1', 'abertura.html', 'js/abertura.js?v=127', 'js/store.js?v=118',
  'css/dialogos.css?v=56', 'js/dialogos.js?v=56', 'css/redefinir.css?v=56', 'css/admin.css?v=82', 'css/aula.css?v=54', 'css/curso.css?v=52', 'css/styles.css?v=73', 'css/inicio.css?v=84', 'css/sobre.css', 'css/sobre-petroleo.css?v=51', 'img/anderson-uti.jpg', 'js/store.js?v=72', 'js/admin-ranking.js?v=58', 'js/admin-progresso.js?v=61', 'js/catalogo-cursos.js?v=83', 'js/editor-curso.js?v=70', 'manifest.json',
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

  /* Páginas de oferta e pagamento devem consultar a versão atual primeiro. */
  if (['/hipercalemia.html', '/matricula-hipercalemia.html', '/pagamento.html'].includes(url.pathname)) {
    e.respondWith(fetch(req).then((res) => {
      if (res.ok) { const copia = res.clone(); e.waitUntil(caches.open(CACHE).then(c => c.put(req, copia))); }
      return res;
    }).catch(async () => (await caches.match(req)) || new Response('Conecte-se à internet para consultar sua matrícula.', {status:503, headers:{'Content-Type':'text/plain; charset=utf-8'}})));
    return;
  }

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
