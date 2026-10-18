/* POST /api/auth/cadastro — cria a conta (confirmação de e-mail ativa) */
'use strict';
const { json, envFaltando, gotrue, validarCadastro, normalizarWhats } = require('../../lib/api');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { ok: false, erro: 'Método não permitido.' });
  const falta = envFaltando();
  if (falta.length) return json(res, 500, { ok: false, erro: 'Configuração incompleta no servidor.', falta });

  const { nome, email, senha, whatsapp } = req.body || {};
  const erro = validarCadastro({ nome, email, senha, whatsapp });
  if (erro) return json(res, 200, { ok: false, erro });

  const r = await gotrue('/signup', {
    corpo: {
      email: String(email).trim().toLowerCase(),
      password: String(senha),
      data: { nome: String(nome).trim(), whatsapp: normalizarWhats(whatsapp) },
    },
  });

  if (!r.ok) {
    const msg = String(r.dados.error_description || r.dados.msg || r.dados.message || r.dados.error || '');
    if (r.status === 422 || /already|exists|registered/i.test(msg))
      return json(res, 200, { ok: false, erro: 'Já existe uma conta com este e-mail.' });
    if (/password/i.test(msg))
      return json(res, 200, { ok: false, erro: 'A senha precisa de ao menos 6 caracteres.' });
    return json(res, 200, { ok: false, erro: 'Não foi possível criar a conta. Tente novamente.', codigo: r.status });
  }

  return json(res, 200, {
    ok: true,
    msg: 'Conta criada! Confira seu e-mail e clique no link de confirmação para ativar a conta.',
  });
};
