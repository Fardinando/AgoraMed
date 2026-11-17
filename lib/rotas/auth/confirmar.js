/* POST /api/auth/confirmar — valida a sessão devolvida pelo link do Supabase
   e a converte em sessão AgoraMed, sem guardar tokens no navegador. */
'use strict';
const { json, envFaltando, gotrue, garantirPerfil, assinarJWT, cookieSessao } = require('../../api');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { ok: false, erro: 'Método não permitido.' });
  const falta = envFaltando();
  if (falta.length) return json(res, 500, { ok: false, erro: 'Configuração incompleta no servidor.' });

  const accessToken = String(req.body?.access_token || '');
  if (accessToken.length < 80 || accessToken.length > 8192 || !/^[A-Za-z0-9._-]+$/.test(accessToken))
    return json(res, 400, { ok: false, erro: 'O link de confirmação é inválido ou expirou. Entre na AgoraMed para continuar.' });

  const validacao = await gotrue('/user', { metodo: 'GET', token: accessToken }).catch(() => null);
  const user = validacao?.ok ? validacao.dados : null;
  if (!user?.id || !(user.email_confirmed_at || user.confirmed_at))
    return json(res, 401, { ok: false, erro: 'Não foi possível validar a confirmação. Entre na AgoraMed para continuar.' });

  const perfil = await garantirPerfil(user).catch(() => null);
  if (!perfil?.liberado)
    return json(res, 403, { ok: false, erro: 'A conta está com acesso restrito. Fale com a AgoraMed para continuar.' });

  res.setHeader('Set-Cookie', cookieSessao(assinarJWT({ sub: perfil.id, papel: perfil.papel })));
  return json(res, 200, { ok: true });
};
