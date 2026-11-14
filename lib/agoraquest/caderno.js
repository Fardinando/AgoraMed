'use strict';
/* Domínio do Caderno de Erros: estados, indicadores, agrupamento e visão de
   revisão. A gravação e a transição de estados acontecem no banco (RPC), para
   serem atômicas e imunes a duas abas abertas. */

const ESTADOS = ['precisa_revisar', 'em_revisao', 'dominada'];
const ROTULOS = {
  precisa_revisar: 'Precisa revisar',
  em_revisao: 'Em revisão',
  dominada: 'Dominada'
};
const DOMINIO_ACERTOS_PADRAO = 2;

function dominioAcertos(valor) {
  const n = Number.parseInt(valor, 10);
  return Number.isInteger(n) && n > 0 ? n : DOMINIO_ACERTOS_PADRAO;
}
function estadoValido(estado) { return ESTADOS.includes(estado); }
function rotulo(estado) { return ROTULOS[estado] || ROTULOS.precisa_revisar; }

function questaoId(slug, numero) {
  return String(slug) + '#' + String(numero);
}
function separarId(id) {
  const texto = String(id || '');
  const idAula15 = /^hipercalemia-aq15-q(0[1-5])$/.exec(texto);
  if (idAula15) return { slug: 'hipercalemia-aula-15-v1', numero: Number(idAula15[1]) };
  const idAula16 = /^hipercalemia-aq16-q(0[1-5])$/.exec(texto);
  if (idAula16) return { slug: 'hipercalemia-aula-16-v1', numero: Number(idAula16[1]) };
  const idAula17 = /^hipercalemia-aq17-q(0[1-5])$/.exec(texto);
  if (idAula17) return { slug: 'hipercalemia-aula-17-v1', numero: Number(idAula17[1]) };
  const idAula18 = /^hipercalemia-aq18-q(0[1-5])$/.exec(texto);
  if (idAula18) return { slug: 'hipercalemia-aula-18-v1', numero: Number(idAula18[1]) };
  const idAula19 = /^hipercalemia-aq19-q(0[1-5])$/.exec(texto);
  if (idAula19) return { slug: 'hipercalemia-aula-19-v1', numero: Number(idAula19[1]) };
  const idAula20 = /^hipercalemia-aq20-q(0[1-5])$/.exec(texto);
  if (idAula20) return { slug: 'hipercalemia-aula-20-v1', numero: Number(idAula20[1]) };
  const idAula21 = /^hipercalemia-aq21-q(0[1-5])$/.exec(texto);
  if (idAula21) return { slug: 'hipercalemia-aula-21-v1', numero: Number(idAula21[1]) };
  const idAula22 = /^hipercalemia-aq22-q(0[1-5])$/.exec(texto);
  if (idAula22) return { slug: 'hipercalemia-aula-22-v1', numero: Number(idAula22[1]) };
  const idAula23 = /^hipercalemia-aq23-q(0[1-5])$/.exec(texto);
  if (idAula23) return { slug: 'hipercalemia-aula-23-v1', numero: Number(idAula23[1]) };
  const idAula24 = /^hipercalemia-aq24-q(0[1-5])$/.exec(texto);
  if (idAula24) return { slug: 'hipercalemia-aula-24-v1', numero: Number(idAula24[1]) };
  const idAula25 = /^hipercalemia-aq25-q(0[1-5])$/.exec(texto);
  if (idAula25) return { slug: 'hipercalemia-aula-25-v1', numero: Number(idAula25[1]) };
  const idAula26 = /^hipercalemia-aq26-q(0[1-5])$/.exec(texto);
  if (idAula26) return { slug: 'hipercalemia-aula-26-v1', numero: Number(idAula26[1]) };
  const idAula27 = /^hipercalemia-aq27-q(0[1-5])$/.exec(texto);
  if (idAula27) return { slug: 'hipercalemia-aula-27-v1', numero: Number(idAula27[1]) };
  const idAula28 = /^hipercalemia-aq28-q(0[1-5])$/.exec(texto);
  if (idAula28) return { slug: 'hipercalemia-aula-28-v1', numero: Number(idAula28[1]) };
  const idAula29 = /^hipercalemia-aq29-q(0[1-5])$/.exec(texto);
  if (idAula29) return { slug: 'hipercalemia-aula-29-v1', numero: Number(idAula29[1]) };
  const idAula30 = /^hipercalemia-aq30-q(0[1-5])$/.exec(texto);
  if (idAula30) return { slug: 'hipercalemia-aula-30-v1', numero: Number(idAula30[1]) };
  const idAula31 = /^hipercalemia-aq31-q(0[1-5])$/.exec(texto);
  if (idAula31) return { slug: 'hipercalemia-aula-31-v1', numero: Number(idAula31[1]) };
  const idAula32 = /^hipercalemia-aq32-q(0[1-5])$/.exec(texto);
  if (idAula32) return { slug: 'hipercalemia-aula-32-v1', numero: Number(idAula32[1]) };
  const idAula33 = /^hipercalemia-aq33-q(0[1-5])$/.exec(texto);
  if (idAula33) return { slug: 'hipercalemia-aula-33-v1', numero: Number(idAula33[1]) };
  const idAula34 = /^hipercalemia-aq34-q(0[1-5])$/.exec(texto);
  if (idAula34) return { slug: 'hipercalemia-aula-34-v1', numero: Number(idAula34[1]) };
  const corte = texto.lastIndexOf('#');
  if (corte < 1) return null;
  const numero = Number.parseInt(texto.slice(corte + 1), 10);
  if (!Number.isInteger(numero) || numero < 1) return null;
  return { slug: texto.slice(0, corte), numero };
}

function indicadores(itens) {
  const lista = Array.isArray(itens) ? itens : [];
  const total = lista.length;
  const dominadas = lista.filter((i) => i.estado === 'dominada').length;
  return {
    total,
    precisaRevisar: lista.filter((i) => i.estado === 'precisa_revisar').length,
    emRevisao: lista.filter((i) => i.estado === 'em_revisao').length,
    dominadas,
    percentualDominio: total ? Math.round(dominadas / total * 100) : 0,
    revisoes: lista.reduce((n, i) => n + (Number(i.revisoes) || 0), 0)
  };
}

/* Localização legível a partir do embed do PostgREST:
   aulas(titulo, ordem, modulos(titulo, ordem, curso_id, cursos(id, titulo))) */
function localizacao(row) {
  const aula = row && row.aulas;
  const modulo = aula && aula.modulos;
  const curso = modulo && modulo.cursos;
  return {
    curso: { id: (curso && curso.id) || null, titulo: (curso && curso.titulo) || '' },
    modulo: { id: (modulo && modulo.id) || null, titulo: (modulo && modulo.titulo) || '', ordem: modulo && modulo.ordem },
    aula: { id: (row && row.aula_id) || null, titulo: (aula && aula.titulo) || '', ordem: aula && aula.ordem }
  };
}

function itemPublico(row, conteudo) {
  const q = conteudo && Array.isArray(conteudo.questions) ? conteudo.questions[row.numero - 1] : null;
  if (!q) return null;
  const local = localizacao(row);
  return {
    id: row.id,
    questaoId: row.questao_id,
    slug: row.slug,
    numero: row.numero,
    title: q.title,
    estado: estadoValido(row.estado) ? row.estado : 'precisa_revisar',
    estadoRotulo: rotulo(row.estado),
    erros: Number(row.erros) || 0,
    revisoes: Number(row.revisoes) || 0,
    acertosSeguidos: Number(row.acertos_seguidos) || 0,
    ultimaEscolha: row.ultima_escolha || null,
    ultimoErroEm: row.ultimo_erro_em || null,
    atualizadoEm: row.atualizado_em || null,
    curso: local.curso,
    modulo: local.modulo,
    aula: local.aula
  };
}

function chaveGrupo(prefixo, valor) { return prefixo + ':' + (valor || 'sem-id'); }

/* Agrupa por curso → módulo → aula, mantendo ordem de curso/módulo/aula e número. */
function agrupar(itens) {
  const cursos = new Map();
  for (const item of itens) {
    const ck = chaveGrupo('c', item.curso.id);
    if (!cursos.has(ck)) cursos.set(ck, { id: item.curso.id, titulo: item.curso.titulo || 'Curso', modulos: new Map() });
    const curso = cursos.get(ck);
    const mk = chaveGrupo('m', item.modulo.id);
    if (!curso.modulos.has(mk)) curso.modulos.set(mk, { id: item.modulo.id, titulo: item.modulo.titulo || 'Módulo', ordem: item.modulo.ordem || 0, aulas: new Map() });
    const modulo = curso.modulos.get(mk);
    const ak = chaveGrupo('a', item.aula.id);
    if (!modulo.aulas.has(ak)) modulo.aulas.set(ak, { id: item.aula.id, titulo: item.aula.titulo || 'Aula', ordem: item.aula.ordem || 0, itens: [] });
    modulo.aulas.get(ak).itens.push(item);
  }
  return [...cursos.values()].map((c) => ({
    id: c.id,
    titulo: c.titulo,
    modulos: [...c.modulos.values()]
      .sort((a, b) => a.ordem - b.ordem || a.titulo.localeCompare(b.titulo, 'pt-BR'))
      .map((m) => ({
        id: m.id,
        titulo: m.titulo,
        aulas: [...m.aulas.values()]
          .sort((a, b) => a.ordem - b.ordem || a.titulo.localeCompare(b.titulo, 'pt-BR'))
          .map((a) => ({ id: a.id, titulo: a.titulo, itens: a.itens.sort((x, y) => x.numero - y.numero) }))
      }))
  })).sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));
}

/* Lista pública: itens válidos, agrupados e com indicadores recalculados. */
function montarLista(rows, conteudos) {
  const itens = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    const conteudo = typeof conteudos === 'function' ? conteudos(row.slug) : (conteudos && conteudos[row.slug]);
    const item = itemPublico(row, conteudo);
    if (item) itens.push(item);
  }
  return { itens, indicadores: indicadores(itens), grupos: agrupar(itens) };
}

/* Visão de revisão: nunca inclui gabarito, feedback ou pérola antes da resposta. */
function revisaoView(row, conteudo) {
  const item = itemPublico(row, conteudo);
  if (!item) return null;
  const q = conteudo.questions[item.numero - 1];
  return {
    ...item,
    ...(q.competency ? { competency: q.competency } : {}),
    stem: q.stem,
    ...(q.table ? { table: q.table } : {}),
    ...(q.stemAfter ? { stemAfter: q.stemAfter } : {}),
    choices: q.choices,
    dominioAcertos: dominioAcertos()
  };
}

function tabelaExplicacao(q) {
  return q.explanationTable ? { explanationTable: q.explanationTable, explanationAfter: q.explanationAfter } : {};
}

/* Resultado da revisão, calculado no servidor com o gabarito do conteúdo. */
function resultadoRevisao(row, conteudo, escolha) {
  const item = itemPublico(row, conteudo);
  if (!item) return null;
  const q = conteudo.questions[item.numero - 1];
  const correta = q && conteudo.key ? conteudo.key[item.numero - 1] : null;
  if (!correta) return null;
  return {
    questaoId: item.questaoId,
    numero: item.numero,
    escolha,
    correta: escolha === correta,
    correctChoice: correta,
    feedback: q.feedback,
    correctExplanation: q.correctExplanation,
    ...tabelaExplicacao(q),
    pearl: q.pearl,
    reference: q.reference || conteudo.references
  };
}

module.exports = {
  ESTADOS,
  ROTULOS,
  DOMINIO_ACERTOS_PADRAO,
  dominioAcertos,
  rotulo,
  questaoId,
  separarId,
  indicadores,
  agrupar,
  montarLista,
  itemPublico,
  revisaoView,
  resultadoRevisao,
  tabelaExplicacao
};
