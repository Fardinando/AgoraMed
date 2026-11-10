'use strict';
const crypto=require('crypto');
const {json,sessaoPerfil,postgrest,gotrue,garantirPerfil}=require('../../api');
const {homologacaoAtiva}=require('../../checkout-homologacao');
const mp=require('../../mercado-pago');
const {UUID}=require('../../curso-edicao');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','private, no-store');
 if(!homologacaoAtiva())return json(res,404,{ok:false});
 if(req.method!=='POST')return json(res,405,{ok:false});
 const perfil=await sessaoPerfil(req);
 if(!perfil||perfil.papel!=='admin')return json(res,403,{ok:false});
 if(!mp.origemPermitida(req.headers.origin))return json(res,403,{ok:false});
 try{
  if(req.body?.acao==='criar_aluno'){
   const email=`qa-checkout-${crypto.randomUUID()}@example.invalid`;
   const senha=crypto.randomBytes(24).toString('base64url');
   const r=await gotrue('/admin/users',{servico:true,token:process.env.SUPABASE_SERVICE_ROLE_KEY,
    corpo:{email,password:senha,email_confirm:true,user_metadata:{nome:'Aluno de teste de pagamentos'},app_metadata:{agoramed_checkout_teste:true}}});
   if(!r.ok||!r.dados?.id)throw Error();
   const p=await garantirPerfil(r.dados);if(!p||p.papel!=='aluno')throw Error();
   const atualizado=await postgrest(`/perfis?id=eq.${p.id}`,{metodo:'PATCH',servico:true,corpo:{liberado:true}});if(!atualizado.ok)throw Error();
   // Conta fictícia, sem destinatário real nem aviso de cadastro ao professor.
   const aviso=await postgrest(`/avisos_cadastro?usuario_id=eq.${p.id}`,{metodo:'DELETE',servico:true});if(!aviso.ok)throw Error();
   return json(res,200,{ok:true,id:p.id,email,senha});
  }
  if(req.body?.acao==='estornar'){
   const id=req.body.id;if(!UUID.test(id||''))return json(res,400,{ok:false});
   const r=await postgrest(`/pedidos_pagamento_teste?id=eq.${id}&select=*`,{servico:true});
   const p=r.dados?.[0];if(!r.ok||!p||!/^ORDTST[A-Z0-9]+$/.test(p.order_id||''))return json(res,404,{ok:false});
   let order=await mp.requisitar('/v1/orders/'+p.order_id);const estado=mp.conferir(order,p);
   if(estado!=='refunded'){
    if(estado!=='aprovado')return json(res,409,{ok:false,erro:'O pedido de teste não está aprovado.'});
    const digest=crypto.createHash('sha256').update('refund-teste:'+p.id).digest('hex');
    const chave=`${digest.slice(0,8)}-${digest.slice(8,12)}-4${digest.slice(13,16)}-a${digest.slice(17,20)}-${digest.slice(20,32)}`;
    await mp.requisitar('/v1/orders/'+p.order_id+'/refund',{metodo:'POST',corpo:{},chave});
    order=await mp.requisitar('/v1/orders/'+p.order_id);mp.conferir(order,p);
   }
   // O webhook é responsável por revogar o acesso; não alteramos o ledger aqui.
   return json(res,200,{ok:true,status:order.status,detalhe:order.status_detail});
  }
  return json(res,400,{ok:false});
 }catch{return json(res,503,{ok:false,erro:'Falha na operação de homologação. Nenhuma operação de produção foi solicitada.'});}
};
