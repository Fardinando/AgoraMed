/* Uma chamada RPC confirma o curso inteiro. Arquivos novos nunca sobrescrevem os atuais. */
'use strict';
const {createHash}=require('crypto');
const {json,envFaltando,exigirAdmin,postgrest,storage,cursoParaEd,dataUrlParaBytes,env}=require('../../api');
const {UUID,falha,validar,preparar}=require('../../curso-edicao');
async function lerCurso(id){
  const r=await postgrest(`/cursos?id=eq.${id}&select=*,modulos(*,aulas(*,materiais(*)))`,{servico:true});
  if(!r.ok||!Array.isArray(r.dados))throw falha('Não foi possível carregar o curso. Tente novamente.',503);
  return r.dados[0]||null;
}
async function limparArquivos(){
  const r=await postgrest(`/arquivos_curso_pendentes?disponivel_em=lte.${encodeURIComponent(new Date().toISOString())}&select=bucket,caminho&order=disponivel_em.asc&limit=3`,{servico:true});
  if(!r.ok||!Array.isArray(r.dados))return;
  for(const f of r.dados){
    if(!['capas','materiais'].includes(f.bucket))continue;
    const filtro=f.bucket==='materiais'?`/materiais?caminho=eq.${encodeURIComponent(f.caminho)}&select=id&limit=1`:`/cursos?capa_url=eq.${encodeURIComponent(`${env.SUPABASE_URL}/storage/v1/object/public/capas/${f.caminho}`)}&select=id&limit=1`;
    const ref=await postgrest(filtro,{servico:true});if(!ref.ok||!Array.isArray(ref.dados))continue;
    /* Caminhos gerenciados só podem ser mantidos pelo curso que já os referencia.
       Outro editor não pode ressuscitar um caminho retirado ou copiar uma capa gerenciada. */
    if(!ref.dados.length){const apagado=await storage('DELETE',`object/${f.bucket}`,{contentType:'application/json',corpo:JSON.stringify({prefixes:[f.caminho]})});if(!apagado.ok&&apagado.status!==404)continue;}
    await postgrest(`/arquivos_curso_pendentes?bucket=eq.${f.bucket}&caminho=eq.${encodeURIComponent(f.caminho)}`,{metodo:'DELETE',servico:true});
  }
}
function responder(res,resultado){
  return json(res,200,resultado.excluido?{ok:true,excluido:true}:{ok:true,curso:cursoParaEd(resultado.curso)});
}
module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','private, no-store');
  if(envFaltando().length)return json(res,503,{ok:false,erro:'Configuração incompleta no servidor.'});
  const admin=await exigirAdmin(req,res);if(!admin)return;
  try{
    if(req.method==='GET'){
      const id=req.query?.id;if(typeof id!=='string'||!UUID.test(id))throw falha('Curso inválido.');
      const c=await lerCurso(id);if(!c)throw falha('Curso não encontrado.',404);
      return json(res,200,{ok:true,curso:cursoParaEd(c)});
    }
    if(!['POST','DELETE'].includes(req.method))return json(res,405,{ok:false,erro:'Método não permitido.'});
    const excluir=req.method==='DELETE';
    const ed=req.body?.curso||{};const removidos=req.body?.removidos||{modulos:[],aulas:[],materiais:[]};const operacao=req.body?.operacaoId;
    if(excluir){if(!UUID.test(ed.id||'')||!Number.isInteger(ed.versao)||!UUID.test(operacao||''))throw falha('Atualize a página antes de excluir este curso.',409);}
    else validar(ed,removidos,operacao);
    const acao=excluir?'excluir':'salvar';const requisicao=createHash('sha256').update(JSON.stringify({acao,curso:ed,removidos})).digest('hex');
    const repetida=await postgrest(`/operacoes_curso?operacao_id=eq.${operacao}&select=admin_id,requisicao,resultado`,{servico:true});
    if(!repetida.ok||!Array.isArray(repetida.dados))throw falha('Não foi possível conferir o salvamento. Suas alterações foram mantidas.',503);
    if(repetida.dados[0]){
      const op=repetida.dados[0];if(op.admin_id!==admin.id||op.requisicao!==requisicao)throw falha('Esta tentativa corresponde a outras alterações. Reabra o editor.',409);
      return responder(res,op.resultado);
    }
    const anterior=await lerCurso(ed.id);
    if((anterior&&anterior.versao!==ed.versao)||(!anterior&&(ed.versao!==0||excluir)))throw falha('Este curso foi atualizado em outra sessão. Suas alterações foram mantidas no editor. Reabra a versão atual antes de salvar.',409);
    const preparado=excluir?{curso:{id:ed.id},arquivos:[]}:preparar(ed,anterior,operacao,{dataUrlParaBytes,baseUrl:env.SUPABASE_URL});
    preparado.curso.requisicao=requisicao;
    if(preparado.arquivos.length){
      const pendentes=preparado.arquivos.map(f=>({bucket:f.bucket,caminho:f.caminho,disponivel_em:new Date(Date.now()+24*3600*1000).toISOString()}));
      const reserva=await postgrest('/arquivos_curso_pendentes',{metodo:'POST',servico:true,upsert:true,corpo:pendentes});
      if(!reserva.ok)throw falha('Não foi possível preparar os arquivos. Nenhuma alteração foi salva.',503);
      for(let i=0;i<preparado.arquivos.length;i+=3){
        const envios=await Promise.allSettled(preparado.arquivos.slice(i,i+3).map(f=>storage('POST',`object/${f.bucket}/${f.caminho}`,{corpo:f.dados,contentType:f.mime})));
        if(envios.some(r=>r.status!=='fulfilled'||(!r.value.ok && r.value.status!==409 && !(r.value.status===400 && /already exists|duplicate/i.test(JSON.stringify(r.value.dados))))))throw falha('Não foi possível enviar todos os arquivos. O curso anterior foi preservado; tente salvar novamente.',503);
      }
    }
    const r=await postgrest('/rpc/salvar_curso_atomico',{metodo:'POST',servico:true,corpo:{p_curso:preparado.curso,p_versao:ed.versao,p_removidos:removidos,p_operacao:operacao,p_admin:admin.id,p_acao:acao}});
    if(!r.ok||!r.dados?.ok){
      const codigo=r.dados?.code;const status=codigo==='40001'?409:codigo==='42501'?403:['22023','22P02','23514','23505','23502','23503'].includes(codigo)?400:503;
      const erro=['40001','22023'].includes(codigo)?r.dados.message:'Não foi possível confirmar o salvamento. Suas alterações continuam no editor; tente salvar novamente.';
      throw falha(erro,status);
    }
    if(r.dados.limpeza_pendente)await limparArquivos().catch(()=>{});
    return responder(res,r.dados);
  }catch(e){return json(res,e.status||503,{ok:false,conflito:e.status===409,erro:e.status?e.message:'Não foi possível confirmar o salvamento. Suas alterações continuam no editor; tente salvar novamente.'});}
};
