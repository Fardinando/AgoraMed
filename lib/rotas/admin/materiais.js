/* Autoriza um único caminho privado. Nenhuma chave de serviço é enviada ao navegador. */
'use strict';
const {randomUUID}=require('node:crypto');
const {json,envFaltando,exigirAdmin,postgrest,storage,env}=require('../../api');
const {UUID,falha}=require('../../curso-edicao');
const {LIMITE_PDF,assinar}=require('../../pdf-envio');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='POST')return json(res,405,{ok:false,erro:'Método não permitido.'});
 if(envFaltando().length)return json(res,503,{ok:false,erro:'Configuração incompleta no servidor.'});
 const admin=await exigirAdmin(req,res);if(!admin)return;
 try{
  const {cursoId,aulaId,nome,tamanho}=req.body||{};
  if(!UUID.test(cursoId||'')||!UUID.test(aulaId||'')||typeof nome!=='string'||!nome.toLowerCase().endsWith('.pdf')||!Number.isInteger(tamanho)||tamanho<5||tamanho>LIMITE_PDF)throw falha('Selecione um PDF de até 50 MB.');
  /* A aula pode ser nova no editor. Se já existir, deve pertencer ao curso indicado. */
  const aula=await postgrest(`/aulas?id=eq.${aulaId}&select=modulos(curso_id)`,{servico:true});
  if(!aula.ok||!Array.isArray(aula.dados))throw falha('Não foi possível conferir a aula.',503);
  if(aula.dados[0]&&aula.dados[0].modulos?.curso_id!==cursoId)throw falha('A aula pertence a outro curso.');
  const id=randomUUID(),caminho=`${aulaId}/envios/${id}.pdf`;
  const dados={id,caminho,cursoId,aulaId,adminId:admin.id,tamanho,nome:nome.replace(/[\x00-\x1f\x7f]/g,'').slice(0,200)};
  const reserva=await postgrest('/arquivos_curso_pendentes',{metodo:'POST',servico:true,corpo:{bucket:'materiais',caminho,disponivel_em:new Date(Date.now()+24*3600*1000).toISOString()}});
  if(!reserva.ok)throw falha('Não foi possível preparar o envio do PDF.',503);
  const r=await storage('POST',`object/upload/sign/materiais/${caminho}`,{contentType:'application/json',corpo:'{}'});
  if(!r.ok||typeof r.dados?.url!=='string')throw falha('Não foi possível autorizar o envio do PDF.',503);
  const url=new URL(env.SUPABASE_URL+'/storage/v1'+r.dados.url);
  if(url.origin!==new URL(env.SUPABASE_URL).origin||!url.pathname.startsWith('/storage/v1/object/upload/sign/materiais/')||!url.searchParams.get('token'))throw falha('Não foi possível autorizar o envio do PDF.',503);
  return json(res,200,{ok:true,url:url.href,envio:assinar(dados)});
 }catch(e){return json(res,e.status||503,{ok:false,erro:e.status?e.message:'Não foi possível preparar o envio do PDF. Tente novamente.'});}
};
