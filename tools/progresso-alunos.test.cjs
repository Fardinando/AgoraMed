/* node --test tools/progresso-alunos.test.cjs — apenas dados simulados. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const uid = '11111111-1111-4111-8111-111111111111';
const aluno = { id: uid, nome: 'Aluna Teste', email: 'aluna@example.com', papel: 'aluno' };
const matriculas = [
  { curso: { id: 'c1', titulo: 'Emergência', modulos: [{ aulas: [{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }] }] } },
  { curso: { id: 'c2', titulo: 'Sem aulas', modulos: [] } },
];
function rota(overrides = {}) {
  const module = { exports: {} };
  const consultas = [];
  const deps = {
    envFaltando: () => [],
    exigirAdmin: async () => ({ id: 'professor' }),
    json(res, status, body) { res.status = status; res.body = body; },
    postgrest: async (path, options) => {
      consultas.push(path);
      assert.equal(options.servico, true);
      assert.ok(path.startsWith('/cursos?tipo_acesso=eq.gratis') || path.includes(`eq.${uid}`), 'Todas as consultas são limitadas ao aluno escolhido');
      if (path.startsWith('/cursos?')) return { ok: true, dados: [] };
      if (path.startsWith('/perfis?')) return { ok: true, dados: [aluno] };
      if (path.startsWith('/matriculas?')) return { ok: true, dados: matriculas };
      if (path.startsWith('/progresso?')) return { ok: true, dados: [{ aula_id: 'a1' }, { aula_id: 'a1' }, { aula_id: 'fora-do-curso' }] };
      throw Error('Consulta inesperada');
    }, ...overrides,
  };
  vm.runInNewContext(readFileSync(join(__dirname, '../lib/rotas/admin/progresso.js'), 'utf8'), {
    module, exports: module.exports, require: path => { assert.equal(path, '../../api'); return deps; },
  });
  return { consultas, async executar(query = { usuario_id: uid }, method = 'GET') {
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; } };
    await module.exports({ method, query }, res);
    return res;
  } };
}

test('conta apenas aulas concluídas do aluno e de cada curso matriculado', async () => {
  const res = await rota().executar();
  assert.equal(res.status, 200);
  assert.equal(res.headers['Cache-Control'], 'private, no-store');
  const c = res.body.cursos.find(c => c.id === 'c1');
  assert.equal(c.total, 3);
  assert.equal(c.feitas, 1);
  assert.equal(c.percentual, 33);
  const vazio = res.body.cursos.find(c => c.id === 'c2');
  assert.equal(vazio.percentual, 0);
  assert.equal(vazio.total, 0);
});

test('curso concluído mostra 100%', async () => {
  const res = await rota({ postgrest: async path => {
    if (path.startsWith('/cursos?')) return { ok: true, dados: [] };
      if (path.startsWith('/perfis?')) return { ok: true, dados: [aluno] };
    if (path.startsWith('/matriculas?')) return { ok: true, dados: matriculas };
    return { ok: true, dados: ['a1', 'a2', 'a3'].map(aula_id => ({ aula_id })) };
  } }).executar();
  assert.equal(res.body.cursos.find(c => c.id === 'c1').percentual, 100);
});

test('usuário sem permissão não consulta dados de aluno', async () => {
  let consultas = 0;
  const r = rota({ exigirAdmin: async (req, res) => { res.status = 403; return null; }, postgrest: async () => { consultas++; } });
  assert.equal((await r.executar()).status, 403);
  assert.equal(consultas, 0);
});

test('rejeita identificador inválido e método de escrita', async () => {
  const r = rota();
  assert.equal((await r.executar({ usuario_id: 'id&select=*' })).status, 400);
  assert.equal((await r.executar({ usuario_id: [uid] })).status, 400);
  assert.equal((await r.executar({}, 'POST')).status, 405);
  assert.equal(r.consultas.length, 0);
});

test('falha de dados não é mostrada como progresso zero', async () => {
  const res = await rota({ postgrest: async () => ({ ok: false, dados: null }) }).executar();
  assert.equal(res.status, 503);
  assert.equal(res.body.ok, false);
});

test('aluno inexistente é informado', async () => {
  const res = await rota({ postgrest: async () => ({ ok: true, dados: [] }) }).executar();
  assert.equal(res.status, 404);
});

test('aluno sem matrícula retorna lista vazia', async () => {
  const res = await rota({ postgrest: async path => ({ ok: true, dados: path.startsWith('/perfis?') ? [aluno] : [] }) }).executar();
  assert.equal(res.body.ok, true);
  assert.equal(res.body.cursos.length, 0);
});

test('paginação considera conclusões além dos primeiros mil registros', async () => {
  const todas = Array.from({ length: 1001 }, (_, i) => ({ aula_id: `a${i}` }));
  const res = await rota({ postgrest: async path => {
    if (path.startsWith('/cursos?')) return { ok: true, dados: [] };
      if (path.startsWith('/perfis?')) return { ok: true, dados: [aluno] };
    if (path.startsWith('/matriculas?')) return { ok: true, dados: [{ curso: { id: 'grande', titulo: 'Curso grande', modulos: [{ aulas: todas.map(x => ({ id: x.aula_id })) }] } }] };
    const offset = Number(new URL(path, 'https://teste').searchParams.get('offset'));
    return { ok: true, dados: todas.slice(offset, offset + 1000) };
  } }).executar();
  assert.equal(res.body.cursos[0].feitas, 1001);
  assert.equal(res.body.cursos[0].percentual, 100);
});

// A camada visual é exercitada por eventos, incluindo troca de aluno com requisições em andamento.
function interfaceTeste(fetch) {
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, {
      open: false, addEventListener(e, fn) { this[e === 'close' ? 'onClose' : e] = fn; }, showModal() { this.open = true; },
      close() { this.open = false; this.onClose(); },
    });
    return nodes.get(id);
  };
  const context = vm.createContext({
    document: { getElementById: node },
    Store: { usuarios: () => [aluno, { ...aluno, id: 'outro', nome: 'Outro Aluno' }], progressoAluno: fetch },
    UI: { escapar: value => String(value).replaceAll('<', '&lt;').replaceAll('>', '&gt;') },
  });
  vm.runInContext(readFileSync(join(__dirname, '../js/admin-progresso.js'), 'utf8') + '\nProgressoAlunos.iniciar();', context);
  return { node, abrir: id => node('lista-alunos').click({ target: { closest: () => ({ dataset: { progressoAluno: id } }) } }) };
}
const tick = () => new Promise(resolve => setImmediate(resolve));

test('abrir e atualizar consulta dados novos e renderiza porcentagem e quantidade', async () => {
  let chamadas = 0;
  const b = interfaceTeste(async () => ({ ok: true, cursos: [{ titulo: '<Curso>', total: 4, feitas: ++chamadas, percentual: chamadas * 25 }] }));
  b.abrir(uid); await tick();
  assert.match(b.node('progresso-aluno-conteudo').innerHTML, /25%/);
  assert.match(b.node('progresso-aluno-conteudo').innerHTML, /1 de 4/);
  assert.match(b.node('progresso-aluno-conteudo').innerHTML, /&lt;Curso&gt;/);
  b.node('progresso-aluno-atualizar').click(); await tick();
  assert.equal(chamadas, 2);
  assert.match(b.node('progresso-aluno-conteudo').innerHTML, /50%/);
});

test('resposta atrasada do primeiro aluno não substitui o segundo', async () => {
  let resolver;
  const b = interfaceTeste(id => id === uid ? new Promise(resolve => { resolver = resolve; }) : Promise.resolve({ ok: true, cursos: [] }));
  b.abrir(uid);
  b.abrir('outro'); await tick();
  resolver({ ok: true, cursos: [{ titulo: 'Aluno anterior', total: 1, feitas: 1, percentual: 100 }] }); await tick();
  assert.equal(b.node('progresso-aluno-titulo').textContent, 'Progresso de Outro Aluno');
  assert.doesNotMatch(b.node('progresso-aluno-conteudo').innerHTML, /Aluno anterior/);
});

test('falha na consulta aparece com opção de atualizar', async () => {
  const b = interfaceTeste(async () => ({ ok: false, erro: 'Falha ao carregar' }));
  b.abrir(uid); await tick();
  assert.match(b.node('progresso-aluno-conteudo').innerHTML, /Falha ao carregar/);
  assert.equal(b.node('progresso-aluno-atualizar').disabled, false);
});

test('fechar descarta resposta em andamento e permite abrir novamente', async () => {
  let resolver;
  const b = interfaceTeste(() => new Promise(resolve => { resolver = resolve; }));
  b.abrir(uid);
  b.node('progresso-aluno-fechar').click();
  assert.equal(b.node('dialog-progresso-aluno').open, false);
  resolver({ ok: true, cursos: [{ titulo: 'Resposta antiga', total: 1, feitas: 1, percentual: 100 }] }); await tick();
  assert.doesNotMatch(b.node('progresso-aluno-conteudo').innerHTML, /Resposta antiga/);
  b.abrir(uid);
  assert.equal(b.node('dialog-progresso-aluno').open, true);
});

test('progresso inclui gratuito sem matrícula explícita', async () => {
  const res = await rota({ postgrest: async path => {
    if (path.startsWith('/perfis?')) return { ok: true, dados: [aluno] };
    if (path.startsWith('/matriculas?')) return { ok: true, dados: [] };
    if (path.startsWith('/cursos?')) return { ok: true, dados: [matriculas[0].curso] };
    return { ok: true, dados: [{ aula_id: 'a1' }] };
  } }).executar();
  assert.equal(res.body.cursos.length, 1);
  assert.equal(res.body.cursos[0].percentual, 33);
});
