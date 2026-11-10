'use strict';
(()=>{
 const estado=document.querySelector('#pagamento-estado'),titulo=document.querySelector('#pagamento-titulo'),botao=document.querySelector('#pagamento-consultar'),curso=document.querySelector('#pagamento-curso');
 const params=new URLSearchParams(location.search),teste=params.get('modo')==='teste';
 const id=params.get('pedido')||sessionStorage.getItem(teste?'agoramed-pedido-teste':'agoramed-pedido-real');
 document.querySelector('#pagamento-login').href='index.html?'+new URLSearchParams({continuar:'pagamento',pedido:id||'',modo:teste?'teste':'real'});
 let consultas=0,temporizador;
 const retomar=document.querySelector('#pagamento-retomar');
 async function consultar(){
  clearTimeout(temporizador);retomar.hidden=true;consultas++;
  curso.hidden=true;document.querySelector('#pagamento-prazo').textContent='';
  if(!/^[a-f0-9-]{36}$/i.test(id||'')){titulo.textContent='Pedido não identificado.';estado.textContent='Volte à matrícula para consultar seu pedido.';botao.hidden=true;return;}
  botao.disabled=true;
  try{
   const r=await fetch((teste?'/api/pagamento/teste?id=':'/api/pagamento/status?id=')+encodeURIComponent(id),{credentials:'same-origin',cache:'no-store'}),d=await r.json();
   if([401,403].includes(r.status)){titulo.textContent='Entre para consultar seu pedido.';estado.textContent='Use a mesma conta da AgoraMed com a qual iniciou a matrícula.';document.querySelector('#pagamento-login').hidden=false;return;}
   if(!r.ok||!d.ok)throw Error();
   const textos={aprovado:teste?['Pagamento de teste aprovado.','A confirmação foi recebida. O acesso fictício vale somente na homologação.']:['Pagamento aprovado. Seu curso está liberado.','Você já pode acessar o conteúdo disponível. As aulas estão em liberação progressiva.'],pendente:['Pagamento aguardando confirmação.','Seu acesso será liberado apenas após a aprovação confirmada pelo Mercado Pago.'],rejeitado:['Pagamento recusado.','Essa tentativa não libera acesso. Você pode voltar à matrícula para tentar novamente.'],refunded:['Pagamento estornado.',teste?'O valor fictício foi reembolsado. O acesso correspondente está bloqueado.':'O pagamento foi estornado. O acesso associado a essa compra foi encerrado.'],charged_back:['Pagamento contestado.','O acesso correspondente está bloqueado.'],cancelled:['Pagamento cancelado.','Essa tentativa não libera acesso.'],expired:['Pedido expirado.','Volte à matrícula para iniciar uma nova tentativa.']};
   if(d.estado==='pendente'&&d.url){const u=new URL(d.url);if(u.origin==='https://www.mercadopago.com.br'&&u.pathname==='/checkout/v1/redirect'&&!u.username&&!u.password){retomar.href=u.href;retomar.hidden=false;}}
   if(d.estado==='pendente'&&consultas<12)temporizador=setTimeout(consultar,5000);
   const t=textos[d.estado]||textos.pendente;titulo.textContent=t[0];estado.textContent=t[1];
   if(d.estado==='aprovado'&&(teste?d.acessoSimulado:d.acessoLiberado)){curso.hidden=false;if(!teste)sessionStorage.removeItem('agoramed-operacao-compra');document.querySelector('#pagamento-prazo').textContent=(teste?'Acesso de teste até ':'Acesso até ')+new Date(d.fim).toLocaleDateString('pt-BR')+'.';}
  }catch{estado.textContent='Não conseguimos confirmar o pedido agora. Tente novamente; não é necessário refazer o pagamento.';}finally{botao.disabled=false;}
 }
 botao.onclick=consultar;consultar();
})();
