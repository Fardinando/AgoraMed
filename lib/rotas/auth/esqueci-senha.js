/* POST /api/auth/esqueci-senha — dispara o e-mail de redefinição do Supabase
   Resposta sempre igual, para não revelar se o e-mail existe ou não. */
'use strict';
const { json, envFaltando, gotrue, APP_URL } = require('../../api');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { ok: false, erro: 'Método não permitido.' });
  const falta = envFaltando();
  if (falta.length) return json(res, 500, { ok: false, erro: 'Configuração incompleta no servidor.', falta });

  const { email } = req.body || {};
  const padrao = { ok: true, msg: 'Se existir uma conta com este e-mail, enviaremos as instruções de redefinição.' };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) return json(res, 200, padrao);

  await gotrue('/recover', {
    corpo: { email: String(email).trim().toLowerCase(), redirect_to: `${APP_URL}/redefinir.html` },
  }).catch(() => {});

  return json(res, 200, padrao);
};
