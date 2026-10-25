/* Executar: node --test tools/logout.test.cjs (sem dependências ou contas reais). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, '../js/store.js'), 'utf8');
const usuario = { id: 'aluna-teste', nome: 'Aluna Teste', papel: 'aluno' };
const dados = { ok: true, usuario, cursos: [{ id: 'curso-teste' }], progresso: ['aula-teste'] };
const chave = 'agoramed_app_cache_v2';

function navegador(fetch, { cache = true, idade = 0 } = {}) {
  const storage = new Map(cache ? [[chave, JSON.stringify({ dados, ts: Date.now() - idade })]] : []);
  const eventos = {};
  const alertas = [];
  const destinos = [];
  let reloads = 0;
  const context = vm.createContext({
    fetch, URLSearchParams, setTimeout, crypto: require('node:crypto').webcrypto,
    navigator: {}, window: { addEventListener: (nome, fn) => { eventos[nome] = fn; } },
    location: { replace: url => destinos.push(url), reload: () => reloads++ },
    sessionStorage: {
      getItem: k => storage.get(k) ?? null,
      setItem: (k, v) => storage.set(k, v),
      removeItem: k => storage.delete(k),
    },
    confirm: () => true, alert: msg => alertas.push(msg),
  });
  vm.runInContext(source + '\nglobalThis.Store = Store; globalThis.UI = UI;', context);
  return { ...context, storage, eventos, alertas, destinos, reloads: () => reloads };
}
const resposta = dados => Promise.resolve({ json: async () => dados });

test('logout limpa o usuário e o cache; o login não restaura a sessão antiga', async () => {
  const chamadas = [];
  const b = navegador((url, options) => {
    chamadas.push([url, options]);
    return resposta(url === '/api/auth/sair' ? { ok: true } : { ok: false });
  });
  await b.Store.iniciar();
  assert.equal(b.Store.usuarioAtual().id, usuario.id);
  assert.equal((await b.Store.sair()).ok, true);
  assert.equal(b.Store.usuarioAtual(), null);
  assert.equal(b.storage.has(chave), false);
  assert.equal(b.Store.cursos().length, 0);
  assert.equal(b.Store.estaConcluida('aula-teste'), false);
  assert.equal(await b.Store.iniciar(), null);
  assert.deepEqual(chamadas.map(([url]) => url), ['/api/auth/sair', '/api/app']);
  assert.ok(chamadas.every(([, options]) => options.cache === 'no-store'));
});

test('resposta de revalidação atrasada não reconecta depois de sair', async () => {
  let resolver;
  const b = navegador(url => url === '/api/app'
    ? new Promise(resolve => { resolver = resolve; }) : resposta({ ok: true }), { idade: 31000 });
  await b.Store.iniciar(); // dispara a revalidação em segundo plano
  await b.Store.sair();
  resolver(await resposta(dados));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(b.Store.usuarioAtual(), null);
  assert.equal(b.storage.has(chave), false);
});

test('carregamento inicial atrasado não restaura sessão após logout', async () => {
  let resolver;
  const b = navegador(url => url === '/api/app'
    ? new Promise(resolve => { resolver = resolve; }) : resposta({ ok: true }), { cache: false });
  const iniciando = b.Store.iniciar();
  await b.Store.sair();
  resolver(await resposta(dados));
  assert.equal(await iniciando, null);
  assert.equal(b.Store.usuarioAtual(), null);
  assert.equal(b.storage.has(chave), false);
});

for (const [nome, fetch] of [
  ['sem conexão', async () => { throw new Error('offline'); }],
  ['servidor recusou', () => resposta({ ok: false, erro: 'Tente novamente.' })],
  ['resposta inválida', () => resposta(null)],
]) {
  test(`logout ${nome}: informa falha, permite tentar novamente e não redireciona`, async () => {
    const b = navegador(fetch);
    await b.Store.iniciar();
    const botao = { disabled: false };
    await b.UI.sair({ currentTarget: botao });
    assert.equal(botao.disabled, false);
    assert.equal(b.destinos.length, 0);
    assert.equal(b.alertas.length, 1);
    assert.equal(b.Store.usuarioAtual().id, usuario.id);
    assert.equal(b.storage.has(chave), true);
  });
}

test('saída confirmada redireciona; clique repetido não duplica a requisição', async () => {
  let concluir, chamadas = 0;
  const b = navegador(() => {
    chamadas++;
    return new Promise(resolve => { concluir = resolve; });
  });
  const botao = { disabled: false };
  const saindo = b.UI.sair({ currentTarget: botao });
  assert.equal(botao.disabled, true);
  await b.UI.sair({ currentTarget: botao });
  assert.equal(chamadas, 1);
  concluir(await resposta({ ok: true }));
  await saindo;
  assert.deepEqual(b.destinos, ['index.html']);
});

test('voltar pelo histórico revalida a página restaurada do navegador', () => {
  const b = navegador(() => resposta({ ok: false }));
  b.eventos.pageshow({ persisted: false });
  assert.equal(b.reloads(), 0);
  b.eventos.pageshow({ persisted: true });
  assert.equal(b.reloads(), 1);
});

test('endpoint de logout expira o mesmo cookie da autenticação e proíbe cache', async () => {
  const roteador = require('../api/roteador');
  const { cookieSessao } = require('../lib/api');
  const headers = {};
  let body;
  const res = { setHeader: (k, v) => { headers[k] = v; }, end: v => { body = JSON.parse(v); } };
  await roteador({ method: 'POST', url: '/api/auth/sair' }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(body.ok, true);
  assert.equal(headers['Cache-Control'], 'private, no-store');
  assert.match(headers['Set-Cookie'], /^sessao=;/);
  assert.match(headers['Set-Cookie'], /Max-Age=0/);
  for (const atributo of ['Path=/', 'HttpOnly', 'SameSite=Lax']) {
    assert.ok(cookieSessao('teste').includes(atributo));
    assert.ok(headers['Set-Cookie'].includes(atributo));
  }
});
