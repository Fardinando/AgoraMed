'use strict';

const primeiroBloco = require('./hipercalemia-bloco-01-v1.json');
const segundoBloco = require('./hipercalemia-bloco-02-v1.json');
const terceiroBloco = require('./hipercalemia-bloco-03-v1.json');
const quartoBloco = require('./hipercalemia-bloco-04-v1.json');
const quintoBloco = require('./hipercalemia-bloco-05-v1.json');
const sextoBloco = require('./hipercalemia-bloco-06-v1.json');
const setimoBloco = require('./hipercalemia-bloco-07-v1.json');
const oitavoBloco = require('./hipercalemia-bloco-08-v1.json');
const nonoBloco = require('./hipercalemia-bloco-09-v1.json');
const decimoBloco = require('./hipercalemia-bloco-10-v1.json');
const undecimoBloco = require('./hipercalemia-bloco-11-v1.json');
const duodecimoBloco = require('./hipercalemia-bloco-12-v1.json');
const decimoTerceiroBloco = require('./hipercalemia-bloco-13-v1.json');
const decimoQuartoBloco = require('./hipercalemia-bloco-14-v1.json');
const decimoQuintoBloco = require('./hipercalemia-bloco-15-v1.json');
const decimoSextoBloco = require('./hipercalemia-bloco-16-v1.json');
const decimoSetimoBloco = require('./hipercalemia-bloco-17-v1.json');
const decimoOitavoBloco = require('./hipercalemia-bloco-18-v1.json');
const decimoNonoBloco = require('./hipercalemia-bloco-19-v1.json');
const vigesimoBloco = require('./hipercalemia-bloco-20-v1.json');
const cursoId = primeiroBloco.cursoId;
const questoes = new Map();
const blocos = [
  primeiroBloco, segundoBloco, terceiroBloco, quartoBloco, quintoBloco,
  sextoBloco, setimoBloco, oitavoBloco, nonoBloco, decimoBloco, undecimoBloco, duodecimoBloco,
  decimoTerceiroBloco, decimoQuartoBloco, decimoQuintoBloco, decimoSextoBloco,
  decimoSetimoBloco, decimoOitavoBloco, decimoNonoBloco, vigesimoBloco
];

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
