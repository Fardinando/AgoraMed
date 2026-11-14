'use strict';

const api = require('../api');
const { UUID } = require('../curso-edicao');
const banco = require('../agoraquiz/bancos');
const quiz = require('../agoraquiz/curso');
const eventos = require('../agoraquiz/eventos');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-store');
  const responder = (status, dados) => api.json(res, status, dados);
  if (!['GET', 'POST'].includes(req.method)) return responder(405, { erro: 'Método inválido.' });
  if (api.envFaltando().length) return responder(503, { erro: 'Serviço indisponível.' });
  const query = req.query || {};
  const dados = req.body || {};
  const curso = req.method === 'GET' ? query.curso_id : dados.curso_id;
  if (curso !== banco.cursoId) return responder(404, { erro: 'AgoraQuiz indisponível para este curso.' });

  try {
    const perfil = await api.sessaoPerfil(req);
    if (!perfil) return responder(401, { erro: 'Entre na sua conta para continuar.' });
    if (!await api.podeAcessarCurso(perfil, curso)) return responder(403, { erro: 'Você precisa ter acesso ao curso.' });

    const filtro = '/agoraquiz_tentativas?usuario_id=eq.' + encodeURIComponent(perfil.id) + '&curso_id=eq.' + curso;
    const consultar = async caminho => {
      const resultado = await api.postgrest(filtro + caminho, { servico: true });
      if (!resultado.ok || !Array.isArray(resultado.dados)) throw new Error('Consulta indisponível.');
      return resultado.dados;
    };
    const carregarHistoricoDeQuestoes = async () => {
      const pagina = 1000;
      const estados = [];
      for (let offset = 0; ; offset += pagina) {
        const linhas = await consultar('&select=estado&order=criado_em.asc,id.asc&limit=' + pagina + '&offset=' + offset);
        estados.push(...linhas.map(linha => linha.estado));
        if (linhas.length < pagina) return estados;
      }
    };
    const ordem = '&order=criado_em.desc,id.desc';
    const versao = linha => linha ? { ...quiz.visivel(linha.estado), revisao: linha.revisao } : null;
    const gravarEvento = async (linha, tipo, questaoId, id, tempoMs = null) => {
      const ref = linha.estado.questoes.find(item => item.id === questaoId);
      const q = banco.questaoDoCurso(curso, questaoId);
      if (!ref || !q || ref.versao !== q.versao) throw new Error('Evento de questão inválido.');
      const escolha = linha.estado.respostas[questaoId] || null;
      const correta = escolha ? escolha === q.gabarito : null;
      if (['quiz_answer_submitted','quiz_answer_evaluated','quiz_question_flagged_for_review','quiz_competency_progress_updated'].includes(tipo) && !escolha) {
        throw new Error('A resposta da questão ainda não foi registrada.');
      }
      if (tipo === 'quiz_question_flagged_for_review' && correta !== false) throw new Error('Somente respostas incorretas entram em revisão.');
      if (tipo === 'quiz_explanation_viewed' && (!escolha || (linha.estado.modalidade === 'simulado' && !linha.estado.concluidoEm))) {
        throw new Error('A explicação ainda não está disponível.');
      }
      const estadoRevisao = tipo === 'quiz_question_flagged_for_review' || correta === false ? 'precisa_revisar' : 'nao_avaliado';
      const dadosEvento = eventos.campos({ id, usuarioId:perfil.id, cursoId:curso, tentativaId:linha.id,
        questaoId, versao:Number(q.content_version)||1, tipo, modalidade:linha.estado.modalidade,
        alternativa:['quiz_answer_submitted','quiz_answer_evaluated','quiz_question_flagged_for_review'].includes(tipo) ? escolha : null,
        correta:tipo === 'quiz_answer_evaluated' ? correta : null,
        tempoMs, competencias:eventos.competencias(q), estadoRevisao });
      const gravado = await eventos.registrar(api.postgrest, dadosEvento);
      if (!gravado.ok) throw new Error('Não foi possível registrar o evento de aprendizagem.');
    };
    const eventosDaOperacao = async (linha, dados, tentativaNova) => {
      if (!dados.operacao) return;
      if (dados.acao === 'responder') {
        const qid = dados.questaoId;
        const tempo = Number.isSafeInteger(dados.tempo_resposta_ms) && dados.tempo_resposta_ms >= 0 && dados.tempo_resposta_ms <= 3600000 ? dados.tempo_resposta_ms : null;
        for (const tipo of ['quiz_answer_submitted','quiz_answer_evaluated']) await gravarEvento(linha,tipo,qid,eventos.idempotente(dados.operacao,tipo,qid),tipo==='quiz_answer_submitted'?tempo:null);
        const q = banco.questaoDoCurso(curso,qid);
        if (linha.estado.respostas[qid] !== q.gabarito) await gravarEvento(linha,'quiz_question_flagged_for_review',qid,eventos.idempotente(dados.operacao,'quiz_question_flagged_for_review',qid));
        await gravarEvento(linha,'quiz_competency_progress_updated',qid,eventos.idempotente(dados.operacao,'quiz_competency_progress_updated',qid));
        if (linha.estado.modalidade === 'estudo') await gravarEvento(linha,'quiz_explanation_viewed',qid,eventos.idempotente(dados.operacao,'quiz_explanation_viewed',qid));
      }
    };
    if (req.method === 'POST' && dados.acao === 'evento') {
      const ev = dados.evento || {};
      if (!eventos.UUID.test(ev.id || '') || !['quiz_question_presented','quiz_explanation_viewed'].includes(ev.tipo) ||
          typeof ev.questao_id !== 'string' || !/^aqz-hiper-\d{3}$/.test(ev.questao_id) ||
          (ev.tempo_resposta_ms != null && (!Number.isSafeInteger(ev.tempo_resposta_ms) || ev.tempo_resposta_ms < 0 || ev.tempo_resposta_ms > 3600000))) {
        return responder(400,{ok:false,erro:'Evento inválido.'});
      }
      if (!UUID.test(ev.tentativa_id || '')) return responder(400,{ok:false,erro:'Tentativa inválida.'});
      const [linha] = await consultar('&id=eq.' + ev.tentativa_id + '&limit=1');
      if (!linha) return responder(404,{ok:false,erro:'Tentativa indisponível.'});
      try { await gravarEvento(linha,ev.tipo,ev.questao_id,ev.id,ev.tempo_resposta_ms ?? null); }
      catch { return responder(400,{ok:false,erro:'Evento incompatível com o estado da tentativa.'}); }
      return responder(200,{ok:true});
    }
    if (req.method === 'GET' && query.historico === '1') {
      const offset = Number(query.offset || 0);
      if (!Number.isSafeInteger(offset) || offset < 0) return responder(400, { erro: 'Página inválida.' });
      const linhas = await consultar(ordem + '&limit=26&offset=' + offset);
      return responder(200, { ok: true, tentativas: linhas.slice(0, 25).map(linha => quiz.resumo(linha.estado)), mais: linhas.length > 25 });
    }
    if (req.method === 'GET' && query.tentativa !== undefined) {
      if (typeof query.tentativa !== 'string' || !UUID.test(query.tentativa)) return responder(400, { erro: 'Tentativa inválida.' });
      const [linha] = await consultar('&id=eq.' + query.tentativa + '&limit=1');
      if (!linha) return responder(404, { erro: 'Tentativa indisponível.' });
      return responder(200, { ok: true, tentativa: versao(linha) });
    }

    const [atual] = await consultar(ordem + '&limit=1');
    if (req.method === 'GET') return responder(200, { ok: true, tentativa: versao(atual), tamanhos: quiz.quantidadesDisponiveis });

    if (typeof dados.operacao !== 'string' || !UUID.test(dados.operacao)) {
      return responder(400, { erro: 'Operação inválida.' });
    }
    if (atual?.ultima_operacao === dados.operacao) {
      await eventosDaOperacao(atual,dados,dados.acao === 'iniciar');
      return responder(200, { ok: true, tentativa: versao(atual) });
    }
    if ((atual?.id || null) !== dados.tentativa || (atual?.revisao || 0) !== dados.revisao) {
      return responder(409, { erro: 'A tentativa mudou. Atualize para continuar.' });
    }

    const nova = dados.acao === 'iniciar';
    let estado;
    try {
      if (!nova && !atual) return responder(400, { erro: 'Inicie uma tentativa.' });
      estado = nova ? quiz.iniciar(dados.operacao, dados.modalidade, dados.quantidade, await carregarHistoricoDeQuestoes())
        : quiz.transicao(atual.estado, dados);
    } catch (erro) {
      return responder(400, { erro: erro.message });
    }
    const salvo = await api.postgrest('/rpc/agoraquiz_gravar_curso', {
      metodo: 'POST', servico: true, corpo: {
        p_usuario: perfil.id, p_curso: curso, p_id: estado.id, p_anterior: atual?.id || null,
        p_revisao: atual?.revisao || 0, p_operacao: dados.operacao, p_nova: nova,
        p_estado: estado, p_erros: quiz.erros(estado, dados)
      }
    });
    if (salvo.dados?.code === '40001') return responder(409, { erro: 'A tentativa mudou. Atualize para continuar.' });
    if (!salvo.ok || !salvo.dados?.estado) throw new Error('Gravação indisponível.');
    await eventosDaOperacao(salvo.dados,dados,nova);
    return responder(200, { ok: true, tentativa: versao(salvo.dados) });
  } catch {
    return responder(503, { erro: 'Não foi possível acessar ou salvar a avaliação. Tente novamente.' });
  }
};
