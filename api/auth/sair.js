/* POST /api/auth/sair — apaga o cookie de sessão */
'use strict';
const { json, cookieApagar } = require('../../lib/api');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { ok: false, erro: 'Método não permitido.' });
  res.setHeader('Set-Cookie', cookieApagar());
  return json(res, 200, { ok: true });
};
