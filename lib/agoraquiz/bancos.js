'use strict';

const primeiroBloco = require('./hipercalemia-bloco-01-v1.json');
const segundoBloco = require('./hipercalemia-bloco-02-v1.json');
const cursoId = primeiroBloco.cursoId;
const questoes = new Map();
const blocos = [primeiroBloco, segundoBloco];

for (const bloco of blocos) {
  for (const questao of bloco.questoes) {
    if (questoes.has(questao.id)) throw new Error('ID de questão duplicado: ' + questao.id);
    questoes.set(questao.id, questao);
  }
}

function questaoDoCurso(id, questaoId) {
  return id === cursoId ? questoes.get(questaoId) || null : null;
}

const tamanhos = blocos.map((_, indice) =>
  blocos.slice(0, indice + 1).reduce((total, bloco) => total + bloco.questoes.length, 0));

module.exports = { cursoId, questaoDoCurso, tamanhos, ids: [...questoes.keys()] };
