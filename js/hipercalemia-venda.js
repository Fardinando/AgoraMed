'use strict';
(()=>{
 const barra=document.querySelector('.matricula-mobile'),hero=document.querySelector('.hero'),oferta=document.querySelector('#matricula');
 let heroVisivel=true,ofertaVisivel=false;
 const atualizar=()=>{const visivel=matchMedia('(max-width:700px)').matches&&!heroVisivel&&!ofertaVisivel;barra.hidden=!visivel;document.body.classList.toggle('tem-barra-mobile',visivel);};
 if('IntersectionObserver' in window){const obs=new IntersectionObserver(entries=>{for(const e of entries){if(e.target===hero)heroVisivel=e.isIntersecting;if(e.target===oferta)ofertaVisivel=e.isIntersecting;}atualizar();},{threshold:0});obs.observe(hero);obs.observe(oferta);addEventListener('resize',atualizar,{passive:true});}
 fetch('/api/pagamento/oferta',{credentials:'same-origin',cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{if(!d?.ok)return;const preco=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(d.precoCentavos/100);document.querySelectorAll('[data-preco]').forEach(el=>el.textContent=preco);if(d.vendasAtivas){document.querySelector('.hero-disponibilidade').textContent='Matrículas abertas · pagamento único, sem mensalidade. Aulas em liberação progressiva.';document.querySelector('[data-oferta-etiqueta]').textContent='INVESTIMENTO';document.querySelector('[data-seguranca-pagamento]').textContent='Pagamento processado no ambiente seguro do Mercado Pago. Acesso ativado após a aprovação.';barra.querySelector('small').textContent='Pagamento único · 12 meses';}}).catch(()=>{});
})();
