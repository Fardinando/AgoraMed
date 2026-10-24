/* Sem rede ou e-mails reais: SMTP e banco simulados. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const uid = '11111111-1111-4111-8111-111111111111';
const destinatario = 'drandersongleryston@gmail.com';
function ambiente({ ativo = true, falhaSMTP = false, enviado = false } = {}) {
  const fila = { usuario_id: uid, enviado_em: enviado ? '2026-10-24T00:00:00Z' : null, ultima_tentativa_em: null };
  const mensagens = [];
  const consultas = [];
  let config;
  const module = { exports: {} };
  vm.runInNewContext(readFileSync(join(__dirname, '../lib/notificacoes.js'), 'utf8'), {
    module, exports: module.exports,
    process: { env: ativo ? { SMTP_USER: 'remetente@example.com', SMTP_PASS: 'segredo-de-teste' } : {} },
    require: nome => {
      if (nome === 'nodemailer') return { createTransport: options => { config = options; return { sendMail: async msg => {
        mensagens.push(msg);
        if (falhaSMTP) throw Object.assign(new Error('erro contendo informação privada'), { code: 'EAUTH' });
        return { accepted: [destinatario] };
      } }; } };
      assert.equal(nome, './api');
      return { APP_URL: 'https://agoramed.vercel.app', postgrest: async (path, options = {}) => {
        consultas.push(path);
        if (path.startsWith('/perfis?')) return { ok: true, dados: [{ nome: 'Aluna Teste', email: 'aluna@example.com' }] };
        if (options.metodo === 'PATCH') {
          if (options.corpo.ultima_tentativa_em) {
            if (fila.enviado_em || fila.ultima_tentativa_em) return { ok: true, dados: [] };
          }
          Object.assign(fila, options.corpo);
          return { ok: true, dados: [{ ...fila }] };
        }
        return { ok: true, dados: fila.enviado_em ? [] : [{ ...fila }] };
      } };
    },
  });
  return { api: module.exports, fila, mensagens, consultas, config: () => config };
}

test('sem SMTP configurado, não tenta enviar nem altera a fila', async () => {
  const a = ambiente({ ativo: false });
  const r = await a.api.enviarAvisoCadastro(uid);
  assert.equal(r.pendente, true);
  assert.equal(a.consultas.length, 0);
  assert.equal(a.mensagens.length, 0);
});

test('envia ao destinatário autorizado e marca o aviso como enviado', async () => {
  const a = ambiente();
  assert.equal((await a.api.enviarAvisoCadastro(uid)).ok, true);
  assert.equal(a.mensagens[0].to, destinatario);
  assert.match(a.mensagens[0].text, /Aluna Teste/);
  assert.match(a.mensagens[0].text, /admin.html/);
  assert.doesNotMatch(JSON.stringify(a.mensagens), /segredo-de-teste/);
  assert.ok(a.fila.enviado_em);
  assert.equal(a.config().secure, true);
});

test('tentativas concorrentes e recadastros não enviam o mesmo aviso novamente', async () => {
  const a = ambiente();
  await Promise.all([a.api.enviarAvisoCadastro(uid), a.api.enviarAvisoCadastro(uid)]);
  await a.api.enviarAvisoCadastro(uid);
  assert.equal(a.mensagens.length, 1);
});

test('aviso já enviado não é reenviado', async () => {
  const a = ambiente({ enviado: true });
  assert.equal((await a.api.enviarAvisoCadastro(uid)).ignorado, true);
  assert.equal(a.mensagens.length, 0);
});

test('falha do SMTP preserva aviso e registra apenas código de erro', async () => {
  const a = ambiente({ falhaSMTP: true });
  assert.equal((await a.api.enviarAvisoCadastro(uid)).pendente, true);
  assert.equal(a.fila.enviado_em, null);
  assert.equal(a.fila.ultimo_erro, 'EAUTH');
  assert.doesNotMatch(JSON.stringify(a.fila), /informação privada/);
});

test('e-mail de teste também usa somente o destinatário autorizado', async () => {
  const a = ambiente();
  assert.equal((await a.api.enviarTeste()).ok, true);
  assert.equal(a.mensagens[0].to, destinatario);
  assert.match(a.mensagens[0].subject, /teste/);
});

test('pendências são processadas e permanecem deduplicadas', async () => {
  const a = ambiente();
  const r = await a.api.processarPendentes();
  assert.equal(r.ok, true);
  assert.equal(r.processados, 1);
  assert.equal(a.mensagens.length, 1);
});

test('retentativa agendada rejeita requisição sem o segredo correto', async () => {
  let chamadas = 0;
  const module = { exports: {} };
  vm.runInNewContext(readFileSync(join(__dirname, '../lib/rotas/interno/avisos-cadastro.js'), 'utf8'), {
    module, exports: module.exports, Buffer,
    process: { env: { CRON_SECRET: 'segredo-agendador-teste' } },
    require: p => p === 'crypto' ? require('node:crypto') : p === '../../api' ? { json(res, status, body) { res.status = status; res.body = body; } } : { processarPendentes: async () => { chamadas++; return { ok: true }; } },
  });
  const res = {};
  await module.exports({ method: 'GET', headers: {} }, res);
  assert.equal(res.status, 403);
  assert.equal(chamadas, 0);
  await module.exports({ method: 'GET', headers: { authorization: 'Bearer segredo-agendador-teste' } }, res);
  assert.equal(res.status, 200);
  assert.equal(chamadas, 1);
});
