/* POST /api/auth/cadastro — preserva a confirmação e a privacidade de contas existentes. */
'use strict';
const { json, envFaltando, gotrue, validarCadastro, normalizarWhats, garantirPerfil, APP_URL } = require('../../api');

const { enviarAvisoCadastro } = require('../../notificacoes');

const recebido = {
  ok: true,
  msg: 'Solicitação recebida. Para uma nova conta, confirme o e-mail para acessar os cursos gratuitos. Se já tem conta, entre com a senha original ou use “Esqueci minha senha”. Um novo cadastro não troca sua senha.',
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { ok: false, erro: 'Método não permitido.' });
  const falta = envFaltando();
  if (falta.length) return json(res, 500, { ok: false, erro: 'Configuração incompleta no servidor.', falta });

  const { nome, email, senha, whatsapp } = req.body || {};
  const erro = validarCadastro({ nome, email, senha, whatsapp });
  if (erro) return json(res, 200, { ok: false, erro });

  /* A API HTTP do Auth recebe redirect_to na URL, não email_redirect_to no corpo. */
  const caminho = APP_URL ? '/signup?redirect_to=' + encodeURIComponent(`${APP_URL}/index.html?confirmado=1`) : '/signup';
  const r = await gotrue(caminho, {
    corpo: {
      email: String(email).trim().toLowerCase(),
      password: String(senha),
      data: { nome: String(nome).trim(), whatsapp: normalizarWhats(whatsapp) },
    },
  }).catch(() => null);

  if (!r) return json(res, 200, { ok: false, erro: 'Não foi possível concluir o cadastro. Verifique sua conexão e tente novamente.' });
  if (!r.ok) {
    const dados = r.dados || {};
    const msg = String(dados.error_description || dados.msg || dados.message || dados.error || '');
    const codigo = dados.error_code || dados.code;
    if (r.status === 429 || /rate.limit/i.test(msg))
      return json(res, 200, { ok: false, erro: 'O limite de tentativas ou de envio de e-mails foi atingido. Aguarde e tente novamente. Se persistir, avise o professor.' });
    if (codigo === 'user_already_exists' || /already|exists|registered/i.test(msg))
      return json(res, 200, recebido);
    if (codigo === 'weak_password' || /password/i.test(msg))
      return json(res, 200, { ok: false, erro: 'A senha não atende aos requisitos. Use ao menos 6 caracteres e tente novamente.' });
    if (/email.*(not authorized|invalid)|email_address_(invalid|not_authorized)/i.test(msg + ' ' + codigo))
      return json(res, 200, { ok: false, erro: 'Não foi possível enviar para este e-mail. Confira o endereço e, se estiver correto, avise o professor.' });
    return json(res, 200, { ok: false, erro: 'Não foi possível concluir o cadastro e enviar a confirmação. Tente novamente ou avise o professor.' });
  }

  /* /signup pode devolver o usuário diretamente ou dentro de user.
     Contas repetidas podem receber um usuário fictício com identities vazias:
     não criamos perfis a partir dessa resposta nem afirmamos envio de e-mail. */
  const user = r.dados && (r.dados.user || r.dados);
  if (!user || !user.id)
    return json(res, 200, { ok: false, erro: 'Não foi possível confirmar o cadastro. Tente novamente ou avise o professor.' });
  if (Array.isArray(user.identities) && user.identities.length > 0) {
    const perfil = await garantirPerfil(user).catch(() => null);
    if (!perfil)
      return json(res, 200, { ok: false, erro: 'Sua conta foi registrada, mas houve um problema para concluir seu acesso. Tente entrar ou avise o professor.' });
    /* Falha no aviso ao professor não impede o cadastro. A fila permite nova tentativa. */
    await enviarAvisoCadastro(user.id).catch(() => {});
  }
  return json(res, 200, recebido);
};
