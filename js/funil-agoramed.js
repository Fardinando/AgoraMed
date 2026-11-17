'use strict';
(() => {
  const corpo = document.body;
  const pagina = corpo?.dataset.funilPage;
  if (!['hipercalemia', 'matricula', 'pagamento'].includes(pagina)) return;

  const query = new URLSearchParams(location.search);
  const campaign = Object.fromEntries(['utm_source', 'utm_medium', 'utm_campaign'].map((key) => [key, query.get(key) || '']));
  const dispositivo = matchMedia('(max-width: 700px)').matches ? 'mobile' : 'desktop';

  function registrar(evento, area = 'pagina') {
    const payload = { evento, pagina, area, dispositivo, ...campaign };
    fetch('/api/analytics/funil', {
      method: 'POST',
      credentials: 'same-origin',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }

  window.AgoraFunil = { track: registrar };

  if (pagina === 'hipercalemia') {
    registrar('landing_view');
    document.querySelectorAll('a[data-matricula], a.nav-cta').forEach((link) => {
      const area = link.dataset.slot || (link.closest('.hero') ? 'hero' : link.closest('#matricula') ? 'oferta' : link.closest('.final') ? 'final' : link.classList.contains('nav-cta') ? 'nav' : link.closest('#demonstracao') ? 'demonstracao' : 'pagina');
      link.addEventListener('click', () => registrar('buy_click', area));

      // Mantém a origem da campanha até a etapa da matrícula sem criar um ID de visitante.
      const destino = new URL(link.href, location.href);
      Object.entries(campaign).forEach(([key, value]) => { if (value) destino.searchParams.set(key, value); });
      link.href = destino.href;
    });
  } else if (pagina === 'matricula') {
    registrar('checkout_view');
  } else {
    registrar('payment_return');
  }

  document.querySelector('#checkout-iniciar')?.addEventListener('click', () => registrar('checkout_start', 'checkout'));
})();
