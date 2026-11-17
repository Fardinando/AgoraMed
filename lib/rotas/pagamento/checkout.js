'use strict';
const {json,sessaoPerfil,postgrest,podeAcessarCurso,cookiePedidoCompra}=require('../../api');
const mp=require('../../mercado-pago-producao');const {UUID}=require('../../curso-edicao');
const CURSO='fa3c5d8d-94c4-4321-be7a-1cc45741a983';
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='POST')return json(res,405,{ok:false});
 if(!mp.vendasAtivas())return json(res,503,{ok:false,erro:'As matrículas ainda não estão abertas.'});
 if(req.headers.origin!==mp.ORIGEM)return json(res,403,{ok:false});
 const perfil=await sessaoPerfil(req);
 const id=req.body?.operacaoId;if(!UUID.test(id||''))return json(res,400,{ok:false,erro:'Atualize a página e tente novamente.'});
 try{
  if(perfil&&await podeAcessarCurso(perfil,CURSO))return json(res,200,{ok:true,acessoLiberado:true});
  // Todo pedido novo começa sem usuário. Após a aprovação, o servidor vincula
  // somente a conta confirmada que usa o e-mail registrado pelo Mercado Pago.
  const r=await postgrest('/rpc/reservar_pedido_pagamento_sem_conta',{metodo:'POST',servico:true,corpo:{p_id:id,p_curso:CURSO}});const p=r.dados;
  if(!r.ok||!p||p.usuario_id!==null||p.curso_id!==CURSO)return json(res,409,{ok:false,novoPedido:true,erro:'Não foi possível reservar este pedido. Tente novamente.'});
  if(p.order_id&&p.checkout_url){const estado=await mp.confirmar(p,postgrest);if(estado.acessoLiberado)return json(res,200,{ok:true,acessoLiberado:true});if(estado.estado!=='pendente')return json(res,409,{ok:false,novoPedido:true,erro:'A tentativa anterior foi encerrada. Clique para iniciar um novo pagamento.'});res.setHeader('Set-Cookie',cookiePedidoCompra(p.id));return json(res,200,{ok:true,id:p.id,url:require('../../mercado-pago').checkoutSeguro(p.checkout_url)});}
  const c=await postgrest(`/cursos?id=eq.${CURSO}&select=titulo`,{servico:true});if(!c.ok||!c.dados?.[0])throw Error();
  const order=await mp.criar(p,c.dados[0].titulo);
  const salvo=await postgrest(`/pedidos_pagamento?id=eq.${p.id}&usuario_id=is.null`,{metodo:'PATCH',servico:true,corpo:order});if(!salvo.ok)throw Error();
  res.setHeader('Set-Cookie',cookiePedidoCompra(p.id));
  return json(res,200,{ok:true,id:p.id,url:order.checkout_url});
 }catch(e){console.warn('Preparação de checkout indisponível',{statusProvedor:e.statusProvedor||null});return json(res,503,{ok:false,erro:'Não foi possível abrir o checkout agora. Tente novamente; nenhum pagamento foi solicitado nesta página.'});}
};
