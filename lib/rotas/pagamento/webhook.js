'use strict';
const {json,postgrest}=require('../../api');const mp=require('../../mercado-pago-producao');const {validarAssinatura}=require('../../mercado-pago');
module.exports=async(req,res)=>{
 if(req.method!=='POST')return json(res,405,{ok:false});
 if(!mp.credenciaisProntas())return json(res,503,{ok:false});
 const id=req.query?.['data.id'];
 if(typeof id!=='string'||!/^ORD[A-Z0-9]+$/.test(id)||id.startsWith('ORDTST')||!validarAssinatura(req.headers,id,process.env.MERCADO_PAGO_WEBHOOK_SECRET))return json(res,401,{ok:false});
 try{
  const r=await postgrest(`/pedidos_pagamento?order_id=eq.${id}&select=*`,{servico:true});if(!r.ok)throw Error();const p=r.dados?.[0];if(!p)return json(res,200,{ok:true});
  await mp.confirmar(p,postgrest);return json(res,200,{ok:true});
 }catch{return json(res,503,{ok:false});}
};
