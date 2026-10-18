/* POST /api/auth/redefinir-senha
   Recebe os tokens do link de recuperação (a página redefinir.html lê o
   hash da URL e manda aqui) + a nova senha, e grava a senha no Supabase. */
'use strict';
const { json, envFaltando, gotrue } = require('../../api');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { ok: false, erro: 'Método não permitido.' });
  const falta = envFaltando();
  if (falta.length) return json(res, 500, { ok: false, erro: 'Configuração incompleta no servidor.', falta });

  const { access_token, refresh_token, senha } = req.body || {};
  if (!access_token || !refresh_token)
    return json(res, 200, { ok: false, erro: 'Link de redefinição inválido. Solicite um novo.' });
  if (!senha || String(senha).length < 6)
    return json(res, 200, { ok: false, erro: 'A senha precisa de ao menos 6 caracteres.' });

  const r = await gotrue('/user', {
    metodo: 'PUT',
    token: access_token,
    corpo: { password: String(senha) },
  });

  if (!r.ok) {
    const msg = String(r.dados.error_description || r.dados.msg || '');
    if (/jwt|token|expired/i.test(msg))
      return json(res, 200, { ok: false, erro: 'O link expirou. Solicite um novo em "Esqueci a senha".' });
    return json(res, 200, { ok: false, erro: 'Não foi possível redefinir a senha. Tente novamente.' });
  }

  return json(res, 200, { ok: true, msg: 'Senha alterada com sucesso! Já pode entrar na plataforma.' });
};
