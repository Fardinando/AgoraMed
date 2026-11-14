'use strict';

const api = require('../api');
const { UUID } = require('../curso-edicao');
const banco = require('../agoraquiz/bancos');
const quiz = require('../agoraquiz/curso');

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
    const ordem = '&order=criado_em.desc,id.desc';
    const versao = linha => linha ? { ...quiz.visivel(linha.estado), revisao: linha.revisao } : null;
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
    if (req.method === 'GET') return responder(200, { ok: true, tentativa: versao(atual), tamanhos: banco.tamanhos });

    if (typeof dados.operacao !== 'string' || !UUID.test(dados.operacao)) {
      return responder(400, { erro: 'Operação inválida.' });
    }
    if (atual?.ultima_operacao === dados.operacao) return responder(200, { ok: true, tentativa: versao(atual) });
    if ((atual?.id || null) !== dados.tentativa || (atual?.revisao || 0) !== dados.revisao) {
      return responder(409, { erro: 'A tentativa mudou. Atualize para continuar.' });
    }

    const nova = dados.acao === 'iniciar';
    let estado;
    try {
      if (!nova && !atual) return responder(400, { erro: 'Inicie uma tentativa.' });
      estado = nova ? quiz.iniciar(dados.operacao, dados.modalidade, dados.quantidade)
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
    return responder(200, { ok: true, tentativa: versao(salvo.dados) });
  } catch {
    return responder(503, { erro: 'Não foi possível acessar ou salvar a avaliação. Tente novamente.' });
  }
};
