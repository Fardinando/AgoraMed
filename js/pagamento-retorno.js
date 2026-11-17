'use strict';
(()=>{
 const estado=document.querySelector('#pagamento-estado'),titulo=document.querySelector('#pagamento-titulo'),botao=document.querySelector('#pagamento-consultar'),curso=document.querySelector('#pagamento-curso');
 const params=new URLSearchParams(location.search),teste=params.get('modo')==='teste';
 const id=params.get('pedido')||sessionStorage.getItem(teste?'agoramed-pedido-teste':'agoramed-pedido-real');
 document.querySelector('#pagamento-login').href='index.html?'+new URLSearchParams({continuar:'pagamento',pedido:id||'',modo:teste?'teste':'real'});
 let consultas=0,temporizador;
 const retomar=document.querySelector('#pagamento-retomar');
 const criarConta=document.querySelector('#pagamento-criar-conta'),trocarConta=document.querySelector('#pagamento-trocar-conta'),login=document.querySelector('#pagamento-login');
 const continuar=new URLSearchParams({continuar:'pagamento',pedido:id||'',modo:'real'});
 criarConta.href='index.html?'+new URLSearchParams({...Object.fromEntries(continuar),cadastro:'1'});
 trocarConta.href='index.html?'+new URLSearchParams({...Object.fromEntries(continuar),trocar:'1'});
 login.href='index.html?'+continuar;
 const etapas=[...document.querySelectorAll('#pagamento-passos li')];
 function marcarEtapa(atual){etapas.forEach((etapa,i)=>{etapa.classList.toggle('concluido',i<atual-1);etapa.classList.toggle('atual',i===atual-1);});}
 async function consultar(){
  clearTimeout(temporizador);retomar.hidden=true;criarConta.hidden=true;trocarConta.hidden=true;consultas++;
  curso.hidden=true;document.querySelector('#pagamento-prazo').textContent='';
  if(!/^[a-f0-9-]{36}$/i.test(id||'')){titulo.textContent='Pedido não identificado.';estado.textContent='Volte à matrícula para consultar seu pedido.';botao.hidden=true;return;}
  botao.disabled=true;
  try{
   const r=await fetch((teste?'/api/pagamento/teste?id=':'/api/pagamento/status?id=')+encodeURIComponent(id),{credentials:'same-origin',cache:'no-store'}),d=await r.json();
   if([401,403].includes(r.status)){titulo.textContent='Entre para consultar seu pedido.';estado.textContent='Entre na conta AgoraMed associada a esta compra ou troque para a conta com o e-mail usado no checkout.';trocarConta.hidden=false;return;}
   if(!r.ok||!d.ok)throw Error();
   if(!teste&&d.pedidoNaoVinculado&&d.emailPagador)sessionStorage.setItem('agoramed-email-compra',d.emailPagador);
   const textos={aprovado:teste?['Pagamento de teste aprovado.','A confirmação foi recebida. O acesso fictício vale somente na homologação.']:['Pagamento aprovado. Seu curso está liberado.','As aulas e ferramentas do curso estão disponíveis na plataforma.'],pendente:['Pagamento aguardando confirmação.','Seu acesso será liberado apenas após a aprovação confirmada pelo Mercado Pago.'],rejeitado:['Pagamento recusado.','Essa tentativa não libera acesso. Você pode voltar à matrícula para tentar novamente.'],refunded:['Pagamento estornado.',teste?'O valor fictício foi reembolsado. O acesso correspondente está bloqueado.':'O pagamento foi estornado. O acesso associado a essa compra foi encerrado.'],charged_back:['Pagamento contestado.','O acesso correspondente está bloqueado.'],cancelled:['Pagamento cancelado.','Essa tentativa não libera acesso.'],expired:['Pedido expirado.','Volte à matrícula para iniciar uma nova tentativa.']};
   if(d.estado==='pendente'&&d.url){const u=new URL(d.url);if(u.origin==='https://www.mercadopago.com.br'&&u.pathname==='/checkout/v1/redirect'&&!u.username&&!u.password){retomar.href=u.href;retomar.hidden=false;}}
   if(d.estado==='pendente'&&consultas<12)temporizador=setTimeout(consultar,5000);
   const t=textos[d.estado]||textos.pendente;titulo.textContent=t[0];estado.textContent=t[1];
   if(d.estado==='aprovado'&&!teste){
    const chaveAprovacao='agoramed-funil-aprovado:'+id;
    if(!sessionStorage.getItem(chaveAprovacao)){
     window.AgoraFunil?.track('payment_approved','pagamento');
     sessionStorage.setItem(chaveAprovacao,'1');
    }
   }
   if(d.estado==='aprovado'&&!teste&&d.pedidoNaoVinculado){
    marcarEtapa(2);titulo.textContent='Pagamento aprovado. Falta ativar seu acesso.';
    if(d.emailIncompativel){estado.textContent='A conta aberta usa outro e-mail. Vincule a compra com uma conta AgoraMed confirmada usando o mesmo e-mail informado no Mercado Pago.';trocarConta.hidden=false;}
    else if(d.emailPagadorIndisponivel){estado.textContent='Não conseguimos confirmar o e-mail do pagador automaticamente. Fale com a AgoraMed para vincular sua compra.';}
    else{estado.textContent='Crie sua conta AgoraMed ou entre com a conta que usa o mesmo e-mail informado no checkout do Mercado Pago.';criarConta.hidden=false;trocarConta.hidden=false;}
    document.querySelector('#pagamento-prazo').textContent='Depois de confirmar o e-mail da conta, a compra será vinculada ao curso de Hipercalemia.';
   }
   if(d.estado==='aprovado'&&(teste?d.acessoSimulado:d.acessoLiberado)){marcarEtapa(4);curso.hidden=false;criarConta.hidden=true;trocarConta.hidden=true;if(!teste){sessionStorage.removeItem('agoramed-operacao-compra');sessionStorage.removeItem('agoramed-email-compra');}document.querySelector('#pagamento-prazo').textContent=(teste?'Acesso de teste até ':'Acesso até ')+new Date(d.fim).toLocaleDateString('pt-BR')+'.';}
  }catch{estado.textContent='Não conseguimos confirmar o pedido agora. Tente novamente; não é necessário refazer o pagamento.';}finally{botao.disabled=false;}
 }
 botao.onclick=consultar;consultar();
})();
