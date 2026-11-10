'use strict';
(()=>{
 const estado=document.querySelector('#pagamento-estado'),titulo=document.querySelector('#pagamento-titulo'),botao=document.querySelector('#pagamento-consultar'),curso=document.querySelector('#pagamento-curso');
 const id=new URLSearchParams(location.search).get('pedido')||sessionStorage.getItem('agoramed-pedido-teste');
 async function consultar(){
  curso.hidden=true;document.querySelector('#pagamento-prazo').textContent='';
  if(!/^[a-f0-9-]{36}$/i.test(id||'')){titulo.textContent='Pedido não identificado.';estado.textContent='Volte à matrícula para consultar seu pedido.';botao.hidden=true;return;}
  botao.disabled=true;
  try{
   const r=await fetch('/api/pagamento/teste?id='+encodeURIComponent(id),{credentials:'same-origin',cache:'no-store'}),d=await r.json();
   if([401,403].includes(r.status)){titulo.textContent='Entre para consultar seu pedido.';estado.textContent='Use a mesma conta da AgoraMed com a qual iniciou a matrícula.';document.querySelector('#pagamento-login').hidden=false;return;}
   if(!r.ok||!d.ok)throw Error();
   const textos={aprovado:['Pagamento de teste aprovado.','A confirmação foi recebida. O acesso fictício vale somente na homologação.'],pendente:['Pagamento aguardando confirmação.','Seu acesso será liberado apenas após a aprovação confirmada pelo Mercado Pago.'],rejeitado:['Pagamento recusado.','Essa tentativa não libera acesso. Você pode voltar à matrícula para tentar novamente.'],refunded:['Pagamento estornado.','O valor fictício foi reembolsado. O acesso correspondente está bloqueado.'],charged_back:['Pagamento contestado.','O acesso correspondente está bloqueado.'],cancelled:['Pagamento cancelado.','Essa tentativa não libera acesso.'],expired:['Pedido expirado.','Volte à matrícula para iniciar uma nova tentativa.']};
   const t=textos[d.estado]||textos.pendente;titulo.textContent=t[0];estado.textContent=t[1];
   if(d.estado==='aprovado'&&d.acessoSimulado){curso.hidden=false;document.querySelector('#pagamento-prazo').textContent='Acesso de teste até '+new Date(d.fim).toLocaleDateString('pt-BR')+'.';}
  }catch{estado.textContent='Não conseguimos confirmar o pedido agora. Tente novamente; não é necessário refazer o pagamento.';}finally{botao.disabled=false;}
 }
 botao.onclick=consultar;consultar();
})();
