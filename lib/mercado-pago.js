'use strict';
const {randomUUID,createHmac,timingSafeEqual}=require('crypto');
const ORIGEM='https://www.andersongleryston.med.br';
function valor(centavos){if(!Number.isSafeInteger(centavos)||centavos<100)throw Error('Preço inválido');return (centavos/100).toFixed(2);}
function checkoutSeguro(url){const u=new URL(url);if(u.protocol!=='https:'||u.hostname!=='www.mercadopago.com.br'||u.pathname!=='/checkout/v1/redirect'||u.username||u.password)throw Error('Checkout inválido');return u.href;}
async function requisitar(caminho,{metodo='GET',corpo,chave,fetcher=fetch}={}){
 const token=process.env.MERCADO_PAGO_ACCESS_TOKEN_TEST;if(!token)throw Error('Credencial de teste indisponível');
 const r=await fetcher('https://api.mercadopago.com'+caminho,{method:metodo,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',...(chave?{'X-Idempotency-Key':chave}:{})},body:corpo?JSON.stringify(corpo):undefined,signal:AbortSignal.timeout(15000)});
 const dados=await r.json();if(!r.ok)throw Error('Mercado Pago indisponível');return dados;
}
function conferir(order,pedido){
 if(order.id!==pedido.order_id||order.external_reference!==pedido.id||order.currency!=='BRL'||String(order.user_id)!=='3829170862'||String(order.integration_data?.application_id)!=='6132625255477789'||!/^ORDTST/.test(order.id)||Number(order.total_amount)!==pedido.preco_centavos/100)throw Error('Order incompatível');
 const pago=order.status==='processed'&&order.status_detail==='accredited'&&Number(order.total_paid_amount)===pedido.preco_centavos/100;
 return pago?'aprovado':(['refunded','charged_back','cancelled','expired'].includes(order.status)?order.status:'pendente');
}
async function criar(pedido,titulo){const o=await requisitar('/v1/orders',{metodo:'POST',chave:pedido.id,corpo:{type:'online',processing_mode:'manual',total_amount:valor(pedido.preco_centavos),external_reference:pedido.id,items:[{title:titulo,unit_price:valor(pedido.preco_centavos),quantity:1}],expiration_time:'P1D'}});pedido.order_id=o.id;conferir(o,pedido);return {order_id:o.id,checkout_url:checkoutSeguro(o.checkout_url)};}
function validarAssinatura(headers,id,segredo){
 if(!segredo||typeof id!=='string'||!headers['x-request-id']||typeof headers['x-signature']!=='string')return false;
 const partes=Object.fromEntries(headers['x-signature'].split(',').map(p=>p.trim().split('=')));
 if(!/^\d+$/.test(partes.ts||'')||! /^[a-f0-9]{64}$/i.test(partes.v1||''))return false;
 const manifesto=`id:${id.toLowerCase()};request-id:${headers['x-request-id']};ts:${partes.ts};`;
 const esperado=createHmac('sha256',segredo).update(manifesto).digest();
 return timingSafeEqual(esperado,Buffer.from(partes.v1,'hex'));
}
function origemPermitida(origem){return [ORIGEM,...[process.env.VERCEL_URL,process.env.VERCEL_BRANCH_URL].filter(Boolean).map(host=>'https://'+host)].includes(origem);}
module.exports={origemPermitida,validarAssinatura,valor,checkoutSeguro,requisitar,conferir,criar,randomUUID,ORIGEM};
