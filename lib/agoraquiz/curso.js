'use strict';

const banco = require('./bancos');
const letras = ['A', 'B', 'C', 'D'];
const quantidadesDisponiveis = [5, 10, 15, 20];

function selecionarIds(quantidade, historico = []) {
  const usos = new Map(banco.ids.map(id => [id, 0]));
  for (const tentativa of historico) {
    const vistos = new Set((tentativa?.questoes || []).map(ref => ref.id));
    for (const id of vistos) if (usos.has(id)) usos.set(id, usos.get(id) + 1);
  }

  const ultimaTentativa = new Set((historico.at(-1)?.questoes || []).map(ref => ref.id));
  const faixas = new Map();
  for (const id of banco.ids) {
    const uso = usos.get(id);
    if (!faixas.has(uso)) faixas.set(uso, []);
    faixas.get(uso).push(id);
  }

  const selecionadas = [];
  for (const uso of [...faixas.keys()].sort((a, b) => a - b)) {
    const faixa = faixas.get(uso);
    const candidatas = faixa.filter(id => !ultimaTentativa.has(id)).concat(faixa.filter(id => ultimaTentativa.has(id)));
    for (const id of candidatas) {
      selecionadas.push(id);
      if (selecionadas.length === quantidade) return selecionadas;
    }
  }
  return selecionadas;
}

function iniciar(id, modalidade, quantidade, historico = []) {
  if (!['estudo', 'simulado'].includes(modalidade) || !quantidadesDisponiveis.includes(quantidade)) {
    throw new Error('Selecione um modo e uma quantidade disponível.');
  }
  return {
    id,
    origem: 'agoraquiz',
    modalidade,
    questoes: selecionarIds(quantidade, historico).map(id => ({ id, versao: banco.questaoDoCurso(banco.cursoId, id).versao })),
    respostas: {},
    iniciadoEm: new Date().toISOString(),
    concluidoEm: null
  };
}

function carregarQuestao(ref) {
  const questao = banco.questaoDoCurso(banco.cursoId, ref.id);
  if (!questao || questao.versao !== ref.versao) throw new Error('Versão da questão indisponível.');
  return questao;
}

function transicao(estado, dados) {
  if (estado.concluidoEm) throw new Error('Esta tentativa já foi finalizada.');
  if (dados.acao === 'finalizar') {
    if (Object.keys(estado.respostas).length !== estado.questoes.length) throw new Error('Responda todas as questões.');
    return { ...estado, concluidoEm: new Date().toISOString() };
  }
  const primeiroSemResposta = estado.questoes.find(ref => !estado.respostas[ref.id]);
  if (dados.acao !== 'responder' || !letras.includes(dados.escolha) ||
      !estado.questoes.some(ref => ref.id === dados.questaoId) ||
      (estado.modalidade === 'estudo' && primeiroSemResposta?.id !== dados.questaoId)) {
    throw new Error('Resposta indisponível para esta questão.');
  }
  return { ...estado, respostas: { ...estado.respostas, [dados.questaoId]: dados.escolha } };
}

function erros(estado, dados) {
  const corrigir = estado.concluidoEm
    ? estado.questoes
    : estado.modalidade === 'estudo' && dados.acao === 'responder'
      ? estado.questoes.filter(ref => ref.id === dados.questaoId) : [];
  return corrigir.flatMap(ref => {
    const questao = carregarQuestao(ref);
    const escolha = estado.respostas[questao.id];
    return escolha === questao.gabarito ? [] : [{
      id: questao.id, numero: questao.numero, escolha, gabarito: questao.gabarito
    }];
  });
}

function referencias(q) {
  return [q.referencias, ...(q.referenciasComplementares || []).map(ref => ref.titulo + '\n' + ref.url)].join('\n\n');
}

function resumo(estado) {
  const total = estado.questoes.length;
  const respondidas = Object.keys(estado.respostas).length;
  const { id, modalidade, iniciadoEm, concluidoEm } = estado;
  const dados = { id, modalidade, iniciadoEm, concluidoEm, total, respondidas };
  if (!concluidoEm) return dados;
  const acertos = estado.questoes.filter(ref => carregarQuestao(ref).gabarito === estado.respostas[ref.id]).length;
  return { ...dados, acertos, erros: total - acertos, percentual: Math.round(acertos * 100 / total) };
}

function visivel(estado) {
  const questoes = estado.questoes.map(ref => {
    const q = carregarQuestao(ref);
    const escolha = estado.respostas[q.id] || null;
    const publico = { id: q.id, enunciado: q.enunciado, alternativas: q.alternativas, escolha };
    if (!estado.concluidoEm && !(estado.modalidade === 'estudo' && escolha)) return publico;
    return {
      ...publico, titulo: q.titulo, competencia: q.competenciaPrincipal, gabarito: q.gabarito,
      raciocinioClinico: q.raciocinioClinico, comentarios: q.comentarios, perola: q.perola,
      referencias: referencias(q),
      aulasRelacionadas: escolha === q.gabarito ? [] : q.aulasRelacionadas
    };
  });
  return { ...resumo(estado), questoes };
}

module.exports = { iniciar, transicao, erros, resumo, visivel, referencias, quantidadesDisponiveis };
