/* node --test tools/cadastro.test.cjs — sem envio de e-mails ou alteração de contas reais. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const { validarCadastro, normalizarWhats } = require('../lib/api');
const cadastro = { nome: 'Aluno Teste', email: 'teste@example.com', senha: 'senha123', whatsapp: '83999999999' };
const user = { id: 'conta-teste', email: cadastro.email, identities: [{ provider: 'email' }] };

function handler(rota, overrides = {}) {
  const module = { exports: {} };
  const api = {
    json(res, status, dados) { res.status = status; res.dados = dados; },
    envFaltando: () => [], validarCadastro, normalizarWhats,
    APP_URL: 'https://agoramed.vercel.app',
    exigirAdmin: async () => ({ id: 'admin-teste' }),
    garantirPerfil: async () => ({ id: user.id }),
    postgrest: async () => { throw Error('Operação de dados inesperada'); },
    gotrue: async () => { throw Error('Chamada ao Auth inesperada'); },
    ...overrides,
  };
  vm.runInNewContext(readFileSync(join(__dirname, '../lib/rotas/', rota + '.js'), 'utf8'), {
    module, exports: module.exports, require: path => { if (path === '../../notificacoes') return { enviarAvisoCadastro: api.enviarAvisoCadastro || (async () => ({ ok: true })) }; assert.equal(path, '../../api'); return api; },
  });
  return async body => {
    const res = {};
    await module.exports({ method: 'POST', body }, res);
    return res.dados;
  };
}

for (const formato of ['direto', 'user']) {
  test(`cadastro com usuário ${formato} garante o perfil e envia redirect na URL`, async () => {
    let perfil = false;
    const cadastrar = handler('auth/cadastro', {
      gotrue: async (path, options) => {
        const url = new URL(path, 'https://auth.example');
        assert.equal(url.pathname, '/signup');
        assert.equal(url.searchParams.get('redirect_to'), 'https://agoramed.vercel.app/index.html?confirmado=1');
        assert.equal(options.corpo.email_redirect_to, undefined);
        return { ok: true, dados: formato === 'direto' ? user : { user } };
      },
      garantirPerfil: async value => { assert.equal(value, user); perfil = true; return { id: user.id }; },
    });
    const r = await cadastrar(cadastro);
    assert.equal(r.ok, true);
    assert.ok(perfil);
    assert.match(r.msg, /senha original/);
    assert.doesNotMatch(r.msg, /Conta criada!/);
  });
}

test('recadastro com resposta fictícia não cria perfil e usa a mesma mensagem de conta nova', async () => {
  const novo = await handler('auth/cadastro', { gotrue: async () => ({ ok: true, dados: user }) })(cadastro);
  const repetido = await handler('auth/cadastro', {
    gotrue: async () => ({ ok: true, dados: { id: 'ficticio', identities: [] } }),
    garantirPerfil: async () => assert.fail('Não pode criar perfil fictício'),
  })(cadastro);
  assert.equal(repetido.msg, novo.msg);
  assert.equal(repetido.ok, true);
});

test('conta existente explicitamente recusada recebe a mesma orientação neutra', async () => {
  const r = await handler('auth/cadastro', {
    gotrue: async () => ({ ok: false, status: 422, dados: { error_code: 'user_already_exists', msg: 'User already registered' } }),
  })(cadastro);
  assert.equal(r.ok, true);
  assert.match(r.msg, /Esqueci minha senha/);
});

for (const [nome, status, dados, mensagem] of [
  ['limite de e-mails', 429, { error_code: 'over_email_send_rate_limit' }, /limite/],
  ['senha fraca com status 422', 422, { error_code: 'weak_password' }, /senha/],
  ['destinatário não autorizado', 422, { error_code: 'email_address_not_authorized' }, /e-mail/],
  ['falha de SMTP', 500, { msg: 'Error sending confirmation email' }, /Não foi possível/],
]) {
  test(`cadastro não anuncia sucesso após ${nome}`, async () => {
    const r = await handler('auth/cadastro', { gotrue: async () => ({ ok: false, status, dados }) })(cadastro);
    assert.equal(r.ok, false);
    assert.match(r.erro, mensagem);
  });
}

test('falha de comunicação no cadastro retorna erro', async () => {
  const r = await handler('auth/cadastro')(cadastro);
  assert.equal(r.ok, false);
});

test('falha ao garantir perfil não é anunciada como cadastro concluído', async () => {
  const r = await handler('auth/cadastro', {
    gotrue: async () => ({ ok: true, dados: user }), garantirPerfil: async () => null,
  })(cadastro);
  assert.equal(r.ok, false);
  assert.match(r.erro, /concluir seu acesso/);
});

for (const [nome, gotrue] of [
  ['indisponibilidade de rede', async () => { throw Error('offline'); }],
  ['falha do provedor de e-mail', async () => ({ ok: false, status: 500, dados: { msg: 'SMTP error' } })],
]) {
  test(`recuperação com ${nome} não informa envio com sucesso`, async () => {
    const r = await handler('auth/esqueci-senha', { gotrue })({ email: cadastro.email });
    assert.equal(r.ok, false);
  });
}

test('recuperação usa redirect correto e mantém resposta neutra sobre a existência da conta', async () => {
  const r = await handler('auth/esqueci-senha', {
    gotrue: async (path, options) => {
      const url = new URL(path, 'https://auth.example');
      assert.equal(url.searchParams.get('redirect_to'), 'https://agoramed.vercel.app/redefinir.html');
      assert.equal(options.corpo.redirect_to, undefined);
      return { ok: true };
    },
  })({ email: cadastro.email });
  assert.equal(r.ok, true);
  assert.match(r.msg, /Se existir/);
});

test('exclusão remove primeiro a conta no Auth, sem apagar separadamente o perfil', async () => {
  let chamadas = 0;
  const r = await handler('admin/alunos', {
    gotrue: async (path, options) => {
      chamadas++;
      assert.equal(path, '/admin/users/aluno-teste');
      assert.equal(options.metodo, 'DELETE');
      assert.equal(options.servico, true);
      assert.equal(options.corpo.should_soft_delete, false);
      return { ok: true };
    },
  })({ usuario_id: 'aluno-teste', acao: 'remover' });
  assert.equal(r.ok, true);
  assert.equal(chamadas, 1);
});

for (const [nome, gotrue] of [
  ['recusa do Auth', async () => ({ ok: false, status: 500 })],
  ['falha de comunicação', async () => { throw Error('offline'); }],
]) {
  test(`exclusão com ${nome} não apaga o perfil nem anuncia sucesso`, async () => {
    let deletes = 0;
    const r = await handler('admin/alunos', {
      gotrue, postgrest: async () => { deletes++; },
    })({ usuario_id: 'aluno-teste', acao: 'remover' });
    assert.equal(r.ok, false);
    assert.equal(deletes, 0);
  });
}

test('professor não pode excluir a própria conta', async () => {
  const r = await handler('admin/alunos')({ usuario_id: 'admin-teste', acao: 'remover' });
  assert.equal(r.ok, false);
  assert.match(r.erro, /própria conta/);
});

test('após cadastro, destaca confirmação antes do login e mantém e-mail preenchido', async () => {
  const html = readFileSync(join(__dirname, '../index.html'), 'utf8');
  const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
  const nodes = new Map();
  const el = id => {
    if (!nodes.has(id)) nodes.set(id, {
      value: '', classes: new Set(),
      get classList() { const c = this.classes; return { add: x => c.add(x), remove: x => c.delete(x), toggle() {} }; },
      addEventListener(type, fn) { this[type] = fn; },
      querySelector() { return this.button ||= {}; },
      scrollIntoView() {}, focus() {}, reset() { this.resetou = true; },
    });
    return nodes.get(id);
  };
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  await new AsyncFunction('document', 'location', 'Store', 'setTimeout', script)(
    { getElementById: el }, { search: '?preview=1', hash: '' },
    { cadastrar: async () => ({ ok: true, msg: 'Solicitação recebida. Use a senha original ou recupere sua senha.' }) },
    () => assert.fail('Orientação não deve desaparecer em um temporizador'),
  );
  el('cad-email').value = cadastro.email;
  el('cad-senha').value = el('cad-confirmar-senha').value = cadastro.senha;
  await el('form-cadastrar').submit({ preventDefault() {} });
  assert.equal(el('login-email').value, cadastro.email);
  assert.equal(el('form-cadastrar').resetou, true);
  assert.equal(el('email-confirmacao').textContent, cadastro.email);
  assert.equal(el('confirmacao-cadastro').classes.has('oculto'), false);
  assert.equal(el('form-entrar').classes.has('oculto'), true);
  assert.match(html, /você precisa confirmar seu e-mail antes de fazer login/);
  assert.match(html, /spam ou lixo eletrônico/);
  el('voltar-apos-confirmar').click();
  assert.equal(el('confirmacao-cadastro').classes.has('oculto'), true);
  assert.equal(el('form-entrar').classes.has('oculto'), false);
  assert.equal(el('login-email').value, cadastro.email);
});

test('falha no aviso administrativo não impede o cadastro do aluno', async () => {
  let tentativas = 0;
  const r = await handler('auth/cadastro', {
    gotrue: async () => ({ ok: true, dados: user }),
    enviarAvisoCadastro: async () => { tentativas++; throw Error('SMTP indisponível'); },
  })(cadastro);
  assert.equal(r.ok, true);
  assert.equal(tentativas, 1);
});

test('resposta fictícia de recadastro não tenta enviar novo aviso administrativo', async () => {
  const r = await handler('auth/cadastro', {
    gotrue: async () => ({ ok: true, dados: { id: 'ficticio', identities: [] } }),
    enviarAvisoCadastro: async () => assert.fail('Não pode notificar recadastro fictício'),
  })(cadastro);
  assert.equal(r.ok, true);
});
