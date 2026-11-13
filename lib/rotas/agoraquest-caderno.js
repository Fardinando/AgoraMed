'use strict';
const {json,envFaltando,sessaoPerfil,postgrest,podeAcessarCurso,cursoDaAula}=require('../api');
const {UUID}=require('../curso-edicao');
const Q=require('../agoraquest');
const CADERNO=Q.N;

const CAMPOS='id,questao_id,slug,numero,aula_id,estado,erros,revisoes,acertos_seguidos,ultima_escolha,ultimo_erro_em,criado_em,atualizado_em,aulas(id,titulo,ordem,modulos(id,titulo,ordem,curso_id,cursos(id,titulo)))';

function cursoIdDaLinha(row){
  return row&&row.aulas&&row.aulas.modulos?row.aulas.modulos.curso_id:null;
}

async function listar(perfil){
  const r=await postgrest(`/agoraquest_caderno?usuario_id=eq.${encodeURIComponent(perfil.id)}&select=${CAMPOS}&order=atualizado_em.desc&limit=500`,{servico:true});
  if(!r.ok||!Array.isArray(r.dados))throw Error();
  let linhas=r.dados;
  if(perfil.papel!=='admin'){
    /* O acesso é conferido curso a curso, incluindo matrícula, curso gratuito e homologação. */
    const cursos=[...new Set(linhas.map(cursoIdDaLinha).filter(Boolean))];
    const permitido=new Map();
    await Promise.all(cursos.map(async id=>permitido.set(id,await podeAcessarCurso(perfil,id))));
    linhas=linhas.filter(row=>permitido.get(cursoIdDaLinha(row))===true);
  }
  const lista=CADERNO.montarLista(linhas,slug=>Q.porSlug(slug));
  return {
    itens:lista.itens,
    indicadores:lista.indicadores,
    grupos:lista.grupos,
    estados:CADERNO.ESTADOS.map(estado=>({estado,rotulo:CADERNO.rotulo(estado)})),
    dominioAcertos:CADERNO.dominioAcertos()
  };
}

async function carregarItem(perfil,questaoId){
  const r=await postgrest(`/agoraquest_caderno?usuario_id=eq.${encodeURIComponent(perfil.id)}&questao_id=eq.${encodeURIComponent(questaoId)}&select=${CAMPOS}&limit=1`,{servico:true});
  if(!r.ok||!Array.isArray(r.dados))throw Error();
  return r.dados[0]||null;
}

/* Confere se o aluno ainda tem acesso à aula da questão. */
async function autorizar(perfil,row){
  const cursoId=row&&row.aulas&&row.aulas.modulos?row.aulas.modulos.curso_id:await cursoDaAula(row.aula_id);
  if(!await podeAcessarCurso(perfil,cursoId))return null;
  const a=await postgrest(`/agoraquest_atividades?slug=eq.${encodeURIComponent(row.slug)}&select=aula_id,versao_conteudo&limit=1`,{servico:true});
  const ativ=a.ok&&Array.isArray(a.dados)?a.dados[0]:null;
  if(!ativ||ativ.aula_id!==row.aula_id)return null;
  const conteudo=Q.porSlug(row.slug);
  if(!conteudo||Number(ativ.versao_conteudo)!==conteudo.versao)return null;
  return conteudo;
}

module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','private, no-store');
  if(!['GET','POST'].includes(req.method))return json(res,405,{ok:false,erro:'Método não permitido.'});
  if(envFaltando().length)return json(res,503,{ok:false,erro:'Serviço indisponível.'});
  try{
    const perfil=await sessaoPerfil(req);
    if(!perfil)return json(res,401,{ok:false,erro:'Sua sessão expirou. Entre novamente.'});

    if(req.method==='GET'&&req.query&&typeof req.query.revisao==='string'){
      const questaoId=req.query.revisao;
      if(!CADERNO.separarId(questaoId))return json(res,400,{ok:false,erro:'Questão inválida.'});
      const row=await carregarItem(perfil,questaoId);
      if(!row)return json(res,404,{ok:false,erro:'Questão não encontrada no seu caderno.'});
      const conteudo=await autorizar(perfil,row);
      if(!conteudo)return json(res,403,{ok:false,erro:'Sem acesso a esta questão.'});
      const revisao=CADERNO.revisaoView(row,conteudo);
      if(!revisao)return json(res,404,{ok:false,erro:'Questão indisponível.'});
      return json(res,200,{ok:true,revisao});
    }

    if(req.method==='GET'){
      return json(res,200,Object.assign({ok:true},await listar(perfil)));
    }

    const b=req.body||{};
    if(b.action!=='revisar')return json(res,400,{ok:false,erro:'Ação inválida.'});
    if(typeof b.questao_id!=='string'||!CADERNO.separarId(b.questao_id))return json(res,400,{ok:false,erro:'Questão inválida.'});
    if(!['A','B','C','D'].includes(b.choice))return json(res,400,{ok:false,erro:'Selecione uma alternativa.'});
    if(!UUID.test(b.operation||''))return json(res,400,{ok:false,erro:'Solicitação inválida. Tente novamente.'});

    const row=await carregarItem(perfil,b.questao_id);
    if(!row)return json(res,404,{ok:false,erro:'Questão não encontrada no seu caderno.'});
    const conteudo=await autorizar(perfil,row);
    if(!conteudo)return json(res,403,{ok:false,erro:'Sem acesso a esta questão.'});

    const resultado=CADERNO.resultadoRevisao(row,conteudo,b.choice);
    if(!resultado)return json(res,404,{ok:false,erro:'Questão indisponível.'});

    const salvo=await postgrest('/rpc/agoraquest_caderno_revisar',{metodo:'POST',servico:true,corpo:{
      p_usuario:perfil.id,p_questao_id:b.questao_id,p_escolha:b.choice,
      p_correta:resultado.correta,p_operacao:b.operation,p_dominio:CADERNO.dominioAcertos()
    }});
    if(!salvo.ok){
      const codigo=salvo.dados&&salvo.dados.code;
      const status=codigo==='42501'?403:codigo==='22023'?400:503;
      return json(res,status,{ok:false,erro:status===503?'Não foi possível salvar a revisão. Tente novamente.':'Não foi possível revisar esta questão.'});
    }

    const atualizado=await carregarItem(perfil,b.questao_id)||row;
    const item=CADERNO.itemPublico(atualizado,conteudo);
    const lista=await listar(perfil);
    return json(res,200,{
      ok:true,
      resultado:Object.assign({},resultado,{
        estado:atualizado.estado,
        estadoRotulo:CADERNO.rotulo(atualizado.estado),
        revisoes:Number(atualizado.revisoes)||0,
        acertosSeguidos:Number(atualizado.acertos_seguidos)||0,
        dominioAcertos:CADERNO.dominioAcertos()
      }),
      item,
      indicadores:lista.indicadores
    });
  }catch(e){
    return json(res,503,{ok:false,erro:'Não foi possível carregar ou salvar o caderno de erros. Tente novamente.'});
  }
};
