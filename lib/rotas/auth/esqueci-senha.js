/* POST /api/auth/esqueci-senha — dispara o e-mail de redefinição do Supabase
   Resposta é a mesma com e-mail existente ou não (não revela quem tem conta),
   mas problemas de configuração/limite aparecem para o usuário não ficar na dúvida. */
'use strict';
const { json, envFaltando, gotrue, APP_URL } = require('../../api');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { ok: false, erro: 'Método não permitido.' });
  const falta = envFaltando();
  if (falta.length) return json(res, 500, { ok: false, erro: 'Configuração incompleta no servidor.', falta });

  const { email } = req.body || {};
  const padrao = { ok: true, msg: 'Se existir uma conta com este e-mail, enviaremos as instruções de redefinição.' };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) return json(res, 200, padrao);

  const limpo = String(email).trim().toLowerCase();

  const caminho = APP_URL ? '/recover?redirect_to=' + encodeURIComponent(`${APP_URL}/redefinir.html`) : '/recover';
  const r = await gotrue(caminho, {
    corpo: { email: limpo },
  }).catch(() => null);

  if (r && !r.ok) {
    const msg = String(r.dados.error_description || r.dados.msg || r.dados.message || r.dados.error || '');

    /* redirect fora da lista allow no Supabase → tenta sem (o link sai para a Site URL;
       o index.html repassa os tokens para redefinir.html) */
    if (r.status === 400 && /redirect/i.test(msg)) {
      const r2 = await gotrue('/recover', { corpo: { email: limpo } }).catch(() => null);
      if (r2 && r2.ok) return json(res, 200, padrao);
      return json(res, 200, { ok: false, erro: 'Não foi possível gerar o link agora. Tente mais tarde ou avise o suporte.' });
    }

    /* limite de e-mails do plano gratuito (vários envios em pouco tempo) */
    if (r.status === 429 || /rate limit/i.test(msg)) {
      return json(res, 200, {
        ok: false,
        erro: 'Muitas tentativas de e-mail em pouco tempo. Aguarde cerca de 1 hora e tente novamente.',
      });
    }
  }

  if (!r || !r.ok)
    return json(res, 200, { ok: false, erro: 'Não foi possível solicitar o e-mail de redefinição. Tente novamente ou avise o professor.' });
  return json(res, 200, padrao);
};
