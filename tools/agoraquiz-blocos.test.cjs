const { test } = require('node:test');
const assert = require('node:assert/strict');
const banco = require('../lib/agoraquiz/bancos');

const esperados = {
  1: { gabaritos: 'CBDAD' },
  2: { gabaritos: 'BD CDB'.replaceAll(' ', '') },
  3: { gabaritos: 'CADCD', raciocinios: [7,10,12,11,12] },
  4: { gabaritos: 'BCADB', raciocinios: [12,12,12,14,14] },
  5: { gabaritos: 'CBDAC', raciocinios: [12,13,14,12,14] },
  6: { gabaritos: 'CBDCD', raciocinios: [12,13,14,13,15] },
  7: { gabaritos: 'CBCBD', raciocinios: [12,13,14,14,15] },
  8: { gabaritos: 'ACBDA', raciocinios: [13,14,14,13,14] },
  9: { gabaritos: 'CBDBC', raciocinios: [12,14,14,14,14] },
  10: { gabaritos: 'DCBDA', raciocinios: [14,14,14,14,15] },
  11: { gabaritos: 'BDACD', raciocinios: [12,14,14,14,15] },
  12: { gabaritos: 'CBADC', raciocinios: [14,14,14,15,14] },
  13: { gabaritos: 'BCDAC', raciocinios: [14,14,14,14,15] },
  14: { gabaritos: 'BDACB', raciocinios: [14,14,14,14,14] },
  15: { gabaritos: 'BDCBD', raciocinios: [14,14,14,14,14] },
  16: { gabaritos: 'CBDAC', raciocinios: [14,14,14,14,14] },
  17: { gabaritos: 'CBDBD', raciocinios: [14,14,14,14,14] },
  18: { gabaritos: 'CADCD', raciocinios: [14,14,14,14,14] },
  19: { gabaritos: 'CBCBD', raciocinios: [14,14,14,14,14] },
  20: { gabaritos: 'CBDCD', raciocinios: [14,14,14,14,14] },
};

test('AgoraQuiz reúne vinte blocos em sequência sem IDs duplicados', () => {
  assert.deepEqual(banco.tamanhos, [5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90,95,100]);
  assert.equal(banco.ids.length, 100);
  assert.equal(new Set(banco.ids).size, 100);
  assert.deepEqual(banco.ids, Array.from({ length: 100 }, (_, i) => `aqz-hiper-${String(i + 1).padStart(3, '0')}`));
});

test('cada bloco preserva gabaritos, raciocínio, quatro comentários e vínculos reais de aula', () => {
  for (let bloco = 1; bloco <= 20; bloco++) {
    const dados = require(`../lib/agoraquiz/hipercalemia-bloco-${String(bloco).padStart(2, '0')}-v1.json`);
    const qs = dados.questoes;
    assert.equal(qs.length, 5, `bloco ${bloco}`);
    assert.equal(qs.map(q => q.gabarito).join(''), esperados[bloco].gabaritos, `gabaritos do bloco ${bloco}`);
    if (esperados[bloco].raciocinios) {
      assert.deepEqual(qs.map(q => (q.raciocinioClinico.match(/^\*\*\d+\./gm) || []).length), esperados[bloco].raciocinios);
    }
    for (const q of qs) {
      assert.equal(q.id, `aqz-hiper-${String(q.numero).padStart(3, '0')}`);
      assert.deepEqual(Object.keys(q.alternativas), ['A','B','C','D']);
      assert.deepEqual(Object.keys(q.comentarios), ['A','B','C','D']);
      assert.ok(q.enunciado.trim() && q.raciocinioClinico.trim() && q.perola.trim() && q.referencias.trim());
      assert.ok(q.competenciaPrincipal && q.dificuldade && q.statusEditorial && q.versao);
      assert.ok(Array.isArray(q.aulasRelacionadas), `aulas inválidas: ${q.id}`);
      if (bloco >= 11) {
        assert.ok(Array.isArray(q.options) && q.options.length === 4, `microdados de alternativas: ${q.id}`);
        assert.ok(Array.isArray(q.reasoning_steps) && q.reasoning_steps.length > 0, `microdados de raciocínio: ${q.id}`);
        assert.equal(q.options.map(o => o.letter).join(''), 'ABCD');
        assert.ok(q.options.every(o => o.question_id === q.id && o.text.trim() && o.feedback.trim() && o.competency_ids.length));
        assert.ok(q.reasoning_steps.every((step, i) => step.question_id === q.id && step.sequence === i + 1 && step.prompt && step.explanation && step.reasoning_type && step.competency_ids.length));
      }
      if (bloco >= 13) {
        assert.ok(q.options.every(o => o.is_correct ? o.error_type === null && o.misconception_id === null : o.error_type && o.misconception_id && o.misconception_description && o.clinical_risk_if_applied));
        assert.ok(q.reasoning_steps.every(step => step.clinical_relevance && step.prerequisite_concepts.length));
        assert.equal(q.metadata.secondary_competencies.length, 5);
      }
      for (const aula of q.aulasRelacionadas) {
        assert.match(aula.aulaId, /^[a-f0-9-]{36}$/);
        assert.match(aula.moduloId, /^[a-f0-9-]{36}$/);
        assert.equal(aula.numero >= 1 && aula.numero <= 34, true);
      }
      assert.equal(banco.questaoDoCurso(banco.cursoId, q.id), q);
    }
  }
});

test('pendências científicas dos prompts ficam registradas sem alterar o conteúdo aprovado', () => {
  for (const numero of [15,20,43]) {
    const q = banco.questaoDoCurso(banco.cursoId, `aqz-hiper-${String(numero).padStart(3, '0')}`);
    assert.equal(q.revisaoCientificaPendente, true);
    assert.ok(q.observacaoCientificaEditorial);
  }
});

test('blocos 11 e 12 preservam gabaritos e estados de revisão científica', () => {
  for (const [numero, revisao] of [[52,false],[57,false],[59,false],[51,false],[53,false],[56,false],[60,false]]) {
    const q = banco.questaoDoCurso(banco.cursoId, `aqz-hiper-${String(numero).padStart(3, '0')}`);
    assert.equal(q.metadata.scientific_review_required, revisao);
    assert.equal(q.metadata.editorial_status, revisao ? 'pending_scientific_review' : 'approved');
    assert.ok(q.metadata.related_lesson_ids.every(id => q.aulasRelacionadas.some(a => a.aulaId === id)));
    for (const letter of 'ABCD') assert.ok(!q.alternativas[letter].includes('GABARITO:'), `${q.id}-${letter} inclui marcador de gabarito`);
  }
  assert.equal(banco.ids.filter(id => Number(id.slice(-3)) >= 51 && Number(id.slice(-3)) <= 60).length, 10);
});

test('questão 052 aplica ajuste seguro do MRA e documenta diretrizes atuais', () => {
  const q = banco.questaoDoCurso(banco.cursoId, 'aqz-hiper-052');
  assert.equal(q.gabarito, 'D');
  assert.equal(q.options.find(o => o.letter === 'D').text, q.alternativas.D);
  assert.match(q.alternativas.D, /reduzir pela metade a dose da espironolactona/);
  assert.match(q.alternativas.D, /suspensão temporária/);
  assert.match(q.alternativas.D, /reintroduzi-lo quando o potássio normalizar/);
  assert.match(q.alternativas.D, /manter K <5,5 mEq\/L/);
  assert.match(q.referencias, /2026 ESC Guidelines/);
  assert.match(q.referencias, /UK Kidney Association/);
  assert.match(q.metadata.scientific_review_notes, /Revisão científica\/editorial concluída/);
  assert.equal(q.metadata.scientific_review_required, false);
  for (const step of q.reasoning_steps) assert.ok(!step.explanation.includes(step.prompt), `repetição na etapa ${step.sequence}`);
});

test('questão 057 mantém a ATR tipo 4 como hipótese e corrige as ressalvas do AG e da cetoacidose', () => {
  const q = banco.questaoDoCurso(banco.cursoId, 'aqz-hiper-057');
  assert.equal(q.gabarito, 'B');
  assert.equal(q.titulo, 'Hipercalemia e acidose no diabetes: quando considerar ATR tipo 4?');
  assert.match(q.enunciado, /eGFR: não informada/);
  assert.match(q.enunciado, /albumina sérica não foi fornecida/);
  assert.match(q.enunciado, /sem tomar o ânion gap não corrigido/);
  assert.match(q.comentarios.A, /não exclui cetoacidose euglicêmica/);
  assert.match(q.alternativas.B, /é uma hipótese a considerar/);
  assert.match(q.comentarios.B, /não a confirma/);
  assert.match(q.referencias, /3394721/);
  assert.match(q.referencias, /199811000-00019/);
  assert.equal(q.metadata.scientific_review_required, false);
  assert.equal(q.metadata.editorial_status, 'approved');
});
