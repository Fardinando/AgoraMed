'use strict';
const {json,sessaoPerfil,postgrest}=require('../../api');const mp=require('../../mercado-pago-producao');const {UUID}=require('../../curso-edicao');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='GET')return json(res,405,{ok:false});
 if(!mp.credenciaisProntas())return json(res,503,{ok:false,erro:'Não foi possível consultar o pagamento agora.'});
 const perfil=await sessaoPerfil(req);if(!perfil)return json(res,401,{ok:false});
 const id=req.query?.id;if(!UUID.test(id||''))return json(res,400,{ok:false});
 try{
  const r=await postgrest(`/pedidos_pagamento?id=eq.${id}&usuario_id=eq.${perfil.id}&select=*`,{servico:true});const p=r.dados?.[0];if(!r.ok||!p?.order_id)return json(res,404,{ok:false,erro:'Pedido não encontrado nesta conta.'});
  const estado=await mp.confirmar(p,postgrest);
  const url=estado.estado==='pendente'&&p.checkout_url?require('../../mercado-pago').checkoutSeguro(p.checkout_url):null;
  return json(res,200,{ok:true,...estado,teste:false,url});
 }catch{return json(res,503,{ok:false,erro:'Não foi possível confirmar o pagamento. Tente novamente em instantes.'});}
};
