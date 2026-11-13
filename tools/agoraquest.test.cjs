const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');
const Q = require('../lib/agoraquest');
const N = Q.N;
const { criarBanco, ids } = require('./helpers/banco-curso.cjs');

const MIGRACAO_AULA_01 = '20261111233000_agoraquest_hipercalemia_aula_01.sql';
const MIGRACAO_AULA_02 = '20261112120000_agoraquest_aula_02_e_caderno_erros.sql';
const AULA = ids.aula;
const CURSO_HIPER = 'fa3c5d8d-94c4-4321-be7a-1cc45741a983';
const AULA_01 = Q.porSlug('hipercalemia-aula-01-v1');
const AULA_02 = Q.porSlug('hipercalemia-aula-02-v1');
const SLUG_01 = 'hipercalemia-aula-01-v1';
const SLUG_02 = 'hipercalemia-aula-02-v1';

const migracao = (nome) => fs.readFileSync(path.join(__dirname, '../supabase/migrations', nome), 'utf8');

/* Conteúdo aprovado da Aula 01: não pode ser reescrito sem nova revisão. */
const aprovado01 = [
  {
    title: 'O valor isolado já exige ação?',
    stem: 'Um homem de 62 anos procura a emergência por mal-estar inespecífico. Está consciente, hemodinamicamente estável e sem alterações eletrocardiográficas evidentes. O laboratório informa potássio sérico de 6,9 mEq/L.\n\n**Qual é a conduta mais adequada?**',
    choices: {
      A: 'Como o ECG está normal, repetir o potássio em 24 horas.',
      B: 'Considerar uma emergência hipercalêmica, iniciar monitorização e tratamento imediato, avaliando simultaneamente a possibilidade de pseudohipercalemia.',
      C: 'Aguardar o aparecimento de ondas T apiculadas antes de iniciar o tratamento.',
      D: 'Liberar o paciente após orientação alimentar, pois não apresenta sintomas cardíacos.'
    },
    pearl: 'ECG normal não é salvo-conduto: potássio ≥ 6,5 mEq/L ou elevação rápida já exige monitorização e tratamento.'
  },
  {
    title: 'O ECG muda a prioridade?',
    stem: 'Uma mulher de 70 anos, com doença renal crônica, apresenta potássio de 6,1 mEq/L. O ECG mostra ondas T apiculadas, achatamento das ondas P e alargamento do QRS, alterações novas em relação ao traçado anterior.\n\n**Qual é a melhor interpretação?**',
    choices: {
      A: 'O potássio está abaixo de 6,5 mEq/L, portanto não há indicação de tratamento imediato.',
      B: 'As alterações só têm importância se o potássio ultrapassar 7,0 mEq/L.',
      C: 'O quadro representa uma emergência hipercalêmica com comprometimento elétrico, exigindo estabilização cardíaca e tratamento imediato.',
      D: 'É necessário repetir o ECG após seis horas antes de definir a conduta.'
    },
    pearl: 'Quem manda é o ECG: alteração elétrica nova é emergência, mesmo com potássio abaixo de 6,5 mEq/L.'
  },
  {
    title: 'Bradicardia com potássio elevado',
    stem: 'Um homem de 76 anos, em uso de carvedilol e com piora recente da função renal, apresenta potássio de 5,9 mEq/L, frequência cardíaca de 35 bpm e pressão arterial de 85/50 mmHg.\n\n**Qual é a melhor decisão inicial?**',
    choices: {
      A: 'Desconsiderar a hipercalemia como fator relevante, pois o potássio está abaixo de 6,5 mEq/L.',
      B: 'Reconhecer uma possível emergência associada à hipercalemia, iniciar monitorização, suporte hemodinâmico e tratamento imediato, considerando a possibilidade de síndrome BRASH.',
      C: 'Aguardar o potássio ultrapassar 6,5 mEq/L para iniciar medidas específicas.',
      D: 'Tratar apenas a bradicardia, sem investigar a função renal ou o potássio.'
    },
    pearl: 'Bradicardia + hipotensão + disfunção renal + bloqueador AV + hipercalemia: pense em BRASH e trate o conjunto, não só o número.'
  },
  {
    title: 'A velocidade de elevação importa?',
    stem: 'Um homem de 45 anos, internado após esmagamento muscular, apresenta lesão renal aguda oligúrica. O potássio passou de 4,4 para 5,8 mEq/L em três horas. O ECG ainda não apresenta alterações características.\n\n**Qual é a melhor conduta?**',
    choices: {
      A: 'Aguardar o potássio ultrapassar 6,5 mEq/L, pois o ECG está normal.',
      B: 'Considerar a elevação pouco relevante porque o paciente não apresenta alterações eletrocardiográficas.',
      C: 'Solicitar uma nova dosagem apenas no dia seguinte, evitando intervenções desnecessárias.',
      D: 'Reconhecer o alto risco de progressão rápida, iniciar monitorização e tratamento urgente, com reavaliações seriadas e planejamento da remoção do potássio.'
    },
    pearl: 'A curva do potássio importa: elevação rápida com oligúria e rabdomiólise é emergência mesmo com ECG ainda normal.'
  },
  {
    title: 'Quem precisa de tratamento imediato?',
    stem: 'Durante o plantão, você recebe os resultados de quatro pacientes. Qual deles apresenta a situação de menor urgência para redução imediata do potássio, considerando as informações disponíveis?',
    choices: {
      A: 'Paciente com potássio de 6,8 mEq/L, assintomático e ECG sem alterações.',
      B: 'Paciente com potássio de 5,8 mEq/L, bradicardia importante e QRS alargado de início recente.',
      C: 'Paciente com potássio de 5,3 mEq/L, doença renal crônica estável, ECG sem alterações, diurese preservada e valores semelhantes nos últimos meses.',
      D: 'Paciente com potássio de 6,0 mEq/L, lesão renal aguda oligúrica e rabdomiólise em evolução.'
    },
    pearl: 'Urgência não é só o número: sintomas, ECG, velocidade de elevação, função renal e tendência definem o risco.'
  }
];

/* Conteúdo aprovado da Aula 02, transcrito do enunciado entregue. */
const aprovado02 = [
  {
    title: 'Potássio extracelular e condução cardíaca',
    stem: 'Um paciente de 68 anos, com lesão renal aguda, apresenta potássio sérico de 6,7 mEq/L. O ECG mostra redução da amplitude da onda P e alargamento do QRS, alterações novas em relação ao traçado anterior. Qual mecanismo fisiológico explica melhor o comprometimento da condução cardíaca?',
    choices: {
      A: 'A elevação do potássio extracelular torna o potencial de repouso mais negativo, impedindo a ativação dos canais de cálcio.',
      B: 'A elevação do potássio extracelular despolariza parcialmente a membrana, reduz a disponibilidade dos canais rápidos de sódio e prejudica a condução elétrica.',
      C: 'O excesso de potássio extracelular aumenta diretamente a velocidade de abertura dos canais rápidos de sódio, acelerando a condução.',
      D: 'A hipercalemia bloqueia diretamente a bomba de sódio e potássio, interrompendo imediatamente toda atividade elétrica cardíaca.'
    },
    pearl: 'Na hipercalemia, uma membrana parcialmente despolarizada pode conduzir pior, não melhor. O problema não é apenas gerar o impulso, mas conseguir propagá-lo.',
    reference: 'UpToDate — Clinical manifestations of hyperkalemia in adults; Causes and evaluation of hyperkalemia in adults.'
  },
  {
    title: 'Insulina e redistribuição do potássio',
    stem: 'Um paciente com hipercalemia grave recebe insulina intravenosa associada à glicose. Uma hora depois, o potássio sérico apresenta redução significativa. Qual mecanismo explica melhor essa resposta?',
    choices: {
      A: 'A insulina aumenta diretamente a excreção renal de potássio, mesmo em pacientes anúricos.',
      B: 'A insulina neutraliza eletricamente o potássio extracelular, reduzindo sua atividade biológica sem alterar sua distribuição.',
      C: 'A insulina estimula a Na⁺/K⁺-ATPase, principalmente no músculo esquelético, favorecendo a entrada de potássio nas células.',
      D: 'A insulina promove a ligação irreversível do potássio às proteínas plasmáticas, impedindo sua circulação.'
    },
    pearl: 'Insulina reduz o potássio que aparece no exame, mas não remove potássio do corpo. Uma boa resposta inicial não dispensa o plano de eliminação.',
    reference: 'UpToDate — Treatment and prevention of hyperkalemia in adults; Causes and evaluation of hyperkalemia in adults.'
  },
  {
    title: 'Excreção renal do potássio',
    stem: 'Um paciente de 72 anos, com lesão renal aguda oligúrica, apresenta hipercalemia persistente. Além da redução da função renal, qual conjunto de fatores influencia diretamente a secreção distal de potássio?',
    choices: {
      A: 'Concentração de albumina, pressão oncótica plasmática e produção hepática de ureia.',
      B: 'Secreção de aldosterona, entrega distal de sódio e fluxo tubular distal.',
      C: 'Concentração sérica de cálcio, absorção intestinal de ferro e secreção pancreática de glucagon.',
      D: 'Pressão arterial sistólica, concentração de hemoglobina e frequência respiratória, independentemente da função tubular.'
    },
    pearl: 'Para eliminar potássio, não basta ter rins: é necessário que os mecanismos de secreção distal estejam funcionando.',
    reference: 'UpToDate — Causes and evaluation of hyperkalemia in adults.'
  },
  {
    title: 'Proteger, redistribuir e remover',
    stem: 'Um paciente apresenta potássio de 7,2 mEq/L e alargamento do QRS. A equipe inicia tratamento da emergência hipercalêmica. Qual alternativa relaciona corretamente a intervenção ao seu principal objetivo fisiológico?',
    choices: {
      A: 'Cálcio intravenoso remove potássio; insulina estabiliza diretamente a membrana; hemodiálise redistribui potássio para as células.',
      B: 'Cálcio intravenoso reduz a concentração sérica de potássio; salbutamol aumenta a excreção urinária; hemodiálise protege o coração sem remover potássio.',
      C: 'Cálcio intravenoso e insulina eliminam potássio do organismo, enquanto a hemodiálise atua exclusivamente sobre a condução cardíaca.',
      D: 'Cálcio intravenoso antagoniza os efeitos cardíacos da hipercalemia; insulina promove redistribuição celular; hemodiálise remove potássio do organismo.'
    },
    pearl: 'Cálcio protege. Insulina redistribui. Hemodiálise remove. Saber o que cada intervenção não faz é tão importante quanto saber o que ela faz.',
    reference: 'UpToDate — Treatment and prevention of hyperkalemia in adults.'
  },
  {
    title: 'Rebote após o tratamento',
    stem: 'Um paciente de 67 anos, com lesão renal aguda e oligúria importante, chega com potássio de 7,0 mEq/L e QRS alargado. Após cálcio intravenoso e insulina com glicose, o potássio cai para 5,8 mEq/L. A diurese permanece muito reduzida. Qual interpretação é mais adequada?',
    choices: {
      A: 'A redução do potássio demonstra que a capacidade renal de excreção foi restaurada.',
      B: 'A melhora laboratorial inicial permite encerrar a monitorização, desde que o QRS tenha diminuído.',
      C: 'O potássio pode voltar a subir quando o efeito redistributivo diminuir, exigindo monitorização e avaliação de estratégias de remoção.',
      D: 'A redução após insulina confirma que a maior parte do excesso de potássio já foi eliminada do organismo.'
    },
    pearl: 'O potássio caiu, mas para onde ele foi? Essa pergunta ajuda a distinguir resposta temporária de resolução do problema.',
    reference: 'UpToDate — Treatment and prevention of hyperkalemia in adults.'
  }
];

function conferirConteudo(conteudo, aprovado, chave) {
  assert.equal(conteudo.questions.length, aprovado.length);
  assert.equal(conteudo.questions.length, 5);
  assert.deepEqual(conteudo.key, chave);
  assert.deepEqual(Q.keyOf(conteudo), chave);
  conteudo.questions.forEach((q, i) => {
    assert.equal(q.number, i + 1);
    assert.equal(q.title, aprovado[i].title);
    assert.equal(q.stem, aprovado[i].stem);
    assert.deepEqual(q.choices, aprovado[i].choices);
    assert.deepEqual(Object.keys(q.feedback), ['A', 'B', 'C', 'D']);
    for (const letra of 'ABCD') assert.ok(q.feedback[letra].length > 60);
    assert.ok(q.correctExplanation.length > 80);
    assert.equal(q.pearl, aprovado[i].pearl);
    assert.ok((q.reference || conteudo.references).length > 10);
  });
}

/* 1 e 3 — Aula 01 continua exatamente como aprovada. */
test('Aula 01: enunciados, alternativas e gabarito preservados', () => {
  assert.equal(AULA_01.slug, SLUG_01);
  conferirConteudo(AULA_01, aprovado01, ['B', 'C', 'B', 'D', 'C']);
  assert.match(AULA_01.references, /UpToDate/);
});

/* 2, 3, 4, 7, 8 — Aula 02 com as cinco questões exatas. */
test('Aula 02: cinco questões exatas, gabarito B-C-B-D-C, análises e pérolas', () => {
  assert.equal(AULA_02.slug, SLUG_02);
  conferirConteudo(AULA_02, aprovado02, ['B', 'C', 'B', 'D', 'C']);
  assert.equal(AULA_02.questions.length, 5);
  assert.equal(AULA_02.questions[0].feedback.A.includes('menos negativo'), true);
  assert.equal(AULA_02.questions[3].feedback.D, 'A alternativa distingue corretamente proteção cardíaca, redistribuição temporária e remoção efetiva, três objetivos fundamentais do tratamento.');
});

/* 5, 6, 9, 10 — feedback imediato, bloqueio, avanço e pontuação. */
test('engine: feedback só após confirmar, alternativa bloqueada, avanço e nota final', () => {
  let s = Q.E.fresh();
  assert.ok(Q.E.valid(s));
  const inicial = Q.visible(s, AULA_01);
  assert.ok(inicial.questions.every((q) => !q.feedback && !q.correctChoice && !q.correctExplanation && !q.pearl));
  assert.equal(inicial.closing, undefined);
  assert.throws(() => Q.transition(s, 'answer', { choice: 'E' }, AULA_01), /Seleção indisponível/);
  assert.throws(() => Q.transition(s, 'next', {}, AULA_01), /Não há comentário/);

  s = Q.transition(s, 'answer', { choice: 'A' }, AULA_01);
  const depois = Q.visible(s, AULA_01);
  assert.equal(depois.questions[0].correctChoice, 'B');
  assert.deepEqual(Object.keys(depois.questions[0].feedback), ['A', 'B', 'C', 'D']);
  assert.ok(depois.questions[0].pearl);
  assert.ok(depois.questions[0].reference);
  assert.ok(!depois.questions[1].feedback && !depois.questions[1].correctChoice);
  assert.equal(Q.publicState(s, AULA_01).answers[0].correct, false);
  assert.throws(() => Q.transition(s, 'answer', { choice: 'B' }, AULA_01), /Seleção indisponível/);

  s = Q.transition(s, 'next', {}, AULA_01);
  assert.ok(!Q.visible(s, AULA_01).questions[1].feedback);

  for (let i = 1; i < 5; i++) {
    s = Q.transition(s, 'answer', { choice: Q.E.KEY[i] }, AULA_01);
    s = Q.transition(s, 'next', {}, AULA_01);
  }
  assert.ok(s.finishedAt);
  assert.equal(Q.E.score(s, Q.keyOf(AULA_01)), 4);
  assert.equal(Q.publicState(s, AULA_01).score, 4);
  assert.ok(Q.visible(s, AULA_01).closing);
  assert.throws(() => Q.transition(s, 'answer', { choice: 'A' }, AULA_01), /já foi concluída/);
});

/* 4 — o mesmo engine respeita o gabarito da Aula 02, sem herdar a chave da Aula 01. */
test('engine: Aula 02 usa o próprio gabarito e calcula a nota corretamente', () => {
  let s = Q.E.fresh();
  for (let i = 0; i < 5; i++) {
    s = Q.transition(s, 'answer', { choice: Q.keyOf(AULA_02)[i] }, AULA_02);
    s = Q.transition(s, 'next', {}, AULA_02);
  }
  assert.equal(Q.E.score(s, Q.keyOf(AULA_02)), 5);
  assert.equal(Q.publicState(s, AULA_02).score, 5);

  let errado = Q.E.fresh();
  for (let i = 0; i < 5; i++) {
    errado = Q.transition(errado, 'answer', { choice: Q.keyOf(AULA_02)[i] === 'A' ? 'B' : 'A' }, AULA_02);
    errado = Q.transition(errado, 'next', {}, AULA_02);
  }
  assert.equal(Q.E.score(errado, Q.keyOf(AULA_02)), 0);
  assert.equal(Q.publicState(errado, AULA_02).score, 0);
  assert.equal(Q.visible(errado, AULA_02).questions[3].correctChoice, 'D');
});

/* 11, 12, 13, 15 — domínio do caderno: identificação, indicadores, agrupamento e revisão. */
test('caderno: identificação estável, indicadores, agrupamento e revisão sem gabarito antecipado', () => {
  assert.equal(N.questaoId(SLUG_02, 3), 'hipercalemia-aula-02-v1#3');
  assert.deepEqual(N.separarId('hipercalemia-aula-02-v1#3'), { slug: SLUG_02, numero: 3 });
  assert.equal(N.separarId('sem-numero'), null);
  assert.equal(N.dominioAcertos('3'), 3);
  assert.equal(N.dominioAcertos('x'), 2);

  const itens = [
    { estado: 'precisa_revisar', revisoes: 0 },
    { estado: 'precisa_revisar', revisoes: 1 },
    { estado: 'em_revisao', revisoes: 2 },
    { estado: 'dominada', revisoes: 4 }
  ];
  assert.deepEqual(N.indicadores(itens), {
    total: 4, precisaRevisar: 2, emRevisao: 1, dominadas: 1, percentualDominio: 25, revisoes: 7
  });

  const row = {
    id: 'cad-1', questao_id: SLUG_02 + '#3', slug: SLUG_02, numero: 3, aula_id: AULA,
    estado: 'precisa_revisar', erros: 2, revisoes: 1, acertos_seguidos: 0,
    ultima_escolha: 'A', ultimo_erro_em: '2026-11-12T12:00:00.000Z', atualizado_em: '2026-11-12T12:00:00.000Z',
    aulas: { titulo: 'A fisiologia do potássio que muda a conduta', ordem: 2, modulos: { titulo: 'Módulo 1', ordem: 1, curso_id: CURSO_HIPER, cursos: { id: CURSO_HIPER, titulo: 'Tratamento da Hipercalemia em Adultos' } } }
  };
  const lista = N.montarLista([row, { ...row, id: 'cad-2', questao_id: SLUG_02 + '#4', numero: 4, estado: 'dominada' }], (slug) => Q.porSlug(slug));
  assert.equal(lista.itens.length, 2);
  assert.equal(lista.grupos[0].titulo, 'Tratamento da Hipercalemia em Adultos');
  assert.equal(lista.grupos[0].modulos[0].aulas[0].itens[0].numero, 3);
  assert.equal(lista.indicadores.total, 2);

  const revisao = N.revisaoView(row, AULA_02);
  assert.equal(revisao.stem, AULA_02.questions[2].stem);
  assert.deepEqual(revisao.choices, AULA_02.questions[2].choices);
  assert.equal(revisao.correctChoice, undefined);
  assert.equal(revisao.feedback, undefined);
  assert.equal(revisao.correctExplanation, undefined);
  assert.equal(revisao.pearl, undefined);

  const resultado = N.resultadoRevisao(row, AULA_02, 'A');
  assert.equal(resultado.correctChoice, 'B');
  assert.equal(resultado.correta, false);
  assert.deepEqual(Object.keys(resultado.feedback), ['A', 'B', 'C', 'D']);
  assert.equal(resultado.pearl, AULA_02.questions[2].pearl);
});

/* ------------------------------------------------------------------ API */
function montarRota({ aulaAtividade = null, semAtividade = false, slug = SLUG_01, cadernoInicial = [], ...overrides } = {}) {
  const logs = [];
  const tentativas = [];
  const sincronizacoes = [];
  const caderno = cadernoInicial.map((x) => ({ ...x }));
  const curso = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const modulo = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const aulaEmbed = (r) => ({
    titulo: slug === SLUG_02 ? 'A fisiologia do potássio que muda a conduta' : 'Aula 01',
    ordem: slug === SLUG_02 ? 2 : 1,
    modulos: { titulo: 'Módulo 1', ordem: 1, curso_id: curso, cursos: { id: curso, titulo: 'Tratamento da Hipercalemia em Adultos' } }
  });

  const deps = {
    envFaltando: () => [],
    sessaoPerfil: async () => ({ id: ids.aluno, liberado: true, papel: 'aluno' }),
    podeAcessarCurso: async () => true,
    json: (res, status, body) => { res.status = status; res.body = body; },
    postgrest: async (url, opt = {}) => {
      logs.push({ url, opt });
      if (url.startsWith('/aulas?')) {
        return { ok: true, dados: [{ id: AULA, titulo: aulaEmbed().titulo, atividade: aulaAtividade, modulo_id: modulo, modulos: { curso_id: curso, titulo: 'Módulo 1' } }] };
      }
      if (url.startsWith('/agoraquest_atividades?')) {
        return { ok: true, dados: semAtividade ? [] : [{ slug, versao_conteudo: 1, titulo: slug === SLUG_02 ? 'Hipercalemia — Aula 02' : 'Hipercalemia — Aula 01' }] };
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
      if (url.startsWith('/rpc/agoraquest_caderno_sincronizar')) {
        sincronizacoes.push(opt.corpo);
        caderno.length = 0;
        for (const e of opt.corpo.p_erros) {
          caderno.push({
            id: 'cad-' + e.numero, questao_id: opt.corpo.p_slug + '#' + e.numero, slug: opt.corpo.p_slug,
            numero: e.numero, aula_id: opt.corpo.p_aula, estado: 'precisa_revisar', erros: 1, revisoes: 0,
            acertos_seguidos: 0, ultima_escolha: e.escolha, ultimo_erro_em: e.em,
            atualizado_em: new Date().toISOString(), aulas: aulaEmbed()
          });
        }
        return { ok: true, dados: opt.corpo.p_erros.length };
      }
      if (url.startsWith('/agoraquest_caderno?')) {
        const u = new URL(url, 'http://teste');
        const qid = (u.searchParams.get('questao_id') || '').replace(/^eq\./, '');
        const aula = (u.searchParams.get('aula_id') || '').replace(/^eq\./, '');
        const rows = caderno.filter((r) => (!qid || r.questao_id === qid) && (!aula || r.aula_id === aula));
        return { ok: true, dados: rows };
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
    URL,
    console,
    process,
    setTimeout,
    clearTimeout
  });
  const rota = moduloCarregado.exports;

  return {
    logs,
    sincronizacoes,
    get tentativas() { return tentativas; },
    get caderno() { return caderno; },
    async call(body, query = { aula_id: AULA }, method = body ? 'POST' : 'GET') {
      const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; } };
      await rota({ method, body, query }, res);
      return res;
    }
  };
}

function montarRotaCaderno({ acesso = true, perfil = { id: ids.aluno, liberado: true, papel: 'aluno' }, semAtividade = false } = {}) {
  const logs = [];
  const curso = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const row = {
    id: 'cad-1', questao_id: SLUG_02 + '#1', slug: SLUG_02, numero: 1, aula_id: AULA,
    estado: 'precisa_revisar', erros: 1, revisoes: 0, acertos_seguidos: 0,
    ultima_escolha: 'A', ultimo_erro_em: '2026-11-12T12:00:00.000Z',
    criado_em: '2026-11-12T12:00:00.000Z', atualizado_em: '2026-11-12T12:00:00.000Z',
    aulas: { titulo: 'A fisiologia do potássio que muda a conduta', ordem: 2, modulos: { titulo: 'Módulo 1', ordem: 1, curso_id: curso, cursos: { id: curso, titulo: 'Tratamento da Hipercalemia em Adultos' } } }
  };
  const deps = {
    envFaltando: () => [],
    sessaoPerfil: async () => perfil,
    podeAcessarCurso: async () => acesso,
    cursoDaAula: async () => curso,
    json: (res, status, body) => { res.status = status; res.body = body; },
    postgrest: async (url, opt = {}) => {
      logs.push({ url, opt });
      if (url.startsWith('/agoraquest_caderno?')) {
        const u = new URL(url, 'http://teste');
        const qid = (u.searchParams.get('questao_id') || '').replace(/^eq\./, '');
        return { ok: true, dados: !qid || qid === row.questao_id ? [row] : [] };
      }
      if (url.startsWith('/agoraquest_atividades?')) {
        return { ok: true, dados: semAtividade ? [] : [{ aula_id: AULA, versao_conteudo: 1 }] };
      }
      if (url.startsWith('/rpc/agoraquest_caderno_revisar')) {
        const b = opt.corpo;
        const correta = b.p_correta===true;
        row.revisoes += 1;
        row.acertos_seguidos = correta ? row.acertos_seguidos + 1 : 0;
        row.estado = correta && row.acertos_seguidos >= b.p_dominio ? 'dominada' : 'em_revisao';
        if (!correta) { row.erros += 1; row.ultimo_erro_em = new Date().toISOString(); }
        row.ultima_escolha = b.p_escolha;
        row.atualizado_em = new Date().toISOString();
        return { ok: true, dados: row };
      }
      throw Error('URL não prevista no teste do caderno: ' + url);
    }
  };
  const moduloCarregado = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../lib/rotas/agoraquest-caderno.js'), 'utf8'), {
    module: moduloCarregado,
    require: (nome) => {
      if (nome === '../api') return deps;
      if (nome === '../curso-edicao') return require('../lib/curso-edicao');
      if (nome === '../agoraquest') return Q;
      return require(nome);
    },
    URL,
    console,
    process
  });
  const rota = moduloCarregado.exports;
  return {
    logs,
    row,
    async call(body, query = {}, method = body ? 'POST' : 'GET') {
      const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; } };
      await rota({ method, body, query }, res);
      return res;
    }
  };
}

/* 17, 20 — autorização e isolamento antes de ler qualquer tentativa. */
test('API da prática: sessão, acesso, identificadores e isolamento por aluno', async () => {
  let h = montarRota({ sessaoPerfil: async () => null });
  assert.equal((await h.call()).status, 401);
  assert.equal(h.logs.length, 0);

  h = montarRota({ podeAcessarCurso: async () => false });
  assert.equal((await h.call()).status, 403);
  assert.ok(!h.logs.some((x) => x.url.startsWith('/agoraquest_tentativas')));

  assert.equal((await montarRota().call(null, { aula_id: 'x&select=*' })).status, 400);
  assert.equal((await montarRota({ semAtividade: true }).call()).status, 404);
  assert.equal((await montarRota({ aulaAtividade: 'pre-requisitos-v1' }).call()).status, 200);

  const ok = await montarRota().call();
  assert.equal(ok.status, 200);
  assert.ok(ok.logs === undefined);
  const h2 = montarRota();
  await h2.call();
  assert.ok(h2.logs.some((x) => x.url.includes('usuario_id=eq.' + ids.aluno)));
});

/* 6, 9, 11, 12, 14 — fluxo completo e alimentação idempotente do caderno. */
test('API da prática: Aula 01 e Aula 02 publicam o conteúdo certo sem vazar o gabarito', async () => {
  for (const [slug, conteudo, chave] of [[SLUG_01, AULA_01, ['B', 'C', 'B', 'D', 'C']], [SLUG_02, AULA_02, ['B', 'C', 'B', 'D', 'C']]]) {
    const h = montarRota({ slug });
    const r = await h.call();
    assert.equal(r.status, 200);
    assert.equal(r.headers['Cache-Control'], 'private, no-store');
    assert.equal(r.body.state, null);
    assert.equal(r.body.content.questions.length, 5);
    assert.ok(r.body.content.questions.every((q) => !q.feedback && !q.correctChoice && !q.correctExplanation && !q.pearl));
    const meta = await h.call(null, { aula_id: AULA, meta: '1' });
    assert.equal(meta.status, 200);
    assert.equal(meta.body.slug, slug);
    assert.equal(meta.body.content, undefined);

    const inicio = await h.call({ aula_id: AULA, action: 'start', operation: randomUUID(), previous: null });
    assert.equal(inicio.status, 200);
    const id = inicio.body.state.id;
    let revisao = inicio.body.revision;
    const errada = chave[0] === 'A' ? 'B' : 'A';
    const resposta = await h.call({ aula_id: AULA, action: 'answer', choice: errada, operation: randomUUID(), attempt: id, revision: revisao });
    assert.equal(resposta.status, 200);
    assert.equal(resposta.body.state.score, 0);
    assert.equal(resposta.body.content.questions[0].correctChoice, chave[0]);
    assert.ok(resposta.body.content.questions[0].feedback.A);
    assert.ok(!resposta.body.content.questions[1].feedback);
    assert.ok(h.sincronizacoes.length >= 1);
    assert.deepEqual(h.sincronizacoes[h.sincronizacoes.length - 1].p_erros.map((e) => e.numero), [1]);

    const caderno = await h.call(null, { aula_id: AULA, caderno: '1' });
    assert.equal(caderno.status, 200);
    assert.equal(caderno.body.caderno.length, 1);
    assert.equal(caderno.body.caderno[0].estado, 'precisa_revisar');
    assert.equal(caderno.body.caderno[0].correctChoice, undefined);
    assert.equal(caderno.body.caderno[0].pearl, undefined);
    assert.equal(caderno.body.indicadores.total, 1);
    assert.equal(conteudo.questions.length, 5);
  }
});

/* 5, 14 — acerto não entra no caderno; erro entra uma única vez. */
test('API da prática: questão correta não entra no caderno e erro repetido não duplica', async () => {
  const h = montarRota();
  let r = await h.call({ aula_id: AULA, action: 'start', operation: randomUUID(), previous: null });
  const id = r.body.state.id;
  r = await h.call({ aula_id: AULA, action: 'answer', choice: Q.E.KEY[0], operation: randomUUID(), attempt: id, revision: r.body.revision });
  assert.equal(r.status, 200);
  assert.equal(r.body.state.score, 1);
  /* Sem erro, o servidor não precisa chamar a RPC do caderno. */
  assert.ok(h.sincronizacoes.every((c) => c.p_erros.length === 0));
  const semErros = await h.call(null, { aula_id: AULA, caderno: '1' });
  assert.equal(semErros.body.caderno.length, 0);

  r = await h.call({ aula_id: AULA, action: 'next', operation: randomUUID(), attempt: id, revision: r.body.revision });
  r = await h.call({ aula_id: AULA, action: 'answer', choice: 'A', operation: randomUUID(), attempt: id, revision: r.body.revision });
  const comErro = await h.call(null, { aula_id: AULA, caderno: '1' });
  assert.equal(comErro.body.caderno.length, 1);
  assert.equal(comErro.body.caderno[0].numero, 2);
});

test('API da prática: operação idempotente e conflito de revisão continuam bloqueados', async () => {
  const h = montarRota();
  const operacao = randomUUID();
  let r = await h.call({ aula_id: AULA, action: 'start', operation: operacao, previous: null });
  const id = r.body.state.id;
  const revisao = r.body.revision;
  assert.equal((await h.call({ aula_id: AULA, action: 'start', operation: operacao, previous: null })).status, 200);
  r = await h.call({ aula_id: AULA, action: 'answer', choice: 'A', operation: randomUUID(), attempt: id, revision: revisao });
  assert.equal(r.status, 200);
  const conflito = await h.call({ aula_id: AULA, action: 'answer', choice: 'B', operation: randomUUID(), attempt: id, revision: 1 });
  assert.equal(conflito.status, 409);
  assert.equal(conflito.body.conflito, true);
  const semOperacao = await h.call({ aula_id: AULA, action: 'next', attempt: id, revision: r.body.revision });
  assert.equal(semOperacao.status, 400);
});

/* 13, 15, 16 — revisão no servidor, gabarito depois da confirmação e domínio configurável. */
test('API do caderno: lista, revisão sem gabarito antecipado e domínio em duas revisões', async () => {
  const h = montarRotaCaderno();
  const lista = await h.call();
  assert.equal(lista.status, 200);
  assert.equal(lista.body.itens.length, 1);
  assert.equal(lista.body.indicadores.total, 1);
  assert.equal(lista.body.dominioAcertos, 2);
  assert.ok(h.logs.some((x) => x.url.includes('usuario_id=eq.' + ids.aluno)));

  const aberta = await h.call(null, { revisao: SLUG_02 + '#1' });
  assert.equal(aberta.status, 200);
  assert.equal(aberta.body.revisao.stem, AULA_02.questions[0].stem);
  assert.deepEqual(aberta.body.revisao.choices, AULA_02.questions[0].choices);
  assert.equal(aberta.body.revisao.correctChoice, undefined);
  assert.equal(aberta.body.revisao.feedback, undefined);
  assert.equal(aberta.body.revisao.correctExplanation, undefined);

  let r = await h.call({ action: 'revisar', questao_id: SLUG_02 + '#1', choice: 'A', operation: randomUUID() });
  assert.equal(r.status, 200);
  assert.equal(r.body.resultado.correctChoice, 'B');
  assert.equal(r.body.resultado.correta, false);
  assert.equal(r.body.resultado.estado, 'em_revisao');
  assert.deepEqual(Object.keys(r.body.resultado.feedback), ['A', 'B', 'C', 'D']);
  assert.equal(r.body.resultado.pearl, AULA_02.questions[0].pearl);
  assert.equal(r.body.item.estado, 'em_revisao');
  assert.ok(h.logs.some((x) => x.opt && x.opt.corpo && x.opt.corpo.p_usuario === ids.aluno));

  r = await h.call({ action: 'revisar', questao_id: SLUG_02 + '#1', choice: 'B', operation: randomUUID() });
  assert.equal(r.body.resultado.correta, true);
  assert.equal(r.body.resultado.estado, 'em_revisao');
  assert.equal(r.body.resultado.acertosSeguidos, 1);

  r = await h.call({ action: 'revisar', questao_id: SLUG_02 + '#1', choice: 'B', operation: randomUUID() });
  assert.equal(r.body.resultado.estado, 'dominada');
  assert.equal(r.body.resultado.acertosSeguidos, 2);
  assert.equal(r.body.indicadores.dominadas, 1);
});

test('API do caderno: acesso negado, entrada inválida e atividade ausente', async () => {
  const negado = montarRotaCaderno({ acesso: false });
  assert.equal((await negado.call(null, { revisao: SLUG_02 + '#1' })).status, 403);
  assert.equal((await negado.call({ action: 'revisar', questao_id: SLUG_02 + '#1', choice: 'A', operation: randomUUID() })).status, 403);

  const h = montarRotaCaderno();
  assert.equal((await h.call({ action: 'revisar', questao_id: 'x', choice: 'A', operation: randomUUID() })).status, 400);
  assert.equal((await h.call({ action: 'revisar', questao_id: SLUG_02 + '#1', choice: 'E', operation: randomUUID() })).status, 400);
  assert.equal((await h.call({ action: 'revisar', questao_id: SLUG_02 + '#1', choice: 'A', operation: 'x' })).status, 400);
  assert.equal((await h.call({ action: 'outra', questao_id: SLUG_02 + '#1', choice: 'A', operation: randomUUID() })).status, 400);

  const semAtividade = montarRotaCaderno({ semAtividade: true });
  assert.equal((await semAtividade.call(null, { revisao: SLUG_02 + '#1' })).status, 403);
});

/* ----------------------------------------------------------- banco */
test('migração: RLS, privilégios mínimos, sincronização idempotente e histórico por aluno', async () => {
  const db = await criarBanco();
  try {
    await db.exec('alter table public.matriculas add column if not exists expira_em timestamptz;');
    await db.exec('alter table public.aulas add column if not exists atividade text;');
    await db.exec(migracao(MIGRACAO_AULA_01));
    await db.exec(migracao(MIGRACAO_AULA_02));
    await db.query("insert into public.agoraquest_atividades(slug,aula_id,versao_conteudo,titulo) values($1,$2,1,'Hipercalemia — Aula 01')", [SLUG_01, AULA]);

    const priv = (await db.query(`select
      has_table_privilege('anon','public.agoraquest_caderno','SELECT') as anon_caderno,
      has_table_privilege('authenticated','public.agoraquest_caderno','INSERT') as auth_caderno,
      has_table_privilege('authenticated','public.agoraquest_caderno_eventos','SELECT') as auth_eventos,
      has_function_privilege('authenticated','public.agoraquest_caderno_sincronizar(uuid,uuid,text,jsonb)','EXECUTE') as sync,
      has_function_privilege('authenticated','public.agoraquest_caderno_revisar(uuid,text,text,boolean,uuid,integer)','EXECUTE') as revisar`)).rows[0];
    assert.deepEqual(priv, { anon_caderno: false, auth_caderno: false, auth_eventos: false, sync: false, revisar: false });
    const rls = (await db.query("select relname,relrowsecurity from pg_class where relname in ('agoraquest_caderno','agoraquest_caderno_eventos') order by relname")).rows;
    assert.deepEqual(rls, [
      { relname: 'agoraquest_caderno', relrowsecurity: true },
      { relname: 'agoraquest_caderno_eventos', relrowsecurity: true }
    ]);

    const sync = async (uid, aula, slug, erros) =>
      (await db.query('select public.agoraquest_caderno_sincronizar($1,$2,$3,$4::jsonb) as n',
        [uid, aula, slug, JSON.stringify(erros)])).rows[0].n;
    const revisar = async (uid, qid, escolha, correta, op = randomUUID(), dominio = 2) =>
      (await db.query('select public.agoraquest_caderno_revisar($1,$2,$3,$4,$5,$6) as r',
        [uid, qid, escolha, correta, op, dominio])).rows[0].r;
    const item = async (uid, qid) =>
      (await db.query('select * from public.agoraquest_caderno where usuario_id=$1 and questao_id=$2', [uid, qid])).rows[0];

    const t1 = randomUUID();
    const erro = { tentativa: t1, numero: 1, escolha: 'A', em: '2026-11-12T10:00:00.000Z' };
    assert.equal(await sync(ids.aluno, AULA, SLUG_01, [erro]), 1);
    assert.equal(await sync(ids.aluno, AULA, SLUG_01, [erro]), 0);
    let row = await item(ids.aluno, SLUG_01 + '#1');
    assert.equal(row.estado, 'precisa_revisar');
    assert.equal(row.erros, 1);
    assert.equal(row.revisoes, 0);
    assert.equal((await db.query('select * from public.agoraquest_caderno_eventos where usuario_id=$1', [ids.aluno])).rows.length, 1);

    const op = randomUUID();
    let r = await revisar(ids.aluno, SLUG_01 + '#1', 'B', true, op);
    assert.equal(r.estado, 'em_revisao');
    assert.equal(r.acertos_seguidos, 1);
    assert.equal(r.revisoes, 1);
    r = await revisar(ids.aluno, SLUG_01 + '#1', 'B', true, op);
    assert.equal(r.revisoes, 1);
    assert.equal((await db.query('select * from public.agoraquest_caderno_eventos where usuario_id=$1 and tipo=$2', [ids.aluno, 'revisao'])).rows.length, 1);

    r = await revisar(ids.aluno, SLUG_01 + '#1', 'B', true);
    assert.equal(r.estado, 'dominada');
    assert.equal(r.acertos_seguidos, 2);
    r = await revisar(ids.aluno, SLUG_01 + '#1', 'A', false);
    assert.equal(r.estado, 'em_revisao');
    assert.equal(r.acertos_seguidos, 0);
    assert.equal(r.erros, 2);

    await revisar(ids.aluno, SLUG_01 + '#1', 'B', true);
    r = await revisar(ids.aluno, SLUG_01 + '#1', 'B', true);
    assert.equal(r.estado, 'dominada');
    await sync(ids.aluno, AULA, SLUG_01, [{ tentativa: randomUUID(), numero: 1, escolha: 'D', em: '2026-11-12T11:00:00.000Z' }]);
    row = await item(ids.aluno, SLUG_01 + '#1');
    assert.equal(row.estado, 'em_revisao');
    assert.equal(row.erros, 3);
    assert.equal(row.acertos_seguidos, 0);

    await sync(ids.admin, AULA, SLUG_01, [{ tentativa: randomUUID(), numero: 2, escolha: 'A', em: '2026-11-12T12:00:00.000Z' }]);
    assert.deepEqual((await db.query('select usuario_id,questao_id from public.agoraquest_caderno order by usuario_id')).rows, [
      { usuario_id: ids.admin, questao_id: SLUG_01 + '#2' },
      { usuario_id: ids.aluno, questao_id: SLUG_01 + '#1' }
    ]);
    await assert.rejects(revisar(ids.admin, SLUG_01 + '#1', 'B', true), /não está no seu caderno/);
    await assert.rejects(sync(ids.aluno, AULA, SLUG_01, 'x'), /Sincronização inválida/);
    await assert.rejects(sync(ids.aluno, AULA, 'slug-inexistente', []), /Atividade indisponível/);
  } finally {
    await db.close();
  }
});

test('migração: domínio configurável e nova prática reabre questão dominada', async () => {
  const db = await criarBanco();
  try {
    await db.exec('alter table public.matriculas add column if not exists expira_em timestamptz;');
    await db.exec('alter table public.aulas add column if not exists atividade text;');
    await db.exec(migracao(MIGRACAO_AULA_01));
    await db.exec(migracao(MIGRACAO_AULA_02));
    await db.query("insert into public.agoraquest_atividades(slug,aula_id,versao_conteudo,titulo) values($1,$2,1,'Hipercalemia — Aula 01')", [SLUG_01, AULA]);
    await db.query('update public.cursos set tipo_acesso=$1 where id=$2', ['pago', ids.curso]);
    const sync = async (erros) => (await db.query('select public.agoraquest_caderno_sincronizar($1,$2,$3,$4::jsonb) as n', [ids.aluno, AULA, SLUG_01, JSON.stringify(erros)])).rows[0].n;
    const revisar = async (correta, dominio) => (await db.query('select public.agoraquest_caderno_revisar($1,$2,$3,$4,$5,$6) as r', [ids.aluno, SLUG_01 + '#1', 'B', correta, randomUUID(), dominio])).rows[0].r;

    await sync([{ tentativa: randomUUID(), numero: 1, escolha: 'A', em: new Date().toISOString() }]);
    assert.equal((await revisar(true, 3)).estado, 'em_revisao');
    assert.equal((await revisar(true, 3)).estado, 'em_revisao');
    assert.equal((await revisar(true, 3)).estado, 'dominada');
    await sync([{ tentativa: randomUUID(), numero: 1, escolha: 'C', em: new Date().toISOString() }]);
    const row = (await db.query('select * from public.agoraquest_caderno where usuario_id=$1 and questao_id=$2', [ids.aluno, SLUG_01 + '#1'])).rows[0];
    assert.equal(row.estado, 'em_revisao');
    assert.equal(row.acertos_seguidos, 0);
    assert.equal(row.erros, 2);
  } finally {
    await db.close();
  }
});

test('migração: vincula Aula 02 pelo título e preserva a Aula 01', async () => {
  const db = await criarBanco();
  const modulo = '99999999-9999-4999-8999-999999999999';
  const primeira = 'aaaaaaaa-0000-4000-8000-000000000001';
  const segunda = 'aaaaaaaa-0000-4000-8000-000000000002';
  try {
    await db.exec('alter table public.matriculas add column if not exists expira_em timestamptz;');
    await db.exec('alter table public.aulas add column if not exists atividade text;');
    await db.query("insert into public.cursos(id,titulo) values($1,'Tratamento da Hipercalemia em Adultos')", [CURSO_HIPER]);
    await db.query("insert into public.modulos(id,curso_id,titulo,ordem) values($1,$2,'Módulo 1',1)", [modulo, CURSO_HIPER]);
    await db.query("insert into public.aulas(id,modulo_id,titulo,ordem) values($1,$2,'Aula 01',1),($3,$2,'A fisiologia do potássio que muda a conduta',2)", [primeira, modulo, segunda]);
    await db.exec(migracao(MIGRACAO_AULA_01));
    await db.exec(migracao(MIGRACAO_AULA_02));
    assert.deepEqual((await db.query('select slug,aula_id,versao_conteudo,titulo from public.agoraquest_atividades order by slug')).rows, [
      { slug: SLUG_01, aula_id: primeira, versao_conteudo: 1, titulo: 'Hipercalemia — Aula 01' },
      { slug: SLUG_02, aula_id: segunda, versao_conteudo: 1, titulo: 'Hipercalemia — Aula 02' }
    ]);
  } finally {
    await db.close();
  }
});

test('migração: fallback para a segunda aula e não invade aula com outra atividade', async () => {
  const db = await criarBanco();
  const modulo = '99999999-9999-4999-8999-999999999999';
  const primeira = 'aaaaaaaa-0000-4000-8000-000000000003';
  const segunda = 'aaaaaaaa-0000-4000-8000-000000000004';
  try {
    await db.exec('alter table public.matriculas add column if not exists expira_em timestamptz;');
    await db.exec('alter table public.aulas add column if not exists atividade text;');
    await db.query("insert into public.cursos(id,titulo) values($1,'Hipercalemia — curso de teste')", [CURSO_HIPER]);
    await db.query("insert into public.modulos(id,curso_id,titulo,ordem) values($1,$2,'Módulo 1',1)", [modulo, CURSO_HIPER]);
    await db.query("insert into public.aulas(id,modulo_id,titulo,ordem) values($1,$2,'Aula A',1),($3,$2,'Aula B',2)", [primeira, modulo, segunda]);
    await db.exec(migracao(MIGRACAO_AULA_01));
    await db.query("insert into public.agoraquest_atividades(slug,aula_id,versao_conteudo,titulo) values('outra-atividade',$1,1,'Outra')", [segunda]);
    await db.exec(migracao(MIGRACAO_AULA_02));
    const linhas = (await db.query('select slug,aula_id from public.agoraquest_atividades order by slug')).rows;
    assert.deepEqual(linhas, [
      { slug: SLUG_01, aula_id: primeira },
      { slug: 'outra-atividade', aula_id: segunda }
    ]);
  } finally {
    await db.close();
  }
});

/* --------------------------------------------------------------- estático */
test('estático: páginas, link no app, service worker e ausência do gabarito no cliente', () => {
  const html = fs.readFileSync(path.join(__dirname, '../agoraquest.html'), 'utf8');
  assert.match(html, /css\/agoraquest\.css\?v=3/);
  assert.match(html, /js\/agoraquest\.js\?v=3/);
  assert.doesNotMatch(html, /B.*C.*B.*D.*C/);

  const caderno = fs.readFileSync(path.join(__dirname, '../caderno-erros.html'), 'utf8');
  assert.match(caderno, /css\/agoraquest\.css\?v=3/);
  assert.match(caderno, /css\/caderno-erros\.css\?v=1/);
  assert.match(caderno, /js\/caderno-erros\.js\?v=1/);
  assert.match(caderno, /id="cd-review"/);

  const js = fs.readFileSync(path.join(__dirname, '../js/agoraquest.js'), 'utf8');
  const jsCaderno = fs.readFileSync(path.join(__dirname, '../js/caderno-erros.js'), 'utf8');
  assert.doesNotMatch(js, /\[\s*['"]B['"]\s*,\s*['"]C['"]\s*,\s*['"]B['"]\s*,\s*['"]D['"]\s*,\s*['"]C['"]\s*\]/);
  assert.doesNotMatch(jsCaderno, /\[\s*['"]B['"]\s*,\s*['"]C['"]\s*,\s*['"]B['"]\s*,\s*['"]D['"]\s*,\s*['"]C['"]\s*\]/);
  for (const q of aprovado01.concat(aprovado02)) {
    assert.ok(!js.includes(q.stem));
    assert.ok(!jsCaderno.includes(q.stem));
    assert.ok(!js.includes(q.choices.B));
    assert.ok(!jsCaderno.includes(q.choices.B));
  }

  const aula = fs.readFileSync(path.join(__dirname, '../aula.html'), 'utf8');
  assert.match(aula, /id="agoraquest-cta"/);
  assert.match(aula, /api\/agoraquest\?meta=1/);
  assert.match(aula, /Praticar no AgoraQuest/);

  const app = fs.readFileSync(path.join(__dirname, '../app.html'), 'utf8');
  assert.match(app, /caderno-erros\.html/);

  const roteador = fs.readFileSync(path.join(__dirname, '../api/roteador.js'), 'utf8');
  assert.match(roteador, /'agoraquest': require\('\.\.\/lib\/rotas\/agoraquest'\)/);
  assert.match(roteador, /'agoraquest-caderno': require\('\.\.\/lib\/rotas\/agoraquest-caderno'\)/);

  const sw = fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8');
  assert.match(sw, /agoramed-v86/);
  assert.match(sw, /agoraquest\.html/);
  assert.match(sw, /caderno-erros\.html/);
  assert.match(sw, /css\/agoraquest\.css\?v=3/);
  assert.match(sw, /js\/agoraquest\.js\?v=3/);
  assert.match(sw, /css\/caderno-erros\.css\?v=1/);
  assert.match(sw, /js\/caderno-erros\.js\?v=1/);

  const css = fs.readFileSync(path.join(__dirname, '../css/agoraquest.css'), 'utf8');
  assert.match(css, /#346F77/i);
  assert.match(css, /#808080/i);
  assert.match(css, /#F5F5F5/i);
  assert.match(css, /\.sr-only\{/);
  assert.match(css, /@media\(max-width:760px\)/);

  const cssCaderno = fs.readFileSync(path.join(__dirname, '../css/caderno-erros.css'), 'utf8');
  assert.match(cssCaderno, /@media\(max-width:760px\)/);
  assert.match(cssCaderno, /\.aq-state/);
});
