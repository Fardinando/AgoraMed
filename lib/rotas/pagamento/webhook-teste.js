'use strict';
const {json,postgrest}=require('../../api');const mp=require('../../mercado-pago');
module.exports=async(req,res)=>{
 if(req.method!=='POST')return json(res,405,{ok:false});
 const id=req.query?.['data.id'];
 if(!mp.validarAssinatura(req.headers,id,process.env.MERCADO_PAGO_WEBHOOK_SECRET_TEST))return json(res,401,{ok:false});
 if(typeof id!=='string'||!/^ORDTST[A-Z0-9]+$/.test(id))return json(res,400,{ok:false});
 try{
 const r=await postgrest(`/pedidos_pagamento_teste?order_id=eq.${id}&select=*`,{servico:true});if(!r.ok)throw Error();const p=r.dados?.[0];if(!p)return json(res,200,{ok:true});
 const order=await mp.requisitar('/v1/orders/'+id);const estado=mp.conferir(order,p);
 const salvo=await postgrest('/rpc/confirmar_pagamento_teste',{metodo:'POST',servico:true,corpo:{p_id:p.id,p_estado:estado,p_atualizado:order.last_updated_date}});if(!salvo.ok)throw Error();
 return json(res,200,{ok:true});
 }catch{return json(res,503,{ok:false});}
};
