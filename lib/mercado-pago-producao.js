'use strict';
const sandbox=require('./mercado-pago');
const ORIGEM='https://www.andersongleryston.med.br';
const APP_ID='3416187309401938';
function credenciaisProntas(){return process.env.VERCEL_ENV==='production'&&!!process.env.MERCADO_PAGO_ACCESS_TOKEN&&!!process.env.MERCADO_PAGO_WEBHOOK_SECRET;}
function vendasAtivas(){return credenciaisProntas()&&process.env.MERCADO_PAGO_VENDAS_ATIVAS==='true';}
async function requisitar(caminho,{metodo='GET',corpo,chave,fetcher=fetch}={}){
 if(!credenciaisProntas())throw Error('Pagamento de produção indisponível');
 const r=await fetcher('https://api.mercadopago.com'+caminho,{method:metodo,headers:{Authorization:`Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,'Content-Type':'application/json',...(chave?{'X-Idempotency-Key':chave}:{})},body:corpo?JSON.stringify(corpo):undefined,signal:AbortSignal.timeout(15000)});
 const d=await r.json();if(!r.ok)throw Object.assign(Error('Mercado Pago indisponível'),{statusProvedor:r.status});return d;
}
let vendedorCache;
async function vendedor(){
 if(vendedorCache&&vendedorCache.ate>Date.now())return vendedorCache.id;
 const u=await requisitar('/users/me');const id=String(u.id||'');
 if(!/^\d+$/.test(id)||['3829170862','3829532436'].includes(id)||u.tags?.includes('test_user'))throw Error('Conta de recebimento inválida');
 vendedorCache={id,ate:Date.now()+300000};return id;
}
function conferir(o,p,vendedorId){
 if(!/^ORD[A-Z0-9]+$/.test(o.id||'')||o.id.startsWith('ORDTST')||o.id!==p.order_id||o.external_reference!==p.id||o.currency!=='BRL'||String(o.user_id)!==String(vendedorId)||String(o.integration_data?.application_id)!==APP_ID||Number(o.total_amount)!==p.preco_centavos/100||o.live_mode===false)throw Error('Pagamento incompatível');
 if(o.status==='processed'&&o.status_detail==='accredited'&&Number(o.total_paid_amount)===p.preco_centavos/100)return 'aprovado';
 if(['refunded','charged_back','expired'].includes(o.status))return o.status;
 if(['canceled','cancelled'].includes(o.status))return 'cancelled';
 if(o.status_detail==='partially_refunded')return 'revisao';
 const pagamentos=o.transactions?.payments;
 if(o.status==='failed'||(o.status==='action_required'&&o.status_detail==='waiting_retry'&&Array.isArray(pagamentos)&&pagamentos.length&&pagamentos.every(v=>v.status==='failed')))return 'rejeitado';
 return 'pendente';
}
async function criar(p,titulo){
 const retorno=ORIGEM+'/pagamento.html?modo=real&pedido='+encodeURIComponent(p.id);
 const o=await requisitar('/v1/orders',{metodo:'POST',chave:p.id,corpo:{type:'online',processing_mode:'manual',total_amount:sandbox.valor(p.preco_centavos),external_reference:p.id,expiration_time:'P1D',items:[{title:titulo,unit_price:sandbox.valor(p.preco_centavos),quantity:1}],config:{online:{success_url:retorno,failure_url:retorno,pending_url:retorno,auto_return:'approved'},payment_method:{max_installments:1}}}});
 conferir(o,{...p,order_id:o.id},await vendedor());return {order_id:o.id,checkout_url:sandbox.checkoutSeguro(o.checkout_url)};
}
async function confirmar(p,postgrest){const o=await requisitar('/v1/orders/'+encodeURIComponent(p.order_id));const estado=conferir(o,p,await vendedor());const r=await postgrest('/rpc/confirmar_pagamento',{metodo:'POST',servico:true,corpo:{p_id:p.id,p_estado:estado,p_atualizado:o.last_updated_date}});if(!r.ok||!r.dados)throw Error('Confirmação indisponível');return r.dados;}
module.exports={ORIGEM,APP_ID,credenciaisProntas,vendasAtivas,requisitar,vendedor,conferir,criar,confirmar};
