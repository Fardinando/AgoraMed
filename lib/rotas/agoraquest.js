'use strict';
const {randomUUID}=require('crypto');
const {json,envFaltando,sessaoPerfil,postgrest,podeAcessarCurso}=require('../api');
const {UUID}=require('../curso-edicao');
const Q=require('../agoraquest');

async function urlProximaAula(cursoId,aulaId){
  const sequence=await postgrest(`/modulos?curso_id=eq.${encodeURIComponent(cursoId)}&select=id,ordem,aulas(id,ordem)&order=ordem.asc,id.asc`,{servico:true});
  if(!sequence.ok||!Array.isArray(sequence.dados))return null;
  const flat=sequence.dados.flatMap(m=>(m.aulas||[])
    .slice()
    .sort((a,b)=>a.ordem-b.ordem||String(a.id).localeCompare(String(b.id)))
    .map(a=>({m:m.id,a:a.id})));
  const pos=flat.findIndex(x=>x.a===aulaId);
  const next=pos>=0?flat[pos+1]:null;
  return next?`aula.html?c=${encodeURIComponent(cursoId)}&m=${encodeURIComponent(next.m)}&a=${encodeURIComponent(next.a)}`:null;
}

module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','private, no-store');
  if(!['GET','POST'].includes(req.method))return json(res,405,{ok:false,erro:'Método não permitido.'});
  if(envFaltando().length)return json(res,503,{ok:false,erro:'Serviço indisponível.'});
  try{
    const perfil=await sessaoPerfil(req);
    if(!perfil)return json(res,401,{ok:false,erro:'Sua sessão expirou. Entre novamente.'});
    const id=req.method==='GET'?req.query?.aula_id:req.body?.aula_id;
    if(typeof id!=='string'||!UUID.test(id))return json(res,400,{ok:false,erro:'Aula inválida.'});

    const ar=await postgrest(`/aulas?id=eq.${id}&select=id,titulo,modulo_id,modulos(curso_id,titulo)&limit=1`,{servico:true});
    if(!ar.ok||!Array.isArray(ar.dados))throw Error();
    const aula=ar.dados[0];
    if(!aula)return json(res,404,{ok:false,erro:'Atividade não encontrada.'});
    const cursoId=aula.modulos?.curso_id;
    if(!await podeAcessarCurso(perfil,cursoId))return json(res,403,{ok:false,erro:'Sem acesso a este curso.'});

    const qr=await postgrest(`/agoraquest_atividades?aula_id=eq.${id}&select=slug,versao_conteudo,titulo&limit=1`,{servico:true});
    if(!qr.ok||!Array.isArray(qr.dados))throw Error();
    const ativ=qr.dados[0];
    const conteudo=ativ&&Q.porSlug(ativ.slug);
    if(!ativ||!conteudo)return json(res,404,{ok:false,erro:'Atividade não encontrada.'});
    if(Number(ativ.versao_conteudo)!==conteudo.versao)return json(res,409,{ok:false,erro:'A atividade foi atualizada. Recarregue a página.'});

    const cr=await postgrest(`/cursos?id=eq.${encodeURIComponent(cursoId)}&select=titulo`,{servico:true});
    const cursoTitulo=cr.ok&&Array.isArray(cr.dados)&&cr.dados[0]?cr.dados[0].titulo:'';

    if(req.method==='GET'&&req.query?.meta==='1')
      return json(res,200,{ok:true,disponivel:true,slug:ativ.slug,titulo:ativ.titulo||conteudo.title,aulaTitulo:aula.titulo,cursoTitulo,cursoId,moduloId:aula.modulo_id});

    if(req.method==='GET'&&req.query?.historico==='1'){
      const offset=Number(req.query.offset||0);
      if(!Number.isInteger(offset)||offset<0||offset>100000)return json(res,400,{ok:false,erro:'Página inválida.'});
      const h=await postgrest(`/agoraquest_tentativas?usuario_id=eq.${perfil.id}&aula_id=eq.${id}&order=criado_em.desc,id.desc&limit=26&offset=${offset}`,{servico:true});
      if(!h.ok||!Array.isArray(h.dados))throw Error();
      return json(res,200,{ok:true,more:h.dados.length>25,history:h.dados.slice(0,25).map(t=>Q.publicState(t.estado))});
    }

    if(req.method==='GET'&&req.query?.caderno==='1'){
      const h=await postgrest(`/agoraquest_tentativas?usuario_id=eq.${perfil.id}&aula_id=eq.${id}&order=criado_em.desc,id.desc&limit=100`,{servico:true});
      if(!h.ok||!Array.isArray(h.dados))throw Error();
      return json(res,200,{ok:true,caderno:Q.caderno(h.dados,conteudo)});
    }

    const r=await postgrest(`/agoraquest_tentativas?usuario_id=eq.${perfil.id}&aula_id=eq.${id}&order=criado_em.desc,id.desc&limit=1`,{servico:true});
    if(!r.ok||!Array.isArray(r.dados))throw Error();
    let row=r.dados[0]||null;
    const nextUrl=await urlProximaAula(cursoId,id);
    const send=()=>json(res,200,{
      ok:true,
      content:Q.visible(row?.estado,conteudo),
      state:row?Q.publicState(row.estado):null,
      revision:row?.revisao||0,
      cursoId,moduloId:aula.modulo_id,nextUrl,lessonTitle:aula.titulo,cursoTitulo,slug:ativ.slug
    });
    if(req.method==='GET')return send();

    const b=req.body||{},action=b.action;
    if(!UUID.test(b.operation||''))return json(res,400,{ok:false,erro:'Solicitação inválida. Atualize a atividade.'});
    if(row?.ultima_operacao===b.operation)return send();
    let state,nextId;
    if(action==='start'){
      if((b.previous||null)!==(row?.id||null))return json(res,409,{ok:false,conflito:true,erro:'A atividade mudou em outra sessão. Atualize para retomar.'});
      state=Q.E.fresh();state.id=randomUUID();nextId=state.id;
    }else{
      if(!row||row.id!==b.attempt||row.revisao!==b.revision)return json(res,409,{ok:false,conflito:true,erro:'A atividade mudou em outra sessão. Atualize para retomar.'});
      try{state=Q.transition(row.estado,action,b);}catch(e){return json(res,400,{ok:false,erro:e.message});}
      nextId=row.id;
    }
    const saved=await postgrest('/rpc/agoraquest_gravar',{metodo:'POST',servico:true,corpo:{
      p_usuario:perfil.id,p_aula:id,p_id:nextId,p_revisao:row?.revisao||0,p_estado:state,
      p_nova:action==='start',p_anterior:row?.id||null,p_operacao:b.operation,p_versao:conteudo.versao
    }});
    if(!saved.ok){
      const conflict=saved.dados?.code==='40001';
      return json(res,conflict?409:503,{ok:false,conflito:conflict,erro:conflict?'A atividade mudou em outra sessão. Atualize para retomar.':'Não foi possível salvar. Tente novamente antes de sair da página.'});
    }
    row=saved.dados;
    if(!row?.estado)throw Error();
    return send();
  }catch(e){
    return json(res,503,{ok:false,erro:'Não foi possível carregar ou salvar a atividade. Tente novamente.'});
  }
};
