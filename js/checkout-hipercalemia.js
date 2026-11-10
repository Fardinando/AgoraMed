'use strict';
(async()=>{
 const estado=document.querySelector('#checkout-estado'),acoes=document.querySelector('#checkout-acoes'),botao=document.querySelector('#checkout-iniciar'),interesse=document.querySelector('#checkout-interesse');
 try{
  const r=await fetch('/api/pagamento/oferta',{credentials:'same-origin',cache:'no-store'}),d=await r.json();if(!r.ok||!d.ok)throw Error();
  document.querySelector('#checkout-preco').textContent=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(d.precoCentavos/100);
  document.querySelector('#checkout-prazo').textContent=`Pagamento único · ${d.acessoMeses} meses de acesso`;
  if(d.testeHabilitado){acoes.hidden=false;estado.textContent='Prévia de matrícula: o checkout está disponível apenas para simulações autorizadas.';}
  else{estado.textContent='As matrículas ainda não estão abertas. Você pode solicitar um aviso para acompanhar o lançamento.';interesse.hidden=false;}
  botao.onclick=async()=>{
   botao.disabled=true;estado.textContent='Preparando seu pedido fictício…';
   try{
    const r=await fetch('/api/pagamento/teste',{method:'POST',credentials:'same-origin'}),p=await r.json();if(!r.ok||!p.ok)throw Error(p.erro||'Não foi possível preparar o pedido.');
    const url=new URL(p.url);if(url.protocol!=='https:'||url.hostname!=='www.mercadopago.com.br'||url.pathname!=='/checkout/v1/redirect'||url.username||url.password)throw Error('O endereço de pagamento não pôde ser validado.');
    sessionStorage.setItem('agoramed-pedido-teste',p.id);location.assign(url.href);
   }catch(e){estado.textContent=e.message;botao.disabled=false;}
  };
 }catch{estado.textContent='Não foi possível consultar a oferta. Atualize a página ou entre em contato com a AgoraMed.';interesse.hidden=false;}
})();
