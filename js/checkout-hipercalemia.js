'use strict';
(async()=>{
 const estado=document.querySelector('#checkout-estado'),acoes=document.querySelector('#checkout-acoes'),botao=document.querySelector('#checkout-iniciar'),interesse=document.querySelector('#checkout-interesse');
 try{
  const r=await fetch('/api/pagamento/oferta',{credentials:'same-origin',cache:'no-store'}),d=await r.json();if(!r.ok||!d.ok)throw Error();
  document.querySelector('#checkout-preco').textContent=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(d.precoCentavos/100);
  document.querySelector('#checkout-prazo').textContent=`Pagamento único · ${d.acessoMeses} meses de acesso`;
  const real=d.vendasAtivas===true;
  if(real&&d.acessoLiberado){document.querySelector('#checkout-meu-curso').hidden=false;estado.textContent='Você já tem acesso a este curso. Pode continuar seus estudos sem fazer outro pagamento.';return;}
  if(real&&!d.autenticado){document.querySelector('#checkout-login-acoes').hidden=false;estado.textContent='Entre ou crie sua conta na AgoraMed para vincular o pagamento e o acesso ao seu cadastro.';return;}
  if(real||d.testeHabilitado){acoes.hidden=false;document.querySelector('#checkout-nota-teste').hidden=real;botao.textContent=real?'Continuar para o Mercado Pago →':'Abrir checkout de teste →';estado.textContent=real?'Você será direcionado ao Mercado Pago para escolher o meio de pagamento. As aulas estão em liberação progressiva.':'Prévia de matrícula: o checkout está disponível apenas para simulações autorizadas.';}
  else{estado.textContent='As matrículas ainda não estão abertas. Você pode solicitar um aviso para acompanhar o lançamento.';interesse.hidden=false;}
  botao.onclick=async()=>{
   botao.disabled=true;estado.textContent=real?'Preparando seu pedido…':'Preparando seu pedido fictício…';
   try{
    let operacaoId=sessionStorage.getItem('agoramed-operacao-compra');if(!/^[a-f0-9-]{36}$/i.test(operacaoId||'')){operacaoId=crypto.randomUUID();sessionStorage.setItem('agoramed-operacao-compra',operacaoId);}
    const r=await fetch(real?'/api/pagamento/checkout':'/api/pagamento/teste',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({operacaoId})}),p=await r.json();
    if(p.novoPedido)sessionStorage.removeItem('agoramed-operacao-compra');if(!r.ok||!p.ok)throw Error(p.erro||'Não foi possível preparar o pedido.');
    if(p.acessoLiberado){location.assign('/api/curso?id=fa3c5d8d-94c4-4321-be7a-1cc45741a983');return;}
    const url=new URL(p.url);if(url.protocol!=='https:'||url.hostname!=='www.mercadopago.com.br'||url.pathname!=='/checkout/v1/redirect'||url.username||url.password)throw Error('O endereço de pagamento não pôde ser validado.');
    sessionStorage.setItem(real?'agoramed-pedido-real':'agoramed-pedido-teste',p.id);location.assign(url.href);
   }catch(e){estado.textContent=e.message;botao.disabled=false;}
  };
 }catch{estado.textContent='Não foi possível consultar a oferta. Atualize a página ou entre em contato com a AgoraMed.';interesse.hidden=false;}
})();
