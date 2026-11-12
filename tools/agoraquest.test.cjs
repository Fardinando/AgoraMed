const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');
const Q = require('../lib/agoraquest');
const { criarBanco, ids } = require('./helpers/banco-curso.cjs');

const MIGRATION = '20261111233000_agoraquest_hipercalemia_aula_01.sql';
const AULA = '44444444-4444-4444-8444-444444444444';

/* Conteúdo aprovado: enunciados e alternativas não podem ser reescritos sem nova revisão. */
const aprovado = [
  {
    title: 'O valor isolado já exige ação?',
    stem: 'Um homem de 62 anos procura a emergência por mal-estar inespecífico. Está consciente, hemodinamicamente estável e sem alterações eletrocardiográficas evidentes. O laboratório informa potássio sérico de 6,9 mEq/L.\n\n**Qual é a conduta mais adequada?**',
    choices: {
      A: 'Como o ECG está normal, repetir o potássio em 24 horas.',
      B: 'Considerar uma emergência hipercalêmica, iniciar monitorização e tratamento imediato, avaliando simultaneamente a possibilidade de pseudohipercalemia.',
      C: 'Aguardar o aparecimento de ondas T apiculadas antes de iniciar o tratamento.',
      D: 'Liberar o paciente após orientação alimentar, pois não apresenta sintomas cardíacos.'
    }
  },
  {
    title: 'O ECG muda a prioridade?',
    stem: 'Uma mulher de 70 anos, com doença renal crônica, apresenta potássio de 6,1 mEq/L. O ECG mostra ondas T apiculadas, achatamento das ondas P e alargamento do QRS, alterações novas em relação ao traçado anterior.\n\n**Qual é a melhor interpretação?**',
    choices: {
      A: 'O potássio está abaixo de 6,5 mEq/L, portanto não há indicação de tratamento imediato.',
      B: 'As alterações só têm importância se o potássio ultrapassar 7,0 mEq/L.',
      C: 'O quadro representa uma emergência hipercalêmica com comprometimento elétrico, exigindo estabilização cardíaca e tratamento imediato.',
      D: 'É necessário repetir o ECG após seis horas antes de definir a conduta.'
    }
  },
  {
    title: 'Bradicardia com potássio elevado',
    stem: 'Um homem de 76 anos, em uso de carvedilol e com piora recente da função renal, apresenta potássio de 5,9 mEq/L, frequência cardíaca de 35 bpm e pressão arterial de 85/50 mmHg.\n\n**Qual é a melhor decisão inicial?**',
    choices: {
      A: 'Desconsiderar a hipercalemia como fator relevante, pois o potássio está abaixo de 6,5 mEq/L.',
      B: 'Reconhecer uma possível emergência associada à hipercalemia, iniciar monitorização, suporte hemodinâmico e tratamento imediato, considerando a possibilidade de síndrome BRASH.',
      C: 'Aguardar o potássio ultrapassar 6,5 mEq/L para iniciar medidas específicas.',
      D: 'Tratar apenas a bradicardia, sem investigar a função renal ou o potássio.'
    }
  },
  {
    title: 'A velocidade de elevação importa?',
    stem: 'Um homem de 45 anos, internado após esmagamento muscular, apresenta lesão renal aguda oligúrica. O potássio passou de 4,4 para 5,8 mEq/L em três horas. O ECG ainda não apresenta alterações características.\n\n**Qual é a melhor conduta?**',
    choices: {
      A: 'Aguardar o potássio ultrapassar 6,5 mEq/L, pois o ECG está normal.',
      B: 'Considerar a elevação pouco relevante porque o paciente não apresenta alterações eletrocardiográficas.',
      C: 'Solicitar uma nova dosagem apenas no dia seguinte, evitando intervenções desnecessárias.',
      D: 'Reconhecer o alto risco de progressão rápida, iniciar monitorização e tratamento urgente, com reavaliações seriadas e planejamento da remoção do potássio.'
    }
  },
  {
    title: 'Quem precisa de tratamento imediato?',
    stem: 'Durante o plantão, você recebe os resultados de quatro pacientes. Qual deles apresenta a situação de menor urgência para redução imediata do potássio, considerando as informações disponíveis?',
    choices: {
      A: 'Paciente com potássio de 6,8 mEq/L, assintomático e ECG sem alterações.',
      B: 'Paciente com potássio de 5,8 mEq/L, bradicardia importante e QRS alargado de início recente.',
      C: 'Paciente com potássio de 5,3 mEq/L, doença renal crônica estável, ECG sem alterações, diurese preservada e valores semelhantes nos últimos meses.',
      D: 'Paciente com potássio de 6,0 mEq/L, lesão renal aguda oligúrica e rabdomiólise em evolução.'
    }
  }
];

test('conteúdo aprovado preserva enunciados, alternativas e gabarito B-C-B-D-C', () => {
  assert.deepEqual(Q.E.KEY, ['B', 'C', 'B', 'D', 'C']);
  assert.equal(Q.content.questions.length, aprovado.length);
  assert.match(Q.content.references, /UpToDate/);
  assert.match(Q.content.references, /Hyperkalemia in adults/);
  Q.content.questions.forEach((q, i) => {
    assert.equal(q.number, i + 1);
    assert.equal(q.title, aprovado[i].title);
    assert.equal(q.stem, aprovado[i].stem);
    assert.deepEqual(q.choices, aprovado[i].choices);
    for (const letra of 'ABCD') assert.ok(q.feedback[letra] && q.feedback[letra].length > 80);
    assert.ok(q.correctExplanation.length > 80);
    assert.ok(q.pearl.length > 20);
  });
});

test('o estado só revela feedback depois da confirmação e bloqueia alteração', () => {
  let s = Q.E.fresh();
  assert.ok(Q.E.valid(s));
  const inicial = Q.visible(s);
  assert.ok(inicial.questions.every((q) => !q.feedback && !q.correctChoice && !q.correctExplanation && !q.pearl));
  assert.equal(inicial.closing, undefined);
  assert.throws(() => Q.transition(s, 'answer', { choice: 'E' }), /Seleção indisponível/);
  assert.throws(() => Q.transition(s, 'next', {}), /Não há comentário/);

  s = Q.transition(s, 'answer', { choice: 'A' });
  const depois = Q.visible(s);
  assert.equal(depois.questions[0].correctChoice, 'B');
  assert.deepEqual(Object.keys(depois.questions[0].feedback), ['A', 'B', 'C', 'D']);
  assert.ok(!depois.questions[1].feedback && !depois.questions[1].correctChoice);
  assert.equal(Q.publicState(s).answers[0].correct, false);
  assert.throws(() => Q.transition(s, 'answer', { choice: 'B' }), /Seleção indisponível/);

  s = Q.transition(s, 'next', {});
  assert.equal(Q.visible(s).questions[0].correctChoice, 'B');
  assert.ok(Q.visible(s).questions[0].feedback);
  assert.ok(!Q.visible(s).questions[1].feedback);
  assert.equal(Q.visible(s).questions[0].pearl, Q.content.questions[0].pearl);
});

test('cinco confirmações concluem a tentativa, calculam a nota e liberam o fechamento', () => {
  let s = Q.E.fresh();
  for (let i = 0; i < 5; i++) {
    s = Q.transition(s, 'answer', { choice: Q.E.KEY[i] });
    s = Q.transition(s, 'next', {});
  }
  assert.ok(s.finishedAt);
  assert.equal(Q.E.score(s), 5);
  const final = Q.visible(s);
  assert.ok(final.closing);
  assert.equal(final.questions[4].correctChoice, 'C');
  assert.equal(Q.publicState(s).score, 5);
  assert.throws(() => Q.transition(s, 'answer', { choice: 'A' }), /já foi concluída/);

  let errado = Q.E.fresh();
  for (let i = 0; i < 5; i++) {
    errado = Q.transition(errado, 'answer', { choice: Q.E.KEY[i] === 'A' ? 'B' : 'A' });
    errado = Q.transition(errado, 'next', {});
  }
  assert.equal(Q.E.score(errado), 0);
  assert.equal(Q.publicState(errado).score, 0);
});

test('caderno de erros agrega tentativas e informa a resposta correta sem expor questões não respondidas', () => {
  let s = Q.E.fresh();
  s = Q.transition(s, 'answer', { choice: 'A' });
  s = Q.transition(s, 'next', {});
  s = Q.transition(s, 'answer', { choice: 'C' });
  s = Q.transition(s, 'next', {});
  const itens = Q.caderno([{ estado: s, criado_em: '2026-11-11T12:00:00.000Z' }]);
  assert.equal(itens.length, 1);
  assert.equal(itens[0].number, 1);
  assert.equal(itens[0].correctChoice, 'B');
  assert.equal(itens[0].errors, 1);
  assert.equal(itens[0].lastWrong, 'A');
  assert.ok(itens[0].correctExplanation.length > 80);
  assert.ok(itens[0].pearl.length > 20);
});

/* ------------------------------------------------------------------ API */
function montarRota({ aulaAtividade = null, semAtividade = false, ...overrides } = {}) {
  const logs = [];
  const tentativas = [];
  const curso = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const modulo = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  let rpcCalls = 0;

  const deps = {
    envFaltando: () => [],
    sessaoPerfil: async () => ({ id: ids.aluno, liberado: true, papel: 'aluno' }),
    podeAcessarCurso: async () => true,
    json: (res, status, body) => { res.status = status; res.body = body; },
    postgrest: async (url, opt) => {
      logs.push({ url, opt });
      if (url.startsWith('/aulas?')) {
        return { ok: true, dados: [{ id: AULA, titulo: 'Aula 01', atividade: aulaAtividade, modulo_id: modulo, modulos: { curso_id: curso, titulo: 'Módulo 1' } }] };
      }
      if (url.startsWith('/agoraquest_atividades?')) {
        return { ok: true, dados: semAtividade ? [] : [{ slug: 'hipercalemia-aula-01-v1', versao_conteudo: 1, titulo: 'Hipercalemia — Aula 01' }] };
      }
      if (url.startsWith('/cursos?')) return { ok: true, dados: [{ titulo: 'Tratamento da Hipercalemia em Adultos' }] };
      if (url.startsWith('/modulos?')) {
        return { ok: true, dados: [{ id: modulo, ordem: 1, aulas: [{ id: AULA, ordem: 1 }, { id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', ordem: 2 }] }] };
      }
      if (url.startsWith('/agoraquest_tentativas?')) {
        if (url.includes('limit=26')) {
          const offset = Number((url.match(/offset=(\d+)/) || [])[1] || 0);
          return { ok: true, dados: tentativas.slice().reverse().slice(offset) };
        }
        if (url.includes('limit=100')) return { ok: true, dados: tentativas.slice().reverse() };
        return { ok: true, dados: tentativas.length ? [tentativas[tentativas.length - 1]] : [] };
      }
      if (url.startsWith('/rpc/agoraquest_gravar')) {
        rpcCalls += 1;
        const b = opt.corpo;
        if (b.p_nova) {
          const ultima = tentativas[tentativas.length - 1] || null;
          if ((b.p_anterior || null) !== (ultima ? ultima.id : null)) return { ok: false, dados: { code: '40001' } };
          const row = { id: b.p_id, revisao: 1, estado: b.p_estado, ultima_operacao: b.p_operacao, criado_em: new Date().toISOString() };
          tentativas.push(row);
          return { ok: true, dados: row };
        }
        const row = tentativas.find((t) => t.id === b.p_id);
        if (!row || row.revisao !== b.p_revisao) return { ok: false, dados: { code: '40001' } };
        row.estado = b.p_estado;
        row.revisao += 1;
        row.ultima_operacao = b.p_operacao;
        return { ok: true, dados: row };
      }
      throw Error('URL não prevista no teste: ' + url);
    },
    ...overrides
  };

  const moduloCarregado = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../lib/rotas/agoraquest.js'), 'utf8'), {
    module: moduloCarregado,
    require: (nome) => {
      if (nome === 'crypto') return require('node:crypto');
      if (nome === '../api') return deps;
      if (nome === '../curso-edicao') return require('../lib/curso-edicao');
      if (nome === '../agoraquest') return Q;
      return require(nome);
    },
    console,
    process,
    setTimeout,
    clearTimeout
  });
  const rota = moduloCarregado.exports;

  return {
    logs,
    get tentativas() { return tentativas; },
    get rpcCalls() { return rpcCalls; },
    async call(body, query = { aula_id: AULA }, method = body ? 'POST' : 'GET') {
      const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; } };
      await rota({ method, body, query }, res);
      return res;
    }
  };
}

test('API exige sessão, matrícula e identificadores válidos antes de ler qualquer tentativa', async () => {
  let h = montarRota({ sessaoPerfil: async () => null });
  assert.equal((await h.call()).status, 401);
  assert.equal(h.logs.length, 0);

  h = montarRota({ podeAcessarCurso: async () => false });
  assert.equal((await h.call()).status, 403);
  assert.ok(!h.logs.some((x) => x.url.startsWith('/agoraquest_tentativas')));

  assert.equal((await montarRota().call(null, { aula_id: 'x&select=*' })).status, 400);
  assert.equal((await montarRota({ semAtividade: true }).call()).status, 404);

  /* A prática é extra: continua disponível mesmo quando a aula já tem outra atividade. */
  assert.equal((await montarRota({ aulaAtividade: 'pre-requisitos-v1' }).call()).status, 200);
});

test('API publica a atividade, não vaza o gabarito e devolve a próxima aula real', async () => {
  const h = montarRota();
  const r = await h.call();
  assert.equal(r.status, 200);
  assert.equal(r.headers['Cache-Control'], 'private, no-store');
  assert.equal(r.body.state, null);
  assert.equal(r.body.revision, 0);
  assert.match(r.body.nextUrl, /a=eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee/);
  assert.ok(r.body.content.questions.every((q) => !q.feedback && !q.correctChoice && !q.correctExplanation && !q.pearl));

  const meta = await h.call(null, { aula_id: AULA, meta: '1' });
  assert.equal(meta.status, 200);
  assert.equal(meta.body.disponivel, true);
  assert.equal(meta.body.slug, 'hipercalemia-aula-01-v1');
  assert.equal(meta.body.content, undefined);
});

test('API inicia, confirma uma alternativa por vez, é idempotente e detecta revisão concorrente', async () => {
  const h = montarRota();
  const operacao = randomUUID();
  let r = await h.call({ aula_id: AULA, action: 'start', operation: operacao, previous: null });
  assert.equal(r.status, 200);
  const id = r.body.state.id;
  let revisao = r.body.revision;
  assert.equal(revisao, 1);
  const chamadas = h.rpcCalls;

  r = await h.call({ aula_id: AULA, action: 'start', operation: operacao, previous: null });
  assert.equal(r.status, 200);
  assert.equal(h.rpcCalls, chamadas);

  r = await h.call({ aula_id: AULA, action: 'answer', choice: 'A', operation: randomUUID(), attempt: id, revision: revisao, score: 5 });
  assert.equal(r.status, 200);
  assert.equal(r.body.state.score, 0);
  assert.equal(r.body.content.questions[0].correctChoice, 'B');
  assert.ok(r.body.content.questions[0].feedback.A);
  assert.ok(!r.body.content.questions[1].feedback);
  revisao = r.body.revision;

  const conflito = await h.call({ aula_id: AULA, action: 'answer', choice: 'B', operation: randomUUID(), attempt: id, revision: 1 });
  assert.equal(conflito.status, 409);
  assert.equal(conflito.body.conflito, true);

  const semOperacao = await h.call({ aula_id: AULA, action: 'next', attempt: id, revision: revisao });
  assert.equal(semOperacao.status, 400);
});

test('API conclui as cinco questões, libera o fechamento e permite nova tentativa', async () => {
  const h = montarRota();
  let r = await h.call({ aula_id: AULA, action: 'start', operation: randomUUID(), previous: null });
  const id = r.body.state.id;
  let revisao = r.body.revision;
  for (let i = 0; i < 5; i++) {
    r = await h.call({ aula_id: AULA, action: 'answer', choice: Q.E.KEY[i], operation: randomUUID(), attempt: id, revision: revisao });
    assert.equal(r.status, 200);
    revisao = r.body.revision;
    r = await h.call({ aula_id: AULA, action: 'next', operation: randomUUID(), attempt: id, revision: revisao });
    assert.equal(r.status, 200);
    revisao = r.body.revision;
  }
  assert.ok(r.body.state.finishedAt);
  assert.equal(r.body.state.score, 5);
  assert.ok(r.body.content.closing);
  assert.equal(h.tentativas.length, 1);

  r = await h.call({ aula_id: AULA, action: 'start', operation: randomUUID(), previous: id });
  assert.equal(r.status, 200);
  assert.equal(r.body.state.answers.length, 0);
  assert.equal(r.body.state.finishedAt, null);
  assert.equal(h.tentativas.length, 2);
});

test('histórico e caderno de erros usam apenas as tentativas do próprio aluno', async () => {
  const h = montarRota();
  let r = await h.call({ aula_id: AULA, action: 'start', operation: randomUUID(), previous: null });
  const id = r.body.state.id;
  r = await h.call({ aula_id: AULA, action: 'answer', choice: 'A', operation: randomUUID(), attempt: id, revision: r.body.revision });
  r = await h.call({ aula_id: AULA, action: 'next', operation: randomUUID(), attempt: id, revision: r.body.revision });
  assert.equal(r.status, 200);

  const historico = await h.call(null, { aula_id: AULA, historico: '1', offset: '0' });
  assert.equal(historico.status, 200);
  assert.equal(historico.body.history.length, 1);
  assert.equal(historico.body.history[0].answers.length, 1);
  assert.ok(h.logs.some((x) => x.url.includes('usuario_id=eq.' + ids.aluno)));

  const caderno = await h.call(null, { aula_id: AULA, caderno: '1' });
  assert.equal(caderno.status, 200);
  assert.equal(caderno.body.caderno.length, 1);
  assert.equal(caderno.body.caderno[0].correctChoice, 'B');
  assert.equal(caderno.body.caderno[0].lastWrong, 'A');
});

/* ----------------------------------------------------------------- banco */
test('migração: RLS, privilégios mínimos, RPC atômica, idempotência e validade da matrícula', async () => {
  const db = await criarBanco();
  try {
    await db.exec('alter table public.matriculas add column if not exists expira_em timestamptz;');
    await db.exec(fs.readFileSync(path.join(__dirname, '../supabase/migrations', MIGRATION), 'utf8'));
    await db.query("insert into public.agoraquest_atividades(slug,aula_id,versao_conteudo,titulo) values('hipercalemia-aula-01-v1',$1,1,'Hipercalemia — Aula 01')", [AULA]);

    const priv = (await db.query(`select
      has_table_privilege('anon','public.agoraquest_atividades','SELECT') as anon_atividades,
      has_table_privilege('authenticated','public.agoraquest_tentativas','INSERT') as aluno_tentativas,
      has_function_privilege('authenticated','public.agoraquest_gravar(uuid,uuid,uuid,integer,jsonb,boolean,uuid,uuid,integer)','EXECUTE') as rpc`)).rows[0];
    assert.deepEqual(priv, { anon_atividades: false, aluno_tentativas: false, rpc: false });
    const rls = (await db.query("select relname, relrowsecurity from pg_class where relname in ('agoraquest_atividades','agoraquest_tentativas') order by relname")).rows;
    assert.deepEqual(rls, [
      { relname: 'agoraquest_atividades', relrowsecurity: true },
      { relname: 'agoraquest_tentativas', relrowsecurity: true }
    ]);

    await db.query("update public.cursos set tipo_acesso='pago' where id=$1", [ids.curso]);
    const chamar = async (estado, revisao, { nova = false, anterior = null, operacao = randomUUID(), uid = ids.aluno, aula = AULA, versao = 1 } = {}) =>
      (await db.query('select public.agoraquest_gravar($1,$2,$3,$4,$5,$6,$7,$8,$9) as r',
        [uid, aula, estado.id, revisao, JSON.stringify(estado), nova, anterior, operacao, versao])).rows[0].r;

    let s = Q.E.fresh();
    const operacaoInicial = randomUUID();
    let row = await chamar(s, 0, { nova: true, operacao: operacaoInicial });
    assert.equal(row.revisao, 1);
    assert.equal(row.estado.answers.length, 0);

    const idempotente = await chamar(s, 0, { nova: true, operacao: operacaoInicial });
    assert.equal(idempotente.id, row.id);
    const repetida = await chamar(s, 0, { nova: true, operacao: operacaoInicial });
    assert.equal(repetida.id, row.id);
    await assert.rejects(chamar(Q.E.fresh(), 0, { nova: true }), /outra sessão/);

    s = Q.transition(s, 'answer', { choice: 'A' });
    row = await chamar(s, row.revisao);
    assert.equal(row.revisao, 2);
    assert.equal(row.estado.answers[0].choice, 'A');
    await assert.rejects(chamar(Q.transition(s, 'next', {}), 1), /outra sessão/);

    s = Q.transition(s, 'next', {});
    row = await chamar(s, row.revisao);
    for (let i = 1; i < 5; i++) {
      s = Q.transition(s, 'answer', { choice: Q.E.KEY[i] });
      row = await chamar(s, row.revisao);
      s = Q.transition(s, 'next', {});
      row = await chamar(s, row.revisao);
    }
    assert.ok(row.estado.finishedAt);
    assert.equal(Q.E.score(row.estado), 4);

    const segunda = Q.E.fresh();
    const row2 = await chamar(segunda, 0, { nova: true, anterior: row.id });
    assert.notEqual(row2.id, row.id);
    assert.equal((await db.query('select * from public.agoraquest_tentativas')).rows.length, 2);

    await assert.rejects(chamar(Q.E.fresh(), 0, { nova: true, anterior: row.id }), /outra sessão/);
    await assert.rejects(chamar(segunda, 1, { versao: 2 }), /Versão/);
    await assert.rejects(chamar(segunda, 1, { aula: ids.outraAula }), /Atividade indisponível/);

    const invalido = Q.E.fresh();
    invalido.id = row2.id;
    invalido.finishedAt = new Date().toISOString();
    await assert.rejects(chamar(invalido, row2.revisao), /cinco questões/);

    await db.query("update public.matriculas set expira_em=now()-interval '1 day' where usuario_id=$1 and curso_id=$2", [ids.aluno, ids.curso]);
    await assert.rejects(chamar(Q.E.fresh(), 0, { nova: true, anterior: row2.id }), /Sem acesso/);

    await db.query('update public.perfis set liberado=false where id=$1', [ids.aluno]);
    await db.query("update public.matriculas set expira_em=null where usuario_id=$1 and curso_id=$2", [ids.aluno, ids.curso]);
    await assert.rejects(chamar(Q.E.fresh(), 0, { nova: true, anterior: row2.id }), /Sem acesso/);
  } finally {
    await db.close();
  }
});

test('migração vincula somente a Aula 01 do Módulo 1 de Hipercalemia', async () => {
  const db = await criarBanco();
  const curso = 'fa3c5d8d-94c4-4321-be7a-1cc45741a983';
  const modulo = '99999999-9999-4999-8999-999999999999';
  const primeira = 'aaaaaaaa-0000-4000-8000-000000000001';
  const segunda = 'aaaaaaaa-0000-4000-8000-000000000002';
  try {
    await db.exec('alter table public.matriculas add column if not exists expira_em timestamptz;');
    await db.exec('alter table public.aulas add column if not exists atividade text;');
    await db.query("insert into public.cursos(id,titulo) values($1,'Tratamento da Hipercalemia em Adultos')", [curso]);
    await db.query("insert into public.modulos(id,curso_id,titulo,ordem) values($1,$2,'Módulo 1',1)", [modulo, curso]);
    await db.query("insert into public.aulas(id,modulo_id,titulo,ordem,atividade) values($1,$2,'Aula 01',1,'pre-requisitos-v1'),($3,$2,'Aula 02',2,null)", [primeira, modulo, segunda]);
    await db.exec(fs.readFileSync(path.join(__dirname, '../supabase/migrations', MIGRATION), 'utf8'));
    const linhas = (await db.query('select slug, aula_id, versao_conteudo, titulo from public.agoraquest_atividades')).rows;
    assert.deepEqual(linhas, [{ slug: 'hipercalemia-aula-01-v1', aula_id: primeira, versao_conteudo: 1, titulo: 'Hipercalemia — Aula 01' }]);
  } finally {
    await db.close();
  }
});

/* --------------------------------------------------------------- estático */
test('página, CTA e service worker estão ligados sem levar o gabarito ao cliente', () => {
  const html = fs.readFileSync(path.join(__dirname, '../agoraquest.html'), 'utf8');
  assert.match(html, /css\/agoraquest\.css\?v=1/);
  assert.match(html, /js\/agoraquest\.js\?v=1/);
  assert.doesNotMatch(html, /B.*C.*B.*D.*C/);
  const js = fs.readFileSync(path.join(__dirname, '../js/agoraquest.js'), 'utf8');
  assert.doesNotMatch(js, /\[\s*['"]B['"]\s*,\s*['"]C['"]\s*,\s*['"]B['"]\s*,\s*['"]D['"]\s*,\s*['"]C['"]\s*\]/);
  for (const q of aprovado) {
    assert.ok(!js.includes(q.stem));
    assert.ok(!js.includes(q.choices.B));
  }
  const aula = fs.readFileSync(path.join(__dirname, '../aula.html'), 'utf8');
  assert.match(aula, /id="agoraquest-cta"/);
  assert.match(aula, /api\/agoraquest\?meta=1/);
  assert.match(aula, /Praticar no AgoraQuest/);
  const roteador = fs.readFileSync(path.join(__dirname, '../api/roteador.js'), 'utf8');
  assert.match(roteador, /'agoraquest': require\('\.\.\/lib\/rotas\/agoraquest'\)/);
  const sw = fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8');
  assert.match(sw, /agoramed-v85/);
  assert.match(sw, /agoraquest\.html/);
  assert.match(sw, /css\/agoraquest\.css\?v=1/);
  assert.match(sw, /js\/agoraquest\.js\?v=1/);
  const css = fs.readFileSync(path.join(__dirname, '../css/agoraquest.css'), 'utf8');
  assert.match(css, /#346F77/i);
  assert.match(css, /#808080/i);
  assert.match(css, /#F5F5F5/i);
});
