const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const uid = '11111111-1111-4111-8111-111111111111';
const aluno = { id: uid, nome: 'Teste', papel: 'aluno', liberado: true };
function carregar(file, deps = {}, extras = {}) {
  const module = { exports: {} };
  const ctx = { module, exports: module.exports, require: name => name === 'crypto' ? require('node:crypto') : name === '../../curso-edicao' ? require('../lib/curso-edicao') : deps, Buffer, URL, encodeURIComponent, ...extras };
  vm.runInNewContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx);
  return module.exports;
}
const json = (res, status, dados) => { res.status = status; res.dados = dados; };
async function chamar(handler, req) {
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(value) { this.body = value; } };
  await handler(req, res); return res;
}
function acesso({ tipo = 'pago', matricula = false, falha = false } = {}) {
  const calls = [];
  const api = carregar('lib/api.js', {}, { process: { env: {} }, fetch: async url => {
    calls.push(url);
    const dados = url.includes('/matriculas?') ? (matricula ? [{ curso_id: 'curso' }] : []) : [{ id: 'curso', tipo_acesso: tipo }];
    return { ok: !falha, status: falha ? 503 : 200, json: async () => dados };
  } });
  return { api, calls };
}
for (const [nome, perfil, opcoes, esperado] of [
  ['gratuito dispensa matrícula', aluno, { tipo: 'gratis' }, true],
  ['pago sem matrícula é negado', aluno, {}, false],
  ['pago com matrícula é permitido', aluno, { matricula: true }, true],
  ['professor ativo acessa pago', { ...aluno, papel: 'admin' }, {}, true],
  ['conta bloqueada não acessa gratuito', { ...aluno, liberado: false }, { tipo: 'gratis' }, false],
  ['falha no banco não concede acesso', aluno, { tipo: 'gratis', falha: true }, false],
]) test(nome, async () => {
  const { api, calls } = acesso(opcoes);
  assert.equal(await api.podeAcessarCurso(perfil, 'curso'), esperado);
  if (calls.some(x => x.includes('/matriculas?'))) {
    assert.ok(calls.some(x => x.includes('select=curso_id')));
    assert.ok(!calls.some(x => x.includes('select=id&')));
  }
});
const base = [
  { id: 'gratis', titulo: 'Gratuito', tipo_acesso: 'gratis' },
  { id: 'pago-comprado', titulo: 'Pago comprado', tipo_acesso: 'pago', url_vendas: 'https://vendas.example/comprado' },
  { id: 'pago-sem-acesso', titulo: 'Pago anunciado', tipo_acesso: 'pago', url_vendas: 'https://vendas.example/curso' },
];
function app({ admin = false, sessao = true, falha = '' } = {}) {
  const calls = [];
  return { calls, handler: carregar('lib/rotas/app.js', {
    json, envFaltando: () => [], sessaoPerfil: async () => sessao ? { ...aluno, papel: admin ? 'admin' : 'aluno' } : null,
    cursoParaEd: c => ({ id: c.id, titulo: c.titulo, modulos: c.modulos, tipoAcesso: c.tipo_acesso }), promoParaEd: x => x,
    postgrest: async url => {
      calls.push(url); let dados;
      if (falha && url.startsWith(falha)) return { ok: false, dados: null };
      if (url.startsWith('/cursos?id=in.')) {
        const ids = url.match(/in\.\(([^)]+)\)/)[1].split(',');
        dados = base.filter(c => ids.includes(c.id)).map(c => ({ ...c, modulos: [{ aulas: [{ youtube_id: 'VIDEO_PRIVADO_' + c.id, materiais: [{ caminho: 'PDF_PRIVADO_' + c.id }] }] }] }));
      } else if (url.startsWith('/cursos?')) dados = base;
      else if (url.startsWith('/matriculas?')) dados = [{ usuario_id: uid, curso_id: 'pago-comprado' }];
      else if (url.startsWith('/perfis?')) dados = [{ id: uid, email: 'privado@example.invalid' }];
      else dados = [];
      return { ok: true, dados };
    },
  }) };
}
test('bootstrap entrega gratuitos e comprados, mas anúncio nunca recebe vídeos ou PDFs', async () => {
  const a = app(); const r = await chamar(a.handler, { method: 'GET' });
  assert.equal(r.status, 200);
  assert.deepEqual(Array.from(r.dados.cursos, c => c.id), ['gratis', 'pago-comprado']);
  assert.equal(r.dados.catalogo[0].id, 'pago-sem-acesso');
  assert.equal(r.dados.catalogo[0].urlVendas, 'https://vendas.example/curso');
  assert.doesNotMatch(JSON.stringify(r.dados), /VIDEO_PRIVADO_pago-sem-acesso|PDF_PRIVADO_pago-sem-acesso/);
  assert.equal(r.dados.catalogo[0].modulos, undefined);
  assert.equal(r.dados.alunos.length, 0);
  assert.ok(!a.calls.some(x => x.startsWith('/perfis?')));
  assert.ok(!a.calls.find(x => x.startsWith('/cursos?id=in.')).includes('pago-sem-acesso'));
});
test('professor recebe cursos completos para continuar gerenciando', async () => {
  const a = app({ admin: true }); const r = await chamar(a.handler, { method: 'GET' });
  assert.equal(r.dados.cursos.length, 3); assert.equal(r.dados.catalogo.length, 0);
});
test('sem sessão não consulta catálogo ou conteúdo', async () => {
  const a = app({ sessao: false }); const r = await chamar(a.handler, { method: 'GET' });
  assert.equal(r.status, 401); assert.equal(a.calls.length, 0);
});
test('erro de matrícula falha de forma explícita e não libera conteúdo pago', async () => {
  const a = app({ falha: '/matriculas?' }); const r = await chamar(a.handler, { method: 'GET' });
  assert.equal(r.status, 503); assert.equal(r.dados.cursos, undefined);
  assert.ok(!a.calls.some(x => x.startsWith('/cursos?id=in.')));
});
function catalogo() {
  const context = { URL, encodeURIComponent, UI: { escapar: x => String(x).replaceAll('"', '&quot;').replaceAll('<', '&lt;') } };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'js/catalogo-cursos.js'), 'utf8') + '\nglobalThis.api = CatalogoCursos;', context);
  return context.api;
}
test('clique abre vendas sem acesso e curso para quem já está liberado', () => {
  const c = catalogo(); const curso = { id: 'abc', titulo: 'Curso', urlVendas: 'https://vendas.example/curso' };
  assert.equal(c.destino(curso), '/api/curso?id=abc');
  assert.equal(c.destino({ ...curso, acessoLiberado: true }), '/api/curso?id=abc');
  assert.match(c.cartao(curso), /href="\/api\/curso\?id=abc"/);
});
test('URL ausente ou perigosa não se torna link no anúncio', () => {
  const c = catalogo();
  for (const urlVendas of ['', 'javascript:alert(1)', 'data:text/html,teste', 'https://usuario:senha@vendas.example']) {
    assert.equal(c.destino({ urlVendas }), null);
    assert.doesNotMatch(c.cartao({ titulo: '<Teste>', urlVendas }), /href=/);
    assert.match(c.cartao({ titulo: '<Teste>', urlVendas }), /Em breve/);
  }
});
for (const permitido of [true, false]) test(`progresso respeita autorização do curso (${permitido})`, async () => {
  let gravacoes = 0;
  const handler = carregar('lib/rotas/progresso.js', {
    json, envFaltando: () => [], sessaoPerfil: async () => aluno, cursoDaAula: async () => 'curso',
    podeAcessarCurso: async () => permitido,
    postgrest: async (url, options) => { if (options.metodo === 'POST') gravacoes++; return { ok: true, dados: [{ usuario_id: uid }] }; },
  });
  const r = await chamar(handler, { method: 'POST', body: { aula_id: 'aula', acao: 'marcar' } });
  assert.equal(r.status, permitido ? 200 : 403); assert.equal(gravacoes, permitido ? 1 : 0);
});
test('PDF sem permissão nunca consulta o arquivo no Storage', async () => {
  let downloads = 0;
  const handler = carregar('lib/rotas/material.js', {
    json, envFaltando: () => [], sessaoPerfil: async () => aluno,
    postgrest: async () => ({ ok: true, dados: [{ caminho: 'privado.pdf', aulas: { modulos: { curso_id: 'pago' } } }] }),
    podeAcessarCurso: async () => false,
  }, { fetch: async () => { downloads++; } });
  const r = await chamar(handler, { method: 'GET', query: { id: 'material' } });
  assert.equal(r.status, 403); assert.equal(downloads, 0);
});
test('salvar curso rejeita esquema de URL perigoso antes de gravar', async () => {
  let writes = 0;
  const handler = carregar('lib/rotas/admin/cursos.js', {
    json, envFaltando: () => [], exigirAdmin: async () => aluno,
    postgrest: async () => { writes++; throw Error('Não deve gravar'); },
  });
  const r = await chamar(handler, { method: 'POST', body: { curso: { titulo: 'Teste', tipoAcesso: 'pago', urlVendas: 'javascript:alert(1)', modulos: [] } } });
  assert.equal(r.status, 400); assert.equal(writes, 0);
});
test('editor incompleto não apaga aulas ao salvar classificação', async () => {
  const handler = carregar('lib/rotas/admin/cursos.js', {
    json, envFaltando: () => [], exigirAdmin: async () => aluno,
    postgrest: async () => assert.fail('Nenhuma gravação deve ocorrer'),
  });
  const r = await chamar(handler, { method: 'POST', body: { curso: { titulo: 'Teste', tipoAcesso: 'gratis' } } });
  assert.equal(r.status, 400);
});
for (const permitido of [true, false]) test(`clique resolve acesso atual no servidor (${permitido})`, async () => {
  const id='36c4246d-1f58-424b-ad07-c494ad7d4bd1';
  const handler=carregar('lib/rotas/curso.js',{
    json,envFaltando:()=>[],sessaoPerfil:async()=>aluno,
    postgrest:async()=>({ok:true,dados:[{id,url_vendas:'https://vendas.example/curso'}]}),
    podeAcessarCurso:async()=>permitido,
  });
  const r=await chamar(handler,{method:'GET',query:{id}});
  assert.equal(r.statusCode,302);
  assert.equal(r.headers.Location,permitido?`/curso.html?id=${id}&atualizar=1`:'https://vendas.example/curso');
});
test('anúncio não redireciona para URL perigosa cadastrada no banco',async()=>{
  const handler=carregar('lib/rotas/curso.js',{
    json,envFaltando:()=>[],sessaoPerfil:async()=>aluno,
    postgrest:async()=>({ok:true,dados:[{url_vendas:'javascript:alert(1)'}]}),podeAcessarCurso:async()=>false,
  });
  const r=await chamar(handler,{method:'GET',query:{id:uid}});
  assert.equal(r.status,404);assert.equal(r.headers.Location,undefined);
});
for(const confirmado of [false,true])test(`entrada exige confirmação de e-mail (${confirmado})`,async()=>{
  let perfis=0;
  const handler=carregar('lib/rotas/auth/entrar.js',{
    json,envFaltando:()=>[],gotrue:async()=>({ok:true,dados:{user:{id:uid,email_confirmed_at:confirmado?'2026-10-25T12:00:00Z':null}}}),
    garantirPerfil:async()=>{perfis++;return aluno;},assinarJWT:()=> 'token-ficticio',cookieSessao:()=> 'cookie-ficticio',
  });
  const r=await chamar(handler,{method:'POST',body:{email:'teste@example.invalid',senha:'senha-ficticia'}});
  assert.equal(r.dados.ok,confirmado);assert.equal(perfis,confirmado?1:0);
  assert.equal(r.headers['Set-Cookie'],confirmado?'cookie-ficticio':undefined);
});
