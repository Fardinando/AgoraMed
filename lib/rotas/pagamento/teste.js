/* Sandbox isolado: nunca concede matrícula nem processa pagamentos reais. */
'use strict';
const {json,sessaoPerfil,postgrest}=require('../../api');
const mp=require('../../mercado-pago');
const {homologacaoAtiva,acessosTeste}=require('../../checkout-homologacao');
const CURSO='fa3c5d8d-94c4-4321-be7a-1cc45741a983';
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','private, no-store');
 if(!['GET','POST'].includes(req.method))return json(res,405,{ok:false});
 const perfil=await sessaoPerfil(req);if(!perfil)return json(res,403,{ok:false,erro:'Entre com uma conta autorizada de teste.'});
 try{
 if(perfil.papel!=='admin'){
  if(!homologacaoAtiva())return json(res,403,{ok:false,erro:'Teste restrito à homologação.'});
  const teste=await acessosTeste(perfil.id,postgrest);
  if(!teste.participante)return json(res,403,{ok:false,erro:'Conta não habilitada para homologação.'});
 }
 if(req.method==='POST'){
  if(!mp.origemPermitida(req.headers.origin))return json(res,403,{ok:false,erro:'Origem inválida.'});
  const curso=await postgrest(`/cursos?id=eq.${CURSO}&select=titulo,config_pagamento`,{servico:true});const c=curso.dados?.[0];
  if(!curso.ok||c?.config_pagamento?.provedor!=='mercado_pago')throw Error();
  const p={id:mp.randomUUID(),usuario_id:perfil.id,curso_id:CURSO,preco_centavos:9700,acesso_meses:c.config_pagamento.acesso_meses};
  const salvo=await postgrest('/pedidos_pagamento_teste',{metodo:'POST',servico:true,corpo:p});if(!salvo.ok)throw Error();
  const order=await mp.criar(p,c.titulo);
  const atualizado=await postgrest(`/pedidos_pagamento_teste?id=eq.${p.id}`,{metodo:'PATCH',servico:true,corpo:order});if(!atualizado.ok)throw Error();
  return json(res,200,{ok:true,id:p.id,url:order.checkout_url});
 }
 const id=req.query?.id;if(typeof id!=='string'||!/^[a-f0-9-]{36}$/.test(id))return json(res,400,{ok:false});
 const r=await postgrest(`/pedidos_pagamento_teste?id=eq.${id}&usuario_id=eq.${perfil.id}&select=*`,{servico:true});const p=r.dados?.[0];if(!r.ok||!p?.order_id)return json(res,404,{ok:false});
 const order=await mp.requisitar('/v1/orders/'+encodeURIComponent(p.order_id));const estado=mp.conferir(order,p);
 const salvo=await postgrest('/rpc/confirmar_pagamento_teste',{metodo:'POST',servico:true,corpo:{p_id:p.id,p_estado:estado,p_atualizado:order.last_updated_date}});if(!salvo.ok)throw Error();
 return json(res,200,{ok:true,...salvo.dados,estado,teste:true,acessoRealLiberado:false});
 }catch{return json(res,503,{ok:false,erro:'Não foi possível concluir o teste de pagamento. Nenhum acesso real foi liberado.'});}
};
