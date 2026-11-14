const { test } = require('node:test');
const assert = require('node:assert/strict');
const banco = require('../lib/agoraquiz/hipercalemia-bloco-02-v1.json');
const { questaoDoCurso, ids: idsQuestoes } = require('../lib/agoraquiz/bancos');

test('Bloco 02: cinco IDs estáveis, gabaritos e feedback completo por questão', () => {
  assert.deepEqual(banco.questoes.map(q => q.id),
    ['aqz-hiper-006','aqz-hiper-007','aqz-hiper-008','aqz-hiper-009','aqz-hiper-010']);
  assert.deepEqual(banco.questoes.map(q => q.gabarito), ['B','D','C','D','B']);
  assert.deepEqual(banco.questoes.map(q => q.raciocinioClinico.match(/^\*\*\d+\./gm).length), [9,11,12,11,12]);
  for (const q of banco.questoes) {
    assert.deepEqual(Object.keys(q.alternativas), ['A','B','C','D']);
    assert.deepEqual(Object.keys(q.comentarios), ['A','B','C','D']);
    assert.ok([q.enunciado, q.referencias, q.perola, ...Object.values(q.alternativas), ...Object.values(q.comentarios)].every(s => s.trim()));
    assert.equal(questaoDoCurso(banco.cursoId, q.id), q);
    assert.equal(questaoDoCurso('outro-curso', q.id), null);
  }
  assert.equal(questaoDoCurso(banco.cursoId, 'aqz-hiper-061').gabarito, 'B');
});

test('as aulas editoriais não são chaves de sessão ou identificadores da questão', () => {
  const links = banco.questoes.map(q => q.aulasRelacionadas.map(a => a.numero));
  assert.deepEqual(links, [[8,9,10],[9,10,11,12,22],[6,7,8,9,10],[8,9,10],[11,12,13,22]]);
  const ids = new Map();
  for (const a of banco.questoes.flatMap(q => q.aulasRelacionadas)) {
    for (const id of [a.moduloId, a.aulaId]) assert.match(id, /^[a-f0-9-]{36}$/);
    if (ids.has(a.numero)) assert.equal(ids.get(a.numero), a.aulaId);
    ids.set(a.numero, a.aulaId);
  }
  assert.equal(new Set(ids.values()).size, ids.size);
});

const { randomUUID } = require('node:crypto');
const quiz = require('../lib/agoraquiz/curso');
const { criarBanco, ids } = require('./helpers/banco-curso.cjs');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

test('Estudo e Simulado corrigem no momento apropriado e preservam o tamanho da sessão', () => {
  const bloco01 = require('../lib/agoraquiz/hipercalemia-bloco-01-v1.json');
  assert.deepEqual(bloco01.questoes.map(q => q.gabarito), ['C','B','D','A','D']);
  assert.deepEqual(quiz.quantidadesDisponiveis, [5,10,15,20]);
  for (const quantidade of [25,50,100]) assert.throws(() => quiz.iniciar(randomUUID(), 'simulado', quantidade));
  for (const quantidade of quiz.quantidadesDisponiveis) {
    assert.equal(quiz.iniciar(randomUUID(), 'simulado', quantidade).questoes.length, quantidade);
  }
  const sessaoCompleta = quiz.iniciar(randomUUID(), 'estudo', 20);
  assert.equal(sessaoCompleta.questoes.length, 20);
  const estudo = quiz.iniciar(randomUUID(), 'estudo', 5);
  const resposta = { acao: 'responder', questaoId: 'aqz-hiper-001', escolha: 'A' };
  assert.throws(() => quiz.transicao(estudo, { ...resposta, questaoId: 'aqz-hiper-002' }));
  const confirmado = quiz.transicao(estudo, resposta);
  assert.equal(quiz.visivel(confirmado).questoes[0].gabarito, 'C');
  assert.deepEqual(Object.keys(quiz.visivel(confirmado).questoes[1]), ['id','enunciado','alternativas','escolha']);
  assert.equal(quiz.erros(confirmado, resposta).length, 1);
  assert.throws(() => quiz.transicao(confirmado, { ...resposta, escolha: 'C' }));

  let simulado = quiz.iniciar(randomUUID(), 'simulado', 10);
  assert.equal(new Set(simulado.questoes.map(q => q.id)).size, 10);
  assert.throws(() => quiz.transicao(simulado, { acao: 'finalizar' }));
  simulado = quiz.transicao(simulado, resposta);
  assert.deepEqual(quiz.erros(simulado, resposta), []);
  assert.deepEqual(Object.keys(quiz.visivel(simulado).questoes[0]), ['id','enunciado','alternativas','escolha']);
  assert.equal(quiz.visivel(simulado).acertos, undefined);
  for (const ref of [...simulado.questoes].reverse()) {
    simulado = quiz.transicao(simulado, { ...resposta, questaoId: ref.id, escolha: questaoDoCurso(banco.cursoId, ref.id).gabarito });
  }
  const final = quiz.transicao(simulado, { acao: 'finalizar' });
  assert.equal(quiz.visivel(final).percentual, 100);
  assert.deepEqual(quiz.erros(final, {}), []);
  assert.throws(() => quiz.transicao(final, resposta));
});

test('novas tentativas priorizam questões inéditas e evitam a tentativa mais recente', () => {
  const primeira = quiz.iniciar(randomUUID(), 'estudo', 20);
  const segunda = quiz.iniciar(randomUUID(), 'simulado', 20, [primeira]);
  assert.deepEqual(segunda.questoes.map(q => q.id), idsQuestoes.slice(20, 40));

  const bancoCompleto = { questoes: idsQuestoes.map(id => ({ id })) };
  const ultima = { questoes: idsQuestoes.slice(80).map(id => ({ id })) };
  const depoisDeUmaVolta = quiz.iniciar(randomUUID(), 'estudo', 20, [bancoCompleto, ultima]);
  assert.deepEqual(depoisDeUmaVolta.questoes.map(q => q.id), idsQuestoes.slice(0, 20));
  assert.ok(depoisDeUmaVolta.questoes.every(q => !ultima.questoes.some(ref => ref.id === q.id)));
});

test('transação do curso mantém histórico, isola donos e deduplica os erros no Caderno existente', async () => {
  const db = await criarBanco();
  const carregar = nome => readFileSync(join(__dirname, '../supabase/migrations', nome), 'utf8');
  try {
    for (const nome of ['20261031025300_agoraquiz_tentativas_e_conclusao.sql',
      '20261111233000_agoraquest_hipercalemia_aula_01.sql',
      '20261112120000_agoraquest_aula_02_e_caderno_erros.sql',
      '20261114053215_agoraquiz_curso_hipercalemia.sql', '20261114062059_agoraquiz_eventos_aprendizado.sql']) await db.exec(carregar(nome));
    await db.query('insert into public.cursos(id,titulo) values($1,$2)', [banco.cursoId, 'Hipercalemia']);
    assert.equal((await db.query("select has_function_privilege('authenticated','public.agoraquiz_gravar_curso(uuid,uuid,uuid,uuid,integer,uuid,boolean,jsonb,jsonb)','execute') as permitido")).rows[0].permitido, false);
    assert.equal((await db.query("select has_function_privilege('authenticated','public.agoraquiz_registrar_evento(uuid,uuid,uuid,uuid,text,integer,text,text,text,boolean,integer,text[],text,timestamptz)','execute') as permitido")).rows[0].permitido, false);
    await db.exec('set role authenticated');
    await assert.rejects(db.query('select * from public.agoraquiz_tentativas'), /permission denied/);
    await db.exec('reset role');

    const iniciar = quiz.iniciar(randomUUID(), 'estudo', 5);
    const gravar = (estado, { usuario = ids.aluno, anterior = null, revisao = 0, operacao = estado.id, nova = true, erros = [] } = {}) =>
      db.query('select public.agoraquiz_gravar_curso($1,$2,$3,$4,$5,$6,$7,$8,$9) as tentativa',
        [usuario,banco.cursoId,estado.id,anterior,revisao,operacao,nova,JSON.stringify(estado),JSON.stringify(erros)]);
    await gravar(iniciar);
    const resposta = { acao: 'responder', questaoId: 'aqz-hiper-001', escolha: 'A' };
    const estado = quiz.transicao(iniciar, resposta);
    const args = { anterior: iniciar.id, revisao: 1, operacao: randomUUID(), nova: false, erros: quiz.erros(estado, resposta) };
    await assert.rejects(gravar(estado, { ...args, usuario: ids.admin }), e => e.code === '40001');
    await assert.rejects(gravar(estado, { ...args, erros: [{ ...args.erros[0], escolha: 'X' }] }));
    assert.equal((await db.query('select revisao from public.agoraquiz_tentativas where id=$1', [iniciar.id])).rows[0].revisao, 1);
    await gravar(estado, args);
    await gravar(estado, args);
    const eventId=randomUUID();
    const registrarEvento=()=>db.query('select public.agoraquiz_registrar_evento($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) as inserido',
      [eventId,ids.aluno,banco.cursoId,iniciar.id,'aqz-hiper-001',1,'quiz_answer_evaluated','estudo','A',false,12000,['hyperkalemia'], 'precisa_revisar',new Date().toISOString()]);
    assert.equal((await registrarEvento()).rows[0].inserido,true);
    assert.equal((await registrarEvento()).rows[0].inserido,false);
    assert.equal((await db.query('select count(*)::int as total from public.agoraquiz_eventos where id=$1',[eventId])).rows[0].total,1);
    await assert.rejects(gravar(estado, { ...args, operacao: randomUUID() }), e => e.code === '40001');
    const [evento] = (await db.query('select tentativa_id, alternativa_correta from public.agoraquest_caderno_eventos')).rows;
    assert.deepEqual(evento, { tentativa_id: iniciar.id, alternativa_correta: 'C' });
    assert.equal((await db.query('select count(*)::int as total from public.agoraquest_caderno_eventos')).rows[0].total, 1);
    const revisar = async escolha => (await db.query('select public.agoraquiz_revisar_caderno($1,$2,$3,$4,$5,$6) as ficha',
      [ids.aluno,banco.cursoId,resposta.questaoId,escolha,'C',randomUUID()])).rows[0].ficha;
    assert.equal((await revisar('C')).acertos_seguidos, 1);
    assert.equal((await revisar('A')).acertos_seguidos, 0);
    assert.equal((await revisar('C')).estado, 'em_revisao');
    assert.equal((await revisar('C')).estado, 'dominada');

    const segunda = quiz.iniciar(randomUUID(), 'simulado', 10);
    await gravar(segunda, { anterior: iniciar.id, revisao: 2 });
    assert.equal((await db.query('select count(*)::int as total from public.agoraquiz_tentativas where aula_id is null')).rows[0].total, 2);
    assert.equal((await db.query('select count(*)::int as total from public.progresso')).rows[0].total, 2);
  } finally {
    await db.close();
  }
});
