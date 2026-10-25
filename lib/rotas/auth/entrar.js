/* POST /api/auth/entrar — e-mail + senha → cookie de sessão httpOnly */
'use strict';
const { json, envFaltando, gotrue, garantirPerfil, assinarJWT, cookieSessao } = require('../../api');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { ok: false, erro: 'Método não permitido.' });
  const falta = envFaltando();
  if (falta.length) return json(res, 500, { ok: false, erro: 'Configuração incompleta no servidor.', falta });

  const { email, senha } = req.body || {};
  if (!email || !senha) return json(res, 200, { ok: false, erro: 'Informe e-mail e senha.' });

  const r = await gotrue('/token?grant_type=password', {
    corpo: { email: String(email).trim().toLowerCase(), password: String(senha) },
  });

  if (!r.ok) {
    const msg = String(r.dados.error_description || r.dados.msg || '');
    if (/email not confirmed/i.test(msg))
      return json(res, 200, {
        ok: false,
        erro: 'Confirme seu e-mail antes de entrar. Acesse a caixa de entrada e clique no link de ativação.',
      });
    return json(res, 200, { ok: false, erro: 'E-mail ou senha incorretos.' });
  }

  /* A liberação automática nunca substitui a confirmação de e-mail. */
  if (!r.dados.user || !r.dados.user.email_confirmed_at)
    return json(res, 200, { ok: false, erro: 'Confirme seu e-mail antes de entrar. Acesse o link de ativação enviado para sua caixa de entrada.' });

  /* self-heal: se a conta é anterior ao gatilho do banco, o perfil é criado agora */
  const perfil = await garantirPerfil(r.dados.user);
  if (!perfil) return json(res, 200, { ok: false, erro: 'Perfil não encontrado. Contate o professor.' });

  if (!perfil.liberado)
    return json(res, 200, { ok: false, pendente: true, erro: 'Sua conta está com acesso restrito. Entre em contato com o professor.' });

  const token = assinarJWT({ sub: perfil.id, papel: perfil.papel });
  res.setHeader('Set-Cookie', cookieSessao(token));

  return json(res, 200, {
    ok: true,
    usuario: { id: perfil.id, nome: perfil.nome, email: perfil.email, papel: perfil.papel },
  });
};
