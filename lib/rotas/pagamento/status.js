'use strict';
const {json,sessaoPerfil,postgrest,apagarCookiePedidoCompra,pedidoCompraDaRequisicao}=require('../../api');const mp=require('../../mercado-pago-producao');const {UUID}=require('../../curso-edicao');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='GET')return json(res,405,{ok:false});
 if(!mp.credenciaisProntas())return json(res,503,{ok:false,erro:'Não foi possível consultar o pagamento agora.'});
 const perfil=await sessaoPerfil(req);
 const id=req.query?.id;if(!UUID.test(id||''))return json(res,400,{ok:false});
 try{
  const r=await postgrest(`/pedidos_pagamento?id=eq.${id}&select=*`,{servico:true});const p=r.dados?.[0];if(!r.ok||!p?.order_id)return json(res,404,{ok:false,erro:'Pedido não encontrado.'});
  if(p.usuario_id&&(!perfil||p.usuario_id!==perfil.id))return json(res,perfil?404:401,{ok:false,erro:perfil?'Pedido não encontrado nesta conta.':'Entre na conta usada no pedido.'});
  const estado=await mp.confirmar(p,postgrest);
  if(estado.estado==='aprovado'&&!estado.acessoLiberado&&!p.usuario_id){
   if(!perfil)return json(res,200,{ok:true,...estado,teste:false,pedidoNaoVinculado:true,emailPagador:pedidoCompraDaRequisicao(req)===id?estado.emailPagador||null:null});
   const vinculo=await postgrest('/rpc/reivindicar_pedido_pagamento',{metodo:'POST',servico:true,corpo:{p_id:p.id,p_usuario:perfil.id}});
   if(vinculo.ok&&vinculo.dados){res.setHeader('Set-Cookie',apagarCookiePedidoCompra());return json(res,200,{ok:true,...estado,...vinculo.dados,teste:false,pedidoNaoVinculado:false});}
   const mensagem=String(vinculo.dados?.message||vinculo.dados?.details||'');
   return json(res,200,{ok:true,...estado,teste:false,pedidoNaoVinculado:true,emailIncompativel:/EMAIL_DO_PAGADOR_DIFERENTE/i.test(mensagem),emailPagadorIndisponivel:/EMAIL_DO_PAGADOR_AUSENTE/i.test(mensagem)});
  }
  const url=estado.estado==='pendente'&&p.checkout_url?require('../../mercado-pago').checkoutSeguro(p.checkout_url):null;
  return json(res,200,{ok:true,...estado,teste:false,url,pedidoNaoVinculado:false});
 }catch{return json(res,503,{ok:false,erro:'Não foi possível confirmar o pagamento. Tente novamente em instantes.'});}
};
